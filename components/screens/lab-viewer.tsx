"use client"

import * as React from "react"
import { Icon } from "@/components/icons"
import { LabStep } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LabViewerProps {
  steps: LabStep[]
  title?: string
}

// A small palette so each step gets a distinct, friendly gradient.
const GRADIENTS: [string, string][] = [
  ["#C3BCEC", "#E0DBF6"], // lavender
  ["#A6DCC0", "#CFEBDA"], // mint
  ["#ABD2EC", "#D3E8F6"], // sky
  ["#FAC79A", "#FCE0CB"], // peach
  ["#F6A6C0", "#FBD9E3"], // pink
  ["#F6DE8C", "#FBEFC0"], // sunny
]

function humanize(s?: string): string {
  if (!s) return "Interactive Visual"
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

// ---- Tiny, dependency-free markdown renderer ----
// Handles **bold**, bullet lists, numbered lists, headings, and paragraphs.
function renderInline(s: string): React.ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

function MarkdownLite({ text }: { text: string }) {
  const lines = (text || "").split("\n")
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []
  let listType: "ul" | "ol" | null = null

  const flushList = () => {
    if (listBuffer.length && listType) {
      const items = listBuffer.map((li, i) => (
        <li key={i} className="leading-[1.6]">
          {renderInline(li)}
        </li>
      ))
      elements.push(
        listType === "ul" ? (
          <ul key={elements.length} className="list-disc space-y-1.5 pl-5 text-ink-2">
            {items}
          </ul>
        ) : (
          <ol key={elements.length} className="list-decimal space-y-1.5 pl-5 text-ink-2">
            {items}
          </ol>
        )
      )
    }
    listBuffer = []
    listType = null
  }

  lines.forEach((raw) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)/)
    const numbered = line.match(/^\s*\d+\.\s+(.*)/)
    const heading = line.match(/^#{1,6}\s+(.*)/)

    if (bullet) {
      if (listType && listType !== "ul") flushList()
      listType = "ul"
      listBuffer.push(bullet[1])
    } else if (numbered) {
      if (listType && listType !== "ol") flushList()
      listType = "ol"
      listBuffer.push(numbered[1])
    } else {
      flushList()
      if (line.trim() === "") return
      if (heading) {
        elements.push(
          <p key={elements.length} className="font-display text-[15px] font-bold text-ink">
            {renderInline(heading[1])}
          </p>
        )
      } else {
        elements.push(
          <p key={elements.length} className="text-[14.5px] leading-[1.65] text-ink-2">
            {renderInline(line)}
          </p>
        )
      }
    }
  })
  flushList()

  return <div className="space-y-3">{elements}</div>
}

export function LabViewer({ steps, title }: LabViewerProps) {
  const [current, setCurrent] = React.useState(0)
  // Track which option the user picked for the current step, and which steps
  // they have answered correctly (so progress is remembered when navigating).
  const [selected, setSelected] = React.useState<number | null>(null)
  const [correctSteps, setCorrectSteps] = React.useState<Set<number>>(new Set())
  const [completed, setCompleted] = React.useState(false)

  const total = steps.length
  const step = steps[current]
  const quiz = step?.assessment
  const hasQuiz = !!quiz?.has_quiz && Array.isArray(quiz.options) && quiz.options.length > 0
  const quizCount = steps.filter((s) => s.assessment?.has_quiz).length
  const [grad1, grad2] = GRADIENTS[current % GRADIENTS.length]

  // Reset the selected answer whenever the step changes.
  React.useEffect(() => {
    setSelected(null)
  }, [current])

  const isAnsweredCorrectly = correctSteps.has(current)
  const canAdvance = !hasQuiz || isAnsweredCorrectly

  const handleSelect = (index: number) => {
    if (isAnsweredCorrectly) return // already locked in
    setSelected(index)
    if (quiz && index === quiz.correct_index) {
      setCorrectSteps((prev) => new Set(prev).add(current))
    }
  }

  const goNext = () => {
    if (current < total - 1) setCurrent((c) => c + 1)
    else setCompleted(true)
  }
  const goPrev = () => {
    if (current > 0) setCurrent((c) => c - 1)
  }

  const restart = () => {
    setCurrent(0)
    setSelected(null)
    setCorrectSteps(new Set())
    setCompleted(false)
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="grid h-full place-items-center p-10 text-center text-ink-3">
        This lab has no steps yet.
      </div>
    )
  }

  // ---- Completion screen ----
  if (completed) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div
          className="flex w-full max-w-[460px] flex-col items-center rounded-[24px] p-8 text-center text-white shadow-sh-lg"
          style={{ background: "linear-gradient(160deg, #A6DCC0, #ABD2EC)" }}
        >
          <div className="grid h-[64px] w-[64px] place-items-center rounded-full bg-white/25">
            <Icon name="check" size={34} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="mt-5 font-display text-[24px] font-bold">Lab Complete!</h2>
          <p className="mt-2 max-w-[300px] text-[14px] opacity-90">
            You worked through all {total} steps
            {quizCount > 0 && (
              <>
                {" "}
                and answered{" "}
                <strong className="font-bold">
                  {correctSteps.size}/{quizCount}
                </strong>{" "}
                quiz questions correctly
              </>
            )}
            .
          </p>
          <button
            onClick={restart}
            className="mt-6 flex items-center gap-2 rounded-full bg-white/20 px-6 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-white/30 border border-white/30"
          >
            <Icon name="arrow" size={15} className="-scale-x-100 text-white" /> Restart Lab
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Header: title + progress */}
      <div className="border-b border-line px-[18px] py-[16px] md:px-[40px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-lav-soft">
              <Icon name="book" size={17} className="text-lav-ink" />
            </span>
            <h2 className="truncate font-display text-[16px] md:text-[18px] font-bold tracking-[-0.3px]">
              {title || "Interactive Lab"}
            </h2>
          </div>
          <span className="flex-none rounded-full bg-cream px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2">
            Step {current + 1} of {total}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-[6px] w-full overflow-hidden rounded-full bg-cream-2">
          <div
            className="h-full rounded-full bg-lav-ink transition-all duration-300 ease-out"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Step body (scrollable) */}
      <div className="flex-1 overflow-auto px-[18px] py-[22px] md:px-[40px] md:py-[28px]">
        <div className="mx-auto w-full max-w-[680px]">
          {/* Visual area */}
          <div
            className="relative mb-6 flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-[20px]"
            style={{ background: `linear-gradient(140deg, ${grad1}, ${grad2})` }}
          >
            {/* Soft animated orbs to suggest motion */}
            <div className="absolute -left-6 -top-6 h-28 w-28 animate-pulse rounded-full bg-white/25" />
            <div className="absolute right-8 bottom-4 h-16 w-16 animate-em-spin rounded-full border-[6px] border-white/30 border-t-white/70" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-white/35 backdrop-blur-sm">
                <Icon name="spark" size={22} className="fill-white text-white" strokeWidth={0} />
              </span>
              <span className="mt-2.5 rounded-full bg-black/15 px-3 py-1 text-[12px] font-semibold text-white">
                {humanize(step.visual_component_state?.animation_type)}
              </span>
            </div>
          </div>

          {/* Heading + instructions */}
          <h3 className="font-display text-[20px] md:text-[23px] font-bold tracking-[-0.4px]">
            {step.heading}
          </h3>
          <div className="mt-3">
            <MarkdownLite text={step.body_markdown} />
          </div>

          {/* Quiz */}
          {hasQuiz && quiz && (
            <div className="mt-7 rounded-[18px] border border-line bg-cream/60 p-[16px] md:p-[20px]">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="spark" size={15} className="fill-lav-ink text-lav-ink" strokeWidth={0} />
                <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-ink-3">
                  Check your understanding
                </span>
              </div>
              <p className="font-display text-[15.5px] font-bold text-ink">{quiz.question}</p>

              <div className="mt-4 flex flex-col gap-2.5">
                {quiz.options.map((option, i) => {
                  const isPicked = selected === i
                  const isCorrect = i === quiz.correct_index
                  const showAsCorrect = (isPicked || isAnsweredCorrectly) && isCorrect
                  const showAsWrong = isPicked && !isCorrect && !isAnsweredCorrectly

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      disabled={isAnsweredCorrectly}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-[12px] border px-[14px] py-[12px] text-left text-[14px] font-medium transition-colors",
                        showAsCorrect
                          ? "border-transparent bg-mint-soft text-mint-ink"
                          : showAsWrong
                            ? "border-transparent bg-coral-soft text-coral-ink"
                            : "border-line bg-white text-ink-2 hover:bg-cream-2",
                        isAnsweredCorrectly && !isCorrect && "opacity-60"
                      )}
                    >
                      <span>{option}</span>
                      {showAsCorrect && (
                        <Icon name="check" size={17} className="flex-none text-mint-ink" strokeWidth={3} />
                      )}
                      {showAsWrong && (
                        <span className="flex-none font-bold text-coral-ink">✕</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Feedback line */}
              {selected !== null && (
                <p
                  className={cn(
                    "mt-3.5 text-[13px] font-semibold",
                    isAnsweredCorrectly ? "text-mint-ink" : "text-coral-ink"
                  )}
                >
                  {isAnsweredCorrectly
                    ? "Correct! You can move on to the next step."
                    : "Not quite — give it another try."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-[18px] py-[14px] md:px-[40px]">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-bold transition-colors",
            current === 0
              ? "cursor-not-allowed text-ink-3 opacity-50"
              : "bg-cream text-ink-2 hover:bg-cream-2"
          )}
        >
          <Icon name="arrow" size={15} className="-scale-x-100" /> Previous
        </button>

        {hasQuiz && !canAdvance && (
          <span className="hidden text-[12px] text-ink-3 sm:block">
            Answer the question to continue
          </span>
        )}

        <button
          onClick={goNext}
          disabled={!canAdvance}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-[13.5px] font-bold transition-colors",
            canAdvance
              ? "bg-ink text-white hover:bg-ink/90"
              : "cursor-not-allowed bg-cream text-ink-3 opacity-60"
          )}
        >
          {current < total - 1 ? "Next step" : "Complete Lab"}
          <Icon name="arrow" size={15} className={canAdvance ? "text-white" : "text-ink-3"} />
        </button>
      </div>
    </div>
  )
}
