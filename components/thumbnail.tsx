import * as React from "react"
import { Icon } from "./icons"
import { cn } from "@/lib/utils"

export interface ThumbnailProps extends React.HTMLAttributes<HTMLDivElement> {
  from: string
  to: string
  tag?: string
  dark?: boolean
  ratio?: string
  radius?: number
  mini?: boolean
}

export function Thumbnail({
  from,
  to,
  tag,
  dark,
  ratio = "16/9",
  radius = 16,
  mini = false,
  className,
  style,
  ...props
}: ThumbnailProps) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: ratio,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        ...style,
      }}
      {...props}
    >
      <div className="absolute inset-0 opacity-90">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 112"
          preserveAspectRatio="xMidYMid slice"
        >
          <circle cx="160" cy="22" r="34" fill="rgba(255,255,255,.28)" />
          <circle cx="34" cy="92" r="26" fill="rgba(255,255,255,.18)" />
          <path
            d="M0 80 Q50 50 100 78 T200 70 V112 H0 Z"
            fill="rgba(255,255,255,.16)"
          />
        </svg>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-white/92 shadow-[0_6px_18px_rgba(0,0,0,.18)]",
            mini ? "h-6 w-6" : "h-[46px] w-[46px]"
          )}
        >
          <Icon
            name="play"
            size={mini ? 11 : 18}
            className="text-ink"
            fill="currentColor"
            strokeWidth={0}
            style={mini ? { marginLeft: 1 } : {}}
          />
        </div>
      </div>

      {tag && (
        <span
          className="absolute left-2.5 top-2.5 rounded-full px-[9px] py-1 font-body text-[10.5px] font-bold backdrop-blur-[4px]"
          style={{
            background: dark ? "rgba(0,0,0,.32)" : "rgba(255,255,255,.82)",
            color: dark ? "#fff" : "var(--color-ink)",
          }}
        >
          {tag}
        </span>
      )}
    </div>
  )
}
