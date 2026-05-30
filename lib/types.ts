import { StatusKind } from "@/components/status-pill"

export interface VideoRecord {
  id: string
  title: string
  tag: string
  status: StatusKind
  date: string
  duration: string
  views: string
  prompt: string
  from: string
  to: string
  mp4Url?: string
  labSteps?: LabStep[]
  labTitle?: string
}

// ===== Interactive Lab types =====
// Mirrors the LAB payload schema the AI returns (see lib/inngest/functions.ts)

export interface LabQuiz {
  has_quiz: boolean
  question: string
  options: string[]
  correct_index: number
}

export interface LabStep {
  step_id: number
  layout?: string
  heading: string
  body_markdown: string
  visual_component_state?: {
    animation_type?: string
    speed?: string
    [key: string]: unknown
  }
  assessment?: LabQuiz
}

export interface LabPayload {
  metadata?: { title?: string; grade_level?: string }
  steps: LabStep[]
}
