import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Cpu, HardDrive } from 'lucide-react';
import './ModelManager.css';

interface RunningModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  expires_at: string;
  size_vram: number;
}

interface AvailableModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface ModelManagerProps {
  onClose: () => void;
}

const ModelManager: React.FC<ModelManagerProps> = ({ onClose }) => {
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadModels = async () => {
    try {
      setRefreshing(true);
      
      const [runningRes, availableRes] = await Promise.all([
        fetch('http://localhost:5000/api/ollama/running'),
        fetch('http://localhost:5000/api/ollama/models')
      ]);

      const runningData = await runningRes.json();
      const availableData = await availableRes.json();

      setRunningModels(runningData.models || []);
      setAvailableModels(availableData.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadModels();
    const interval = setInterval(loadModels, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleUnload = async (modelName: string) => {
    if (!window.confirm(`Unload model "${modelName}" from memory?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/ollama/unload/${encodeURIComponent(modelName)}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadModels();
      } else {
        alert('Failed to unload model');
      }
    } catch (error) {
      console.error('Failed to unload model:', error);
      alert('Failed to unload model');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalVRAM = () => {
    return runningModels.reduce((sum, model) => sum + (model.size_vram || 0), 0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="model-manager" onClick={(e) => e.stopPropagation()}>
        <div className="model-header">
          <h2>🤖 Ollama Model Manager</h2>
          <div className="header-actions">
            <button 
              className="icon-btn" 
              onClick={loadModels} 
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            </button>
            <button className="icon-btn close" onClick={onClose} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="model-content">
          {loading ? (
            <div className="loading-state">Loading models...</div>
          ) : (
            <>
              {/* Running Models Section */}
              <div className="model-section">
                <div className="section-header">
                  <h3>
                    <Cpu size={20} />
                    Running Models ({runningModels.length})
                  </h3>
                  {runningModels.length > 0 && (
                    <div className="vram-usage">
                      <HardDrive size={16} />
                      VRAM: {formatBytes(getTotalVRAM())}
                    </div>
                  )}
                </div>
                
                {runningModels.length === 0 ? (
                  <div className="empty-state-small">No models currently loaded in memory</div>
                ) : (
                  <div className="model-list">
                    {runningModels.map((model, index) => (
                      <div key={index} className="model-item running">
                        <div className="model-info">
                          <div className="model-name">{model.name}</div>
                          <div className="model-details">
                            <span className="detail-badge">{model.details?.parameter_size || 'Unknown size'}</span>
                            <span className="detail-badge">{model.details?.quantization_level || 'Unknown quant'}</span>
                            <span className="detail-badge">VRAM: {formatBytes(model.size_vram || 0)}</span>
                          </div>
                        </div>
                        <button 
                          className="btn-unload"
                          onClick={() => handleUnload(model.name)}
                          title="Unload from memory"
                        >
                          <Trash2 size={16} />
                          Unload
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Models Section */}
              <div className="model-section">
                <div className="section-header">
                  <h3>
                    <HardDrive size={20} />
                    Available Models ({availableModels.length})
                  </h3>
                </div>
                
                {availableModels.length === 0 ? (
                  <div className="empty-state-small">No models installed</div>
                ) : (
                  <div className="model-list">
                    {availableModels.map((model, index) => {
                      const isRunning = runningModels.some(rm => rm.name === model.name);
                      return (
                        <div key={index} className={`model-item ${isRunning ? 'loaded' : ''}`}>
                          <div className="model-info">
                            <div className="model-name">
                              {model.name}
                              {isRunning && <span className="status-badge">Loaded</span>}
                            </div>
                            <div className="model-details">
                              <span className="detail-badge">{model.details?.parameter_size || 'Unknown size'}</span>
                              <span className="detail-badge">{formatBytes(model.size)}</span>
                              <span className="detail-badge">{model.details?.family || 'Unknown family'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelManager;
