# Ascend Notetaker Chrome Extension

A beautiful and powerful note-taking Chrome extension with AI capabilities. Take notes directly in your browser with a clean, modern interface and optional AI-powered enhancements.

## Features

- 📝 Clean, modern note-taking interface
- 📱 Responsive sidebar with smooth hover interactions
- 🔍 Full-text search across all notes
- ✏️ Edit notes with inline editing
- 🔗 Automatic URL detection and clickable links
- 🤖 Optional AI enhancement capabilities (requires API key)
- 💾 Automatic saving and sync using Chrome storage

## Usage

### Keyboard Shortcuts
- `⌘/Ctrl + K`: Open Quick Actions menu
- `⌘/Ctrl + N`: Create new thread
- `⌘/Ctrl + ,`: Open settings
- `⌘/Ctrl + F`: Focus search
- `⌘/Ctrl + B`: Go back to thread list

### Thread Management
- **Star Important Threads**: Click the star icon to pin important threads to the top
- **Delete Threads**: Click the trash icon (with undo capability)
- **Search**: Use the search bar to find threads and notes

### Note Features
- **Markdown Support**: Write notes using markdown syntax for formatting
- **File Import**: Upload and extract text from PDF, DOCX, and TXT files
- **AI Integration**: Ask questions about your notes using Gemini AI
- **Save AI Responses**: Convert helpful AI responses into permanent notes

### AI Conversation
- **Context-Aware**: AI has access to your notes for better responses
- **Real-time Streaming**: See AI responses as they're generated
- **Markdown Formatting**: AI responses support rich text formatting
- **Quick Save**: Save useful AI responses as regular notes with one click

https://github.com/user-attachments/assets/a8259b01-7083-4e0a-b151-ad06a513962d


## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/DeDeveloper23/chrome-notetaker.git
   cd chrome-notetaker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```
OR 

3.5 Just Download the `dist` folder directly without `CLI` (click download all) : https://drive.google.com/drive/folders/127cbbNCvFkQv6DZCiMkh8_ocd6nhcfOg

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` directory from this project

## Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Make your changes and the extension will automatically rebuild

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Vite
- Chrome Extension APIs

## License

MIT 
