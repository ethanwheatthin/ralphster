import React, { useState } from 'react';
import { Agent } from '../types';
import { Play, Square, Trash2, Edit2, Terminal } from 'lucide-react';
import './AgentCard.css';

interface AgentCardProps {
  agent: Agent;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onViewLogs: () => void;
  onEdit: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onStart,
  onStop,
  onDelete,
  onViewLogs,
  onEdit
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
          <span className="value">{agent.model}</span>
        </div>
        <div className="detail-row">
          <span className="label">Iteration:</span>
          <span className="value">
            {agent.currentIteration}
            {agent.maxIterations > 0 && ` / ${agent.maxIterations}`}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">{new Date(agent.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="agent-actions">
        {agent.status === 'stopped' || agent.status === 'error' ? (
          <button className="btn btn-start" onClick={onStart}>
            <Play size={16} />
            Start
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
        
        <button className="btn btn-edit" onClick={onEdit}>
          <Edit2 size={16} />
          Edit
        </button>
        
        <button 
          className="btn btn-delete" 
          onClick={onDelete}
          disabled={agent.status === 'running'}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
