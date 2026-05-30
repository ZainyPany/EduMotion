/**
 * Shared domain types used across the front-end and API layer.
 *
 * VideoRecord is the primary client-side model. The Lab* types mirror the
 * JSON schema the AI returns and are stored verbatim in `generated_labs.steps_payload`.
 */

import { StatusKind } from "@/components/status-pill"

/** A single video / lab record as it appears in the UI and local state. */
export interface VideoRecord {
  /** UUID — either a Supabase-generated ID or a seeded demo string. */
  id: string
  title: string
  /** Subject tag displayed on thumbnails (e.g. "Science", "Maths"). */
  tag: string
  status: StatusKind
  /** Human-readable creation date shown in lists (e.g. "May 24", "Just now"). */
  date: string
  /** Display duration string, e.g. "1:02" or "—" while generating. */
  duration: string
  /** View count as a locale-formatted string (e.g. "1,204"). */
  views: string
  /** The raw user prompt that was submitted to generate this record. */
  prompt: string
  /** Gradient start colour for the placeholder thumbnail. */
  from: string
  /** Gradient end colour for the placeholder thumbnail. */
  to: string
  /** Public URL of the compiled MP4 in Supabase Storage, if available. */
  mp4Url?: string
  /** Ordered array of interactive-lab steps, populated when asset_type is LAB or BOTH. */
  labSteps?: LabStep[]
  /** Title of the lab, extracted from the AI payload metadata. */
  labTitle?: string
}

// ── Interactive Lab types ──────────────────────────────────────────────────────
// These mirror the LAB JSON schema the AI is prompted to return.
// See the SYSTEM_PROMPT in lib/inngest/functions.ts for the authoritative schema.

/** Quiz assessment block attached to a single lab step. */
export interface LabQuiz {
  has_quiz: boolean
  question: string
  /** Answer options shown to the student (typically 3). */
  options: string[]
  /** Zero-based index of the correct answer in `options`. */
  correct_index: number
}

/** A single step within an interactive lab. */
export interface LabStep {
  step_id: number
  /** Layout hint from the AI (e.g. "split_screen_visualization", "conclusion_outro"). */
  layout?: string
  heading: string
  /** Step body text in lightweight Markdown (bold, bullets, numbered lists). */
  body_markdown: string
  /** Hints for the visual panel animation (type slug + playback speed). */
  visual_component_state?: {
    animation_type?: string
    speed?: string
    [key: string]: unknown
  }
  assessment?: LabQuiz
}

/** Top-level shape of the JSON blob stored in `generated_labs.steps_payload`. */
export interface LabPayload {
  metadata?: { title?: string; grade_level?: string }
  steps: LabStep[]
}
