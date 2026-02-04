# Ralph Loop Architecture

## Overview

The Ralph Web interface now uses an **iteration loop architecture** inspired by agentic coding patterns. When a user creates a Copilot agent, the system automatically generates a structured workspace with PRD (Product Requirements Document) and progress tracking to enable autonomous, multi-iteration workflows.

## Architecture Flow

```
User Creates Agent
      ↓
   Generate:
   - PROMPT.md (user's task description)
   - plans/prd.json (structured requirements)
   - progress.txt (iteration log)
   - .loop-prompt.md (internal loop instructions)
      ↓
   Start Ralph Loop
      ↓
   ┌─────────────────────────┐
   │   Iteration N           │
   │  1. Read source files   │
   │  2. Pick priority item  │
   │  3. Implement feature   │
   │  4. Update PRD/progress │
   │  5. Git commit          │
   └─────────────────────────┘
      ↓
   Check for COMPLETE marker
      ↓
   Continue or Exit
```

## Generated Workspace Structure

When an agent is created, the following files are auto-generated:

```
<agent-id>/
├── PROMPT.md                 # User's original task description
├── progress.txt              # Human-readable iteration log
├── .loop-prompt.md          # Internal loop instructions (hidden)
└── plans/
    └── prd.json             # Structured product requirements
```

### 1. **PROMPT.md**
- Contains the user's original task description
- Free-form, human-friendly format
- Primary source of requirements

### 2. **plans/prd.json**
- Auto-generated from PROMPT.md
- Structured JSON format with:
  - `meta`: Project metadata (version, status, dates)
  - `objectives`: Primary goals and key principles
  - `features`: Array of feature objects with:
    - `id`: Unique identifier (F001, F002, etc.)
    - `priority`: high/medium/low
    - `status`: not-started/in-progress/completed
    - `requirements`: List of requirements
    - `acceptanceCriteria`: Success criteria
  - `progress`: Tracking object for completed features, blockers, notes

### 3. **progress.txt**
- Plain text log file
- Appended by Ralph after each iteration
- Contains:
  - Timestamp
  - What was done
  - Blockers encountered
  - Next steps
- Human-readable history trail

### 4. **.loop-prompt.md** (Internal)
- Auto-generated instructions for Ralph
- Tells Ralph to:
  1. Read source files (`@plans/prd.json @progress.txt @PROMPT.md`)
  2. Pick highest-priority feature
  3. Work on ONE feature per iteration
  4. Update PRD and progress
  5. Output `<promise>COMPLETE</promise>` when done

## Loop Invocation

The backend (`copilot-agent-manager.js`) invokes ralph-copilot.ps1 with:

```powershell
.\ralph-copilot.ps1 `
  -Command run `
  -Model "gpt-4o" `
  -WorkingDirectory "path/to/agent/workspace" `
  -SourceFiles "plans/prd.json,progress.txt" `
  -PromptFile ".loop-prompt.md" `
  -Iterations 20 `
  -CompletionMarker "<promise>COMPLETE</promise>" `
  -NotifyOnComplete
```

### Key Parameters

- **`-SourceFiles`**: Comma-separated list of files to reference with `@filename` notation
- **`-Iterations`**: Max number of loop iterations (default: 20)
- **`-CompletionMarker`**: String that triggers early exit when detected in output
- **`-NotifyOnComplete`**: Shows Windows notification when complete

## Completion Detection

Ralph can signal completion by outputting:

```
<promise>COMPLETE</promise>
```

When this marker is detected:
1. Loop exits immediately
2. Agent status set to 'stopped'
3. `completed: true` flag set on agent
4. Total iterations recorded
5. Windows notification shown (if enabled)
6. Frontend displays 🎉 completion badge

## Frontend Updates

### Agent Card Display

- Shows "Loop-based (PRD + Progress)" strategy
- Iteration counter with checkmark when complete
- Completion badge: **🎉 COMPLETE (N iterations)**

### Create Agent Modal

- Help text explains auto-generation of PRD
- User only provides task description
- System handles structuring

## Benefits of This Architecture

1. **Structured Requirements**: PRD.json provides clear, machine-readable goals
2. **Progress Tracking**: Each iteration leaves a breadcrumb trail
3. **Autonomous Operation**: Ralph decides priority and pacing
4. **Early Exit**: Completion detection prevents wasted iterations
5. **Iterative Refinement**: Each loop reads previous progress
6. **Git Integration**: Automatic commits per feature (if git available)
7. **Failure Resilience**: Continues on errors, doesn't kill loop

## Example PRD Structure

```json
{
  "meta": {
    "version": "1.0.0",
    "project": "My Agent Task",
    "status": "in-progress",
    "agentId": "abc-123"
  },
  "features": [
    {
      "id": "F001",
      "name": "Initial Implementation",
      "priority": "high",
      "status": "completed",
      "requirements": [
        "Create project structure",
        "Implement core logic"
      ]
    },
    {
      "id": "F002",
      "name": "Error Handling",
      "priority": "medium",
      "status": "in-progress",
      "requirements": [
        "Add try-catch blocks",
        "Validate inputs"
      ]
    }
  ],
  "progress": {
    "completedFeatures": ["F001"],
    "inProgressFeatures": ["F002"],
    "blockers": [],
    "notes": []
  }
}
```

## Comparison: Old vs New

| Aspect | Old Approach | New Loop Approach |
|--------|-------------|-------------------|
| Input | Single PROMPT.md | PROMPT.md + auto-gen PRD + progress.txt |
| Iterations | Manual re-runs | Automatic loop (up to N times) |
| Structure | Free-form | Structured JSON PRD |
| Progress | None | progress.txt log |
| Completion | Manual check | Auto-detect with `<promise>COMPLETE</promise>` |
| Source Files | None | `@plans/prd.json @progress.txt` |
| Strategy | One-shot | Iterative refinement |

## Usage Example

1. **User creates agent** via web UI with task: "Build a todo app"
2. **System generates**:
   - `PROMPT.md` with task description
   - `plans/prd.json` with features F001-F005
   - `progress.txt` with initial log entry
3. **Loop starts** (max 20 iterations)
4. **Iteration 1**: Ralph reads PRD, picks F001 (setup), implements
5. **Iteration 2**: Picks F002 (UI components), implements
6. **Iteration 3-10**: Continues through features
7. **Iteration 11**: All features done, outputs `<promise>COMPLETE</promise>`
8. **Loop exits early**, agent marked complete ✅

## Configuration

Customize in `copilot-agent-manager.js`:

```javascript
// Default max iterations if user doesn't specify
const DEFAULT_MAX_ITERATIONS = 20;

// Completion marker
const COMPLETION_MARKER = '<promise>COMPLETE</promise>';

// Source files to reference
const SOURCE_FILES = 'plans/prd.json,progress.txt';
```

## Future Enhancements

- [ ] Custom PRD templates
- [ ] Multi-PRD support (epics)
- [ ] Progress visualization
- [ ] Iteration replay/debugging
- [ ] PRD diffing between iterations
- [ ] Custom completion markers per agent
- [ ] Parallel agent execution
- [ ] Agent collaboration (shared PRD)

---

**Status**: ✅ Implemented (v1.0)  
**Last Updated**: 2026-02-04
