import React from 'react';
import { Trash2, Star } from 'lucide-react';
import type { Thread } from '../types';

interface ThreadListProps {
  threads: Thread[];
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onToggleStar: (threadId: string) => void;
}

export default function ThreadList({ threads, onSelect, onDelete, onToggleStar }: ThreadListProps) {
  // Sort threads: starred first, then by updatedAt
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {sortedThreads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`group flex items-center justify-between p-3 bg-white rounded-lg border transition-all cursor-pointer ${
              thread.starred
                ? 'border-blue-200 hover:border-blue-500 shadow-sm'
                : 'border-gray-200 hover:border-blue-500'
            }`}
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 truncate">
                {thread.title || 'Untitled Thread'}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(thread.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(thread.id);
                }}
                className={`p-1.5 rounded-full transition-all ${
                  thread.starred
                    ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                    : 'text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
                }`}
                title={thread.starred ? 'Unstar thread' : 'Star thread'}
              >
                {thread.starred ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(thread.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete thread"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
