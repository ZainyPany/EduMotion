"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { VideoRecord } from "@/lib/types"
import { Sidebar, ViewType } from "@/components/sidebar"
import { BottomNav } from "@/components/bottom-nav"
import { Dashboard } from "@/components/screens/dashboard"
import { Create } from "@/components/screens/create"
import { Content } from "@/components/screens/content"
import { Viewer } from "@/components/screens/viewer"
import { Icon, IconName } from "@/components/icons"
import { cn } from "@/lib/utils"

const initialVideos: VideoRecord[] = [
  { id: '1', title: 'The Water Cycle Explained', tag: 'Geography', status: 'published', date: 'May 24', duration: '1:02', views: '1,204', prompt: 'Explain the water cycle for Year 5 — show evaporation, condensation and rain with friendly labels and a calm tone.', from: '#ABD2EC', to: '#D3E8F6' },
  { id: '2', title: 'States of Matter', tag: 'Science', status: 'generating', date: 'Now', duration: '—', views: '0', prompt: 'Explain the three states of matter for Year 5 — use a friendly tone, show ice melting into water then steam, and add simple labels.', from: '#C3BCEC', to: '#E0DBF6' },
  { id: '3', title: 'Intro to Fractions', tag: 'Maths', status: 'draft', date: 'May 19', duration: '0:48', views: '0', prompt: 'Introduce basic fractions using visual pizza slices for Year 3.', from: '#FAC79A', to: '#FCE0CB' },
  { id: '4', title: 'Ancient Egypt Timeline', tag: 'History', status: 'published', date: 'May 14', duration: '1:30', views: '450', prompt: 'Walk through the main periods of Ancient Egypt, focusing on the pyramids.', from: '#F6DE8C', to: '#FBEFC0' },
  { id: '5', title: 'Photosynthesis in 90s', tag: 'Biology', status: 'published', date: 'May 24', duration: '1:30', views: '100', prompt: 'Explain how plants make food using sunlight, water, and carbon dioxide.', from: '#A6DCC0', to: '#CFEBDA' },
  { id: '6', title: 'Parts of a Plant', tag: 'Biology', status: 'draft', date: 'May 11', duration: '0:50', views: '0', prompt: 'Identify the roots, stem, leaves, and flower of a standard plant.', from: '#F6A6C0', to: '#FBD9E3' },
]

export default function EduMotionApp() {
  const { user } = useUser()
  const userName = user?.firstName || "Ms. Rivera"

  // App State
  const [activeView, setActiveView] = React.useState<ViewType>("dashboard")
  const [videos, setVideos] = React.useState<VideoRecord[]>(initialVideos)
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null)
  
  // Generation State
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [genProgress, setGenProgress] = React.useState(0)
  const [sceneIndex, setSceneIndex] = React.useState(1)
  const [genError, setGenError] = React.useState<string | null>(null)
  const [showcaseMode, setShowcaseMode] = React.useState(false)

  const activeVideo = React.useMemo(
    () => videos.find(v => v.id === activeVideoId) || videos[0],
    [videos, activeVideoId]
  )

  // Simulation of generation process and API Call
  const handleGenerate = async (data: { assetType: string, targetLength: number, text?: string, url?: string, file?: File }) => {
    setIsGenerating(true)
    setGenProgress(0)
    setSceneIndex(1)
    setGenError(null)
    
    try {
      const formData = new FormData()
      formData.append("assetType", data.assetType)
      formData.append("targetLength", data.targetLength.toString())
      
      let res;
      if (data.file) {
        formData.append("file", data.file)
        res = await fetch("/api/ingest", { method: "POST", body: formData })
      } else {
        res = await fetch("/api/ingest", { 
          method: "POST", 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetType: data.assetType, targetLength: data.targetLength, text: data.text, url: data.url })
        })
      }

      if (!res.ok) {
        let errMsg = "Server error. Please check the app is running and try again."
        try { const errBody = await res.json(); errMsg = errBody.error || errMsg } catch {}
        setGenError(errMsg)
        return
      }

      const { id } = await res.json();
      
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/material/${id}`);
          if (statusRes.ok) {
            const { status, mp4Url } = await statusRes.json();
            
            if (status === 'PROCESSING') {
              setGenProgress(prev => Math.min(prev + 5, 80));
              setSceneIndex(2);
            }
            
            if (status === 'COMPLETE') {
              clearInterval(interval);
              setGenProgress(100);
              setSceneIndex(3);
              
              setTimeout(() => {
                const newVideo: VideoRecord = {
                  id: id,
                  title: data.text?.slice(0, 30) || data.url || (data.file ? data.file.name : 'Generated Asset'),
                  tag: "Generated",
                  status: "published",
                  date: "Just now",
                  duration: data.targetLength + ":00",
                  views: "0",
                  prompt: data.text || data.url || (data.file ? data.file.name : 'Uploaded Document'),
                  from: "#C3BCEC",
                  to: "#E0DBF6",
                  mp4Url: mp4Url || undefined
                };
                setVideos([newVideo, ...videos]);
                setActiveVideoId(id);
                setIsGenerating(false);
                setGenError(null);
                setActiveView("viewer");
              }, 500);
            }
            
            if (status === 'FAILED') {
              clearInterval(interval);
              setGenError("Generation failed. The AI model may be busy — please try again in a moment.");
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);

    } catch (err: any) {
      console.error(err)
      setGenError("Network error. Please check your connection and try again.")
    }
  }

  const handleCancelGeneration = () => {
    setIsGenerating(false)
    setGenError(null)
    setGenProgress(0)
    setSceneIndex(1)
  }


  // View routing wrapper
  const renderView = () => {
    if (activeView === "dashboard") {
      return (
        <Dashboard
          videos={videos}
          userName={userName}
          onVideoSelect={(id) => { setActiveVideoId(id); setActiveView("viewer") }}
          onCreateNew={() => setActiveView("create")}
        />
      )
    }
    if (activeView === "create") {
      return (
        <Create
          isGenerating={isGenerating}
          progress={genProgress}
          sceneIndex={sceneIndex}
          sceneTotal={3}
          error={genError}
          onGenerate={handleGenerate}
          onCancel={handleCancelGeneration}
        />
      )
    }
    if (activeView === "content") {
      return (
        <Content
          videos={videos}
          onVideoSelect={(id) => { setActiveVideoId(id); setActiveView("viewer") }}
          onDeleteVideo={(id) => setVideos(videos.filter(v => v.id !== id))}
          onShareVideo={() => alert("Share link copied to clipboard!")}
        />
      )
    }
    if (activeView === "viewer") {
      return (
        <Viewer
          video={activeVideo}
          onBack={() => setActiveView("content")}
          onEditPrompt={() => setActiveView("create")}
          onRegenerate={() => {
            setActiveView("create")
            // handleGenerate(activeVideo.prompt) - normally we'd start it automatically
          }}
          onShare={() => alert("Share link copied to clipboard!")}
          onDelete={() => {
            setVideos(videos.filter(v => v.id !== activeVideo.id))
            setActiveView("content")
          }}
        />
      )
    }
    return null
  }

  const navItemsMobile: { id: string; icon: IconName }[] = [
    { id: "dashboard", icon: "home" },
    { id: "content", icon: "folder" },
    { id: "create", icon: "wand" },
    { id: "user", icon: "user" }
  ]

  // Main Shell Render
  const AppShell = (
    <div className="flex h-full w-full flex-col md:flex-row overflow-hidden bg-white">
      {/* Desktop Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        className="hidden md:flex"
      />
      
      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative z-10">
        {renderView()}
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav
        items={navItemsMobile}
        activeId={activeView}
        onViewChange={(id) => {
          if (id === "user") return
          setActiveView(id as ViewType)
        }}
        theme={activeView === "create" ? "dark" : "light"}
        fab={activeView === "create"}
        className="md:hidden"
      />
    </div>
  )

  // Toggle wrap
  return (
    <div className="h-screen w-full bg-[#f0eee9] font-body text-ink antialiased">
      {/* Header Overlay for Showcase Control */}
      <div className="fixed top-2 right-2 z-50">
        <button
          onClick={() => setShowcaseMode(!showcaseMode)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sh-sm text-ink-2 hover:text-ink transition-colors border border-line"
        >
          {showcaseMode ? "Close Showcase" : "View Showcase Mode"}
        </button>
      </div>

      {showcaseMode ? (
        <div className="flex h-full w-full items-center justify-center gap-12 overflow-auto p-12">
          {/* Desktop Mockup Frame */}
          <div className="flex flex-col h-[762px] w-[1180px] shrink-0 overflow-hidden rounded-[22px] bg-white shadow-sh-lg border border-line">
            {/* Fake Browser Bar */}
            <div className="flex h-[44px] shrink-0 items-center gap-[14px] border-b border-line bg-white/70 px-4">
              <div className="flex gap-[7px]">
                <div className="h-[11px] w-[11px] rounded-full bg-coral" />
                <div className="h-[11px] w-[11px] rounded-full bg-yellow" />
                <div className="h-[11px] w-[11px] rounded-full bg-mint" />
              </div>
              <div className="mx-auto flex h-[26px] w-full max-w-[340px] items-center justify-center gap-[7px] rounded-full border border-line bg-cream font-body text-[11px] text-ink-3">
                <Icon name="globe" size={12} className="text-ink-3" /> app.edumotion.io/{activeView}
              </div>
              <div className="w-[52px]" />
            </div>
            {/* App Body */}
            <div className="flex-1 overflow-hidden">
              {AppShell}
            </div>
          </div>

          {/* Mobile Mockup Frame */}
          <div className="relative shrink-0 h-[812px] w-[384px] rounded-[46px] bg-[#1c1a17] p-[11px] shadow-sh-lg">
            {/* Notch */}
            <div className="absolute left-1/2 top-3 z-40 h-[26px] w-[100px] -translate-x-1/2 rounded-full bg-[#1c1a17]" />
            <div className="flex h-full w-full flex-col overflow-hidden rounded-[36px] relative">
              {/* Fake Status Bar */}
              <div
                className={cn(
                  "flex h-[46px] shrink-0 items-center justify-between px-[26px] pt-4 z-30 font-display text-[13px] font-bold",
                  activeView === "create" ? "text-white absolute top-0 left-0 right-0" : "text-ink bg-cream-2"
                )}
              >
                <span>9:41</span>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <Icon name="globe" size={13} />
                  <span>▮▮▮</span>
                </div>
              </div>
              <div className={cn("flex-1 overflow-hidden", activeView === "create" ? "pt-[46px] bg-[#FCEFF4]" : "")}>
                {/* To force mobile rendering inside desktop browser, we simulate width.
                    Since AppShell is fully responsive using Tailwind breakpoints, we must isolate it
                    or rely on Tailwind container queries. However, a simpler way for the showcase
                    is to just render the mobile version specifically, but Next.js/Tailwind uses standard media queries.
                    We will wrap the mobile view manually here for the showcase.
                */}
                <div className="h-full w-full flex flex-col md:hidden" style={{ display: 'flex' }}>
                   {AppShell}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Normal App Display */
        <div className="h-full w-full">
          {AppShell}
        </div>
      )}
    </div>
  )
}
