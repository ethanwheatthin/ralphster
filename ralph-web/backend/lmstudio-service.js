const fetch = require('node-fetch');

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234';
const DEFAULT_CONTEXT_LENGTH = 128000;

/**
 * LM Studio Service
 * Uses the OpenAI-compatible endpoints at /v1/*
 */
class LMStudioService {

  // Get all available / loaded models via OpenAI-compat endpoint
  async getAvailableModels() {
    try {
      const response = await fetch(`${LMSTUDIO_BASE_URL}/v1/models`);
      if (!response.ok) throw new Error('Failed to fetch LM Studio models');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('[LMStudio] Error fetching models:', error.message);
      return [];
    }
  }

  // Generate text (non-streaming) using chat completions with a single user message
  async generate(modelName, prompt, options = {}) {
    const startTime = Date.now();
    console.log(`[LMStudio] Starting generate request`);
    console.log(`[LMStudio]   Model: ${modelName}`);
    console.log(`[LMStudio]   Prompt length: ${prompt.length} chars`);
    console.log(`[LMStudio]   Temperature: ${options.temperature || 0.7}`);

    try {
      const requestBody = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || -1,
        context_length: options.contextLength || 128000,
        stream: false
      };

      const response = await fetch(`${LMSTUDIO_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log(`[LMStudio] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[LMStudio] Generate failed: ${error}`);
        throw new Error(`LM Studio generate failed: ${error}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`[LMStudio] Generate completed in ${duration}ms`);
      console.log(`[LMStudio] Response length: ${content.length} chars`);

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LMStudio] Error after ${duration}ms:`, error.message);
      throw error;
    }
  }

  // Chat API for multi-turn conversations (OpenAI-compat /v1/chat/completions)
  async chat(modelName, messages, options = {}) {
    const startTime = Date.now();
    console.log(`[LMStudio] Starting chat request`);
    console.log(`[LMStudio]   Model: ${modelName}`);
    console.log(`[LMStudio]   Messages: ${messages.length}`);

    try {
      const requestBody = {
        model: modelName,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || -1,
        context_length: options.contextLength || 128000,
        stream: false
      };

      const response = await fetch(`${LMSTUDIO_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log(`[LMStudio] Chat response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[LMStudio] Chat failed: ${error}`);
        throw new Error(`LM Studio chat failed: ${error}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`[LMStudio] Chat completed in ${duration}ms`);
      console.log(`[LMStudio] Response length: ${content.length} chars`);

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LMStudio] Chat error after ${duration}ms:`, error.message);
      throw error;
    }
  }

  // Chat with tool/function calling support (OpenAI-compat)
  async chatWithTools(modelName, messages, tools, options = {}) {
    const startTime = Date.now();
    console.log(`[LMStudio] Starting chat with tools`);
    console.log(`[LMStudio]   Model: ${modelName}`);
    console.log(`[LMStudio]   Messages: ${messages.length}`);
    console.log(`[LMStudio]   Tools: ${tools.length}`);

    try {
      const requestBody = {
        model: modelName,
        messages: messages,
        tools: tools,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || -1,
        context_length: options.contextLength || 128000,
        stream: false
      };

      console.log(`[LMStudio] Sending chat with tools request`);
      const response = await fetch(`${LMSTUDIO_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log(`[LMStudio] Chat with tools response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[LMStudio] Chat with tools failed: ${error}`);
        throw new Error(`LM Studio chat with tools failed: ${error}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[LMStudio] Chat with tools completed in ${duration}ms`);

      const message = data.choices?.[0]?.message || {};
      const finishReason = data.choices?.[0]?.finish_reason;

      // Log tool calls if present
      if (message.tool_calls) {
        console.log(`[LMStudio] Tool calls returned: ${message.tool_calls.length}`);
        message.tool_calls.forEach((tc, idx) => {
          console.log(`[LMStudio]   Tool ${idx + 1}: ${tc.function.name}`);
        });
      }

      // Normalise into { content, tool_calls } matching the shape the loop engine expects
      return {
        content: message.content || '',
        tool_calls: message.tool_calls || null
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LMStudio] Chat with tools error after ${duration}ms:`, error.message);
      throw error;
    }
  }

  // Unload a model from LM Studio
  async unloadModel(modelName) {
    try {
      const response = await fetch(`${LMSTUDIO_BASE_URL}/api/v1/models/unload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      return response.ok;
    } catch (error) {
      console.error('[LMStudio] Error unloading model:', error.message);
      return false;
    }
  }

  // Check if LM Studio is running
  async isRunning() {
    try {
      const response = await fetch(`${LMSTUDIO_BASE_URL}/v1/models`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new LMStudioService();
