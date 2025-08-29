/**
 * Test script for postal code lookup
 * Tests both ZipCloud (regular codes) and local business codes
 */

import { PostalCodeService } from './sidebar/modules/postal/postal-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load business codes directly for testing
const businessCodesPath = path.join(__dirname, 'data/postal/business-codes.json');
const businessCodes = JSON.parse(fs.readFileSync(businessCodesPath, 'utf8'));

// Mock chrome.runtime.getURL and fetch for Node.js testing
global.chrome = {
  runtime: {
    getURL: (path) => {
      return 'file://' + __dirname + '/' + path;
    }
  }
};

// Mock fetch for loading local business codes
global.fetch = async (url) => {
  if (url.includes('business-codes.json')) {
    return {
      json: async () => businessCodes
    };
  }
  // For ZipCloud, use real fetch
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch(url);
};

// Test cases
const testCases = [
  { code: '150-0002', description: 'Regular postal code (Shibuya)', expected: 'ZipCloud' },
  { code: '106-0041', description: 'Regular postal code (Azabudai)', expected: 'ZipCloud' },
  { code: '455-8630', description: 'Business postal code (Nagoya - Yamato)', expected: 'BusinessCodes' },
  { code: '100-8050', description: 'Business postal code (Tokyo)', expected: 'BusinessCodes' },
  { code: '999-9999', description: 'Invalid postal code', expected: 'NotFound' }
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function runTests() {
  console.log(`${colors.bright}${colors.cyan}=== Testing Postal Code Lookup ===${colors.reset}\n`);
  
  const service = new PostalCodeService();
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log(`${colors.bright}Testing: ${test.description}${colors.reset}`);
    console.log(`Code: ${test.code}`);
    
    const result = await service.lookup(test.code);
    
    if (result.success) {
      console.log(`${colors.green}✓ Found via ${result.source}${colors.reset}`);
      console.log(`  Address: ${result.data.prefecture}${result.data.city}${result.data.street}`);
      
      if (result.data.business) {
        console.log(`  Business: ${result.data.business}`);
      }
      
      // Check if source matches expected
      if (result.source === test.expected || test.expected === 'NotFound') {
        passed++;
      } else {
        console.log(`${colors.yellow}  ⚠ Expected source: ${test.expected}, got: ${result.source}${colors.reset}`);
        failed++;
      }
    } else {
      if (test.expected === 'NotFound') {
        console.log(`${colors.green}✓ Not found (as expected)${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ Not found (unexpected)${colors.reset}`);
        console.log(`  Error: ${result.error}`);
        failed++;
      }
    }
    
    console.log('');
  }
  
  // Summary
  console.log(`${colors.bright}${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.bright}${colors.green}✅ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.bright}${colors.red}❌ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test error:${colors.reset}`, error);
  process.exit(1);
});