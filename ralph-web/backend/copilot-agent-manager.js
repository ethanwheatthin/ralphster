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
    
    // Create PROMPT.md
    const promptPath = path.join(workspaceDir, 'PROMPT.md');
    const defaultPrompt = promptContent || `# Copilot Agent: ${name}\n\n## Task Description\n\nDescribe your task here using the Ralph Wiggum agent...\n`;
    await fs.writeFile(promptPath, defaultPrompt);
    console.log(`[CopilotAgentManager]   ✓ PROMPT.md created`);

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
    
    return this.getAgentInfo(agent);
  }

  async startAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'running') throw new Error('Agent already running');

    console.log(`[CopilotAgent] Starting agent ${id} (${agent.name})`);
    console.log(`[CopilotAgent] Agent model: ${agent.model}`);
    console.log(`[CopilotAgent] Agent workspace: ${agent.workspaceDir}`);

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    
    // Check if ralph-copilot.ps1 exists
    console.log(`[CopilotAgent] Checking for script at: ${this.ralphCopilotScript}`);
    if (!await fs.pathExists(this.ralphCopilotScript)) {
      const error = `Ralph Copilot script not found at: ${this.ralphCopilotScript}`;
      console.error(`[CopilotAgent] ERROR: ${error}`);
      throw new Error(error);
    }
    console.log(`[CopilotAgent] ✓ Script found`);
    
    // Check if PROMPT.md exists
    console.log(`[CopilotAgent] Checking for prompt at: ${promptPath}`);
    if (!await fs.pathExists(promptPath)) {
      const error = `PROMPT.md not found at: ${promptPath}`;
      console.error(`[CopilotAgent] ERROR: ${error}`);
      throw new Error(error);
    }
    console.log(`[CopilotAgent] ✓ Prompt file found`);
    
    // Check if PowerShell is available
    const psCommand = 'powershell.exe';
    console.log(`[CopilotAgent] Using PowerShell: ${psCommand}`);
    
    // Build PowerShell command to run ralph-wiggum agent via Copilot CLI
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', this.ralphCopilotScript,
      '-Command', 'run',
      '-AgentName', 'ralph-wiggum',
      '-Model', agent.model,
      '-PromptFile', promptPath
    ];

    if (agent.maxIterations > 0) {
      args.push('-MaxIterations', agent.maxIterations.toString());
      console.log(`[CopilotAgent] Max iterations: ${agent.maxIterations}`);
    }

    // Log the command being run
    const commandStr = `${psCommand} ${args.join(' ')}`;
    console.log(`[CopilotAgent] Full command: ${commandStr}`);
    console.log(`[CopilotAgent] Working directory: ${agent.workspaceDir}`);
    
    this.addLog(id, 'system', `╔════════════════════════════════════════════════════════════╗`);
    this.addLog(id, 'system', `║  🍩 COPILOT AGENT STARTING                                 ║`);
    this.addLog(id, 'system', `╚════════════════════════════════════════════════════════════╝`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `Agent: ${agent.name}`);
    this.addLog(id, 'system', `Model: ${agent.model}`);
    this.addLog(id, 'system', `Copilot Agent: ralph-wiggum`);
    this.addLog(id, 'system', `Working Directory: ${agent.workspaceDir}`);
    this.addLog(id, 'system', `Prompt File: ${promptPath}`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `Command: ${commandStr}`);
    this.addLog(id, 'system', ``);
    this.addLog(id, 'system', `─────────────────────────────────────────────────────────────`);
    this.addLog(id, 'system', ``);

    console.log(`[CopilotAgent] Spawning process...`);
    // Spawn PowerShell process
    try {
      const process = spawn(psCommand, args, {
        cwd: agent.workspaceDir,
        windowsHide: true
      });
      
      console.log(`[CopilotAgent] ✓ Process spawned with PID: ${process.pid}`);

      agent.process = process;
      agent.status = 'running';
      agent.currentIteration = 1;
      agent.startedAt = new Date().toISOString();

      // Handle stdout
      process.stdout.on('data', (data) => {
        const output = this.stripAnsiCodes(data.toString());
        console.log(`[CopilotAgent] STDOUT: ${output.substring(0, 100)}...`);
        this.addLog(id, 'stdout', output);
        
        // Parse iteration count if present
        const iterationMatch = output.match(/Iteration #(\d+)/);
        if (iterationMatch) {
          agent.currentIteration = parseInt(iterationMatch[1]);
          console.log(`[CopilotAgent] Iteration #${agent.currentIteration}`);
          this.broadcast('copilot-agent:iteration', { id, iteration: agent.currentIteration });
        }
      });

      // Handle stderr
      process.stderr.on('data', (data) => {
        const output = this.stripAnsiCodes(data.toString());
        console.error(`[CopilotAgent] STDERR: ${output}`);
        this.addLog(id, 'stderr', output);
      });

      // Handle process exit
      process.on('exit', async (code, signal) => {
        console.log(`[CopilotAgent] Process exited - Code: ${code}, Signal: ${signal}`);
        
        this.addLog(id, 'system', ``);
        this.addLog(id, 'system', `─────────────────────────────────────────────────────────────`);
        
        if (code === 0) {
          console.log(`[CopilotAgent] ✓ Iteration completed successfully`);
          this.addLog(id, 'system', `✓ Iteration #${agent.currentIteration} completed successfully (exit code: ${code})`);
          
          // Check if we should continue iterating
          agent.currentIteration++;
          const shouldContinue = await this.shouldContinueIterating(id);
          
          if (shouldContinue) {
            console.log(`[CopilotAgent] Continuing to next iteration #${agent.currentIteration}...`);
            this.addLog(id, 'system', ``);
            this.addLog(id, 'system', `🔄 Starting iteration #${agent.currentIteration}...`);
            this.addLog(id, 'system', ``);
            
            // Re-invoke the same command for next iteration
            await this.continueAgent(id);
          } else {
            console.log(`[CopilotAgent] ✓ Agent work complete or max iterations reached`);
            this.addLog(id, 'system', `✓ Agent work complete`);
            agent.status = 'stopped';
            agent.stoppedAt = new Date().toISOString();
            agent.process = null;
            this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
          }
        } else if (signal) {
          console.log(`[CopilotAgent] Agent stopped by signal: ${signal}`);
          this.addLog(id, 'system', `⚠ Agent stopped by signal: ${signal}`);
          agent.status = 'stopped';
          agent.stoppedAt = new Date().toISOString();
          agent.process = null;
          this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
        } else {
          console.error(`[CopilotAgent] ✗ Agent exited with error code: ${code}`);
          this.addLog(id, 'error', `✗ Agent exited with error code: ${code}`);
          this.addLog(id, 'error', `This usually means there was an error in the PowerShell script or Copilot CLI.`);
          agent.status = 'error';
          agent.stoppedAt = new Date().toISOString();
          agent.process = null;
          this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
        }
      });

      // Handle process errors
      process.on('error', (error) => {
        console.error(`[CopilotAgent] Process error:`, error);
        this.addLog(id, 'error', ``);
        this.addLog(id, 'error', `╔════════════════════════════════════════════════════════════╗`);
        this.addLog(id, 'error', `║  ✗ PROCESS ERROR                                           ║`);
        this.addLog(id, 'error', `╚════════════════════════════════════════════════════════════╝`);
        this.addLog(id, 'error', ``);
        this.addLog(id, 'error', `Error: ${error.message}`);
        this.addLog(id, 'error', `Stack: ${error.stack}`);
        this.addLog(id, 'error', ``);
        this.addLog(id, 'error', `Common causes:`);
        this.addLog(id, 'error', `  1. PowerShell not found or not in PATH`);
        this.addLog(id, 'error', `  2. ralph-copilot.ps1 script has errors`);
        this.addLog(id, 'error', `  3. Copilot CLI not installed or not authenticated`);
        this.addLog(id, 'error', `  4. Insufficient permissions to execute scripts`);
        this.addLog(id, 'error', ``);
        
        agent.status = 'error';
        agent.process = null;
        this.broadcast('copilot-agent:error', { id, error: error.message });
      });

      console.log(`[CopilotAgent] ✓ Process handlers configured`);
      this.broadcast('copilot-agent:started', this.getAgentInfo(agent));
      
      return this.getAgentInfo(agent);
    } catch (spawnError) {
      console.error(`[CopilotAgent] Failed to spawn process:`, spawnError);
      this.addLog(id, 'error', `Failed to spawn process: ${spawnError.message}`);
      agent.status = 'error';
      throw spawnError;
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

  /**
   * Check if the agent should continue iterating
   */
  async shouldContinueIterating(id) {
    const agent = this.agents.get(id);
    if (!agent) return false;

    // Check max iterations limit
    if (agent.maxIterations > 0 && agent.currentIteration >= agent.maxIterations) {
      console.log(`[CopilotAgent] Max iterations (${agent.maxIterations}) reached`);
      this.addLog(id, 'system', `Max iterations (${agent.maxIterations}) reached`);
      return false;
    }

    // Check ralph-progress.md for completion markers
    try {
      const progressPath = path.join(agent.workspaceDir, 'ralph-progress.md');
      if (await fs.pathExists(progressPath)) {
        const progressContent = await fs.readFile(progressPath, 'utf8');
        
        // Look for completion markers
        const completionMarkers = [
          /##\s*Status\s*[:\-]?\s*completed/i,
          /##\s*Status\s*[:\-]?\s*done/i,
          /all\s+tasks?\s+completed?/i,
          /work\s+complete/i,
          /project\s+complete/i
        ];
        
        for (const marker of completionMarkers) {
          if (marker.test(progressContent)) {
            console.log(`[CopilotAgent] Completion marker found in ralph-progress.md`);
            this.addLog(id, 'system', `Completion marker detected - task finished`);
            return false;
          }
        }
        
        // Look for "Next Steps" section with tasks
        const nextStepsMatch = progressContent.match(/##\s*Next\s*Steps?([\s\S]*?)(?=##|$)/i);
        if (nextStepsMatch) {
          const nextStepsContent = nextStepsMatch[1];
          
          // If Next Steps section is empty or only has "None" or "N/A", we're done
          const trimmedSteps = nextStepsContent.trim();
          if (!trimmedSteps || /^(none|n\/a|-)$/i.test(trimmedSteps)) {
            console.log(`[CopilotAgent] No remaining steps found in ralph-progress.md`);
            this.addLog(id, 'system', `No remaining steps - task finished`);
            return false;
          }
        }
      }
    } catch (error) {
      console.error(`[CopilotAgent] Error checking progress file:`, error);
      // If we can't read the progress file, continue iterating by default
    }

    // Default: continue iterating
    return true;
  }

  /**
   * Continue the agent for another iteration
   */
  async continueAgent(id) {
    const agent = this.agents.get(id);
    if (!agent) {
      console.error(`[CopilotAgent] Cannot continue - agent ${id} not found`);
      return;
    }

    const promptPath = path.join(agent.workspaceDir, 'PROMPT.md');
    const psCommand = 'powershell.exe';
    
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', this.ralphCopilotScript,
      '-Command', 'run',
      '-AgentName', 'ralph-wiggum',
      '-Model', agent.model,
      '-PromptFile', promptPath
    ];

    if (agent.maxIterations > 0) {
      args.push('-MaxIterations', agent.maxIterations.toString());
    }

    console.log(`[CopilotAgent] Continuing iteration #${agent.currentIteration}`);
    
    try {
      const process = spawn(psCommand, args, {
        cwd: agent.workspaceDir,
        windowsHide: true
      });
      
      console.log(`[CopilotAgent] ✓ Process spawned with PID: ${process.pid}`);

      agent.process = process;
      agent.status = 'running';

      // Handle stdout
      process.stdout.on('data', (data) => {
        const output = this.stripAnsiCodes(data.toString());
        console.log(`[CopilotAgent] STDOUT: ${output.substring(0, 100)}...`);
        this.addLog(id, 'stdout', output);
      });

      // Handle stderr
      process.stderr.on('data', (data) => {
        const output = this.stripAnsiCodes(data.toString());
        console.error(`[CopilotAgent] STDERR: ${output}`);
        this.addLog(id, 'stderr', output);
      });

      // Handle process exit (recursive call for next iteration)
      process.on('exit', async (code, signal) => {
        console.log(`[CopilotAgent] Process exited - Code: ${code}, Signal: ${signal}`);
        
        this.addLog(id, 'system', ``);
        this.addLog(id, 'system', `─────────────────────────────────────────────────────────────`);
        
        if (code === 0) {
          console.log(`[CopilotAgent] ✓ Iteration completed successfully`);
          this.addLog(id, 'system', `✓ Iteration #${agent.currentIteration} completed successfully (exit code: ${code})`);
          
          // Check if we should continue iterating
          agent.currentIteration++;
          const shouldContinue = await this.shouldContinueIterating(id);
          
          if (shouldContinue) {
            console.log(`[CopilotAgent] Continuing to next iteration #${agent.currentIteration}...`);
            this.addLog(id, 'system', ``);
            this.addLog(id, 'system', `🔄 Starting iteration #${agent.currentIteration}...`);
            this.addLog(id, 'system', ``);
            
            // Re-invoke the same command for next iteration
            await this.continueAgent(id);
          } else {
            console.log(`[CopilotAgent] ✓ Agent work complete or max iterations reached`);
            this.addLog(id, 'system', `✓ Agent work complete`);
            agent.status = 'stopped';
            agent.stoppedAt = new Date().toISOString();
            agent.process = null;
            this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
          }
        } else if (signal) {
          console.log(`[CopilotAgent] Agent stopped by signal: ${signal}`);
          this.addLog(id, 'system', `⚠ Agent stopped by signal: ${signal}`);
          agent.status = 'stopped';
          agent.stoppedAt = new Date().toISOString();
          agent.process = null;
          this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
        } else {
          console.error(`[CopilotAgent] ✗ Agent exited with error code: ${code}`);
          this.addLog(id, 'error', `✗ Agent exited with error code: ${code}`);
          this.addLog(id, 'error', `This usually means there was an error in the PowerShell script or Copilot CLI.`);
          agent.status = 'error';
          agent.stoppedAt = new Date().toISOString();
          agent.process = null;
          this.broadcast('copilot-agent:stopped', this.getAgentInfo(agent));
        }
      });

      // Handle process errors
      process.on('error', (error) => {
        console.error(`[CopilotAgent] Process error:`, error);
        this.addLog(id, 'error', `Process error during continuation: ${error.message}`);
        agent.status = 'error';
        agent.process = null;
        this.broadcast('copilot-agent:error', { id, error: error.message });
      });

      this.broadcast('copilot-agent:iteration', { id, iteration: agent.currentIteration });
      
    } catch (spawnError) {
      console.error(`[CopilotAgent] Failed to continue agent:`, spawnError);
      this.addLog(id, 'error', `Failed to continue: ${spawnError.message}`);
      agent.status = 'error';
      agent.process = null;
      this.broadcast('copilot-agent:error', { id, error: spawnError.message });
    }
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
