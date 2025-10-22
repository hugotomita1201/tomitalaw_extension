/**
 * Parse Japan Post Romaji Postal Code CSV
 *
 * Converts KEN_ALL_ROME.CSV (Shift-JIS) to optimized JSON database
 * Input: /Users/hugo/Downloads/KEN_ALL_ROME.CSV (11MB, ~125k codes)
 * Output: data/postal/romaji-codes.json (~5-7MB minified)
 *
 * Usage:
 *   node setup/parse-romaji-postal-codes.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import iconv from 'iconv-lite';
import { fileURLToPath } from 'url';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RomajiPostalCodeParser {
  constructor() {
    this.inputPath = '/Users/hugo/Downloads/KEN_ALL_ROME.CSV';
    this.outputPath = path.join(__dirname, '../data/postal/romaji-codes.json');
    this.codes = {};
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Parse CSV file and build romaji database
   */
  async parse() {
    console.log('🚀 Starting Japan Post Romaji CSV Parser...\n');

    // Check if input file exists
    if (!fs.existsSync(this.inputPath)) {
      console.error('❌ Error: Input file not found at:', this.inputPath);
      console.error('   Please download KEN_ALL_ROME.CSV from Japan Post website');
      process.exit(1);
    }

    console.log('📄 Reading CSV file:', this.inputPath);
    console.log('   File size:', (fs.statSync(this.inputPath).size / 1024 / 1024).toFixed(2), 'MB');
    console.log('');

    // Create read stream with Shift-JIS decoding
    const fileStream = fs.createReadStream(this.inputPath)
      .pipe(iconv.decodeStream('shift-jis'));

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;

    // Process each line
    for await (const line of rl) {
      lineNumber++;

      try {
        this.parseLine(line);

        // Progress indicator every 10,000 lines
        if (lineNumber % 10000 === 0) {
          console.log(`   Processed ${lineNumber.toLocaleString()} lines...`);
        }
      } catch (error) {
        this.errorCount++;
        if (this.errorCount <= 5) {
          console.warn(`⚠️  Line ${lineNumber} parse error:`, error.message);
        }
      }
    }

    console.log('\n✅ CSV parsing complete!');
    console.log(`   Total lines: ${lineNumber.toLocaleString()}`);
    console.log(`   Postal codes: ${Object.keys(this.codes).length.toLocaleString()}`);
    console.log(`   Errors: ${this.errorCount}`);

    // Save to JSON
    await this.saveJSON();
  }

  /**
   * Parse single CSV line
   * Format: "postal","kanji_pref","kanji_city","kanji_town","ROMAJI_PREF","ROMAJI_CITY","ROMAJI_TOWN"
   * We only need columns: 1, 5, 6, 7
   *
   * @param {string} line - CSV line
   */
  parseLine(line) {
    // Split by comma, handling quoted fields
    const fields = this.splitCSV(line);

    if (fields.length < 7) {
      throw new Error(`Invalid CSV format (expected 7 fields, got ${fields.length})`);
    }

    const postalCode = fields[0].replace(/"/g, '').trim();
    const prefecture = fields[4].replace(/"/g, '').trim();
    const city = fields[5].replace(/"/g, '').trim();
    const town = fields[6].replace(/"/g, '').trim();

    // Validate postal code (must be 7 digits)
    if (!/^\d{7}$/.test(postalCode)) {
      throw new Error(`Invalid postal code format: ${postalCode}`);
    }

    // Store in database (indexed by postal code without hyphen)
    this.codes[postalCode] = {
      prefecture,
      city,
      town
    };

    this.processedCount++;
  }

  /**
   * Split CSV line by comma, respecting quoted fields
   * @param {string} line - CSV line
   * @returns {Array<string>} - Array of fields
   */
  splitCSV(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Push last field
    fields.push(current);

    return fields;
  }

  /**
   * Save database to JSON file
   */
  async saveJSON() {
    console.log('\n💾 Saving to JSON...');

    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      console.log('   Creating directory:', outputDir);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert to JSON (minified - no whitespace)
    const json = JSON.stringify(this.codes);

    // Write to file
    fs.writeFileSync(this.outputPath, json, 'utf-8');

    const fileSize = (fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2);
    console.log('✅ JSON saved successfully!');
    console.log(`   Output: ${this.outputPath}`);
    console.log(`   File size: ${fileSize} MB`);

    // Sample data for verification
    console.log('\n📊 Sample Data (first 5 codes):');
    const sampleCodes = Object.keys(this.codes).slice(0, 5);
    sampleCodes.forEach(code => {
      const data = this.codes[code];
      console.log(`   ${code}: ${data.prefecture} / ${data.city} / ${data.town}`);
    });

    console.log('\n🎉 Parser complete!');
    console.log(`   Ready to use in extension: data/postal/romaji-codes.json`);
  }
}

// Run parser
const parser = new RomajiPostalCodeParser();
parser.parse().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
