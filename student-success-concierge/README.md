# Student Success Concierge

A comprehensive teaching platform for learning AI agent evaluation, tracing, and analysis. This application mirrors Nurture Boss-style workflows with full conversation tracing, teaching loop features, and evaluation tools.

## Features

### 🤖 Multi-turn Assistant
- SMS and webchat channel support with different constraints
- Tool calling capabilities (search_kb, check_availability, create_appointment, create_ticket)
- Mock LLM mode for running without API keys
- Full conversation tracing

### 📊 Tracing System
- Complete message logging (user, assistant, system)
- Tool call and output recording
- Conversation history and replay
- Channel-specific constraint tracking

### 🏷️ Teaching Loop
- **Open Coding**: Add notes to conversations
- **Axial Coding**: Tag conversations with categories
- **Frequency Dashboard**: Analyze patterns and tag distributions

### 🧪 Evaluation System
- **Code-based Checks**: JavaScript evaluation functions for each test case
- **LLM-as-Judge**: Optional rubric-based evaluation with real LLM
- **Judge Validation**: Compute TPR/TNR against human-labeled subset

### 🎯 Test Cases (3 Categories)
1. **Policy Drift**: RAG drift/hallucination control
2. **Handoff Failure**: Must escalate when required
3. **Scheduling Violation**: Double-book / hours constraints

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3 (native bindings)
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **LLM**: Interface-based with mock mode fallback

## Prerequisites

- Node.js >= 18.0.0 (20.9.0+ recommended for Next.js 16)
- pnpm (installed automatically if not present)
- Build tools for better-sqlite3:
  - **Windows**: Visual Studio Build Tools or windows-build-tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: build-essential

## Quick Start

### 1. Clone and Install

```bash
cd student-success-concierge

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install
```

### 2. Initialize Databases

```bash
pnpm init:db
```

This will:
- Create `data/app.db` with schema and seed data
- Create `data/kb.db` with knowledge base articles
- Add 1 demo student
- Generate 84 availability slots (7 days × 2 services × 6 time slots)
- Create 5 default tags for teaching loop
- Seed 10 knowledge base articles
- Add 3 test cases (1 per category)

### 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
student-success-concierge/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── lib/
│   ├── db/
│   │   ├── appDb.ts          # App database client
│   │   ├── kbDb.ts           # Knowledge base client
│   │   └── schema.ts         # (old, can be removed)
│   └── llm/
│       └── client.ts         # LLM client interface & mock
├── scripts/
│   └── init_dbs.ts           # Database initialization script
├── data/                     # SQLite databases (created by init script)
│   ├── app.db                # Main application database
│   └── kb.db                 # Knowledge base database
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file (user guide)
├── PROJECT_MASTER.md         # Master reference (everything!)
├── CHANGELOG.md              # Version history
├── UPDATE_CHECKLIST.md       # Documentation maintenance guide
└── STEP1_COMPLETE.md         # Step 1 completion report
```

## Database Schema

### app.db Tables
- `students` - Student records
- `appointments` - Scheduled appointments
- `tickets` - Support tickets (human handoff)
- `conversations` - Conversation sessions
- `messages` - Individual messages
- `tool_calls` - Tool invocations and outputs
- `availability_slots` - Service availability schedule
- `test_cases` - Evaluation test cases
- `eval_results` - Evaluation run results
- `conversation_notes` - Open coding notes
- `tags` - Tag definitions (axial coding)
- `conversation_tags` - Tag assignments to conversations

### kb.db Tables
- `kb_articles` - Knowledge base articles with full-text content

## Seeded Data

After running `pnpm init:db`, you'll have:

### Demo Student
- Name: Demo Student
- Email: demo@example.com
- Phone: 555-0100

### Availability Slots
- **Services**: Academic Advising, Career Counseling
- **Days**: Next 7 days starting from today
- **Times**: 9:00 AM, 10:00 AM, 11:00 AM, 1:00 PM, 2:00 PM, 3:00 PM
- **Total**: 84 slots (7 × 2 × 6)

### Knowledge Base Articles (10 total)
1. **Appointment Scheduling Policy** - Booking rules and procedures
2. **Academic Advising Services** - Course selection, degree planning
3. **Career Counseling Services** - Career exploration, job search
4. **Tutoring Services and Academic Support** - Subject tutoring, drop-in hours
5. **Cancellation and No-Show Policy** - 12-hour cancellation requirement
6. **Emergency Support and Crisis Resources** - Emergency contacts (555-HELP, 911)
7. **Appointment Reminder and Confirmation System** - Automated notifications
8. **Service Hours and Availability** - Operating hours, walk-in times
9. **Escalation and Handoff Procedures** - When/how to escalate issues
10. **Appointment Booking Deadlines and Restrictions** - 24-hour advance booking, weekly limits

### Test Cases (3 total)
1. **Policy Drift: Incorrect Booking Hours** - Agent claims weekend availability
2. **Handoff Failure: Emergency Not Escalated** - Crisis not escalated properly
3. **Scheduling Violation: Double Booking** - Booking without checking availability

### Default Tags (5 total)
- Policy Drift (red)
- Handoff Failure (orange)
- Scheduling Error (purple)
- Success (green)
- Needs Review (gray)

## Core Tools

The assistant has access to these tools:

1. **search_kb({query})** - Search knowledge base, return top 5 snippets
2. **check_availability({service, date})** - Get available time slots for a service
3. **create_appointment({studentId, service, date, time})** - Book an appointment
4. **create_ticket({studentId, category, summary})** - Create support ticket (escalation)

## Available Scripts

```bash
# Development
pnpm dev          # Start Next.js development server

# Database
pnpm init:db      # Initialize and seed databases

# Production
pnpm build        # Build for production
pnpm start        # Start production server
```

## Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```bash
# Database Paths (Optional - defaults to ./data/)
APP_DB_PATH=./data/app.db
KB_DB_PATH=./data/kb.db

# LLM Configuration (Optional - runs in mock mode without these)
OPENAI_API_KEY=your_openai_key_here
# OR
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## LLM Modes

### Mock Mode (Default)
No API key required. Uses deterministic responses based on keywords.

```bash
# Just run without any API keys
pnpm dev
```

### Real LLM Mode
Set an environment variable for OpenAI or Anthropic:

```bash
# For OpenAI
export OPENAI_API_KEY=sk-...
pnpm dev

# For Anthropic Claude
export ANTHROPIC_API_KEY=sk-ant-...
pnpm dev
```

## Verifying Seed Data

### Check Student Data
```bash
# Using sqlite3 command line
sqlite3 data/app.db "SELECT * FROM students;"
```

Expected output:
```
1|Demo Student|demo@example.com|555-0100|2026-01-28 ...
```

### Check Availability Slots
```bash
sqlite3 data/app.db "SELECT COUNT(*) FROM availability_slots;"
```

Expected output: `84`

### Check Knowledge Base Articles
```bash
sqlite3 data/kb.db "SELECT title FROM kb_articles;"
```

Expected output: 10 article titles

### Check Test Cases
```bash
sqlite3 data/app.db "SELECT name, category FROM test_cases;"
```

Expected output: 3 test cases with their categories

### Using a GUI
You can also use any SQLite browser tool:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [DBeaver](https://dbeaver.io/)
- VS Code SQLite extension

## Troubleshooting

### better-sqlite3 Build Errors

**Windows:**
```bash
npm install --global windows-build-tools
pnpm rebuild better-sqlite3
```

**macOS:**
```bash
xcode-select --install
pnpm rebuild better-sqlite3
```

**Linux:**
```bash
sudo apt-get install build-essential
pnpm rebuild better-sqlite3
```

### Database Permission Errors

Ensure the `data/` directory has write permissions:
```bash
chmod 755 data/
```

### Port Already in Use

Change the port:
```bash
pnpm dev -- -p 3001
```

## Next Steps (Future Improvements)

After Step 1 (current state), the following features will be added:

- **Step 2**: Chat interface with real-time interaction
- **Step 3**: Conversation history viewer with full tracing
- **Step 4**: Teaching loop UI (notes, tags, frequency dashboard)
- **Step 5**: Evaluation runner with code checks and LLM judge
- **Step 6**: Judge validation metrics (TPR/TNR)

## Development Notes

### Adding New KB Articles

Edit `scripts/init_dbs.ts` and add to the `kbArticles` array, then run:
```bash
# Delete existing databases
rm -rf data/*.db

# Re-initialize
pnpm init:db
```

### Adding New Test Cases

Add to the `testCases` array in `scripts/init_dbs.ts` following the same pattern.

### Database Queries

You can query databases directly in your code:

```typescript
import appDb from '@/lib/db/appDb';
import { searchArticles } from '@/lib/db/kbDb';

// Query app database
const students = appDb.prepare('SELECT * FROM students').all();

// Search knowledge base
const results = searchArticles('appointment scheduling');
```

## 📚 Documentation

This project includes comprehensive documentation to help you understand and extend it:

### Core Documentation

1. **[README.md](README.md)** (This File)
   - Quick start guide
   - Setup instructions
   - Feature overview
   - Usage examples

2. **[PROJECT_MASTER.md](PROJECT_MASTER.md)** ⭐ Most Important!
   - Complete project reference (600+ lines)
   - All database schemas with SQL
   - File manifest with sizes
   - API specifications
   - Tool implementations
   - Test case details
   - Knowledge base content
   - Technical decisions log
   - Quick reference commands
   - **Start here for deep understanding**

3. **[CHANGELOG.md](CHANGELOG.md)**
   - Version history
   - Features added per version
   - Breaking changes
   - Migration guides

4. **[STEP1_COMPLETE.md](STEP1_COMPLETE.md)**
   - Step 1 completion report
   - Files created/modified
   - Verification steps
   - "Done" criteria

5. **[UPDATE_CHECKLIST.md](UPDATE_CHECKLIST.md)**
   - Checklist for updating docs
   - What to update per step
   - Example updates
   - Keeps documentation current

### Documentation Flow

```
Start: README.md (Quick overview)
  ↓
Deep Dive: PROJECT_MASTER.md (Everything)
  ↓
History: CHANGELOG.md (What changed when)
  ↓
Completion: STEPX_COMPLETE.md (Proof of completion)
  ↓
Maintenance: UPDATE_CHECKLIST.md (Keep docs updated)
```

### When to Use Each

- **Learning the project?** → Start with README, then PROJECT_MASTER
- **Looking up specifics?** → Use PROJECT_MASTER (searchable reference)
- **Tracking changes?** → Check CHANGELOG
- **Verifying setup?** → Follow STEP1_COMPLETE
- **Adding features?** → Follow UPDATE_CHECKLIST

All documentation is kept in sync and updated with each step completion.

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review seeded data to ensure initialization completed
3. Check logs for database connection errors
