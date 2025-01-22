import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import type { Settings as SettingsType, GeminiModel } from '../types';
import { GEMINI_MODELS } from '../types';

interface SettingsProps {
  onClose: () => void;
  onUpdate: (settings: SettingsType) => void;
  settings: SettingsType;
}

export default function Settings({ onClose, onUpdate, settings }: SettingsProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(settings.selectedModel || "gemini-1.5-flash");
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = () => {
    const updatedSettings: SettingsType = {
      apiKey,
      selectedModel
    };
    onUpdate(updatedSettings);
    setShowSuccess(true);
    
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    
    // Close settings after showing success for a moment
    successTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 1000);
  };

  const hasChanges = apiKey !== settings.apiKey || selectedModel !== settings.selectedModel;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* API Key Input */}
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              Google AI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your API key"
            />
            <p className="text-xs text-gray-500">
              Get your API key from the{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label htmlFor="model" className="block text-sm font-medium text-gray-700">
              Gemini Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {GEMINI_MODELS.find(model => model.value === selectedModel)?.description}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                showSuccess 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : hasChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {showSuccess ? (
                <>
                  <Check size={18} />
                  <span>Saved</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
