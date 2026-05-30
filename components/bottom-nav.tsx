import * as React from "react"
import { Icon, IconName } from "./icons"
import { cn } from "@/lib/utils"

export interface BottomNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: { id: string; icon: IconName }[]
  activeId: string
  onViewChange: (id: string) => void
  theme?: "light" | "dark"
  fab?: boolean
}

export function BottomNav({
  items,
  activeId,
  onViewChange,
  theme = "light",
  fab = false,
  className,
  ...props
}: BottomNavProps) {
  const isDark = theme === "dark"

  return (
    <div
      className={cn(
        "flex-none relative pb-[22px] pt-2.5 px-[18px]",
        isDark ? "bg-ink rounded-t-[26px]" : "bg-white border-t border-line",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = item.id === activeId
          
          let colorClass = ""
          if (isDark) {
            colorClass = isActive ? "text-white" : "text-white/40"
          } else {
            colorClass = isActive ? (fab ? "text-white" : "text-ink") : "text-ink-3"
          }

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "p-2 rounded-full transition-colors",
                colorClass
              )}
            >
              <Icon name={item.icon} size={24} className="fill-transparent" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
