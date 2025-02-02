import React from 'react';
import { Command } from 'lucide-react';
import { ShortcutAction, formatShortcut } from '../utils/shortcuts';

interface QuickActionsProps {
  shortcuts: ShortcutAction[];
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickActions({ shortcuts, isOpen, onClose }: QuickActionsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-apple-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-apple-gray-700">
          <div className="flex items-center gap-2">
            <Command size={20} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-apple-gray-700 rounded-lg group"
            >
              <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-apple-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded border border-gray-200 dark:border-apple-gray-600 font-mono group-hover:border-gray-300 dark:group-hover:border-apple-gray-500 transition-colors">
                {formatShortcut(shortcut.key, shortcut.modifier)}
              </kbd>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 dark:bg-apple-gray-700/50 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Press {formatShortcut('k', shortcuts[0].modifier)} to open Quick Actions
        </div>
      </div>
    </div>
  );
} 
