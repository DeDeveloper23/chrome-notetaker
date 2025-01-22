import React, { useState } from 'react';
import { ChevronLeft, Send, Sparkles, Pencil, Check, X } from 'lucide-react';
import type { Thread, Note } from '../types';

interface ThreadViewProps {
  thread: Thread;
  onBack: () => void;
  onUpdate: (thread: Thread) => void;
  apiKey: string;
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

export default function ThreadView({ thread, onBack, onUpdate, apiKey }: ThreadViewProps) {
  const [title, setTitle] = useState(thread.title);
  const [newNote, setNewNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const addNote = async (content: string, useAI: boolean = false) => {
    if (!content.trim()) return;

    if (useAI && apiKey) {
      setIsGenerating(true);
      try {
        // AI enhancement logic here
        setIsGenerating(false);
      } catch (error) {
        console.error('Error generating AI response:', error);
        setIsGenerating(false);
        return;
      }
    }

    const timestamp = new Date().toISOString();
    const newNoteObj: Note = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const updatedThread = {
      ...thread,
      notes: [...thread.notes, newNoteObj],
      updatedAt: timestamp,
    };

    onUpdate(updatedThread);
    setNewNote('');
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

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onUpdate({ ...thread, title: e.target.value });
            }}
            className="flex-1 text-lg font-semibold bg-transparent focus:outline-none"
            placeholder="Thread Title"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {thread.notes.map((note) => (
          <div 
            key={note.id} 
            className="group relative bg-gray-50 rounded-lg p-4 max-w-3xl mx-auto hover:bg-gray-100 transition-colors"
          >
            {editingNoteId === note.id ? (
              <div className="space-y-3">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 text-base bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={Math.max(3, editedContent.split('\n').length)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingNoteId(null);
                      setEditedContent('');
                    }}
                    className="p-1.5 text-gray-600 hover:text-gray-900 bg-white rounded-full hover:bg-gray-50 border border-gray-200"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => updateNote(note.id, editedContent)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 bg-white rounded-full hover:bg-blue-50 border border-blue-200"
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-900 text-base whitespace-pre-wrap leading-relaxed">
                  {linkifyText(note.content)}
                </p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingNoteId(note.id);
                      setEditedContent(note.content);
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 bg-white rounded-full hover:bg-gray-50 border border-gray-200 shadow-sm"
                    title="Edit note"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(note.createdAt).toLocaleString()}
                  {note.updatedAt !== note.createdAt && ' (edited)'}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type your note..."
            className="flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            rows={4}
          />
          <div className="flex flex-col gap-2 justify-end">
            {apiKey && (
              <button
                onClick={() => addNote(newNote, true)}
                disabled={!newNote.trim() || isGenerating}
                className="p-2.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Enhance with AI"
              >
                <Sparkles size={20} />
              </button>
            )}
            <button
              onClick={() => addNote(newNote)}
              disabled={!newNote.trim() || isGenerating}
              className="p-2.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
