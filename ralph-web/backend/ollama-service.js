const fetch = require('node-fetch');

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_CONTEXT_LENGTH = 128000; // 128k context window

class OllamaService {
  // Get list of running models in memory
  async getRunningModels() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/ps`);
      if (!response.ok) throw new Error('Failed to fetch running models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching running models:', error);
      return [];
    }
  }

  // Generate text with Ollama (non-streaming)
  async generate(modelName, prompt, options = {}) {
    const startTime = Date.now();
    console.log(`[Ollama] Starting generate request`);
    console.log(`[Ollama]   Model: ${modelName}`);
    console.log(`[Ollama]   Prompt length: ${prompt.length} chars`);
    console.log(`[Ollama]   Context length: ${options.contextLength || DEFAULT_CONTEXT_LENGTH}`);
    console.log(`[Ollama]   Temperature: ${options.temperature || 0.7}`);
    
    try {
      const requestBody = {
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: options.contextLength || DEFAULT_CONTEXT_LENGTH,
          temperature: options.temperature || 0.7,
          ...options
        }
      };
      
      console.log(`[Ollama] Sending request to ${OLLAMA_BASE_URL}/api/generate`);
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`[Ollama] Response status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`[Ollama] Generate failed with status ${response.status}: ${error}`);
        throw new Error(`Ollama generate failed: ${error}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[Ollama] Generate completed in ${duration}ms`);
      console.log(`[Ollama] Response length: ${data.response ? data.response.length : 0} chars`);
      console.log(`[Ollama] Total tokens: ${data.total_duration || 'unknown'}`);
      
      return data.response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Ollama] Error after ${duration}ms:`, error.message);
      console.error(`[Ollama] Full error:`, error);
      throw error;
    }
  }

  // Generate text with streaming support
  async *generateStream(modelName, prompt, options = {}) {
    const startTime = Date.now();
    console.log(`[Ollama] Starting streaming generate request`);
    console.log(`[Ollama]   Model: ${modelName}`);
    console.log(`[Ollama]   Prompt length: ${prompt.length} chars`);
    console.log(`[Ollama]   Stream: true`);
    
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: true,
          options: {
            num_ctx: options.contextLength || DEFAULT_CONTEXT_LENGTH,
            temperature: options.temperature || 0.7,
            ...options
          }
        })
      });
      
      console.log(`[Ollama] Stream response status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`[Ollama] Stream failed with status ${response.status}: ${error}`);
        throw new Error(`Ollama generate stream failed: ${error}`);
      }

      let chunkCount = 0;
      let totalChars = 0;
      // Process the streaming response
      for await (const chunk of response.body) {
        chunkCount++;
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        console.log(`[Ollama] Received chunk #${chunkCount} with ${lines.length} lines`);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              totalChars += data.response.length;
              yield data.response;
            }
            if (data.done) {
              const duration = Date.now() - startTime;
              console.log(`[Ollama] Stream completed in ${duration}ms`);
              console.log(`[Ollama] Total chunks: ${chunkCount}, Total chars: ${totalChars}`);
              return;
            }
          } catch (e) {
            console.warn(`[Ollama] Skipping invalid JSON line: ${line.substring(0, 100)}`);
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Ollama] Stream error after ${duration}ms:`, error.message);
      console.error(`[Ollama] Full error:`, error);
      throw error;
    }
  }

  // Chat API for multi-turn conversations
  async chat(modelName, messages, options = {}) {
    const startTime = Date.now();
    console.log(`[Ollama] Starting chat request`);
    console.log(`[Ollama]   Model: ${modelName}`);
    console.log(`[Ollama]   Messages: ${messages.length}`);
    console.log(`[Ollama]   Context length: ${options.contextLength || DEFAULT_CONTEXT_LENGTH}`);
    
    try {
      const requestBody = {
        model: modelName,
        messages: messages,
        stream: false,
        options: {
          num_ctx: options.contextLength || DEFAULT_CONTEXT_LENGTH,
          temperature: options.temperature || 0.7,
          ...options
        }
      };
      
      console.log(`[Ollama] Sending chat request to ${OLLAMA_BASE_URL}/api/chat`);
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`[Ollama] Chat response status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`[Ollama] Chat failed with status ${response.status}: ${error}`);
        throw new Error(`Ollama chat failed: ${error}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[Ollama] Chat completed in ${duration}ms`);
      console.log(`[Ollama] Response length: ${data.message?.content?.length || 0} chars`);
      
      return data.message.content;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Ollama] Chat error after ${duration}ms:`, error.message);
      console.error(`[Ollama] Full error:`, error);
      throw error;
    }
  }

  // Get all available models
  async getAvailableModels() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch available models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching available models:', error);
      return [];
    }
  }

  // Unload a model from memory
  async unloadModel(modelName) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          keep_alive: 0  // Set to 0 to unload immediately
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Error unloading model:', error);
      return false;
    }
  }

  // Chat with tool calling support (Ollama native function calling)
  async chatWithTools(modelName, messages, tools, options = {}) {
    const startTime = Date.now();
    console.log(`[Ollama] Starting chat with tools`);
    console.log(`[Ollama]   Model: ${modelName}`);
    console.log(`[Ollama]   Messages: ${messages.length}`);
    console.log(`[Ollama]   Tools: ${tools.length}`);
    
    try {
      const requestBody = {
        model: modelName,
        messages: messages,
        tools: tools,
        stream: false,
        options: {
          num_ctx: options.contextLength || DEFAULT_CONTEXT_LENGTH,
          temperature: options.temperature || 0.7,
          ...options
        }
      };
      
      console.log(`[Ollama] Sending chat with tools request`);
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`[Ollama] Chat with tools response status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`[Ollama] Chat with tools failed: ${error}`);
        throw new Error(`Ollama chat with tools failed: ${error}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[Ollama] Chat with tools completed in ${duration}ms`);
      
      // Log tool calls if present
      if (data.message?.tool_calls) {
        console.log(`[Ollama] Tool calls returned: ${data.message.tool_calls.length}`);
        data.message.tool_calls.forEach((tc, idx) => {
          console.log(`[Ollama]   Tool ${idx + 1}: ${tc.function.name}`);
        });
      }
      
      return data.message;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Ollama] Chat with tools error after ${duration}ms:`, error.message);
      throw error;
    }
  }

  // Check if Ollama is running
  async isRunning() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new OllamaService();
