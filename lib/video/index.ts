import { supabaseAdmin } from '../supabase';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface VideoBlueprint {
  video_id?: string;
  metadata?: {
    title?: string;
    grade_level?: string;
  };
  scenes: Array<{
    scene_id: number;
    layout: 'title_intro' | 'concept_card' | 'kinetic_text' | 'split_screen' | 'conclusion_outro';
    duration_seconds: number;
    title: string;
    subtitle?: string;
    points?: string[];
    background_gradient?: string;
    visual_vectors?: string[];
  }>;
}

export interface CompileOptions {
  onProgress?: (progress: number) => void;
}

export interface VideoCompiler {
  compile(blueprint: VideoBlueprint, opts?: CompileOptions): Promise<{ mp4Url: string }>;
}

export class PuppeteerFfmpegCompiler implements VideoCompiler {
  async compile(blueprint: VideoBlueprint, opts?: CompileOptions): Promise<{ mp4Url: string }> {
    const puppeteerModule = await eval("import('puppeteer')");
    const puppeteer = puppeteerModule.default || puppeteerModule;
    const ffmpegInstaller = eval("require('@ffmpeg-installer/ffmpeg')");
    const ffmpeg = eval("require('fluent-ffmpeg')");

    ffmpeg.setFfmpegPath(ffmpegInstaller.path);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edumotion-compile-'));
    console.log(`Starting video compilation in temp dir: ${tempDir}`);

    try {
      // 1. Ensure the Supabase 'videos' bucket exists
      try {
        await supabaseAdmin.storage.createBucket('videos', { public: true });
        console.log("Supabase storage bucket 'videos' ensured.");
      } catch (err) {
        // Ignore error if bucket already exists
      }

      // 2. Generate the dynamic HTML file in the temp directory
      const htmlPath = path.join(tempDir, 'renderer.html');
      const htmlContent = this.generateRendererHTML(blueprint);
      fs.writeFileSync(htmlPath, htmlContent);

      // 3. Launch headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });

      // 4. Calculate frames to capture
      const fps = 30;
      const sceneDurations = blueprint.scenes.map(s => s.duration_seconds || 4);
      const totalSeconds = sceneDurations.reduce((a, b) => a + b, 0);
      const totalFrames = Math.ceil(totalSeconds * fps);
      
      console.log(`Compiling ${totalFrames} frames for a ${totalSeconds}s video...`);

      // 5. Capture PNG frame screenshots
      for (let f = 0; f < totalFrames; f++) {
        // Evaluate javascript inside page to render specific frame
        await page.evaluate((frameIndex: number) => {
          // @ts-ignore
          window.renderFrame(frameIndex);
        }, f);

        // Take screen shot
        const framePath = path.join(tempDir, `frame_${f.toString().padStart(6, '0')}.png`);
        await page.screenshot({ path: framePath, type: 'png' });

        if (opts?.onProgress) {
          const progress = Math.round((f / totalFrames) * 50); // Frame capture counts for first 50% of work
          opts.onProgress(progress);
        }
      }

      await browser.close();
      console.log("Frames captured successfully. Commencing FFmpeg stitching...");

      // 6. Use FFmpeg to stitch PNGs into an H.264 MP4
      const outputVideoPath = path.join(tempDir, 'output.mp4');
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(path.join(tempDir, 'frame_%06d.png'))
          .inputFPS(fps)
          .output(outputVideoPath)
          .outputFPS(fps)
          .videoCodec('libx264')
          .outputOptions([
            '-pix_fmt yuv420p',
            '-crf 23',
            '-preset medium'
          ])
          .on('progress', (progressInfo: any) => {
            if (opts?.onProgress && progressInfo.percent) {
              const compilePercent = Math.round(50 + (progressInfo.percent / 100) * 45); // Stitching counts for next 45%
              opts.onProgress(Math.min(95, compilePercent));
            }
          })
          .on('end', () => {
            console.log('Stitching completed successfully!');
            resolve();
          })
          .on('error', (err: any) => {
            console.error('Error during FFmpeg stitching:', err);
            reject(err);
          })
          .run();
      });

      if (opts?.onProgress) {
        opts.onProgress(98);
      }

      // 7. Upload compiled MP4 to Supabase Storage
      const videoBuffer = fs.readFileSync(outputVideoPath);
      const uniqueFilename = `explainer_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      
      console.log(`Uploading ${uniqueFilename} to Supabase...`);
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('videos')
        .upload(uniqueFilename, videoBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr || !uploadData) {
        throw new Error(`Supabase upload failed: ${uploadErr?.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('videos')
        .getPublicUrl(uniqueFilename);

      console.log(`Upload complete! Public URL: ${publicUrl}`);

      if (opts?.onProgress) {
        opts.onProgress(100);
      }

      return { mp4Url: publicUrl };

    } finally {
      // 8. Cleanup temp files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temp directory: ${tempDir}`);
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }
  }

  private generateRendererHTML(blueprint: VideoBlueprint): string {
    const scenesJSON = JSON.stringify(blueprint.scenes);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Outfit', 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      width: 1280px;
      height: 720px;
      background: #09090b;
      color: #fafafa;
      overflow: hidden;
      box-sizing: border-box;
    }
    #canvas {
      width: 1280px;
      height: 720px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 64px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .relative { position: relative; }
    .absolute { position: absolute; }
    .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
    .z-0 { z-index: 0; }
    .z-10 { z-index: 10; }
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .flex-grow { flex-grow: 1; }
    .transition-all { transition: all 0.3s ease; }
    
    /* Dynamic background canvas */
    .bg-main-glow {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      z-index: 0;
      opacity: 0.4;
      transition: all 0.3s ease;
      filter: blur(100px);
    }
    .bg-radial {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      z-index: 0;
      background: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.1) 0%, rgba(9, 9, 11, 1) 70%, rgba(9, 9, 11, 1) 100%);
    }
    .bg-grid {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      z-index: 0;
      background-image: 
        linear-gradient(to right, rgba(128, 128, 128, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(128, 128, 128, 0.04) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    
    /* Background geometric decor shapes */
    .decor-circle-1 {
      position: absolute;
      width: 384px;
      height: 384px;
      border-radius: 9999px;
      background: rgba(79, 70, 229, 0.08);
      filter: blur(80px);
      z-index: 0;
      transition: all 0.3s ease;
    }
    .decor-circle-2 {
      position: absolute;
      width: 384px;
      height: 384px;
      border-radius: 9999px;
      background: rgba(6, 182, 212, 0.08);
      filter: blur(80px);
      z-index: 0;
      transition: all 0.3s ease;
    }
    
    /* Header & Tag styles */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      position: relative;
      z-index: 10;
    }
    .header-tag {
      color: #818cf8; /* indigo-400 */
      font-weight: 600;
      letter-spacing: 0.05em;
      font-size: 16px;
      text-transform: uppercase;
      background: rgba(30, 27, 75, 0.4); /* indigo-950/40 */
      padding: 6px 16px;
      border-radius: 9999px;
      border: 1px solid rgba(79, 70, 229, 0.2); /* indigo-900/40 */
    }
    .header-title {
      color: #71717a; /* zinc-500 */
      font-weight: 500;
      font-size: 16px;
      text-transform: uppercase;
    }
    
    /* Main dynamic viewport */
    #viewport {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-grow: 1;
      width: 100%;
      margin: 32px 0;
    }
    
    /* Footer Progress bar */
    .footer-container {
      position: relative;
      z-index: 10;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .progress-bar-bg {
      width: 100%;
      background: #18181b; /* zinc-900 */
      height: 8px;
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid rgba(39, 39, 42, 0.4); /* zinc-800/40 */
    }
    .progress-indicator {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #06b6d4, #6366f1);
      width: 0%;
    }
    .footer-text-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: #71717a; /* zinc-500 */
    }
    
    /* Layouts: Title Intro */
    .title-intro-container {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 900px;
    }
    .title-intro-heading {
      font-size: 64px;
      font-weight: 800;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #ffffff, #c7d2fe, #e0e7ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
      margin: 0;
    }
    .title-intro-subtitle {
      font-size: 24px;
      font-weight: 300;
      color: rgba(199, 210, 254, 0.8);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin: 0;
    }
    .glow-line {
      height: 4px;
      border-radius: 9999px;
      margin: 16px auto 0;
      width: 128px;
      background: linear-gradient(90deg, #6366f1, #06b6d4, #6366f1);
      background-size: 200% 100%;
    }
    
    /* Layouts: Concept Card */
    .concept-card-container {
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      border-radius: 32px;
      padding: 48px;
      max-width: 800px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 32px;
      box-sizing: border-box;
    }
    .concept-card-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .concept-card-label {
      color: #818cf8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 14px;
    }
    .concept-card-title {
      font-size: 36px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .divider {
      width: 100%;
      height: 1px;
      background: rgba(39, 39, 42, 0.6);
      margin-top: 16px;
    }
    .bullets-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .bullet-item {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 20px;
      color: #d4d4d8; /* zinc-300 */
    }
    .bullet-dot {
      width: 12px;
      height: 12px;
      border-radius: 9999px;
      background: linear-gradient(90deg, #6366f1, #06b6d4);
      flex-shrink: 0;
    }
    
    /* Layouts: Kinetic Text */
    .kinetic-text-container {
      text-align: center;
      max-width: 1000px;
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      font-size: 44px;
      font-weight: 500;
      letter-spacing: -0.025em;
    }
    .kinetic-word {
      display: inline-block;
      margin: 4px 12px;
      transition: all 0.2s ease;
    }
    .word-inactive {
      color: rgba(113, 113, 122, 0.8); /* zinc-500/80 */
    }
    .word-active {
      background: linear-gradient(90deg, #fbbf24, #f43f5e); /* amber-400 to rose-400 */
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 800;
      transform: scale(1.15);
      filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.4));
    }
    .word-passed {
      color: #e4e4e7; /* zinc-200 */
      font-weight: 600;
    }
    
    /* Layouts: Split Screen */
    .split-screen-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      width: 100%;
      max-width: 1000px;
    }
    .split-left {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 24px;
    }
    .split-right {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .split-label {
      color: #22d3ee; /* cyan-400 */
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 14px;
    }
    .split-title {
      font-size: 36px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      margin: 0;
    }
    .split-bullets {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0;
      margin: 8px 0 0 0;
      list-style: none;
    }
    .split-bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      font-size: 18px;
      color: #d4d4d8;
    }
    .split-bullet-check {
      color: #818cf8;
      font-weight: 700;
      margin-top: 2px;
    }
    
    /* Abstract orbit graphic */
    .orbit-container {
      position: relative;
      width: 320px;
      height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .orbit-outer {
      position: absolute;
      width: 288px;
      height: 288px;
      border: 2px dashed rgba(6, 182, 212, 0.2);
      border-radius: 9999px;
    }
    .orbit-inner {
      position: absolute;
      width: 240px;
      height: 240px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 9999px;
    }
    .orbit-card {
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 40px;
      width: 192px;
      height: 192px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
      position: relative;
    }
    .orbit-glow {
      position: absolute;
      width: 64px;
      height: 64px;
      border-radius: 9999px;
      background: linear-gradient(135deg, #6366f1, #22d3ee);
      opacity: 0.8;
      filter: blur(20px);
    }
    .orbit-glyphs {
      display: flex;
      gap: 8px;
      position: relative;
      z-index: 10;
    }
    .glyph-dot-1 {
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.9);
    }
    .glyph-dot-2 {
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: rgba(199, 210, 254, 0.9);
      transition: transform 0.1s ease;
    }
    .orbit-card-text {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 800;
      color: #22d3ee;
      letter-spacing: 0.1em;
      margin-top: 8px;
    }
    
    /* Layouts: Conclusion Outro */
    .outro-container {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 800px;
    }
    .outro-label {
      color: #22d3ee;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 18px;
    }
    .outro-heading {
      font-size: 56px;
      font-weight: 800;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #ffffff, #c7d2fe, #e0f2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .outro-subtitle {
      font-size: 20px;
      font-weight: 300;
      color: rgba(199, 210, 254, 0.8);
      line-height: 1.6;
      max-width: 500px;
      margin: 0 auto;
    }
    
    .radial-progress-container {
      position: relative;
      width: 96px;
      height: 96px;
      margin: 16px auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .radial-svg {
      width: 96px;
      height: 96px;
      transform: rotate(-90deg);
    }
    .radial-circle-bg {
      fill: transparent;
      stroke: #18181b;
      stroke-width: 6;
      r: 40;
      cx: 48;
      cy: 48;
    }
    .radial-circle-val {
      fill: transparent;
      stroke: #6366f1;
      stroke-width: 6;
      stroke-dasharray: 251.2;
      stroke-dashoffset: 251.2;
      r: 40;
      cx: 48;
      cy: 48;
      transition: stroke-dashoffset 0.1s ease;
    }
    .radial-text {
      position: absolute;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div id="canvas">
    
    <!-- Dynamic background canvas -->
    <div id="background-glow" class="bg-main-glow"></div>
    <div class="bg-radial"></div>
    <div class="bg-grid"></div>

    <!-- Background geometric decor shapes -->
    <div id="decor-circle-1" class="decor-circle-1"></div>
    <div id="decor-circle-2" class="decor-circle-2"></div>

    <!-- Header containing Grade and metadata -->
    <div class="header-container">
      <span class="header-tag" id="header-tag">EduMotion.ai</span>
      <span class="header-title" id="header-title">Concept Blueprint</span>
    </div>

    <!-- Main dynamic viewport -->
    <div id="viewport">
      <!-- Injected by layout script -->
    </div>

    <!-- Footer Progress bar -->
    <div class="footer-container">
      <div class="progress-bar-bg">
        <div id="progress-indicator" class="progress-indicator"></div>
      </div>
      <div class="footer-text-row">
        <span id="footer-scene-index">SCENE 1 OF 3</span>
        <span id="footer-time">0:00 / 0:10</span>
      </div>
    </div>
  </div>

  <script>
    const scenes = ${scenesJSON};
    const fps = 30;

    // Pre-calculate frame bounds and durations
    let accumulatedSeconds = 0;
    const sceneTimeline = scenes.map(s => {
      const start = accumulatedSeconds;
      accumulatedSeconds += (s.duration_seconds || 4);
      return {
        ...s,
        startSecond: start,
        endSecond: accumulatedSeconds,
        startFrame: Math.round(start * fps),
        endFrame: Math.round(accumulatedSeconds * fps),
        totalFrames: Math.round((s.duration_seconds || 4) * fps)
      };
    });

    const totalSeconds = accumulatedSeconds;
    const totalFrames = Math.ceil(totalSeconds * fps);

    // Dynamic color maps
    const gradients = {
      title_intro: "linear-gradient(135deg, #4f46e5, #06b6d4)",
      concept_card: "linear-gradient(135deg, #8b5cf6, #ec4899)",
      kinetic_text: "linear-gradient(135deg, #f59e0b, #e11d48)",
      split_screen: "linear-gradient(135deg, #10b981, #06b6d4)",
      conclusion_outro: "linear-gradient(135deg, #6366f1, #a855f7)"
    };

    window.renderFrame = function(frameIndex) {
      if (frameIndex >= totalFrames) frameIndex = totalFrames - 1;
      
      const currentTime = frameIndex / fps;
      
      // Find current active scene
      const sceneIndex = sceneTimeline.findIndex(s => frameIndex >= s.startFrame && frameIndex < s.endFrame);
      const activeScene = sceneIndex !== -1 ? sceneTimeline[sceneIndex] : sceneTimeline[sceneTimeline.length - 1];
      const activeSceneIndex = sceneIndex !== -1 ? sceneIndex : sceneTimeline.length - 1;

      // Calculate progress indicators
      const progressPercent = (frameIndex / totalFrames) * 100;
      document.getElementById('progress-indicator').style.width = progressPercent + '%';
      
      document.getElementById('footer-scene-index').innerText = 'SCENE ' + (activeSceneIndex + 1) + ' OF ' + scenes.length;
      document.getElementById('footer-time').innerText = currentTime.toFixed(1) + 's / ' + totalSeconds.toFixed(1) + 's';
      
      // Update header details
      document.getElementById('header-title').innerText = activeScene.title || "EduMotion Blueprint";
      document.getElementById('header-tag').innerText = activeScene.layout.replace('_', ' ').toUpperCase();

      // Time progress inside this scene (0.0 to 1.0)
      const sceneFrameOffset = frameIndex - activeScene.startFrame;
      const t = Math.max(0, Math.min(1, sceneFrameOffset / activeScene.totalFrames));

      // Dynamic backgrounds & décor transformations
      const grad = activeScene.background_gradient || gradients[activeScene.layout] || gradients.title_intro;
      document.getElementById('background-glow').style.background = grad;
      
      // Animate background décor shapes based on time
      const circ1 = document.getElementById('decor-circle-1');
      const circ2 = document.getElementById('decor-circle-2');
      
      circ1.style.top = (10 + Math.sin(currentTime * 0.8) * 10) + '%';
      circ1.style.left = (15 + Math.cos(currentTime * 0.8) * 10) + '%';
      circ2.style.bottom = (10 + Math.cos(currentTime * 0.8) * 10) + '%';
      circ2.style.right = (15 + Math.sin(currentTime * 0.8) * 10) + '%';

      // Render custom layout content
      const viewport = document.getElementById('viewport');
      viewport.innerHTML = ''; // Clear layout

      if (activeScene.layout === 'title_intro') {
        const scale = 1 + (t * 0.05); // subtle growth
        const opacity = t < 0.15 ? (t / 0.15) : (t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1);
        
        viewport.innerHTML = \`
          <div class="title-intro-container" style="transform: scale(\${scale}); opacity: \${opacity}">
            <h1 class="title-intro-heading">
              \${activeScene.title}
            </h1>
            <p class="title-intro-subtitle">
              \${activeScene.subtitle || ''}
            </p>
            <div class="glow-line" style="background-position: \${t * 200}% 0"></div>
          </div>
        \`;
      } 
      else if (activeScene.layout === 'concept_card') {
        const opacity = t < 0.15 ? (t / 0.15) : (t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1);
        const cardY = t < 0.2 ? ((0.2 - t) * 100) : 0; // slide up

        const bullets = (activeScene.points || []).map((pt, idx) => {
          // Reveal points one by one
          const revealStart = 0.2 + (idx * 0.15);
          const ptOpacity = t > revealStart ? Math.min(1, (t - revealStart) * 10) : 0;
          const ptX = t > revealStart ? Math.max(0, (revealStart + 0.1 - t) * 50) : -20;
          
          return \`
            <div class="bullet-item" style="opacity: \${ptOpacity}; transform: translateX(\${ptX}px)">
              <div class="bullet-dot"></div>
              <span>\${pt}</span>
            </div>
          \`;
        }).join('');

        viewport.innerHTML = \`
          <div class="concept-card-container" style="opacity: \${opacity}; transform: translateY(\${cardY}px)">
            <div class="concept-card-header">
              <span class="concept-card-label">Key Insight</span>
              <h2 class="concept-card-title">\${activeScene.title}</h2>
              <div class="divider"></div>
            </div>
            <div class="bullets-container">
              \${bullets}
            </div>
          </div>
        \`;
      }
      else if (activeScene.layout === 'kinetic_text') {
        const words = activeScene.title.split(' ');
        const totalWords = words.length;
        
        const renderedWords = words.map((word, idx) => {
          // Highlight/scale active word in sequence
          const wordActiveStart = 0.15 + (idx * (0.7 / totalWords));
          const wordActiveEnd = wordActiveStart + (0.7 / totalWords);
          
          let wordClass = "kinetic-word word-inactive";
          
          if (t >= wordActiveStart && t < wordActiveEnd) {
            wordClass = "kinetic-word word-active";
          } else if (t >= wordActiveEnd) {
            wordClass = "kinetic-word word-passed";
          }

          return \`
            <span class="\${wordClass}">
              <span>\${word}</span>
            </span>
          \`;
        }).join('');

        viewport.innerHTML = \`
          <div class="kinetic-text-container">
            \${renderedWords}
          </div>
        \`;
      }
      else if (activeScene.layout === 'split_screen') {
        const opacity = t < 0.15 ? (t / 0.15) : (t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1);
        
        // Dynamic vector shape animation
        const rotation = currentTime * 45; // rotate degree
        const pulse = 1 + (Math.sin(currentTime * 4) * 0.08); // pulse scale
        
        const bulletList = (activeScene.points || []).map((pt, idx) => {
          const rStart = 0.2 + (idx * 0.12);
          const bOpacity = t > rStart ? 1 : 0;
          const bX = t > rStart ? 0 : -30;
          return \`
            <li class="split-bullet-item" style="opacity: \${bOpacity}; transform: translateX(\${bX}px)">
              <span class="split-bullet-check">&#10004;</span>
              <span>\${pt}</span>
            </li>
          \`;
        }).join('');

        viewport.innerHTML = \`
          <div class="split-screen-grid" style="opacity: \${opacity}">
            
            <!-- Left Text Column -->
            <div class="split-left">
              <div>
                <span class="split-label">\${activeScene.subtitle || 'Analysis'}</span>
                <h2 class="split-title">\${activeScene.title}</h2>
              </div>
              <ul class="split-bullets">
                \${bulletList}
              </ul>
            </div>
            
            <!-- Right Graphic Column -->
            <div class="split-right">
              <div class="orbit-container">
                <!-- Abstract glowing orbit vector -->
                <div class="orbit-outer" style="transform: rotate(-\${rotation}deg)"></div>
                <div class="orbit-inner" style="transform: rotate(\${rotation}deg)"></div>
                
                <!-- Central pulsing glyph/shape -->
                <div class="orbit-card" style="transform: scale(\${pulse})">
                  <div class="orbit-glow"></div>
                  
                  <div class="orbit-glyphs">
                    <div class="glyph-dot-1"></div>
                    <div class="glyph-dot-2" style="transform: translateX(\${Math.sin(currentTime * 3) * 10}px)"></div>
                  </div>
                  <span class="orbit-card-text">Simulation</span>
                </div>
              </div>
            </div>

          </div>
        \`;
      }
      else if (activeScene.layout === 'conclusion_outro') {
        const scale = 1.05 - (t * 0.05);
        const opacity = t < 0.15 ? (t / 0.15) : (t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1);
        
        viewport.innerHTML = \`
          <div class="outro-container" style="transform: scale(\${scale}); opacity: \${opacity}">
            <span class="outro-label">Congratulations!</span>
            <h1 class="outro-heading">
              \${activeScene.title}
            </h1>
            <p class="outro-subtitle">
              \${activeScene.subtitle || 'Ready to test your knowledge in the interactive lab workspace?'}
            </p>
            <div class="radial-progress-container">
              <svg class="radial-svg">
                <circle class="radial-circle-bg"/>
                <circle class="radial-circle-val" style="stroke-dashoffset: \${251.2 * (1 - t)}"/>
              </svg>
              <span class="radial-text">\${Math.round(t * 100)}%</span>
            </div>
          </div>
        \`;
      }
    };

    // First frame initialization
    renderFrame(0);
  </script>
</body>
</html>
`;
  }
}
