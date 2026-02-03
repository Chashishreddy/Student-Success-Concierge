# Student Quickstart Guide

Get the Student Success Concierge running in **under 10 minutes**!

## Prerequisites

You'll need:
- **Node.js** 18+ installed ([download here](https://nodejs.org/))
- **Git** installed ([download here](https://git-scm.com/))
- A terminal (Command Prompt, PowerShell, or Terminal)

## Quick Setup (5 minutes)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd student-success-concierge
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Initialize the Database

```bash
npm run init:db
```

This creates sample data including:
- 1 demo student
- 84 appointment slots
- 10 knowledge base articles
- 3 test cases

### Step 4: Start the App

```bash
npm run dev
```

### Step 5: Open in Browser

Go to: **http://localhost:3000**

That's it! You're ready to explore.

---

## What Can You Do?

### 1. Chat with the AI Assistant

Go to **[/chat](/chat)** to interact with the Student Success Concierge.

- Select a test case (or leave blank for general chat)
- Choose SMS or Webchat channel
- Send messages and watch how the AI responds
- Each conversation creates a trace you can analyze

### 2. View Traces

Go to **[/admin/traces](/admin/traces)** to see conversation histories.

- See all messages exchanged
- View tool calls (searches, appointments, tickets)
- Add notes about what you observe
- Tag traces with categories

### 3. Analyze Test Cases

Go to **[/cases](/cases)** to see the three test scenarios:

1. **Policy Drift** - Does the AI stick to accurate information?
2. **Handoff Failure** - Does the AI escalate when needed?
3. **Scheduling Violation** - Does the AI follow booking rules?

### 4. Run Evaluations

Go to **[/admin/evals](/admin/evals)** to run automated checks:

- Click "Run Evals" to evaluate all traces
- See pass/fail rates by test case
- Click into failing traces to understand why

### 5. Label Traces (Ground Truth)

Go to **[/admin/labels](/admin/labels)** to create ground truth labels:

- Review traces one by one
- Mark PASS or FAIL for each evaluation type
- Your labels help validate the automated judge

### 6. Validate the Judge

Go to **[/admin/judge-validation](/admin/judge-validation)** to compare:

- Run validation to compare judge vs your labels
- See confusion matrix and accuracy metrics
- Identify where the judge needs improvement

---

## Key Concepts

### Traces
A trace captures everything in a conversation:
- User messages
- Assistant responses
- Tool calls (KB search, appointments, tickets)
- Timestamps

### Test Cases
Pre-defined scenarios that test specific behaviors:
- Each has expected behavior and evaluation criteria
- "Frozen" cases lock in specific traces for analysis

### Channels
- **SMS**: Plain text only, no markdown
- **Webchat**: Markdown formatting allowed

### Tools
The AI can use these tools:
- `search_kb` - Search knowledge base
- `check_availability` - Check appointment slots
- `create_appointment` - Book appointments
- `create_ticket` - Escalate to human staff

---

## Common Tasks

### Create a Trace for Analysis

1. Go to [/chat](/chat)
2. Select a test case (e.g., "Policy Drift")
3. Enter your student handle (any name works)
4. Send a message that might trigger issues
5. View the trace at [/admin/traces](/admin/traces)

### Evaluate Your Traces

1. Create several traces (5-10)
2. Go to [/admin/evals](/admin/evals)
3. Click "Run Evals"
4. Review failures and understand why

### Compare with Ground Truth

1. Go to [/admin/labels](/admin/labels)
2. Label 10-20 traces with PASS/FAIL
3. Go to [/admin/judge-validation](/admin/judge-validation)
4. Click "Run Validation"
5. Analyze the confusion matrix

---

## Troubleshooting

### "npm command not found"
Install Node.js from https://nodejs.org/

### "Port 3000 already in use"
```bash
npm run dev -- -p 3001
```
Then go to http://localhost:3001

### Database errors
Re-initialize the database:
```bash
rm -rf data/*.db
npm run init:db
```

### Chat not working
Make sure you've run `npm run init:db` first.

---

## Getting Help

- **In-app help**: Visit [/help](/help)
- **Dashboard**: [/admin/dashboard](/admin/dashboard)
- **Full README**: See README.md in the project root

---

## Next Steps

Once you're comfortable:

1. **Explore edge cases** - Try to make the AI fail
2. **Create your own test scenarios** - Think about what could go wrong
3. **Build a labeled dataset** - Label 30+ traces for robust validation
4. **Analyze patterns** - What types of failures are most common?

Happy exploring! 🎓
