import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Thread } from '../types';

interface ThreadListProps {
  threads: Thread[];
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}

export default function ThreadList({ threads, onSelect, onDelete }: ThreadListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className="group flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer"
          >
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {thread.title || 'Untitled Thread'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(thread.updatedAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread.id);
              }}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete thread"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
