import { io, Socket } from 'socket.io-client';
import { Agent, LogEntry, CreateAgentRequest, UpdateAgentRequest, CopilotAgent, CreateCopilotAgentRequest } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  private socket: Socket | null = null;

  // Socket.io connection
  connectSocket(): Socket {
    if (!this.socket) {
      this.socket = io(API_URL);
    }
    return this.socket;
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // REST API calls
  async getAllAgents(): Promise<Agent[]> {
    const response = await fetch(`${API_URL}/api/agents`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
  }

  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    const response = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create agent');
    return response.json();
  }

  async getAgent(id: string): Promise<Agent> {
    const response = await fetch(`${API_URL}/api/agents/${id}`);
    if (!response.ok) throw new Error('Failed to fetch agent');
    return response.json();
  }

  async updateAgent(id: string, data: UpdateAgentRequest): Promise<Agent> {
    const response = await fetch(`${API_URL}/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update agent');
    return response.json();
  }

  async startAgent(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/agents/${id}/start`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to start agent');
  }

  async stopAgent(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/agents/${id}/stop`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to stop agent');
  }

  async deleteAgent(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/agents/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete agent' }));
      throw new Error(error.error || 'Failed to delete agent');
    }
  }

  async getPrompt(id: string): Promise<string> {
    const response = await fetch(`${API_URL}/api/agents/${id}/prompt`);
    if (!response.ok) throw new Error('Failed to fetch prompt');
    const data = await response.json();
    return data.prompt;
  }

  async updatePrompt(id: string, promptContent: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/agents/${id}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptContent })
    });
    if (!response.ok) throw new Error('Failed to update prompt');
  }

  async getLogs(id: string): Promise<LogEntry[]> {
    const response = await fetch(`${API_URL}/api/agents/${id}/logs`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data = await response.json();
    return data.logs;
  }

  async getOllamaModels(): Promise<string[]> {
    const response = await fetch(`${API_URL}/api/ollama/models`);
    if (!response.ok) throw new Error('Failed to fetch Ollama models');
    const data = await response.json();
    return data.models.map((model: any) => model.name);
  }

  async openAgentDirectory(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/agents/${id}/open-directory`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to open directory');
  }

  // Copilot CLI Agent endpoints
  async getAllCopilotAgents(): Promise<CopilotAgent[]> {
    const response = await fetch(`${API_URL}/api/copilot-agents`);
    if (!response.ok) throw new Error('Failed to fetch Copilot agents');
    return response.json();
  }

  async createCopilotAgent(data: CreateCopilotAgentRequest): Promise<CopilotAgent> {
    const response = await fetch(`${API_URL}/api/copilot-agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create Copilot agent' }));
      throw new Error(error.error || 'Failed to create Copilot agent');
    }
    return response.json();
  }

  async getCopilotAgent(id: string): Promise<CopilotAgent> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}`);
    if (!response.ok) throw new Error('Failed to fetch Copilot agent');
    return response.json();
  }

  async getCopilotPrompt(id: string): Promise<string> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}/prompt`);
    if (!response.ok) throw new Error('Failed to fetch prompt');
    const data = await response.json();
    return data.prompt;
  }

  async updateCopilotPrompt(id: string, promptContent: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptContent })
    });
    if (!response.ok) throw new Error('Failed to update prompt');
  }

  async startCopilotAgent(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}/start`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to start Copilot agent');
  }

  async stopCopilotAgent(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}/stop`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to stop Copilot agent');
  }

  async deleteCopilotAgent(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete Copilot agent' }));
      throw new Error(error.error || 'Failed to delete Copilot agent');
    }
  }

  async getCopilotLogs(id: string): Promise<LogEntry[]> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}/logs`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data = await response.json();
    return data.logs;
  }

  async openCopilotAgentDirectory(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/copilot-agents/${id}/open-directory`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to open directory');
  }

  async getCopilotStatus(): Promise<{ installed: boolean }> {
    const response = await fetch(`${API_URL}/api/copilot/status`);
    if (!response.ok) throw new Error('Failed to check Copilot status');
    return response.json();
  }

  async getCopilotModels(): Promise<string[]> {
    const response = await fetch(`${API_URL}/api/copilot/models`);
    if (!response.ok) throw new Error('Failed to fetch Copilot models');
    const data = await response.json();
    return data.models;
  }
}

export default new ApiService();
