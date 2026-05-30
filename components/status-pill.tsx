import * as React from "react"
import { cn } from "@/lib/utils"

export type StatusKind = "draft" | "published" | "generating"

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind: StatusKind
}

const statusMap = {
  draft: {
    bg: "bg-peach-soft",
    text: "text-peach-ink",
    dot: "bg-peach",
    label: "Draft",
  },
  published: {
    bg: "bg-mint-soft",
    text: "text-mint-ink",
    dot: "bg-mint",
    label: "Published",
  },
  generating: {
    bg: "bg-lav-soft",
    text: "text-lav-ink",
    dot: "bg-lav",
    label: "Generating",
  },
}

export function StatusPill({ kind, className, ...props }: StatusPillProps) {
  const config = statusMap[kind] || statusMap.draft

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] font-body text-[11px] font-semibold",
        config.bg,
        config.text,
        className
      )}
      {...props}
    >
      <span className={cn("h-[7px] w-[7px] rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}
