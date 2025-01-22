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
    <div className="flex-1 overflow-y-auto">
      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>No notes yet</p>
          <p className="text-sm">Create a new thread to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="group flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(thread.id)}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {thread.title}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {thread.notes[0]?.content.slice(0, 60) || 'Empty thread'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(thread.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(thread.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}