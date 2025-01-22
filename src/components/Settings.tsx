import React, { useState } from 'react';
import { ChevronLeft, Key } from 'lucide-react';

interface SettingsProps {
  apiKey: string;
  onSave: (apiKey: string) => void;
  onClose: () => void;
}

export default function Settings({ apiKey, onSave, onClose }: SettingsProps) {
  const [key, setKey] = useState(apiKey);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <div className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Gemini API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Get your API key from the{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <button
            onClick={() => {
              onSave(key);
              onClose();
            }}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}