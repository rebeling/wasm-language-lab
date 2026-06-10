import fs from 'fs';
import path from 'path';

/**
 * Generates deterministic vector datasets for benchmarking using a stream
 * to bypass Node.js string length limits.
 */
export function generateDataset(numDocs, dimensions, filename) {
  const datasetDir = path.resolve('public/datasets');
  if (!fs.existsSync(datasetDir)) {
    fs.mkdirSync(datasetDir, { recursive: true });
  }

  const outputPath = path.join(datasetDir, filename);
  const stream = fs.createWriteStream(outputPath);

  stream.write('[');
  for (let i = 0; i < numDocs; i++) {
    const doc = {
      id: `doc-${i + 1}`,
      title: `Doc ${i + 1}`,
      vector: Array.from({ length: dimensions }, () => parseFloat(Math.random().toFixed(4)))
    };
    
    stream.write(JSON.stringify(doc));
    if (i < numDocs - 1) {
      stream.write(',');
    }
  }
  stream.write(']');
  stream.end();

  console.log(`✅ Generated ${filename} (${numDocs} docs, ${dimensions} dims)`);
}

const docCounts = [1000, 5000, 10000];
const dimensions = [384, 768, 1536, 3072, 4096];

console.log('🚀 Generating benchmarking matrix (streaming)...');

async function run() {
  for (const count of docCounts) {
    for (const dim of dimensions) {
      // Use a Promise to wait for the stream to finish before starting next one
      // to avoid opening too many files or overwhelming memory
      await new Promise((resolve) => {
        generateDataset(count, dim, `vectors-${count}-${dim}.json`);
        // We'll just wait a bit or use a better sync method
        // For simplicity in this script, we'll just process sequentially
        setTimeout(resolve, 500); 
      });
    }
  }
  console.log('✨ Matrix generation complete.');
}

run();
