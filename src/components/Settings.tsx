import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Moon, Sun } from 'lucide-react';
import type { Settings as SettingsType, GeminiModel } from '../types';
import { GEMINI_MODELS } from '../types';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Theme Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Appearance
            </label>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon size={20} className="text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun size={20} className="text-gray-700 dark:text-gray-300" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                  theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Google AI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter your API key"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get your API key from the{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Gemini Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {GEMINI_MODELS.find(model => model.value === selectedModel)?.description}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleSubmit}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                showSuccess 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900' 
                  : hasChanges
                    ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
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
