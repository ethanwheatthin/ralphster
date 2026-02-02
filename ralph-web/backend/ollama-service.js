const fetch = require('node-fetch');

const OLLAMA_BASE_URL = 'http://localhost:11434';

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
