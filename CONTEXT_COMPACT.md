# TomitaLaw Extension - Compact Context

## Overview
Chrome extension automating US visa forms (DS-160 & scheduling) with AI features. Manifest V3, modular architecture, 2500+ lines of form-filling logic.

## Core Files
```
/background.js           # Service worker, messaging hub
/modules.config.js       # Module registry
/sidebar/sidebar.js      # UI controller (1800+ lines)
/content/modules/
  ds160-content.js      # DS-160 filling (2500+ lines)
  visa-content.js       # Visa scheduling (900+ lines)
/data/                  # Test data & databases
```

## Key Features
- **DS-160**: Two-pass filling, crash recovery, 820+ field mappings
- **Visa**: Atlas fields, dependent management, multi-site support
- **Photo**: GPT-4 Vision passport validation
- **Postal**: ZipCloud API + 22K business codes database

## Architecture Patterns

### Module Registration
```javascript
// modules.config.js
{
  id: 'ds160',
  contentScript: 'ds160-content.js',
  domains: ['https://ceac.state.gov/*'],
  dataKey: 'ds160Data'
}
```

### Message Flow
Content → Background → Sidebar → Tab → Content

### Field Mapping (DS-160)
- Direct IDs: `ctl00_SiteContentPlaceHolder_FormView1_*`
- Dynamic detection for repeating sections
- Two-pass system with 3.5s delay
- Crash logs: `localStorage.getItem('ds160_debug_logs')`

### Data Storage
```javascript
{
  ds160Data: {...},
  visaData: {...},
  selectedPersonId: "dep_1",
  activeModules: ['ds160', 'visa', 'postal']
}
```

## Recent Optimizations (v1.3.0)

### JSON Size Reduction (60-70%)
- Omit "N/A" fields entirely
- Skip empty security section
- Smart defaults in extension

### Field Fixes
- Month parsing: DD/MM/YYYY & MM/DD/YYYY
- Apartment fields: `homeStreet2` mapping
- Phone formatting: `.replace(/[-() ]/g, '')`
- US Contact: Fallback mappings

### Security Defaults
```javascript
const getSecurityValue = (value) => {
  return value === true || value === 'YES' || value === 'yes';
};
```

## Common Tasks

### Add New Module
1. Add to `modules.config.js`
2. Create content script
3. Add UI template to `sidebar.html`
4. Add handler in `sidebar.js`

### Debug Issues
- DS-160: Check localStorage logs
- Visa: Console field-level logs
- Photo: API response errors
- Postal: Verify data source

### Fix Field Mapping
- Inspect with DevTools
- Update `findMatchingValue()`
- Test with sample data

## Gotchas
- Address fields: 40 char limit
- SSN: Split into 3 fields
- Months: Numeric values (01-12)
- Atlas Auth: Tomita/Law/Office answers
- Dynamic fields: 3.5s delay needed

## APIs
- OpenAI GPT-4 Vision (encrypted key)
- ZipCloud postal codes (free)
- Chrome Extension APIs (storage, tabs, sidePanel)

## Testing
- Sample data: `/data/ds160/`, `/data/visa/`
- Test scripts: `test-postal-lookup.js`
- Debug logs: localStorage & console