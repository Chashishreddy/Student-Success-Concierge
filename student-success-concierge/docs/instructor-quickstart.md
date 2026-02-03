# Instructor Quickstart Guide

Set up the Student Success Concierge for your class with multiple deployment options.

## Deployment Options

| Option | Best For | Setup Time | Requirements |
|--------|----------|------------|--------------|
| **Local** | Individual students | 5 min | Node.js 18+ |
| **Docker** | Lab environments | 3 min | Docker |
| **Docker + Phoenix** | Advanced analysis | 5 min | Docker |

---

## Option A: Local Setup (Recommended for Students)

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- Git ([download](https://git-scm.com/))

### Setup Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd student-success-concierge

# 2. Install dependencies
npm install

# 3. Initialize database with sample data
npm run init:db

# 4. Start development server
npm run dev
```

Open http://localhost:3000

### For Real LLM (Optional)

Create `.env.local`:
```bash
# Choose one:
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-...
```

Without API keys, the app runs in **mock mode** with deterministic responses.

---

## Option B: Docker Setup (Recommended for Labs)

### Prerequisites
- Docker ([download](https://www.docker.com/products/docker-desktop))

### Quick Start

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app
```

Open http://localhost:3000

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

### Stopping

```bash
docker-compose down
```

---

## Option C: Docker + Phoenix (Advanced Observability)

### docker-compose.phoenix.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006/v1/traces
    depends_on:
      - phoenix

  phoenix:
    image: arizephoenix/phoenix:latest
    ports:
      - "6006:6006"
      - "4317:4317"
```

### Start with Phoenix

```bash
docker-compose -f docker-compose.phoenix.yml up -d
```

- App: http://localhost:3000
- Phoenix: http://localhost:6006

---

## Class Setup Checklist

### Before Class

- [ ] Test the setup on a clean machine
- [ ] Prepare repository URL for students
- [ ] Create any custom test cases (optional)
- [ ] Decide on mock vs real LLM mode

### During Class

- [ ] Share repository URL
- [ ] Walk through quickstart (5-10 min)
- [ ] Verify everyone can access http://localhost:3000
- [ ] Demo one trace creation and analysis

### Lab Exercises

1. **Exploration (30 min)**
   - Chat with different test cases
   - Observe different failure modes

2. **Trace Analysis (30 min)**
   - Create 10+ traces per student
   - Add notes and tags

3. **Evaluation (30 min)**
   - Run automated evals
   - Analyze pass/fail patterns

4. **Ground Truth (45 min)**
   - Label 20+ traces
   - Compare with judge
   - Discuss disagreements

---

## Teaching the Workflow

### The Teaching Loop

```
1. OBSERVE: Run conversations, create traces
      ↓
2. ANALYZE: Review traces, identify patterns
      ↓
3. LABEL: Create ground truth labels
      ↓
4. EVALUATE: Run automated evals
      ↓
5. VALIDATE: Compare judge vs human
      ↓
6. ITERATE: Improve based on findings
```

### Key Concepts to Cover

#### 1. Tracing Fundamentals
- What gets captured (messages, tool calls)
- Why tracing matters for AI systems
- How to read a trace

#### 2. Evaluation Types
- **Code-based evals**: Deterministic checks
- **LLM-as-judge**: Rubric-based assessment
- **Human labels**: Ground truth

#### 3. Validation Metrics
- True Positive Rate (Sensitivity)
- True Negative Rate (Specificity)
- Precision and Accuracy
- Confusion matrix interpretation

#### 4. Failure Categories
- **Policy Drift**: AI makes up information
- **Handoff Failure**: AI doesn't escalate
- **Scheduling Violation**: AI breaks rules

---

## Customization

### Adding Test Cases

Edit `scripts/init_dbs.ts`:

```typescript
const testCases = [
  {
    name: 'Your Custom Case',
    description: 'What this tests',
    category: 'policy_drift', // or handoff_failure, scheduling_violation
    expected_behavior: 'What should happen',
    eval_code: 'return messages.some(m => m.content.includes("expected"));',
  },
  // ... existing cases
];
```

Then reinitialize:
```bash
rm -rf data/*.db
npm run init:db
```

### Adding Knowledge Base Articles

Edit `scripts/init_dbs.ts`:

```typescript
const kbArticles = [
  {
    title: 'Your Article Title',
    content: 'Full article content...',
    category: 'services', // or policies, hours, etc.
    keywords: 'relevant, keywords, here',
  },
  // ... existing articles
];
```

### Custom Evaluation Functions

Create new evals in `lib/evals/runner.ts`:

```typescript
export function evalCustomCheck(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): EvalResult {
  // Your custom logic
  const passed = /* your condition */;
  return {
    pass: passed,
    details: { reason: 'Your explanation' }
  };
}
```

---

## Grading Suggestions

### Lab Report Rubric

| Component | Points | Criteria |
|-----------|--------|----------|
| Traces Created | 20 | 10+ meaningful traces |
| Notes/Tags | 20 | Thoughtful annotations |
| Labels | 20 | 20+ ground truth labels |
| Analysis | 20 | Written analysis of patterns |
| Reflection | 20 | What did you learn? |

### Discussion Questions

1. What types of failures were most common?
2. Where did the automated judge disagree with you?
3. How would you improve the system prompt?
4. What additional tools would help?
5. How does channel (SMS vs webchat) affect behavior?

---

## Troubleshooting

### Common Student Issues

**"npm not found"**
→ Install Node.js from nodejs.org

**"Port 3000 in use"**
→ `npm run dev -- -p 3001`

**"Database errors"**
→ `rm -rf data/*.db && npm run init:db`

**"Docker won't start"**
→ Make sure Docker Desktop is running

### Getting Support

- Check README.md for detailed documentation
- Review STEP*_COMPLETE.md files for implementation details
- Check browser console for JavaScript errors

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    Next.js App                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Chat UI  │  │  Traces   │  │   Evals   │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │          │
│  ┌─────┴──────────────┴──────────────┴─────┐   │
│  │            Orchestrator                  │   │
│  │  - System prompt building               │   │
│  │  - Tool calling loop (max 3 rounds)     │   │
│  │  - Guardrails (markdown, handoff)       │   │
│  └─────────────────┬───────────────────────┘   │
│                    │                            │
│  ┌─────────────────┴───────────────────────┐   │
│  │              LLM Client                  │   │
│  │  - Mock (default)                       │   │
│  │  - Anthropic Claude                     │   │
│  │  - OpenAI GPT                           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────────┐
   │ app.db  │  │ kb.db   │  │ Phoenix     │
   │ (local) │  │ (local) │  │ (optional)  │
   └─────────┘  └─────────┘  └─────────────┘
```

---

## Resources

- **Student Quickstart**: [/docs/student-quickstart.md](/docs/student-quickstart.md)
- **Full README**: [/README.md](/README.md)
- **Project Master Doc**: [/PROJECT_MASTER.md](/PROJECT_MASTER.md)
- **In-App Help**: [/help](/help)

Happy teaching! 🎓
