export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  id: string;
  title: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}