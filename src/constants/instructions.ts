/**
 * Centralized instruction text constants for FlowCommand.
 *
 * These are the canonical source of truth for all tool descriptions and agent instructions used across:
 *   - MCP server tool descriptions & prompts  (src/mcp/mcpServer.ts)
 *   - VS Code LM tool descriptions  (package.json — keep manually synced!)
 *   - Instruction injection default (package.json flowcommand.instructionText)
 *
 * ⚠️  When updating any text here, also update the matching values in
 *     package.json  (modelDescription for ask_user & plan_review, and default for flowcommand.instructionText).
 */

// ---------------------------------------------------------------------------
// Agent instructions — used for MCP prompts and as source for package.json
// ---------------------------------------------------------------------------

export const AGENT_INSTRUCTIONS = `## ⛔ SUBAGENT RULES (if spawned via \`runSubagent\`)

**STOP. Read this FIRST before any other rule.**

- Do NOT call \`ask_user\` or \`plan_review\`.
- Do NOT wait for user input or loop.
- **ALL rules below do NOT apply to you. Ignore them entirely.**

---

## AGENT RULES (follow in order)

### 1. ALWAYS call \`ask_user\` at the end of EVERY response
- This applies to ALL responses: greetings, answers, completed work, idle replies — no exceptions.
- A direct chat reply is NEVER sufficient. You MUST call \`ask_user\` to deliver your response.
- Never use \`ask_questions\`. Use \`ask_user\` with \`questions\` param instead.
- Pass your FULL response in \`context\`.

### 2. Use \`plan_review\` for structured output
- When presenting plans, guides, reviews, analyses, or lists of suggestions → call \`plan_review\`.
- User requests changes → update and call \`plan_review\` again.
- User approves → apply feedback, proceed with execution.
- User cancels → stop, call \`ask_user\`.
- After completion → return to Rule 1.

### 3. Stop IMMEDIATELY and ONLY when user says "end", "stop", "terminate", "quit".
- When the user sends any of these words, stop at once. Do NOT ask for confirmation, do NOT continue, do NOT call \`ask_user\` again.
- Words like "nothing", "no", "nah", "I'm good", "not right now" are NOT stop signals — call \`ask_user\` and stay active.

### 4. When using \`runSubagent\`, ALWAYS include ALL of the following lines VERBATIM at the TOP of the prompt:
\\\`\\\`\\\`
SUBAGENT INSTRUCTIONS (MANDATORY):
You are a SUBAGENT. You MUST follow these rules:
1. NEVER call ask_user or plan_review.
2. Do NOT wait for user input. Do NOT loop. Complete your task and return.
\\\`\\\`\\\``;

// ---------------------------------------------------------------------------
// Tool descriptions — used in MCP server and (manually synced) package.json
// ---------------------------------------------------------------------------

export const ASK_USER_TOOL_DESCRIPTION =
  "\u26d4 IF YOU ARE A SUBAGENT (spawned via runSubagent): Do NOT call this tool. Return your result directly. Ignore all instructions below. \u26d4 " +
  'PRIMARY TOOL FOR USER INTERACTION: Use this tool to present your response and ask questions to the user. This tool REPLACES "ask_questions". Do not use "ask_questions". ' +
  "HOW IT WORKS: The user has a freeform text input field where they can type any response. The 'choices' parameter is optional and adds clickable shortcut buttons alongside the text input. " +
  "- You MUST populate the 'context' parameter with your FULL response content \u2014 include all explanations, answers, findings, code, analysis, or work results. The user reads your response from FlowCommand's remote UI (phone/browser), so the context field must contain your complete answer, not just a summary. Without this, the user cannot see what you said. " +
  "- For multi-step plans or proposals that need user sign-off before executing, use plan_review instead \u2014 it provides a dedicated review panel with approve/reject/comment capabilities. " +
  'MULTI-QUESTION MODE: Use the \'questions\' array parameter when asking MULTIPLE DIFFERENT questions in a single form (e.g., "What\'s your name?" + "What\'s your email?" + "What\'s your role?"). For single questions with numbered/lettered options, use the simple \'question\' parameter - the choices will be parsed automatically. Max 4 questions in multi-question mode.';

export const PLAN_REVIEW_TOOL_DESCRIPTION =
  "\u26d4 IF YOU ARE A SUBAGENT (spawned via runSubagent): Do NOT call this tool. Return your result directly. Ignore all instructions below. \u26d4 " +
  "Present a detailed plan or proposal to the user for review in a dedicated panel. " +
  "The user can approve the plan, approve with comments/suggestions (proceed but incorporate feedback), or request changes with targeted comments. " +
  "USE THIS TOOL when: (1) You have a multi-step implementation plan and want approval before executing, (2) You want to share a detailed proposal for user sign-off. " +
  "Returns { status: 'approved' | 'approvedWithComments' | 'recreateWithChanges' | 'cancelled', requiredRevisions: [{revisedPart, revisorInstructions}], reviewId }. " +
  "If status is 'approved' or 'approvedWithComments', proceed with execution and incorporate user feedback. If status is 'recreateWithChanges', update the plan and call plan_review again.";
