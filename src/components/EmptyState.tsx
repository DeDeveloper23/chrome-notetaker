import React, { useEffect, useRef } from 'react';

type EmptyStateProps = {
  onCreateThread: (initialChar?: string) => void;
};

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateThread }) => {
  const hasCreatedThread = useRef(false);

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
        if (!hasCreatedThread.current) {
          hasCreatedThread.current = true;
          onCreateThread(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onCreateThread]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center select-none">
      <div 
        className="w-[120px] h-[120px] mb-8 bg-contain bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/gourd.png")',
          filter: 'invert(80%) sepia(30%) saturate(681%) hue-rotate(346deg) brightness(93%) contrast(92%)'
        }}
      />
      <p className="text-xl font-medium">Type Away</p>
      <p className="text-sm mt-2 text-gray-400">Watch your thoughts come to life</p>
    </div>
  );
};

export default EmptyState; 
