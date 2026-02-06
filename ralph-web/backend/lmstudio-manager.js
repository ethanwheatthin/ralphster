const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const lmstudioService = require('./lmstudio-service');
const LMStudioLoopEngine = require('./lmstudio-loop-engine');

/**
 * LM Studio Agent Manager
 * Mirrors RalphManager but drives agents through LM Studio's OpenAI-compat API.
 */
class LMStudioManager {
  constructor(io) {
    this.io = io;
    this.agents = new Map();
    this.loopEngines = new Map();
    this.agentsDir = path.join(__dirname, 'lmstudio-agents');
    this.lmstudioService = lmstudioService;

    // Ensure agents directory exists
    fs.ensureDirSync(this.agentsDir);

    // Load existing agents
    this.loadAgents();
  }

  // ─── Persistence ─────────────────────────────────────────────

  async loadAgents() {
    try {
      const configPath = path.join(this.agentsDir, 'lmstudio-agents.json');
      if (await fs.pathExists(configPath)) {
        const data = await fs.readJson(configPath);
        for (const agentData of data) {
          agentData.status = agentData.status === 'running' ? 'stopped' : agentData.status;
          agentData.logs = [];
          agentData.process = null;
          this.agents.set(agentData.id, agentData);
        }
        console.log(`[LMStudioManager] Loaded ${data.length} agents`);
      }
    } catch (error) {
      console.error('[LMStudioManager] Error loading agents:', error);
    }
  }

  async saveAgents() {
    try {
      const configPath = path.join(this.agentsDir, 'lmstudio-agents.json');
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
      console.error('[LMStudioManager] Error saving agents:', error);
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────

  async createAgent(name, model = '', promptContent = '', maxIterations = 0) {
    const id = uuidv4();
    const workspaceDir = path.join(this.agentsDir, id);

    console.log(`[LMStudioManager] Creating agent: ${name} (${id})`);

    // Create workspace & plans dir
    await fs.ensureDir(workspaceDir);
    const plansDir = path.join(workspaceDir, 'plans');
    await fs.ensureDir(plansDir);

    // PROMPT.md
    const promptPath = path.join(workspaceDir, 'PROMPT.md');
    const defaultPrompt = promptContent || `# Ralph Agent: ${name}\n\n## Task Description\n\nDescribe your task here...\n`;
    await fs.writeFile(promptPath, defaultPrompt);

    // progress.txt
    const progressPath = path.join(workspaceDir, 'progress.txt');
    const progressContent = `# Project Progress Log\n\n## ${new Date().toISOString()} - Agent Created\n- Agent: ${name}\n- ID: ${id}\n- Model: ${model}\n- Provider: LM Studio\n- Max Iterations: ${maxIterations || 'unlimited'}\n- Workspace: ${workspaceDir}\n\n## Instructions for Ralph\n1. Review plans/prd.json for structured requirements\n2. Work on the highest-priority feature\n3. Update prd.json with your progress\n4. Append your notes to this file after each iteration\n5. Output <promise>COMPLETE</promise> when all features are done\n\n---\n`;
    await fs.writeFile(progressPath, progressContent);

    const agent = {
      id,
      name: name || `LMStudio Agent ${id.substring(0, 8)}`,
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

    this.broadcast('lmstudio-agent:created', this.getAgentInfo(agent));

    // Generate PRD
    console.log(`[LMStudioManager] Generating PRD for new agent...`);
    try {
      agent.statusMessage = 'Generating PRD...';
      this.broadcast('lmstudio-agent:status', { id, status: 'initializing', statusMessage: 'Generating PRD...' });

      await this.generatePRDIfNeeded(id);

      agent.status = 'stopped';
      agent.statusMessage = 'Ready to start';
      await this.saveAgents();
      this.broadcast('lmstudio-agent:status', { id, status: 'stopped', statusMessage: 'Ready to start' });
    } catch (error) {
      console.error(`[LMStudioManager] Failed to generate PRD:`, error);
      agent.status = 'error';
      agent.statusMessage = `Failed to generate PRD: ${error.message}`;
      await this.saveAgents();
      this.addLog(id, 'error', `Failed to generate PRD: ${error.message}`);
      this.broadcast('lmstudio-agent:status', { id, status: 'error', statusMessage: agent.statusMessage });
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

    if (await fs.pathExists(prdPath)) {
      console.log(`[LMStudioManager] PRD already exists, skipping generation`);
      this.addLog(id, 'system', '✓ PRD already exists');
      return;
    }

    console.log(`[LMStudioManager] PRD not found, generating from PROMPT.md...`);
    this.addLog(id, 'system', '');
    this.addLog(id, 'system', '📋 Generating PRD from PROMPT.md...');
    this.addLog(id, 'system', '');

    const promptContent = await fs.readFile(promptPath, 'utf8');

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
      this.addLog(id, 'system', 'Calling LM Studio to generate PRD...');

      const response = await this.lmstudioService.generate(agent.model, prdPrompt, {
        temperature: 0.3
      });

      // Try to extract JSON from response
      let prdJson;
      try {
        prdJson = JSON.parse(response);
      } catch (e) {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          prdJson = JSON.parse(jsonMatch[1]);
        } else {
          const objectMatch = response.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            prdJson = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('Could not extract JSON from response');
          }
        }
      }

      await fs.writeJson(prdPath, prdJson, { spaces: 2 });

      console.log(`[LMStudioManager] ✓ PRD generated successfully`);
      this.addLog(id, 'system', '✓ PRD generated and saved to plans/prd.json');
      this.addLog(id, 'system', '');

    } catch (error) {
      console.error(`[LMStudioManager] Error generating PRD:`, error);
      this.addLog(id, 'error', `Failed to generate PRD: ${error.message}`);

      // Fallback PRD
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

  // ─── Start / Stop ────────────────────────────────────────────

  async startAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'running') throw new Error('Agent is already running');

    console.log(`[LMStudioManager] Starting agent ${id} (${agent.name})`);

    // Generate PRD if missing
    try { await this.generatePRDIfNeeded(id); } catch (err) { /* logged internally */ }

    this.addLog(id, 'system', `╔════════════════════════════════════════════════════════════╗`);
    this.addLog(id, 'system', `║  🍩 RALPH LOOP STARTING (LM Studio API)                   ║`);
    this.addLog(id, 'system', `╚════════════════════════════════════════════════════════════╝`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `Agent: ${agent.name}`);
    this.addLog(id, 'system', `Model: ${agent.model}`);
    this.addLog(id, 'system', `Provider: LM Studio (OpenAI-compat)`);
    this.addLog(id, 'system', `Working Directory: ${agent.workspaceDir}`);
    this.addLog(id, 'system', `Max Iterations: ${agent.maxIterations || 'unlimited'}`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `─────────────────────────────────────────────────────────────`);
    this.addLog(id, 'system', ``);

    // Create loop engine
    const loopEngine = new LMStudioLoopEngine(
      {
        workspaceDir: agent.workspaceDir,
        model: agent.model,
        maxIterations: agent.maxIterations,
        completionMarker: '<promise>COMPLETE</promise>'
      },
      (eventName, data) => {
        if (eventName === 'log') {
          this.addLog(id, data.level || 'system', data.message);
        } else if (eventName === 'iteration') {
          agent.currentIteration = data.iteration;
          this.broadcast('lmstudio-agent:iteration', { id, iteration: data.iteration });
        }
      }
    );

    this.loopEngines.set(id, loopEngine);
    agent.status = 'running';
    agent.currentIteration = 0;
    agent.startedAt = new Date().toISOString();
    agent.loopEngine = loopEngine;

    this.broadcast('lmstudio-agent:started', this.getAgentInfo(agent));

    // Start the loop in the background
    loopEngine.start()
      .then((result) => {
        agent.status = 'stopped';
        agent.stoppedAt = new Date().toISOString();
        this.loopEngines.delete(id);
        this.saveAgents();
        this.addLog(id, 'system', `Loop ended after ${result.iterations} iterations`);
        this.broadcast('lmstudio-agent:stopped', this.getAgentInfo(agent));
      })
      .catch((error) => {
        agent.status = 'error';
        agent.statusMessage = error.message;
        this.loopEngines.delete(id);
        this.saveAgents();
        this.addLog(id, 'error', `Loop error: ${error.message}`);
        this.broadcast('lmstudio-agent:error', { id });
      });
  }

  async stopAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'running') throw new Error('Agent is not running');

    agent.status = 'stopping';
    this.broadcast('lmstudio-agent:stopping', { id });
    this.addLog(id, 'system', 'Stopping agent...');

    const loopEngine = this.loopEngines.get(id);
    if (loopEngine) {
      loopEngine.stop();
      // The loop will exit naturally and the .then() above will fire
    } else {
      agent.status = 'stopped';
      agent.stoppedAt = new Date().toISOString();
      await this.saveAgents();
      this.broadcast('lmstudio-agent:stopped', this.getAgentInfo(agent));
    }
  }

  async deleteAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    // Stop if running
    if (agent.status === 'running') {
      try { await this.stopAgent(id); } catch (e) { /* ignore */ }
      await new Promise(r => setTimeout(r, 2000));
    }

    // Delete workspace with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await fs.remove(agent.workspaceDir);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('[LMStudioManager] Failed to delete workspace after retries:', error);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    this.agents.delete(id);
    await this.saveAgents();
    this.broadcast('lmstudio-agent:deleted', { id });
  }

  // ─── Prompt helpers ──────────────────────────────────────────

  async updatePrompt(id, promptContent) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    await fs.writeFile(promptPath, promptContent);
    this.broadcast('lmstudio-agent:prompt-updated', { id });
  }

  async getPrompt(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    return await fs.readFile(promptPath, 'utf-8');
  }

  // ─── Queries ─────────────────────────────────────────────────

  getAgent(id) {
    const agent = this.agents.get(id);
    return agent ? this.getAgentInfo(agent) : null;
  }

  getAllAgents() {
    return Array.from(this.agents.values()).map(a => this.getAgentInfo(a));
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

  // ─── Logging ─────────────────────────────────────────────────

  addLog(id, type, message) {
    const agent = this.agents.get(id);
    if (!agent) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };

    if (!agent.logs) agent.logs = [];
    agent.logs.push(logEntry);
    if (agent.logs.length > 1000) {
      agent.logs = agent.logs.slice(-500);
    }

    this.io.emit('lmstudio-agent:log', { id, log: logEntry });
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
        stopPromises.push(this.stopAgent(id).catch(() => {}));
      }
    }
    await Promise.all(stopPromises);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

module.exports = LMStudioManager;
