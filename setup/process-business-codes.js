/**
 * Process JIGYOSYO.CSV (business postal codes) into optimized JSON
 * Run this script to convert the Japan Post business postal code CSV
 * into a compact JSON database for the Chrome extension
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CSV_PATH = path.join(__dirname, '../../Downloads/JIGYOSYO.CSV');
const OUTPUT_DIR = path.join(__dirname, '../data/postal');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'business-codes.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Processing business postal codes...');
console.log('Input:', CSV_PATH);
console.log('Output:', OUTPUT_FILE);

try {
  // Read CSV file (Shift-JIS encoding)
  const csvBuffer = fs.readFileSync(CSV_PATH);
  const csvContent = iconv.decode(csvBuffer, 'Shift_JIS');
  
  // Parse CSV (no headers in this file)
  const records = parse(csvContent, {
    columns: false,
    skip_empty_lines: true
  });
  
  console.log(`Found ${records.length} business postal codes`);
  
  // Process into JSON structure
  const businessCodes = {};
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const record of records) {
    // CSV columns:
    // 0: JIS code, 1: Kana business name, 2: Business name
    // 3: Prefecture, 4: City, 5: Street
    // 6: Additional address, 7: Postal code, 8: Old postal code
    // 9: Post office name, 10-12: Flags
    
    const postalCode = record[7];
    
    if (!postalCode || postalCode.length !== 7) {
      skippedCount++;
      continue;
    }
    
    // Remove any hyphens and normalize
    const normalizedCode = postalCode.replace(/[^0-9]/g, '');
    
    // Only store essential fields to reduce size
    businessCodes[normalizedCode] = {
      prefecture: record[3] || '',
      city: record[4] || '',
      street: (record[5] || '') + (record[6] || ''), // Combine street and additional
      business: record[2] || ''
    };
    
    processedCount++;
    
    // Log progress every 1000 records
    if (processedCount % 1000 === 0) {
      console.log(`Processed ${processedCount} records...`);
    }
  }
  
  console.log(`\nProcessing complete!`);
  console.log(`- Processed: ${processedCount} postal codes`);
  console.log(`- Skipped: ${skippedCount} invalid records`);
  
  // Write to JSON file (minified to save space)
  const jsonContent = JSON.stringify(businessCodes);
  fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf8');
  
  // Calculate file sizes
  const csvSize = fs.statSync(CSV_PATH).size;
  const jsonSize = fs.statSync(OUTPUT_FILE).size;
  
  console.log(`\nFile sizes:`);
  console.log(`- Original CSV: ${(csvSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Output JSON: ${(jsonSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Compression: ${((1 - jsonSize/csvSize) * 100).toFixed(1)}% smaller`);
  
  // Test a known business postal code
  const testCode = '4558650';
  if (businessCodes[testCode]) {
    console.log(`\nTest lookup for ${testCode}:`);
    console.log(businessCodes[testCode]);
  }
  
  console.log('\n✅ Business codes database created successfully!');
  console.log(`Output: ${OUTPUT_FILE}`);
  
} catch (error) {
  console.error('❌ Error processing business codes:', error);
  process.exit(1);
}