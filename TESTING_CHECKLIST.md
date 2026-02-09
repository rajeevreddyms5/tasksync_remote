# TaskSync Remote - Manual Testing Checklist

This checklist covers all features of the TaskSync Remote extension. Follow each step carefully and verify the expected results.

---

## Prerequisites

Before testing:
1. ✅ Install the extension (VSIX or from Marketplace)
2. ✅ Open a workspace folder in VS Code (any project folder)
3. ✅ Have GitHub Copilot Chat installed and enabled

---

## Part 1: Basic Extension Setup

### 1.1 Extension Activation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open VS Code with a workspace folder | VS Code opens normally |
| 2 | Look at the Activity Bar (left sidebar icons) | You see a "TaskSync" icon (TS logo) |
| 3 | Click the TaskSync icon | TaskSync panel opens showing empty state or previous queue |

### 1.2 Title Bar Buttons
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look at the TaskSync panel title bar | You see 5 icons: 📡 (Remote), 📜 (History), 🏷️ (Prompts), 🗑️ (Clear), ⚙️ (Settings) |
| 2 | Hover over each icon | Tooltip displays the function name |

---

## Part 2: Queue Mode (Default)

### 2.1 Toggle Queue Mode
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look at the bottom of TaskSync panel | You see "Queue Mode" toggle, should be ON by default |
| 2 | Click the toggle | Queue Mode turns OFF, UI changes to "Normal Mode" |
| 3 | Click the toggle again | Queue Mode turns back ON |

### 2.2 Add Prompts to Queue
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure Queue Mode is ON | Toggle shows "Queue Mode" is enabled |
| 2 | Click in the text input field at bottom | Cursor appears in input field |
| 3 | Type: "Hello, this is test prompt 1" | Text appears in input field |
| 4 | Press Enter | • Prompt appears in queue list above<br>• Input field clears<br>• Queue shows "1 item" |
| 5 | Add 2 more prompts: "Test prompt 2" and "Test prompt 3" | Queue shows 3 items |

### 2.3 Queue Management
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hover over a queue item | Edit (✏️) and Delete (🗑️) buttons appear |
| 2 | Click Delete on "Test prompt 2" | Prompt is removed, queue now shows 2 items |
| 3 | Click Edit on "Test prompt 1" | Edit dialog appears with current text |
| 4 | Change text to "Edited prompt 1" and save | Queue item updates with new text |
| 5 | Drag first item below the last item | Items reorder (drag and drop) |

### 2.4 Clear Queue (NOT PRESENT - ALSO NOT NEEDED)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the 🗑️ (Clear) button in title bar | Confirmation dialog appears |
| 2 | Confirm clear | All queue items are removed |

---

## Part 3: Normal Mode (Direct Response)

### 3.1 Normal Mode Interaction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Turn OFF Queue Mode using the toggle | UI shows "Normal Mode" |
| 2 | Type: "Test response" in input field | Text appears in input field |
| 3 | Press Enter (without any pending request) | Nothing happens (normal mode requires a pending AI request) |

---

## Part 4: AI Tool Integration (ask_user)

### 4.1 Test with GitHub Copilot
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open GitHub Copilot Chat (Ctrl+Shift+I or via sidebar) | Copilot Chat panel opens |
| 2 | Add prompts to TaskSync queue: "Yes, proceed" | Queue shows 1 item |
| 3 | In Copilot, type: "Ask me if I want to proceed with a test task" | Copilot calls ask_user tool |
| 4 | Observe TaskSync panel | • Queue item is auto-consumed<br>• Response sent to Copilot<br>• History entry created |

### 4.2 Test Sound/Notification (Normal Mode)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Turn OFF Queue Mode | Normal Mode enabled |
| 2 | Go to Settings (⚙️) | Settings modal opens |
| 3 | Enable: Sound, Desktop Notification, Auto-Focus | Checkboxes are checked |
| 4 | Close Settings | Settings saved |
| 5 | In Copilot, type: "Ask me a question using ask_user" | • Sound plays (ding)<br>• Desktop notification appears<br>• TaskSync panel auto-focuses |

### 4.3 Yes/No Quick Buttons
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure "Interactive Approval" is enabled in Settings | Setting is checked |
| 2 | In Copilot: "Ask me a yes or no question" | TaskSync shows the question with Yes/No buttons |
| 3 | Click "Yes" button | Response "Yes" is sent to Copilot |

---

## Part 5: Plan Review Tool

### 5.1 Test Plan Review Panel
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot: "Create a plan to refactor a function and present it for review" | • Plan Review panel opens as a new editor tab<br>• Panel shows plan on left (70%), comments on right (30%)<br>• Title shows "Review: [plan title]" |
| 2 | Read the plan content | Markdown is rendered properly (headers, lists, code blocks) |
| 3 | Hover over a plan section | Comment icon (💬) appears on the left |
| 4 | Click the comment icon | Comment dialog opens |
| 5 | Add a comment: "Please clarify this step" | Comment appears in the right sidebar |
| 6 | Click "Request Changes" button | • Panel closes<br>• Copilot receives your comments<br>• Should present updated plan |
| 7 | Click "Approve" on the updated plan | Plan is approved, Copilot proceeds |

### 5.2 Plan Review Buttons
| Step | Action | Expected Result |
|------|--------|-----------------|
| Test | Click "Approve" without comments | Plan approved, Copilot proceeds |
| Test | Click "Request Changes" with comments | Comments sent, Copilot revises plan |
| Test | Close panel (X button) | Plan cancelled, Copilot informed |

---

## Part 6: File & Folder References

### 6.1 File Attachment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In TaskSync input, type `#` | File search dropdown appears |
| 2 | Type part of a filename (e.g., "pack") | Files matching "pack" shown (like package.json) |
| 3 | Click on a file to select | File appears as a tag/chip in the input |
| 4 | Press Enter to send | File reference is included in your response |

### 6.2 Folder Attachment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type `#src` in input | Shows "src" folder and files containing "src" |
| 2 | Select the src folder | Folder tag appears in input |

---

## Part 7: Image Support

### 7.1 Paste Image
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Take a screenshot (Win+Shift+S) | Screenshot in clipboard |
| 2 | Click in TaskSync input field | Input focused |
| 3 | Press Ctrl+V | • Image thumbnail appears<br>• "Attached: screenshot_xxx.png" shown |
| 4 | Send the response | Image included with response |

### 7.2 Drag and Drop Image
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open File Explorer with an image file | Image file visible |
| 2 | Drag image into TaskSync input area | Drop zone highlights |
| 3 | Release mouse | Image attached, thumbnail shown |

---

## Part 8: History

### 8.1 View Current Session
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After some tool calls, scroll up in TaskSync panel | You see "Current Session" history entries |
| 2 | Each entry shows prompt and response | Entries are expandable |

### 8.2 View Full History
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 📜 (History) button in title bar | History modal opens |
| 2 | Scroll through entries | Shows all previous tool calls |
| 3 | Click "Clear History" | All history entries removed |

---

## Part 9: Remote Server (Mobile/Web Access)

### 9.1 Start Remote Server
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 📡 (broadcast) icon in TaskSync title bar | • Server starts<br>• Status bar shows "Remote: Active"<br>• QR code dialog appears |
| 2 | Note the URL shown (e.g., http://192.168.1.x:3000) | URL is your local network address |

### 9.2 Connect from Phone/Browser
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On phone/tablet, scan QR code OR type the URL | PIN entry page appears |
| 2 | Enter the 4-digit PIN shown in VS Code | Remote UI loads |
| 3 | Verify: Queue, History, and input are visible | Full TaskSync UI displayed |

### 9.3 Remote Features
| Step | Action | Expected Result |
|------|--------|-----------------|
| Test | Add prompt from phone | Appears in VS Code queue |
| Test | Submit response from phone | VS Code receives it |
| Test | View terminal output tab | Shows VS Code terminal history |
| Test | Browse files tab | Shows workspace files |
| Test | Toggle dark/light theme in VS Code | Remote UI theme changes |

### 9.4 Stop Remote Server
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 📡 icon again | Server stops |
| 2 | Status bar no longer shows "Remote: Active" | Server is offline |
| 3 | Phone shows "Disconnected" | Connection lost |

---

## Part 10: Settings

### 10.1 Open Settings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click ⚙️ (Settings) in title bar | Settings modal opens |

### 10.2 Test Each Setting
| Setting | Test | Expected Result |
|---------|------|-----------------|
| **Notification Sound** | Toggle ON, trigger ask_user | Sound plays |
| **Desktop Notification** | Toggle ON, trigger ask_user | VS Code notification popup |
| **Auto-Focus Panel** | Toggle ON, trigger ask_user | TaskSync panel auto-opens |
| **Mobile Notification** | Toggle ON, trigger from remote | Browser notification on phone |
| **Interactive Approval** | Toggle OFF | Yes/No buttons don't appear |

### 10.3 Instruction Injection Settings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set "Instruction Injection" to "copilotInstructionsMd" | Prompts to modify .github/copilot-instructions.md |
| 2 | Approve modification | Instructions injected into file |
| 3 | Check .github/copilot-instructions.md | TaskSync rules are present |

---

## Part 11: Reusable Prompts (/slash commands)

### 11.1 Create Prompts
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click 🏷️ (Prompts) in title bar | Prompts modal opens |
| 2 | Click "Add New Prompt" | Form appears |
| 3 | Name: "test", Prompt: "Run all tests" | Fields filled |
| 4 | Click Save | Prompt saved, appears in list |

### 11.2 Use Slash Command
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In TaskSync input, type `/` | Dropdown shows available prompts |
| 2 | Type `/test` and select | Full prompt text inserted in input |
| 3 | Press Enter | Prompt added to queue or sent |

---

## Part 12: Theme Support

### 12.1 VS Code Theme Change
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change VS Code theme (Ctrl+K Ctrl+T) | Theme picker opens |
| 2 | Select a light theme | VS Code switches to light theme |
| 3 | Check TaskSync panel | Panel adapts to light theme |
| 4 | Check Plan Review panel (if open) | Panel uses light theme |
| 5 | Check Remote UI (if connected) | Remote UI switches to light theme |

### 12.2 Landing Page Theme
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On phone, set system to Dark Mode | System dark mode enabled |
| 2 | Open TaskSync Remote landing page | Page uses dark theme |
| 3 | Switch system to Light Mode | Page uses light theme |

---

## Part 13: MCP Server (For External IDEs)

### 13.1 MCP Server Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run command: "TaskSync: Show MCP Configuration" | Shows MCP server URL and status |
| 2 | Note the URL (default: http://localhost:3579/sse) | URL displayed |

### 13.2 Test with External Client (Optional)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure Kiro/Cursor with MCP URL | MCP client connects |
| 2 | Use ask_user from external IDE | TaskSync receives request |

---

## Part 14: Error Handling

### 14.1 Network Issues
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disconnect from network while remote connected | Remote shows "Disconnected" message |
| 2 | Reconnect network | Remote auto-reconnects |

### 14.2 Invalid File Reference
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type `#nonexistentfile.xyz` | No results shown or graceful "no matches" |

---

## Part 15: Queue Pause/Play Feature

### 15.1 Pause Button Visibility
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look at the queue header | You see a pause button (⏸️) next to queue count |
| 2 | Hover over the button | Tooltip shows "Pause queue processing" |

### 15.2 Pause Queue Processing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add 3 prompts to queue: "Response 1", "Response 2", "Response 3" | Queue shows 3 items |
| 2 | Click the pause button | • Button icon changes to play (▶️)<br>• Header shows "(Paused)" label<br>• Header gets yellow border<br>• Queue list is dimmed |
| 3 | In Copilot, type: "Ask me any question" | • Copilot calls ask_user<br>• TaskSync shows question but does NOT auto-respond from queue<br>• Queue still has 3 items |
| 4 | Manually type response: "Manual response" | Response sent to Copilot |

**AI Test Prompt for Copilot:**
```
Ask me a simple question using the ask_user tool. Do not proceed until I respond.
```

### 15.3 Resume Queue Processing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the play button | • Button icon changes to pause (⏸️)<br>• "(Paused)" label disappears<br>• Queue list no longer dimmed |
| 2 | In Copilot, type: "Ask me another question" | • Copilot calls ask_user<br>• TaskSync auto-responds with "Response 1"<br>• Queue now has 2 items |

### 15.4 Remote Client Sync
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Connect from phone/browser | Remote UI shows queue |
| 2 | Pause queue from VS Code | Remote UI shows paused state |
| 3 | Resume queue from Remote UI | VS Code shows resumed state |

---

## Part 16: Interactive Approval Parsing

### 16.1 Numbered Options (1. 2. 3.)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot, trigger this question: | Choice buttons 1, 2, 3 appear |

**AI Test Prompt:**
```
Present me with these exact options:

Which framework do you prefer?
1. React
2. Vue
3. Angular

Wait for my selection.
```

### 16.2 Lettered Options (A. B. C.)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot, trigger this question: | Choice buttons A, B, C appear |

**AI Test Prompt:**
```
Ask me to choose with lettered options:

What's your preferred testing approach?
A. Unit tests only
B. Integration tests only
C. Both unit and integration tests

Wait for my answer.
```

### 16.3 Bullet Point Options (NEW)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot, trigger this question: | Choice buttons 1, 2, 3 appear |

**AI Test Prompt:**
```
Present options using bullet points:

Which database do you want to use?
- PostgreSQL
- MongoDB
- SQLite

Wait for my response.
```

### 16.4 Emoji Numbered Options (NEW)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot, trigger this question: | Choice buttons 1, 2, 3 appear |

**AI Test Prompt:**
```
Present these options with emoji numbers:

Select a color scheme:
1️⃣ Dark mode
2️⃣ Light mode
3️⃣ System default

Wait for my choice.
```

### 16.5 Approval/Yes-No Questions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot, trigger this question: | Yes/No buttons appear |

**AI Test Prompt:**
```
Ask me a simple yes/no confirmation question: "Should I proceed with the refactoring?"
```

### 16.6 Long Lists Don't Show Buttons
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Copilot, trigger this question: | No choice buttons (too many options), just text input |

**AI Test Prompt:**
```
Present me with many options:

Which programming language?
1. JavaScript
2. TypeScript
3. Python
4. Go
5. Rust
6. Java
7. C#
8. Ruby
9. PHP
10. Swift

Wait for my choice.
```

---

## Part 17: Remote Plan Review

### 17.1 Remote Plan Review Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Connect to remote server | Remote UI loads |
| 2 | In Copilot: "Create a plan and present it for review" | • VS Code: Plan Review panel opens<br>• Remote: Plan Review modal appears |
| 3 | Check remote modal content | • Plan text is visible and markdown formatted<br>• Buttons work (Approve, Request Changes, Close) |

**AI Test Prompt:**
```
Create a simple 3-step plan for setting up a new project and call the plan_review tool to present it for my approval.
```

### 17.2 Plan Review Dismiss Sync
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open plan review from Copilot | Both VS Code panel and remote modal open |
| 2 | Close the plan from VS Code (X button) | Remote modal automatically closes |
| 3 | Trigger another plan review | Both open again |
| 4 | Close from remote (Close button) | VS Code panel automatically closes |

### 17.3 Notification on Plan Review (Remote)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable browser notifications on remote | Permission granted |
| 2 | Switch to another browser tab | TaskSync tab is not visible |
| 3 | Trigger a plan review | • Browser notification appears<br>• Sound plays (beep) |

---

## Part 18: Notification Improvements

### 18.1 Sound Notification (Web Audio Fallback)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable sound in settings | Sound toggle ON |
| 2 | Interact with TaskSync (click somewhere) | Audio context unlocked |
| 3 | In Copilot: "Ask me any question" | Beep sound plays (880Hz tone) |
| 4 | Verify on remote client | Same beep sound plays |

### 18.2 Browser Push Notifications (Remote)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open remote UI in browser | Browser asks for notification permission |
| 2 | Click "Allow" | Permission granted |
| 3 | Switch to different browser tab | TaskSync tab is hidden |
| 4 | In Copilot: "Ask me a question" | • Browser notification appears<br>• Shows question text<br>• Click notification → focuses TaskSync tab |

### 18.3 Notification Sound Toggle
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Settings, turn OFF notification sound | Toggle disabled |
| 2 | Trigger ask_user | No sound plays |
| 3 | Turn sound back ON | Toggle enabled |
| 4 | Trigger ask_user | Sound plays |

---

## Test Completion Checklist

After completing all tests, verify:

- [ ] All basic features work (queue, normal mode, file references)
- [ ] ask_user tool works with Copilot
- [ ] plan_review tool shows proper layout (70/30 split)
- [ ] Remote access works from phone/browser
- [ ] Theme support works (light/dark in VS Code and remote)
- [ ] All settings toggles work
- [ ] Reusable prompts work
- [ ] Error states handled gracefully
- [ ] **Queue pause/play works** (pauses auto-respond, resumes correctly)
- [ ] **Interactive approval buttons detect** bullet points, emoji numbers
- [ ] **Plan review dismiss syncs** between IDE and remote
- [ ] **Notifications work** (sound beep, browser push on remote)
- [ ] **Enter key saves comments** in plan review

---

## Part 11: Plan Review Testing

### 11.1 Modal Bug Fix Verification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger a plan review (use Copilot to create a plan) | Dedicated VS Code panel opens for review |
| 2 | Check TaskSync sidebar | NO fullscreen modal appears in sidebar |
| 3 | Cancel the dedicated panel | Plan review is cancelled, AI stops execution |
| 4 | Check remote client (if available) | Plan review modal appears on remote device |

### 11.2 Cancellation Behavior
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start a plan review | Panel opens |
| 2 | Click "Cancel" in the panel | Panel closes, status shows as "cancelled" |
| 3 | Verify AI behavior | AI calls `ask_user` and stops execution |

### 11.3 Comment Saving with Enter Key
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open plan review panel | Panel displays with comment input |
| 2 | Type a comment in the textarea | Text appears |
| 3 | Press Enter | Comment is added to the list, input clears |
| 4 | Type another comment | Text appears |
| 5 | Press Shift+Enter | New line added in textarea |
| 6 | Click "Add Comment" button | Comment is added (existing functionality) |

---

## Bug Report Template

If you find a bug, record:

```
**Bug Title:** [Short description]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]

**Actual Result:** [What actually happened]

**VS Code Version:** [e.g., 1.95.0]
**Extension Version:** [e.g., 1.0.4]
**OS:** [e.g., Windows 11]

**Screenshots:** [If applicable]
```

---

**Testing Complete!** 🎉

Report any issues at: https://github.com/rajeevreddyms5/tasksync_remote/issues
