import kbDb from '../lib/db/kbDb';

const aiConceptArticles = [
  {
    title: 'RAG - Retrieval Augmented Generation',
    content: `RAG (Retrieval Augmented Generation) is a technique that improves LLM responses by first searching a knowledge base for relevant information, then including that information in the prompt before generating a response.

How RAG Works (Step by Step):
1. User sends a question (e.g., "What are the office hours?")
2. The question is used to search a knowledge base or document store
3. The most relevant documents/chunks are retrieved
4. Retrieved content is added to the LLM prompt as context
5. LLM generates a response grounded in the retrieved content

Why RAG Matters:
- LLMs have a training cutoff date and don't know your private data
- RAG lets LLMs answer questions about your specific documents, policies, databases
- Reduces hallucination by grounding responses in real retrieved content
- More cost-effective than fine-tuning for knowledge updates

RAG in This App:
The search_kb tool is a simple RAG implementation:
1. Student asks a question
2. Agent calls search_kb with a query
3. KB articles are searched using LIKE pattern matching
4. Matching articles are returned to the LLM as context
5. LLM synthesizes a response from the article content

Example flow:
Student: "What are the library hours?"
→ Agent calls search_kb(query: "library hours")
→ KB returns "Library Services and Study Spaces" article
→ Agent responds with the hours from that article

Advanced RAG Techniques:
- Semantic search (using embeddings instead of keyword matching)
- Hybrid search (combining keyword + semantic)
- Re-ranking retrieved results by relevance
- Chunking strategies for long documents
- HyDE (Hypothetical Document Embeddings)

RAG vs Fine-Tuning:
- RAG: Better for frequently changing knowledge, specific facts, private data
- Fine-tuning: Better for changing behavior/style/tone, not for injecting facts`,
    category: 'AI Concepts',
    tags: JSON.stringify(['RAG', 'retrieval', 'augmented generation', 'knowledge base', 'search']),
  },
  {
    title: 'Prompt Engineering',
    content: `Prompt engineering is the practice of designing and refining the text inputs given to an LLM to get better, more reliable outputs.

Key Prompt Components:
1. System Prompt: Sets the role, persona, and rules for the LLM
2. User Message: The actual request or question
3. Few-Shot Examples: Example input/output pairs to demonstrate desired behavior
4. Context: Retrieved documents, conversation history, tool results

Common Prompt Engineering Techniques:

Zero-Shot Prompting:
Directly ask the LLM without examples.
"Classify the sentiment of this review: 'The food was cold and tasteless.'"

Few-Shot Prompting:
Provide examples before the real request.
"Positive: 'Great service!' → POSITIVE
Negative: 'Waited 2 hours.' → NEGATIVE
Classify: 'Food was cold.' → ?"

Chain-of-Thought (CoT):
Ask the LLM to reason step by step before answering.
"Think step by step, then answer: If a train leaves at 9 AM..."

ReAct Prompting:
Interleave reasoning (Thought) with actions (Act) and observations.
Used in agentic systems like this app's orchestrator.

System Prompt in This App:
The orchestrator (lib/agent/orchestrator.ts) builds a system prompt that includes:
- Role definition (Student Success Concierge)
- Channel-specific rules (SMS: no markdown / Webchat: markdown allowed)
- Scheduling constraints (9 AM - 5 PM, Monday-Friday only)
- Handoff rules (create ticket when student requests human)
- Accuracy rules (always search KB before answering)

Tips for Better Prompts:
- Be specific about the output format you want
- Use delimiters (""", <tags>) to separate sections
- Tell the model what NOT to do as well as what to do
- Include examples of edge cases you want handled correctly
- Test prompts systematically and track changes

Prompt Drift:
When you change a prompt, behavior can change unexpectedly elsewhere. This is why evaluation (evals) are critical - they catch regressions caused by prompt changes.`,
    category: 'AI Concepts',
    tags: JSON.stringify(['prompt engineering', 'system prompt', 'few-shot', 'chain of thought', 'prompting']),
  },
  {
    title: 'Fine-Tuning LLMs',
    content: `Fine-tuning is the process of further training a pre-trained LLM on a smaller, task-specific dataset to specialize its behavior.

How Fine-Tuning Works:
1. Start with a pre-trained base model (e.g., GPT-4, Llama, Claude)
2. Prepare a dataset of example input/output pairs for your task
3. Run additional training epochs on your dataset
4. The model weights are updated to favor your desired behavior

Types of Fine-Tuning:

Full Fine-Tuning:
- Updates all model weights
- Most powerful but requires massive compute and data
- Risk of "catastrophic forgetting" (model forgets general knowledge)

LoRA (Low-Rank Adaptation):
- Only updates a small number of added parameters
- Much more efficient - runs on consumer GPUs
- Widely used for open-source models (Llama, Mistral)

RLHF (Reinforcement Learning from Human Feedback):
- Used to align models with human preferences
- Powers the "helpfulness" in ChatGPT and Claude
- Humans rate outputs, ratings used to train a reward model

When to Fine-Tune vs Use RAG:
Use Fine-Tuning for:
- Changing the model's tone, style, or persona
- Teaching a specific structured output format
- Improving performance on a narrow task domain
- When you have 1000+ high-quality examples

Use RAG for:
- Injecting factual knowledge (policies, documents, databases)
- Knowledge that changes frequently
- When you have limited training data
- When you need to cite sources

Fine-Tuning for Student Success Concierge:
You could fine-tune a model to:
- Always respond in a specific university tone
- Never use markdown in SMS responses (instead of relying on guardrails)
- Correctly classify student requests into categories

However, RAG + prompt engineering is usually sufficient and far simpler to implement and maintain.`,
    category: 'AI Concepts',
    tags: JSON.stringify(['fine-tuning', 'LoRA', 'RLHF', 'training', 'model customization']),
  },
  {
    title: 'Embeddings and Vector Search',
    content: `Embeddings are numerical representations (vectors) of text that capture semantic meaning, enabling similarity-based search.

What Are Embeddings?
An embedding model converts text into a list of numbers (a vector) where:
- Similar meaning → vectors are close together in vector space
- Different meaning → vectors are far apart
- Example: "office hours" and "when is the building open" will have similar vectors

Why Embeddings Matter for RAG:
Traditional keyword search (LIKE '%hours%') only matches exact words.
Semantic search with embeddings matches meaning:
- Query: "when can I visit the student center?"
- Finds: "Service Hours and Availability" article (even without keyword match)
- Misses: Articles that contain "hours" but are about unrelated topics

How Vector Search Works:
1. At index time: Convert all KB articles to embedding vectors, store in vector DB
2. At query time: Convert user query to embedding vector
3. Find the K nearest vectors (most similar meaning) using cosine similarity
4. Return matching articles as RAG context

Popular Embedding Models:
- text-embedding-3-small (OpenAI) - fast, cheap, good quality
- text-embedding-3-large (OpenAI) - higher quality, more expensive
- nomic-embed-text (open source, runs locally)
- sentence-transformers (open source Python library)

Vector Databases:
- Pinecone (managed cloud service)
- Weaviate (open source)
- Qdrant (open source, fast)
- pgvector (PostgreSQL extension)
- Chroma (lightweight, easy to start with)

Current Implementation in This App:
This app uses simple SQL LIKE keyword matching for KB search, which is easy to understand but limited. Upgrading to semantic search with embeddings would:
- Improve search recall (find relevant articles even without keyword matches)
- Handle misspellings and synonyms
- Support multi-language queries

Cosine Similarity:
The standard measure of vector similarity. Ranges from -1 (opposite) to 1 (identical). Most semantic search uses cosine similarity > 0.7 as a relevance threshold.`,
    category: 'AI Concepts',
    tags: JSON.stringify(['embeddings', 'vector search', 'semantic search', 'cosine similarity', 'RAG']),
  },
  {
    title: 'AI Safety and Guardrails',
    content: `AI guardrails are rules, filters, and checks that prevent an AI agent from producing harmful, incorrect, or policy-violating outputs.

Types of Guardrails:

Input Guardrails (Pre-LLM):
Check or filter user inputs before sending to the LLM.
- Block prompt injection attempts
- Detect and flag sensitive PII (names, SSNs, credit cards)
- Classify intent (is this a valid student question or an attack?)
- Rate limiting to prevent abuse

Output Guardrails (Post-LLM):
Check the LLM's response before sending to the user.
- Detect hallucination (response contradicts retrieved facts)
- Check for policy violations (e.g., markdown in SMS)
- Verify tool calls were made correctly (availability checked before booking)
- Ensure required actions were taken (ticket created for handoff request)

Guardrails in This App:
The orchestrator (lib/agent/orchestrator.ts) implements three output guardrails:

1. SMS No-Markdown Guardrail:
   - Detects markdown symbols (**, ##, -, backtick) in SMS responses
   - If found: Asks LLM to rewrite in plain text
   - Fallback: Strip markdown with regex

2. Handoff Enforcement Guardrail:
   - Detects handoff keywords in user message (human, urgent, supervisor)
   - If no create_ticket tool call was made: Forces ticket creation
   - Adds violation to trace for later eval review

3. Double-Booking Prevention:
   - Evaluated as a code-based eval (not a runtime guardrail)
   - Checks if check_availability was called before create_appointment

Common AI Safety Concerns:
- Prompt Injection: User tries to override system prompt ("Ignore all previous instructions...")
- Jailbreaking: Getting the model to bypass safety rules through roleplay or indirect requests
- Hallucination: Model confidently states false information
- Data Leakage: Model reveals information from other users' conversations
- Bias: Model treats different groups inconsistently

Defense in Depth:
No single guardrail is perfect. Best practice is multiple layers:
1. Input validation and sanitization
2. System prompt with clear rules
3. Output checking (code-based or LLM judge)
4. Human review of flagged conversations
5. Continuous eval monitoring for regressions`,
    category: 'AI Concepts',
    tags: JSON.stringify(['safety', 'guardrails', 'prompt injection', 'hallucination', 'AI safety']),
  },
  {
    title: 'AI Agents and Tool Calling',
    content: `An AI agent is an LLM that can take actions in the world by calling tools (functions) to gather information or make changes, then reasoning about the results to complete a task.

What Makes Something an "Agent"?
A basic LLM just generates text. An agent can:
- Decide which tool to use based on the situation
- Call tools with appropriate parameters
- Reason about tool results
- Chain multiple tool calls together
- Loop until the task is complete

Tool Calling (Function Calling):
Modern LLMs support structured tool calling:
1. You define tools with name, description, and parameter schema
2. LLM decides whether and how to call a tool
3. You execute the tool and return the result
4. LLM incorporates the result and continues reasoning

Tools in This App (lib/agent/orchestrator.ts):
- search_kb(query): Search knowledge base articles
- check_availability(service, date): Check open appointment slots
- create_appointment(studentId, service, date, time): Book an appointment
- create_ticket(studentId, category, summary): Escalate to human staff

Agent Loop in This App:
The orchestrator runs up to 3 rounds:
Round 1: LLM receives user message, decides to call a tool
Round 2: LLM receives tool result, may call another tool or respond
Round 3: LLM generates final response (or max rounds reached)

Example Multi-Step Agent Trace:
User: "I need to book a tutoring session for tomorrow"
→ Round 1: LLM calls check_availability(service="tutoring", date="2026-02-12")
→ Tool returns: ["09:00", "10:00", "14:00"] available
→ Round 2: LLM calls create_appointment(studentId=1, service="tutoring", date="2026-02-12", time="10:00")
→ Tool returns: appointment confirmed
→ Round 3: LLM responds: "I've booked your tutoring session for tomorrow at 10:00 AM."

Agent Frameworks:
- LangChain: Popular Python framework for building agents
- LlamaIndex: Focused on RAG and document agents
- CrewAI: Multi-agent collaboration
- AutoGen (Microsoft): Conversational multi-agent systems
- This app implements a custom lightweight agent loop without external frameworks

ReAct Pattern:
The standard agent pattern:
Thought: I need to check availability before booking
Action: check_availability(service="tutoring", date="2026-02-12")
Observation: [09:00, 10:00, 14:00] available
Thought: I'll book the 10:00 slot
Action: create_appointment(...)`,
    category: 'AI Concepts',
    tags: JSON.stringify(['agents', 'tool calling', 'function calling', 'ReAct', 'agentic AI']),
  },
  {
    title: 'Hallucination in LLMs',
    content: `Hallucination is when an LLM generates text that is factually incorrect, made up, or not grounded in the provided context.

Types of Hallucination:

Factual Hallucination:
LLM states false facts with confidence.
Example: "The cancellation policy requires 48 hours notice." (Actual policy: 12 hours)

Contextual Hallucination:
LLM ignores retrieved context and makes up an answer.
Example: KB article says office closes at 5 PM, but LLM says "open until 7 PM."

Tool Hallucination:
LLM invents tool call results or calls tools with wrong parameters.
Example: LLM says "I've booked your appointment" without actually calling create_appointment.

Source Fabrication:
LLM cites sources that don't exist.
Example: "According to the 2024 Student Handbook, page 47..." (no such page)

Why Hallucination Happens:
- LLMs are trained to produce fluent, coherent text, not necessarily accurate text
- The model fills gaps in knowledge with plausible-sounding text
- High temperature settings increase creativity but also hallucination
- Short or ambiguous prompts leave more room for the model to "improvise"

Detecting Hallucination:
- Compare LLM response to retrieved KB articles
- Check if tool calls actually occurred (trace verification)
- LLM-as-a-judge can flag responses that contradict source documents
- Human reviewers catch subtle factual errors

Reducing Hallucination:
1. Use RAG: Ground responses in retrieved facts ("Based on our KB: ...")
2. Instruct the model: "If you don't know, say so. Do not make up information."
3. Lower temperature (0.0-0.3 for factual tasks, higher for creative)
4. Verify tool calls actually ran (check trace, not just LLM's claim)
5. Run factual accuracy evals on a labeled test set

Hallucination in This App:
The system prompt includes: "Always search the knowledge base before answering questions about policies, hours, fees, or services. Do not make up information."
This reduces but does not eliminate hallucination. The eval system monitors for policy drift (a form of hallucination where the model states incorrect policies).`,
    category: 'AI Concepts',
    tags: JSON.stringify(['hallucination', 'accuracy', 'factual errors', 'AI reliability']),
  },
  {
    title: 'Tokens, Context Windows, and LLM Costs',
    content: `Understanding tokens and context windows is essential for building cost-effective LLM applications.

What Are Tokens?
Tokens are the units LLMs use to process text. Roughly:
- 1 token ≈ 4 characters in English
- 1 token ≈ 0.75 words
- "Hello world" = 2 tokens
- This entire sentence = approximately 10 tokens

Tokenization Examples:
- "university" = 1 token
- "unaccountability" = 3 tokens
- "LLM" = 1 token
- Code and special characters use more tokens per character

Context Window:
The maximum number of tokens an LLM can process in one request (input + output combined).

Common Context Windows:
- GPT-4o: 128,000 tokens (~96,000 words)
- Claude 3.5 Sonnet: 200,000 tokens (~150,000 words)
- GPT-4o-mini: 128,000 tokens

What Goes in the Context:
- System prompt
- Conversation history (all previous messages)
- Tool definitions
- Tool call results
- The response being generated

Why Context Window Matters:
- Long conversations eventually exceed the context limit
- Long KB articles retrieved via RAG add to token count
- More tokens = higher cost and slower responses
- Strategies: summarize old messages, truncate history, use smaller chunks

Cost Calculation (approximate):
GPT-4o pricing (as of 2025):
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

Example conversation (1000 input + 200 output tokens):
Cost = (1000 × $2.50/1M) + (200 × $10/1M) = $0.0025 + $0.002 = $0.0045

For 1000 conversations/day = ~$4.50/day

Cost Optimization Tips:
- Use GPT-4o-mini for simple tasks ($0.15/1M input vs $2.50/1M)
- Cache system prompts (Anthropic prompt caching saves 90%)
- Limit retrieved KB chunks to most relevant 3-5 articles
- Set max_tokens to limit response length
- Use streaming to improve perceived latency`,
    category: 'AI Concepts',
    tags: JSON.stringify(['tokens', 'context window', 'cost', 'pricing', 'LLM efficiency']),
  },
];

async function main() {
  console.log('🧠 Adding AI Concepts articles to knowledge base...\n');

  const db = await kbDb.getDb();

  const stmt = db.prepare(`
    INSERT INTO kb_articles (title, content, category, tags)
    VALUES (?, ?, ?, ?)
  `);

  for (const article of aiConceptArticles) {
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
  console.log(`\n✅ Added ${aiConceptArticles.length} articles. Total articles: ${total}\n`);
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
