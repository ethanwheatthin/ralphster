import React, { useState, useEffect } from 'react';
import { CopilotAgent, CreateCopilotAgentRequest, LogEntry } from '../types';
import ApiService from '../services/api';
import { Plus, Play, Square, Trash2, Edit2, Terminal, Folder, RefreshCw } from 'lucide-react';
import './CopilotAgentManager.css';

// Allowed Copilot CLI model options (whitelist)
const ALLOWED_MODELS = [
  'claude-sonnet-4.5',
  'claude-haiku-4.5',
  'claude-opus-4.5',
  'claude-sonnet-4',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex',
  'gpt-5.2',
  'gpt-5.1',
  'gpt-5',
  'gpt-5.1-codex-mini',
  'gpt-5-mini',
  'gpt-4.1',
  'gemini-3-pro-preview'
];

const CopilotAgentManager: React.FC = () => {
  const [agents, setAgents] = useState<CopilotAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copilotInstalled, setCopilotInstalled] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<CopilotAgent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    checkCopilotStatus();
    
    // Set up socket connection for real-time updates
    const socket = ApiService.connectSocket();
    
    socket.on('copilot-agent:created', (agent: CopilotAgent) => {
      setAgents(prev => [...prev, agent]);
    });

    socket.on('copilot-agent:started', (agent: CopilotAgent) => {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    });

    socket.on('copilot-agent:stopped', (agent: CopilotAgent) => {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    });

    socket.on('copilot-agent:stopping', (agent: CopilotAgent) => {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    });

    socket.on('copilot-agent:iteration', ({ id, iteration }: { id: string; iteration: number }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, currentIteration: iteration } : a
      ));
    });

    socket.on('copilot-agent:completed', ({ id, iterations }: { id: string; iterations: number }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'stopped' as const, completed: true, totalIterations: iterations } : a
      ));
    });

    socket.on('copilot-agent:deleted', ({ id }: { id: string }) => {
      setAgents(prev => prev.filter(a => a.id !== id));
    });

    return () => {
      ApiService.disconnectSocket();
    };
  }, []);

  const checkCopilotStatus = async () => {
    try {
      const status = await ApiService.getCopilotStatus();
      setCopilotInstalled(status.installed);
    } catch (err) {
      console.error('Failed to check Copilot status:', err);
    }
  };

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAllCopilotAgents();
      setAgents(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (data: CreateCopilotAgentRequest) => {
    try {
      await ApiService.createCopilotAgent(data);
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartAgent = async (id: string) => {
    try {
      await ApiService.startCopilotAgent(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStopAgent = async (id: string) => {
    try {
      await ApiService.stopCopilotAgent(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!window.confirm(`Delete agent "${name}"?`)) return;

    try {
      await ApiService.deleteCopilotAgent(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditAgent = (agent: CopilotAgent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const handleViewLogs = (agent: CopilotAgent) => {
    setSelectedAgent(agent);
    setShowLogsModal(true);
  };

  const handleOpenDirectory = async (id: string) => {
    try {
      await ApiService.openCopilotAgentDirectory(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="copilot-agent-manager">
        <div className="loading">Loading Copilot agents...</div>
      </div>
    );
  }

  return (
    <div className="copilot-agent-manager">
      <div className="header">
        <h2>🤖 Copilot CLI Agents</h2>
        <div className="header-actions">
          {!copilotInstalled && (
            <div className="warning">
              ⚠️ Copilot CLI not installed
            </div>
          )}
          <button className="btn-refresh" onClick={loadAgents} title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Create Agent
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {!copilotInstalled && (
        <div className="install-instructions">
          <h3>Install GitHub Copilot CLI</h3>
          <p>
            To use Copilot agents, you need to have GitHub Copilot CLI installed:
          </p>
          <code>npm install -g @githubnext/github-copilot-cli</code>
          <p>Then authenticate: <code>github-copilot-cli auth login</code></p>
        </div>
      )}

      <div className="agents-grid">
        {agents.length === 0 ? (
          <div className="empty-state">
            <p>No Copilot CLI agents yet.</p>
            <p className="hint">
              Each agent uses the ralph-wiggum Copilot agent with a custom prompt.
            </p>
            <button onClick={() => setShowCreateModal(true)}>
              Create your first agent
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={() => handleStartAgent(agent.id)}
              onStop={() => handleStopAgent(agent.id)}
              onDelete={() => handleDeleteAgent(agent.id, agent.name)}
              onEdit={() => handleEditAgent(agent)}
              onViewLogs={() => handleViewLogs(agent)}
              onOpenDirectory={() => handleOpenDirectory(agent.id)}
              disabled={!copilotInstalled}
            />
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateAgent}
        />
      )}

      {showEditModal && selectedAgent && (
        <EditAgentModal
          agent={selectedAgent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAgent(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedAgent(null);
          }}
        />
      )}

      {showLogsModal && selectedAgent && (
        <LogsModal
          agent={selectedAgent}
          onClose={() => {
            setShowLogsModal(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
};

// Agent Card Component
interface AgentCardProps {
  agent: CopilotAgent;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onViewLogs: () => void;
  onOpenDirectory: () => void;
  disabled: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onStart,
  onStop,
  onDelete,
  onEdit,
  onViewLogs,
  onOpenDirectory,
  disabled
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#10b981';
      case 'stopped': return '#6b7280';
      case 'stopping': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '⚫';
      case 'stopping': return '🟡';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className="agent-card">
      <div className="agent-header">
        <div className="agent-title">
          <span className="status-icon">{getStatusIcon(agent.status)}</span>
          <h3>{agent.name}</h3>
        </div>
        <div className="agent-status" style={{ color: getStatusColor(agent.status) }}>
          {agent.status.toUpperCase()}
        </div>
      </div>

      <div className="agent-details">
        <div className="detail-row">
          <span className="label">Model:</span>
          <span className="value model">{agent.model}</span>
        </div>
        <div className="detail-row">
          <span className="label">Strategy:</span>
          <span className="value">Loop-based (PRD + Progress)</span>
        </div>
        <div className="detail-row">
          <span className="label">Iteration:</span>
          <span className="value">
            {agent.currentIteration}
            {agent.maxIterations > 0 && ` / ${agent.maxIterations}`}
            {agent.completed && ' ✅'}
          </span>
        </div>
        {agent.completed && (
          <div className="detail-row completion-badge">
            <span className="label">Status:</span>
            <span className="value" style={{ color: '#10b981', fontWeight: 'bold' }}>
              🎉 COMPLETE ({agent.totalIterations} iterations)
            </span>
          </div>
        )}
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">{new Date(agent.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="agent-actions">
        {agent.status === 'stopped' || agent.status === 'error' ? (
          <button className="btn btn-start" onClick={onStart} disabled={disabled}>
            <Play size={16} />
            Start
          </button>
        ) : (
          <button 
            className="btn btn-stop" 
            onClick={onStop} 
            disabled={agent.status === 'stopping'}
          >
            <Square size={16} />
            {agent.status === 'stopping' ? 'Stopping...' : 'Stop'}
          </button>
        )}
        
        <button className="btn btn-logs" onClick={onViewLogs}>
          <Terminal size={16} />
          Logs
        </button>
        
        <button className="btn btn-folder" onClick={onOpenDirectory}>
          <Folder size={16} />
          Folder
        </button>
        
        <button className="btn btn-edit" onClick={onEdit}>
          <Edit2 size={16} />
          Edit
        </button>
        
        <button className="btn btn-delete" onClick={onDelete}>
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
};

// Create Agent Modal
interface CreateAgentModalProps {
  onClose: () => void;
  onCreate: (data: CreateCopilotAgentRequest) => void;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateCopilotAgentRequest>({
    name: '',
    model: 'gpt-5-mini',
    promptContent: `# Ralph Agent Task\n\n## Task Description\n\nDescribe your task here...\n\n## Requirements\n\n- Requirement 1\n- Requirement 2\n\n## Constraints\n\n- Keep code simple and maintainable\n- Write tests\n`,
    maxIterations: 0,
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
      try {
        const models = await ApiService.getCopilotModels();
        // Prefer the intersection of remotely-provided models and our allowed whitelist
        const filtered = ALLOWED_MODELS.filter(m => models.includes(m));
        setAvailableModels(filtered.length > 0 ? filtered : ALLOWED_MODELS);
      } catch (error) {
        console.error('Failed to load models, falling back to whitelist:', error);
        setAvailableModels(ALLOWED_MODELS);
      } finally {
        setLoadingModels(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Create Copilot CLI Agent</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Agent Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Code Reviewer"
              required
            />
            <small>A descriptive name for this agent</small>
          </div>

          <div className="form-group">
            <label htmlFor="model">AI Model *</label>
            {loadingModels ? (
              <input type="text" value="Loading models..." disabled />
            ) : (
              <select
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
            <small>All agents use the ralph-wiggum Copilot agent</small>
          </div>

          <div className="form-group">
            <label htmlFor="maxIterations">Max Iterations</label>
            <input
              id="maxIterations"
              type="number"
              min="0"
              value={formData.maxIterations}
              onChange={(e) => setFormData({ ...formData, maxIterations: parseInt(e.target.value) || 0 })}
            />
            <small>0 = unlimited iterations</small>
          </div>

          <div className="form-group">
            <label htmlFor="promptContent">Task Prompt *</label>
            <textarea
              id="promptContent"
              value={formData.promptContent}
              onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
              placeholder="Describe the task for the Ralph Wiggum agent to perform..."
              required
              rows={10}
            />
            <small>This will be saved as PROMPT.md in the agent's workspace</small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Agent Modal
interface EditAgentModalProps {
  agent: CopilotAgent;
  onClose: () => void;
  onSave: () => void;
}

const EditAgentModal: React.FC<EditAgentModalProps> = ({ agent, onClose, onSave }) => {
  const [promptContent, setPromptContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const prompt = await ApiService.getCopilotPrompt(agent.id);
        setPromptContent(prompt);
      } catch (error) {
        console.error('Failed to load prompt:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPrompt();
  }, [agent.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await ApiService.updateCopilotPrompt(agent.id, promptContent);
      onSave();
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Agent: {agent.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading prompt...</div>
          ) : (
            <div className="form-group">
              <label htmlFor="promptContent">Task Prompt (PROMPT.md)</label>
              <textarea
                id="promptContent"
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                rows={20}
                className="code-textarea"
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Logs Modal
interface LogsModalProps {
  agent: CopilotAgent;
  onClose: () => void;
}

const LogsModal: React.FC<LogsModalProps> = ({ agent, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await ApiService.getCopilotLogs(agent.id);
        setLogs(data);
      } catch (error) {
        console.error('Failed to load logs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadLogs();
    
    const socket = ApiService.connectSocket();
    socket.on('copilot-agent:log', ({ id, log }: { id: string; log: LogEntry }) => {
      if (id === agent.id) {
        setLogs(prev => [...prev, log]);
      }
    });

    return () => {
      socket.off('copilot-agent:log');
    };
  }, [agent.id]);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogClass = (type: string) => {
    return `log-entry log-${type}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Logs: {agent.name}</h2>
          <div className="log-controls">
            <label>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="logs-container">
          {loading ? (
            <div className="loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="empty-logs">No logs yet</div>
          ) : (
            <>
              {logs.map((log, index) => (
                <div key={index} className={getLogClass(log.type)}>
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopilotAgentManager;
