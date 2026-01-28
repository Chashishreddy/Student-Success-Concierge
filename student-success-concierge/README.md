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

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: SQLite with sql.js (no build tools required)
- **Styling**: Tailwind CSS
- **LLM**: Interface-based with mock mode fallback

## Project Structure

```
student-success-concierge/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes (to be added)
│   ├── chat/                 # Chat interface (to be added)
│   ├── conversations/        # Conversation history (to be added)
│   ├── teaching/             # Teaching loop dashboard (to be added)
│   ├── evaluations/          # Evaluation runner (to be added)
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── lib/
│   ├── db/
│   │   ├── schema.ts         # Database schema definitions
│   │   └── client.ts         # Database client wrapper
│   └── llm/
│       └── client.ts         # LLM client interface & mock
├── scripts/
│   ├── init-db.js            # Database initialization
│   ├── seed-kb.js            # Knowledge base seeding
│   └── seed-test-cases.js    # Test case seeding
├── data/                     # SQLite databases (created on init)
│   ├── app.db                # Main application database
│   └── kb.db                 # Knowledge base database
└── components/               # React components (to be added)
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd student-success-concierge
npm install
```

### 2. Initialize Databases

```bash
npm run init-db
```

This creates:
- `data/app.db` with 3 sample students, availability slots, and default tags
- `data/kb.db` (empty, ready for seeding)

### 3. Seed Knowledge Base

```bash
npm run seed-kb
```

Adds 8 knowledge base articles covering:
- Appointment scheduling policy
- Service descriptions (Advising, Counseling, Tutoring)
- Cancellation policy
- Emergency resources
- Hours and availability

### 4. Seed Test Cases

```bash
npm run seed-test-cases
```

Adds 9 test cases (3 per category):
- **Policy Drift**: Incorrect hours, hallucinated services, wrong cancellation policy
- **Handoff Failure**: Emergency not escalated, complex issues, out-of-scope requests
- **Scheduling Violation**: Double booking, outside hours, exceeds weekly limit

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Mock LLM Mode (Default)

The app runs in mock LLM mode by default, using deterministic responses. No API key required!

### Real LLM Mode

To use a real LLM, set an environment variable:

```bash
# For OpenAI
export OPENAI_API_KEY=your_key_here

# For Anthropic Claude
export ANTHROPIC_API_KEY=your_key_here
```

Or create a `.env.local` file:

```
OPENAI_API_KEY=your_key_here
```

## Database Schema

### app.db Tables
- `students`: Student records
- `appointments`: Scheduled appointments
- `tickets`: Support tickets (human handoff)
- `conversations`: Conversation sessions
- `messages`: Individual messages
- `tool_calls`: Tool invocations and outputs
- `availability_slots`: Service availability schedule
- `test_cases`: Evaluation test cases
- `eval_results`: Evaluation run results
- `conversation_notes`: Open coding notes
- `tags`: Tag definitions (axial coding)
- `conversation_tags`: Tag assignments

### kb.db Tables
- `kb_articles`: Knowledge base articles
- `kb_articles_fts`: Full-text search index

## Core Tools

1. **search_kb({query})**: Search knowledge base, return top snippets
2. **check_availability({service, date})**: Get available time slots
3. **create_appointment({studentId, service, date, time})**: Book appointment
4. **create_ticket({studentId, category, summary})**: Create support ticket

## Next Steps

After Step 1 (infrastructure setup), the following steps will add:

- Step 2: Chat interface with tool calling
- Step 3: Conversation history with full tracing
- Step 4: Teaching loop (notes, tags, frequency dashboard)
- Step 5: Evaluation runner with code checks and LLM judge
- Step 6: Judge validation (TPR/TNR metrics)

## License

MIT
