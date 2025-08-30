# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
```bash
infisical run --env=dev -- next dev --turbopack    # Start development server with Infisical secrets
npm run build                                       # Build production app with Turbopack
npm start                                          # Start production server
npm run lint                                       # Run ESLint
npm test                                           # Run Vitest tests
```

**Database:**
```bash
npx drizzle-kit push                              # Push schema changes to database
npx drizzle-kit studio                            # Open Drizzle Studio for database inspection
```

**Testing:**
- Tests are configured for both API routes (Node.js environment) and React components (jsdom)
- API tests use Node environment automatically via `environmentMatchGlobs`
- Test setup files are in `test/setup.ts`

## Architecture Overview

### Core Stack
- **Framework**: Next.js 15.5.1 with Turbopack and React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Stack Auth (@stackframe/stack)
- **GitHub Integration**: Octokit with GitHub App authentication
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest with jsdom and React Testing Library

### Database Schema
Three main entities with hierarchical relationship:
- `installations` - GitHub App installations per user
- `changelogs` - Changelog files from repositories
- `versions` - Parsed changelog versions with structured data

Each entity includes `userId` for multi-tenancy and automatic timestamps.

### Authentication Flow
- Stack Auth handles user authentication with Next.js cookie-based token storage
- GitHub App authentication uses installation-specific tokens via Octokit
- Protected routes check for authenticated user via `stackServerApp.getUser()`

### GitHub Integration
- GitHub App processes webhook callbacks at `/api/github/callback`
- Automatically discovers and parses CHANGELOG.md files from accessible repositories
- Uses `keep-a-changelog` parser to extract structured version data
- Installation flow creates database records and processes all accessible repos

### Environment Configuration
- Uses Infisical for secrets management in development
- Database connection via `DATABASE_URL` environment variable
- GitHub App requires `GITHUB_APP_ID` and `GITHUB_PRIVATE_KEY`

### Key Files
- `src/database/schema.ts` - Drizzle schema definitions
- `src/lib/github.ts` - GitHub client factory with App authentication
- `src/stack.tsx` - Stack Auth server configuration
- `src/app/api/github/callback/route.ts` - GitHub webhook handler
- `vitest.config.ts` - Test configuration with environment-specific settings