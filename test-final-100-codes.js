/**
 * Final comprehensive test with 100 postal codes
 * Tests both regular (ZipCloud) and business codes (local database)
 */

import { PostalCodeService } from './sidebar/modules/postal/postal-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load business codes for testing
const businessCodesPath = path.join(__dirname, 'data/postal/business-codes.json');
const businessCodes = JSON.parse(fs.readFileSync(businessCodesPath, 'utf8'));

// Mock chrome.runtime.getURL and fetch
global.chrome = {
  runtime: {
    getURL: (path) => 'file://' + __dirname + '/' + path
  }
};

global.fetch = async (url) => {
  if (url.includes('business-codes.json')) {
    return { json: async () => businessCodes };
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch(url);
};

// Get sample business codes from our database
const businessCodesList = Object.keys(businessCodes).slice(0, 50);

// Popular regular postal codes (these should work with ZipCloud)
const regularCodes = [
  '100-0001', '100-0002', '100-0003', '100-0004', '100-0005', // Tokyo Chiyoda
  '150-0001', '150-0002', '150-0011', '150-0012', '150-0013', // Tokyo Shibuya
  '160-0001', '160-0002', '160-0003', '160-0004', '160-0005', // Tokyo Shinjuku
  '106-0031', '106-0032', '106-0041', '106-0044', '106-0045', // Tokyo Minato
  '530-0001', '530-0002', '530-0003', '530-0004', '530-0005', // Osaka
  '600-8001', '600-8002', '600-8003', '600-8004', '600-8005', // Kyoto
  '450-0001', '450-0002', '450-0003', '450-0004', '460-0001', // Nagoya
  '810-0001', '810-0002', '810-0003', '810-0004', '810-0005', // Fukuoka
  '060-0001', '060-0002', '060-0003', '060-0004', '060-0005', // Sapporo
  '980-0001', '980-0002', '980-0003', '980-0004', '980-0005', // Sendai
];

// Combine for 100 tests: 50 regular + 50 business codes
const testCodes = [
  ...regularCodes.map(code => ({ code, type: 'regular', expected: 'ZipCloud' })),
  ...businessCodesList.map(code => ({ 
    code: code.slice(0, 3) + '-' + code.slice(3), 
    type: 'business', 
    expected: 'BusinessCodes' 
  }))
];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

async function runComprehensiveTest() {
  console.log(`${colors.bright}${colors.cyan}=================================`);
  console.log(`   FINAL TEST: 100 POSTAL CODES`);
  console.log(`==================================${colors.reset}\n`);
  
  const service = new PostalCodeService();
  const startTime = Date.now();
  
  let regularSuccess = 0;
  let regularFailed = 0;
  let businessSuccess = 0;
  let businessFailed = 0;
  let errors = [];
  
  console.log(`Testing ${testCodes.length} postal codes...`);
  console.log(`${colors.dim}(50 regular codes via ZipCloud + 50 business codes via local DB)${colors.reset}\n`);
  
  // Test each code
  for (let i = 0; i < testCodes.length; i++) {
    const test = testCodes[i];
    const result = await service.lookup(test.code);
    
    // Show progress every 10 codes
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`${colors.dim}Progress: ${i + 1}/100${colors.reset}\r`);
    }
    
    if (result.success) {
      if (test.type === 'regular') {
        if (result.source === 'ZipCloud') {
          regularSuccess++;
        } else {
          regularFailed++;
          errors.push(`${test.code}: Expected ZipCloud, got ${result.source}`);
        }
      } else {
        if (result.source === 'BusinessCodes') {
          businessSuccess++;
        } else {
          businessFailed++;
          errors.push(`${test.code}: Expected BusinessCodes, got ${result.source}`);
        }
      }
    } else {
      if (test.type === 'regular') {
        regularFailed++;
        errors.push(`${test.code}: Regular code failed - ${result.error}`);
      } else {
        businessFailed++;
        errors.push(`${test.code}: Business code failed - ${result.error}`);
      }
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Clear progress line
  process.stdout.write('\x1b[2K\r');
  
  // Results
  console.log(`${colors.bright}${colors.cyan}=== RESULTS ===${colors.reset}\n`);
  
  console.log(`${colors.bright}Regular Postal Codes (ZipCloud):${colors.reset}`);
  console.log(`  ${colors.green}✓ Success: ${regularSuccess}/50${colors.reset}`);
  if (regularFailed > 0) {
    console.log(`  ${colors.red}✗ Failed: ${regularFailed}/50${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}Business Postal Codes (Local DB):${colors.reset}`);
  console.log(`  ${colors.green}✓ Success: ${businessSuccess}/50${colors.reset}`);
  if (businessFailed > 0) {
    console.log(`  ${colors.red}✗ Failed: ${businessFailed}/50${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}Performance:${colors.reset}`);
  console.log(`  Total time: ${duration} seconds`);
  console.log(`  Average: ${((endTime - startTime) / 100).toFixed(0)}ms per lookup`);
  
  // Show errors if any
  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Errors (${errors.length}):${colors.reset}`);
    errors.slice(0, 10).forEach(err => console.log(`  ${colors.red}• ${err}${colors.reset}`));
    if (errors.length > 10) {
      console.log(`  ${colors.dim}... and ${errors.length - 10} more${colors.reset}`);
    }
  }
  
  // Final summary
  const totalSuccess = regularSuccess + businessSuccess;
  const totalTests = testCodes.length;
  const successRate = ((totalSuccess / totalTests) * 100).toFixed(1);
  
  console.log(`\n${colors.bright}${colors.cyan}=== FINAL SUMMARY ===${colors.reset}`);
  console.log(`Total Success Rate: ${successRate}% (${totalSuccess}/${totalTests})`);
  
  if (totalSuccess === totalTests) {
    console.log(`\n${colors.bright}${colors.green}🎉 PERFECT! All 100 postal codes resolved correctly!${colors.reset}`);
  } else if (successRate >= 95) {
    console.log(`\n${colors.bright}${colors.green}✅ EXCELLENT! ${successRate}% success rate${colors.reset}`);
  } else if (successRate >= 90) {
    console.log(`\n${colors.bright}${colors.yellow}⚠️  GOOD! ${successRate}% success rate${colors.reset}`);
  } else {
    console.log(`\n${colors.bright}${colors.red}❌ NEEDS ATTENTION! Only ${successRate}% success rate${colors.reset}`);
  }
  
  // Test specific codes mentioned by user
  console.log(`\n${colors.bright}${colors.cyan}=== SPECIFIC CODES TEST ===${colors.reset}`);
  const specificCodes = ['455-8630', '100-8050', '150-0002'];
  
  for (const code of specificCodes) {
    const result = await service.lookup(code);
    if (result.success) {
      console.log(`${colors.green}✓ ${code}${colors.reset}: ${result.data.prefecture}${result.data.city} (via ${result.source})`);
      if (result.data.business) {
        console.log(`  Business: ${result.data.business}`);
      }
    } else {
      console.log(`${colors.red}✗ ${code}${colors.reset}: Not found`);
    }
  }
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});