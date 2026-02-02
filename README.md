# 🍩 Ralphster - Ralph Wiggum Loop for Ollama

> "Me fail English? That's unpossible!" - Ralph Wiggum

A Windows implementation of the [Ralph Wiggum coding loop](https://ghuntley.com/ralph/) that uses local AI models through [Ollama](https://ollama.com/) with [Claude Code](https://code.claude.com/).

## What is Ralph?

Ralph is a technique. In its purest form, Ralph is a loop:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

This Windows implementation brings Ralph to PowerShell, letting you run an autonomous coding loop with local AI models.

## Prerequisites

1. **Ollama** installed and running
   ```powershell
   # Check if Ollama is running
   ollama list
   ```

2. **Claude Code** installed
   ```powershell
   # Install via npm (if available)
   npm install -g @anthropic-ai/claude-code
   
   # Or via curl on WSL/Git Bash
   curl -fsSL https://claude.ai/install.sh | bash
   ```

3. **A model pulled in Ollama**
   ```powershell
   # Recommended models
   ollama pull qwen3-coder
   ollama pull glm-4.7
   ollama pull gpt-oss:20b
   ```

## Quick Start

1. **Configure Ollama for Claude Code** (one-time setup):
   ```powershell
   ollama launch claude --config
   ```

2. **Edit your prompt**:
   Open `PROMPT.md` and describe the task you want Ralph to work on.

3. **Start the loop**:
   ```powershell
   # Using PowerShell directly
   .\ralph.ps1
   
   # Or double-click ralph.bat
   ```

4. **Stop when done**: Press `Ctrl+C` to stop the loop gracefully.

## Usage

```powershell
.\ralph.ps1 [OPTIONS]

OPTIONS:
    -PromptFile <path>     Path to prompt file (default: PROMPT.md)
    -Model <model>         Ollama model to use (default: qwen3-coder)
    -MaxIterations <n>     Max iterations, 0 = infinite (default: 0)
    -DryRun                Show what would run without executing
    -Help                  Show help message
```

### Examples

```powershell
# Run with defaults (infinite loop)
.\ralph.ps1

# Use a specific model
.\ralph.ps1 -Model "gpt-oss:20b"

# Run only 5 iterations
.\ralph.ps1 -MaxIterations 5

# Use a custom prompt file
.\ralph.ps1 -PromptFile "build-api.md"

# Dry run to test configuration
.\ralph.ps1 -DryRun
```

## Recommended Models

| Model | Context | Notes |
|-------|---------|-------|
| `qwen3-coder` | 64k+ | Good balance of speed and capability |
| `glm-4.7` | 64k+ | Strong coding performance |
| `gpt-oss:20b` | 64k+ | Larger, more capable |
| `gpt-oss:120b` | 64k+ | Maximum capability (needs lots of VRAM) |

> **Note**: Claude Code requires at least 64k context. See [Ollama context length docs](https://docs.ollama.com/context-length) to adjust.

## How to Write Good Prompts

The key to Ralph is the prompt. Think of it as putting up signs at a playground:

```markdown
# Task
Build a REST API for a todo application

## Requirements
- Use Express.js
- Store data in SQLite
- Include CRUD operations

## Constraints (the signs!)
- Do NOT modify package.json without asking
- Keep functions under 50 lines
- Write tests for every endpoint
- Use TypeScript

## Current Progress
- [x] Project setup
- [ ] Database schema
- [ ] API endpoints
- [ ] Tests

## If you get stuck
- Check the error messages
- Look at similar files for patterns
- Ask for clarification in comments
```

### Tips

1. **Be specific** - Vague prompts lead to vague results
2. **Add constraints** - These are your "signs" that guide Ralph
3. **Update the prompt** - As Ralph makes progress, update the current state
4. **Tune constantly** - When Ralph does something wrong, add a sign

## 🆕 Using Ralph with GitHub Copilot CLI

Ralph is now available as a custom agent for GitHub Copilot CLI, using the GPT-5-mini model!

### Quick Start with Copilot CLI

```bash
# Start Copilot CLI
copilot

# Use Ralph with a slash command
/agent
# Then select "ralph-wiggum"

# Or specify Ralph directly
copilot --agent=ralph-wiggum --prompt "Read PROMPT.md and start working"
```

### Why Use Copilot CLI?

- 🌩️ **Cloud-powered**: Uses GPT-5-mini instead of local models
- 🧠 **Better context**: Advanced context management
- 🤝 **Team features**: Delegate to coding agent, share sessions
- 📦 **MCP support**: Extend with Model Context Protocol servers

### Three Ways to Run Ralph

| Method | Best For | Model |
|--------|----------|-------|
| `ralph.ps1` | Local, offline work | Ollama (qwen3-coder, etc.) |
| `ralph-agent.ps1` | Quick iterations | Ollama |
| Copilot CLI | Advanced features, cloud AI | GPT-5-mini |

For detailed instructions, see [COPILOT-CLI-GUIDE.md](COPILOT-CLI-GUIDE.md)

## Philosophy

> "That's the beauty of Ralph - the technique is deterministically bad in an undeterministic world."

Ralph will make mistakes. That's expected. The key is:

1. **Believe in eventual consistency** - Ralph will get there
2. **Tune like a guitar** - When Ralph fails, adjust the prompt
3. **Add signs** - Every mistake is a learning opportunity

## Troubleshooting

### Ollama not responding
```powershell
# Start Ollama
ollama serve

# Or if using Windows, check the system tray
```

### Claude Code not found
```powershell
# Check if installed
claude --version

# Install if needed
npm install -g @anthropic-ai/claude-code
```

### Context too small
Edit your Ollama model to increase context:
```powershell
# Create a Modelfile
FROM qwen3-coder
PARAMETER num_ctx 65536

# Create the model
ollama create qwen3-coder-64k -f Modelfile
```

## Files

| File | Description |
|------|-------------|
| `ralph.ps1` | Main PowerShell script (Ollama) |
| `ralph-agent.ps1` | Simplified launcher for web app |
| `ralph.bat` | Windows batch launcher |
| `PROMPT.md` | Your task prompt (edit this!) |
| `.github/agents/ralph-wiggum.agent.md` | Copilot CLI agent profile |
| `COPILOT-CLI-GUIDE.md` | Guide for using Ralph with Copilot CLI |
| `README.md` | This documentation |

## Credits

- [Geoffrey Huntley](https://ghuntley.com/ralph/) for the Ralph Wiggum concept
- [Ollama](https://ollama.com/) for local AI model hosting
- [Anthropic](https://anthropic.com/) for Claude Code

## License

MIT - Do whatever you want with it. Ralph would approve.

---

*"When I grow up, I'm going to Bovine University!"* 🍩
