const ToolExecutor = require('./tool-executor');
const path = require('path');

// Test text with tool calls
const testText = `
Let me analyze the task and create a directory:

TOOL: create_directory { "path": "apples" }

Now I'll create a Python script:

TOOL: create_file { "path": "apples/draw_apple.py", "content": "import os\\n\\ndef main():\\n    print('Hello from apple script!')\\n\\nif __name__ == '__main__':\\n    main()" }

Let me also update the PRD:

TOOL: update_prd { "featureId": "F001", "status": "in-progress", "notes": "Created directory and script" }
`;

async function test() {
  console.log('=== Tool Executor Test ===\n');
  
  const workspaceDir = path.join(__dirname, '..', '..', 'test_files');
  const executor = new ToolExecutor(workspaceDir);
  
  console.log('Workspace:', workspaceDir);
  console.log('\n--- Parsing Tool Calls ---\n');
  
  const toolCalls = executor.parseToolCalls(testText);
  
  console.log(`Found ${toolCalls.length} tool calls:\n`);
  toolCalls.forEach((call, i) => {
    console.log(`${i + 1}. ${call.tool}`);
    console.log('   Args:', JSON.stringify(call.args, null, 2));
    console.log('');
  });
  
  console.log('\n--- Executing Tools ---\n');
  
  const results = await executor.executeFromText(testText);
  
  console.log('Results:');
  console.log(JSON.stringify(results, null, 2));
  
  console.log('\n=== Test Complete ===');
}

test().catch(console.error);
