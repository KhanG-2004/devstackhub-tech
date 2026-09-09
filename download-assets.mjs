import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const BLOG_DIR = path.resolve('./src/content/blog');
const PUBLIC_DIR = path.resolve('./public');
const BASE_URL = 'https://devstackhub.tech';

// Collect all unique /wp-content/uploads/ image paths across all markdown files
function findImagePaths() {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const imagePaths = new Set();
  const regex = /\/wp-content\/uploads\/[^\s"')<>]+/g;

  for (const file of files) {
    const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const matches = content.match(regex);
    if (matches) {
      matches.forEach(img => {
        // Strip trailing query parameters or escaped chars if present
        const cleaned = img.replace(/\\/g, '').split('?')[0];
        imagePaths.add(cleaned);
      });
    }
  }
  return Array.from(imagePaths);
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('🔍 Scanning markdown files for image paths...');
  const images = findImagePaths();
  console.log(`📦 Found ${images.length} images to download.\n`);

  for (const imgPath of images) {
    const remoteUrl = `${BASE_URL}${imgPath}`;
    const localPath = path.join(PUBLIC_DIR, imgPath);

    if (fs.existsSync(localPath)) {
      console.log(`⏩ Skipping (already exists): ${imgPath}`);
      continue;
    }

    try {
      console.log(`⬇️ Downloading: ${imgPath}`);
      await downloadFile(remoteUrl, localPath);
      console.log(`✅ Saved: ${imgPath}`);
    } catch (err) {
      console.error(`❌ Failed: ${imgPath} -> ${err.message}`);
    }
  }

  console.log('\n🎉 Image assets downloaded successfully into /public/wp-content/uploads!');
}

run();