import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { X, Download, Trash } from 'lucide-react';
import './LogViewer.css';

interface LogViewerProps {
  agentId: string;
  agentName: string;
  logs: LogEntry[];
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ agentId, agentName, logs, onClose }) => {
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getLogClass = (type: string) => {
    switch (type) {
      case 'stdout': return 'log-stdout';
      case 'stderr': return 'log-stderr';
      case 'error': return 'log-error';
      case 'system': return 'log-system';
      default: return '';
    }
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.type}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ralph-${agentName}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="log-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="log-header">
          <h2>📋 Logs: {agentName}</h2>
          <div className="log-controls">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Logs</option>
              <option value="stdout">Output</option>
              <option value="stderr">Errors</option>
              <option value="system">System</option>
            </select>
            
            <label className="auto-scroll-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>

            <button className="icon-btn" onClick={downloadLogs} title="Download logs">
              <Download size={18} />
            </button>

            <button className="icon-btn close" onClick={onClose} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="log-content" ref={logContainerRef}>
          {filteredLogs.length === 0 ? (
            <div className="no-logs">No logs to display</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className={`log-entry ${getLogClass(log.type)}`}>
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="log-type">[{log.type}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>

        <div className="log-footer">
          <span>{filteredLogs.length} log entries</span>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
