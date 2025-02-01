import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs-extra';
import { resolve } from 'path';

// Custom plugin to copy manifest and icons
const copyManifest = () => ({
  name: 'copy-manifest',
  closeBundle: async () => {
    try {
      // Ensure dist directory exists
      await fs.ensureDir('dist');
      
      // Copy manifest
      console.log('Copying manifest.json...');
      await fs.copy('manifest.json', 'dist/manifest.json');
      
      // Copy icons folder
      if (fs.existsSync('icons')) {
        console.log('Copying icons folder...');
        await fs.copy('icons', 'dist/icons');
      } else {
        console.warn('Icons folder not found!');
      }

      // Copy public folder contents
      if (fs.existsSync('public')) {
        console.log('Copying public folder contents...');
        await fs.copy('public', 'dist');
      }

      // Copy PDF.js worker
      console.log('Copying PDF.js worker...');
      await fs.copy(
        'node_modules/pdfjs-dist/build/pdf.worker.min.js',
        'dist/pdf.worker.min.js'
      );
    } catch (error) {
      console.error('Error copying files:', error);
      throw error;
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyManifest()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Content-Type': 'application/javascript',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    sourcemap: true,
    minify: false,
    target: 'esnext',
    modulePreload: false
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
