import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const optimizeImage = async (filename) => {
  const filePath = path.join(process.cwd(), 'src/assets', filename);
  const tempPath = path.join(process.cwd(), 'src/assets', `temp_${filename}`);

  console.log(`Optimizing ${filename}...`);
  try {
    await sharp(filePath)
      .resize(800) // Scale down
      .png({ quality: 50, compressionLevel: 9, effort: 10, palette: true }) // Highly compress PNG
      .toFile(tempPath);

    fs.renameSync(tempPath, filePath);
    
    const stats = fs.statSync(filePath);
    console.log(`✅ ${filename} compressed to ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error(`Failed to optimize ${filename}`, err);
  }
};

const run = async () => {
  await optimizeImage('logo.png');
  await optimizeImage('element.png');
};

run();
