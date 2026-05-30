# EduMotion

Turn teacher source material — a PDF, raw text, or a URL — into an AI-generated **motion-graphics explainer video** and an **interactive step-by-step lab**. Teachers create from a single workspace and can publish a distraction-free link to share with students.

## Features

- **Source ingestion** — upload a PDF, paste text, or enter a URL; the app extracts clean text automatically.
- **AI blueprint generation** — Google Gemini turns the source into a structured JSON blueprint for a video and/or a lab.
- **Video compilation** — the blueprint is rendered frame-by-frame and stitched into an H.264 MP4.
- **Workspace UI** — dashboard, create flow, content library, and a video viewer, fully responsive for laptop and mobile.
- **Auth & accounts** — Clerk handles sign-in/sign-up; each user gets generation credits.
- **Background processing** — heavy work runs on an Inngest job queue so the UI never blocks.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | Clerk |
| Database & Storage | Supabase (Postgres + Storage) |
| AI | Google Gemini |
| Background jobs | Inngest |
| Video pipeline | Puppeteer (frame capture) + FFmpeg (encoding) |

## Getting Started (Local)

### 1. Prerequisites

- Node.js 20+
- Accounts: [Clerk](https://clerk.com), [Supabase](https://supabase.com), [Google AI Studio](https://aistudio.google.com)

### 2. Install

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local` with your own keys. See `.env.example` for where to find each one.

### 4. Set up the database

In your Supabase project's SQL Editor, run the migration in `supabase/migrations/0001_initial.sql`. This creates the four tables (`profiles`, `educational_materials`, `generated_labs`, `generated_videos`). The `videos` storage bucket is created automatically on first use.

### 5. Run it

The app needs two processes running at once:

```bash
# Terminal 1 — the app
npm run dev

# Terminal 2 — the background worker
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Open [http://localhost:3000](http://localhost:3000), sign in, and create your first video.

## Deployment

The Next.js app (UI, API routes, auth, database access, and AI/lab generation) deploys cleanly to **Vercel** — just add the environment variables from `.env.example`, and for Inngest remove `INNGEST_DEV` and set `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` from [Inngest Cloud](https://app.inngest.com).

> [!IMPORTANT]
> **The video compilation step does not run on Vercel serverless functions.** It launches a headless Chromium browser (Puppeteer) and runs FFmpeg to encode thousands of frames — work that exceeds serverless time/memory limits and has no bundled Chromium. To run video compilation in production, host the worker on a platform that supports long-running processes with full system access — e.g. [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io) — or swap the `VideoCompiler` implementation in `lib/video/` for a managed rendering service. Lab generation (JSON only) works fine on serverless.

## Project Structure

```
app/                  App Router pages + API routes (ingest, material status, inngest)
components/           UI: screens (dashboard, create, content, viewer) + shared components
lib/
  supabase.ts         Supabase clients (anon + admin)
  inngest/            Background job client + the material-processing function
  video/              Pluggable VideoCompiler interface + Puppeteer/FFmpeg implementation
  types.ts            Shared TypeScript types
supabase/migrations/  SQL schema
```
