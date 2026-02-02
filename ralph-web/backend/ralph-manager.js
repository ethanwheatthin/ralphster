const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

class RalphManager {
  constructor(io) {
    this.io = io;
    this.agents = new Map();
    this.agentsDir = path.join(__dirname, 'agents');
    this.ralphScriptPath = path.join(__dirname, '../../ralph.ps1');
    
    // Ensure agents directory exists
    fs.ensureDirSync(this.agentsDir);
    
    // Load existing agents
    this.loadAgents();
  }

  async loadAgents() {
    try {
      const configPath = path.join(this.agentsDir, 'agents.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        config.forEach(agentData => {
          agentData.status = 'stopped'; // Reset status on load
          agentData.process = null;
          this.agents.set(agentData.id, agentData);
        });
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  }

  async saveAgents() {
    try {
      const configPath = path.join(this.agentsDir, 'agents.json');
      const agentsData = Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        model: agent.model,
        maxIterations: agent.maxIterations,
        createdAt: agent.createdAt,
        workspaceDir: agent.workspaceDir
      }));
      await fs.writeJson(configPath, agentsData, { spaces: 2 });
    } catch (error) {
      console.error('Error saving agents:', error);
    }
  }

  async createAgent(name, model = 'qwen3-coder', promptContent = '', maxIterations = 0) {
    const id = uuidv4();
    const workspaceDir = path.join(this.agentsDir, id);
    
    // Create agent workspace
    await fs.ensureDir(workspaceDir);
    
    // Create PROMPT.md
    const promptPath = path.join(workspaceDir, 'PROMPT.md');
    const defaultPrompt = promptContent || `# Ralph Agent: ${name}\n\n## Task Description\n\nDescribe your task here...\n`;
    await fs.writeFile(promptPath, defaultPrompt);

    const agent = {
      id,
      name: name || `Agent ${id.substring(0, 8)}`,
      model,
      maxIterations,
      status: 'stopped',
      workspaceDir,
      createdAt: new Date().toISOString(),
      currentIteration: 0,
      logs: [],
      process: null
    };

    this.agents.set(id, agent);
    await this.saveAgents();
    
    this.broadcast('agent:created', this.getAgentInfo(agent));
    
    return this.getAgentInfo(agent);
  }

  async startAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'running') throw new Error('Agent already running');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    
    // Check if PowerShell is available
    const psCommand = 'powershell.exe';
    
    // Build PowerShell command
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', this.ralphScriptPath,
      '-PromptFile', promptPath,
      '-Model', agent.model
    ];

    if (agent.maxIterations > 0) {
      args.push('-MaxIterations', agent.maxIterations.toString());
    }

    // Spawn PowerShell process
    const process = spawn(psCommand, args, {
      cwd: agent.workspaceDir,
      windowsHide: true
    });

    agent.process = process;
    agent.status = 'running';
    agent.currentIteration = 0;
    agent.startedAt = new Date().toISOString();

    // Handle stdout
    process.stdout.on('data', (data) => {
      const output = data.toString();
      this.addLog(id, 'stdout', output);
      
      // Parse iteration count if present
      const iterationMatch = output.match(/Iteration #(\d+)/);
      if (iterationMatch) {
        agent.currentIteration = parseInt(iterationMatch[1]);
        this.broadcast('agent:iteration', { id, iteration: agent.currentIteration });
      }
    });

    // Handle stderr
    process.stderr.on('data', (data) => {
      const output = data.toString();
      this.addLog(id, 'stderr', output);
    });

    // Handle process exit
    process.on('close', (code) => {
      agent.status = 'stopped';
      agent.process = null;
      agent.stoppedAt = new Date().toISOString();
      this.addLog(id, 'system', `Process exited with code ${code}`);
      this.broadcast('agent:stopped', { id, code });
    });

    // Handle process error
    process.on('error', (error) => {
      agent.status = 'error';
      agent.process = null;
      this.addLog(id, 'error', `Process error: ${error.message}`);
      this.broadcast('agent:error', { id, error: error.message });
    });

    this.broadcast('agent:started', this.getAgentInfo(agent));
  }

  async stopAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'running') throw new Error('Agent not running');

    if (agent.process) {
      // Send SIGINT (Ctrl+C) to gracefully stop
      agent.process.kill('SIGINT');
      
      // Force kill after timeout
      setTimeout(() => {
        if (agent.process && !agent.process.killed) {
          agent.process.kill('SIGKILL');
        }
      }, 5000);
    }

    agent.status = 'stopping';
    this.broadcast('agent:stopping', { id });
  }

  async deleteAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    // Stop if running
    if (agent.status === 'running') {
      await this.stopAgent(id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Delete workspace
    await fs.remove(agent.workspaceDir);
    
    this.agents.delete(id);
    await this.saveAgents();
    
    this.broadcast('agent:deleted', { id });
  }

  async updatePrompt(id, promptContent) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    await fs.writeFile(promptPath, promptContent);
    
    this.broadcast('agent:prompt-updated', { id });
  }

  async getPrompt(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    return await fs.readFile(promptPath, 'utf-8');
  }

  getAgent(id) {
    const agent = this.agents.get(id);
    return agent ? this.getAgentInfo(agent) : null;
  }

  getAllAgents() {
    return Array.from(this.agents.values()).map(agent => this.getAgentInfo(agent));
  }

  getAgentInfo(agent) {
    return {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      maxIterations: agent.maxIterations,
      status: agent.status,
      currentIteration: agent.currentIteration,
      createdAt: agent.createdAt,
      startedAt: agent.startedAt,
      stoppedAt: agent.stoppedAt,
      workspaceDir: agent.workspaceDir
    };
  }

  addLog(id, type, message) {
    const agent = this.agents.get(id);
    if (!agent) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };

    // Keep last 1000 logs in memory
    if (!agent.logs) agent.logs = [];
    agent.logs.push(logEntry);
    if (agent.logs.length > 1000) {
      agent.logs.shift();
    }

    // Broadcast log to connected clients
    this.io.emit('agent:log', { id, log: logEntry });
  }

  getLogs(id, limit = 100) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    
    return agent.logs ? agent.logs.slice(-limit) : [];
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  async stopAll() {
    const stopPromises = [];
    for (const [id, agent] of this.agents) {
      if (agent.status === 'running') {
        stopPromises.push(this.stopAgent(id).catch(err => console.error(`Error stopping ${id}:`, err)));
      }
    }
    await Promise.all(stopPromises);
  }
}

module.exports = RalphManager;
