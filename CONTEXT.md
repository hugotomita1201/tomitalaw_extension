# Project Context: TomitaLaw AI Chrome Extension

## Quick Overview
A comprehensive Chrome extension that automates form filling for US visa applications (DS-160 and visa scheduling forms) with AI-powered features and a persistent sidebar interface. Built using Manifest V3, it features intelligent field mapping, multi-pass filling strategies, dependent management, passport photo validation using GPT-4 Vision, and Japanese postal code lookup with dual data sources.

## Technology Stack
- **Runtime**: Chrome Extension (Manifest V3)
- **Languages**: JavaScript (ES6+), HTML5, CSS3
- **APIs**: Chrome Extension APIs (storage, tabs, scripting, sidePanel, runtime)
- **External Services**: 
  - OpenAI GPT-4 Vision API (passport photo validation)
  - ZipCloud API (regular Japanese postal code lookup)
- **Local Databases**: Business postal codes (22,209 entries, 3.25MB)
- **Architecture**: Modular content script system with background service worker
- **Security**: Multi-layer API key encryption (XOR + Base64 + chunking)

## Project Structure
```
/Users/hugo/tomitalaw_extension/
├── manifest.json                 # Extension configuration, permissions, content scripts
├── modules.config.js            # Central module registry and configuration
├── background.js                # Service worker handling messaging and storage
├── sidebar/                     # Persistent sidebar UI
│   ├── sidebar.html            # UI templates for all modules
│   ├── sidebar.css             # Styling for sidebar interface
│   ├── sidebar.js              # Main controller for sidebar functionality
│   └── modules/                # Module-specific implementations
│       ├── ds160/              # DS-160 module UI components
│       ├── visa/               # Visa scheduling UI components
│       ├── photo/              # Photo validation service
│       │   └── photo-service.js # GPT-4 Vision integration
│       └── postal/             # Postal code lookup service
│           └── postal-service.js # ZipCloud + local business codes
├── content/                     # Content scripts injected into target sites
│   ├── content-router.js       # Routes messages to appropriate modules
│   └── modules/
│       ├── ds160-content.js    # DS-160 form filling logic (2500+ lines)
│       └── visa-content.js     # Visa scheduling form filling (900+ lines)
├── data/                        # Test data and databases
│   ├── ds160/                  # DS-160 test JSON files
│   ├── visa/                   # Visa scheduling test JSON files
│   ├── photo/                  # Photo validation requirements
│   └── postal/                 # Postal code databases
│       └── business-codes.json # 22,209 business postal codes
├── setup/                       # Setup and utility scripts
│   ├── encrypt-api-key.js      # Encrypt OpenAI API key
│   └── process-business-codes.js # Convert JIGYOSYO.CSV to JSON
└── icons/                       # Extension icons (16x16, 48x48, 128x128)
```

## Key Components

### Background Service Worker (`background.js`)
- **Purpose**: Central messaging hub and storage manager
- **Location**: `/Users/hugo/tomitalaw_extension/background.js`
- **Key Functions**:
  - `onInstalled`: Initialize default storage values
  - `onMessage`: Handle inter-component communication
  - `onMessageExternal`: Accept data from TomitaLaw website
  - Periodic cleanup of old data (7-day retention)
- **Dependencies**: `modules.config.js`

### Module Configuration (`modules.config.js`)
- **Purpose**: Central registry for all extension modules
- **Location**: `/Users/hugo/tomitalaw_extension/modules.config.js`
- **Key Components**:
  - `MODULES` array: Defines ds160, visa, postal modules
  - Helper functions: `getModuleById`, `getActiveModules`, `getModuleForUrl`
- **Module Structure**:
  ```javascript
  {
    id: 'ds160',
    name: 'DS-160',
    icon: '📋',
    contentScript: 'ds160-content.js',
    domains: ['https://ceac.state.gov/*'],
    dataKey: 'ds160Data',
    active: true
  }
  ```

### DS-160 Content Script (`ds160-content.js`)
- **Purpose**: Automated filling of DS-160 visa application forms
- **Location**: `/Users/hugo/tomitalaw_extension/content/modules/ds160-content.js`
- **Key Classes**:
  - `TwoPassFiller`: Main controller with crash recovery logging
- **Key Methods**:
  - `detectCurrentPage()`: Identifies which DS-160 page is active
  - `fillField()`: Intelligent field filling with type detection
  - `findMatchingValue()`: Maps JSON data to form field IDs
  - `getVisibleFields()`: Discovers fillable fields on current page
- **Filling Strategies**:
  - Two-pass system with 3.5-second delay between passes
  - Aggressive re-filling for fields that get cleared by form JavaScript
  - Special handling for dropdowns, dates, SSN split fields
  - Address overflow management (40-character limit)
  - Persistent localStorage logging for crash recovery

### Visa Scheduling Content Script (`visa-content.js`)
- **Purpose**: Fills US visa scheduling and payment forms
- **Location**: `/Users/hugo/tomitalaw_extension/content/modules/visa-content.js`
- **Key Classes**:
  - `VisaSchedulingFiller`: Main controller with dependent management
- **Key Methods**:
  - `detectPageType()`: Identifies current page (payment, signup, applicant, etc.)
  - `fillGenericFields()`: Handles atlas_ prefixed fields
  - `fillSignupPage()`: Special handling for Atlas Auth signup
  - `fillPaymentPage()`: Ayobas Premium payment form filling
- **Special Features**:
  - Dependent selector for multi-person applications
  - Atlas field format support (atlas_ prefix)
  - Security question auto-answers (Tomita/Law/Office pattern)

### Sidebar Controller (`sidebar.js`)
- **Purpose**: Main UI controller for the extension sidebar
- **Location**: `/Users/hugo/tomitalaw_extension/sidebar/sidebar.js`
- **Key Functions**:
  - `initializeTabs()`: Dynamic tab generation from modules
  - `switchToModule()`: Module switching and content loading
  - `setupDS160Handlers()`: DS-160 specific UI logic
  - `setupVisaHandlers()`: Visa scheduling UI with person selector
  - `setupPostalHandlers()`: Japanese postal code lookup
- **Dependencies**: Module templates from `sidebar.html`

### Postal Service (`postal-service.js`)
- **Purpose**: Japanese postal code to address conversion with dual data sources
- **Location**: `/Users/hugo/tomitalaw_extension/sidebar/modules/postal/postal-service.js`
- **Data Sources**:
  - Primary: ZipCloud API for regular postal codes (https://zipcloud.ibsnet.co.jp/api/search)
  - Fallback: Local business codes database (22,209 corporate codes)
- **Key Methods**:
  - `lookup()`: Main lookup with ZipCloud → business codes → failed flow
  - `loadBusinessCodes()`: Lazy load local database
  - `lookupBusinessCode()`: Search local business codes
  - `normalizePostalCode()`: Convert to 7-digit format
  - `formatPostalCode()`: Format as XXX-XXXX
  - `formatZipCloudResponse()`: Structure API response
- **Business Code Detection**: 4th digit = 8 or 9 indicates corporate postal code

### Photo Validation Service (`photo-service.js`)
- **Purpose**: AI-powered passport photo validation for DS-160 requirements
- **Location**: `/Users/hugo/tomitalaw_extension/sidebar/modules/photo/photo-service.js`
- **API**: OpenAI GPT-4 Vision (gpt-4-vision-preview model)
- **Key Methods**:
  - `initialize()`: Decrypt and load API key
  - `decrypt()`: Multi-layer decryption of API key
  - `validatePhoto()`: Send photo to GPT-4 for analysis
  - `convertToBase64()`: Prepare image for API
- **Validation Checks**:
  - Technical specs (2x2 inches, 600x600 pixels minimum)
  - Composition (head size 50-69% of height, centered)
  - Background (plain white/off-white)
  - Quality (lighting, shadows, focus, red-eye)
- **Security**: API key encrypted with XOR + Base64 + reverse + chunking

## Critical Patterns

### Module Registration Pattern
All modules are registered in `modules.config.js`. Current modules:
- **ds160**: DS-160 form filling for ceac.state.gov
- **visa**: Visa scheduling for multiple sites
- **postal**: Japanese postal code lookup
- **photo**: Passport photo validation

To add a new module:
1. Add configuration object to `MODULES` array in `modules.config.js`
2. Create content script in `content/modules/` (if needed)
3. Add UI template to `sidebar.html`
4. Add module handler in `sidebar.js`
5. System automatically handles routing and initialization

### Message Passing Architecture
```javascript
// Content → Background → Sidebar
chrome.runtime.sendMessage({ action: 'fillComplete', module: 'ds160' })

// Sidebar → Tab → Content Script
chrome.tabs.sendMessage(tabId, { action: 'fillForm', module: 'ds160', data: {...} })
```

### Field Mapping Strategy (DS-160)
- Direct ID mapping: `ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME`
- Dynamic field detection for repeating sections (previous employers, education)
- Special handlers for date fields (day/month/year dropdowns)
- Checkbox handling for "Does Not Apply" fields
- SSN splitting into 3 parts

### Data Storage Pattern
```javascript
// Storage structure
{
  ds160Data: {...},        // Current DS-160 form data
  visaData: {...},         // Current visa scheduling data
  lastDS160Data: "...",    // Raw JSON string for persistence
  selectedPersonId: "...", // For dependent selection
  extensionEnabled: true,
  activeModules: ['ds160', 'visa', 'postal']
}
```

## Entry Points & Flows

### Extension Initialization
1. User clicks extension icon → `chrome.action.onClicked`
2. Background script opens side panel
3. Sidebar loads first active module
4. Module template rendered from `sidebar.html`

### DS-160 Form Filling Flow
1. User pastes JSON data in sidebar
2. Clicks "Load Data" → validates and previews
3. Clicks "Auto-Fill" → stores data in chrome.storage
4. Content script injected if needed
5. Two-pass filling begins with field detection
6. Crash recovery logs saved to localStorage

### Visa Scheduling Flow
1. User loads data with dependent information
2. Person selector shows if multiple people
3. User selects person to fill
4. Content script fills only selected person's data
5. Atlas fields mapped to form inputs

## Configuration

### Manifest Permissions
- `storage`: Data persistence
- `activeTab`: Current tab access
- `scripting`: Dynamic script injection
- `sidePanel`: Persistent sidebar UI

### Host Permissions
- `ceac.state.gov/*`: DS-160 forms
- `usvisascheduling.com/*`: Visa scheduling
- `ais.usvisa-info.com/*`: Alternative visa site
- `ayobaspremium.jp/*`: Payment processing
- `atlasauth.b2clogin.com/*`: Authentication

## API/Interface Summary

### Chrome Runtime Messages
```javascript
// Get stored data
{ action: 'getStoredData' }

// Fill form
{ action: 'fillForm', module: 'ds160', data: {...} }

// Status updates
{ action: 'fillComplete', module: 'visa' }
{ action: 'fillError', module: 'visa', error: 'message' }
```

### External Messages (from TomitaLaw website)
```javascript
{ action: 'storeData', dataType: 'ds160', data: {...} }
```

### External API Endpoints
```javascript
// ZipCloud postal code API
GET https://zipcloud.ibsnet.co.jp/api/search?zipcode={7-digit-code}

// OpenAI GPT-4 Vision API
POST https://api.openai.com/v1/chat/completions
Headers: { 'Authorization': 'Bearer {encrypted-api-key}' }
Body: { model: 'gpt-4-vision-preview', messages: [...], max_tokens: 1000 }
```

## Database/Data Structure

### DS-160 Data Format
```javascript
{
  personal: {
    givenName: string,
    surname: string,
    middleName: string,
    dateOfBirth: 'YYYY-MM-DD',
    nationality: string,
    gender: 'Male'|'Female',
    maritalStatus: string,
    birthCity: string,
    birthState: string,
    birthCountry: string,
    nationalId: string,
    usSocialSecurity: string,
    usTaxId: string
  },
  passport: {
    passportNumber: string,
    issueDate: 'YYYY-MM-DD',
    expirationDate: 'YYYY-MM-DD',
    issuingCountry: string
  },
  travel: {
    purposeOfTrip: string,
    arrivalDate: 'YYYY-MM-DD',
    lengthOfStay: string,
    principalApplicant: {...}
  },
  workEducation: {
    presentEmployer: {...},
    previousEmployers: [...],
    previousEducation: [...]
  }
}
```

### Visa Scheduling Data Format
```javascript
{
  // Atlas fields (new format)
  atlas_first_name: string,
  atlas_last_name: string,
  atlas_birthdate_datepicker_description: string,
  atlas_email: string,
  atlas_passport_number: string,
  
  // Dependent support
  dependents: [
    {
      id: string,
      displayName: string,
      atlas_first_name: string,
      atlas_relation_to_applicant: string
    }
  ]
}
```

## Testing Strategy

### Test Data Files
- `/data/ds160/TEST_ACTUAL_DATA_SANITIZED.json`: Real data with sanitized values
- `/data/ds160/TEST_SKIP_CHECKBOXES.json`: Tests checkbox skipping
- `/data/visa/sample_data_4_dependents.json`: Multi-person visa data
- `/data/photo/requirements.json`: DS-160 photo requirements for validation
- `/data/postal/business-codes.json`: 22,209 business postal codes database

### Test Scripts
- `/test-postal-lookup.js`: Tests postal code lookup with both data sources
- `/test-final-100-codes.js`: Comprehensive test with 100 postal codes
- `/setup/encrypt-api-key.js`: Interactive script to encrypt OpenAI API key
- `/setup/process-business-codes.js`: Convert JIGYOSYO.CSV to JSON database

### Debug Features
- DS-160 crash recovery logs: `localStorage.getItem('ds160_debug_logs')`
- Console logging with field-level detail
- Persistent logging survives page crashes

## Important Notes

### DS-160 Specific Gotchas
- Personal Page 2 nationality dropdown appears after Page 1 completion
- Dynamic petition number field loads after 3.5 seconds
- Previous travel page fields get cleared by form JavaScript - requires aggressive re-filling
- Address fields limited to 40 characters - overflow to line 2
- Month dropdowns use numeric values (01-12) not names
- SSN split into 3 fields: xxx-xx-xxxx pattern

### Visa Scheduling Gotchas
- Atlas Auth signup requires specific security answers: Tomita/Law/Office
- Payment page skips amount/receipt fields for manual entry
- Email fields on signup page left empty for user input
- Language dropdown requires native script values (日本語 not Japanese)
- Document delivery defaults to premium option

### Chrome Extension Limitations
- Content scripts can't access `chrome.storage` directly in some contexts
- Manifest V3 removes persistent background pages - uses service workers
- Side panel API requires Chrome 114+
- External messaging limited to specified domains in manifest

### Security Considerations
- External messages only accepted from whitelisted TomitaLaw domains
- API keys encrypted using multi-layer obfuscation:
  - XOR with salt string
  - Base64 encoding
  - String reversal
  - Chunking into 4 parts
- Data automatically cleaned after 7 days
- No sensitive data logged to console in production
- Password fields never auto-filled
- Content Security Policy restricts network access to approved APIs
- Photo validation API key never exposed in plain text

## Recent Changes & Updates

### Latest Updates (v1.2.0)
- **Replaced Japan Post API**: Migrated from backend API (404 errors) to local business codes database
- **Added Photo Validation**: Integrated OpenAI GPT-4 Vision for passport photo checks
- **Postal Code System Overhaul**: 
  - Primary: ZipCloud API for regular codes
  - Fallback: Local database with 22,209 business codes
  - Processing script converts JIGYOSYO.CSV (Shift-JIS) to JSON
- **Security Enhancements**: Multi-layer API key encryption system
- **Testing Infrastructure**: Added comprehensive postal code test scripts

### Previous Updates (v1.1.0)
- Fixed DS-160 two-pass filling system
- Restored dependent selection functionality
- Improved Atlas field support for new visa forms
- Enhanced sidebar responsive design

## How to Use This Context

For AI agents working with this codebase:

1. **Adding New Forms**: Create module in `modules.config.js`, add content script with field mappings
2. **Debugging Issues**: 
   - DS-160: Check `localStorage.getItem('ds160_debug_logs')` for crash recovery
   - Visa: Console logs with field-level detail
   - Photo: Check API response for validation errors
   - Postal: Verify data source (ZipCloud vs business codes)
3. **Field Mapping**: Use browser DevTools to inspect field IDs, add to `findMatchingValue()`
4. **Testing**: 
   - Use sample data files in `/data/`
   - Run test scripts: `node test-postal-lookup.js`
   - Modify `_testMode` flag for specific scenarios
5. **API Setup**:
   - OpenAI: Run `npm run encrypt-key` to set up photo validation
   - Postal: No setup needed (ZipCloud is free, business codes bundled)
6. **Extending**: Follow module pattern - config → content script → sidebar template

Key files to modify for common tasks:
- New form support: `modules.config.js` + new content script
- Field mapping fixes: `ds160-content.js` lines 900-1800 or `visa-content.js` lines 238-500
- UI changes: `sidebar.html` templates + `sidebar.js` handlers
- Data format changes: Update field mappings in respective content scripts
- API integrations: Add service in `sidebar/modules/` following photo/postal pattern
- Database updates: Process new data with scripts in `/setup/`

This extension is actively maintained and designed for extensibility. The modular architecture allows easy addition of new visa forms or tools without affecting existing functionality. The recent addition of AI-powered features and local databases demonstrates the flexibility of the architecture.
