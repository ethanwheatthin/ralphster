export interface Agent {
  id: string;
  name: string;
  model: string;
  maxIterations: number;
  status: 'running' | 'stopped' | 'stopping' | 'error' | 'initializing';
  currentIteration: number;
  createdAt: string;
  startedAt?: string;
  stoppedAt?: string;
  workspaceDir: string;
  statusMessage?: string;
}

export interface CopilotAgent {
  id: string;
  name: string;
  model: string;
  promptContent: string;
  maxIterations: number;
  status: 'running' | 'stopped' | 'stopping' | 'error';
  currentIteration: number;
  createdAt: string;
  startedAt?: string;
  stoppedAt?: string;
  workspaceDir: string;
  completed?: boolean;
  totalIterations?: number;
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

export interface CreateCopilotAgentRequest {
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
