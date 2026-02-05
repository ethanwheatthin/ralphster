# 🍩 Ralph Agent Manager

A full-featured web application for managing multiple Ralph AI coding agents with **loop-based iteration architecture**, real-time monitoring, and autonomous completion detection.

![Ralph Agent Manager](https://img.shields.io/badge/status-ready-brightgreen)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![React](https://img.shields.io/badge/react-18.2.0-blue)

## Features

✨ **Multi-Agent Management**: Create and run multiple Ralph agents simultaneously  
🔄 **Loop-Based Architecture**: Auto-generates PRD.json and progress tracking for iterative workflows  
🎯 **Autonomous Completion**: Agents signal completion with `<promise>COMPLETE</promise>` marker  
📊 **Real-time Dashboard**: Monitor all agents with live status updates and iteration counts  
📝 **Live Log Streaming**: Watch agent output in real-time via WebSockets  
🎮 **Full Control**: Start, stop, edit, and delete agents from the UI  
💾 **Persistent Workspaces**: Each agent has its own isolated workspace with structured PRD  
🎨 **Modern UI**: Beautiful React interface with TypeScript  

## 🆕 Loop Architecture

Ralph Web now uses an **agentic loop pattern** where each agent:

1. **Auto-generates** a structured PRD (Product Requirements Document) from your task
2. **Iterates** up to N times, working on one feature at a time
3. **Tracks progress** in `progress.txt` after each iteration
4. **Self-completes** by outputting `<promise>COMPLETE</promise>` when done

**📖 See [LOOP-ARCHITECTURE.md](LOOP-ARCHITECTURE.md) for detailed documentation**

### Quick Example

```
User Task: "Build a todo app"
   ↓
System Generates:
   - PROMPT.md (your task)
   - plans/prd.json (structured features F001-F005)
   - progress.txt (iteration log)
   ↓
Loop Starts (max 20 iterations):
   Iteration 1: Implement F001 (project setup)
   Iteration 2: Implement F002 (UI components)
   ...
   Iteration 8: All features complete
   → Outputs: <promise>COMPLETE</promise>
   ↓
Loop exits, agent shows ✅ COMPLETE
```  

## Architecture

### Backend (Node.js + Express)
- REST API for agent management
- Socket.io for real-time updates
- Process management for PowerShell scripts
- Isolated workspaces for each agent

### Frontend (React + TypeScript)
- Responsive dashboard with agent cards
- Real-time log viewer with filtering
- Modal-based agent creation
- Live status indicators

## Prerequisites

1. **Node.js** (v16 or higher)
   ```powershell
   node --version
   ```

2. **Ollama** installed and running
   ```powershell
   ollama list
   ```

3. **Claude Code** (or compatible CLI)
   ```powershell
   # The ralph.ps1 script in parent directory
   ```

## Quick Start

### 1. Install Dependencies

```powershell
# In the ralph-web directory
npm run install-all
```

This installs dependencies for both backend and frontend.

### 2. Start the Application

#### Development Mode (Recommended)
```powershell
npm run dev
```

This runs:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:3000`

#### Production Mode
```powershell
# Build frontend
npm run build

# Start production server
npm start
```

Access the app at `http://localhost:5000`

## Usage Guide

### Creating an Agent

1. Click **"New Agent"** button
2. Fill in the form:
   - **Agent Name**: Descriptive name for your agent
   - **Model**: Choose an Ollama model (e.g., qwen3-coder)
   - **Max Iterations**: 0 for infinite, or set a limit
   - **Prompt**: Describe the task in PROMPT.md format
3. Click **"Create Agent"**

### Managing Agents

Each agent card shows:
- **Status**: Running, Stopped, Stopping, or Error
- **Current Iteration**: Progress tracker
- **Model**: Which Ollama model is being used

Available actions:
- **▶️ Start**: Launch the agent
- **⏹️ Stop**: Gracefully stop the agent
- **📋 Logs**: View real-time output
- **✏️ Edit**: Update the PROMPT.md
- **🗑️ Delete**: Remove agent and workspace

### Viewing Logs

Click **"Logs"** on any agent to open the log viewer:
- Filter by type (stdout, stderr, system)
- Auto-scroll toggle
- Download logs as text file
- Real-time updates via WebSocket

## Project Structure

```
ralph-web/
├── backend/
│   ├── server.js              # Express server + Socket.io
│   ├── ralph-manager.js       # Agent lifecycle management
│   └── agents/                # Agent workspaces (created at runtime)
│       └── agents.json        # Persistent agent configuration
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentCard.tsx          # Individual agent display
│   │   │   ├── CreateAgentModal.tsx   # Agent creation form
│   │   │   └── LogViewer.tsx          # Real-time log display
│   │   ├── services/
│   │   │   └── api.ts                 # API client + Socket.io
│   │   ├── App.tsx                    # Main application
│   │   ├── types.ts                   # TypeScript definitions
│   │   └── index.tsx                  # React entry point
│   ├── package.json
│   └── tsconfig.json
├── package.json               # Root package.json
└── README.md
```

## API Reference

### REST Endpoints

```
GET    /api/agents              # List all agents
POST   /api/agents              # Create new agent
GET    /api/agents/:id          # Get agent details
PUT    /api/agents/:id/prompt   # Update agent prompt
POST   /api/agents/:id/start    # Start agent
POST   /api/agents/:id/stop     # Stop agent
DELETE /api/agents/:id          # Delete agent
GET    /api/agents/:id/logs     # Get agent logs
```

### WebSocket Events

**Server → Client:**
- `agents:list` - Initial agent list
- `agent:created` - New agent created
- `agent:started` - Agent started
- `agent:stopped` - Agent stopped
- `agent:stopping` - Agent stopping
- `agent:error` - Agent error
- `agent:iteration` - Iteration update
- `agent:log` - New log entry
- `agent:deleted` - Agent deleted
- `agent:prompt-updated` - Prompt updated

## Configuration

### Environment Variables

Create a `.env` file in the root:

```env
PORT=5000
NODE_ENV=development
```

Frontend (create `frontend/.env`):

```env
REACT_APP_API_URL=http://localhost:5000
```

### Ralph Script Path

The backend expects `ralph.ps1` to be in the parent directory:
```
claude plugins/
├── ralphster/
│   ├── ralph.ps1          # ← Ralph script here
│   └── ralph-web/         # ← Web app here
```

If your script is elsewhere, update the path in `backend/ralph-manager.js`:
```javascript
this.ralphScriptPath = path.join(__dirname, '../../ralph.ps1');
```

## Development

### Backend Development
```powershell
cd ralph-web
npm run server
```

### Frontend Development
```powershell
cd ralph-web/frontend
npm start
```

### Building for Production
```powershell
cd ralph-web
npm run build
```

## Troubleshooting

### Port Already in Use
Change the port in `.env`:
```env
PORT=5001
```

### Agent Won't Start
- Ensure `ralph.ps1` exists in parent directory
- Check that Ollama is running: `ollama list`
- Verify model is installed: `ollama pull qwen3-coder`
- Check backend logs for PowerShell errors

### Frontend Can't Connect
- Verify backend is running on port 5000
- Check CORS settings in `backend/server.js`
- Update `REACT_APP_API_URL` if using different port

### Logs Not Showing
- Check WebSocket connection in browser console
- Ensure Socket.io is properly connected
- Try refreshing the page

## Performance Tips

- Limit max iterations for resource-intensive tasks
- Use lighter models (qwen3-coder) for faster iterations
- Monitor agent workspaces - clean up old ones periodically
- Close log viewer when not needed to reduce WebSocket traffic

## Security Notes

⚠️ **This is a development tool. Do not expose to the internet without:**
- Authentication/authorization
- Rate limiting
- Input validation
- Workspace isolation
- Process sandboxing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Based on the [Ralph Wiggum coding loop](https://ghuntley.com/ralph/) concept.

Built with:
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Lucide Icons](https://lucide.dev/)

---

**"Me fail English? That's unpossible!"** - Ralph Wiggum 🍩

[Ralph](https://icons8.com/icon/Q5ljhHnVhC7L/ralph) icon by [Icons8](https://icons8.com)