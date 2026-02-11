# FlowCommand Extension Analysis

## Overview

This document provides a comprehensive analysis of the FlowCommand VS Code extension, focusing on AI instruction handling, interactive approval parsing, and codebase structure.

## AI Instructions Architecture

### Primary Instruction Sources

The FlowCommand extension implements a multi-layered approach to AI instruction management:

#### 1. Core Instructions (`package.json`)

**Location**: `package.json` (lines ~294)

- Contains the default value for `flowcommand.instructionText`
- Defines the main behavioral instructions for Copilot
- Includes rules for subagent mode, primary agent mode, ask_user protocol, and structured reviews

#### 2. Injected Instructions (`.github/copilot-instructions.md`)

**Location**: `.github/copilot-instructions.md`

- The actual file that gets created/updated when instruction injection is enabled
- This is what Copilot reads during development
- Contains the same instructions as the package.json default, but in deployed form

#### 3. Tool Descriptions (`src/constants/instructions.ts`)

**Location**: `src/constants/instructions.ts`

- Canonical source for tool descriptions
- Defines `ASK_USER_TOOL_DESCRIPTION` and `PLAN_REVIEW_TOOL_DESCRIPTION`
- Used across MCP server and VS Code LM tool registration

### Instruction Flow

```
package.json (default) → .github/copilot-instructions.md (injected)
                      ↓
src/constants/instructions.ts (tool descriptions)
                      ↓
src/mcp/mcpServer.ts (MCP tools)
src/tools.ts (VS Code LM tools)
```

## Interactive Approval Parsing System

### Architecture

The parsing system is implemented in `src/webview/webviewProvider.ts` in the `_parseChoices` method.

### Parsing Patterns Supported

1. **Numbered Options**:
   - Multi-line: `1. Option\n2. Option\n3. Option`
   - Inline: `1. Option 2. Option 3. Option`
   - Emoji: `1️⃣ Option 2️⃣ Option 3️⃣ Option`

2. **Lettered Options**:
   - `A. Option B. Option C. Option`
   - `Option A: description`

3. **Bullet Points**:
   - `- Option - Option - Option`
   - `• Option • Option • Option`

### Parsing Logic Flow

```
Input Text → Split into lines → Try multi-line patterns
                                      ↓
                         If no matches → Try inline patterns
                                      ↓
                         If matches found → Create choice objects
                                      ↓
                         Return choices array or empty array
```

### Choice Object Structure

```typescript
interface ParsedChoice {
  label: string; // Display text (truncated if >40 chars)
  value: string; // Value sent back to AI (number/letter/text)
  shortLabel: string; // Button text (truncated if >20 chars)
}
```

### Webview Rendering

Choices are rendered in `media/webview.js` in the `showChoicesBar()` function:

```javascript
// Only show if interactive approval is enabled
if (interactiveApprovalEnabled && currentChoices.length > 0) {
  showChoicesBar();
}
```

## Identified Issues and Fixes

### Issue 1: Inline Numbered Parsing Regex Bug

**Problem**: The original regex for inline numbered options was overly complex and failed to match properly.

**Original Regex**:

```javascript
/(\d+)(?:[.):]|\s+-)\s+([^0-9]+?)(?=\s+\d+(?:[.):]|\s+-)|[.!]\s+(?:Wait|wait|Please|please|Then|then|Select|select)|[.?!]\s*$|$)/g;
```

**Fixed Regex**:

```javascript
/(\d+)[.)]\s+([^0-9]+?)(?=\s+\d+[.)]|\s*$)/g;
```

**Impact**: Now correctly parses "1. React 2. Vue 3. Angular" format.

### Issue 2: Multi-line vs Inline Detection

**Problem**: When options are on separate lines but the first option shares a line with the question, only partial parsing occurs.

**Example**:

```
Which framework? 1. React
2. Vue
3. Angular
```

**Result**: Only finds "2. Vue" and "3. Angular", misses "1. React"

**Root Cause**: Multi-line pattern requires each option to be on its own line.

## Codebase Structure Analysis

### Core Components

#### Extension Host (`src/extension.ts`)

- Main extension activation
- Registers webview provider and commands

#### Webview Provider (`src/webview/webviewProvider.ts`)

- Handles webview lifecycle
- Manages tool calls and user responses
- Contains parsing logic
- Manages settings and instruction injection

#### Webview UI (`media/webview.js`)

- User interface for tool interactions
- Handles choice rendering and user input
- Manages approval modals and settings

#### MCP Server (`src/mcp/mcpServer.ts`)

- Provides external IDE access
- Registers tools for non-VS Code clients
- Handles server lifecycle

#### Tools (`src/tools.ts`)

- Core ask_user implementation
- VS Code LM tool registration
- Response processing and attachment handling

### Settings Architecture

#### Configuration Schema (`package.json`)

```json
{
  "flowcommand.interactiveApproval": {
    "type": "boolean",
    "default": true,
    "description": "Show interactive approval and choice buttons"
  },
  "flowcommand.instructionText": {
    "type": "string",
    "default": "# 🛡️ CRITICAL OPERATING PROTOCOLS...",
    "description": "The instruction text injected into Copilot"
  }
}
```

#### Settings Flow

```
package.json → VS Code config → webviewProvider → webview.js
```

## Testing Analysis

### TESTING_CHECKLIST.md Coverage

The extension includes comprehensive testing procedures covering:

1. **Installation & Setup**
2. **Basic Functionality**
3. **Interactive Approvals** (Section 16 - our focus)
4. **Instruction Injection**
5. **MCP Server**
6. **Remote UI**

### Section 16: Interactive Approval Parsing

**Test Cases**:

- Numbered options: `1. Option 2. Option 3. Option`
- Lettered options: `A. Option B. Option C. Option`
- Bullet points: `- Option - Option - Option`
- Emoji numbers: `1️⃣ Option 2️⃣ Option 3️⃣ Option`

**Expected Behavior**:

- Parse options from question text
- Display clickable buttons
- Send selected value back to AI
- Fall back to text input if parsing fails

## Security Considerations

### Input Validation

- MAX_QUESTION_LENGTH: 500,000 characters
- MAX_CHOICES: 9 (prevents UI overload)
- HTML escaping in webview rendering
- Regex DoS prevention with length limits

### Content Sanitization

- HTML escaping for user input
- File path validation for attachments
- Safe regex patterns to prevent ReDoS

## Performance Considerations

### Parsing Optimization

- Early exit for large option lists (>10 items)
- Efficient regex patterns
- Minimal DOM manipulation

### Memory Management

- Attachment cleanup on session end
- Webview state persistence limits
- Timeout handling for stuck processes

## Future Improvements

### Parsing Enhancements

1. **Better multi-line detection**: Handle cases where first option shares question line
2. **More format support**: Support additional numbering schemes
3. **Context-aware parsing**: Use AI context to improve parsing accuracy

### UI Improvements

1. **Choice button styling**: Better visual hierarchy
2. **Keyboard navigation**: Full keyboard accessibility
3. **Mobile optimization**: Better touch targets for remote UI

### Instruction Management

1. **Dynamic instruction updates**: Real-time instruction modification
2. **Workspace-specific instructions**: Per-project customization
3. **Instruction validation**: Ensure instructions are well-formed

## Conclusion

The FlowCommand extension implements a sophisticated AI interaction system with multiple layers of instruction management and robust parsing capabilities. The identified parsing issue has been addressed, and the codebase demonstrates good separation of concerns with proper security and performance considerations.

The extension successfully bridges the gap between AI assistants and human users through its interactive approval system, providing a seamless experience across different IDE environments.
