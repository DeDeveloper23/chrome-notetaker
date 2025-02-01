import React from 'react';
import { Pencil, Check, X, EyeOff, Eye, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note } from '../types';

interface NoteViewProps {
  note: Note;
  editingNoteId: string | null;
  editedContent: string;
  revealedNotes: Set<string>;
  savedMessages: Set<string>;
  onEdit: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (noteId: string, content: string) => void;
  onToggleVisibility: (noteId: string) => void;
  onToggleSecret: (noteId: string) => void;
}

const NoteView: React.FC<NoteViewProps> = ({
  note,
  editingNoteId,
  editedContent,
  revealedNotes,
  savedMessages,
  onEdit,
  onDelete,
  onCancelEdit,
  onStartEdit,
  onToggleVisibility,
  onToggleSecret,
}) => {
  if (editingNoteId === note.id) {
    return (
      <div className="space-y-3">
        <textarea
          value={editedContent}
          onChange={(e) => onStartEdit(note.id, e.target.value)}
          className="w-full p-2 text-base bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={Math.max(3, editedContent.split('\n').length)}
          autoFocus
        />
        <div className="flex justify-between items-center">
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 text-red-600 hover:text-red-700 bg-white rounded-full hover:bg-red-50 border border-red-200"
            title="Delete note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancelEdit}
              className="p-1.5 text-gray-600 hover:text-gray-900 bg-white rounded-full hover:bg-gray-50 border border-gray-200"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => onEdit(note.id, editedContent)}
              className="p-1.5 text-blue-600 hover:text-blue-700 bg-white rounded-full hover:bg-blue-50 border border-blue-200"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-gray-50 rounded-lg p-4 max-w-3xl mx-auto hover:bg-gray-100 transition-colors">
      <div className="prose prose-sm max-w-none text-gray-900 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:font-semibold">
        {note.isSecret && !revealedNotes.has(note.id) ? (
          <p className="font-mono">{'•'.repeat(Math.min(50, note.content.length))}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content}
          </ReactMarkdown>
        )}
      </div>
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (note.isSecret) {
              onToggleVisibility(note.id);
            } else {
              onToggleSecret(note.id);
            }
          }}
          className={`p-1.5 bg-white rounded-full border shadow-sm transition-colors ${
            note.isSecret
              ? revealedNotes.has(note.id)
                ? 'text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50'
                : 'text-purple-600 hover:text-purple-700 border-purple-200 hover:bg-purple-50'
              : 'text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
          title={note.isSecret ? (revealedNotes.has(note.id) ? "Hide content" : "Show content") : "Make note secret"}
        >
          {note.isSecret ? (revealedNotes.has(note.id) ? <Eye size={14} /> : <EyeOff size={14} />) : <EyeOff size={14} />}
        </button>
        <button
          onClick={() => onStartEdit(note.id, note.content)}
          className="p-1.5 text-gray-500 hover:text-gray-700 bg-white rounded-full hover:bg-gray-50 border border-gray-200 shadow-sm"
          title="Edit note"
        >
          <Pencil size={14} />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
        {new Date(note.createdAt).toLocaleString()}
        {note.updatedAt !== note.createdAt && ' (edited)'}
        {note.isSecret && !revealedNotes.has(note.id) && ' • Hidden note'}
        {savedMessages.has(note.content) && (
          <>
            <span className="mx-1">•</span>
            <span className="flex items-center gap-0.5">
              <Sparkles size={12} className="text-purple-400" />
              <span className="text-purple-400">AI Generated</span>
            </span>
          </>
        )}
      </p>
    </div>
  );
};

export default NoteView; 