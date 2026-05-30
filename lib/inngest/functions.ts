/**
 * Inngest background function: `process-material`.
 *
 * This is the core generation pipeline. It runs outside the HTTP request cycle
 * (triggered via Inngest's event queue) and can safely take several minutes.
 *
 * Pipeline stages:
 *   1. fetch-material    — load the DB row created by POST /api/ingest
 *   2. set-processing    — flip status to PROCESSING so the UI polls correctly
 *   3. generate-lab      — call Gemini to produce a LAB JSON payload (if requested)
 *   4. save-lab          — persist steps_payload to generated_labs
 *   5. generate-video    — call Gemini to produce a VIDEO JSON blueprint (if requested)
 *   6. compile-video     — render blueprint to MP4 via Puppeteer + FFmpeg
 *   7. save-video        — persist mp4_url to generated_videos
 *   8. mark-complete     — decrement user credits and flip status to COMPLETE
 *
 * Each stage is wrapped in `step.run(...)` so Inngest can checkpoint progress
 * and retry individual steps without re-running earlier ones.
 *
 * On any unhandled error the catch block runs `mark-failed` to flip status
 * to FAILED and then re-throws so Inngest records the failure.
 */

import { inngest } from "./client"
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from '../supabase'
import { PuppeteerFfmpegCompiler } from '../video'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

const SYSTEM_PROMPT = `
You are a Lead Instructional Designer and Technical Animator. Process the
incoming educational text and output STRICTLY VALID JSON conforming to the
exact schema provided. Balance scene durations against the target length ($LENGTH_MINUTES).

If requested to generate a VIDEO payload, return JSON conforming exactly to this schema:
{
  "metadata": { "title": "Title of lesson", "grade_level": "Grade level" },
  "scenes": [
    {
      "scene_id": 1,
      "layout": "title_intro" | "concept_card" | "kinetic_text" | "split_screen" | "conclusion_outro",
      "duration_seconds": 4,
      "title": "Main title or heading",
      "subtitle": "Secondary subtitle or brief description",
      "points": ["Key point 1", "Key point 2"],
      "background_gradient": "linear-gradient(135deg, color1, color2)"
    }
  ]
}
Note on video layouts:
- Use 'title_intro' for the first scene.
- Use 'conclusion_outro' for the final scene.
- Use 'concept_card', 'kinetic_text', or 'split_screen' for core explanatory scenes.

If requested to generate a LAB payload, return JSON conforming exactly to this schema:
{
  "metadata": { "title": "Title of lab", "grade_level": "Grade level" },
  "steps": [
    {
      "step_id": 1,
      "layout": "split_screen_visualization",
      "heading": "Step title",
      "body_markdown": "Instruction description in markdown format",
      "visual_component_state": { "animation_type": "mitosis_prophase_mesh", "speed": "0.5" },
      "assessment": {
        "has_quiz": true,
        "question": "Validation question about this step",
        "options": ["Option A", "Option B", "Option C"],
        "correct_index": 0
      }
    }
  ]
}

Do not output conversational text or commentary. Return only raw valid JSON.
`;

export const processMaterial = inngest.createFunction(
  { id: "process-material", retries: 2, triggers: [{ event: "material/process" }] },
  async ({ event, step }) => {
    const { materialId } = event.data as { materialId: string }

    // Fetch Material
    const material = await step.run("fetch-material", async () => {
      const { data, error } = await supabaseAdmin
        .from('educational_materials')
        .select('*')
        .eq('id', materialId)
        .single();
      if (error || !data) throw new Error("Material not found");
      return data;
    });

    // Update status to PROCESSING
    await step.run("set-processing", async () => {
      await supabaseAdmin
        .from('educational_materials')
        .update({ status: 'PROCESSING' })
        .eq('id', materialId);
    });

    try {
      let labData: any = null;
      let videoData: any = null;

      // Generate Lab JSON
      if (material.asset_type === 'LAB' || material.asset_type === 'BOTH') {
        labData = await step.run("generate-lab", async () => {
          return await generateWithFallback(
            `Generate a LAB payload for the following text. Target length: ${material.target_length} minutes.\n\nText: ${material.raw_extracted_text}`,
            material.target_length
          );
        });

        await step.run("save-lab", async () => {
          await supabaseAdmin.from('generated_labs').insert({
            material_id: materialId,
            steps_payload: labData,
          });
        });
      }

      // Generate Video JSON
      if (material.asset_type === 'VIDEO' || material.asset_type === 'BOTH') {
        videoData = await step.run("generate-video", async () => {
          return await generateWithFallback(
            `Generate a VIDEO payload for the following text. Target length: ${material.target_length} minutes. Include keyframes array.\n\nText: ${material.raw_extracted_text}`,
            material.target_length
          );
        });

        // Compile the Video Blueprint to a premium MP4 using Puppeteer + FFmpeg
        const compileResult = await step.run("compile-video", async () => {
          const compiler = new PuppeteerFfmpegCompiler();
          return await compiler.compile(videoData);
        });

        await step.run("save-video", async () => {
          await supabaseAdmin.from('generated_videos').insert({
            material_id: materialId,
            blueprint_payload: videoData,
            mp4_url: compileResult.mp4Url,
            is_published: false,
          });
        });
      }

      // Decrement credits and mark complete.
      // NOTE: This is a non-atomic read-then-write. Under concurrent load the
      // decrement could be inaccurate. A Supabase RPC / database function that
      // does `UPDATE ... SET credits = credits - 1` would eliminate this race.
      await step.run("mark-complete", async () => {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('available_credits')
          .eq('id', material.user_id)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({ available_credits: Math.max(0, profile.available_credits - 1) })
            .eq('id', material.user_id)
        }

        await supabaseAdmin
          .from('educational_materials')
          .update({ status: 'COMPLETE' })
          .eq('id', materialId)
      })

      return { success: true };

    } catch (error: any) {
      await step.run("mark-failed", async () => {
        await supabaseAdmin
          .from('educational_materials')
          .update({ status: 'FAILED' })
          .eq('id', materialId);
      });
      throw error;
    }
  }
);

/**
 * Calls the Gemini API with a model-cascade fallback strategy.
 *
 * Tries models in priority order. If a model is rate-limited or errors out,
 * waits 2 s then moves to the next candidate. Throws the last error if all
 * models are exhausted.
 *
 * `responseMimeType: "application/json"` instructs Gemini to return raw JSON
 * without Markdown wrapper — but we defensively strip ``` fences anyway since
 * some model versions still add them.
 */
async function generateWithFallback(prompt: string, length: number): Promise<unknown> {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"]
  let lastError: unknown = null

  for (const modelName of models) {
    try {
      console.log(`Attempting generation with model: ${modelName}`)
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT.replace("$LENGTH_MINUTES", length.toString()),
        generationConfig: { responseMimeType: "application/json" },
      })

      const response = await model.generateContent(prompt)
      let text = response.response.text()

      // Strip Markdown code fences if the model wrapped the JSON.
      const jsonMatch = text.match(/```json\n([\s\S]*)\n```/)
      if (jsonMatch) text = jsonMatch[1]

      const parsed = JSON.parse(text)
      console.log(`Successfully generated payload using ${modelName}`)
      return parsed
    } catch (e) {
      console.warn(`Failed with model ${modelName}:`, e)
      lastError = e
      // Brief pause to let rate-limit windows reset before the next attempt.
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  throw lastError
}
