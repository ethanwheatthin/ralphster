#!/usr/bin/env node

/**
 * CLI Tool Executor for Ralph Agent
 * Usage: node tool-executor-cli.js <workspace_dir> <response_file>
 */

const fs = require('fs');
const path = require('path');
const ToolExecutor = require('./tool-executor');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node tool-executor-cli.js <workspace_dir> <response_file>');
    process.exit(1);
  }
  
  const workspaceDir = path.resolve(args[0]);
  const responseFile = args[1];
  
  // Read the LLM response
  const responseText = fs.readFileSync(responseFile, 'utf8');
  
  // Create tool executor
  const executor = new ToolExecutor(workspaceDir);
  
  // Execute tools from text
  const results = await executor.executeFromText(responseText);
  
  if (results.length === 0) {
    // No tools found, silent exit
    process.exit(0);
  }
  
  // Output results as JSON
  console.log(JSON.stringify(results, null, 2));
  
  // Exit with error if any tool failed
  const anyFailed = results.some(r => !r.success);
  process.exit(anyFailed ? 1 : 0);
}

main().catch(error => {
  console.error('Tool executor error:', error);
  process.exit(1);
});
