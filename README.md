# Acadence — Real-Time AI Learning Platform

Acadence is a SaaS platform where users create personalized AI tutoring companions and learn through real-time voice conversations. Each companion can be customized with a subject, topic, voice, and teaching style.

## Features

- **AI Voice Companions** — Create personalized tutors that teach through natural voice conversations powered by Vapi
- **Subject Library** — Maths, Science, Language, History, Coding, Economics
- **Session History** — Track completed learning sessions
- **Bookmarks** — Save favorite companions for quick access
- **Subscription Plans** — Free tier with upgrade options via Clerk Billing
- **Dark Mode** — System, Light, and Dark theme support
- **Responsive Design** — Optimized for desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (Radix primitives) |
| Auth | Clerk |
| Database | Supabase |
| Voice AI | Vapi |
| Monitoring | Sentry |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- npm, yarn, or pnpm

### Installation

```bash
git clone https://github.com/GitH22Ash/Acadence-LMS-Saas.git
cd Acadence-LMS-SaaS
npm install
```

### Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for the complete list of required variables.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### Other Commands

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues
npm run typecheck     # Run TypeScript type checking
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── companions/         # Companion library, creation, sessions
│   ├── my-journey/         # User profile and history
│   ├── sign-in/            # Clerk authentication
│   ├── subscription/       # Pricing plans
│   ├── globals.css         # Design system and tokens
│   └── layout.tsx          # Root layout with providers
├── components/
│   ├── shared/             # Reusable components (ThemeToggle, EmptyState, etc.)
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── actions/            # Server actions (Supabase queries)
│   ├── env.ts              # Environment variable validation
│   ├── supabase.ts         # Supabase client
│   ├── utils.ts            # Utility functions
│   └── vapi-client.sdk.ts  # Vapi voice SDK
├── constants/              # App constants and configuration
├── types/                  # TypeScript type definitions
└── public/                 # Static assets (icons, images)
```

## Deployment

Deploy to [Vercel](https://vercel.com):

1. Connect your GitHub repository
2. Set all environment variables from `.env.example`
3. Deploy — Next.js 16 is fully supported

## License

Private project.
