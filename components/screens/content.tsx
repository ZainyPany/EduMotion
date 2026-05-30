import * as React from "react"
import { Icon } from "@/components/icons"
import { StatusPill } from "@/components/status-pill"
import { Thumbnail } from "@/components/thumbnail"
import { VideoRecord } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ContentProps {
  videos: VideoRecord[]
  onVideoSelect: (id: string) => void
  onDeleteVideo?: (id: string) => void
  onShareVideo?: (id: string) => void
}

type FilterType = "All" | "Drafts" | "Published"

export function Content({
  videos,
  onVideoSelect,
  onDeleteVideo,
  onShareVideo,
}: ContentProps) {
  const [filter, setFilter] = React.useState<FilterType>("All")

  const filteredVideos = videos.filter((v) => {
    if (filter === "All") return true
    if (filter === "Drafts") return v.status === "draft"
    if (filter === "Published") return v.status === "published"
    return true
  })

  return (
    <div className="flex h-full w-full flex-col overflow-auto px-[18px] py-[24px] md:px-[40px] md:py-[34px]">
      <h1 className="font-display text-[26px] md:text-[30px] font-bold tracking-[-0.7px]">
        My Content
      </h1>

      <div className="my-[20px] flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["All", "Drafts", "Published"] as FilterType[]).map((t) => {
            const isActive = t === filter
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-[7px] rounded-full border px-[15px] py-[8px] text-[13px] font-semibold transition-colors",
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-ink-2 hover:bg-cream-2"
                )}
              >
                {t}
              </button>
            )
          })}
        </div>
        <div className="hidden md:flex items-center gap-2 text-[13px] text-ink-3">
          <Icon name="grid" size={16} className="text-ink-2" /> Grid
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
        {filteredVideos.map((c) => (
          <div
            key={c.id}
            onClick={() => onVideoSelect(c.id)}
            className="group relative cursor-pointer rounded-[18px] border border-line bg-white p-[11px] transition-all duration-[0.22s] ease-[cubic-bezier(0.2,0.8,0.25,1)] hover:-translate-y-1 hover:shadow-sh-lg"
          >
            <div className="relative">
              <Thumbnail
                from={c.from}
                to={c.to}
                tag={c.tag}
                radius={12}
                className="w-full"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onVideoSelect(c.id) // acts as edit prompt
                  }}
                  className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/92 shadow-sh-sm hover:bg-white transition-colors"
                >
                  <Icon name="edit" size={13} className="text-ink-2" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onShareVideo) onShareVideo(c.id)
                  }}
                  className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/92 shadow-sh-sm hover:bg-white transition-colors"
                >
                  <Icon name="share" size={13} className="text-ink-2" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onDeleteVideo) onDeleteVideo(c.id)
                  }}
                  className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/92 shadow-sh-sm hover:bg-coral-soft hover:text-coral-ink transition-colors"
                >
                  <Icon name="trash" size={13} className="text-ink-2" />
                </button>
              </div>
            </div>
            <div className="px-[5px] pb-1 pt-[11px]">
              <div className="text-[14px] font-semibold leading-[1.25]">
                {c.title}
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <StatusPill kind={c.status} />
                <span className="text-[11.5px] text-ink-3">{c.date}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredVideos.length === 0 && (
          <div className="col-span-full py-10 text-center text-ink-3">
            No videos found for this filter.
          </div>
        )}
      </div>
    </div>
  )
}
