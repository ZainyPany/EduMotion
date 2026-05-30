"use client"

/**
 * Desktop Sidebar — visible at the `md` breakpoint and above.
 *
 * Renders the EduMotion logo, primary navigation items, a "New video" CTA
 * button, and the signed-in user's avatar/name at the bottom. When Clerk has
 * not yet loaded (or the user is not signed in) it falls back to a placeholder
 * avatar and the string "Ms. Rivera".
 */

import * as React from "react"
import { Icon, IconName } from "./icons"
import { cn } from "@/lib/utils"
import { useUser, UserButton } from "@clerk/nextjs"

/** The four primary navigation destinations in the app. */
export type ViewType = "dashboard" | "create" | "content" | "viewer"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  onCreateNew?: () => void
}

const navItems: { id: ViewType; icon: IconName; label: string }[] = [
  { id: "dashboard", icon: "home", label: "Dashboard" },
  { id: "create", icon: "wand", label: "Create" },
  { id: "content", icon: "folder", label: "My Content" },
  // Map "recent" visual to dashboard or a sub-view. For now, it doesn't change main views or maps to dashboard
]

export function Sidebar({
  activeView,
  onViewChange,
  onCreateNew,
  className,
  ...props
}: SidebarProps) {
  const { isLoaded, isSignedIn, user } = useUser()

  return (
    <div
      className={cn(
        "flex w-[218px] flex-none flex-col border-r border-line bg-white px-[18px] py-[26px]",
        className
      )}
      {...props}
    >
      <div className="mb-[30px] ml-1.5 flex items-center gap-[11px]">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-ink">
          <Icon name="film" size={18} className="text-white" />
        </div>
        <span className="font-display text-[18px] font-bold tracking-[-0.4px]">
          EduMotion
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.id === activeView
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-[13px] py-[11px] text-[14px] transition-colors",
                isActive
                  ? "bg-cream font-semibold text-ink"
                  : "font-medium text-ink-2 hover:bg-cream/50"
              )}
            >
              <Icon
                name={item.icon}
                size={19}
                className={isActive ? "text-ink" : "text-ink-3"}
              />
              {item.label}
            </button>
          )
        })}
        {/* Recent link acts like a filter or dashboard tab in this mock */}
        <button
          onClick={() => onViewChange("dashboard")}
          className="flex items-center gap-3 rounded-xl px-[13px] py-[11px] text-[14px] font-medium text-ink-2 transition-colors hover:bg-cream/50"
        >
          <Icon name="clock" size={19} className="text-ink-3" />
          Recent
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => {
          if (onCreateNew) onCreateNew()
          else onViewChange("create")
        }}
        className="mb-3.5 flex items-center justify-center gap-[9px] rounded-[13px] border-none bg-ink p-[13px] font-display text-[14px] font-semibold text-white cursor-pointer hover:bg-ink/90 transition-colors"
      >
        <Icon name="plus" size={17} className="text-white" /> New video
      </button>

      <div className="flex items-center gap-2.5 px-1.5 py-2">
        <div className="h-[34px] w-[34px] shrink-0 overflow-hidden rounded-full border border-line">
          {isLoaded && isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-full w-full",
                },
              }}
            />
          ) : (
            <img
              src="https://i.pravatar.cc/80?img=47"
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="leading-[1.2]">
          <div className="text-[13px] font-semibold truncate w-[120px]">
            {isLoaded && isSignedIn ? user.fullName : "Ms. Rivera"}
          </div>
          <div className="text-[11.5px] text-ink-3">Year 5 · Science</div>
        </div>
      </div>
    </div>
  )
}
