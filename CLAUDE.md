# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Setup and Configuration
```bash
# Install dependencies (required for setup scripts)
npm install

# Configure OpenAI API key for photo validation
npm run encrypt-key
# Enter your OpenAI API key when prompted
```

### Testing
```bash
# Test postal code lookup functionality
node test-postal-lookup.js

# Test business codes database
node test-final-100-codes.js

# Test specific form filling after changes
# 1. Load extension and navigate to target site
# 2. Open sidebar, select module, load test data
# 3. Click "Auto-Fill Form"
```

### Chrome Extension Development
```bash
# Load extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the tomitalaw_extension folder
# 5. After changes, click refresh icon on extension card

# Quick reload shortcut: Cmd+R on chrome://extensions page
# View service worker logs: Click "service worker" link on extension card
```

### Git Workflow
```bash
# Check current version in manifest.json
grep version manifest.json

# Commit with version bump
git add -A
git commit -m "Version X.X.X: Description"
git push origin main
```

## Architecture

### Core Structure
This is a Chrome Extension (Manifest V3) with a modular architecture for form automation and utilities:

- **background.js**: Service worker handling messaging between components
- **sidebar/**: Persistent side panel UI with tab-based modules
- **content/modules/**: Page-specific content scripts for form filling
- **data/**: Sample JSON data and databases (22,209 business postal codes)
- **scripts/injected.js**: Scripts injected into page context for direct DOM access

### Module System
Modules are configured in `modules.config.js`. Each module can have:
- Content script for specific domains
- Sidebar UI template in sidebar.html
- Service implementation in sidebar/modules/

Active modules:
- **DS-160**: Auto-fills US visa application forms on ceac.state.gov
- **Visa Scheduling**: Auto-fills scheduling forms on multiple visa sites
- **Photo Checker**: AI validation using GPT-4 Vision
- **Postal Lookup**: Japanese postal code conversion
- **Text Extractor**: AI-powered text extraction from documents

### Critical Implementation Details

#### DS-160 Form Filling (content/modules/ds160-content.js)
- Uses two-pass filling system with 3.5s delay between passes for dynamic fields
- Implements crash recovery via localStorage persistence
- Field IDs follow pattern: `ctl00_SiteContentPlaceHolder_FormView1_[FIELD_NAME]`
- Radio buttons require individual suffixes: `rblDisease_0` (Yes), `rblDisease_1` (No)

#### Multi-Visa Type Support Pattern
When fields need to support multiple visa types (L-1, E-2, H-1B), use OR operator fallback chains:
```javascript
// Pattern for handling multiple data sources
'ctl00_SiteContentPlaceHolder_FormView1_tbxWP_APP_RCPT_NUM': 
  data.travel?.petitionNumber || 
  data.petition?.receiptNumber || 
  data.temporaryWork?.petitionNumber || 
  data.petitionerInfo?.petitionNumber,

// Duplicate field resolution - combine with fallbacks
'ctl00_SiteContentPlaceHolder_FormView1_ddlCountry': (() => {
  const country = data.contact?.homeCountry || 
                 data.evisaApplicationContact?.address?.country;
  return this.mapCountry(country);
})(),
```

#### Country Code Mapping
DS-160 uses non-standard codes - must use `mapCountry()` function:
- ISO-3 → DS-160: DEU→GER, THA→THAI, GBR→GRBR, CHN→CHIN
- Full mapping in ds160-content.js lines 2300-2450

#### Field Mapping Patterns
```javascript
// Correct radio button pattern
'rblPREV_US_TRAVEL_IND_0': data.previousUSTravel === true,
'rblPREV_US_TRAVEL_IND_1': data.previousUSTravel === false,

// ESTA denial field (added Sept 2024)
'rblVWP_DENIAL_IND_0': data.previousTravel?.estaDenied === true,
'rblVWP_DENIAL_IND_1': data.previousTravel?.estaDenied === false,

// Petition number fields (multiple locations)
'tbxWP_APP_RCPT_NUM': data.travel?.petitionNumber,
'tbxPRIN_APP_PETITION_NUM': data.travel?.petitionNumber,

// Date fields
'ddlDOBDay': birthDate.getDate(),
'ddlDOBMonth': birthDate.getMonth() + 1,  // JavaScript months are 0-indexed
'tbxDOBYear': birthDate.getFullYear(),
```

#### Security Section Defaults
Security questions default to false when missing to comply with State Department requirements:
```javascript
const getSecurityValue = (value) => value === true || value === 'true';
```

### Prompt Management System
The extension uses versioned prompts to guide ChatGPT in generating properly formatted JSON:

#### DS-160 Prompts
- Location: `data/ds160/ds160_prompt_combined_v*.txt`
- Current version: v5 (most comprehensive with full examples)
- Key features: JSON optimization rules, complete field examples, multi-visa support

#### Visa Scheduler Prompts  
- Location: `data/visa/visa_scheduler_prompt_v*.txt`
- Current version: v1 (created from VISA_SCHEDULER_0913.rtf)
- Key features: Main applicant vs dependent logic, document delivery rules

#### JSON Optimization Rules (Critical for ChatGPT)
```javascript
// Rules to prevent bloated outputs
- OMIT all empty fields (no "", null, "N/A")
- OMIT security section if all values are false
- OMIT entire sections if not applicable
- Use exact field names from content scripts
```

### External APIs

#### OpenAI GPT-4 Vision (Photo Validation)
- API key encrypted via XOR + Base64 + chunking
- Stored in chrome.storage.local as 'encryptedApiKey'
- Implementation: sidebar/modules/photo/photo-service.js

#### ZipCloud API (Regular Postal Codes)
- Endpoint: https://zipcloud.ibsnet.co.jp/api/search
- Used for codes where 4th digit ≠ 8 or 9

#### Local Database (Business Postal Codes)
- File: data/postal/business-codes.json (3.25MB, minified)
- Used for codes where 4th digit = 8 or 9
- Contains 22,209 Japanese business postal codes

## Data Formats

### DS-160 JSON Structure
```json
{
  "personal": {
    "surname": "SMITH",
    "givenName": "JOHN",
    "dateOfBirth": "1990-01-15"
  },
  "passport": {
    "passportNumber": "AB123456",
    "issuingAuthority": "USA",
    "issueCountry": "USA"
  }
}
```
- Omit empty fields entirely (no "N/A" strings)
- Dates use YYYY-MM-DD format
- Phone numbers strip all formatting

### Visa Scheduling JSON
```json
{
  "primaryApplicant": {
    "firstName": "John",
    "lastName": "Smith",
    "passportNumber": "AB123456"
  },
  "dependents": []
}
```

## Known Issues and Solutions

### Missing Icon Files
Manifest references icons that don't exist (icon16.png, icon48.png, icon128.png).
Create or add these files to icons/ directory.

### Large File Refactoring Needed
- ds160-content.js is 2500+ lines - needs modularization
- Consider splitting into: field-mappings.js, form-handlers.js, country-codes.js

### JSON Size Optimization
DS-160 responses can be cut off. Optimizations implemented:
- Remove all "N/A" values
- Omit security section when all false
- Use optional chaining for resilient field access

### Month Parsing
Fixed in getMonthNumber() to handle both DD/MM/YYYY and MM/DD/YYYY formats correctly.

## Testing Specific Pages

### DS-160 Testing
1. Navigate to https://ceac.state.gov/genniv/
2. Load sample data from data/ds160/
3. Test files include scenarios for:
   - E-visa applications (sample_evisa_data.json)
   - Multiple employers (TEST_FIRST_EMPLOYER_ONLY.json)
   - Skip checkboxes (TEST_SKIP_CHECKBOXES.json)
   - L-1/H-1B petitions (test with petition numbers)
4. Verify critical fields after filling:
   - ESTA denial checkbox (Security and Background section)
   - Petition numbers (Temporary Work Visa section)
   - Country dropdowns (should show full country names)

### Visa Scheduling Testing
1. Navigate to scheduling sites:
   - https://www.usvisascheduling.com/*
   - https://ais.usvisa-info.com/*
   - https://ayobaspremium.jp/* (payment page)
2. Load sample from data/visa/
3. Test with dependents: sample_data_with_dependents.json
4. Verify document delivery uses main applicant address only

## Debugging

### View DS-160 Crash Logs
```javascript
// In browser console
TwoPassFiller.showCrashLogs()
// Clear logs
TwoPassFiller.clearLogs()
```

### Check Extension Logs
1. Open Chrome DevTools (F12)
2. Go to chrome://extensions/
3. Click "service worker" link on extension card
4. Check Console tab for background script logs

### Common Debugging Commands
```javascript
// Check filled values in console
document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_tbxWP_APP_RCPT_NUM').value

// Test country mapping
window.VisaFormFiller.mapCountry('USA')  // Should return 'UNITEDSTATES'

// View current data in storage
chrome.storage.local.get(['ds160Data', 'visaData'], console.log)
```