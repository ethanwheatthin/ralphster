import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { Play, Square, Trash2, Edit2, Terminal, Folder, File } from 'lucide-react';
import './AgentCard.css';

interface AgentCardProps {
  agent: Agent;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onViewLogs: () => void;
  onEdit: () => void;
  onOpenDirectory: () => void;
  onViewPRD: () => void;
}

const ralphQuotes = [
  "I'm a unitard!",
  "Me fail English? That's unpossible!",
  "My cat's breath smells like cat food.",
  "I bent my wookie.",
  "That's where I saw the leprechaun. He told me to burn things!",
  "I'm Idaho!",
  "My doctor said I wouldn't have so many nose bleeds if I kept my finger outta there.",
  "I dress myself!",
  "Hi, Super Nintendo Chalmers!",
  "I'm learnding!",
  "My parents won't let me use scissors.",
  "When I grow up, I want to be a principal or a caterpillar.",
  "Sleep! That's where I'm a viking!",
  "I found a moonroof!",
  "I'm in danger!",
  "The doctor said I wouldn't get so many nosebleeds if I kept my finger outta there.",
  "I eated the purple berries!",
  "Go banana!",
  "Mrs. Krabappel and Principal Skinner were in the closet making babies and I saw one of the babies and the baby looked at me!",
  "It tastes like... burning!"
];

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onStart,
  onStop,
  onDelete,
  onViewLogs,
  onEdit,
  onOpenDirectory,
  onViewPRD
}) => {
  const [ralphQuote, setRalphQuote] = useState('');

  useEffect(() => {
    // Set a random Ralph Wiggum quote when component mounts or iteration changes
    const randomQuote = ralphQuotes[Math.floor(Math.random() * ralphQuotes.length)];
    setRalphQuote(randomQuote);
  }, [agent.currentIteration]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#10b981';
      case 'stopped': return '#6b7280';
      case 'stopping': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'initializing': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '⚫';
      case 'stopping': return '🟡';
      case 'error': return '🔴';
      case 'initializing': return '🔵';
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
          <span className="value">{agent.model}</span>
        </div>
        <div className="detail-row">
          <span className="label">Iteration:</span>
          <span className="value">
            {agent.currentIteration}
            {agent.maxIterations > 0 && ` / ${agent.maxIterations}`}
          </span>
        </div>
        {agent.currentIteration > 0 && (
          <div className="detail-row ralph-quote">
            <span className="value" style={{ fontStyle: 'italic', color: '#f59e0b' }}>
              "{ralphQuote}"
            </span>
          </div>
        )}
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">{new Date(agent.createdAt).toLocaleString()}</span>
        </div>
        {agent.statusMessage && (
          <div className="detail-row status-message">
            <span className="label">Status:</span>
            <span className="value" style={{ fontStyle: 'italic', color: getStatusColor(agent.status) }}>
              {agent.statusMessage}
            </span>
          </div>
        )}
      </div>

      <div className="agent-actions flex layout-row layout-wrap layout-align-space-between-stretch">
        {agent.status === 'stopped' || agent.status === 'error' ? (
          <button className="btn btn-start" onClick={onStart}>
            <Play size={16} />
            Start
          </button>
        ) : agent.status === 'initializing' ? (
          <button className="btn btn-start" disabled>
            <Play size={16} />
            Initializing...
          </button>
        ) : (
          <button className="btn btn-stop" onClick={onStop} disabled={agent.status === 'stopping'}>
            <Square size={16} />
            {agent.status === 'stopping' ? 'Stopping...' : 'Stop'}
          </button>
        )}
        
        <button className="btn btn-logs" onClick={onViewLogs}>
          <Terminal size={16} />
          Logs
        </button>
        
        <button className="btn btn-prd" onClick={onViewPRD}>
          <File size={16} />
          PRD
        </button>
        
        <button className="btn btn-folder" onClick={onOpenDirectory}>
          <Folder size={16} />
          Folder
        </button>
        
        <button className="btn btn-edit" onClick={onEdit}>
          <Edit2 size={16} />
          Edit
        </button>
        
        <button 
          className="btn btn-delete" 
          onClick={onDelete}
          disabled={agent.status === 'running' || agent.status === 'initializing'}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
