# Weavy — Client (Next.js App)

This directory is the **Weavy** Next.js application: frontend, API routes, and workflow builder. It uses Clerk for auth, Prisma + PostgreSQL for data, Trigger.dev for background runs, Transloadit for uploads, and Google Gemini for the LLM node.

---

## Table of Contents

- [Live Demo & Video](#live-demo--video)
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone & Install](#clone--install)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Run the App](#run-the-app)
- [Available Scripts](#available-scripts)
- [Key Concepts](#key-concepts)
- [Environment Variables Reference](#environment-variables-reference)

---

## Live Demo & Video

| | Link |
|---|------|
| **Live website** | [https://weavy-ai-five.vercel.app/](https://weavy-ai-five.vercel.app/) |
| **Demo video** | [Watch on Google Drive](https://drive.google.com/file/d/1Y7qJa2iyRIKJPdeVNkjToxHpkK6Rjt9h/view?usp=sharing) |

---

## Overview

**Weavy** is a full-stack app in this repo. Users sign in with **Clerk**, create **workflows** on a canvas (React Flow) by connecting **nodes** (Text, Image, Video, Crop Image, Extract Frame, LLM), upload **images/videos** via **Transloadit**, and **run** workflows (full, selected, or single node) with **Trigger.dev**. **Google Gemini** powers the LLM node. Workflow runs and history are stored in **PostgreSQL** (Prisma). Workflows can be **exported** and **imported** as JSON.

---

## Features

| Feature | Description |
|--------|-------------|
| **Authentication** | Sign in / sign up with Clerk; protected dashboard and API. |
| **Workflow builder** | Drag-and-drop canvas (React Flow) with 6 node types: Text, Image, Video, Crop Image, Extract Frame, LLM. |
| **File uploads** | Image and video uploads via Transloadit (client + server). |
| **Run workflows** | Run full workflow, single node, or selected nodes. Real-time status (e.g. pulsating glow on running nodes). |
| **Run history** | Right sidebar lists all runs; click a run for node-level execution details. |
| **Export / Import** | Export workflow as JSON; import JSON to load a workflow. |
| **Folders** | Organize workflows in folders. |
| **Landing pages** | Home, Collective, Enterprise, Pricing, Demo, Sign In. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **UI** | [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/) |
| **Workflow canvas** | [@xyflow/react](https://xyflow.dev/) (React Flow) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/) |
| **Auth** | [Clerk](https://clerk.com/) |
| **Background jobs** | [Trigger.dev](https://trigger.dev/) |
| **AI** | [Google Gemini](https://ai.google.dev/) |
| **Media processing** | [Transloadit](https://transloadit.com/) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/), [TanStack Query](https://tanstack.com/query/latest) |

---

## Project Structure

All paths below are relative to this `client/` directory.

```
client/
├── prisma/
│   └── schema.prisma          # DB: User, Workflow, Folder, WorkflowRun, NodeRun
├── public/                    # Static assets (images, icons, etc.)
└── src/
    ├── app/                   # Next.js App Router
    │   ├── api/               # API routes
    │   │   ├── workflows/     # CRUD workflows
    │   │   ├── folders/       # Folders CRUD
    │   │   ├── history/       # Run history, node runs
    │   │   ├── upload/        # Image & video upload (Transloadit)
    │   │   ├── trigger/       # Trigger.dev invoke
    │   │   ├── webhooks/      # Clerk webhooks
    │   │   └── user/          # User (e.g. credits)
    │   ├── dashboard/         # /dashboard — workflow list & folders
    │   ├── dashboard/workflow/[id]/  # Workflow editor
    │   ├── signin/            # Sign-in page
    │   ├── collective/        # Marketing: Collective
    │   ├── enterprise/        # Marketing: Enterprise
    │   ├── pricing/           # Pricing
    │   ├── demo/              # Demo request
    │   ├── page.tsx           # Home (landing)
    │   ├── layout.tsx         # Root layout (ClerkProvider, etc.)
    │   └── globals.css
    ├── components/
    │   ├── sections/          # Landing: Hero, Navbar, Footer, AIModels, WorkflowsSlider, etc.
    │   ├── workflow/          # Builder: nodes, edges, panels, history, toolbar
    │   ├── dashboard/         # Dashboard UI: sidebar, FileCard, FolderCard
    │   └── ui/                # Shared: buttons, dialogs, forms, etc.
    ├── lib/                   # db, API client, Transloadit, validation
    ├── stores/                # Zustand: workflow state, history, persistence
    ├── trigger/               # Trigger.dev tasks: LLM, crop image, extract frame
    ├── types/                 # Shared TypeScript types
    └── hooks/                 # useMediaQuery, etc.
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) or npm/yarn
- PostgreSQL (local or [Neon](https://neon.tech/), etc.)
- Accounts for env keys: [Clerk](https://clerk.com/), [Trigger.dev](https://trigger.dev/), [Transloadit](https://transloadit.com/), [Google AI](https://ai.google.dev/)

### Clone & Install

From the repository root:

```bash
cd client
bun install
# or: npm install
```

### Environment Variables

Create a `.env` file in this directory (`client/.env`). See [Environment Variables Reference](#environment-variables-reference) for all variables.

**Minimum to run the app:**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — build and auth
- `DATABASE_URL` — Prisma
- `NEXT_PUBLIC_API_URL` — e.g. `http://localhost:3000`

**For full features:** add `CLERK_WEBHOOK_SECRET`, `TRIGGER_SECRET_KEY`, `GOOGLE_GEMINI_API_KEY`, Transloadit keys.

### Database Setup

From the `client/` directory:

```bash
bunx prisma generate
bunx prisma db push
# or: bunx prisma migrate dev
```

### Run the App

From the `client/` directory:

```bash
bun dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in, then go to the dashboard and create a workflow.

---

## Available Scripts

Run these from the `client/` directory:

| Command | Description |
|---------|-------------|
| `npm run dev` or `bun dev` | Start Next.js dev server. |
| `npm run build` or `bun run build` | Prisma generate + production build. |
| `npm run start` or `bun run start` | Start production server. |
| `npm run lint` or `bun run lint` | Run ESLint. |
| `npm run db:push` or `bun run db:push` | Push Prisma schema to DB. |
| `npm run db:migrate` or `bun run db:migrate` | Run Prisma migrations. |
| `npm run postinstall` | Runs after install; runs `prisma generate`. |

---

## Key Concepts

- **Workflow** — A graph of **nodes** (Text, Image, Video, Crop Image, Extract Frame, LLM) and **edges**. Stored as JSON in the database.
- **Run** — One execution: **full** (all nodes), **selected** (chosen nodes), or **single** (one node). Each run has **NodeRun** records for per-node status and output.
- **Folders** — User folders to organize workflows.
- **Credits** — User credit balance; runs can deduct credits.

---

## Environment Variables Reference

Create `client/.env` with:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | API base URL (e.g. `http://localhost:3000`). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key. |
| `CLERK_WEBHOOK_SECRET` | No | Clerk webhooks (e.g. user sync). |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `GOOGLE_GEMINI_API_KEY` | For LLM node | Google Gemini API key. |
| `TRIGGER_SECRET_KEY` | For runs | Trigger.dev secret key. |
| `TRANSLOADIT_KEY` | For uploads | Transloadit key. |
| `TRANSLOADIT_AUTH_KEY` or `NEXT_PUBLIC_TRANSLOADIT_KEY` | For uploads | Transloadit auth. |

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
GOOGLE_GEMINI_API_KEY=AIzaSy...
TRIGGER_SECRET_KEY=tr_dev_...
TRANSLOADIT_KEY=...
TRANSLOADIT_AUTH_KEY=...
```

---

Built with Next.js and ❤️.
