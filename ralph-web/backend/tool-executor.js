const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ToolExecutor {
  constructor(workspaceDir) {
    this.workspaceDir = workspaceDir;
    console.log(`[ToolExecutor] Initialized for workspace: ${workspaceDir}`);
  }

  /**
   * Parse tool calls from LLM output
   * Supports multiple formats:
   * 1. JSON: {"tool": "create_file", "args": {...}}
   * 2. XML: <tool name="create_file"><args>...</args></tool>
   * 3. Markdown: ```tool:create_file {...}```
   */
  parseToolCalls(text) {
    const toolCalls = [];
    
    // Pattern 1: JSON tool calls
    const jsonPattern = /\{[\s\S]*?"tool"\s*:\s*"([^"]+)"[\s\S]*?"args"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/g;
    let match;
    while ((match = jsonPattern.exec(text)) !== null) {
      try {
        const toolCall = JSON.parse(match[0]);
        toolCalls.push(toolCall);
        console.log(`[ToolExecutor] Parsed JSON tool call: ${toolCall.tool}`);
      } catch (e) {
        console.warn(`[ToolExecutor] Failed to parse JSON tool call: ${e.message}`);
      }
    }
    
    // Pattern 2: XML-style tool calls
    const xmlPattern = /<tool\s+name="([^"]+)">([\s\S]*?)<\/tool>/g;
    while ((match = xmlPattern.exec(text)) !== null) {
      try {
        const toolName = match[1];
        const argsText = match[2].match(/<args>([\s\S]*?)<\/args>/);
        const args = argsText ? JSON.parse(argsText[1]) : {};
        toolCalls.push({ tool: toolName, args });
        console.log(`[ToolExecutor] Parsed XML tool call: ${toolName}`);
      } catch (e) {
        console.warn(`[ToolExecutor] Failed to parse XML tool call: ${e.message}`);
      }
    }
    
    // Pattern 3: Simple command format
    // TOOL: create_file { "path": "...", "content": "..." }
    const simplePattern = /TOOL:\s*(\w+)\s*(\{[\s\S]*?\})/g;
    while ((match = simplePattern.exec(text)) !== null) {
      try {
        const toolName = match[1];
        const args = JSON.parse(match[2]);
        toolCalls.push({ tool: toolName, args });
        console.log(`[ToolExecutor] Parsed simple tool call: ${toolName}`);
      } catch (e) {
        console.warn(`[ToolExecutor] Failed to parse simple tool call: ${e.message}`);
      }
    }
    
    return toolCalls;
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolCall) {
    const { tool, args } = toolCall;
    console.log(`[ToolExecutor] Executing tool: ${tool}`);
    console.log(`[ToolExecutor] Args:`, JSON.stringify(args, null, 2));
    
    try {
      switch (tool) {
        case 'create_file':
          return await this.createFile(args);
        
        case 'read_file':
          return await this.readFile(args);
        
        case 'update_file':
          return await this.updateFile(args);
        
        case 'delete_file':
          return await this.deleteFile(args);
        
        case 'create_directory':
          return await this.createDirectory(args);
        
        case 'list_directory':
          return await this.listDirectory(args);
        
        case 'run_command':
          return await this.runCommand(args);
        
        case 'update_prd':
          return await this.updatePRD(args);
        
        case 'append_progress':
          return await this.appendProgress(args);
        
        default:
          throw new Error(`Unknown tool: ${tool}`);
      }
    } catch (error) {
      console.error(`[ToolExecutor] Error executing ${tool}:`, error);
      return {
        success: false,
        error: error.message,
        tool
      };
    }
  }

  /**
   * Create a file in the workspace
   */
  async createFile(args) {
    const { path: filePath, content } = args;
    const fullPath = path.join(this.workspaceDir, filePath);
    
    console.log(`[ToolExecutor] Creating file: ${fullPath}`);
    
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    
    return {
      success: true,
      message: `Created file: ${filePath}`,
      path: filePath
    };
  }

  /**
   * Read a file from the workspace
   */
  async readFile(args) {
    const { path: filePath } = args;
    const fullPath = path.join(this.workspaceDir, filePath);
    
    console.log(`[ToolExecutor] Reading file: ${fullPath}`);
    
    const content = await fs.readFile(fullPath, 'utf8');
    
    return {
      success: true,
      content,
      path: filePath
    };
  }

  /**
   * Update a file (replace or append)
   */
  async updateFile(args) {
    const { path: filePath, content, mode = 'replace' } = args;
    const fullPath = path.join(this.workspaceDir, filePath);
    
    console.log(`[ToolExecutor] Updating file (${mode}): ${fullPath}`);
    
    if (mode === 'append') {
      await fs.appendFile(fullPath, content, 'utf8');
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }
    
    return {
      success: true,
      message: `Updated file: ${filePath}`,
      path: filePath
    };
  }

  /**
   * Delete a file from the workspace
   */
  async deleteFile(args) {
    const { path: filePath } = args;
    const fullPath = path.join(this.workspaceDir, filePath);
    
    console.log(`[ToolExecutor] Deleting file: ${fullPath}`);
    
    await fs.remove(fullPath);
    
    return {
      success: true,
      message: `Deleted file: ${filePath}`,
      path: filePath
    };
  }

  /**
   * Create a directory in the workspace
   */
  async createDirectory(args) {
    const { path: dirPath } = args;
    const fullPath = path.join(this.workspaceDir, dirPath);
    
    console.log(`[ToolExecutor] Creating directory: ${fullPath}`);
    
    await fs.ensureDir(fullPath);
    
    return {
      success: true,
      message: `Created directory: ${dirPath}`,
      path: dirPath
    };
  }

  /**
   * List directory contents
   */
  async listDirectory(args) {
    const { path: dirPath = '.' } = args;
    const fullPath = path.join(this.workspaceDir, dirPath);
    
    console.log(`[ToolExecutor] Listing directory: ${fullPath}`);
    
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const contents = items.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'directory' : 'file'
    }));
    
    return {
      success: true,
      contents,
      path: dirPath
    };
  }

  /**
   * Run a shell command in the workspace
   */
  async runCommand(args) {
    const { command } = args;
    
    console.log(`[ToolExecutor] Running command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: this.workspaceDir,
      timeout: 30000 // 30 second timeout
    });
    
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      command
    };
  }

  /**
   * Update PRD.json status
   */
  async updatePRD(args) {
    const { featureId, status, notes } = args;
    const prdPath = path.join(this.workspaceDir, 'plans', 'prd.json');
    
    console.log(`[ToolExecutor] Updating PRD: ${featureId} -> ${status}`);
    
    const prd = await fs.readJson(prdPath);
    
    // Find and update feature
    const feature = prd.features?.find(f => f.id === featureId);
    if (feature) {
      feature.status = status;
      if (notes) {
        feature.notes = notes;
      }
      feature.lastUpdated = new Date().toISOString();
    }
    
    await fs.writeJson(prdPath, prd, { spaces: 2 });
    
    return {
      success: true,
      message: `Updated feature ${featureId} to ${status}`,
      featureId,
      status
    };
  }

  /**
   * Append to progress.txt
   */
  async appendProgress(args) {
    const { content } = args;
    const progressPath = path.join(this.workspaceDir, 'progress.txt');
    
    console.log(`[ToolExecutor] Appending to progress.txt`);
    
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n${content}\n`;
    
    await fs.appendFile(progressPath, entry, 'utf8');
    
    return {
      success: true,
      message: 'Progress updated',
      timestamp
    };
  }

  /**
   * Execute all tool calls from text and return results
   */
  async executeFromText(text) {
    const toolCalls = this.parseToolCalls(text);
    
    if (toolCalls.length === 0) {
      console.log(`[ToolExecutor] No tool calls found in output`);
      return [];
    }
    
    console.log(`[ToolExecutor] Found ${toolCalls.length} tool call(s)`);
    
    const results = [];
    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall);
      results.push(result);
    }
    
    return results;
  }
}

module.exports = ToolExecutor;
