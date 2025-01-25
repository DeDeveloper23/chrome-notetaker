import React, { useEffect, useRef } from 'react';

interface EmptyStateProps {
  onCreateThread: (initialText?: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateThread }) => {
  const keyBuffer = useRef<string[]>([]);
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
          // Focus the textarea after a short delay to allow ThreadView to mount
          setTimeout(() => {
            const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Start typing your note..."]');
            if (textarea) {
              textarea.focus();
              // Place cursor at the end
              textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            }
          }, 50);
        } else {
          keyBuffer.current.push(e.key);
          // Store the buffered keys in local storage for ThreadView to pick up
          chrome.storage.local.set({ 'buffered_keys': keyBuffer.current.join('') });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      // Clear the buffer when component unmounts
      chrome.storage.local.remove(['buffered_keys']);
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