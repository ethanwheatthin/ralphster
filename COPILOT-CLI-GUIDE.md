# Using Ralph Wiggum with GitHub Copilot CLI

This guide explains how to use your Ralph Wiggum continuous coding agent with GitHub Copilot CLI.

## Prerequisites

1. Install GitHub Copilot CLI: `npm install -g @githubnext/github-copilot-cli`
2. Authenticate: `github-copilot-cli auth login`

## Using the Ralph Wiggum Agent

### Three Ways to Invoke Ralph

#### 1. Using the /agent slash command (Interactive)

```bash
# Start Copilot CLI
copilot

# In the interactive prompt, type:
/agent
# Then select "ralph-wiggum" from the list
```

#### 2. Reference Ralph in your prompt

```bash
copilot

# Copilot will automatically infer you want to use Ralph:
Use the ralph-wiggum agent to build a simple web app
```

#### 3. Specify Ralph via command-line option

```bash
# Direct invocation with a specific task
copilot --agent=ralph-wiggum --prompt "Build a simple web app"

# Or let Ralph read from PROMPT.md
copilot --agent=ralph-wiggum --prompt "Read PROMPT.md and start working on the task"
```

## Agent Configuration

The Ralph Wiggum agent is configured to:

- **Model**: `gpt-5-mini` (as specified)
- **Tools**: `read`, `edit`, `search`, `run_terminal`
- **Location**: `.github/agents/ralph-wiggum.agent.md`

## How Ralph Works with Copilot CLI

1. Ralph will automatically look for `PROMPT.md` in your project
2. It works iteratively, making small incremental changes
3. It checks its work and self-corrects errors
4. It respects constraints defined in PROMPT.md
5. It provides clear progress updates

## Example Workflow

### Initial Setup

1. Create or update your `PROMPT.md` file with your task:

```markdown
# Your Task Prompt for Ralph

## Task Description
Build a REST API with user authentication

## Requirements
- Express.js backend
- JWT authentication
- User registration and login endpoints
- MongoDB database

## Constraints
- Use TypeScript
- Include error handling
- Add input validation
```

2. Navigate to your project directory:

```bash
cd "C:\Users\COLLINSE\Desktop\Personal Projects\ralphster"
```

3. Start Copilot CLI and invoke Ralph:

```bash
copilot --agent=ralph-wiggum
```

4. Copilot will ask you to trust the directory (if first time)

5. Ralph will read your PROMPT.md and start working

### Iterative Development

Ralph works in iterations. After each change:

1. Ralph makes a focused change
2. Explains what was done
3. Suggests next steps
4. You can provide feedback or let it continue

### Stopping Ralph

- Press `Esc` to stop the current operation
- Type `/exit` to end the session
- Press `Ctrl+C` to force quit

## Tips for Working with Ralph

### 1. Keep PROMPT.md Updated

As Ralph works, update PROMPT.md to reflect:
- Completed tasks ✅
- Current blockers
- New requirements

### 2. Use Plan Mode

Press `Shift+Tab` to enter plan mode where Ralph will:
- Create an implementation plan
- Break down complex tasks
- Wait for your approval before coding

### 3. Include Specific Files

```bash
# Have Ralph focus on specific files
copilot --agent=ralph-wiggum --prompt "Fix the bug in @src/app.js"
```

### 4. Delegate Complex Tasks

```bash
# Delegate to Copilot coding agent on GitHub
/delegate complete the authentication system with tests
```

### 5. Resume Previous Sessions

```bash
# Resume the most recent session
copilot --continue --agent=ralph-wiggum

# Or browse and resume any session
copilot --resume
```

## Combining with Existing Ralph Scripts

You can still use your existing PowerShell scripts:

- `ralph.ps1` - Local Ollama-based loop (existing)
- `ralph-agent.ps1` - Simplified web launcher (existing)
- GitHub Copilot CLI - Cloud-based with GPT-5-mini (new!)

### When to Use Which?

| Scenario | Use |
|----------|-----|
| Local development, offline work | `ralph.ps1` with Ollama |
| Quick iterations, testing | `ralph-agent.ps1` |
| Advanced features, cloud models | Copilot CLI with ralph-wiggum agent |
| Complex multi-file tasks | Copilot CLI (better context management) |
| Team collaboration | Copilot CLI (can delegate to coding agent) |

## Troubleshooting

### Agent Not Found

If Ralph doesn't appear in the agent list:

1. Check the file exists: `.github/agents/ralph-wiggum.agent.md`
2. Ensure the filename follows the pattern: `*.agent.md`
3. Restart Copilot CLI
4. Try: `copilot --agent=ralph-wiggum` (direct specification)

### Model Not Available

If `gpt-5-mini` isn't available yet:

Edit `.github/agents/ralph-wiggum.agent.md` and change:

```yaml
model: gpt-4o-mini  # or another available model
```

### Permission Issues

Copilot CLI uses a permission system:

- Approve tool usage when prompted
- Use `--allow-all` flag for trusted projects (use carefully!)
- Use `--allow-all-paths` to skip path verification

```bash
copilot --agent=ralph-wiggum --allow-all
```

## Advanced Configuration

### Custom Instructions

Create `.github/copilot-instructions.md` for project-wide instructions:

```markdown
# Project-Specific Instructions

- Always use TypeScript
- Follow the existing folder structure
- Run tests after making changes
- Use our custom logger utility
```

### MCP Servers

Add MCP servers for enhanced capabilities:

```bash
# In Copilot CLI interactive mode
/mcp add
# Fill in the MCP server details
```

### Organization-Level Agent

To make Ralph available across all your repos:

1. Create a `.github-private` repository in your organization
2. Add `agents/ralph-wiggum.agent.md` (no `.github/` prefix)
3. Ralph will be available in all org repositories

## Example Commands

```bash
# Start Ralph with a simple task
copilot --agent=ralph-wiggum --prompt "Add logging to all API endpoints"

# Let Ralph work on PROMPT.md
copilot --agent=ralph-wiggum --prompt "Continue working on the task in PROMPT.md"

# Ralph with specific context
copilot --agent=ralph-wiggum --prompt "Refactor @backend/server.js to use async/await"

# Check what Ralph would do (plan mode)
copilot --agent=ralph-wiggum --prompt "Plan how to add authentication"
# Then press Shift+Tab to toggle plan mode

# Review Ralph's changes before committing
/review
```

## Integration with Your Web App

Your ralph-web application can potentially trigger Copilot CLI sessions:

```javascript
// In ralph-manager.js - future enhancement
const { spawn } = require('child_process');

function runRalphWithCopilot(task) {
  const copilot = spawn('copilot', [
    '--agent=ralph-wiggum',
    `--prompt=${task}`,
    '--allow-all-paths'
  ]);
  
  copilot.stdout.on('data', (data) => {
    console.log(`Ralph: ${data}`);
  });
}
```

## Learn More

- [GitHub Copilot CLI Docs](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli)
- [Custom Agents Guide](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)

---

🍩 **Ralph says**: "Me fail coding? That's unpossible!" - Happy coding!
