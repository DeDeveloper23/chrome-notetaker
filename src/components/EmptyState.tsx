import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <p className="text-lg">Select a thread or create a new one</p>
      <p className="text-sm mt-2">Use the sidebar to manage your notes</p>
    </div>
  );
};

export default EmptyState; 