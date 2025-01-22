/// <reference types="chrome"/>
import React from 'react';
import { useState, useEffect } from 'react';
import { Search, Plus, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Thread } from './types';
import ThreadList from './components/ThreadList';
import ThreadView from './components/ThreadView';
import Settings from './components/Settings';

function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useEffect(() => {
    // Load threads from chrome.storage.local
    chrome.storage.local.get(['threads', 'apiKey'], (result: { threads?: Thread[]; apiKey?: string }) => {
      if (result.threads) {
        setThreads(result.threads);
      }
      if (result.apiKey) {
        setApiKey(result.apiKey);
      }
    });
  }, []);

  const saveThreads = (updatedThreads: Thread[]) => {
    setThreads(updatedThreads);
    chrome.storage.local.set({ threads: updatedThreads });
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    chrome.storage.local.set({ apiKey: key });
  };

  const filteredThreads = threads.filter(thread => 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.notes.some(note => 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="w-[800px] h-[600px] bg-white flex">
      <div 
        className={`relative transition-all duration-300 ease-in-out border-r border-gray-200 ${
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
                  onClick={() => {
                    const newThread: Thread = {
                      id: crypto.randomUUID(),
                      title: 'New Thread',
                      notes: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    saveThreads([...threads, newThread]);
                    setSelectedThread(newThread.id);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                >
                  <Plus size={20} />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </header>
          <ThreadList
            threads={filteredThreads}
            onSelect={setSelectedThread}
            onDelete={(threadId) => {
              saveThreads(threads.filter(t => t.id !== threadId));
            }}
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

      <div className="flex-1">
        {showSettings ? (
          <Settings
            apiKey={apiKey}
            onSave={saveApiKey}
            onClose={() => setShowSettings(false)}
          />
        ) : selectedThread ? (
          <ThreadView
            thread={threads.find(t => t.id === selectedThread)!}
            onBack={() => setSelectedThread(null)}
            onUpdate={(updatedThread) => {
              const newThreads = threads.map(t => 
                t.id === updatedThread.id ? updatedThread : t
              );
              saveThreads(newThreads);
            }}
            apiKey={apiKey}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">Select a thread or create a new one</p>
            <p className="text-sm mt-2">Use the sidebar to manage your notes</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
