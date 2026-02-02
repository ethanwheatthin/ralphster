const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const RalphManager = require('./ralph-manager');
const OllamaService = require('./ollama-service');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Initialize Ralph Manager
const ralphManager = new RalphManager(io);

// REST API Endpoints

// Get all agents
app.get('/api/agents', (req, res) => {
  const agents = ralphManager.getAllAgents();
  res.json(agents);
});

// Create new agent
app.post('/api/agents', async (req, res) => {
  try {
    const { name, model, promptContent, maxIterations } = req.body;
    const agent = await ralphManager.createAgent(name, model, promptContent, maxIterations);
    res.status(201).json(agent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get specific agent
app.get('/api/agents/:id', (req, res) => {
  const agent = ralphManager.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// Get agent prompt
app.get('/api/agents/:id/prompt', async (req, res) => {
  try {
    const prompt = await ralphManager.getPrompt(req.params.id);
    res.json({ prompt });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update agent prompt
app.put('/api/agents/:id/prompt', async (req, res) => {
  try {
    const { promptContent } = req.body;
    await ralphManager.updatePrompt(req.params.id, promptContent);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start agent
app.post('/api/agents/:id/start', async (req, res) => {
  try {
    await ralphManager.startAgent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stop agent
app.post('/api/agents/:id/stop', async (req, res) => {
  try {
    await ralphManager.stopAgent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete agent
app.delete('/api/agents/:id', async (req, res) => {
  try {
    await ralphManager.deleteAgent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get agent logs
app.get('/api/agents/:id/logs', (req, res) => {
  try {
    const logs = ralphManager.getLogs(req.params.id);
    res.json({ logs });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ollama model management endpoints

// Get running models
app.get('/api/ollama/running', async (req, res) => {
  try {
    const models = await OllamaService.getRunningModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available models
app.get('/api/ollama/models', async (req, res) => {
  try {
    const models = await OllamaService.getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unload a model
app.post('/api/ollama/unload/:modelName', async (req, res) => {
  try {
    const success = await OllamaService.unloadModel(req.params.modelName);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Failed to unload model' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check Ollama status
app.get('/api/ollama/status', async (req, res) => {
  try {
    const running = await OllamaService.isRunning();
    res.json({ running });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current agents state
  socket.emit('agents:list', ralphManager.getAllAgents());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve React app for all other routes (only in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`🍩 Ralph Web Server running on http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await ralphManager.stopAll();
  process.exit(0);
});
