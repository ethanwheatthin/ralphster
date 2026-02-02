import { io, Socket } from 'socket.io-client';
import { Agent, LogEntry, CreateAgentRequest } from '../types';

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
    if (!response.ok) throw new Error('Failed to delete agent');
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
}

export default new ApiService();
