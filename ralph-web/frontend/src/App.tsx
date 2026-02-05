import React, { useState, useEffect } from 'react';
import { Agent, LogEntry, CreateAgentRequest, UpdateAgentRequest } from './types';
import ApiService from './services/api';
import AgentCard from './components/AgentCard';
import CreateAgentModal from './components/CreateAgentModal';
import EditAgentModal from './components/EditAgentModal';
import LogViewer from './components/LogViewer';
import ModelManager from './components/ModelManager';
import CopilotAgentManager from './components/CopilotAgentManager';
import { Plus, RefreshCw } from 'lucide-react';
import './App.css';

type Tab = 'ollama' | 'copilot';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('ollama');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);
  const [selectedAgentLogs, setSelectedAgentLogs] = useState<{ agent: Agent; logs: LogEntry[] } | null>(null);
  const [editingAgent, setEditingAgent] = useState<{ agent: Agent; prompt: string } | null>(null);

  useEffect(() => {
    loadAgents();
    connectWebSocket();

    return () => {
      ApiService.disconnectSocket();
    };
  }, []);

  const loadAgents = async () => {
    try {
      const data = await ApiService.getAllAgents();
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const socket = ApiService.connectSocket();

    socket.on('agents:list', (data: Agent[]) => {
      setAgents(data);
    });

    socket.on('agent:created', (agent: Agent) => {
      setAgents(prev => [...prev, agent]);
    });

    socket.on('agent:started', (agent: Agent) => {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    });

    socket.on('agent:stopped', ({ id }: { id: string }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'stopped' as const } : a
      ));
    });

    socket.on('agent:stopping', ({ id }: { id: string }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'stopping' as const } : a
      ));
    });

    socket.on('agent:error', ({ id }: { id: string }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'error' as const } : a
      ));
    });

    socket.on('agent:iteration', ({ id, iteration }: { id: string; iteration: number }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, currentIteration: iteration } : a
      ));
    });

    socket.on('agent:log', ({ id, log }: { id: string; log: LogEntry }) => {
      if (selectedAgentLogs && selectedAgentLogs.agent.id === id) {
        setSelectedAgentLogs(prev => 
          prev ? { ...prev, logs: [...prev.logs, log] } : null
        );
      }
    });

    socket.on('agent:deleted', ({ id }: { id: string }) => {
      setAgents(prev => prev.filter(a => a.id !== id));
      if (selectedAgentLogs?.agent.id === id) {
        setSelectedAgentLogs(null);
      }
    });

    socket.on('agent:status', ({ id, status, statusMessage }: { id: string; status: string; statusMessage?: string }) => {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: status as Agent['status'], statusMessage } : a
      ));
    });
  };

  const handleCreateAgent = async (data: CreateAgentRequest) => {
    try {
      await ApiService.createAgent(data);
      // Modal closes itself immediately after initiating creation
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Check console for details.');
    }
  };

  const handleStartAgent = async (id: string) => {
    try {
      await ApiService.startAgent(id);
    } catch (error) {
      console.error('Failed to start agent:', error);
      alert('Failed to start agent. Check console for details.');
    }
  };

  const handleStopAgent = async (id: string) => {
    try {
      await ApiService.stopAgent(id);
    } catch (error) {
      console.error('Failed to stop agent:', error);
      alert('Failed to stop agent. Check console for details.');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this agent? This cannot be undone.')) {
      return;
    }
    try {
      await ApiService.deleteAgent(id);
    } catch (error) {
      console.error('Failed to delete agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete agent: ${errorMessage}`);
    }
  };

  const handleViewLogs = async (agent: Agent) => {
    try {
      const logs = await ApiService.getLogs(agent.id);
      setSelectedAgentLogs({ agent, logs });
    } catch (error) {
      console.error('Failed to load logs:', error);
      alert('Failed to load logs. Check console for details.');
    }
  };

  const handleEditAgent = async (agent: Agent) => {
    try {
      const prompt = await ApiService.getPrompt(agent.id);
      setEditingAgent({ agent, prompt });
    } catch (error) {
      console.error('Failed to load agent data:', error);
      alert('Failed to load agent data. Check console for details.');
    }
  };

  const handleUpdateAgent = async (id: string, data: UpdateAgentRequest) => {
    try {
      await ApiService.updateAgent(id, data);
      await loadAgents();
      setEditingAgent(null);
      alert('Agent updated successfully!');
    } catch (error) {
      console.error('Failed to update agent:', error);
      alert('Failed to update agent. Check console for details.');
    }
  };

  const handleOpenDirectory = async (id: string) => {
    try {
      await ApiService.openAgentDirectory(id);
    } catch (error) {
      console.error('Failed to open directory:', error);
      // alert('Failed to open directory. Check console for details.');
    }
  };

  const handleViewPRD = async (id: string) => {
    try {
      await ApiService.openAgentPRD(id);
    } catch (error) {
      console.error('Failed to open PRD:', error);
      alert('Failed to open PRD file. Check console for details.');
    }
  };

  const runningCount = agents.filter(a => a.status === 'running').length;
  const stoppedCount = agents.filter(a => a.status === 'stopped').length;
  const initializingCount = agents.filter(a => a.status === 'initializing').length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>
            <img src="/icons/icons8-ralph-48.png" alt="Ralph" style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Ralph Agent Manager
          </h1>
          <p className="subtitle">Manage multiple autonomous AI coding agents</p>
        </div>
        <div className="header-tabs">
          <button
            className={`tab ${activeTab === 'ollama' ? 'active' : ''}`}
            onClick={() => setActiveTab('ollama')}
          >
            🦙 Ollama Agents
            {activeTab === 'ollama' && (
              <span className="tab-badge">{agents.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === 'copilot' ? 'active' : ''}`}
            onClick={() => setActiveTab('copilot')}
          >
            🤖 Copilot CLI Agents
          </button>
        </div>
            <div className="header-stats">
              <div className="stat">
                <span className="stat-value">{agents.length}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat running">
                <span className="stat-value">{runningCount}</span>
                <span className="stat-label">Running</span>
              </div>
              {initializingCount > 0 && (
                <div className="stat initializing">
                  <span className="stat-value">{initializingCount}</span>
                  <span className="stat-label">Initializing</span>
                </div>
              )}
              <div className="stat stopped">
                <span className="stat-value">{stoppedCount}</span>
                <span className="stat-label">Stopped</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={loadAgents} title="Refresh">
                <RefreshCw size={18} />
              </button>
              <button className="btn-models" onClick={() => setShowModelManager(true)}>
                🤖 Models
              </button>
              <button className="btn-create" onClick={() => setShowCreateModal(true)}>
                <Plus size={20} />
                New Agent
              </button>
            </div>
      </header>

      <main className="app-main">
        {activeTab === 'ollama' ? (
          <>
            {loading ? (
              <div className="loading">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><img src="/icons/icons8-ralph-48.png" alt="Ralph" style={{ width: 48, height: 48 }} /></div>
                <h2>No agents yet</h2>
                <p>Create your first Ralph agent to get started!</p>
                <button className="btn-create-large" onClick={() => setShowCreateModal(true)}>
                  <Plus size={24} />
                  Create Your First Agent
                </button>
              </div>
            ) : (
              <div className="agents-grid">
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onStart={() => handleStartAgent(agent.id)}
                    onStop={() => handleStopAgent(agent.id)}
                    onDelete={() => handleDeleteAgent(agent.id)}
                    onViewLogs={() => handleViewLogs(agent)}
                    onEdit={() => handleEditAgent(agent)}
                    onOpenDirectory={() => handleOpenDirectory(agent.id)}
                    onViewPRD={() => handleViewPRD(agent.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <CopilotAgentManager />
        )}
      </main>

      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateAgent}
        />
      )}

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent.agent}
          initialPrompt={editingAgent.prompt}
          onClose={() => setEditingAgent(null)}
          onUpdate={handleUpdateAgent}
        />
      )}

      {showModelManager && (
        <ModelManager
          onClose={() => setShowModelManager(false)}
        />
      )}

      {selectedAgentLogs && (
        <LogViewer
          agentId={selectedAgentLogs.agent.id}
          agentName={selectedAgentLogs.agent.name}
          logs={selectedAgentLogs.logs}
          onClose={() => setSelectedAgentLogs(null)}
        />
      )}
    </div>
  );
}

export default App;
