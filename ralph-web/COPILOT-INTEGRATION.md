# Ralph Web - Copilot CLI Integration Guide

This guide explains how to use the Ralph Web application to create and manage multiple Ralph agents for GitHub Copilot CLI.

## Features

The Ralph Web application now supports two types of agents:

1. **Ollama Agents** (Local) - Run with local Ollama models
2. **Copilot CLI Agents** (Cloud) - Run with GitHub Copilot CLI using cloud models

## Getting Started

### Prerequisites

1. **For Ollama Agents:**
   - Ollama installed and running
   - Claude Code installed
   - At least one Ollama model pulled

2. **For Copilot CLI Agents:**
   - GitHub Copilot CLI installed: `npm install -g @githubnext/github-copilot-cli`
   - Authenticated with GitHub: `github-copilot-cli auth login`
   - GitHub Copilot subscription (Pro, Pro+, Business, or Enterprise)

### Starting the Web Application

```powershell
# From the ralph-web directory
cd ralph-web

# Install dependencies (first time only)
npm install
cd frontend && npm install && cd ..

# Start the backend server
node backend/server.js

# In another terminal, start the frontend (development)
cd frontend
npm start
```

The application will open at http://localhost:3000

## Using the Web Interface

### Tab Navigation

The application has two main tabs:

- **🦙 Ollama Agents**: Manage local agents that run with Ollama
- **🤖 Copilot CLI Agents**: Manage agents for GitHub Copilot CLI

### Creating a Copilot CLI Agent

1. Click the **🤖 Copilot CLI Agents** tab
2. Click **Create Agent** button
3. Fill in the form:

   **Agent Name** (required)
   - Must contain only letters, numbers, dashes, underscores, and dots
   - Examples: `code-reviewer`, `test-writer`, `api-builder`
   - This name is used in: `copilot --agent=<name>`

   **Description** (required)
   - Brief description of what the agent does
   - Example: "Reviews code for quality and best practices"

   **AI Model** (required)
   - Select from available models:
     - `gpt-5-mini` (recommended for most tasks)
     - `gpt-4o` (more capable, slower)
     - `gpt-4o-mini` (fast, good balance)
     - `claude-3-5-sonnet` (excellent for code)
     - `claude-3-opus` (most capable)

   **Tools** (select multiple)
   - `read` - Read files from the workspace
   - `edit` - Edit and create files
   - `search` - Search across the codebase
   - `run_terminal` - Execute terminal commands
   - `web_fetch` - Fetch content from URLs
   - `delegate` - Delegate tasks to other agents

   **Target Environment** (optional)
   - Both (default) - Works in VS Code and GitHub
   - VS Code only - Only available in VS Code
   - GitHub only - Only available on GitHub.com

4. Click **Create Agent**

### Managing Copilot CLI Agents

Each agent card shows:
- **Name**: The agent's display name
- **Description**: What the agent does
- **Model**: Which AI model it uses
- **Tools**: Available capabilities
- **CLI Command**: How to invoke it from command line

#### Actions:

- **▶️ Run**: Execute the agent with Copilot CLI
- **🗑️ Delete**: Remove the agent permanently

### Using Agents from the Command Line

Once you create an agent in the web interface, you can use it from the command line:

#### Method 1: Direct Command

```bash
copilot --agent=code-reviewer
```

#### Method 2: With Specific Prompt

```bash
copilot --agent=code-reviewer --prompt "Review the authentication module"
```

#### Method 3: Interactive Mode

```bash
copilot

# Then type:
/agent
# Select your agent from the list

# Or let Copilot infer:
Use the code-reviewer agent to review my changes
```

#### Method 4: Using ralph-copilot.ps1

```powershell
# Run an agent
.\ralph-copilot.ps1 -Command run -AgentName code-reviewer

# List all agents
.\ralph-copilot.ps1 -Command list

# Create agent from command line
.\ralph-copilot.ps1 -Command create -AgentName "bug-hunter" -Description "Finds and fixes bugs"

# Delete an agent
.\ralph-copilot.ps1 -Command delete -AgentName old-agent
```

## Example Workflows

### Workflow 1: Code Review Agent

1. Create agent in web interface:
   - Name: `code-reviewer`
   - Description: "Reviews code for quality, security, and best practices"
   - Model: `claude-3-5-sonnet`
   - Tools: `read`, `search`

2. Use from command line:
   ```bash
   copilot --agent=code-reviewer --prompt "Review all TypeScript files in src/"
   ```

### Workflow 2: Test Writer Agent

1. Create agent:
   - Name: `test-writer`
   - Description: "Writes comprehensive unit and integration tests"
   - Model: `gpt-5-mini`
   - Tools: `read`, `edit`, `search`

2. Use with PROMPT.md:
   ```bash
   # First, create PROMPT.md with your requirements
   copilot --agent=test-writer --prompt "Read PROMPT.md and write tests"
   ```

### Workflow 3: API Builder Agent

1. Create agent:
   - Name: `api-builder`
   - Description: "Builds REST APIs with Express and TypeScript"
   - Model: `gpt-4o`
   - Tools: `read`, `edit`, `search`, `run_terminal`

2. Use iteratively:
   ```bash
   copilot --agent=api-builder
   # Then interact with the agent step by step
   ```

## Agent Customization

### Editing Agent Files

Agents are stored in `.github/agents/*.agent.md` files. You can edit them directly:

```bash
# Open the agent file in VS Code
code .github/agents/code-reviewer.agent.md
```

The file structure:

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
model: gpt-5-mini
tools: ["read", "search"]
---

# Code Reviewer - Ralph Wiggum Agent

You are a code reviewer specializing in finding issues...

## Your Purpose
...

## Special Instructions
...
```

After editing, refresh the web interface or restart Copilot CLI to see changes.

### Custom Prompt Templates

You can create custom prompt templates and use them when creating agents:

```powershell
# Create a template file
New-Item -Path "templates/api-prompt.md" -ItemType File

# Add your custom prompt to it
# Then create agent using the template
.\ralph-copilot.ps1 -Command create -AgentName "api-builder" -PromptFile "templates/api-prompt.md"
```

## API Endpoints

The backend provides REST API endpoints for programmatic access:

### Copilot Agent Endpoints

```
GET    /api/copilot-agents              # List all agents
POST   /api/copilot-agents              # Create new agent
GET    /api/copilot-agents/:name        # Get specific agent
PUT    /api/copilot-agents/:name        # Update agent
DELETE /api/copilot-agents/:name        # Delete agent
POST   /api/copilot-agents/:name/run    # Run agent

GET    /api/copilot/status              # Check if Copilot CLI is installed
GET    /api/copilot/models              # Get available models
GET    /api/copilot/tools               # Get available tools
```

### Example API Usage

```javascript
// Create an agent
const response = await fetch('http://localhost:5000/api/copilot-agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'code-reviewer',
    description: 'Reviews code for quality',
    model: 'gpt-5-mini',
    tools: ['read', 'search']
  })
});

// List all agents
const agents = await fetch('http://localhost:5000/api/copilot-agents')
  .then(r => r.json());

// Run an agent
await fetch('http://localhost:5000/api/copilot-agents/code-reviewer/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    promptText: 'Review the authentication module'
  })
});
```

## Organization-Level Agents

To create agents available across all repositories in your organization:

1. Create a `.github-private` repository in your organization
2. Add agents to `/agents/*.agent.md` (note: no `.github/` prefix)
3. All developers in your organization can use these agents

```powershell
# Create org-level agent
.\ralph-copilot.ps1 -Command create -AgentName "company-standard" -OrganizationLevel
```

## Troubleshooting

### Copilot CLI Not Found

**Error:** "GitHub Copilot CLI not found"

**Solution:**
```bash
npm install -g @githubnext/github-copilot-cli
github-copilot-cli auth login
```

### Agent Not Appearing

**Problem:** Created agent doesn't show in Copilot CLI

**Solutions:**
1. Restart Copilot CLI
2. Check the agent file exists: `.github/agents/<name>.agent.md`
3. Verify the filename follows pattern: `*.agent.md`
4. Check YAML frontmatter is valid

### Model Not Available

**Error:** "Model gpt-5-mini not available"

**Solution:**
Edit the agent file and change to an available model:
```yaml
model: gpt-4o-mini
```

### Permission Errors

**Problem:** Copilot CLI asking for too many permissions

**Solutions:**
1. Pre-approve tools: `copilot --allow-all-paths`
2. Create custom agent with limited tools
3. Use `--yolo` flag for fully trusted projects (use carefully!)

## Best Practices

### 1. Name Agents Clearly

Use descriptive names that indicate the agent's purpose:
- ✅ `code-reviewer`, `test-writer`, `api-builder`
- ❌ `agent1`, `my-agent`, `test`

### 2. Write Good Descriptions

Help users understand what the agent does:
```
✅ "Reviews code for security issues, performance problems, and best practices"
❌ "Reviews code"
```

### 3. Choose Appropriate Models

- `gpt-5-mini` - Fast, good for most tasks
- `gpt-4o` - More capable, better for complex tasks
- `claude-3-5-sonnet` - Excellent for code generation and review

### 4. Limit Tools for Safety

Only give agents the tools they need:
- Code reviewer: `read`, `search`
- Test writer: `read`, `edit`, `search`
- Full builder: `read`, `edit`, `search`, `run_terminal`

### 5. Use PROMPT.md

Store task context in PROMPT.md files that agents can read:
```markdown
# Task: Add Authentication

## Requirements
- JWT-based authentication
- Login and registration endpoints
- Secure password hashing

## Constraints
- Use bcrypt for passwords
- Include rate limiting
- Add comprehensive tests
```

### 6. Version Control Your Agents

Commit agent files to git:
```bash
git add .github/agents/*.agent.md
git commit -m "Add code-reviewer agent"
```

## Integration with Existing Ralph Scripts

You can use both Ollama agents and Copilot CLI agents together:

```powershell
# Local development with Ollama (free, offline)
.\ralph.ps1 -Model "qwen3-coder"

# Cloud development with Copilot CLI (better quality)
copilot --agent=ralph-wiggum

# Web interface for both
cd ralph-web && node backend/server.js
```

### When to Use Which?

| Scenario | Use |
|----------|-----|
| Offline development | Ollama agents (`ralph.ps1`) |
| Quick iterations, testing | Ollama agents |
| Best AI quality | Copilot CLI agents |
| Complex multi-file tasks | Copilot CLI agents |
| Team collaboration | Copilot CLI agents |
| Cost-free development | Ollama agents |

## Learn More

- [GitHub Copilot CLI Documentation](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli)
- [Custom Agents Guide](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Ralph Copilot CLI Guide](../COPILOT-CLI-GUIDE.md)
- [Example Usage](../EXAMPLE-USAGE.md)

---

🍩 **Happy coding with Ralph!** - "Me fail coding? That's unpossible!"
