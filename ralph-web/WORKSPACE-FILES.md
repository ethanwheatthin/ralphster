# Agent Workspace Files Reference

When you create a new Copilot Ralph agent through the web interface, the following files are automatically generated in the agent's workspace:

## Generated Files

### 1. `PROMPT.md`
**Purpose**: Your original task description  
**Format**: Markdown  
**Editable**: Yes (via UI or directly)

```markdown
# Copilot Agent: My Todo App

## Task Description

Build a simple todo application with the following features:
- Add/remove todos
- Mark as complete
- Local storage persistence
```

---

### 2. `plans/prd.json`
**Purpose**: Structured Product Requirements Document  
**Format**: JSON  
**Editable**: Yes (updated by Ralph during iterations)

```json
{
  "meta": {
    "version": "1.0.0",
    "project": "My Todo App",
    "status": "in-progress",
    "agentId": "abc-123-def"
  },
  "features": [
    {
      "id": "F001",
      "name": "Project Setup",
      "priority": "high",
      "status": "completed",
      "requirements": [
        "Create index.html",
        "Set up CSS framework"
      ]
    },
    {
      "id": "F002",
      "name": "Todo CRUD",
      "priority": "high",
      "status": "in-progress",
      "requirements": [
        "Implement add todo",
        "Implement delete todo",
        "Implement mark complete"
      ]
    }
  ],
  "progress": {
    "completedFeatures": ["F001"],
    "inProgressFeatures": ["F002"],
    "blockers": []
  }
}
```

---

### 3. `progress.txt`
**Purpose**: Human-readable iteration log  
**Format**: Plain text  
**Editable**: Yes (appended by Ralph)

```
# Project Progress Log

## 2026-02-04T10:00:00.000Z - Agent Created
- Agent: My Todo App
- ID: abc-123-def
- Model: gpt-4o
- Workspace: C:\agents\abc-123-def

## Instructions for Ralph
1. Read PROMPT.md to understand the task
2. Review plans/prd.json for structured requirements
3. Work on the highest-priority feature
4. Update prd.json with your progress
5. Append your notes to this file after each iteration
6. Output <promise>COMPLETE</promise> when done

---

## 2026-02-04T10:05:23.000Z - Iteration 1
Completed F001 (Project Setup):
- Created index.html with semantic structure
- Added minimal CSS for styling
- Set up basic JavaScript file

Next: Work on F002 (Todo CRUD functionality)

---

## 2026-02-04T10:08:45.000Z - Iteration 2
Working on F002 (Todo CRUD):
- Implemented add todo function
- Added event listeners for form submission
- Created todo item template

Blocker: Need to decide on storage format
Next: Implement delete and complete functions

---
```

---

### 4. `.loop-prompt.md` (Hidden)
**Purpose**: Internal instructions for Ralph's loop  
**Format**: Markdown  
**Editable**: No (auto-generated)

```markdown
Work in the current repo. Use these files as your source of truth:
- plans/prd.json
- progress.txt
- PROMPT.md

1. Find the highest-priority feature in prd.json to work on.
2. Implement the feature incrementally and carefully.
3. Update the PRD (plans/prd.json) with the work done.
4. Append your progress to progress.txt.
5. Make a git commit of that feature (if git available).

ONLY WORK ON A SINGLE FEATURE PER ITERATION.
If the PRD is complete, output <promise>COMPLETE</promise>.
```

---

## File Relationships

```
Agent Workspace/
│
├── PROMPT.md ←────────────┐
│                          │
├── plans/                 │  Ralph reads all three
│   └── prd.json ←─────────┤  as source of truth
│                          │
├── progress.txt ←─────────┘
│
├── .loop-prompt.md (hidden)
│
└── [Your Implementation Files]
    ├── index.html
    ├── styles.css
    ├── app.js
    └── ...
```

## Workflow

1. **Before Each Iteration**
   - Ralph reads `@plans/prd.json @progress.txt @PROMPT.md`
   - Identifies highest-priority incomplete feature

2. **During Iteration**
   - Implements ONE feature
   - Creates/modifies implementation files

3. **After Iteration**
   - Updates `plans/prd.json` feature status
   - Appends notes to `progress.txt`
   - Commits to git (if available)

4. **Completion**
   - When all features done, outputs `<promise>COMPLETE</promise>`
   - Loop exits, agent marked complete ✅

## Accessing Files

### Via UI
- Click **"Folder"** button on agent card
- Opens workspace directory in Windows Explorer

### Via Code
- All files are in: `ralph-web/backend/copilot-agents/<agent-id>/`

### Via CLI
```powershell
# Navigate to agent workspace
cd ralph-web\backend\copilot-agents\<agent-id>

# View PRD
cat plans\prd.json

# View progress
cat progress.txt

# Edit prompt
notepad PROMPT.md
```

---

**Note**: All these files are automatically created when you click "Create Agent" in the web UI. You only need to provide the task description!
