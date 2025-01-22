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
