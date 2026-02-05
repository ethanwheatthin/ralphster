const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ollamaService = require('./ollama-service');
const ToolExecutor = require('./tool-executor');
const RalphLoopEngine = require('./ralph-loop-engine');

class RalphManager {
  constructor(io) {
    this.io = io;
    this.agents = new Map();
    this.loopEngines = new Map(); // Store active loop engines
    this.agentsDir = path.join(__dirname, 'agents');
    // Use the new tool-enabled script
    this.ralphScriptPath = path.join(__dirname, '../../ralph-agent-tools.ps1');
    this.ollamaService = ollamaService;
    
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
    
    console.log(`[RalphManager] Creating agent: ${name} (${id})`);
    
    // Create agent workspace
    await fs.ensureDir(workspaceDir);
    
    // Create plans directory
    const plansDir = path.join(workspaceDir, 'plans');
    await fs.ensureDir(plansDir);
    console.log(`[RalphManager] Created plans directory`);
    
    // Create PROMPT.md
    const promptPath = path.join(workspaceDir, 'PROMPT.md');
    const defaultPrompt = promptContent || `# Ralph Agent: ${name}\n\n## Task Description\n\nDescribe your task here...\n`;
    await fs.writeFile(promptPath, defaultPrompt);
    console.log(`[RalphManager] Created PROMPT.md`);

    // Create progress.txt
    const progressPath = path.join(workspaceDir, 'progress.txt');
    const progressContent = `# Project Progress Log\n\n## ${new Date().toISOString()} - Agent Created\n- Agent: ${name}\n- ID: ${id}\n- Model: ${model}\n- Max Iterations: ${maxIterations || 'unlimited'}\n- Workspace: ${workspaceDir}\n\n## Instructions for Ralph\n1. Review plans/prd.json for structured requirements\n2. Work on the highest-priority feature\n3. Update prd.json with your progress\n4. Append your notes to this file after each iteration\n5. Output <promise>COMPLETE</promise> when all features are done\n\n---\n`;
    await fs.writeFile(progressPath, progressContent);
    console.log(`[RalphManager] Created progress.txt`);

    const agent = {
      id,
      name: name || `Agent ${id.substring(0, 8)}`,
      model,
      maxIterations,
      status: 'initializing',
      workspaceDir,
      createdAt: new Date().toISOString(),
      currentIteration: 0,
      logs: [],
      process: null,
      statusMessage: 'Creating workspace...'
    };

    this.agents.set(id, agent);
    await this.saveAgents();
    
    this.broadcast('agent:created', this.getAgentInfo(agent));
    
    // Generate PRD immediately after creation
    console.log(`[RalphManager] Generating PRD for new agent...`);
    try {
      // Update status to show PRD generation
      agent.statusMessage = 'Generating PRD...';
      this.broadcast('agent:status', { id, status: 'initializing', statusMessage: 'Generating PRD...' });
      
      await this.generatePRDIfNeeded(id);
      
      // Mark as complete
      agent.status = 'stopped';
      agent.statusMessage = 'Ready to start';
      await this.saveAgents();
      this.broadcast('agent:status', { id, status: 'stopped', statusMessage: 'Ready to start' });
    } catch (error) {
      console.error(`[RalphManager] Failed to generate PRD:`, error);
      agent.status = 'error';
      agent.statusMessage = `Failed to generate PRD: ${error.message}`;
      await this.saveAgents();
      this.addLog(id, 'error', `Failed to generate PRD: ${error.message}`);
      this.broadcast('agent:status', { id, status: 'error', statusMessage: agent.statusMessage });
    }
    
    return this.getAgentInfo(agent);
  }

  /**
   * Generate PRD from PROMPT.md if it doesn't exist
   */
  async generatePRDIfNeeded(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const prdPath = path.join(agent.workspaceDir, 'plans', 'prd.json');
    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');

    // Check if PRD already exists
    if (await fs.pathExists(prdPath)) {
      console.log(`[RalphManager] PRD already exists, skipping generation`);
      this.addLog(id, 'system', '✓ PRD already exists');
      return;
    }

    console.log(`[RalphManager] PRD not found, generating from PROMPT.md...`);
    this.addLog(id, 'system', '');
    this.addLog(id, 'system', '📋 Generating PRD from PROMPT.md...');
    this.addLog(id, 'system', '');

    // Read the prompt content
    const promptContent = await fs.readFile(promptPath, 'utf8');

    // Create PRD generation prompt
    const prdPrompt = `You are creating a structured Product Requirements Document (PRD) from a user's task description.

Here is the task description:

---
${promptContent}
---

Create a detailed PRD in JSON format with the following structure:

{
  "meta": {
    "version": "1.0.0",
    "project": "<project name from prompt>",
    "description": "<brief description>",
    "created": "${new Date().toISOString().split('T')[0]}",
    "lastUpdated": "${new Date().toISOString().split('T')[0]}",
    "status": "not-started"
  },
  "objectives": {
    "primary": "<main goal from prompt>",
    "keyPrinciples": ["<principle 1>", "<principle 2>"]
  },
  "features": [
    {
      "id": "F001",
      "name": "<feature name>",
      "priority": "high|medium|low",
      "status": "not-started",
      "requirements": ["<requirement 1>", "<requirement 2>"],
      "acceptanceCriteria": ["<criteria 1>", "<criteria 2>"]
    }
  ],
  "deliverables": ["<deliverable 1>", "<deliverable 2>"],
  "progress": {
    "completedFeatures": [],
    "inProgressFeatures": [],
    "blockers": [],
    "notes": []
  }
}

Break down the task into specific, actionable features with clear requirements and acceptance criteria.
Respond with ONLY the JSON, no other text.`;

    try {
      this.addLog(id, 'system', 'Calling Ollama to generate PRD...');
      
      // Use Ollama to generate the PRD
      const response = await this.ollamaService.generate(agent.model, prdPrompt, {
        temperature: 0.3,  // Lower temperature for more structured output
        contextLength: 128000
      });

      // Try to extract JSON from response
      let prdJson;
      try {
        // Try direct parse
        prdJson = JSON.parse(response);
      } catch (e) {
        // Try to find JSON in code blocks
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          prdJson = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find JSON object
          const objectMatch = response.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            prdJson = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('Could not extract JSON from response');
          }
        }
      }

      // Write PRD to file
      await fs.writeJson(prdPath, prdJson, { spaces: 2 });
      
      console.log(`[RalphManager] ✓ PRD generated successfully`);
      this.addLog(id, 'system', '✓ PRD generated and saved to plans/prd.json');
      this.addLog(id, 'system', '');
      
    } catch (error) {
      console.error(`[RalphManager] Error generating PRD:`, error);
      this.addLog(id, 'error', `Failed to generate PRD: ${error.message}`);
      
      // Create a basic PRD as fallback
      const fallbackPRD = {
        meta: {
          version: "1.0.0",
          project: agent.name,
          description: "Auto-generated from PROMPT.md",
          created: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0],
          status: "not-started"
        },
        objectives: {
          primary: "See PROMPT.md for details",
          keyPrinciples: ["Work incrementally", "Test thoroughly"]
        },
        features: [
          {
            id: "F001",
            name: "Initial Implementation",
            priority: "high",
            status: "not-started",
            requirements: ["Review PROMPT.md", "Implement core functionality"],
            acceptanceCriteria: ["Code works as expected", "Basic tests pass"]
          }
        ],
        deliverables: ["Working implementation"],
        progress: {
          completedFeatures: [],
          inProgressFeatures: [],
          blockers: [],
          notes: []
        }
      };
      
      await fs.writeJson(prdPath, fallbackPRD, { spaces: 2 });
      this.addLog(id, 'system', '⚠️ Created fallback PRD');
    }
  }

  async startAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'running') throw new Error('Agent already running');

    console.log(`[RalphManager] Starting agent ${id} (${agent.name})`);
    
    // Generate PRD if it doesn't exist
    try {
      await this.generatePRDIfNeeded(id);
    } catch (error) {
      console.error(`[RalphManager] Failed to generate PRD:`, error);
      throw new Error(`Failed to generate PRD: ${error.message}`);
    }

    // Log startup
    this.addLog(id, 'system', `╔════════════════════════════════════════════════════════════╗`);
    this.addLog(id, 'system', `║  🍩 RALPH LOOP STARTING (Native Ollama API)               ║`);
    this.addLog(id, 'system', `╚════════════════════════════════════════════════════════════╝`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `Agent: ${agent.name}`);
    this.addLog(id, 'system', `Model: ${agent.model}`);
    this.addLog(id, 'system', `Context: 128k tokens with tool calling`);
    this.addLog(id, 'system', `Working Directory: ${agent.workspaceDir}`);
    this.addLog(id, 'system', `Max Iterations: ${agent.maxIterations || 'unlimited'}`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `─────────────────────────────────────────────────────────────`);
    this.addLog(id, 'system', ``);

    // Create loop engine
    const loopEngine = new RalphLoopEngine(
      {
        workspaceDir: agent.workspaceDir,
        model: agent.model,
        maxIterations: agent.maxIterations,
        completionMarker: '<promise>COMPLETE</promise>'
      },
      (eventName, data) => {
        // Event handler for loop engine events
        if (eventName === 'log') {
          this.addLog(id, data.level, data.message);
        } else if (eventName === 'iteration') {
          agent.currentIteration = data.iteration;
          this.broadcast('agent:iteration', { id, iteration: data.iteration });
        }
      }
    );

    this.loopEngines.set(id, loopEngine);
    agent.status = 'running';
    agent.currentIteration = 0;
    agent.startedAt = new Date().toISOString();
    agent.loopEngine = loopEngine;

    this.broadcast('agent:started', this.getAgentInfo(agent));

    // Start the loop in background
    loopEngine.start()
      .then((result) => {
        agent.status = 'stopped';
        agent.stoppedAt = new Date().toISOString();
        this.addLog(id, 'system', ``);
        this.addLog(id, 'system', `╔════════════════════════════════════════════════════════════╗`);
        this.addLog(id, 'system', `║  ✓ RALPH LOOP COMPLETED                                    ║`);
        this.addLog(id, 'system', `╚════════════════════════════════════════════════════════════╝`);
        this.addLog(id, 'success', `Completed ${result.iterations} iterations`);
        this.loopEngines.delete(id);
        this.broadcast('agent:stopped', { id, result });
      })
      .catch((error) => {
        agent.status = 'error';
        agent.stoppedAt = new Date().toISOString();
        this.addLog(id, 'error', `Loop error: ${error.message}`);
        this.loopEngines.delete(id);
        this.broadcast('agent:error', { id, error: error.message });
      });
  }

  async stopAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'running') throw new Error('Agent not running');

    agent.status = 'stopping';
    this.broadcast('agent:stopping', { id });
    this.addLog(id, 'system', 'Stopping agent...');

    const loopEngine = this.loopEngines.get(id);
    if (loopEngine) {
      loopEngine.stop();
      this.addLog(id, 'system', 'Loop engine stop requested');
    } else {
      // Fallback to PowerShell process kill if it's still using the old method
      if (agent.process) {
        try {
          // On Windows, kill the entire process tree
          if (process.platform === 'win32') {
            const { exec } = require('child_process');
            exec(`taskkill /pid ${agent.process.pid} /T /F`, (error) => {
              if (error) {
                this.addLog(id, 'system', `Taskkill error: ${error.message}`);
              }
            });
          } else {
            agent.process.kill('SIGTERM');
          }
        } catch (error) {
          this.addLog(id, 'error', `Stop error: ${error.message}`);
        }
      }
    }
  }

  async deleteAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    // Stop if running
    if (agent.status === 'running') {
      await this.stopAgent(id);
      // Wait longer for process to fully terminate
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Try to delete workspace with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await fs.remove(agent.workspaceDir);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          this.addLog(id, 'error', `Failed to delete workspace: ${error.message}`);
          throw new Error(`Failed to delete workspace. It may be locked by another process. Try stopping the agent first and waiting a moment.`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
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
      workspaceDir: agent.workspaceDir,
      statusMessage: agent.statusMessage
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

  stripAnsiCodes(str) {
    // Remove ANSI escape codes (color codes, cursor movements, etc.)
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[[0-9;]*m/g, '')
              .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
              .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  async stopAll() {
    const stopPromises = [];
    for (const [id, agent] of this.agents) {
      if (agent.status === 'running') {
        stopPromises.push(
          this.stopAgent(id)
            .catch(err => console.error(`Error stopping ${id}:`, err))
        );
      }
    }
    await Promise.all(stopPromises);
    
    // Wait for all processes to terminate
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

module.exports = RalphManager;
