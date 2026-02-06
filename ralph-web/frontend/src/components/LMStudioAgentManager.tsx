import React, { useState, useEffect } from 'react';
import { LMStudioAgent, CreateLMStudioAgentRequest, LogEntry } from '../types';
import ApiService from '../services/api';
import { Plus, Play, Square, Trash2, Edit2, Terminal, Folder, RefreshCw, FileText } from 'lucide-react';
import './CopilotAgentManager.css'; // reuse same styles

const LMStudioAgentManager: React.FC = () => {
  const [agents, setAgents] = useState<LMStudioAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lmstudioRunning, setLmstudioRunning] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<LMStudioAgent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    checkLMStudioStatus();

    const socket = ApiService.connectSocket();

    socket.on('lmstudio-agent:created', (agent: LMStudioAgent) => {
      setAgents(prev => [...prev, agent]);
    });

    socket.on('lmstudio-agent:started', (agent: LMStudioAgent) => {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    });

    socket.on('lmstudio-agent:stopped', (agent: LMStudioAgent) => {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    });

    socket.on('lmstudio-agent:stopping', ({ id }: { id: string }) => {
      setAgents(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'stopping' as const } : a
      ));
    });

    socket.on('lmstudio-agent:error', ({ id }: { id: string }) => {
      setAgents(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'error' as const } : a
      ));
    });

    socket.on('lmstudio-agent:iteration', ({ id, iteration }: { id: string; iteration: number }) => {
      setAgents(prev => prev.map(a =>
        a.id === id ? { ...a, currentIteration: iteration } : a
      ));
    });

    socket.on('lmstudio-agent:deleted', ({ id }: { id: string }) => {
      setAgents(prev => prev.filter(a => a.id !== id));
    });

    socket.on('lmstudio-agent:status', ({ id, status, statusMessage }: { id: string; status: string; statusMessage?: string }) => {
      setAgents(prev => prev.map(a =>
        a.id === id ? { ...a, status: status as LMStudioAgent['status'], statusMessage } : a
      ));
    });

    return () => {
      // Clean up socket listeners
      socket.off('lmstudio-agent:created');
      socket.off('lmstudio-agent:started');
      socket.off('lmstudio-agent:stopped');
      socket.off('lmstudio-agent:stopping');
      socket.off('lmstudio-agent:error');
      socket.off('lmstudio-agent:iteration');
      socket.off('lmstudio-agent:deleted');
      socket.off('lmstudio-agent:status');
    };
  }, []);

  const checkLMStudioStatus = async () => {
    try {
      const status = await ApiService.getLMStudioStatus();
      setLmstudioRunning(status.running);
    } catch (err) {
      console.error('Failed to check LM Studio status:', err);
    }
  };

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAllLMStudioAgents();
      setAgents(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (data: CreateLMStudioAgentRequest) => {
    try {
      await ApiService.createLMStudioAgent(data);
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartAgent = async (id: string) => {
    try {
      await ApiService.startLMStudioAgent(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStopAgent = async (id: string) => {
    try {
      await ApiService.stopLMStudioAgent(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!window.confirm(`Delete agent "${name}"?`)) return;
    try {
      await ApiService.deleteLMStudioAgent(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditAgent = (agent: LMStudioAgent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const handleViewLogs = (agent: LMStudioAgent) => {
    setSelectedAgent(agent);
    setShowLogsModal(true);
  };

  const handleOpenDirectory = async (id: string) => {
    try {
      await ApiService.openLMStudioAgentDirectory(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewPRD = async (id: string) => {
    try {
      await ApiService.openLMStudioAgentPRD(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="copilot-agent-manager">
        <div className="loading">Loading LM Studio agents...</div>
      </div>
    );
  }

  return (
    <div className="copilot-agent-manager">
      <div className="header">
        <h2>🖥️ LM Studio Agents</h2>
        <div className="header-actions">
          {!lmstudioRunning && (
            <div className="warning">
              ⚠️ LM Studio server not detected
            </div>
          )}
          <button className="btn-refresh" onClick={() => { loadAgents(); checkLMStudioStatus(); }} title="Refresh">
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

      {!lmstudioRunning && (
        <div className="install-instructions">
          <h3>Start LM Studio Server</h3>
          <p>
            Make sure LM Studio is running with its local server enabled on port 1234.
          </p>
          <p>You can enable the server from the <strong>Developer</strong> tab in LM Studio, or via:</p>
          <code>lms server start</code>
        </div>
      )}

      <div className="agents-grid">
        {agents.length === 0 ? (
          <div className="empty-state">
            <p>No LM Studio agents yet.</p>
            <p className="hint">
              Each agent uses an LM Studio model with tool-calling to work autonomously.
            </p>
            <button onClick={() => setShowCreateModal(true)}>
              Create your first agent
            </button>
          </div>
        ) : (
          agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={() => handleStartAgent(agent.id)}
              onStop={() => handleStopAgent(agent.id)}
              onDelete={() => handleDeleteAgent(agent.id, agent.name)}
              onEdit={() => handleEditAgent(agent)}
              onViewLogs={() => handleViewLogs(agent)}
              onOpenDirectory={() => handleOpenDirectory(agent.id)}
              onViewPRD={() => handleViewPRD(agent.id)}
              disabled={!lmstudioRunning}
            />
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateLMStudioAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateAgent}
        />
      )}

      {showEditModal && selectedAgent && (
        <EditModal
          agent={selectedAgent}
          onClose={() => { setShowEditModal(false); setSelectedAgent(null); }}
          onSave={() => { setShowEditModal(false); setSelectedAgent(null); }}
        />
      )}

      {showLogsModal && selectedAgent && (
        <LogsModal
          agent={selectedAgent}
          onClose={() => { setShowLogsModal(false); setSelectedAgent(null); }}
        />
      )}
    </div>
  );
};

// ─── Agent Card ────────────────────────────────────────────────

interface AgentCardProps {
  agent: LMStudioAgent;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onViewLogs: () => void;
  onOpenDirectory: () => void;
  onViewPRD: () => void;
  disabled: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent, onStart, onStop, onDelete, onEdit, onViewLogs, onOpenDirectory, onViewPRD, disabled
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#10b981';
      case 'stopped': return '#6b7280';
      case 'stopping': return '#f59e0b';
      case 'initializing': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '⚫';
      case 'stopping': return '🟡';
      case 'initializing': return '🔵';
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
          {(agent.status || 'unknown').toUpperCase()}
        </div>
      </div>

      <div className="agent-details">
        <div className="detail-row">
          <span className="label">Model:</span>
          <span className="value model">{agent.model}</span>
        </div>
        <div className="detail-row">
          <span className="label">Provider:</span>
          <span className="value">LM Studio</span>
        </div>
        <div className="detail-row">
          <span className="label">Iteration:</span>
          <span className="value">
            {agent.currentIteration}
            {agent.maxIterations > 0 && ` / ${agent.maxIterations}`}
          </span>
        </div>
        {agent.statusMessage && (
          <div className="detail-row">
            <span className="label">Info:</span>
            <span className="value" style={{ fontSize: '12px', color: '#9ca3af' }}>{agent.statusMessage}</span>
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
        ) : agent.status === 'initializing' ? (
          <button className="btn btn-start" disabled>
            ⏳ Initializing...
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

        <button className="btn btn-edit" onClick={onViewPRD}>
          <FileText size={16} />
          PRD
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

// ─── Create Modal ──────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreate: (data: CreateLMStudioAgentRequest) => void;
}

const CreateLMStudioAgentModal: React.FC<CreateModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateLMStudioAgentRequest>({
    name: '',
    model: '',
    promptContent: `# Ralph Agent Task\n\n## Task Description\n\nDescribe your task here...\n\n## Requirements\n\n- Requirement 1\n- Requirement 2\n\n## Constraints\n\n- Keep code simple and maintainable\n- Write tests\n`,
    maxIterations: 0
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const models = await ApiService.getLMStudioModels();
      setAvailableModels(models);
      if (models.length > 0 && !formData.model) {
        setFormData(prev => ({ ...prev, model: models[0] }));
      }
    } catch (error) {
      console.error('Failed to load LM Studio models:', error);
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
          <h2>🖥️ Create LM Studio Agent</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="lms-name">Agent Name *</label>
            <input
              id="lms-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My LM Studio Agent"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lms-model">LM Studio Model *</label>
            {loadingModels ? (
              <input type="text" value="Loading models..." disabled />
            ) : availableModels.length > 0 ? (
              <select
                id="lms-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  id="lms-model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., qwen2.5-7b-instruct"
                  required
                />
                <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  ⚠️ No models found. Make sure LM Studio server is running with a model loaded.
                </small>
              </>
            )}
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Models with tool-calling support (🔨 badge) work best: Qwen2.5-Instruct, Llama-3.1, Mistral
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="lms-maxIterations">Max Iterations (0 = unlimited)</label>
            <input
              id="lms-maxIterations"
              type="number"
              min="0"
              value={formData.maxIterations}
              onChange={(e) => setFormData({ ...formData, maxIterations: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lms-prompt">Task Description (PROMPT.md) *</label>
            <textarea
              id="lms-prompt"
              value={formData.promptContent}
              onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
              placeholder="Describe what you want Ralph to build..."
              required
              rows={10}
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              💡 A structured PRD and progress.txt will be auto-generated.
              Ralph will use LM Studio's function-calling API to iterate autonomously.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create Agent</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Modal ────────────────────────────────────────────────

interface EditModalProps {
  agent: LMStudioAgent;
  onClose: () => void;
  onSave: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ agent, onClose, onSave }) => {
  const [promptContent, setPromptContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const prompt = await ApiService.getLMStudioPrompt(agent.id);
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
      await ApiService.updateLMStudioPrompt(agent.id, promptContent);
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
              <label htmlFor="edit-prompt">Task Prompt (PROMPT.md)</label>
              <textarea
                id="edit-prompt"
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                rows={20}
                className="code-textarea"
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Logs Modal ────────────────────────────────────────────────

interface LogsModalProps {
  agent: LMStudioAgent;
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
        const data = await ApiService.getLMStudioLogs(agent.id);
        setLogs(data);
      } catch (error) {
        console.error('Failed to load logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();

    const socket = ApiService.connectSocket();
    socket.on('lmstudio-agent:log', ({ id, log }: { id: string; log: LogEntry }) => {
      if (id === agent.id) {
        setLogs(prev => [...prev, log]);
      }
    });

    return () => {
      socket.off('lmstudio-agent:log');
    };
  }, [agent.id]);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogClass = (type: string) => `log-entry log-${type}`;

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
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default LMStudioAgentManager;
