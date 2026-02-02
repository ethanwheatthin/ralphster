export interface Agent {
  id: string;
  name: string;
  model: string;
  maxIterations: number;
  status: 'running' | 'stopped' | 'stopping' | 'error';
  currentIteration: number;
  createdAt: string;
  startedAt?: string;
  stoppedAt?: string;
  workspaceDir: string;
}

export interface LogEntry {
  timestamp: string;
  type: 'stdout' | 'stderr' | 'system' | 'error';
  message: string;
}

export interface CreateAgentRequest {
  name: string;
  model: string;
  promptContent: string;
  maxIterations: number;
}

export interface UpdateAgentRequest {
  name: string;
  model: string;
  promptContent: string;
  maxIterations: number;
}
