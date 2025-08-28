# Project Context: TomitaLaw AI Chrome Extension

## Quick Overview
A modular Chrome extension that automates form filling for US visa applications (DS-160 and visa scheduling forms) with a persistent sidebar interface. Built using Manifest V3, it features intelligent field mapping, multi-pass filling strategies, and support for dependent management.

## Technology Stack
- **Runtime**: Chrome Extension (Manifest V3)
- **Languages**: JavaScript (ES6+), HTML5, CSS3
- **APIs**: Chrome Extension APIs (storage, tabs, scripting, sidePanel, runtime)
- **External Services**: ZipCloud API (Japanese postal code lookup)
- **Architecture**: Modular content script system with background service worker

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
│       └── postal/             # Postal code lookup service
│           └── postal-service.js
├── content/                     # Content scripts injected into target sites
│   ├── content-router.js       # Routes messages to appropriate modules
│   └── modules/
│       ├── ds160-content.js    # DS-160 form filling logic (2500+ lines)
│       └── visa-content.js     # Visa scheduling form filling (900+ lines)
├── data/                        # Test data and samples
│   ├── ds160/                  # DS-160 test JSON files
│   └── visa/                   # Visa scheduling test JSON files
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
- **Purpose**: Japanese postal code to address conversion
- **Location**: `/Users/hugo/tomitalaw_extension/sidebar/modules/postal/postal-service.js`
- **API**: ZipCloud (https://zipcloud.ibsnet.co.jp/api/search)
- **Key Methods**:
  - `lookup()`: Main postal code lookup
  - `normalizePostalCode()`: Format validation
  - `getBasePostalCode()`: Corporate code handling
  - `formatResponse()`: Structure address components

## Critical Patterns

### Module Registration Pattern
All modules are registered in `modules.config.js`. To add a new module:
1. Add configuration object to `MODULES` array
2. Create content script in `content/modules/`
3. Add UI template to `sidebar.html`
4. System automatically handles routing and initialization

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
- External messages only accepted from TomitaLaw domains
- Data cleaned after 7 days automatically
- No sensitive data logged to console in production
- Password fields never auto-filled

## How to Use This Context

For AI agents working with this codebase:

1. **Adding New Forms**: Create module in `modules.config.js`, add content script with field mappings
2. **Debugging Issues**: Check localStorage logs for DS-160, console for visa scheduling
3. **Field Mapping**: Use browser DevTools to inspect field IDs, add to `findMatchingValue()`
4. **Testing**: Use sample data files, modify `_testMode` flag for specific scenarios
5. **Extending**: Follow module pattern - config → content script → sidebar template

Key files to modify for common tasks:
- New form support: `modules.config.js` + new content script
- Field mapping fixes: `ds160-content.js` lines 900-1800 or `visa-content.js` lines 238-500
- UI changes: `sidebar.html` templates + `sidebar.js` handlers
- Data format changes: Update field mappings in respective content scripts

This extension is actively maintained and designed for extensibility. The modular architecture allows easy addition of new visa forms or tools without affecting existing functionality.
