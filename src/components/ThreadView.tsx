import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Sparkles, Pencil, Check, X, Pin, PinOff, Upload, Loader2, EyeOff, Eye } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Thread, Note, GeminiModel } from '../types';
import { extractTextFromFile } from '../utils/fileExtractors';
import NoteView from './NoteView';

interface ThreadViewProps {
  thread: Thread;
  onBack: () => void;
  onUpdate: (thread: Thread) => void;
  apiKey: string;
  selectedModel: GeminiModel;
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedMessages, setSavedMessages] = useState<Set<string>>(new Set());
  const [revealedNotes, setRevealedNotes] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load draft and check for buffered keys when thread changes
  useEffect(() => {
    chrome.storage.local.get([`draft_${thread.id}`, 'buffered_keys'], (result) => {
      const draft = result[`draft_${thread.id}`];
      const bufferedKeys = result['buffered_keys'];
      
      if (bufferedKeys) {
        // If we have buffered keys, append them to the draft or use them as the initial note
        setCurrentNote((draft || '') + bufferedKeys);
        // Clear the buffered keys
        chrome.storage.local.remove(['buffered_keys']);
      } else if (draft) {
        setCurrentNote(draft);
      } else {
        setCurrentNote('');
      }

      // Focus the textarea after setting the content
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at the end
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = textareaRef.current.value.length;
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
        }, 500); // Auto-save after 0.5 seconds of no typing
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
      }, 500); // Increased delay for better UX
    }
  };

  // Toggle pin state with animation
  const togglePin = () => {
    if (isSidebarPinned) {
      setIsSidebarPinned(false);
      // Keep expanded briefly after unpinning
      setTimeout(() => {
        if (!isSidebarPinned) { // Check if still unpinned
          setIsSidebarExpanded(false);
        }
      }, 500);
    } else {
      setIsSidebarPinned(true);
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

  const askAI = async (prompt: string) => {
    if (!prompt.trim() || !apiKey) return;

    // Pin the sidebar with animation
    if (!isSidebarExpanded) {
      setIsSidebarExpanded(true);
      // Small delay before pinning to allow expansion animation
      setTimeout(() => {
        setIsSidebarPinned(true);
      }, 300);
    } else {
      setIsSidebarPinned(true);
    }
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    const progress: { [key: string]: number } = {};
    fileArray.forEach(file => {
      progress[file.name] = 0;
    });
    setUploadProgress(progress);

    try {
      for (const file of fileArray) {
        try {
          // Update progress to show started
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 10
          }));

          const text = await extractTextFromFile(file);
          
          // Update progress to show text extracted
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 50
          }));

          const timestamp = new Date().toISOString();
          const newNoteObj: Note = {
            id: crypto.randomUUID(),
            content: `File: ${file.name}\n\n${text}`,
            createdAt: timestamp,
            updatedAt: timestamp
          };

          // Update thread with new note
          const updatedThread = {
            ...thread,
            notes: [...thread.notes, newNoteObj],
            updatedAt: timestamp,
          };
          onUpdate(updatedThread);

          // Update progress to show completed
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 100
          }));

          // Clear progress after a delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[file.name];
              return newProgress;
            });
          }, 2000);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          // Show error in progress
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: -1
          }));
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Check for already saved messages when thread changes
  useEffect(() => {
    const saved = new Set<string>();
    thread.notes.forEach(note => {
      // Find AI messages that have been saved as notes
      thread.notes
        .filter(aiNote => aiNote.content.includes('Q:') && aiNote.content.includes('A:'))
        .forEach(aiNote => {
          const [, answer] = aiNote.content.split('\n\nA:');
          if (answer && note.content === answer.trim()) {
            saved.add(answer.trim());
          }
        });
    });
    setSavedMessages(saved);
  }, [thread.notes]);

  // Function to save AI message as note
  const saveAIMessageAsNote = (message: string) => {
    const timestamp = new Date().toISOString();
    const newNoteObj: Note = {
      id: crypto.randomUUID(),
      content: message,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const updatedThread = {
      ...thread,
      notes: [...thread.notes, newNoteObj],
      updatedAt: timestamp,
    };
    onUpdate(updatedThread);
    setSavedMessages(prev => new Set(prev).add(message));
  };

  const toggleNoteVisibility = (noteId: string) => {
    setRevealedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const toggleNoteSecret = (noteId: string) => {
    const note = thread.notes.find(n => n.id === noteId);
    if (!note) return;

    const timestamp = new Date().toISOString();
    const updatedThread = {
      ...thread,
      notes: thread.notes.map(n => 
        n.id === noteId 
          ? { ...n, isSecret: !n.isSecret, updatedAt: timestamp }
          : n
      ),
      updatedAt: timestamp,
    };
    onUpdate(updatedThread);
    
    // If making secret, remove from revealed set
    if (!note.isSecret) {
      setRevealedNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="flex-1 text-lg font-semibold bg-transparent focus:outline-none"
              placeholder="Thread Title"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 relative"
                title="Upload files"
              >
                {isUploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Upload size={20} />
                )}
              </button>
            </div>
            <div
              className={`flex items-center gap-1.5 text-sm text-gray-500 transition-opacity duration-300 ${
                saveStatus ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-xs">
                {saveStatus === 'title' ? 'Title saved' : 'Draft saved'}
              </span>
            </div>
          </div>
        </div>
        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-2 space-y-2">
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progress === -1
                        ? 'bg-red-500'
                        : progress === 100
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress === -1 ? 100 : progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 min-w-[60px]">
                  {progress === -1
                    ? 'Error'
                    : progress === 100
                    ? 'Done'
                    : `${progress}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Main notes panel */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Current note input */}
            {!editingNoteId && (
              <div className="bg-white rounded-lg p-4 max-w-3xl mx-auto border border-gray-200">
                <textarea
                  ref={textareaRef}
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Start typing your note..."
                  className="w-full min-h-[100px] text-base bg-transparent border-none focus:outline-none resize-none"
                  rows={Math.max(3, currentNote.split('\n').length)}
                />
                {currentNote.trim() && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={submitNote}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Note
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Existing notes */}
            {thread.notes
              .filter(note => !note.content.includes('Q:') || !note.content.includes('A:'))
              .map(note => (
                <NoteView
                  key={note.id}
                  note={note}
                  editingNoteId={editingNoteId}
                  editedContent={editedContent}
                  revealedNotes={revealedNotes}
                  savedMessages={savedMessages}
                  onEdit={updateNote}
                  onDelete={deleteNote}
                  onCancelEdit={() => {
                    setEditingNoteId(null);
                    setEditedContent('');
                  }}
                  onStartEdit={(noteId, content) => {
                    setEditingNoteId(noteId);
                    setEditedContent(content);
                  }}
                  onToggleVisibility={toggleNoteVisibility}
                  onToggleSecret={toggleNoteSecret}
                />
              ))}
          </div>

          {/* AI Chat Interface */}
          <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex gap-3 max-w-3xl mx-auto">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  // Check for Cmd/Ctrl + Enter
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    const textarea = e.currentTarget;
                    // Add brief visual feedback
                    textarea.classList.add('ring-2', 'ring-blue-400');
                    setTimeout(() => {
                      textarea.classList.remove('ring-2', 'ring-blue-400');
                    }, 200);
                    if (aiPrompt.trim() && !isGenerating && apiKey) {
                      askAI(aiPrompt);
                    }
                  }
                }}
                placeholder={apiKey ? `Ask AI about your notes... (${navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} + Enter to send)` : "Add API key in settings to enable AI features"}
                className="flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                rows={2}
                disabled={!apiKey}
              />
              <button
                onClick={() => askAI(aiPrompt)}
                disabled={!aiPrompt.trim() || isGenerating || !apiKey}
                className="p-2.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                title="Ask AI"
              >
                <Sparkles size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* AI Conversation Sidebar */}
        <div 
          className={`border-l border-gray-200 flex flex-col bg-gray-50 transition-all duration-300 ease-in-out min-w-[50px] flex-shrink-0 ${
            isSidebarExpanded || isSidebarPinned ? 'w-[400px]' : 'w-[50px]'
          }`}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
        >
          <div className={`p-4 border-b border-gray-200 bg-white flex items-center ${
            isSidebarExpanded || isSidebarPinned ? 'justify-between' : 'justify-center'
          }`}>
            {(isSidebarExpanded || isSidebarPinned) ? (
              <>
                <div className="flex items-center justify-between w-full min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate pr-2">AI Conversation</h2>
                  <button
                    onClick={togglePin}
                    className="p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                    title={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                  >
                    {isSidebarPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                </div>
              </>
            ) : (
              <Sparkles size={20} className="text-gray-600" />
            )}
          </div>
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            isSidebarExpanded || isSidebarPinned ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-200`}>
            {thread.notes
              .filter(note => {
                const hasQAndA = note.content.includes('Q:') && note.content.includes('A:');
                return hasQAndA;
              })
              .map((note) => {
                const [question, answer] = note.content.split('\n\nA:');
                return (
                  <div key={note.id} className="space-y-4 min-w-0">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 break-words">
                        {question?.substring(2)}
                      </p>
                    </div>
                    {answer && (
                      <div className="bg-white rounded-lg p-3 shadow-sm group/message relative">
                        <div className="prose prose-sm max-w-none text-sm text-gray-700 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-gray-900 prose-strong:font-semibold">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {answer.trim()}
                          </ReactMarkdown>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
                          {savedMessages.has(answer.trim()) ? (
                            <div className="p-1.5 text-green-600 bg-white rounded-full border border-green-200 shadow-sm flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20 6L9 17L4 12" />
                              </svg>
                              <span className="text-xs">Saved</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => saveAIMessageAsNote(answer.trim())}
                              className="p-1.5 text-blue-600 hover:text-blue-700 bg-white rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center gap-1.5"
                              title="Save as note"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                              </svg>
                              <span className="text-xs">Save as Note</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            {thread.notes.filter(note => note.content.includes('Q:') && note.content.includes('A:')).length === 0 && (
              <div className="text-center text-gray-500 py-8">
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
