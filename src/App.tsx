/// <reference types="chrome"/>
import React, { useState, useEffect } from 'react';
import { Search, Plus, Settings as SettingsIcon, ChevronLeft, ChevronRight, Undo2, Command } from 'lucide-react';
import type { Thread, Settings as SettingsType } from './types';
import ThreadList from './components/ThreadList';
import ThreadView from './components/ThreadView';
import Settings from './components/Settings';
import QuickActions from './components/QuickActions';
import EmptyState from './components/EmptyState';
import { ShortcutAction, handleShortcut, getModifierKey } from './utils/shortcuts';

function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsType>({
    apiKey: '',
    selectedModel: 'gemini-1.5-flash'
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [deletedThread, setDeletedThread] = useState<{ thread: Thread; timeoutId: NodeJS.Timeout } | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

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

  const handleCreateThread = (initialChar?: string) => {
    const timestamp = new Date().toISOString();
    const newThread: Thread = {
      id: crypto.randomUUID(),
      title: 'New Thread',
      notes: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      starred: false,
    };
    setThreads([newThread, ...threads]);
    setSelectedThreadId(newThread.id);
    
    // If there's an initial character, store it in chrome.storage
    if (initialChar) {
      chrome.storage.local.set({ 'buffered_keys': initialChar });
    }
  };

  const handleCreateThreadClick = () => {
    handleCreateThread();
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

  const handleToggleStar = (threadId: string) => {
    setThreads(threads.map(thread => 
      thread.id === threadId
        ? { ...thread, starred: !thread.starred, updatedAt: new Date().toISOString() }
        : thread
    ));
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

  // Define shortcuts after function declarations
  const shortcuts: ShortcutAction[] = [
    {
      key: 'k',
      description: 'Show Quick Actions',
      modifier: getModifierKey(),
      action: () => setShowQuickActions(true)
    },
    {
      key: 'n',
      description: 'New Thread',
      modifier: getModifierKey(),
      action: handleCreateThreadClick
    },
    {
      key: ',',
      description: 'Open Settings',
      modifier: getModifierKey(),
      action: () => setShowSettings(true)
    },
    {
      key: 'f',
      description: 'Search Notes',
      modifier: getModifierKey(),
      action: () => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus()
    },
    {
      key: 'b',
      description: 'Go Back to Thread List',
      modifier: getModifierKey(),
      action: () => setSelectedThreadId(null)
    }
  ];

  // Add keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleShortcut(e, shortcuts);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const selectedThread = threads.find(thread => thread.id === selectedThreadId);

  const filteredThreads = threads.filter(thread => 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.notes.some(note => 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="w-[800px] h-[600px] bg-white flex overflow-hidden">
      <div 
        className={`relative transition-all duration-300 ease-in-out border-r border-gray-200 flex-shrink-0 ${
          isSidebarExpanded ? 'w-[300px]' : 'w-[60px] group hover:w-[300px]'
        }`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className={`h-full flex flex-col ${isSidebarExpanded ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'} transition-opacity duration-300`}>
          <header className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">Notes</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateThreadClick}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 relative group"
                  title="New Thread"
                >
                  <Plus size={20} />
                  <span className="absolute right-0 top-full mt-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    {shortcuts[1].modifier === 'cmd' ? '⌘' : 'Ctrl'} + N
                  </span>
                </button>
                <button
                  onClick={() => setShowQuickActions(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 relative group"
                  title="Quick Actions"
                >
                  <Command size={20} />
                  <span className="absolute right-0 top-full mt-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    {shortcuts[0].modifier === 'cmd' ? '⌘' : 'Ctrl'} + K
                  </span>
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 relative group"
                  title="Settings"
                >
                  <SettingsIcon size={20} />
                  <span className="absolute right-0 top-full mt-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    {shortcuts[2].modifier === 'cmd' ? '⌘' : 'Ctrl'} + ,
                  </span>
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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </header>
          <ThreadList
            threads={filteredThreads}
            onSelect={setSelectedThreadId}
            onDelete={handleDeleteThread}
            onToggleStar={handleToggleStar}
          />
        </div>
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-gray-600 z-10 ${
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
              settings={settings}
              setShowSettings={setShowSettings}
              isThreadsSidebarHovered={isSidebarExpanded}
            />
          ) : (
            <EmptyState onCreateThread={handleCreateThread} />
          )}

          {/* Undo Delete Notification */}
          {deletedThread && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg transition-all duration-300 ease-in-out">
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

      <QuickActions
        shortcuts={shortcuts}
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
      />
    </div>
  );
}

export default App;
