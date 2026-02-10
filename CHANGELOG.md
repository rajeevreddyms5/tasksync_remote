# Changelog

All notable changes to FlowCommand will be documented in this file.

## [2.0.4] - 2026-02-10

### Fixed
- **Badge not showing & state lost on re-navigation** — fixed race condition where `_updateBadge()` was called before `_pendingRequests.set()` in both `waitForUserResponse` and `waitForMultiQuestionResponse`. The defensive cleanup in `_updateBadge` cleared `_currentToolCallId` because the pending request wasn't registered yet, causing:
  - Sidebar badge always showing 0 (badge never appeared)
  - AI message and input prompt not restoring when re-navigating to FlowCommand panel
  - Remote sessions not showing pending requests on connect/refresh
- **Remote state losing explicit choices** — `getRemoteState()` now uses stored `_currentExplicitChoices` instead of re-parsing choices from prompt text, preserving original AI-provided choice buttons for remote clients

---

## [2.0.3] - 2025-07-11

### Added
- **View badge indicator** — numbered badge on FlowCommand sidebar icon when AI is waiting for input
  - Counts active `ask_user`, queued concurrent requests, and pending plan reviews
  - Works with both local and remote server paths
  - Restores on sidebar re-open, clears on dispose
- **Subagent restriction** — 3-layer defense preventing subagents from calling `ask_user`/`plan_review`
  - ⛔ SUBAGENT RULES gate in `.github/copilot-instructions.md`
  - ⛔ Stop-sign prefix in tool descriptions (package.json + MCP server)
  - Rule 4: main agent injects restriction in every `runSubagent` prompt

### Changed
- **Remote UI: Notification bell → Pending input badge** — replaced notification permission bell (which showed unhelpful PWA instructions) with a pending input count badge in the remote header
  - Dimmed bell icon when no pending inputs, highlighted bell-dot with numeric count when AI is waiting
  - Removed ~100 lines of unused notification permission code (HTTP can't access browser notifications)
  - Added `__isRemoteMode` flag for feature gating between IDE and remote contexts
- **In-content badge skipped in VS Code sidebar** — native `view.badge` is sufficient; the in-content "N pending inputs" div now only renders in remote UI

### Fixed
- **Badge not resetting after answering** — fixed two defensive edge cases where `_currentToolCallId` could remain set after the resolve callback was missing, causing the sidebar badge to stay stuck
- **Multi-question badge cleanup** — `_handleMultiQuestionResponse` early return now clears badge state when requestId matches but resolve is gone
- **Cancel cleanup** — `cancelPendingRequest` now also clears `_currentMultiQuestions` for complete state teardown
- Em-dash encoding corruption in package.json tool descriptions

---

## [2.0.0] - 2025-02-09

### 🎉 Rebrand to FlowCommand

Major rebrand and feature overhaul.

### Added
- New branding and identity as FlowCommand
- Improved testing checklist with clear pass/fail criteria

### Changed
- All configuration keys use `flowcommand.*` namespace
- All command IDs use `flowcommand.*` namespace
- View container and view IDs renamed to `flowCommandContainer` and `flowCommandView`
- Updated README with comprehensive feature documentation

---

## [1.0.4] - 2025-02-07

### Added
- Full light/dark theme support for plan_review tool and remote UI
- Theme syncs automatically with VS Code's active theme
- Landing page respects system theme preference

### Fixed
- Plan review panel now opens as dedicated VS Code editor tab (70% plan, 30% comments)
- Remote modal responsive layout for mobile devices
- Theme-color meta tag updates dynamically for mobile browsers

## [1.0.3] - 2025-02-06

### Fixed
- Mobile browser connection stability - use polling transport first for better compatibility
- File browser now shows dotfiles like `.github`, `.gsd`, `.env.example` etc.
- Added connection timeout feedback for mobile users

### Changed
- Improved socket.io connection options for cross-device compatibility

## [1.0.2] - 2025-02-06

### Fixed
- Include socket.io and express runtime dependencies in VSIX package
- Extension now loads correctly on startup

## [1.0.1] - 2025-02-06

### Fixed
- Report Issue button now links to correct repository
- Connection stability improvements in remote UI

### Changed
- Updated README with feature comparison table
- Simplified attribution

## [1.0.0] - 2025-01-27

### Initial Release

First release with the following features:

- **Smart Queue Mode** - Batch and queue prompts for AI agents
- **Normal Mode** - Direct interaction with AI agents
- **File & Folder References** - `#` mentions to attach workspace files
- **Image Support** - Paste/drag-drop images into chat
- **Tool Call History** - Track current session and full history
- **Remote Mobile/Web Access** - Control from phone, tablet, or browser
- **MCP Server Integration** - Works with Kiro, Cursor, Claude Desktop


