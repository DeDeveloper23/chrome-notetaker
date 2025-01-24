import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Sparkles, Pencil, X, Pin, PinOff } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Thread, Note, GeminiModel } from '../types';

interface ThreadViewProps {
  thread: Thread;
  onBack: () => void;
  onUpdate: (thread: Thread) => void;
  apiKey: string;
  selectedModel: GeminiModel;
}

// Function to convert URLs in text to clickable links
const linkifyText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            chrome.tabs.create({ url: part });
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function ThreadView({ thread, onBack, onUpdate, apiKey, selectedModel }: ThreadViewProps) {
  const [title, setTitle] = useState(thread.title);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'title' | 'draft' | null>(null);
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft from storage when thread changes
  useEffect(() => {
    chrome.storage.local.get([`draft_${thread.id}`], (result) => {
      const draft = result[`draft_${thread.id}`];
      if (draft) {
        setCurrentNote(draft);
      } else {
        setCurrentNote('');
      }
    });
  }, [thread.id]);

  // Auto-save draft to storage
  useEffect(() => {
    if (!editingNoteId) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      if (currentNote.trim()) {
        autoSaveTimeoutRef.current = setTimeout(() => {
          chrome.storage.local.set({ [`draft_${thread.id}`]: currentNote });
          // Show saved indicator
          setSaveStatus('draft');
          // Clear the indicator after 2 seconds
          if (savedIndicatorTimeoutRef.current) {
            clearTimeout(savedIndicatorTimeoutRef.current);
          }
          savedIndicatorTimeoutRef.current = setTimeout(() => {
            setSaveStatus(null);
          }, 2000);
        }, 1500); // Auto-save after 1.5 seconds of no typing
      }
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, [currentNote, thread.id, editingNoteId]);

  // Update title when thread changes
  useEffect(() => {
    setTitle(thread.title);
  }, [thread.title]);

  // Handle title save on blur
  const handleTitleBlur = () => {
    if (title !== thread.title) {
      onUpdate({ ...thread, title });
      setSaveStatus('title');
      // Clear the indicator after 2 seconds
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    }
  };

  // Function to submit the note
  const submitNote = () => {
    if (!currentNote.trim()) return;

    const timestamp = new Date().toISOString();
    const newNoteObj: Note = {
      id: crypto.randomUUID(),
      content: currentNote.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const updatedThread = {
      ...thread,
      notes: [...thread.notes, newNoteObj],
      updatedAt: timestamp,
    };

    onUpdate(updatedThread);
    setCurrentNote('');
    // Clear the draft from storage
    chrome.storage.local.remove([`draft_${thread.id}`]);
  };

  const askAI = async (prompt: string) => {
    if (!prompt.trim() || !apiKey) return;

    setIsGenerating(true);
    console.log('Starting AI request with prompt:', prompt);
    console.log('Using model:', selectedModel);
    
    try {
      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(apiKey);
      console.log('Initialized Gemini API');
      
      const model = genAI.getGenerativeModel({ model: selectedModel });
      console.log('Got model instance');

      const timestamp = new Date().toISOString();
      const noteId = crypto.randomUUID();
      
      // Create initial note with the question
      const newNoteObj: Note = {
        id: noteId,
        content: `Q: ${prompt}\n\nA: Generating response...`,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Add the note to show the question immediately
      const updatedThread = {
        ...thread,
        notes: [...thread.notes, newNoteObj],
        updatedAt: timestamp,
      };
      onUpdate(updatedThread);
      console.log('Added initial note');

      // Prepare context from existing notes
      const notesContext = thread.notes
        .filter(note => note.id !== noteId) // Exclude the current question
        .map(note => note.content)
        .join('\n\n');
      
      // Format prompt for Flash model
      const promptText = `Context from existing notes:\n${notesContext}\n\nUser question: ${prompt}\n\nPlease provide a concise response based on the context above.`;

      console.log('Sending request to Gemini...');
      
      // Stream the AI response
      const result = await model.generateContentStream([{ text: promptText }]);
      console.log('Got stream response');
      
      let fullResponse = '';
      let currentThread = { ...thread }; // Keep track of current thread state
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        console.log('Received chunk:', chunkText);
        fullResponse += chunkText;
        
        // Update the note with the accumulated response
        const updatedNoteObj: Note = {
          id: noteId,
          content: `Q: ${prompt}\n\nA: ${fullResponse}`,
          createdAt: timestamp,
          updatedAt: new Date().toISOString()
        };
        console.log('Created updated note object:', updatedNoteObj);

        // Update using the current thread state
        const noteExists = currentThread.notes.some(note => note.id === noteId);
        console.log('Note status:', {
          noteId,
          exists: noteExists,
          currentNotesCount: currentThread.notes.length,
          updatedNoteContent: updatedNoteObj.content
        });

        const threadWithResponse = {
          ...currentThread,
          notes: noteExists
            ? currentThread.notes.map(note => 
                note.id === noteId ? updatedNoteObj : note
              )
            : [...currentThread.notes, updatedNoteObj],
          updatedAt: new Date().toISOString()
        };
        
        console.log('Thread update:', {
          beforeCount: currentThread.notes.length,
          afterCount: threadWithResponse.notes.length,
          updatedNote: threadWithResponse.notes.find(n => n.id === noteId)?.content
        });
        
        // Update the current thread state
        currentThread = threadWithResponse;
        onUpdate(threadWithResponse);
      }

      console.log('Completed response:', fullResponse);
      setAiPrompt('');
    } catch (error) {
      console.error('Error details:', error);
      // Update the note to show the error
      const errorNote: Note = {
        id: crypto.randomUUID(),
        content: `Q: ${prompt}\n\nA: Error generating response. Please check the console for details and try again.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const threadWithError = {
        ...thread,
        notes: [...thread.notes, errorNote],
        updatedAt: new Date().toISOString()
      };
      onUpdate(threadWithError);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateNote = (noteId: string, newContent: string) => {
    const timestamp = new Date().toISOString();
    const updatedThread = {
      ...thread,
      notes: thread.notes.map(note => 
        note.id === noteId 
          ? { ...note, content: newContent, updatedAt: timestamp }
          : note
      ),
      updatedAt: timestamp,
    };
    onUpdate(updatedThread);
    setEditingNoteId(null);
  };

  const deleteNote = (noteId: string) => {
    const updatedThread = {
      ...thread,
      notes: thread.notes.filter(note => note.id !== noteId),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedThread);
    setEditingNoteId(null);
    setEditedContent('');
  };

  // Handle sidebar hover
  const handleSidebarMouseEnter = () => {
    if (!isSidebarPinned) {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
      setIsSidebarExpanded(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!isSidebarPinned) {
      sidebarTimeoutRef.current = setTimeout(() => {
        setIsSidebarExpanded(false);
      }, 300); // Small delay before collapsing
    }
  };

  // Toggle pin state
  const togglePin = () => {
    setIsSidebarPinned(!isSidebarPinned);
    if (!isSidebarPinned) {
      setIsSidebarExpanded(true);
    }
  };

  useEffect(() => {
    return () => {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Thread Title"
              className="w-full text-lg font-semibold bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>
        {saveStatus === 'title' && (
          <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
        )}
      </div>

      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Current Note Input */}
            <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitNote();
                  }
                }}
                placeholder="Type a note..."
                className="w-full min-h-[100px] p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
              />
              <div className="flex justify-end items-center gap-3 mt-3">
                {saveStatus === 'draft' && (
                  <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
                )}
                <button
                  onClick={submitNote}
                  disabled={!currentNote.trim()}
                  className={`px-4 py-2 rounded-lg ${
                    currentNote.trim()
                      ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Existing Notes */}
            {thread.notes
              .filter(note => !note.content.includes('Q:') || !note.content.includes('A:'))
              .map((note) => (
                <div
                  key={note.id}
                  className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[100px] p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            updateNote(note.id, editedContent);
                            setEditingNoteId(null);
                          }}
                          className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                        {linkifyText(note.content)}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditedContent(note.content);
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>

          {/* AI Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={apiKey ? "Ask AI about your notes..." : "Add API key in settings to enable AI features"}
                className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                rows={2}
                disabled={!apiKey}
              />
              <button
                onClick={() => askAI(aiPrompt)}
                disabled={isGenerating || !aiPrompt.trim() || !apiKey}
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  isGenerating || !aiPrompt.trim() || !apiKey
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                }`}
                title="Ask AI"
              >
                <Sparkles size={20} />
                <span>{isGenerating ? 'Generating...' : 'Ask AI'}</span>
              </button>
            </div>
            {!apiKey && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                Please add your API key in settings
              </p>
            )}
          </div>
        </div>

        {/* AI Conversation Sidebar */}
        <div 
          className={`border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? 'w-[400px]' : 'w-[50px]'
          }`}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
        >
          <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center ${
            isSidebarExpanded ? 'justify-between' : 'justify-center'
          }`}>
            {(isSidebarExpanded || isSidebarPinned) ? (
              <>
                <div className="flex items-center justify-between w-full min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-2">AI Conversation</h2>
                  <button
                    onClick={togglePin}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                  >
                    {isSidebarPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                </div>
              </>
            ) : (
              <Sparkles size={20} className="text-gray-600 dark:text-gray-400" />
            )}
          </div>

          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            isSidebarExpanded ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-200`}>
            {thread.notes
              .filter(note => note.content.includes('Q:') && note.content.includes('A:'))
              .map((note) => {
                const [question, answer] = note.content.split('\n\nA:');
                return (
                  <div key={note.id} className="space-y-4 min-w-0">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 break-words">
                        {question?.substring(2)}
                      </p>
                    </div>
                    {answer && (
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                          {answer.trim()}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            {thread.notes.filter(note => note.content.includes('Q:') && note.content.includes('A:')).length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No AI conversations yet</p>
                <p className="text-sm mt-1">Ask a question below to start a conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
