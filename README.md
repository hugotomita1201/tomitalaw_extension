# TomitaLaw AI Extension

A comprehensive Chrome extension that automates US visa application forms (DS-160 and visa scheduling) with AI-powered features and a modern, persistent sidebar interface.

## Features

- **DS-160 Form Auto-Filler**: Automatically fills DS-160 visa application forms on ceac.state.gov with intelligent two-pass filling and crash recovery
- **Visa Scheduling Auto-Filler**: Automatically fills US Visa Scheduling forms with dependent support and Atlas field compatibility
- **AI-Powered Photo Validation**: Uses GPT-4 Vision to validate passport photos against DS-160 requirements
- **Japanese Postal Code Lookup**: Instant address conversion from postal codes using ZipCloud API and local business codes database
- **Persistent Sidebar Interface**: Tab-based UI that stays open while browsing
- **Modular Architecture**: Easy to add new tools and features in the future

## Installation

### Prerequisites
- Google Chrome version 114 or higher (for side panel support)
- Node.js and npm (for setup scripts)

### Setup Steps

1. **Clone or download the extension**
   ```bash
   git clone [repository-url]
   cd tomitalaw_extension
   ```

2. **Install dependencies (for setup scripts)**
   ```bash
   npm install
   ```

3. **Configure API key for photo validation (optional)**
   ```bash
   npm run encrypt-key
   # Enter your OpenAI API key when prompted
   ```

4. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `tomitalaw_extension` folder
   - The extension icon will appear in your Chrome toolbar

## Usage

### Opening the Extension
- Click the TomitaLaw extension icon in your toolbar
- The sidebar will open on the right side of your browser

### DS-160 Form Filling
1. Click the "DS-160" tab in the extension sidebar
2. Navigate to https://ceac.state.gov/genniv/
3. Paste your DS-160 JSON data in the text area
4. Click "Fill Current Page"
5. The extension will automatically fill the form fields

### Visa Scheduling Form Filling
1. Click the "Visa Scheduling" tab in the extension sidebar
2. Navigate to the visa scheduling website
3. Paste your visa scheduling JSON data in the text area
4. If multiple people are in the data, select the person to fill
5. Click "Fill Current Page"
6. The extension will detect the page type and fill accordingly

### Passport Photo Validation
1. Click the "Photo" tab in the extension sidebar
2. Select or drag a passport photo file
3. The AI will analyze the photo against DS-160 requirements
4. View detailed feedback on:
   - Technical specifications (dimensions, file size, format)
   - Composition (head size, centering, background)
   - Quality issues (lighting, shadows, focus)

### Japanese Postal Code Lookup
1. Click the "Postal" tab in the extension sidebar
2. Enter a 7-digit Japanese postal code (with or without hyphen)
3. Click "Lookup"
4. The full address will be displayed instantly
5. Supports both regular and business/corporate postal codes

## Supported Websites

### DS-160
- https://ceac.state.gov/*

### Visa Scheduling
- https://www.usvisascheduling.com/*
- https://ais.usvisa-info.com/*
- https://ayobaspremium.jp/*
- https://atlasauth.b2clogin.com/*

## Data Format

Both tools accept JSON formatted data. Sample data files are available in:
- `data/ds160/` - DS-160 sample data
- `data/visa/` - Visa scheduling sample data

## Architecture

The extension uses a modular architecture for easy extensibility:

```
tomitalaw_extension/
├── manifest.json           # Chrome extension manifest (Manifest V3)
├── modules.config.js       # Module configuration (add new tools here)
├── background.js          # Service worker for messaging
├── sidebar/               # Sidebar UI
│   ├── sidebar.html       # UI templates for all modules
│   ├── sidebar.css        # Responsive styling
│   ├── sidebar.js         # Main controller
│   └── modules/           # Module implementations
│       ├── ds160/         # DS-160 module
│       ├── visa/          # Visa scheduling module
│       ├── photo/         # Photo validation with OpenAI
│       │   └── photo-service.js
│       └── postal/        # Postal code lookup
│           └── postal-service.js
├── content/              # Content scripts
│   ├── content-router.js    # Routes to appropriate module
│   └── modules/
│       ├── ds160-content.js # DS-160 filling logic (2500+ lines)
│       └── visa-content.js  # Visa scheduling logic
├── data/                 # Sample data and databases
│   ├── ds160/            # DS-160 test data
│   ├── visa/             # Visa scheduling test data
│   ├── photo/            # Photo requirements
│   └── postal/           # Business codes database
│       └── business-codes.json # 22,209 corporate postal codes
├── setup/                # Setup and utility scripts
│   ├── encrypt-api-key.js   # API key encryption
│   └── process-business-codes.js # Convert JIGYOSYO.CSV
└── test/                 # Test scripts
    ├── test-postal-lookup.js
    └── test-final-100-codes.js

## Adding New Tools (Future)

To add a new tool:

1. Add module configuration to `modules.config.js`
2. Create content script in `content/modules/`
3. Add UI template to `sidebar/sidebar.html`
4. The framework automatically handles the rest

## Development

### Testing
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test the functionality

### Debugging
- Open Chrome DevTools (F12)
- Check the Console for logs
- Use the Sources tab to debug scripts

## Technical Details

### Security Features
- **Encrypted API Keys**: Multi-layer encryption (XOR + Base64 + chunking) for OpenAI API key
- **Domain Restrictions**: External messages only accepted from whitelisted TomitaLaw domains
- **Automatic Data Cleanup**: Stored data automatically deleted after 7 days
- **Content Security Policy**: Strict CSP prevents unauthorized network access
- **No Password Auto-Fill**: Password fields are never automatically filled

### API Integrations
- **OpenAI GPT-4 Vision**: For passport photo validation
- **ZipCloud API**: For Japanese regular postal code lookup
- **Local Database**: 3.25MB database of 22,209 business postal codes

### Performance Features
- **Two-Pass Filling**: Ensures all fields are filled even with dynamic loading
- **Crash Recovery**: DS-160 filling logs persist through page crashes
- **Lazy Loading**: Business codes database loads only when needed
- **Efficient Storage**: Minified JSON reduces database size by 54%

## Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure Chrome version 114+ is installed
- Check that Developer Mode is enabled
- Verify all files are present in the extension folder

**Photo validation not working:**
- Run `npm run encrypt-key` to set up OpenAI API key
- Check console for API errors
- Ensure photo meets basic requirements (JPEG/PNG, <10MB)

**Postal code not found:**
- Regular codes (4th digit ≠ 8 or 9): Check internet connection for ZipCloud API
- Business codes (4th digit = 8 or 9): Code may not exist in database
- Try similar postal codes in the area

**Form not filling correctly:**
- Ensure you're on the correct page
- Check that the JSON data format matches the samples
- Some fields may require manual adjustment (addresses > 40 characters)

## Recent Improvements & Lessons Learned

### DS-160 Auto-Filler Enhancements (January 2025)

#### 1. JSON Size Optimization (60-70% reduction)
**Problem:** API responses getting cut off due to large JSON payloads with excessive "N/A" values and boolean fields.

**Solutions Implemented:**
- **Omit Empty Fields**: Removed all "N/A" string values - fields are now omitted entirely if empty
- **Security Section Optimization**: Security section omitted completely when all answers are false (most common case)
- **Smart Defaults**: Added `getSecurityValue()` helper function to default missing security fields to false
- **Result**: JSON payload reduced from ~2000 lines to ~600 lines for typical applications

#### 2. Field Mapping Fixes
**Problems Identified by Paralegal Testing:**
- Month fields showing incorrect values (May instead of December)
- Apartment numbers not being filled
- Phone numbers with hyphens causing validation errors
- US Contact fields not mapping correctly from Sana AI output

**Solutions:**
- **Month Parsing**: Fixed `getMonthNumber()` function to handle DD/MM/YYYY and MM/DD/YYYY formats correctly
- **Address Fields**: Added support for `homeStreet2` apartment/unit field mapping
- **Phone Formatting**: Added `.replace(/[-() ]/g, '')` to strip all formatting from phone numbers
- **Field Name Flexibility**: Added fallback mappings for both `usPointOfContact` and `usContact` naming conventions

#### 3. Prompt Engineering Improvements
**Original Issues:**
- 857-line prompt was bloated and difficult to parse
- Missing Claude AI best practices (XML tags, examples)
- No validation or error handling instructions

**Optimizations:**
- **Structure**: Restructured with XML tags (`<role>`, `<task>`, `<instructions>`, `<examples>`)
- **Validation Phases**: Added 5-phase extraction process (discovery, extraction, validation, interaction, output)
- **Size Reduction**: Reduced prompt by 18% while maintaining all fields
- **Examples**: Added 3 minimal, targeted examples for date formatting, E-visa extraction, and conditional fields
- **Metadata**: Added extraction confidence scoring and validation error tracking

#### 4. Architecture Insights
**Key Learnings:**
- **Separation of Concerns**: Keep extraction (prompt) separate from form mapping (extension)
  - Prompt: Documents → Clean JSON structure
  - Extension: JSON → Form field IDs (ctl00_SiteContentPlaceHolder_FormView1_*)
- **Field ID Location**: The 820+ field mappings belong in the extension, NOT in the extraction prompt
- **Radio Button Pattern**: Boolean radio buttons require individual `_0`/`_1` suffix mappings, not group names
  ```javascript
  // Wrong: 'rblDisease': value
  // Right: 'rblDisease_0': true, 'rblDisease_1': false
  ```

#### 5. E-Visa Specific Validations
**Requirements Discovered:**
- Ownership percentages MUST total exactly 100%
- Treaty country nationals must own >50% for E-visa qualification
- Financial statements must balance: Assets - Liabilities = Owner Equity
- Employee counts must be internally consistent

#### 6. Best Practices Established
- **Always use optional chaining** (`?.`) for resilient field access
- **Default security questions to false** to comply with State Department requirements
- **Validate data consistency** across documents before extraction
- **Test with real-world data** including edge cases and missing fields
- **Handle multiple data formats** (both snake_case and camelCase field names)

### DS-160 Form Improvements (September 2024)

#### Country Code Mapping System
**Problem:** DS-160 form uses non-standard country codes (e.g., "THAI" for Thailand, "GER" for Germany) that differ from ISO-3 codes, causing dropdowns to remain unfilled.

**Solution Implemented:**
- Created comprehensive `mapCountry()` function with 150+ country mappings
- Maps ISO-3 codes, full country names, and common variations to DS-160 format
- Examples: DEU→GER, THA→THAI, GBR→GRBR, CHN→CHIN, FRA→FRAN

#### Field Mapping Enhancements
**Issues Fixed:**
- **Nationality Field**: Now properly uses `mapCountry()` function for conversion
- **Dropdown Pre-fill Detection**: Fixed logic to allow overwriting default values like "NONE"
- **Social Media Platform**: Added direct DS-160 code mappings (FCBK, TWTR, INST, etc.)
- **Travel Companions**: Ensured all companion fields are properly mapped
- **Driver's License**: Fixed state and number field mappings

#### Multiple Entries Handling
**Implementation:**
- Added batch processing for multiple employers/education with "Add Another" functionality
- Created notification system for multiple entries
- Implemented smart field injection with automatic section creation
- Fixed education notification bug (previousEducation → education.institutions)

### DS-160 Prompt Evolution (September 2024)

#### Version 4 - Passport Field Clarification
**Problem:** Confusion between passport issuing authority and physical issuance location causing incorrect data like "Tokyo, China"

**Solution:**
- Separated into distinct fields:
  - `issuingAuthority`: Government that issued the passport (e.g., "CHN")
  - `issueCountry`: Physical country where issued (e.g., "JPN" for Tokyo embassy)
  - `issueCity`: City where issued (e.g., "TOKYO")

### UI/UX Improvements (September 2024)

#### Editable Data Viewer Implementation
**Features Added:**
- **Organized Display**: Data shown in collapsible sections with icons (Personal 👤, Passport 📔, Travel ✈️)
- **Click-to-Edit**: Any field value can be edited inline with Enter to save, Escape to cancel
- **Change Tracking**: Modified fields highlighted in yellow with indicator dots
- **View Toggle**: Switch between editable interface and raw JSON view
- **Bulk Controls**: Expand/Collapse All and Save Changes buttons
- **Smart Handling**: Nested objects and arrays properly rendered with appropriate UI

#### Sidebar Layout Optimization
**Space Savings Achieved:**
- Header padding: 25px → 15px (saved 10px)
- Logo size: 60px → 40px (saved 20px)
- Tab padding: 12px 8px → 10px 6px
- Removed redundant subtitles
- Card spacing tightened
- **Result**: ~35px vertical space saved, main action button now immediately visible

**Width Optimization:**
- Minimum width: 380px → 420px
- Provides better text consistency in editable viewer
- Prevents field value wrapping issues

## Version History

- **v1.4.0** (Current) - September 2024 comprehensive improvements
  - Implemented country code mapping system with 150+ mappings
  - Fixed nationality, dropdown, and social media field mappings
  - Added editable data viewer with click-to-edit functionality
  - Optimized sidebar layout saving 35px vertical space
  - Created DS-160 prompt v4 with passport field clarification
  - Fixed education notification path bug
  - Enhanced multiple entries handling with batch processing

- **v1.3.0** - DS-160 optimization and reliability improvements
  - Reduced JSON payload size by 60-70% to prevent API cutoffs
  - Fixed month parsing, apartment fields, phone formatting, and US Contact mapping
  - Restructured extraction prompt with validation phases
  - Added smart security field defaulting
  - Improved E-visa field validation and ownership checks

- **v1.2.0** - Added AI photo validation and postal code system overhaul
  - Integrated OpenAI GPT-4 Vision for passport photo validation
  - Replaced Japan Post API with local business codes database
  - Added comprehensive test scripts
  - Improved error handling and user feedback

- **v1.1.0** - Fixed DS-160 and visa scheduling functionality
  - Restored two-pass filling system
  - Fixed dependent selection
  - Improved Atlas field support

- **v1.0.0** - Initial release combining DS-160 and Visa Scheduling functionality

## Support

For issues or questions, please contact TomitaLaw support.

## License

Proprietary - TomitaLaw © 2024