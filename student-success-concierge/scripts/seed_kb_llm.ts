import kbDb from '../lib/db/kbDb';

const llmArticles = [
  {
    title: 'What is LLM as a Judge?',
    content: `LLM as a Judge is an evaluation technique where a Large Language Model (LLM) is used to assess the quality, correctness, or compliance of another AI system's outputs.

How It Works:
Instead of relying solely on human reviewers or hard-coded rules, an LLM judge reads a conversation or output and scores it against a rubric. For example:
- Did the agent follow the correct policy?
- Was the response helpful and accurate?
- Did the agent escalate when required?
- Was the tone appropriate?

Why It's Used:
- Scales faster than human review
- Handles nuanced, open-ended outputs that code-based evals can't easily check
- Can evaluate reasoning quality, not just keyword matches
- Consistent scoring when using a fixed rubric

Limitations:
- LLM judges can be biased toward verbose or confident-sounding responses
- Positional bias: favoring the first option when comparing two responses
- Self-preference bias: GPT-4 may favor GPT-4 outputs over others
- Not a replacement for human ground truth labels

In This App:
The Mock Judge (lib/judge/mockJudge.ts) simulates LLM-as-a-judge scoring for:
- Handoff required: Did the agent create a ticket when it should?
- Policy adherence: Did the agent follow booking and hours rules?
- Overall pass/fail: General quality assessment

See: Admin → Judge Validation to view confusion matrix metrics comparing judge predictions to human ground truth labels.`,
    category: 'AI Evaluation',
    tags: JSON.stringify(['LLM', 'judge', 'evaluation', 'AI', 'assessment']),
  },
  {
    title: 'What is a Large Language Model (LLM)?',
    content: `A Large Language Model (LLM) is an AI system trained on massive amounts of text data to understand and generate human language.

Key Characteristics:
- Trained on billions to trillions of tokens of text (books, websites, code, etc.)
- Uses transformer neural network architecture
- Learns statistical patterns in language to predict likely next words
- Can perform a wide range of tasks without task-specific training

Common LLMs:
- GPT-4o (OpenAI) - used in this app by default
- Claude (Anthropic) - also supported in this app
- Gemini (Google)
- Llama (Meta, open source)

What LLMs Can Do:
- Answer questions and hold conversations
- Summarize documents
- Write and debug code
- Translate languages
- Extract and classify information
- Use tools/APIs when given function definitions

How This App Uses LLMs:
This Student Success Concierge app uses an LLM (GPT-4o or Claude) as the core AI agent. The LLM:
1. Reads the system prompt with university policies
2. Receives the student's message
3. Decides whether to call tools (search KB, book appointments, create tickets)
4. Generates the final response to the student

The LLM is also used as a judge to evaluate conversation quality (see "LLM as a Judge").

Limitations to Be Aware Of:
- LLMs can hallucinate (confidently state incorrect information)
- They have a knowledge cutoff date
- Outputs are probabilistic, not deterministic
- Context window limits how much they can "remember" in one conversation`,
    category: 'AI Evaluation',
    tags: JSON.stringify(['LLM', 'large language model', 'AI', 'GPT', 'Claude']),
  },
  {
    title: 'Code-Based Evals vs LLM-as-a-Judge Evals',
    content: `This app implements two types of evaluations to assess AI agent quality.

Code-Based Evals (Deterministic):
These are binary pass/fail checks written in code. They are fast, reliable, and consistent.

Examples in this app:
- sms_no_markdown: Does the SMS response contain markdown? (grep for **, #, -, etc.)
- handoff_required: Did a create_ticket tool call occur when a handoff keyword was detected?
- no_double_booking: Was check_availability called before create_appointment?

Pros: Fast, 100% consistent, zero cost, no hallucination
Cons: Only catches what you explicitly code for, can't evaluate nuanced quality

LLM-as-a-Judge Evals (Probabilistic):
An LLM reads the full conversation and scores it against a rubric written in natural language.

Examples in this app:
- Handoff quality: Was the escalation handled appropriately and empathetically?
- Policy adherence: Did the agent explain the correct cancellation window?
- Overall quality: Was the response helpful, accurate, and appropriate?

Pros: Can evaluate nuance, tone, and reasoning quality
Cons: Costs money per eval, can be inconsistent, subject to bias

Best Practice - Use Both Together:
1. Run code-based evals on every conversation (cheap, fast, reliable)
2. Run LLM judge on conversations that pass code-based evals or on random samples
3. Validate LLM judge against human ground truth labels (confusion matrix)
4. Use the confusion matrix to measure judge reliability (TPR, TNR, precision)

See: Admin → Evaluations and Admin → Judge Validation in this app.`,
    category: 'AI Evaluation',
    tags: JSON.stringify(['evals', 'evaluation', 'LLM judge', 'code-based', 'testing']),
  },
  {
    title: 'Ground Truth Labeling and Confusion Matrix',
    content: `Ground truth labels are human-verified correct answers used to validate automated evaluation systems.

Why Ground Truth Matters:
Before trusting an LLM judge or code-based eval, you need to verify it agrees with human judgment on a labeled dataset. Without ground truth, you don't know if your eval is actually measuring what you think it's measuring.

Confusion Matrix (Binary Classification):
For a pass/fail eval, the confusion matrix has 4 cells:

            | Human: PASS  | Human: FAIL
Judge: PASS |  TP (True +) | FP (False +)
Judge: FAIL |  FN (False -) | TN (True -)

Key Metrics:
- True Positive Rate (TPR / Recall): TP / (TP + FN)
  "Of all actual PASS conversations, what % did the judge correctly call PASS?"
  Target: > 0.85

- True Negative Rate (TNR / Specificity): TN / (TN + FP)
  "Of all actual FAIL conversations, what % did the judge correctly call FAIL?"
  Target: > 0.85

- Precision: TP / (TP + FP)
  "Of all conversations the judge called PASS, what % were actually PASS?"

- Accuracy: (TP + TN) / Total

What Good Looks Like:
- TPR > 0.85: Judge rarely misses real failures
- TNR > 0.85: Judge rarely flags good conversations as failures
- If TPR is low: Judge is too strict (missing passing conversations)
- If TNR is low: Judge is too lenient (missing failing conversations)

In This App:
Admin → Ground Truth Labels: Add human labels to conversations
Admin → Judge Validation: View confusion matrix metrics comparing judge vs human labels`,
    category: 'AI Evaluation',
    tags: JSON.stringify(['ground truth', 'labels', 'confusion matrix', 'TPR', 'TNR', 'evaluation metrics']),
  },
  {
    title: 'AI Agent Tracing and Observability',
    content: `Tracing records every step an AI agent takes during a conversation so you can debug, evaluate, and improve it.

What Gets Traced in This App:
Every conversation records:
- User message (input)
- System prompt used
- LLM call inputs and outputs (model, tokens, latency)
- Tool calls made (name, input parameters, output/result)
- Final assistant response
- Guardrail violations detected
- Round count (how many LLM calls were made)

Why Tracing Matters:
1. Debugging: "Why did the agent book the wrong time?" → look at the tool call inputs/outputs
2. Evaluation: Run evals against the stored trace data
3. Monitoring: Detect when agent behavior changes after a prompt update
4. Teaching: Students can see exactly what the agent "thought" step by step

Trace Viewer in This App:
- Admin → Conversations: View all traces
- Click any trace to see: messages, tool calls, inputs, outputs
- Filter by student, channel (SMS/webchat), date

Arize Phoenix Integration (Optional):
This app supports OpenTelemetry/OpenInference tracing to Arize Phoenix, an open-source LLM observability platform.

To enable Phoenix tracing:
1. Run: docker-compose -f docker-compose.phoenix.yml up -d
2. Add to .env.local: PHOENIX_ENDPOINT=http://localhost:6006/v1/traces
3. Phoenix UI available at http://localhost:6006

Phoenix provides advanced features like:
- Token usage and cost tracking
- Latency analysis
- Span-level drill-down
- Dataset management for eval runs

See: docs/instructor-quickstart.md for full Phoenix setup instructions.`,
    category: 'AI Evaluation',
    tags: JSON.stringify(['tracing', 'observability', 'Phoenix', 'OpenTelemetry', 'debugging']),
  },
];

async function main() {
  console.log('🤖 Adding LLM & AI Evaluation articles to knowledge base...\n');

  const db = await kbDb.getDb();

  const stmt = db.prepare(`
    INSERT INTO kb_articles (title, content, category, tags)
    VALUES (?, ?, ?, ?)
  `);

  for (const article of llmArticles) {
    stmt.bind([article.title, article.content, article.category, article.tags]);
    stmt.step();
    stmt.reset();
    console.log(`  ✓ Added: ${article.title}`);
  }
  stmt.free();
  kbDb.saveDb();

  const countStmt = db.prepare('SELECT COUNT(*) as total FROM kb_articles');
  countStmt.step();
  const total = countStmt.getAsObject().total;
  countStmt.free();

  const catStmt = db.prepare('SELECT category, COUNT(*) as count FROM kb_articles GROUP BY category ORDER BY category');
  console.log(`\n✅ Added ${llmArticles.length} articles. Total articles: ${total}\n`);
  console.log('Articles by category:');
  while (catStmt.step()) {
    const row = catStmt.getAsObject();
    console.log(`  - ${row.category}: ${row.count}`);
  }
  catStmt.free();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
