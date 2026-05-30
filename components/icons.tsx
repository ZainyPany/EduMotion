import * as React from "react"
import { cn } from "@/lib/utils"

const iconPaths = {
  grid:    'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  spark:   'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  film:    'M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4',
  clock:   'M12 7v5l3 2 M12 21a9 9 0 100-18 9 9 0 000 18z',
  folder:  'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  search:  'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4-4',
  bell:    'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 01-3.4 0',
  plus:    'M12 5v14M5 12h14',
  play:    'M7 4l13 8-13 8z',
  edit:    'M12 20h9 M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash:   'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
  share:   'M4 12v8h16v-8 M12 3v13 M8 7l4-4 4 4',
  gear:    'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H1a2 2 0 110-4h.1A1.6 1.6 0 004.6 5l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-1.1V1a2 2 0 114 0v.1A1.6 1.6 0 0019 4.6l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H23a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z',
  home:    'M3 11l9-8 9 8 M5 10v10h14V10',
  chart:   'M4 19V5 M4 19h16 M8 16v-5 M12 16V8 M16 16v-8',
  book:    'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z M19 3v18',
  music:   'M9 18V5l11-2v13 M9 18a3 3 0 11-6 0 3 3 0 016 0z M20 16a3 3 0 11-6 0 3 3 0 016 0z',
  wand:    'M15 4V2 M15 16v-2 M8 9h2 M20 9h2 M17.8 11.8l1.4 1.4 M17.8 6.2l1.4-1.4 M3 21l9-9 M12.2 6.2L10.8 4.8',
  arrow:   'M5 12h14 M13 6l6 6-6 6',
  check:   'M4 12l5 5L20 6',
  dots:    'M5 12h.01M12 12h.01M19 12h.01',
  globe:   'M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3a15 15 0 010 18 15 15 0 010-18z',
  layers:  'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  user:    'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 4-6 8-6s8 2 8 6',
  rocket:  'M5 15c-1 1-1 4-1 4s3 0 4-1 M14.5 4.5C17 2 21 2 21 2s0 4-2.5 6.5L12 15l-3-3z M9 12l-2 1 M12 15l-1 2',
  caret:   'M6 9l6 6 6-6',
} as const

export type IconName = keyof typeof iconPaths

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
  strokeWidth?: number
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className,
  fill = "none",
  ...props
}: IconProps) {
  const path = iconPaths[name]
  
  if (!path) return null
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("flex-shrink-0", className)}
      {...props}
    >
      <path d={path} />
    </svg>
  )
}
