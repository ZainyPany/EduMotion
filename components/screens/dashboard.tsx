import * as React from "react"
import { Icon } from "@/components/icons"
import { StatusPill } from "@/components/status-pill"
import { Thumbnail } from "@/components/thumbnail"
import { VideoRecord } from "@/lib/types"

interface DashboardProps {
  videos: VideoRecord[]
  userName: string
  onVideoSelect: (id: string) => void
  onCreateNew: () => void
}

export function Dashboard({
  videos,
  userName,
  onVideoSelect,
  onCreateNew,
}: DashboardProps) {
  const recentVideos = videos.slice(0, 4)

  return (
    <div className="flex h-full w-full flex-col">
      {/* DESKTOP VIEW (FocusDashboard) */}
      <div className="hidden md:flex flex-1 flex-col overflow-auto px-[40px] py-[34px]">
        <div className="mb-[30px] flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.3px] text-ink-3">
              Overview
            </div>
            <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.8px]">
              Welcome back, {userName}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-line">
              <Icon name="search" size={17} className="text-ink-2" />
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-line">
              <Icon name="bell" size={17} className="text-ink-2" />
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mb-[30px] grid grid-cols-3 gap-4">
          {[
            ["24", "Total videos", "var(--color-mint)"],
            ["3", "Drafts", "var(--color-peach)"],
            ["1.2k", "Total views", "var(--color-lav)"],
          ].map(([n, l, c], i) => (
            <div
              key={i}
              className="rounded-2xl border border-line px-5 py-[18px]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: c }}
                />
                <span className="text-[13px] font-medium text-ink-2">{l}</span>
              </div>
              <div className="mt-2.5 font-display text-[32px] font-bold tracking-[-1px]">
                {n}
              </div>
            </div>
          ))}
        </div>

        {/* Recent content list */}
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold">Recent content</h3>
          <button className="text-[13px] text-ink-3 hover:text-ink transition-colors">
            View all
          </button>
        </div>

        <div className="flex flex-col">
          {recentVideos.map((r, i) => (
            <div
              key={r.id}
              onClick={() => onVideoSelect(r.id)}
              className="group flex cursor-pointer items-center gap-4 border-b border-line px-1.5 py-[15px] last:border-none"
            >
              <div
                className="grid h-10 w-16 shrink-0 place-items-center rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${r.from}, rgba(255,255,255,0.4))`,
                }}
              >
                <Icon
                  name="play"
                  size={13}
                  className="fill-white text-white"
                  strokeWidth={0}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold group-hover:text-sky-ink transition-colors">
                  {r.title}
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">
                  {r.tag} · {r.duration}
                </div>
              </div>
              <StatusPill kind={r.status} />
              <span className="w-[50px] text-right text-[12.5px] text-ink-3">
                {r.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW (SunnyMobile) */}
      <div className="flex md:hidden flex-1 flex-col overflow-auto bg-cream-2 px-[18px] pt-1.5 pb-6">
        <div className="mb-[18px] flex items-start justify-between">
          <div>
            <div className="text-[12.5px] font-semibold text-ink-3">
              Good morning 👋
            </div>
            <h2 className="mt-0.5 text-[22px] font-display font-bold tracking-[-0.5px]">
              {userName}
            </h2>
          </div>
          <img
            src="https://i.pravatar.cc/80?img=47"
            alt="Avatar"
            className="h-[42px] w-[42px] rounded-full border-2 border-white object-cover shadow-sm"
          />
        </div>

        <div
          className="relative mb-[18px] overflow-hidden rounded-[22px] p-[18px]"
          style={{ background: "linear-gradient(120deg, #FBEFC0, #F6A6C0)" }}
        >
          <div className="absolute -right-4 -top-5 h-[90px] w-[90px] rounded-full bg-white/35" />
          <h3 className="relative text-[18px] font-display font-bold leading-tight">
            Create a video
            <br />
            from a prompt
          </h3>
          <button
            onClick={onCreateNew}
            className="mt-3.5 inline-flex items-center gap-2 rounded-full border-none bg-ink px-[18px] py-[11px] font-display text-[13.5px] font-bold text-white shadow-sm"
          >
            <Icon name="wand" size={16} className="text-white" /> Create New
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[15px] font-display font-bold">Recent</h4>
          <span className="text-[12.5px] font-semibold text-mint-ink">
            See all
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {recentVideos.map((r) => (
            <div
              key={r.id}
              onClick={() => onVideoSelect(r.id)}
              className="flex items-center gap-3 rounded-[18px] bg-white p-2.5 shadow-sm active:scale-[0.98] transition-transform"
            >
              <Thumbnail
                from={r.from}
                to={r.to}
                radius={12}
                className="w-[92px] shrink-0"
              />
              <div className="flex-1">
                <div className="text-[14px] font-semibold leading-tight">
                  {r.title}
                </div>
                <div className="my-[3px] mb-2 text-[11.5px] text-ink-3">
                  {r.tag}
                </div>
                <StatusPill kind={r.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
