import React, { useEffect } from 'react';

interface EmptyStateProps {
  onCreateThread: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateThread }) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or if it's a modifier key
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }
      
      // Only handle alphanumeric keys and punctuation
      if (e.key.length === 1) {
        onCreateThread();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onCreateThread]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <p className="text-lg">Select a thread or create a new one</p>
      <p className="text-sm mt-2">Use the sidebar to manage your notes</p>
      <p className="text-sm mt-4 text-gray-400">Just start typing to create a new thread</p>
    </div>
  );
};

export default EmptyState; 