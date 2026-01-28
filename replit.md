# AutoGram - Instagram Auto-Publishing Platform

## Overview

AutoGram is an Instagram auto-publishing platform that generates images using Google Gemini AI and automatically publishes them to Instagram. The application features AI-powered image generation with daily rate limits, manual and scheduled posting capabilities, and a modern React dashboard for managing content.

Key capabilities:
- Generate images from text prompts using Gemini's image generation model
- Schedule posts for automatic publishing at specified times
- Track daily usage limits for image generation
- Manage image lifecycle: pending → scheduled → published (or failed)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme inspired by Instagram's aesthetic
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with React plugin

The frontend follows a component-based architecture with custom hooks for data fetching (`use-images.ts`) that abstract API interactions. The main dashboard displays image cards with status badges and provides forms for image generation.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api` namespace
- **Scheduler**: Internal `setInterval`-based scheduler for auto-publishing scheduled images every 60 seconds

Key backend modules:
- `server/routes.ts` - API endpoint definitions
- `server/storage.ts` - Database abstraction layer
- `server/scheduler.ts` - Background job for publishing scheduled posts
- `server/instagram.ts` - Instagram Private API integration

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `drizzle-kit push` command

Main tables:
- `images` - Stores generated images with status, prompts, captions, and scheduling info
- `usageLimits` - Tracks daily image generation counts per date
- `conversations` / `messages` - Chat functionality (AI integrations)

### Image Generation
Uses Replit's AI Integrations service which provides Gemini-compatible API access:
- Model: `gemini-2.5-flash-image` for image generation
- Generated images are saved to `client/public/generated_images/`
- Daily limit of 10 image generations (configurable in schema)

### Instagram Integration
- Library: `instagram-private-api` for unofficial Instagram API access
- Handles login, photo publishing with captions
- Stores `instagramMediaId` on successful publication

## External Dependencies

### AI Services
- **Replit AI Integrations**: Provides Gemini API access via environment variables:
  - `AI_INTEGRATIONS_GEMINI_API_KEY`
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`

### Database
- **PostgreSQL**: Connection via `DATABASE_URL` environment variable
- **Session Storage**: `connect-pg-simple` for Express sessions

### Instagram
- **instagram-private-api**: Requires credentials:
  - `INSTAGRAM_USERNAME`
  - `INSTAGRAM_PASSWORD`

### Key NPM Dependencies
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Data fetching and caching
- `@radix-ui/*` - Accessible UI primitives
- `express` - HTTP server framework
- `zod` - Runtime type validation
- `date-fns` - Date formatting utilities