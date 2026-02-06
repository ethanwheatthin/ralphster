const fs = require('fs-extra');
const path = require('path');
const lmstudioService = require('./lmstudio-service');
const ToolExecutor = require('./tool-executor');

/**
 * LM Studio Loop Engine
 * Implements the autonomous agent loop using LM Studio's OpenAI-compatible
 * chat completions API with tool/function calling.
 *
 * Mirrors the structure of ralph-loop-engine.js but targets LM Studio instead
 * of Ollama.
 */
class LMStudioLoopEngine {
  constructor(config, eventEmitter) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.workspaceDir = config.workspaceDir;
    this.model = config.model || '';
    this.maxIterations = config.maxIterations || 0;
    this.contextLength = config.contextLength || 4096;
    this.completionMarker = config.completionMarker || '<promise>COMPLETE</promise>';
    this.toolExecutor = new ToolExecutor(this.workspaceDir);

    this.conversationHistory = [];
    this.currentIteration = 0;
    this.isRunning = false;
    this.shouldStop = false;
    this.maxHistoryMessages = 20; // Keep last 20 messages (10 exchanges)

    console.log(`[LMStudioLoopEngine] Initialized for workspace: ${this.workspaceDir}`);
    console.log(`[LMStudioLoopEngine] Model: ${this.model}`);
    console.log(`[LMStudioLoopEngine] Context Length: ${this.contextLength}`);
    console.log(`[LMStudioLoopEngine] Max iterations: ${this.maxIterations || 'unlimited'}`);
  }

  /**
   * Define tools in OpenAI function-calling format (same as Ollama format).
   */
  getToolDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'create_file',
          description: 'Create a new file in the workspace with the specified content',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file relative to workspace (e.g., "script.py" or "folder/file.txt")'
              },
              content: {
                type: 'string',
                description: 'Content to write to the file'
              }
            },
            required: ['path', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the contents of a file from the workspace',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file relative to workspace'
              }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_file',
          description: 'Update an existing file by replacing or appending content',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file relative to workspace'
              },
              content: {
                type: 'string',
                description: 'Content to write or append'
              },
              mode: {
                type: 'string',
                enum: ['replace', 'append'],
                description: 'Update mode: replace entire file or append to end'
              }
            },
            required: ['path', 'content', 'mode']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_directory',
          description: 'Create a new directory in the workspace',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory relative to workspace'
              }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_directory',
          description: 'List contents of a directory',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory relative to workspace (use "." for root)'
              }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_command',
          description: 'Execute a shell command in the workspace directory',
          parameters: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Shell command to execute'
              }
            },
            required: ['command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_prd',
          description: 'Update feature status in plans/prd.json',
          parameters: {
            type: 'object',
            properties: {
              featureId: {
                type: 'string',
                description: 'Feature ID to update (e.g., "F001")'
              },
              status: {
                type: 'string',
                enum: ['not-started', 'in-progress', 'completed'],
                description: 'New status for the feature'
              },
              notes: {
                type: 'string',
                description: 'Optional notes about the update'
              }
            },
            required: ['featureId', 'status']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'append_progress',
          description: 'Append an entry to progress.txt log file',
          parameters: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Progress note to append'
              }
            },
            required: ['content']
          }
        }
      }
    ];
  }

  /**
   * Validate completion by checking if all PRD features are actually complete
   */
  async validateCompletion() {
    try {
      const prdPath = path.join(this.workspaceDir, 'plans', 'prd.json');
      
      // If no PRD exists, allow completion (simple tasks)
      if (!await fs.pathExists(prdPath)) {
        return true;
      }

      const prdContent = await fs.readFile(prdPath, 'utf8');
      const prd = JSON.parse(prdContent);

      // Check if features array exists
      if (!prd.features || !Array.isArray(prd.features)) {
        return true; // No features to check
      }

      // Check each feature status
      const incompleteFeatures = prd.features.filter(
        f => f.status !== 'completed'
      );

      if (incompleteFeatures.length > 0) {
        this.emitLog(
          `Found ${incompleteFeatures.length} incomplete features: ${incompleteFeatures.map(f => f.id).join(', ')}`,
          'warning'
        );
        return false;
      }

      // All features are complete
      return true;
    } catch (error) {
      this.emitLog(`Error validating completion: ${error.message}`, 'warning');
      // On error, allow completion (don't block due to validation issues)
      return true;
    }
  }

  /**
   * Get list of remaining (incomplete) features from PRD
   */
  async getRemainingFeatures() {
    try {
      const prdPath = path.join(this.workspaceDir, 'plans', 'prd.json');
      
      if (!await fs.pathExists(prdPath)) {
        return [];
      }

      const prdContent = await fs.readFile(prdPath, 'utf8');
      const prd = JSON.parse(prdContent);

      if (!prd.features || !Array.isArray(prd.features)) {
        return [];
      }

      return prd.features.filter(f => f.status !== 'completed');
    } catch (error) {
      this.emitLog(`Error getting remaining features: ${error.message}`, 'warning');
      return [];
    }
  }

  /**
   * Load the system prompt
   */
  async loadSystemPrompt() {
    const systemPromptPath = path.join(__dirname, 'SYSTEM-PROMPT.md');

    if (await fs.pathExists(systemPromptPath)) {
      return await fs.readFile(systemPromptPath, 'utf8');
    }

    return 'You are Ralph, an autonomous coding agent. Use tools to execute tasks and output <promise>COMPLETE</promise> when finished.';
  }

  /**
   * Load initial context (PROMPT.md, progress.txt, prd.json)
   */
  async loadInitialContext() {
    const contextParts = [];

    // Load PROMPT.md
    const promptPath = path.join(this.workspaceDir, 'PROMPT.md');
    if (await fs.pathExists(promptPath)) {
      const promptContent = await fs.readFile(promptPath, 'utf8');
      contextParts.push(`# Task Description (PROMPT.md)\n\n${promptContent}`);
    }

    // Load progress.txt (only last 10 lines to save tokens)
    const progressPath = path.join(this.workspaceDir, 'progress.txt');
    if (await fs.pathExists(progressPath)) {
      const progressContent = await fs.readFile(progressPath, 'utf8');
      const progressLines = progressContent.split('\n').filter(l => l.trim());
      const recentProgress = progressLines.slice(-10).join('\n');
      contextParts.push(`\n# Recent Progress (last 10 entries from progress.txt)\n\n${recentProgress}`);
    }

    // Load plans/prd.json (only incomplete features to save tokens)
    const prdPath = path.join(this.workspaceDir, 'plans', 'prd.json');
    if (await fs.pathExists(prdPath)) {
      const prdContent = await fs.readFile(prdPath, 'utf8');
      const prd = JSON.parse(prdContent);
      
      // Add feature summary
      if (prd.features && Array.isArray(prd.features)) {
        const totalFeatures = prd.features.length;
        const completedFeatures = prd.features.filter(f => f.status === 'completed');
        const incompleteFeatures = prd.features.filter(f => f.status !== 'completed');
        
        contextParts.push(`\n## PRD Progress Summary`);
        contextParts.push(`- Total features: ${totalFeatures}`);
        contextParts.push(`- Completed: ${completedFeatures.length} (${completedFeatures.map(f => f.id).join(', ')})`);
        contextParts.push(`- Remaining: ${incompleteFeatures.length}`);
        
        if (incompleteFeatures.length > 0) {
          contextParts.push(`\n### Incomplete Features (full details):`);
          
          // Only include full details for incomplete features
          const incompletePrd = {
            ...prd,
            features: incompleteFeatures
          };
          contextParts.push(`\`\`\`json\n${JSON.stringify(incompletePrd, null, 2)}\n\`\`\``);
          
          contextParts.push(`\n**IMPORTANT**: Work through ALL ${incompleteFeatures.length} remaining features before marking complete.`);
        } else {
          contextParts.push(`\n✅ All features completed!`);
        }
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Emit log event
   */
  emitLog(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    console.log(`[LMStudioLoopEngine] ${logEntry}`);

    if (this.eventEmitter) {
      this.eventEmitter('log', { message, level, timestamp });
    }
  }

  /**
   * Execute a single tool call
   */
  async executeSingleTool(toolCall) {
    const toolName = toolCall.function.name;
    // Arguments might be a string or already an object
    const args = typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    this.emitLog(`Executing tool: ${toolName}`, 'info');
    console.log(`[LMStudioLoopEngine] Tool args:`, args);

    try {
      const result = await this.toolExecutor.executeTool({
        tool: toolName,
        args: args
      });

      this.emitLog(`Tool ${toolName} succeeded`, 'success');
      return {
        success: true,
        result: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      };
    } catch (error) {
      this.emitLog(`Tool ${toolName} failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh context with latest PRD and progress state
   * Returns updated context string
   */
  async refreshContext() {
    try {
      return await this.loadInitialContext();
    } catch (error) {
      this.emitLog(`Error refreshing context: ${error.message}`, 'warning');
      return null;
    }
  }

  /**
   * Prune conversation history to keep context size manageable
   * Keeps system message + recent messages within limit
   */
  pruneConversationHistory() {
    if (this.conversationHistory.length <= this.maxHistoryMessages + 1) {
      return; // No pruning needed
    }

    // Keep system message (first) and last N messages
    const systemMessage = this.conversationHistory[0];
    const recentMessages = this.conversationHistory.slice(-this.maxHistoryMessages);
    
    const pruned = this.conversationHistory.length - recentMessages.length - 1;
    if (pruned > 0) {
      this.emitLog(`Pruned ${pruned} old messages from history to manage context`, 'info');
    }
    
    this.conversationHistory = [systemMessage, ...recentMessages];
  }

  /**
   * Check if response contains completion marker
   */
  isComplete(content) {
    return content && content.includes(this.completionMarker);
  }

  /**
   * Main loop execution
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Loop is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.currentIteration = 0;

    try {
      // Load system prompt
      const systemPrompt = await this.loadSystemPrompt();

      // Load initial context
      const initialContext = await this.loadInitialContext();

      // Initialize conversation with system prompt and initial context
      this.conversationHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: initialContext }
      ];

      this.emitLog('Ralph LM Studio loop started', 'info');
      this.emitLog(`Workspace: ${this.workspaceDir}`, 'info');

      const tools = this.getToolDefinitions();

      // Main iteration loop
      while (!this.shouldStop) {
        this.currentIteration++;

        // Check max iterations
        if (this.maxIterations > 0 && this.currentIteration > this.maxIterations) {
          this.emitLog(`Reached max iterations (${this.maxIterations})`, 'info');
          break;
        }

        this.emitLog(`\n=== Iteration ${this.currentIteration} ===`, 'info');

        // Emit iteration event
        if (this.eventEmitter) {
          this.eventEmitter('iteration', { iteration: this.currentIteration });
        }

        try {
          // Refresh context to show latest PRD and progress state
          const refreshedContext = await this.refreshContext();
          if (refreshedContext) {
            // Inject refreshed context as a user message
            this.conversationHistory.push({
              role: 'user',
              content: `📋 Current Status Update:\n\n${refreshedContext}\n\nBased on this current state, what's your next action?`
            });
          }

          // Prune history before making API call to stay within context
          this.pruneConversationHistory();
          
          const response = await lmstudioService.chatWithTools(
            this.model,
            this.conversationHistory,
            tools,
            { temperature: 0.7, contextLength: this.contextLength }
          );

          // Add assistant's response to history
          this.conversationHistory.push({
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.tool_calls
          });

          // Log assistant's message
          if (response.content) {
            this.emitLog(`Assistant: ${response.content.substring(0, 200)}...`, 'info');
          }

          // Check for completion - but validate it's not premature
          if (response.content && this.isComplete(response.content)) {
            // Validate completion by checking PRD status
            const isActuallyComplete = await this.validateCompletion();
            
            if (!isActuallyComplete) {
              this.emitLog('Premature completion detected. Not all PRD features are complete.', 'warning');
              this.conversationHistory.push({
                role: 'user',
                content: 'You marked the task as COMPLETE, but the PRD analysis shows there are still incomplete features.\n\n' +
                  'Please review plans/prd.json and verify:\n' +
                  '1. Are ALL features marked as "completed"?\n' +
                  '2. Have you implemented every requirement?\n' +
                  '3. Have you updated all feature statuses?\n\n' +
                  'Continue working through ALL features. Only output <promise>COMPLETE</promise> when every feature is truly done.'
              });
              continue;
            } else {
              this.emitLog('Task completed! All PRD features verified complete.', 'success');
              break;
            }
          }

          // Handle tool calls
          if (response.tool_calls && response.tool_calls.length > 0) {
            this.emitLog(`Processing ${response.tool_calls.length} tool call(s)`, 'info');

            // Execute each tool call
            const toolResults = [];
            for (const toolCall of response.tool_calls) {
              const result = await this.executeSingleTool(toolCall);

              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id || '',
                content: result.success
                  ? `Success: ${result.result}`
                  : `Error: ${result.error}`
              });
            }

            // Add tool results to conversation
            this.conversationHistory.push(...toolResults);

            // Continue loop to get next response
            continue;
          }

          // If no tool calls and no completion, ask for next action
          if (!response.tool_calls || response.tool_calls.length === 0) {
            this.emitLog('No tool calls made. Prompting for action...', 'info');
            
            // Every few iterations, remind about remaining features
            let promptMessage = 'What\'s your next action? Use tools to make progress, or output <promise>COMPLETE</promise> if finished.';
            
            if (this.currentIteration % 5 === 0) {
              const remainingFeatures = await this.getRemainingFeatures();
              if (remainingFeatures.length > 0) {
                promptMessage = `Progress check - you still have ${remainingFeatures.length} features to complete:\n\n` +
                  remainingFeatures.map(f => `- ${f.id}: ${f.name} [${f.status}]`).join('\n') +
                  '\n\nContinue working through these features. Use tools to make progress.';
              }
            }
            
            this.conversationHistory.push({
              role: 'user',
              content: promptMessage
            });
          }

        } catch (error) {
          this.emitLog(`Error in iteration ${this.currentIteration}: ${error.message}`, 'error');

          // Add error to conversation and continue
          this.conversationHistory.push({
            role: 'user',
            content: `An error occurred: ${error.message}. Please continue or try a different approach.`
          });
        }

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.emitLog('Ralph LM Studio loop completed', 'success');
      return {
        success: true,
        iterations: this.currentIteration,
        completed: true
      };

    } catch (error) {
      this.emitLog(`Fatal error: ${error.message}`, 'error');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the loop
   */
  stop() {
    this.emitLog('Stop requested', 'info');
    this.shouldStop = true;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentIteration: this.currentIteration,
      maxIterations: this.maxIterations,
      workspaceDir: this.workspaceDir,
      model: this.model
    };
  }
}

module.exports = LMStudioLoopEngine;
