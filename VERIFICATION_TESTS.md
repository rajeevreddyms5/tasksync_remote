# Verification Tests for FIXME Fixes

These tests verify the specific fixes made for the FIXME items in TESTING_CHECKLIST.md.
Run these after building the extension (`npm run compile`).

---

## VT-1: Queue Pause — No Auto-Consume (Fix for T2.6)

**Root Cause Fixed:** `_handleAddQueuePrompt` was missing `!this._queuePaused` check in the `shouldAutoRespond` condition.

### Steps:
1. Enable queue mode in FlowCommand panel
2. Add 2-3 items to the queue
3. **Pause** the queue (click ⏸️)
4. Trigger an `ask_user` call:
   ```
   Ask me a simple question using ask_user. Do not proceed until I respond.
   ```
5. While the question is pending, add another queue item via the queue input

### Expected:
- The pending question should appear in the panel
- Queue items should NOT be auto-consumed (they stay in the queue)
- The new queue item added in step 5 should also NOT be auto-consumed
- Manual response should work normally

### Edge Cases:
- Rapidly toggle pause/resume while a question is pending → no double-consume
- Resume queue → first queue item should auto-consume for the pending request

---

## VT-2: Plan Review Cancel Button (Fix for T5.1)

**Root Cause Fixed:** Footer in `planReviewPanel.ts` only had "Approve" and "Request Changes" buttons.

### Steps:
1. Trigger plan_review:
   ```
   Create a detailed plan for building a REST API. Use plan_review to present it for my approval.
   ```
2. Observe the plan review panel footer

### Expected:
- Three buttons visible: **Cancel** (left, subtle style), **Request Changes** (middle), **Approve** (right, primary)
- Click "Cancel" → panel closes, AI receives `cancelled` status and stops
- Cancel button has subtle/muted styling (transparent background, border)
- Cancel button hover shows reddish highlight

### Edge Cases:
- Cancel with unsaved comments → comments are discarded (not sent)
- Read-only mode → Cancel button is hidden (along with other action buttons)

---

## VT-3: Waiting Indicator During Plan Review (Fix for T5.3)

**Root Cause Fixed:** Plan review didn't send `toolCallPending` state to sidebar webview, so the pulsing indicator never showed.

### Steps:
1. Trigger plan_review (same prompt as VT-2)
2. Look at the FlowCommand sidebar input area

### Expected:
- The orange pulsing "AI is waiting for your input" indicator appears in the sidebar
- The indicator persists while plan review is open
- Approving/cancelling plan review → indicator disappears

### Edge Cases:
- If both `ask_user` AND `plan_review` are somehow pending, indicator persists until both resolve
- If `ask_user` completes while plan review is still open, indicator stays (plan review keeps it alive)
- `toolCallCancelled` with `__stale__` does NOT remove indicator while plan review is pending

---

## VT-4: Remote Plan Review Reconnect (Fix for T5.3 — Remote)

**Root Cause Verified:** Existing state restore code is correct. `_activePlanReview` persists and `getRemoteState()` returns it for remote reconnection.

### Steps:
1. Start remote server and connect from a phone/browser
2. Trigger plan_review in the IDE
3. Verify plan review appears on both IDE and remote
4. Disconnect the remote session (close tab or toggle airplane mode)
5. Reconnect the remote session (reopen the URL or click refresh)

### Expected:
- Plan review modal should restore on the remote client after reconnect
- Approve/Reject/Cancel actions should still work after restore
- Approving on one side (IDE or remote) should close on both

### Edge Cases:
- Plan review completes in IDE while remote is disconnected → on reconnect, no stale modal appears
- Multiple rapid reconnects → no duplicate modals

---

## VT-5: History Info Icon (Fix for T8.2)

**Root Cause Fixed:** Long info text "History is stored in VS Code globalStorage/tool-history.json" was always visible, causing button overflow on small screens.

### Steps:
1. Open FlowCommand panel
2. Click the History icon (📜 or clock icon)
3. Observe the history modal header

### Expected:
- An info icon (ℹ) appears in the header instead of the full text
- Hovering over the icon shows the tooltip: "History is stored in VS Code globalStorage/tool-history.json"
- Clear All (🗑) and Close (✕) buttons are fully visible, not overflowing
- Works on small panel widths

### Edge Cases:
- Very narrow panel → buttons still accessible, icon doesn't overlap title

---

## VT-6: Template UX Rename (Fix for T12.3)

**Root Cause Fixed:** Template terminology was confusing. "Set as Template" / "Unset Template" renamed to "Pin" / "Unpin" with clear explanation.

### Steps:
1. Open Reusable Prompts modal (📝 icon or gear → Reusable Prompts)
2. Observe the help text at the top
3. Hover over the pin icon (📌) on a prompt card
4. Click the pin icon to pin a prompt
5. Observe the indicator near the input area
6. Send a message

### Expected:
- Help text includes: "📌 Pinned prompts are automatically appended to every message you send."
- Pin button tooltip: "Pin — auto-append to all messages"
- After pinning: indicator shows "Pinned: /commandname" near input
- Sending a message appends the pinned prompt content with `[Auto-appended instructions]` prefix
- Unpinning shows tooltip: "Unpin — stop auto-appending"

### Edge Cases:
- Pin one prompt, then pin another → first is unpinned, second becomes active
- Clear pin via the small ✕ button on the indicator → template cleared
