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
- Current version: v5 (hybrid v4 structure + v5 inference improvements)
- Key features: JSON optimization rules, inference guidance, multi-visa support
- Critical: Preserves array structures for auto-boolean logic while adding smart inference

#### DS-160 v4 vs v5 Evolution
- **v4**: Literal extraction, basic structure, working auto-boolean logic
- **v5 Original**: Smart inference but broke array structures (visits → string)
- **v5 Current**: Hybrid approach preserving v4 arrays + v5 intelligence
- **Result**: Best of both - smart inference with reliable auto-boolean fields

#### Visa Scheduler Prompts
- Location: `data/visa/visa_scheduler_prompt_v*.txt`
- Current version: v1 (created from VISA_SCHEDULER_0913.rtf)
- Key features: Main applicant vs dependent logic, document delivery rules

#### JSON Optimization Rules (Critical for ChatGPT)
```javascript
// Rules to prevent bloated outputs and API cutoffs
- OMIT all empty fields (no "", null, "N/A")
- OMIT security section if all values are false
- OMIT entire sections if not applicable
- Use exact field names from content scripts
- Preserve array structures: visits: [], licenses: [], etc.
- Add inference guidance: "infer appropriate category", "round to whole number"
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

## Critical Bug Fixes (Recent)

### Month Dropdown Override Bug (Fixed)
**Problem**: All previous travel visits showed first visit's month instead of individual months (8,8,7,3,1 → all showing 8).

**Root Cause**: Conflicting processing systems - dynamic handler (lines 1318-1325) overriding correct static field mappings.

**Solution**: Removed conflicting dynamic handler entirely. Static mappings handle this correctly.

```javascript
// REMOVED conflicting code:
if (fieldId.includes('PREV_US_VISIT') && fieldId.includes('Month')) {
  const match = fieldId.match(/ctl(\d+)/);
  if (match) {
    const index = parseInt(match[1]);
    const visit = data.previousTravel?.visits?.[index];
    return this.getMonthNumber(visit?.arrivalDate || visit?.entryDate);
  }
}
```

### Additional Email Radio Button Fix
**Problem**: Radio button showing "No" despite additionalEmails data being present.

**Solution**: Updated radio button logic to check both `otherEmails` and `additionalEmails` arrays:

```javascript
'ctl00_SiteContentPlaceHolder_FormView1_rblAddEmail_0':
  data.contact?.hasOtherEmails === 'YES' ||
  (data.contact?.otherEmails && data.contact?.otherEmails.length > 0) ||
  (data.contact?.additionalEmails && data.contact?.additionalEmails.length > 0),
```

### Array Structure Preservation in Prompt Schema
**Critical Issue**: During v5 prompt standardization, accidentally converted array structures to string descriptions, breaking auto-boolean logic.

**Problem**: Changed `"visits": []` to `"visits": "Array of..."` broke `hasBeenToUS` and other auto-boolean fields.

**Solution**: Restored v4 array structures while keeping v5 inference improvements - hybrid approach.

## Enhanced Prompt Engineering (v5 Improvements)

### Inference vs Literal Extraction Balance
Updated DS-160 v5 prompt with embedded inference guidance for better ChatGPT decision-making:

```
"occupation": "string or N/A - infer appropriate category from job description (e.g., Business for sales/management roles)",
"gender": "M or F - infer from given name if not explicitly stated",
"jobTitle": "string or N/A - job title ONLY do not include description",
"monthlyIncome": "string or N/A - round to nearest whole number"
```

### Schema Standardization Process
1. Audit for inconsistent formats (// comments, DEFAULT VALUES, plain fields)
2. Convert // comment fields to embedded descriptions
3. Preserve array structures for auto-boolean logic
4. Add field-specific constraints (character limits, number formatting)

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
   - Previous travel months (each visit should show correct individual month)
   - Additional email radio button (should select "Yes" when additionalEmails present)
   - Job title field (should be short title, not description, max 70 chars)
   - Monthly income (should be whole number, no decimals)

### Visa Scheduling Testing
1. Navigate to scheduling sites:
   - https://www.usvisascheduling.com/*
   - https://ais.usvisa-info.com/*
   - https://ayobaspremium.jp/* (payment page)
2. Load sample from data/visa/
3. Test with dependents: sample_data_with_dependents.json
4. Verify document delivery uses main applicant address only

## Debugging

### Field Mapping Conflict Detection
When fields show incorrect values despite correct JSON data:

1. **Check for Dynamic Handler Conflicts**: Search for field processing in both static mappings and dynamic handlers
2. **Two-Pass System**: Remember that some fields are processed twice with 3.5s delay
3. **Auto-Boolean Logic**: Verify array structures are preserved (not string descriptions)

```javascript
// Debug conflicting field processing
console.log('Static mapping:', fieldMappings['fieldId']);
console.log('Dynamic handler active:', /* check handler code */);
```

### View DS-160 Crash Logs and Recovery
```javascript
// In browser console - view detailed crash logs
TwoPassFiller.showCrashLogs()

// Clear crash recovery data
TwoPassFiller.clearLogs()

// Check current filling state
TwoPassFiller.getState()

// View localStorage recovery data
localStorage.getItem('ds160_crash_recovery')
```

### Prompt Schema Validation
```javascript
// Test array structure preservation
const testData = JSON.parse(promptOutput);
console.log('hasBeenToUS logic:', testData.previousTravel?.visits?.length > 0);
console.log('Array type check:', Array.isArray(testData.previousTravel?.visits));

// Validate field constraints
console.log('Job title length:', testData.employment?.jobTitle?.length);
console.log('Salary format:', testData.employment?.monthlyIncome);
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

// Check radio button states
const radioYes = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_rblAddEmail_0');
console.log('Radio Yes checked:', radioYes?.checked);
```

## Development Insights (Latest)

### Field Mapping Conflict Prevention
- **Always check both static mappings AND dynamic handlers** when adding new fields
- Dynamic handlers should complement, not override static mappings
- Use descriptive comments to indicate handler purpose and avoid conflicts

### Prompt Engineering Best Practices
1. **Test schema changes incrementally** - don't change multiple sections at once
2. **Preserve working array structures** - auto-boolean logic depends on them
3. **Add constraints explicitly** - ChatGPT needs specific formatting guidance
4. **Balance inference vs literal** - some fields need smart inference, others need exact extraction

### Auto-Boolean Logic Dependencies
These fields automatically set based on array presence/length:
```javascript
hasBeenToUS: data.previousTravel?.visits?.length > 0
hasDriversLicense: data.personal?.licenses?.length > 0
hasEmployerHistory: data.employment?.previousEmployers?.length > 0
```
**Critical**: Arrays must remain `[]` not `"Array of..."` descriptions

### Common Regression Patterns
1. **Month dropdowns**: Watch for dynamic handler conflicts with static mappings
2. **Radio buttons**: Ensure all data source variations are checked (otherEmails vs additionalEmails)
3. **Field constraints**: Job titles, salaries, and other user-input fields need explicit formatting rules
4. **Array structures**: Schema changes can accidentally break auto-boolean logic

### Version Control Strategy
- Test changes on single sample before updating prompt
- Keep v4 as fallback reference for working array structures
- Document all field mapping changes in CLAUDE.md
- Use descriptive commit messages with version numbers