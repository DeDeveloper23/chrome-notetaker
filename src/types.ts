export type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type Thread = {
  id: string;
  title: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
  starred?: boolean;
};

export type GeminiModel = 
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro";

export interface Settings {
  apiKey: string;
  selectedModel: GeminiModel;
}

export const GEMINI_MODELS: { value: GeminiModel; label: string; description: string }[] = [
  {
    value: "gemini-2.0-flash-exp",
    label: "Gemini 2.0 Flash",
    description: "Next generation features, speed, and multimodal generation"
  },
  {
    value: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    description: "Fast and versatile performance across diverse tasks"
  },
  {
    value: "gemini-1.5-flash-8b",
    label: "Gemini 1.5 Flash-8B",
    description: "High volume and lower intelligence tasks"
  },
  {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    description: "Advanced reasoning and complex task handling"
  }
];
