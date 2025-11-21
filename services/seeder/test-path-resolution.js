// Test script to verify path resolution works correctly
import { access, constants } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Path Resolution\n');
console.log('Current directory:', __dirname);
console.log('Process cwd:', process.cwd());

const paths = [
  '/app/seed-data/dataset.json',  // Container path
  join(__dirname, '../../seed-data/dataset.json'),  // Local relative path
  process.env.SEED_DATA_PATH,  // Environment override
];

console.log('\nTesting paths:');
paths.forEach((path, i) => {
  if (!path) {
    console.log(`${i + 1}. (env not set) - SKIP`);
    return;
  }
  
  access(path, constants.R_OK, (err) => {
    if (err) {
      console.log(`${i + 1}. ${path} - ❌ NOT FOUND`);
    } else {
      console.log(`${i + 1}. ${path} - ✅ EXISTS`);
    }
  });
});

// Simulate the actual logic from seed.js
setTimeout(() => {
  console.log('\n🔍 Resolved path (matching seed.js logic):');
  
  async function getDatasetPath() {
    if (process.env.SEED_DATA_PATH) {
      return process.env.SEED_DATA_PATH;
    }
    
    const containerPath = '/app/seed-data/dataset.json';
    try {
      await new Promise((resolve, reject) => {
        access(containerPath, constants.R_OK, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return containerPath;
    } catch {
      return join(__dirname, '../../seed-data/dataset.json');
    }
  }
  
  getDatasetPath().then(resolvedPath => {
    console.log(`📂 ${resolvedPath}`);
    
    access(resolvedPath, constants.R_OK, (err) => {
      if (err) {
        console.log('❌ ERROR: Resolved path does not exist!');
        process.exit(1);
      } else {
        console.log('✅ SUCCESS: Resolved path exists and is readable!');
        process.exit(0);
      }
    });
  });
}, 100);
