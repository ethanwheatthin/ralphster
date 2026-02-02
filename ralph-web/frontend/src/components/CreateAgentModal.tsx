import React, { useState } from 'react';
import { CreateAgentRequest } from '../types';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🍩 Create New Ralph Agent</h2>
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
            <input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., qwen3-coder, glm-4.7, gpt-oss:20b"
              required
            />
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
            <label htmlFor="promptContent">Initial Prompt (PROMPT.md) *</label>
            <textarea
              id="promptContent"
              value={formData.promptContent}
              onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
              rows={12}
              placeholder="Describe what you want Ralph to build..."
              required
            />
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
