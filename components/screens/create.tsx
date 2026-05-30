/**
 * Create screen — the entry point for generating new educational assets.
 *
 * Supports three input modes:
 *   - "text"  : plain-text paste from a lesson plan or notes
 *   - "url"   : a publicly-accessible webpage (scrapped server-side)
 *   - "pdf"   : a local PDF file uploaded via multipart form
 *
 * While generation is in progress the form is replaced by a progress overlay.
 * Errors surface within the same overlay so the user can dismiss and retry.
 */

import * as React from "react"
import { Icon, IconName } from "@/components/icons"
import { cn } from "@/lib/utils"

interface CreateProps {
  isGenerating: boolean
  progress: number
  sceneIndex: number
  sceneTotal: number
  error?: string | null
  onGenerate: (data: {
    assetType: string
    targetLength: number
    gradeLevel: string
    text?: string
    url?: string
    file?: File
  }) => void
  onCancel: () => void
}

type InputMode = "text" | "url" | "pdf"

export function Create({
  isGenerating,
  progress,
  sceneIndex,
  sceneTotal,
  error,
  onGenerate,
  onCancel,
}: CreateProps) {
  // Input State
  const [inputMode, setInputMode] = React.useState<InputMode>("text")
  const [textInput, setTextInput] = React.useState("")
  const [urlInput, setUrlInput] = React.useState("")
  const [fileInput, setFileInput] = React.useState<File | null>(null)

  // Configuration State
  const [assetType, setAssetType] = React.useState("BOTH")
  const [runtime, setRuntime] = React.useState(2)
  const [gradeLevel, setGradeLevel] = React.useState("Middle")

  const handleGenerate = () => {
    onGenerate({
      assetType,
      targetLength: runtime,
      gradeLevel,
      text: inputMode === "text" ? textInput : undefined,
      url: inputMode === "url" ? urlInput : undefined,
      file: inputMode === "pdf" && fileInput ? fileInput : undefined,
    })
  }

  return (
    <div className="flex h-full w-full flex-col items-center overflow-auto bg-cream-2 px-[18px] py-4 md:px-[44px] md:py-[34px]">
      <div className="w-full max-w-[640px]">
        
        {/* Header */}
        <div className="mb-[26px] text-center">
          <span className="mb-[14px] inline-flex items-center gap-1.5 rounded-full bg-lav-soft px-[11px] py-[5px] font-body text-[11px] font-semibold text-lav-ink">
            <Icon name="spark" size={13} className="fill-lav-ink text-lav-ink" strokeWidth={0} />
            Unified Document Processor
          </span>
          <h1 className="text-[26px] md:text-[30px] font-display font-bold tracking-[-0.5px]">
            Ingest Material
          </h1>
          <p className="mt-[9px] text-[13px] md:text-[14.5px] text-ink-2">
            Paste text, provide a URL, or upload a PDF to extract clean content.
          </p>
        </div>

        {isGenerating ? (
          /* Generating State */
          <div
            className="flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-[24px] p-[22px] text-center text-white shadow-sh-lg"
            style={{ background: error ? "linear-gradient(160deg, #C3706E, #E07070)" : "linear-gradient(160deg, #C3BCEC, #F6A6C0)" }}
          >
            {error ? (
              /* Error State inside loader */
              <>
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/20 text-3xl">
                  ✕
                </div>
                <h3 className="mt-[18px] font-display text-[18px] font-bold text-white">
                  Generation Failed
                </h3>
                <p className="mt-2 max-w-[280px] text-[13px] leading-[1.55] opacity-90">
                  {error}
                </p>
                <button
                  onClick={onCancel}
                  className="mt-5 rounded-full bg-white/20 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-white/30 transition-colors border border-white/30"
                >
                  ← Try Again
                </button>
              </>
            ) : (
              /* Normal loading state */
              <>
                <div className="animate-em-spin h-[52px] w-[52px] rounded-full border-4 border-white/50 border-t-white" />
                <h3 className="mt-[18px] font-display text-[18px] font-bold text-white">
                  Processing & Generating…
                </h3>
                <p className="mt-1.5 max-w-[200px] text-[12.5px] opacity-90">
                  Extracting text and compiling assets.
                </p>
                <p className="mt-3 max-w-[280px] text-[12px] opacity-80 font-medium">
                  ⏱️ This usually takes 2–5 minutes — don't close this tab
                </p>
                <div className="mt-4 h-[7px] w-[80%] max-w-[300px] overflow-hidden rounded-full bg-white/35">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 text-[11.5px] font-semibold">
                  {Math.round(progress)}% · Step {sceneIndex} of {sceneTotal}
                </div>
                <button
                  onClick={onCancel}
                  className="mt-5 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          /* Create Form */
          <>
            <div className="rounded-[22px] border border-line bg-white p-[16px] md:p-[18px] shadow-sh">
              
              {/* Input Mode Selector */}
              <div className="mb-4 flex gap-2 border-b border-line pb-4">
                {(["text", "url", "pdf"] as InputMode[]).map(mode => (
                   <button 
                     key={mode} 
                     onClick={() => setInputMode(mode)}
                     className={cn(
                       "px-4 py-2 rounded-full text-[13px] font-semibold transition-colors capitalize",
                       inputMode === mode ? "bg-ink text-white" : "bg-cream text-ink-2 hover:bg-cream-2"
                     )}
                   >
                     {mode}
                   </button>
                ))}
              </div>

              {/* Dynamic Input Area */}
              <div className="relative min-h-[96px] text-[15px] md:text-[16px] leading-[1.55] text-ink">
                {inputMode === 'text' && (
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="h-full min-h-[96px] w-full resize-none border-none bg-transparent outline-none ring-0 placeholder:text-ink-3"
                    rows={4}
                    placeholder="Paste your raw lesson text here..."
                  />
                )}
                {inputMode === 'url' && (
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full border-none bg-transparent outline-none ring-0 placeholder:text-ink-3"
                    placeholder="https://example.com/article"
                  />
                )}
                {inputMode === 'pdf' && (
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                    className="w-full text-[14px]"
                  />
                )}
              </div>
              
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-[14px]">
                <button
                  onClick={handleGenerate}
                  className="w-full inline-flex cursor-pointer items-center justify-center gap-[9px] rounded-full border-none px-[22px] py-[12px] font-display text-[14.5px] font-bold text-ink shadow-sh-sm hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(120deg, #A6DCC0, #ABD2EC)" }}
                >
                  <Icon name="wand" size={17} className="text-ink" /> Generate Material
                </button>
              </div>
            </div>

            {/* Asset Configuration Matrix */}
            <div className="mt-[18px] grid grid-cols-1 md:grid-cols-3 gap-[14px]">
              
              {/* Asset Type */}
              <div className="rounded-[16px] border border-line bg-white p-[14px] shadow-sm">
                <div className="text-[11.5px] font-bold text-ink-3 uppercase mb-2">Asset</div>
                <select 
                  value={assetType} 
                  onChange={e => setAssetType(e.target.value)}
                  className="w-full bg-cream rounded-md p-2 text-[13px] font-semibold border-none outline-none"
                >
                  <option value="VIDEO">Video Only</option>
                  <option value="LAB">Lab Only</option>
                  <option value="BOTH">Both Bundle</option>
                </select>
              </div>

              {/* Runtime */}
              <div className="rounded-[16px] border border-line bg-white p-[14px] shadow-sm">
                <div className="text-[11.5px] font-bold text-ink-3 uppercase mb-2">Runtime</div>
                <select 
                  value={runtime} 
                  onChange={e => setRuntime(Number(e.target.value))}
                  className="w-full bg-cream rounded-md p-2 text-[13px] font-semibold border-none outline-none"
                >
                  <option value={1}>1-min Summary</option>
                  <option value={2}>2-min Standard</option>
                  <option value={5}>5-min Deep Dive</option>
                </select>
              </div>

              {/* Grade Level */}
              <div className="rounded-[16px] border border-line bg-white p-[14px] shadow-sm">
                <div className="text-[11.5px] font-bold text-ink-3 uppercase mb-2">Grade Level</div>
                <select 
                  value={gradeLevel} 
                  onChange={e => setGradeLevel(e.target.value)}
                  className="w-full bg-cream rounded-md p-2 text-[13px] font-semibold border-none outline-none"
                >
                  <option value="Elementary">Elementary</option>
                  <option value="Middle">Middle School</option>
                  <option value="High">High School</option>
                  <option value="HigherEd">Higher Ed</option>
                </select>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
