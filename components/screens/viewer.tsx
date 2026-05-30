import * as React from "react"
import { Icon, IconName } from "@/components/icons"
import { StatusPill } from "@/components/status-pill"
import { VideoRecord } from "@/lib/types"

interface ViewerProps {
  video: VideoRecord
  onBack: () => void
  onEditPrompt: () => void
  onRegenerate: () => void
  onShare: () => void
  onDelete: () => void
}

export function Viewer({
  video,
  onBack,
  onEditPrompt,
  onRegenerate,
  onShare,
  onDelete,
}: ViewerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => console.error("Error playing video:", err))
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying])

  React.useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }, [video])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const duration = videoRef.current.duration || 1
      setProgress((current / duration) * 100)
      setCurrentTime(current)
    }
  }

  const handleVideoEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
  }

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const width = rect.width
      const percentage = clickX / width
      videoRef.current.currentTime = percentage * videoRef.current.duration
      setProgress(percentage * 100)
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-white px-[18px] py-[24px] md:px-[40px] md:py-[30px]">
      <div
        onClick={onBack}
        className="mb-[18px] flex w-fit cursor-pointer items-center gap-[10px] text-[13px] text-ink-3 transition-colors hover:text-ink"
      >
        <Icon name="arrow" size={16} className="-scale-x-100 text-ink-3" />
        Back to My Content
      </div>

      {/* Video Player */}
      <div className="relative aspect-[16/11] md:aspect-[16/8] w-full overflow-hidden rounded-[20px] shadow-sm bg-black">
        {video.mp4Url ? (
          <video
            ref={videoRef}
            src={video.mp4Url}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onClick={() => setIsPlaying(!isPlaying)}
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(150deg, ${video.from}, ${video.to})` }}
            />
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 200 100"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 opacity-85"
            >
              <circle cx="168" cy="18" r="30" fill="rgba(255,255,255,.3)" />
              <path d="M0 72 Q50 44 100 70 T200 60 V100 H0Z" fill="rgba(255,255,255,.2)" />
            </svg>
          </>
        )}

        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          {!isPlaying && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(true);
              }}
              className="pointer-events-auto grid h-[52px] w-[52px] md:h-[62px] md:w-[62px] place-items-center rounded-full bg-white/95 shadow-sh transition-transform hover:scale-105 active:scale-95"
            >
              <Icon
                name="play"
                size={24}
                className="fill-ink text-ink ml-1"
                strokeWidth={0}
              />
            </button>
          )}
        </div>

        {/* Player Controls Scrim */}
        <div
          className="absolute bottom-0 left-0 right-0 p-[14px] md:px-[18px] md:pb-[14px] md:pt-[18px] z-10"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,.5))" }}
        >
          {/* Scrubber */}
          <div 
            onClick={handleScrubberClick}
            className="h-1 md:h-[5px] w-full rounded-full bg-white/40 cursor-pointer"
          >
            <div
              className="relative h-full rounded-full bg-white"
              style={{ width: `${progress}%` }}
            >
              <span className="absolute -right-[5px] top-1/2 h-2.5 w-2.5 md:h-3 md:w-3 -translate-y-1/2 rounded-full bg-white shadow-sh-sm" />
            </div>
          </div>
          {/* Bottom Bar */}
          <div className="mt-2.5 md:mt-[11px] flex items-center justify-between text-white">
            <div className="flex items-center gap-3.5">
              <button onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? (
                  <div className="flex h-[18px] w-[18px] items-center justify-center gap-[3px]">
                    <div className="h-3 w-1 bg-white" />
                    <div className="h-3 w-1 bg-white" />
                  </div>
                ) : (
                  <Icon name="play" size={18} className="fill-white text-white" strokeWidth={0} />
                )}
              </button>
              <Icon name="music" size={17} className="text-white hidden md:block" />
              <span className="text-[11.5px] md:text-[12.5px] font-semibold">
                0:{Math.floor(currentTime).toString().padStart(2, '0')} / {video.duration}
              </span>
            </div>
            <Icon name="layers" size={15} className="text-white md:w-[17px] md:h-[17px]" />
          </div>
        </div>
      </div>

      {/* Meta + Actions */}
      <div className="mt-4 md:mt-[22px] flex flex-col items-start justify-between gap-6 md:flex-row md:gap-6">
        <div className="flex-1">
          <div className="mb-2.5 flex items-center gap-2.5">
            <StatusPill kind={video.status} />
            <span className="text-[12px] md:text-[12.5px] text-ink-3">
              Created {video.date} · {video.views} views
            </span>
          </div>
          <h1 className="font-display text-[20px] md:text-[26px] font-bold tracking-[-0.6px]">
            {video.title}
          </h1>

          <div className="mt-3.5 md:mt-4 rounded-[14px] border border-line bg-cream px-[15px] py-[13px] md:px-[16px] md:py-[14px]">
            <div className="text-[11px] md:text-[11.5px] font-bold uppercase tracking-[0.4px] text-ink-3">
              Prompt
            </div>
            <p className="mt-1.5 md:mt-[7px] text-[13px] md:text-[14px] leading-[1.55] text-ink-2">
              “{video.prompt}”
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full flex-none flex-col gap-2.5 md:w-[200px]">
          <div className="flex w-full gap-[9px] md:flex-col md:gap-[9px]">
            <button
              onClick={onEditPrompt}
              className="flex flex-1 items-center justify-center gap-2 md:justify-start md:gap-[10px] rounded-xl border-none bg-lav-soft p-3 font-display text-[13px] md:text-[13.5px] font-bold text-lav-ink cursor-pointer hover:bg-lav transition-colors"
            >
              <Icon name="edit" size={16} className="text-lav-ink" />
              <span className="hidden md:inline">Edit prompt</span>
              <span className="md:hidden">Edit</span>
            </button>
            <button
              onClick={onRegenerate}
              className="flex flex-1 items-center justify-center gap-2 md:justify-start md:gap-[10px] rounded-xl border-none bg-mint-soft p-3 font-display text-[13px] md:text-[13.5px] font-bold text-mint-ink cursor-pointer hover:bg-mint transition-colors"
            >
              <Icon name="wand" size={15} className="text-mint-ink md:h-4 md:w-4" /> Regenerate
            </button>
            <button
              onClick={onShare}
              className="flex flex-1 items-center justify-center gap-2 md:justify-start md:gap-[10px] rounded-xl border-none bg-sky-soft p-3 font-display text-[13px] md:text-[13.5px] font-bold text-sky-ink cursor-pointer hover:bg-sky transition-colors"
            >
              <Icon name="share" size={15} className="text-sky-ink md:h-4 md:w-4" /> Share
            </button>
          </div>
          <button
            onClick={onDelete}
            className="mt-1 flex w-full items-center justify-center gap-[10px] rounded-xl border border-line bg-white p-3 font-display text-[13.5px] font-bold text-coral-ink cursor-pointer hover:bg-coral-soft hover:border-transparent transition-colors"
          >
            <Icon name="trash" size={16} className="text-coral-ink" /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}
