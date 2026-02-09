# Weave_It (WeavyAI)

Weave_It is a modern, AI-powered web application built with Next.js, designed to streamline workflows and application building. It leverages the power of Google Gemini AI for intelligence, Clerk for secure authentication, and Trigger.dev for robust background job processing.

## 🚀 Features

- **AI-Powered**: Integrates with Google Generative AI (Gemini) for advanced capabilities.
- **Secure Authentication**: User management and authentication powered by Clerk.
- **Type-Safe API**: Utilizes tRPC for end-to-end type safety between client and server.
- **Modern UI**: Styled with Tailwind CSS and Radix UI for a responsive and accessible interface.
- **State Management**: Efficient state handling using Zustand and React Query.
- **Database**: PostgreSQL database managed with Prisma ORM.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Database**: [Prisma](https://www.prisma.io/) (PostgreSQL)
- **Authentication**: [Clerk](https://clerk.com/)
- **Background Jobs**: [Trigger.dev](https://trigger.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

Follow these steps into get a local copy up and running.

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [bun](https://bun.sh/)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd client
```

### 2. Install Dependencies

Install the project dependencies using your preferred package manager:

```bash
bun install
```

### 3. Environment Setup

Create a `.env` file in the root of the `client` directory. You can copy the structure below. Replace the placeholder values with your actual credentials.

**File:** `client/.env`

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database Connection
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# AI (Google Gemini)
GOOGLE_GEMINI_API_KEY=AIzaSy...

# Background Jobs (Trigger.dev)
TRIGGER_SECRET_KEY=tr_dev_...

# File Uploads (Transloadit) – server-side
# Used by /api/upload/image and /api/upload/video (key not exposed to client)
TRANSLOADIT_KEY=...
# Or: TRANSLOADIT_AUTH_KEY=...
# Trigger.dev tasks (crop/frame) use their own env; if needed there: NEXT_PUBLIC_TRANSLOADIT_KEY=...
```

### 4. Database Setup

Generate the Prisma client to ensure type safety with your database schema:

```bash
bunx prisma generate
```

### 5. Run the Development Server

Start the local development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📜 Available Scripts

In the project directory, you can run:

- **`bun dev`**: Runs the app in development mode.
- **`bun run build`**: Builds the app for production. It also generates the Prisma client.
- **`bun run start`**: Starts the production server.
- **`bun run lint`**: Runs ESLint to check for code quality and style issues.
- **`bun run postinstall`**: Automatically runs `prisma generate` after dependencies are installed.

## 📂 Project Structure

```bash
client/
├── prisma/               # Database schema and migrations
├── public/               # Static assets
├── src/
│   ├── app/              # App Router pages and layouts
│   ├── components/       # UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and configuration
│   ├── stores/           # State management (Zustand)
│   ├── trigger/          # Trigger.dev background jobs
│   └── types/            # TypeScript type definitions
├── .env                  # Environment variables
├── next.config.ts        # Next.js configuration
└── package.json          # Project dependencies
```

---

Built with Next.js and ❤️.
