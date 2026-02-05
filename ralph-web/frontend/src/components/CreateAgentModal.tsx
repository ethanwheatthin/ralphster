import React, { useState, useEffect } from 'react';
import { CreateAgentRequest } from '../types';
import ApiService from '../services/api';
import { X } from 'lucide-react';
import './CreateAgentModal.css';

interface CreateAgentModalProps {
  onClose: () => void;
  onCreate: (data: CreateAgentRequest) => void;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: '',
    model: 'qwen3-coder',
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
      const models = await ApiService.getOllamaModels();
      setAvailableModels(models);
      if (models.length > 0 && !formData.model) {
        setFormData(prev => ({ ...prev, model: models[0] }));
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    onClose(); // Close modal immediately after initiating creation
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <img src="/icons/icons8-ralph-48.png" alt="Ralph" style={{ width: 24, height: 24, verticalAlign: 'middle', marginRight: 8 }} />
            Create New Ralph Agent
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Agent Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Agent"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="model">Ollama Model *</label>
            {loadingModels ? (
              <input
                id="model"
                type="text"
                value="Loading models..."
                disabled
              />
            ) : availableModels.length > 0 ? (
              <select
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  id="model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., qwen3-coder, glm-4.7, gpt-oss:20b"
                  required
                />
                <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  ⚠️ No models found. Make sure Ollama is running and has models installed.
                </small>
              </>
            )}
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Popular models: qwen3-coder, glm-4.7, gpt-oss:20b, deepseek-coder
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="maxIterations">Max Iterations (0 = infinite)</label>
            <input
              id="maxIterations"
              type="number"
              min="0"
              value={formData.maxIterations}
              onChange={(e) => setFormData({ ...formData, maxIterations: parseInt(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="promptContent">Task Description (PROMPT.md) *</label>
            <textarea
              id="promptContent"
              value={formData.promptContent}
              onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
              rows={12}
              placeholder="Describe what you want Ralph to build..."
              required
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              💡 A structured PRD (plans/prd.json) and progress.txt will be auto-generated from this prompt.
              Ralph will work iteratively using these files with Ollama (128k context, refreshed each loop).
            </small>
          </div>

          <div className="form-actions">
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

export default CreateAgentModal;
