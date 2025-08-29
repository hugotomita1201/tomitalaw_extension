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

## Version History

- **v1.2.0** (Current) - Added AI photo validation and postal code system overhaul
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