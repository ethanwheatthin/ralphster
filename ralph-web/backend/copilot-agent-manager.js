const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

class CopilotAgentManager {
  constructor(io) {
    console.log('[CopilotAgentManager] Initializing...');
    this.io = io;
    this.agents = new Map();
    this.agentsDir = path.join(__dirname, 'copilot-agents');
    this.ralphCopilotScript = path.join(__dirname, '../../ralph-copilot.ps1');
    
    console.log(`[CopilotAgentManager] Agents directory: ${this.agentsDir}`);
    console.log(`[CopilotAgentManager] Ralph Copilot script: ${this.ralphCopilotScript}`);
    
    // Ensure agents directory exists
    fs.ensureDirSync(this.agentsDir);
    console.log(`[CopilotAgentManager] ✓ Agents directory ready`);
    
    // Load existing agents
    this.loadAgents();
  }

  async loadAgents() {
    try {
      const configPath = path.join(this.agentsDir, 'copilot-agents.json');
      console.log(`[CopilotAgentManager] Loading agents from: ${configPath}`);
      
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        console.log(`[CopilotAgentManager] Found ${config.length} saved agent(s)`);
        
        config.forEach(agentData => {
          agentData.status = 'stopped'; // Reset status on load
          agentData.process = null;
          this.agents.set(agentData.id, agentData);
          console.log(`[CopilotAgentManager]   - Loaded: ${agentData.name} (${agentData.id})`);
        });
        
        console.log(`[CopilotAgentManager] ✓ ${this.agents.size} agent(s) loaded`);
      } else {
        console.log(`[CopilotAgentManager] No existing agents config found (this is normal for first run)`);
      }
    } catch (error) {
      console.error('[CopilotAgentManager] Error loading agents:', error);
    }
  }

  async saveAgents() {
    try {
      const configPath = path.join(this.agentsDir, 'copilot-agents.json');
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
      console.error('Error saving Copilot agents:', error);
    }
  }

  async createAgent(name, model = 'gpt-4o-mini', promptContent = '', maxIterations = 0) {
    const id = uuidv4();
    console.log(`[CopilotAgentManager] Creating new agent: ${name} (${id})`);
    console.log(`[CopilotAgentManager]   Model: ${model}`);
    console.log(`[CopilotAgentManager]   Max iterations: ${maxIterations}`);
    
    const workspaceDir = path.join(this.agentsDir, id);
    console.log(`[CopilotAgentManager]   Workspace: ${workspaceDir}`);
    
    // Create agent workspace
    await fs.ensureDir(workspaceDir);
    console.log(`[CopilotAgentManager]   ✓ Workspace directory created`);
    
    // Create plans directory
    const plansDir = path.join(workspaceDir, 'plans');
    await fs.ensureDir(plansDir);
    console.log(`[CopilotAgentManager]   ✓ Plans directory created`);
    
    // Create PROMPT.md
    const promptPath = path.join(workspaceDir, 'PROMPT.md');
    const defaultPrompt = promptContent || `# Copilot Agent: ${name}\n\n## Task Description\n\nDescribe your task here using the Ralph Wiggum agent...\n`;
    await fs.writeFile(promptPath, defaultPrompt);
    console.log(`[CopilotAgentManager]   ✓ PROMPT.md created`);
    
    // NOTE: PRD.json will be generated separately before loop starts
    console.log(`[CopilotAgentManager]   ℹ prd.json will be generated before loop starts`);
    
    // Create progress.txt for iteration tracking
    const progressPath = path.join(workspaceDir, 'progress.txt');
    const progressContent = `# Project Progress Log

## ${new Date().toISOString()} - Agent Created
- Agent: ${name}
- ID: ${id}
- Model: ${model}
- Max Iterations: ${maxIterations || 'unlimited'}
- Workspace: ${workspaceDir}

## Instructions for Ralph
1. Review plans/prd.json for structured requirements
2. Work on the highest-priority feature
3. Update prd.json with your progress
4. Append your notes to this file after each iteration
5. Output <promise>COMPLETE</promise> when all features are done

---
`;
    await fs.writeFile(progressPath, progressContent);
    console.log(`[CopilotAgentManager]   ✓ progress.txt created`);

    const agent = {
      id,
      name: name || `Copilot Agent ${id.substring(0, 8)}`,
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
    console.log(`[CopilotAgentManager] ✓ Agent created and saved: ${name}`);
    
    this.broadcast('copilot-agent:created', this.getAgentInfo(agent));
    
    // Generate PRD immediately after creation
    console.log(`[CopilotAgentManager] Generating PRD for new agent...`);
    try {
      await this.generatePRDIfNeeded(id);
      console.log(`[CopilotAgentManager] ✓ PRD generation complete`);
    } catch (error) {
      console.error(`[CopilotAgentManager] ⚠ PRD generation failed:`, error);
      this.addLog(id, 'error', `PRD generation failed: ${error.message}`);
      this.addLog(id, 'system', 'You can manually create plans/prd.json or it will be generated when you start the agent');
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
      console.log(`[CopilotAgent] PRD already exists at: ${prdPath}`);
      this.addLog(id, 'system', '✓ PRD file already exists, skipping generation');
      return true;
    }

    console.log(`[CopilotAgent] PRD not found, generating from PROMPT.md...`);
    this.addLog(id, 'system', '');
    this.addLog(id, 'system', '📋 Generating PRD from PROMPT.md...');
    this.addLog(id, 'system', '');

    // Read the prompt content
    const promptContent = await fs.readFile(promptPath, 'utf8');

    // Build PowerShell command to call Copilot CLI once for PRD generation
    const prdPrompt = `You are helping to create a structured Product Requirements Document (PRD) from a user's task description.

Read the PROMPT.md file in the current directory and create a detailed plans/prd.json file with the following structure:

{
  "meta": {
    "version": "1.0.0",
    "project": "<project name from prompt>",
    "description": "<brief description>",
    "created": "<today's date YYYY-MM-DD>",
    "lastUpdated": "<today's date YYYY-MM-DD>",
    "status": "not-started"
  },
  "objectives": {
    "primary": "<main goal from prompt>",
    "keyPrinciples": ["<principle 1>", "<principle 2>", ...]
  },
  "features": [
    {
      "id": "F001",
      "name": "<feature name>",
      "priority": "high|medium|low",
      "status": "not-started",
      "requirements": ["<requirement 1>", "<requirement 2>", ...],
      "acceptanceCriteria": ["<criteria 1>", "<criteria 2>", ...]
    }
  ],
  "deliverables": ["<deliverable 1>", "<deliverable 2>", ...],
  "progress": {
    "completedFeatures": [],
    "inProgressFeatures": [],
    "blockers": [],
    "notes": []
  }
}

Break down the task in PROMPT.md into specific, actionable features with clear requirements and acceptance criteria.
Create the plans/prd.json file with this structure.`;

    // Write prompt to temp file to avoid PowerShell escaping issues
    const prdPromptPath = path.join(agent.workspaceDir, '.prd-prompt.md');
    await fs.writeFile(prdPromptPath, prdPrompt);

    const psCommand = 'powershell.exe';
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `Get-Content -Path '.prd-prompt.md' -Raw | copilot --model ${agent.model} --allow-all-tools --allow-tool write --allow-tool shell(composer) --allow-tool shell(npm) --allow-tool shell(npx) --allow-tool shell(git) --deny-tool shell(rm) --deny-tool "shell(git push)"`
    ];

    return new Promise((resolve, reject) => {
      console.log(`[CopilotAgent] Calling Copilot CLI to generate PRD...`);
      
      const process = spawn(psCommand, args, {
        cwd: agent.workspaceDir,
        windowsHide: true,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        const clean = this.stripAnsiCodes(output);
        console.log(`[CopilotAgent] PRD Gen STDOUT: ${clean}`);
        this.addLog(id, 'stdout', clean);
      });

      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        const clean = this.stripAnsiCodes(output);
        console.error(`[CopilotAgent] PRD Gen STDERR: ${clean}`);
        this.addLog(id, 'stderr', clean);
      });

      process.on('exit', async (code) => {
        if (code === 0) {
          // Verify the PRD was created
          if (await fs.pathExists(prdPath)) {
            console.log(`[CopilotAgent] ✓ PRD generated successfully`);
            this.addLog(id, 'system', '');
            this.addLog(id, 'system', '✓ PRD generated successfully');
            this.addLog(id, 'system', '');
            resolve(true);
          } else {
            console.error(`[CopilotAgent] ✗ PRD file not created despite successful exit`);
            this.addLog(id, 'error', '✗ PRD file was not created');
            reject(new Error('PRD file was not created'));
          }
        } else {
          console.error(`[CopilotAgent] ✗ PRD generation failed with code: ${code}`);
          this.addLog(id, 'error', `✗ PRD generation failed (exit code: ${code})`);
          reject(new Error(`PRD generation failed with exit code: ${code}`));
        }
      });

      process.on('error', (error) => {
        console.error(`[CopilotAgent] PRD generation error:`, error);
        this.addLog(id, 'error', `PRD generation error: ${error.message}`);
        reject(error);
      });
    });
  }

  async startAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'running') throw new Error('Agent already running');

    console.log(`[CopilotAgent] Starting agent ${id} (${agent.name})`);
    console.log(`[CopilotAgent] Agent model: ${agent.model}`);
    console.log(`[CopilotAgent] Agent workspace: ${agent.workspaceDir}`);

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    
    // Check if PROMPT.md exists
    console.log(`[CopilotAgent] Checking for prompt at: ${promptPath}`);
    if (!await fs.pathExists(promptPath)) {
      const error = `PROMPT.md not found at: ${promptPath}`;
      console.error(`[CopilotAgent] ERROR: ${error}`);
      throw new Error(error);
    }
    console.log(`[CopilotAgent] ✓ Prompt file found`);
    
    // Generate PRD if it doesn't exist
    try {
      await this.generatePRDIfNeeded(id);
    } catch (error) {
      console.error(`[CopilotAgent] Failed to generate PRD:`, error);
      agent.status = 'error';
      throw new Error(`Failed to generate PRD: ${error.message}`);
    }
    
    // Check if PowerShell is available
    const psCommand = 'powershell.exe';
    console.log(`[CopilotAgent] Using PowerShell: ${psCommand}`);
    
    // Build multi-line prompt that references source files (similar to shell script)
    const loopPrompt = `Work in the current repo. Use these files as your source of truth:
- plans/prd.json
- progress.txt

1. Find the highest-priority feature to work on and work only on that feature.
   This should be the one YOU decide has the highest priority - not necessarily the first in the list.
2. Implement the feature incrementally and carefully.
   Follow the requirements and acceptance criteria in the PRD.
   Test your changes.
3. Update the PRD with the work that was done (plans/prd.json).
   - Feature status change (not-started → in-progress → completed)
   - Any new discoveries or blockers
   - Progress notes
4. Append your progress to progress.txt.
   Use this to leave a note for the next person working in the codebase.
5. Make a git commit of that feature (if git is available).
ONLY WORK ON A SINGLE FEATURE.
If, while implementing the feature, you notice the PRD is complete, output <promise>COMPLETE</promise>.`;

    // Write the full prompt to a temp file to avoid PowerShell escaping nightmares
    const fullPrompt = `@plans/prd.json @progress.txt ${loopPrompt}`;
    const promptTempFile = path.join(agent.workspaceDir, '.loop-prompt.txt');
    await fs.writeFile(promptTempFile, fullPrompt);

    // Build copilot command using the temp file
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `Get-Content -Path '.loop-prompt.txt' -Raw | copilot --model ${agent.model} --allow-all-tools --allow-tool write --allow-tool shell(composer) --allow-tool shell(npm) --allow-tool shell(npx) --allow-tool shell(git) --deny-tool shell(rm) --deny-tool "shell(git push)"`
    ];

    const maxIterations = agent.maxIterations > 0 ? agent.maxIterations : 20;
    console.log(`[CopilotAgent] Max iterations: ${maxIterations}`);

    // Log the command being run
    console.log(`[CopilotAgent] Prompt saved to: ${promptTempFile}`);
    console.log(`[CopilotAgent] Working directory: ${agent.workspaceDir}`);
    
    this.addLog(id, 'system', `╔════════════════════════════════════════════════════════════╗`);
    this.addLog(id, 'system', `║  🍩 RALPH LOOP STARTING                                    ║`);
    this.addLog(id, 'system', `╚════════════════════════════════════════════════════════════╝`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `Agent: ${agent.name}`);
    this.addLog(id, 'system', `Model: ${agent.model}`);
    this.addLog(id, 'system', `Working Directory: ${agent.workspaceDir}`);
    this.addLog(id, 'system', `Source Files: @plans/prd.json @progress.txt`);
    this.addLog(id, 'system', `Completion Marker: <promise>COMPLETE</promise>`);
    this.addLog(id, 'system', `Max Iterations: ${maxIterations}`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `Loop Strategy:`);
    this.addLog(id, 'system', `  1. Pick highest-priority feature from PRD`);
    this.addLog(id, 'system', `  2. Implement feature incrementally`);
    this.addLog(id, 'system', `  3. Update PRD and progress`);
    this.addLog(id, 'system', `  4. Make git commit`);
    this.addLog(id, 'system', `  5. Repeat or output COMPLETE`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `─────────────────────────────────────────────────────────────`);
    this.addLog(id, 'system', ``);

    // Start the iteration loop
    agent.status = 'running';
    agent.currentIteration = 0;
    agent.startedAt = new Date().toISOString();
    this.broadcast('copilot-agent:started', this.getAgentInfo(agent));

    // Run iterations
    await this.runIterationLoop(id, psCommand, args, maxIterations);
    
    return this.getAgentInfo(agent);
  }

  /**
   * Run the copilot iteration loop (similar to the shell script for loop)
   */
  async runIterationLoop(id, psCommand, args, maxIterations) {
    const agent = this.agents.get(id);
    if (!agent) return;

    for (let i = 1; i <= maxIterations; i++) {
      if (agent.status !== 'running') {
        console.log(`[CopilotAgent] Loop stopped (status: ${agent.status})`);
        break;
      }

      agent.currentIteration = i;
      console.log(`[CopilotAgent] Starting iteration ${i} of ${maxIterations}`);
      
      this.addLog(id, 'system', ``);
      this.addLog(id, 'system', `════════════════════════════════════════════════════════════`);
      this.addLog(id, 'system', `Iteration ${i} of ${maxIterations}`);
      this.addLog(id, 'system', `════════════════════════════════════════════════════════════`);
      this.addLog(id, 'system', ``);
      
      this.broadcast('copilot-agent:iteration', { id, iteration: i });

      // Spawn PowerShell process for this iteration
      const iterationComplete = await new Promise((resolve) => {
        try {
          const process = spawn(psCommand, args, {
            cwd: agent.workspaceDir,
            windowsHide: true,
            shell: true
          });

          let completionDetected = false;
          let stdoutBuffer = '';
          let stderrBuffer = '';

          // Handle stdout
          process.stdout.on('data', (data) => {
            stdoutBuffer += data.toString();
            const lines = stdoutBuffer.split(/\r?\n/);
            stdoutBuffer = lines.pop() || '';
            
            lines.forEach(line => {
              if (line.trim()) {
                const output = this.stripAnsiCodes(line);
                console.log(`[CopilotAgent] STDOUT: ${output}`);
                this.addLog(id, 'stdout', output);
                
                // Check for completion marker
                if (output.includes('<promise>COMPLETE</promise>')) {
                  completionDetected = true;
                  console.log(`[CopilotAgent] 🎉 Completion marker detected!`);
                  this.addLog(id, 'system', ``);
                  this.addLog(id, 'system', `🎉 COMPLETION MARKER DETECTED!`);
                  this.addLog(id, 'system', `PRD complete after ${i} iteration(s)`);
                  this.broadcast('copilot-agent:completed', { id, iterations: i });
                }
              }
            });
          });

          // Handle stderr
          process.stderr.on('data', (data) => {
            stderrBuffer += data.toString();
            const lines = stderrBuffer.split(/\r?\n/);
            stderrBuffer = lines.pop() || '';
            
            lines.forEach(line => {
              if (line.trim()) {
                const output = this.stripAnsiCodes(line);
                console.error(`[CopilotAgent] STDERR: ${output}`);
                this.addLog(id, 'stderr', output);
              }
            });
          });

          // Handle process exit
          process.on('exit', (code, signal) => {
            console.log(`[CopilotAgent] Iteration ${i} exited - Code: ${code}, Signal: ${signal}`);
            
            // Like the shell script, don't let non-zero exit kill the loop
            // (auth/rate limit/etc can cause this)
            if (code === 0) {
              this.addLog(id, 'system', `✓ Iteration ${i} completed (exit code: ${code})`);
            } else {
              this.addLog(id, 'system', `⚠ Iteration ${i} exited with code ${code} (continuing...)`);
            }
            
            agent.process = null;
            resolve({ completionDetected, stopped: signal !== null });
          });

          // Handle process errors
          process.on('error', (error) => {
            console.error(`[CopilotAgent] Process error:`, error);
            this.addLog(id, 'error', `Process error: ${error.message}`);
            agent.process = null;
            resolve({ completionDetected: false, stopped: false, error: true });
          });

          agent.process = process;
        } catch (error) {
          console.error(`[CopilotAgent] Failed to spawn:`, error);
          this.addLog(id, 'error', `Failed to spawn: ${error.message}`);
          resolve({ completionDetected: false, stopped: false, error: true });
        }
      });

      // Check iteration result
      if (iterationComplete.stopped) {
        console.log(`[CopilotAgent] Loop stopped by user`);
        this.addLog(id, 'system', `Loop stopped by user`);
        agent.status = 'stopped';
        agent.stoppedAt = new Date().toISOString();
        this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
        break;
      }

      if (iterationComplete.completionDetected) {
        console.log(`[CopilotAgent] ✓ Work complete after ${i} iteration(s)`);
        this.addLog(id, 'system', ``);
        this.addLog(id, 'system', `✓ All work complete`);
        agent.status = 'stopped';
        agent.stoppedAt = new Date().toISOString();
        this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
        break;
      }

      if (iterationComplete.error) {
        console.error(`[CopilotAgent] Error in iteration ${i}, stopping loop`);
        agent.status = 'error';
        agent.stoppedAt = new Date().toISOString();
        this.broadcast('copilot-agent:error', { id, error: 'Process error' });
        break;
      }
    }

    // Loop complete
    if (agent.status === 'running') {
      console.log(`[CopilotAgent] ✓ Loop completed: ${maxIterations} iterations finished`);
      this.addLog(id, 'system', ``);
      this.addLog(id, 'system', `════════════════════════════════════════════════════════════`);
      this.addLog(id, 'system', `Loop completed: ${maxIterations} iterations finished`);
      this.addLog(id, 'system', `════════════════════════════════════════════════════════════`);
      agent.status = 'stopped';
      agent.stoppedAt = new Date().toISOString();
      this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
    }
  }

  async stopAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'running') throw new Error('Agent not running');

    agent.status = 'stopping';
    this.addLog(id, 'system', 'Stopping agent...');
    this.broadcast('copilot-agent:stopping', this.getAgentInfo(agent));

    if (agent.process) {
      // Try graceful termination first
      agent.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (agent.process && !agent.process.killed) {
          agent.process.kill('SIGKILL');
        }
      }, 5000);
    }

    return this.getAgentInfo(agent);
  }

  async deleteAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    // Stop if running
    if (agent.status === 'running') {
      await this.stopAgent(id);
      // Wait a bit for process to stop
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove workspace directory
    await fs.remove(agent.workspaceDir);

    // Remove from map and save
    this.agents.delete(id);
    await this.saveAgents();

    this.broadcast('copilot-agent:deleted', { id });
    
    return { id };
  }

  async getPrompt(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    return await fs.readFile(promptPath, 'utf8');
  }

  async updatePrompt(id, promptContent) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    await fs.writeFile(promptPath, promptContent);

    this.addLog(id, 'system', 'Prompt updated');
    this.broadcast('copilot-agent:prompt-updated', { id });
  }

  getAgent(id) {
    const agent = this.agents.get(id);
    return agent ? this.getAgentInfo(agent) : null;
  }

  getAllAgents() {
    return Array.from(this.agents.values()).map(agent => this.getAgentInfo(agent));
  }

  getLogs(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    return agent.logs || [];
  }

  addLog(id, type, message) {
    const agent = this.agents.get(id);
    if (!agent) return;

    const log = {
      timestamp: new Date().toISOString(),
      type,
      message: message.trim()
    };

    if (!agent.logs) agent.logs = [];
    agent.logs.push(log);

    // Keep only last 1000 logs
    if (agent.logs.length > 1000) {
      agent.logs = agent.logs.slice(-1000);
    }

    this.broadcast('copilot-agent:log', { id, log });
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

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  stripAnsiCodes(str) {
    // Remove ANSI escape codes
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  async stopAll() {
    const runningAgents = Array.from(this.agents.values()).filter(
      agent => agent.status === 'running'
    );

    for (const agent of runningAgents) {
      try {
        await this.stopAgent(agent.id);
      } catch (error) {
        console.error(`Error stopping agent ${agent.id}:`, error);
      }
    }
  }

  /**
   * Check if Copilot CLI is installed
   */
  async checkCopilotCLI() {
    return new Promise((resolve) => {
      const process = spawn('copilot', ['--version'], { shell: true });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get available AI models for Copilot CLI
   */
  getAvailableModels() {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'claude-3-5-sonnet',
      'claude-3-opus',
      'claude-3-sonnet'
    ];
  }
}

module.exports = CopilotAgentManager;
