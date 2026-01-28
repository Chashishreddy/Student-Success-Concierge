# Changelog

All notable changes to the Student Success Concierge project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for 1.1.0 (Step 2)
- Chat interface UI (`/app/chat`)
- API routes for chat and tools
- Tool implementations (search_kb, check_availability, create_appointment, create_ticket)
- Message and tool call logging to database
- Channel constraints (SMS vs webchat)

### Planned for 1.2.0 (Step 3)
- Conversation history viewer
- Full trace inspection UI
- Conversation search and filtering

### Planned for 1.3.0 (Step 4)
- Teaching loop UI
- Open coding (notes editor)
- Axial coding (tag manager)
- Frequency analysis dashboard

### Planned for 1.4.0 (Step 5)
- Evaluation runner UI
- Code eval engine (JavaScript VM)
- LLM-as-judge implementation

### Planned for 1.5.0 (Step 6)
- Judge validation metrics
- TPR/TNR calculator
- Confusion matrix visualization

## [1.0.0] - 2026-01-28

### Added - Infrastructure
- Next.js 16.1.6 with App Router and TypeScript 5.7.3
- pnpm package manager setup
- SQLite databases using sql.js 1.13.0 (pure JavaScript, no build tools required)
- Tailwind CSS 4.1.18 for styling

### Added - Database Layer
- `lib/db/appDb.ts` - Main application database client
- `lib/db/kbDb.ts` - Knowledge base database client with search functionality
- app.db with 13 tables: students, appointments, tickets, conversations, messages, tool_calls, availability_slots, test_cases, eval_results, conversation_notes, tags, conversation_tags
- kb.db with 1 table: kb_articles
- 8 indexes for query optimization

### Added - Database Content
- 1 demo student (Demo Student, demo@example.com)
- 84 availability slots (7 days × 2 services × 6 time slots)
- 5 default tags for teaching loop (Policy Drift, Handoff Failure, Scheduling Error, Success, Needs Review)
- 10 knowledge base articles:
  - 3 Scheduling articles (policy, reminders, deadlines)
  - 3 Services articles (advising, counseling, tutoring)
  - 2 Policy articles (cancellation, escalation)
  - 1 Hours article
  - 1 Emergency article
- 3 test cases with code eval functions and LLM judge rubrics:
  - Policy Drift: Incorrect Booking Hours
  - Handoff Failure: Emergency Not Escalated
  - Scheduling Violation: Double Booking

### Added - Scripts
- `scripts/init_dbs.ts` - TypeScript database initialization and seeding script

### Added - UI
- `app/layout.tsx` - Root layout with navigation
- `app/page.tsx` - Home page with feature overview
- `app/globals.css` - Global styles with Tailwind

### Added - Configuration
- `package.json` - Dependencies and npm scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules

### Added - Documentation
- `README.md` - Comprehensive user guide with setup instructions and documentation overview
- `PROJECT_MASTER.md` - Master project reference (700+ lines) with maintenance policy
- `CHANGELOG.md` - Version history in standard Keep a Changelog format
- `UPDATE_CHECKLIST.md` - Step-by-step guide for maintaining documentation
- `DOCUMENTATION_COMPLETE.md` - Documentation system overview and principles
- `STEP1_COMPLETE.md` - Detailed Step 1 completion report

### Technical Decisions
- **sql.js vs better-sqlite3**: Chose sql.js for portability (works without Visual Studio Build Tools on Windows)
- **pnpm vs npm**: Chose pnpm for faster installation and disk efficiency
- **Mock LLM default**: App runs in mock mode by default, optional real LLM with API key
- **No FTS5**: Using LIKE-based search instead of full-text search (sql.js limitation)
- **App Router**: Using Next.js App Router for modern React patterns

### Database Schema
- Created 13 tables in app.db (108 KB)
- Created 1 table in kb.db (28 KB)
- Total: 14 tables, 136 KB databases, 103 records

### File Statistics
- 23 files created (294 KB excluding node_modules)
- 7 TypeScript source files
- 5 configuration files
- 7 documentation files
- 2 database files
- 3 UI files

### Commands
- `pnpm install` - Install dependencies
- `pnpm init:db` - Initialize and seed databases
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

---

## Version Format

Version numbers follow Semantic Versioning:
- **MAJOR** version: Incompatible changes (e.g., database schema breaking changes)
- **MINOR** version: New features in backwards-compatible manner (e.g., new step completion)
- **PATCH** version: Backwards-compatible bug fixes

Step completion mapping:
- Step 1 → v1.0.0
- Step 2 → v1.1.0
- Step 3 → v1.2.0
- Step 4 → v1.3.0
- Step 5 → v1.4.0
- Step 6 → v1.5.0

---

## How to Update

When completing a step:

1. Move items from [Unreleased] to new version section
2. Update version number and date
3. List all Added/Changed/Deprecated/Removed/Fixed/Security items
4. Update version at top of PROJECT_MASTER.md
5. Mark roadmap items complete
6. Commit with message: `Release vX.X.X: Step X complete`
