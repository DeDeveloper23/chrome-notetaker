import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Sparkles, Pencil, Check, X, Pin, PinOff, Upload, Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Thread, Note, GeminiModel, Settings } from '../types';
import { extractTextFromFile } from '../utils/fileExtractors';

interface ThreadViewProps {
  thread: Thread;
  onBack: () => void;
  onUpdate: (thread: Thread) => void;
  apiKey: string;
  selectedModel: GeminiModel;
  settings: Settings;
  setShowSettings: (show: boolean) => void;
}

export default function ThreadView({ thread, onBack, onUpdate, apiKey, selectedModel, settings, setShowSettings }: ThreadViewProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedMessages, setSavedMessages] = useState<Set<string>>(new Set());
  const [revealedNotes, setRevealedNotes] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiMessages, setAiMessages] = useState<Array<{ question: string; answer: string }>>([]);

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

  const generateTitle = async (noteContent: string) => {
    if (!apiKey || settings.autoGenerateTitle === false) return thread;

    // Only generate title if it's still the default
    if (thread.title !== 'New Thread') return thread;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      const prompt = `Generate a concise, descriptive title (maximum 5 words) for a note that starts with this content:\n\n${noteContent}\n\nRespond with just the title, no quotes or punctuation.`;

      const result = await model.generateContentStream([{ text: prompt }]);
      
      let generatedTitle = '';
      for await (const chunk of result.stream) {
        generatedTitle += chunk.text();
      }

      // Clean up the title
      generatedTitle = generatedTitle.trim().replace(/['"]/g, '');
      
      // Update the thread with the new title while preserving notes
      const updatedThread = {
        ...thread,
        title: generatedTitle,
        notes: thread.notes, // Explicitly preserve the notes array
      };
      onUpdate(updatedThread);
      setTitle(generatedTitle);
      
      // Show saved indicator
      setSaveStatus('title');
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 2000);

      return updatedThread;
    } catch (error) {
      console.error('Error generating title:', error);
      return thread;
    }
  };

  // Function to submit the note
  const submitNote = async () => {
    if (!currentNote.trim()) return;

    const timestamp = new Date().toISOString();
    const newNoteObj: Note = {
      id: crypto.randomUUID(),
      content: currentNote.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // If this is the first note and we have an API key, generate a title
    let updatedThread = thread;
    if (thread.notes.length === 0 && apiKey) {
      updatedThread = await generateTitle(currentNote.trim()) || thread;
    }

    // Update the thread with the new note
    updatedThread = {
      ...updatedThread,
      notes: [newNoteObj, ...updatedThread.notes],
      updatedAt: timestamp,
    };

    // Update the thread
    onUpdate(updatedThread);
    
    // Clear the note and draft storage
    setCurrentNote('');
    chrome.storage.local.remove([`draft_${thread.id}`]);
  };

  // Update the sidebar handlers to be more stable
  const handleSidebarMouseEnter = () => {
    if (!isSidebarPinned) {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
      setIsSidebarExpanded(true);
    }
  };

  const handleSidebarMouseLeave = (e: React.MouseEvent) => {
    if (!isSidebarPinned) {
      // Get the related target (element being entered)
      const relatedTarget = e.relatedTarget as HTMLElement;
      const currentTarget = e.currentTarget as HTMLElement;
      
      // Check if we're still within the sidebar or its children
      if (currentTarget.contains(relatedTarget)) {
        return;
      }

      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
      setIsSidebarExpanded(false);
    }
  };

  // Toggle pin state with animation
  const togglePin = () => {
    setIsSidebarPinned(prev => !prev);
    setIsSidebarExpanded(true);
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
      setTimeout(() => {
        setIsSidebarPinned(true);
      }, 300);
    } else {
      setIsSidebarPinned(true);
    }
    setIsGenerating(true);
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      // Prepare context from existing notes
      const notesContext = thread.notes
        .map(note => note.content)
        .join('\n\n');
      
      // Format prompt
      const promptText = `Context from existing notes:\n${notesContext}\n\nUser question: ${prompt}\n\nPlease provide a concise response based on the context above.`;

      // Stream the AI response
      const result = await model.generateContentStream([{ text: promptText }]);
      
      let fullResponse = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        // Update AI messages in real-time
        setAiMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].question === prompt) {
            updated[lastIndex].answer = fullResponse;
          } else {
            updated.push({ question: prompt, answer: fullResponse });
          }
          return updated;
        });
      }

      setAiPrompt('');
    } catch (error) {
      console.error('Error:', error);
      setAiMessages(prev => [
        ...prev,
        { 
          question: prompt,
          answer: 'Error generating response. Please try again.'
        }
      ]);
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
    if (!event.target.files?.length) return;
    
    setIsUploading(true);
    const timestamp = new Date().toISOString();
    
    try {
      const files = Array.from(event.target.files);
      const texts = await Promise.all(files.map(file => extractTextFromFile(file)));
      
      // Create a new note for each file
      const newNotes: Note[] = texts.map((text, index) => ({
        id: crypto.randomUUID(),
        content: `# ${files[index].name}\n\n${text}`,
        createdAt: timestamp,
        updatedAt: timestamp
      }));

      // Update thread with all new notes
      const updatedThread = {
        ...thread,
        notes: [...newNotes, ...thread.notes],
        updatedAt: timestamp
      };

      // Update the thread
      onUpdate(updatedThread);
    } catch (error) {
      console.error('Error extracting text:', error);
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
      notes: [newNoteObj, ...thread.notes],
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
    <div className="h-full flex flex-col bg-white dark:bg-apple-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-apple-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-apple-gray-700"
          >
            <ChevronLeft size={20} />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 flex-1"
            placeholder="Untitled Thread"
          />
          {saveStatus === 'title' && (
            <span className="text-green-600 dark:text-green-400 text-sm animate-fade-out">
              Saved
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Notes Area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
          {/* Current Note Input */}
          <div className="mb-6">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submitNote();
                  }
                }}
                placeholder="Start typing..."
                className="w-full p-3 min-h-[100px] bg-gray-50 dark:bg-apple-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-apple-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-apple-blue-500 resize-none"
              />
              {saveStatus === 'draft' && (
                <span className="absolute right-2 bottom-2 text-green-600 dark:text-green-400 text-sm bg-white dark:bg-apple-gray-700 px-2 py-1 rounded animate-fade-out">
                  Draft saved
                </span>
              )}
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-apple-gray-700 hover:bg-gray-200 dark:hover:bg-apple-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Upload size={16} />
                  <span>Upload</span>
                </button>
                {!apiKey && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <span>Set up AI</span>
                  </button>
                )}
              </div>
              <button
                onClick={submitNote}
                disabled={!currentNote.trim()}
                className="px-4 py-1.5 text-sm text-white bg-blue-600 dark:bg-apple-blue-500 hover:bg-blue-700 dark:hover:bg-apple-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-4">
            {thread.notes.map((note) => (
              <div
                key={note.id}
                className="group relative bg-white dark:bg-apple-gray-700 border border-gray-200 dark:border-apple-gray-600 rounded-lg p-4 transition-all hover:border-blue-500 dark:hover:border-apple-blue-500"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-2 bg-gray-50 dark:bg-apple-gray-600 border border-gray-200 dark:border-apple-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-apple-blue-500 min-h-[100px] text-gray-900 dark:text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const updatedNotes = thread.notes.map(n =>
                            n.id === note.id
                              ? { ...n, content: editedContent, updatedAt: new Date().toISOString() }
                              : n
                          );
                          onUpdate({ ...thread, notes: updatedNotes });
                          setEditingNoteId(null);
                        }}
                        className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 rounded"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`prose dark:prose-invert max-w-none ${note.isSecret && !revealedNotes.has(note.id) ? 'blur-sm' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {note.content}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {note.isSecret ? (
                          <button
                            onClick={() => toggleNoteVisibility(note.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                            title={revealedNotes.has(note.id) ? "Hide note" : "Reveal note"}
                          >
                            {revealedNotes.has(note.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleNoteSecret(note.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                            title="Make note secret"
                          >
                            <EyeOff size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditedContent(note.content);
                          }}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                          title="Edit note"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Sidebar with improved hover behavior */}
        <div 
          className={`relative flex border-l border-gray-200 dark:border-apple-gray-700 transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? 'w-80' : 'w-12'
          }`}
          onMouseLeave={handleSidebarMouseLeave}
        >
          {/* Hover trigger area - only active when not pinned */}
          {!isSidebarPinned && (
            <div 
              className="absolute inset-y-0 -left-4 w-16 z-10"
              onMouseEnter={handleSidebarMouseEnter}
            />
          )}
          
          {/* Sidebar content */}
          <div 
            className={`ai-sidebar-content absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-apple-gray-800 transition-transform duration-300 ease-in-out ${
              isSidebarExpanded ? 'translate-x-0' : 'translate-x-[calc(100%-48px)]'
            }`}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-apple-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
                <button
                  onClick={togglePin}
                  className={`p-1.5 rounded-full transition-colors ${
                    isSidebarPinned 
                      ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-apple-gray-700'
                  }`}
                  title={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                >
                  {isSidebarPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
              </div>
              
              {/* Rest of the sidebar content */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-4">
                      {aiMessages.map((message, index) => (
                        <div key={index} className="space-y-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {message.question}
                          </div>
                          <div className="bg-gray-50 dark:bg-apple-gray-700 rounded-lg p-3 prose dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.answer}
                            </ReactMarkdown>
                          </div>
                          {!savedMessages.has(message.answer) && (
                            <button
                              onClick={() => saveAIMessageAsNote(message.answer)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                              Save as note
                            </button>
                          )}
                        </div>
                      ))}
                      {aiMessages.length === 0 && (
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          Ask AI to help you with your notes
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {apiKey && (
                    <div className="p-4 border-t border-gray-200 dark:border-apple-gray-700">
                      <div className="relative">
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Ask AI..."
                          className="w-full p-2 pr-10 bg-gray-50 dark:bg-apple-gray-700 border border-gray-200 dark:border-apple-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-apple-blue-500 resize-none"
                          rows={3}
                        />
                        <button
                          onClick={() => askAI(aiPrompt)}
                          disabled={isGenerating || !aiPrompt.trim()}
                          className="absolute right-2 bottom-2 p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept=".txt,.pdf,.docx"
      />
    </div>
  );
}
