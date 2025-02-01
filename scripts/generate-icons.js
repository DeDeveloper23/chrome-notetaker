import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 48, 128];
const inputImage = path.join(__dirname, '../public/gourd.png');
const outputDir = path.join(__dirname, '../icons');

async function generateIcons() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate each size
    for (const size of sizes) {
      await sharp(inputImage)
        .resize(size, size)
        // Apply the same filter as in EmptyState
        .modulate({
          brightness: 0.93, // brightness 93%
          saturation: 6.81, // saturation 681%
        })
        .tint({ r: 255, g: 244, b: 230 }) // Approximate sepia tone
        .png()
        .toFile(path.join(outputDir, `icon${size}.png`));
      
      console.log(`Generated ${size}x${size} icon`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 
