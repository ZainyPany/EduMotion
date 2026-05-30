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
}
