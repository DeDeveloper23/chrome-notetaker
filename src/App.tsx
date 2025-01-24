/// <reference types="chrome"/>
import React, { useState, useEffect } from 'react';
import { Search, Plus, Settings as SettingsIcon, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import type { Thread, Settings as SettingsType } from './types';
import ThreadList from './components/ThreadList';
import ThreadView from './components/ThreadView';
import Settings from './components/Settings';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsType>({
    apiKey: '',
    selectedModel: 'gemini-1.5-flash',
    darkMode: false
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [deletedThread, setDeletedThread] = useState<{ thread: Thread; timeoutId: NodeJS.Timeout } | null>(null);

  useEffect(() => {
    // Load threads from chrome.storage.local
    chrome.storage.local.get(['threads', 'settings'], (result) => {
      if (result.threads) {
        setThreads(result.threads);
      }
      if (result.settings) {
        setSettings(result.settings);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ threads });
  }, [threads]);

  useEffect(() => {
    chrome.storage.local.set({ settings });
  }, [settings]);

  const handleUpdateThread = (updatedThread: Thread) => {
    setThreads(threads.map(thread => 
      thread.id === updatedThread.id ? updatedThread : thread
    ));
  };

  const handleCreateThread = () => {
    const timestamp = new Date().toISOString();
    const newThread: Thread = {
      id: crypto.randomUUID(),
      title: 'New Thread',
      notes: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setThreads([newThread, ...threads]);
    setSelectedThreadId(newThread.id);
  };

  const handleDeleteThread = (threadId: string) => {
    // Clear any existing delete timeout
    if (deletedThread?.timeoutId) {
      clearTimeout(deletedThread.timeoutId);
    }

    // Find the thread to be deleted
    const threadToDelete = threads.find(t => t.id === threadId);
    if (!threadToDelete) return;

    // Remove thread from the list
    setThreads(threads.filter(thread => thread.id !== threadId));
    if (selectedThreadId === threadId) {
      setSelectedThreadId(null);
    }

    // Set up deletion timeout
    const timeoutId = setTimeout(() => {
      setDeletedThread(null);
      // Actually persist the deletion to storage here
      chrome.storage.local.set({ threads: threads.filter(t => t.id !== threadId) });
    }, 4000);

    // Store the deleted thread and timeout
    setDeletedThread({ thread: threadToDelete, timeoutId });
  };

  const handleUndoDelete = () => {
    if (deletedThread) {
      // Clear the deletion timeout
      clearTimeout(deletedThread.timeoutId);
      
      // Restore the thread
      setThreads(prevThreads => [...prevThreads, deletedThread.thread]);
      
      // Clear the deleted thread state
      setDeletedThread(null);
    }
  };

  const selectedThread = threads.find(thread => thread.id === selectedThreadId);

  const filteredThreads = threads.filter(thread => 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.notes.some(note => 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const AppContent = () => (
    <div className="w-[800px] h-[600px] bg-white dark:bg-gray-900 flex overflow-hidden">
      <div 
        className={`relative transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${
          isSidebarExpanded ? 'w-[300px]' : 'w-[60px] group hover:w-[300px]'
        }`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className={`h-full flex flex-col ${isSidebarExpanded ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'} transition-opacity duration-300`}>
          <header className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white whitespace-nowrap">Notes</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateThread}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Plus size={20} />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <SettingsIcon size={20} />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </header>
          <ThreadList
            threads={filteredThreads}
            onSelect={setSelectedThreadId}
            onDelete={handleDeleteThread}
          />
        </div>
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 z-10 ${
            isSidebarExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity duration-300`}
        >
          {isSidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div className="flex-1 flex flex-row min-w-0">
        <div className="flex-1 relative min-w-0">
          {showSettings ? (
            <Settings
              settings={settings}
              onUpdate={setSettings}
              onClose={() => setShowSettings(false)}
            />
          ) : selectedThread ? (
            <ThreadView
              thread={selectedThread}
              onBack={() => setSelectedThreadId(null)}
              onUpdate={handleUpdateThread}
              apiKey={settings.apiKey}
              selectedModel={settings.selectedModel}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p className="text-lg">Select a thread or create a new one</p>
              <p className="text-sm mt-2">Use the sidebar to manage your notes</p>
            </div>
          )}

          {/* Undo Delete Notification */}
          {deletedThread && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-300 ease-in-out">
              <span>Thread deleted</span>
              <button
                onClick={handleUndoDelete}
                className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Undo2 size={14} />
                <span>Undo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
