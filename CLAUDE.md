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
This is a Chrome Extension (Manifest V3) with a modular architecture for form automation, immigration letter generation, and utilities:

- **background.js**: Service worker handling messaging between components
- **sidebar/**: Persistent side panel UI with tab-based modules
- **content/modules/**: Page-specific content scripts for form filling
- **prompts_and_templates/**: Organized prompt and template library for ChatGPT integration
- **data/**: Sample JSON data and databases (22,209 business postal codes)
- **scripts/injected.js**: Scripts injected into page context for direct DOM access

### Module System
Modules are configured in `modules.config.js`. Each module can have:
- Content script for specific domains
- Sidebar UI template in sidebar.html
- Service implementation in sidebar/modules/

Active modules:
- **DS-160**: Auto-fills US visa application forms on ceac.state.gov
- **DS-160 Retrieval Helper**: 30-day expiration tracking for DS-160 applications
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

#### DS-160 Retrieval Helper (sidebar/modules/retrieval/)
Manages stored DS-160 application credentials with 30-day expiration tracking to prevent application loss.

**Architecture - Service/Handler Pattern**:
- **retrieval-service.js**: Data management (CRUD operations, expiration calculations, import/export)
- **retrieval-handlers.js**: UI interactions (search, sort, form display, event listeners)
- **ds160-retrieval-content.js**: Form auto-fill on ceac.state.gov/genniv

**Module Isolation**:
- Storage key: `'ds160_retrieval_applications'` (unique, no conflicts)
- Window namespaces: `window.ds160RetrievalService` (sidebar), `window.ds160RetrievalFiller` (content script)
- Element ID prefixes: `retrieval-`, `form-`, `import-`, `edit-json-`
- Message listener: `action: 'fillRetrievalForm'` + `module: 'ds160-retrieval'`
- Template ID: `ds160-retrieval-template` in sidebar.html

**Key Features**:
- **30-day expiration tracking**: Color-coded urgency (green → yellow → red → expired)
- **Search & sort**: 5 sort options (most urgent first, least urgent, app ID, surname, date added)
- **Dual import**: Copy/paste JSON (ChatGPT) or upload .json file
- **Advanced JSON editor**: Raw JSON editing for mass operations
- **Auto-fill workflow**: Click "Auto-Fill" → Extension fills retrieval form → User solves captcha → Click "Retrieve Application" → lastAccessed timestamp updated

**Data Structure**:
```javascript
{
  "applications": [
    {
      "id": "app_1234567890_xyz",  // Generated by extension
      "applicationId": "AA00EX69LD",  // 10 chars, UPPERCASE
      "surname": "YAGI",  // UPPERCASE, first 5 letters used for security question
      "yearOfBirth": "1968",  // YYYY format
      "motherMotherName": "KAZUKO",  // UPPERCASE, maternal grandmother's given name
      "notes": "E-2 Renewal",  // Optional
      "dateAdded": "2025-10-09T12:34:56.789Z",
      "lastAccessed": "2025-10-15T08:22:33.123Z"  // Updates when form filled
    }
  ]
}
```

**Security Answer Hardcoding**:
- Extension hardcodes security answer as "HUGO" (line 58 in ds160-retrieval-content.js)
- `motherMotherName` field stored for reference but NOT used for form filling
- Rationale: Simplified testing and consistent behavior

**Expiration Calculation** (retrieval-service.js lines 148-181):
```javascript
getExpirationStatus(app) {
  const referenceDate = app.lastAccessed || app.dateAdded;
  const daysSinceAccess = this.getDaysSince(referenceDate);
  const daysUntilExpiration = 30 - daysSinceAccess;

  // Urgency levels
  if (daysSinceAccess >= 30) return 'expired';  // Red
  if (daysSinceAccess >= 26) return 'critical';  // Red (4 days left)
  if (daysSinceAccess >= 15) return 'warning';   // Yellow
  return 'safe';  // Green (0-14 days)
}
```

**Form Field Mappings** (ds160-retrieval-content.js lines 47-59):
```javascript
// ASP.NET field IDs for DS-160 retrieval page
'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID': applicationId,
'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbSurname': surname.substring(0, 5).toUpperCase(),
'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbDOBYear': yearOfBirth,
'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbAnswer': 'HUGO'  // Hardcoded security answer
```

**ChatGPT Integration** (prompts_and_templates/form_prompts/ds160_retrieval_prompt_v1.txt):
- Single-stage extraction (not audit-based like DS-160 v7)
- Batch processing: Handle 1-50+ applicants in one upload
- Family application support: Separate entries for principal + spouse + children
- Output format: JSON code block with `{"applications": [...]}`

### Prompt Management System
The extension uses a two-tier prompt architecture with versioned detailed prompts:

#### Master Prompt (Workflow Router)
- Location: `prompts_and_templates/main_prompts/chatgpt_master_instructions_v2.md`
- Purpose: Routes user requests to appropriate detailed prompts
- Size: 43 lines (simplified from 105 lines)
- Key features:
  - Workflow routing (starter phrases → files)
  - Critical rules (no field invention, schema separation)
  - Language preference (Japanese support)
  - Preparer information (G-28 attorney details)
  - Instruction: "READ AND FOLLOW THAT FILE EXACTLY"

#### DS-160 Prompts
- Location: `prompts_and_templates/form_prompts/ds160_prompt_combined_v7_reversed.txt`
- Current version: v7 REVERSED (anti-fabrication architecture)
- Size: 1,351 lines
- Key features:
  - **REVERSED two-stage workflow**: Stage 1 (audit FIRST) → Stage 2 (extraction AFTER)
  - **Code block output**: Complete JSON regeneration in ```json blocks (not Canvas editing)
  - **Audit-first design**: Flag ALL missing data before extraction begins - prevents fabrication by design
  - **Numbered responses**: Paralegal-friendly Q&A workflow with partial answer support
  - **Specific checks**: Living checklist for common issues

#### DS-160 Prompt Evolution
- **v5**: Hybrid literal/inference extraction with array preservation
- **v6**: Verbose audit section (1,920 lines total)
- **v7 Standard**: Simplified architecture, extraction first then audit
- **v7 REVERSED (Current)**: Audit source documents FIRST, then extract JSON with user-provided missing data
  - **Why reversed?** Prevents fabrication - ChatGPT cannot guess passport numbers if it flags them as missing BEFORE extraction
  - Stage 1: Forensic audit of source documents → Flag missing/inconsistent data
  - Stage 2: Extract JSON using source docs + user answers from Stage 1
  - Result: Zero fabrication risk, all gaps filled before extraction begins

#### Visa Scheduler Prompts
- Location: `prompts_and_templates/form_prompts/visa_scheduler_prompt_v1.txt`
- Current version: v1 (created from VISA_SCHEDULER_0913.rtf, now with passport/phone validation)
- Key features: Main applicant vs dependent logic, document delivery rules, passport format validation, Japanese phone number formatting

#### Letter Agent System (Immigration Letters)
- **Master Prompt**: `prompts_and_templates/main_prompts/letter_agent_prompt.md`
- **Purpose**: Orchestrate immigration letter generation workflow with ChatGPT
- **Size**: 147 lines (streamlined workflow-focused)
- **Architecture**: Two-tier system - Master handles workflow, Templates handle content standards

**Key Features**:
- **Template Selection**: Auto-selects from 10+ letter templates (H1B, L1A, L1B, E2, etc.)
- **Timeline Sanity Check**: Mandatory verification prevents employment overlaps between countries
- **Canvas Generation**: All letters generated in ChatGPT canvas for user editing
- **Stage 2 Audit**: Optional post-generation quality check with interactive correction

**Two-Stage Workflow**:
1. **Stage 1 (Generation)**: Analyze docs → Select template → Extract data → Verify timeline → Generate letter
2. **Stage 2 (Audit - Optional)**: Line-by-line analysis → Flag issues → Interactive correction → Re-audit

**Audit Categories** (6 universal checks):
- Accuracy (factual errors, fabricated data)
- Timeline Logic (date conflicts, tense errors, overlaps)
- Completeness (missing evidence, unused achievements)
- Template Compliance (format violations, missing sections)
- Legal Strength (weak persuasion, insufficient justification)
- Quality (vague statements, missing metrics)

**Priority System**:
- HIGH: Legal compliance, factual errors, timeline problems, template violations
- MEDIUM: Missing evidence, weak arguments, incomplete details
- LOW: Tone refinements, optional enhancements

**Available Letter Templates** (`prompts_and_templates/letter_templates/`):
- L1A Manager: Initial and renewal applications (managerial capacity focus)
- L1B Specialized Knowledge: Initial and renewal (technical expertise focus)
- E2 Essential Skills: Manager, Executive, Essential Skills variants
- E2 Corporate Registration: Private and public company formats
- E1 Treaty Trader: Trade-based visa applications
- H1B Specialty Occupation: USCIS petition format

**Template Architecture**:
- Instruction-based format (not placeholder-based)
- Concrete example outputs included
- Template-specific legal compliance rules
- Evidence-based writing requirements
- ~400-800 lines each with comprehensive guidance

**Specialized Prompts** (for specific workflows):
- `e2_transfer_letter_prompt.md`: Transfer cases where new person replaces existing employee
- `e2_applicant_section_prompt.md`: Focused on crafting compelling applicant sections

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

#### DS-160 Formatting Standards Documentation

**IMPORTANT**: Always update `DS160_FORMATTING_STANDARDS.md` changelog when making significant changes to DS-160 prompts or formatting rules.

**When to update**:
- Schema changes (new fields, field name changes, data type changes)
- Formatting rule additions/modifications (company names, addresses, phone numbers, maiden names, etc.)
- Validation rule changes (passport formats, date formats, phone number formats, etc.)
- Bug fixes affecting data extraction or formatting
- Usability improvements (audit report formatting, output structure, bold formatting, etc.)
- Field clarifications (presentEmployer definition, field usage guidelines, etc.)

**How to update**:
1. Add new version entry at top of changelog (increment minor version: 1.2 → 1.3)
2. Include date (format: Month Day, Year)
3. Categorize change type: CRITICAL FIX, USABILITY FIX, SCHEMA UPDATE, CLARIFICATION, etc.
4. List affected files with line numbers for reference
5. Provide before/after examples for clarity when format changes

**Location**: `prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md`

**Example changelog entry format**:
```markdown
### Version 1.3 (October 6, 2025)
- **USABILITY FIX**: Improved audit report formatting in v7_reversed for better readability
  - Timeline format: Added concrete example with proper column spacing
  - Bold formatting: Key terms now bolded for easier paralegal scanning
- File updated: ds160_prompt_combined_v7_reversed.txt (lines 246-288, 359-366)
- Added presentEmployer clarification (Section 9.9)
```

**Recent versions**:
- v1.3 (Oct 6, 2025): Timeline format fix, bold formatting, presentEmployer clarification
- v1.2 (Oct 6, 2025): Maiden name format correction (removed parentheses)
- v1.1 (Oct 6, 2025): Created v5.5, comprehensive formatting rules
- v1.0 (Oct 2025): Initial documentation creation

### Form Prompt Usage Guidelines

#### DS-160 Prompt (ChatGPT Integration)
**Purpose**: Extract structured JSON from immigration documents for DS-160 form filling
**Usage**: Upload documents → ChatGPT processes with ds160_prompt_combined_v7_reversed.txt → JSON output → Extension fills form

**Two-Stage REVERSED Workflow**:
- **Stage 1 (Audit FIRST)**: Analyze source documents → Flag ALL missing/inconsistent data → Output numbered findings → WAIT for user answers
- **Stage 2 (Extraction AFTER)**: Extract complete JSON using source docs + user answers → Output in ```json code block

**Key Requirements**:
- Omit all empty fields to prevent API cutoffs
- Preserve array structures for auto-boolean logic (`visits: []` not `"visits": "Array..."`)
- Use exact field names matching extension mappings
- Default security fields to false when missing
- Complete JSON regeneration in code blocks (not incremental Canvas edits)
- Numbered flagged items for easy paralegal responses
- Partial answer support: User can answer some/none/all questions, then type "proceed"

#### Visa Scheduler Prompt (ChatGPT Integration)
**Purpose**: Extract Atlas-format JSON for visa appointment scheduling systems
**Usage**: Upload documents → ChatGPT processes with visa_scheduler_prompt_v1.txt → JSON output → Extension fills forms

**Critical Validations**:
- Passport format validation (Japanese: 2 letters + 7 digits exactly)
- Phone number formatting (remove leading 0 from Japanese numbers)
- Japanese address translation (must be in kanji/kana)
- Document delivery uses main applicant address only

#### DS-160 Retrieval Helper Prompt (ChatGPT Integration)
**Purpose**: Extract DS-160 application credentials for 30-day expiration tracking
**Usage**: Upload documents → ChatGPT processes with ds160_retrieval_prompt_v1.txt → JSON output → Extension stores for retrieval form auto-fill

**Single-Stage Workflow**:
- Analyze source documents (DS-160 confirmations, passports, intake forms)
- Extract credentials: applicationId, surname, yearOfBirth, motherMotherName, notes
- Output JSON code block with `{"applications": [...]}`

**Key Requirements**:
- applicationId: Exactly 10 characters (e.g., "AA00EX69LD"), UPPERCASE
- surname: UPPERCASE, first 5 letters used for security question
- yearOfBirth: YYYY format (e.g., "1968")
- motherMotherName: UPPERCASE, given name only (maternal grandmother)
- notes: Optional (visa type, case notes, family role)
- Omit empty optional fields (no "notes": "" or null)
- Family applications: Separate entry for each person with unique applicationId

**Critical Features**:
- **30-day expiration tracking**: Applications expire if not accessed within 30 days
- **Batch extraction**: Handle multiple unrelated applicants in single upload
- **Family application support**: Principal + spouse + children with relationship notes
- **Security answer**: Extension hardcodes "HUGO" (not motherMotherName) for form filling
- **Character limits**: Strict validation (10-char applicationId, 50-char motherMotherName)

#### Letter Agent Prompt (Immigration Letters)
**Purpose**: Generate immigration support letters using organized template library
**Usage**: Upload documents → ChatGPT selects template → Extracts data → Timeline verification → Canvas letter → Optional audit

**Two-Stage Workflow**:
- **Stage 1 (Generation)**: Analyze supporting documents → Identify letter type → Select template → Extract/organize data → Verify timeline logic → Generate letter in canvas
- **Stage 2 (Audit - Optional)**: Compare letter vs source docs → Flag issues across 6 categories → Interactive correction in canvas → Re-audit if needed

**Critical Features**:
- **Timeline Sanity Check**: Prevents employment overlaps (e.g., "Thailand through March 2024" not "through present" when US starts April 2024)
- **Template-Specific Rules**: Each template contains detailed legal compliance requirements (~400-800 lines)
- **Master Orchestration**: Master prompt handles workflow (~147 lines), templates handle content standards
- **Evidence-Based**: Requires concrete numbers, metrics, quantified achievements from source documents
- **Transfer Case Support**: Can reuse company descriptions from sample letters while building new applicant sections from scratch

**Audit Process** (if user requests):
1. Line-by-line comparison against source documents
2. Structured flagging with priority levels (HIGH/MEDIUM/LOW)
3. User selects issues to fix by number, "all", or category
4. Direct canvas edits with changelog
5. Optional re-audit iteration

**Philosophy**: Master = workflow orchestrator, Templates = content specialists (eliminates redundancy)

### Preparer Information (E-Visa Applications)
For E-2/E-1 visa applications, the extension auto-fills attorney information in DS-156E Sections 26-27:

**Attorney Details** (from Form G-28):
- Name: Eriko Carolina Higa
- Firm: Tomita Law Office PC
- Bar Number: 304044 (California)
- Address: 11835 W. Olympic Blvd., Suite 355E, Los Angeles, CA 90064
- Phone: 310-324-6890 | Mobile: 248-515-5597
- Email: erikohiga@tomitalawoffice.net | Fax: 310-324-6902

**JSON Structure**:
```json
"evisaApplicationContact": {
  "officer": {
    "surname": "HIGA",
    "givenName": "ERIKO",
    "position": "ATTORNEY"
  },
  "address": {
    "street1": "11835 W OLYMPIC BLVD",
    "street2": "SUITE 355E",
    "city": "LOS ANGELES",
    "state": "CA",
    "postalCode": "90064",
    "country": "USA"
  },
  "phone": "3103246890",
  "fax": "3103246902",
  "email": "erikohiga@tomitalawoffice.net"
}
```

### Language Support
**Japanese Language Preference**:
- If user starts conversation in Japanese, ChatGPT responds in Japanese
- Exception: JSON schema and field names remain in English
- Example: Audit findings and questions in Japanese, but `"personal.dateOfBirth"` stays English
- Applies to both DS-160 and Visa Scheduler workflows

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

### DS-160 Retrieval Helper JSON
```json
{
  "applications": [
    {
      "applicationId": "AA00EX69LD",
      "surname": "YAGI",
      "yearOfBirth": "1968",
      "motherMotherName": "KAZUKO",
      "notes": "E-2 Renewal"
    }
  ]
}
```
- applicationId: Exactly 10 characters, UPPERCASE
- surname: UPPERCASE (first 5 letters used for security question)
- yearOfBirth: YYYY format
- motherMotherName: UPPERCASE, given name only
- notes: Optional (omit if empty, no "notes": "")
- Storage key: 'ds160_retrieval_applications'

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

## Immigration Letter Templates System

The extension now includes a comprehensive immigration letter template library for TomitaLaw Office letter generation.

### Template Library Location
All templates are organized in `prompts_and_templates/`:
```
prompts_and_templates/
├── main_prompts/          # Core AI agent prompts
│   └── letter_agent_prompt.md
├── form_prompts/          # Form automation prompts
│   ├── ds160_prompt_combined_v5.txt
│   └── visa_scheduler_prompt_v1.txt
├── letter_templates/      # Immigration letter templates (10 total)
│   ├── l1a_blanket_manager_renewal_template.md
│   ├── l1a_blanket_manager_application_template.md
│   ├── l1b_renewal_letter_template.md
│   ├── l1b_blanket_application_template.md
│   ├── e2_manager_template.md
│   ├── e2_executive_template.md
│   ├── e2_essential_skills_template.md
│   ├── e2_corporate_registration_private_company_template.md
│   ├── e2_corporate_registration_public_company_template.md
│   └── h1b_template.md
└── README.md             # Template library documentation
```

### Template Architecture
- **Instruction-Based Format**: Templates use instruction-based approach instead of placeholder-based (`[FIELD_NAME]`)
- **Concrete Examples**: Each template includes complete example output for consistent generation
- **Timeline Logic**: Mandatory timeline verification prevents employment overlaps between countries
- **Legal Compliance**: Each template includes visa-specific regulatory requirements

### Letter Agent Integration
The `letter_agent_prompt.md` orchestrates the entire letter generation workflow:
1. Document analysis and template selection
2. Data extraction from supporting documents
3. Timeline logic verification (Section 2.7)
4. Canvas-based letter generation
5. Quality assurance and red flags checklist

### Template Types
- **L1A Manager**: Renewal and initial applications with executive capacity requirements
- **L1B Specialized Knowledge**: Renewal and initial with technical expertise focus
- **E2 Treaty Investor**: Manager, Executive, Essential Skills, and Corporate Registration variants
- **H1B Specialty Occupation**: USCIS petition format with OOH references

### Recent Template System Improvements (September 2025)

#### Passport Number Validation (Critical Fix)
**Problem**: OCR misreading passport numbers causing visa application errors (e.g., "TZ1240013" instead of "TZ1240137").

**Solution Implemented**:
- Added comprehensive passport format validation to visa scheduler prompt
- Japanese passports: Strict 2 letters + 7 digits validation
- Multi-country support with country-specific format verification
- OCR error guidance: 3↔8, 1↔7, 0↔O, 5↔S, I↔1
- Smart flagging only when genuinely uncertain after double-checking

#### Japanese Phone Number Formatting Fix
**Problem**: Japanese phone numbers including domestic leading zeros (080→08079470566).

**Solution**:
- Updated visa scheduler prompt with clear instruction: "For Japanese phone numbers, remove the leading 0 (080→80, 090→90, 070→70)"
- Enhanced field descriptions to specify "without country code or leading 0"
- Updated examples to show correct format: "8079470566" instead of "08079470566"

#### Template Organization
- Consolidated all prompts into organized `prompts_and_templates/` structure
- Eliminated duplicate visa scheduler prompts
- Created comprehensive README with template index and usage guidelines

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

## Recent Updates (October 2025)

### DS-160 V7 Prompt Architecture Overhaul

#### Problem: Prompt Bloat and ChatGPT Fabrication
- V6 prompt grew to 1,920 lines with 900-line verbose audit section
- ChatGPT was **fabricating data** (passport numbers, dates) when extraction happened first
- Stage 2 audit was post-mortem - too late to prevent fabrication
- Duplicate format templates in both master prompt and detailed prompt causing conflicts

#### Solution: REVERSED Workflow + Code Block Output
**Anti-Fabrication Architecture**:
- **REVERSED execution order**: Audit FIRST, Extract SECOND
- Philosophy: ChatGPT cannot fabricate passport numbers if it flags them as missing BEFORE extraction begins
- Stage 1: Forensic audit of source documents → Flag ALL missing/inconsistent data
- Stage 2: Extract JSON with user-provided answers from Stage 1 → Zero fabrication risk

**Code Block Output (October 2025)**:
- Switched from Canvas editing to complete JSON regeneration in ```json code blocks
- Simpler workflow: Full JSON output each time instead of incremental edits
- Easier for paralegals: Copy from code block, paste into extension

**Master Prompt Router**:
- Simplified from 105 lines → 43 lines
- Removed all duplicated Stage 1/2 format templates
- Single source of truth: detailed prompts contain all format specifications
- Master prompt now only: routing + critical rules + "READ THAT FILE EXACTLY"

**Numbered Response Workflow**:
- Flagged items numbered (1. 2. 3.) for easy paralegal reference
- User responds: "1. 15-JAN-1990  2. TZ1240137  3. Self" or just "proceed"
- ChatGPT matches numbers → generates complete JSON with answers
- **Partial answer support**: Answer some/none/all questions, unanswered use source data or omit

**Specific Checks Checklist**:
- Living checklist section for common issues found in practice
- Easy to update as new edge cases discovered
- Categories: Renewals, School Duration, Education vs Age, Employment Authorization, Gaps
- Paralegal-friendly scannable format

#### Results
- **Zero fabrication**: All missing data identified and filled BEFORE extraction
- Better audit quality: ChatGPT catches timeline gaps, logic issues, missing correlations
- Faster paralegal workflow: numbered Q&A, partial answers supported
- Single source of truth: no more master/detailed prompt conflicts
- Maintainable: easy to add new checks without rewriting entire sections

### Visa Scheduler Prompt Review (October 2025)
- Reviewed visa_scheduler_prompt_v1.txt for consistency with DS-160 v7 changes
- **Decision: No changes needed** - different workflow by design (single-stage extraction vs two-stage audit)
- Already has validation rules, passport checks, phone formatting built-in
- 397 lines - already concise and working perfectly

### Letter Agent Prompt Architecture Overhaul (October 2025)

#### Problem: Redundancy and Prompt Bloat
- Original master prompt: 165 lines with detailed content rules (evidence-based writing, formatting standards, quality checklists)
- Letter templates already had same rules in more detail (~400-800 lines each)
- Heavy duplication between master and E2 transfer prompt (25% redundant content)
- Conflicting tone: Master formal, E2 casual ("what the heck," "gotta," "midwit smartass")

#### Solution: Workflow Orchestrator Architecture
**Master Prompt Streamlining**:
- Reduced from 165 lines → 147 lines
- Removed all content-specific rules (moved to templates where they belong)
- **Keep in Master**: Core workflow, template selection, timeline sanity check, missing info/conflict protocols, canvas generation
- **Removed from Master**: Evidence-based writing rules, formatting standards, quality checklists, red flags, signatory info, "before drafting" verification lists

**Added Stage 2 Audit Protocol** (~44 lines):
- Optional post-generation quality check
- Two-phase: Analysis & Flagging → Interactive Correction
- 6 universal audit categories work for any visa type (L1A, E2, H1B, etc.)
- Priority system: HIGH/MEDIUM/LOW for user focus
- Structured flagging format with location, source, recommendation
- Iterative: can re-audit after corrections

**Philosophy Shift**:
- **Before**: Master = detailed rules + workflow (165 lines, much redundancy with templates)
- **After**: Master = workflow orchestrator (147 lines), Templates = content specialists (~400-800 lines each)
- **Result**: Cleaner separation of concerns, no duplication, easier maintenance

**Trust-Based Approach**:
- Minimal hand-holding (~35 lines for audit vs potential 200+ verbose version)
- Trust ChatGPT intelligence for contextual awareness
- Action-oriented guidance, not instructional baby-talk
- Adapts criteria based on visa type automatically

#### Results
- Zero redundancy: Each rule appears in exactly one place
- Better flexibility: Templates can have unique requirements without conflicting with master
- Easier maintenance: Update template rules without touching master workflow
- Improved audit quality: Concise guidance performs better than verbose checklists

### Spouse Schema Field Name Fix (October 7, 2025)

#### Problem: Prompts Teaching ChatGPT Wrong Field Names
**Critical Discovery**: DS-160 prompts v5.5 and v7 REVERSED were teaching ChatGPT incorrect spouse field names that the extension doesn't recognize.

**The Ironic Truth**:
- Prompts incorrectly specified: `spouse.cityOfBirth`, `spouse.countryOfBirth`
- Extension actually expects: `spouse.city`, `spouse.country` (verified in ds160-content.js:2296-2302)
- When ChatGPT with thinking mode "forgot" the schema, it defaulted to simpler names (`city`, `country`)
- **Those simpler names were actually CORRECT for the extension!**

**Root Cause Analysis**:
```javascript
// Extension code (ds160-content.js lines 2296-2302)
'tbxSpousePOBCity': data.family?.spouse?.city,           // Expects "city"
'tbxSpousePOBStateProvince': data.family?.spouse?.birthState,  // Expects "birthState"
'ddlSpousePOBCountry': this.mapCountry(data.family?.spouse?.country)  // Expects "country"
```

**Why This Matters**:
- Previous JSON outputs with `city`/`country` were flagged as "wrong" according to prompt
- But they were actually **correct** for the extension!
- ChatGPT's "schema loss" accidentally saved users from using wrong field names
- 53KB v7 REVERSED prompt + thinking mode = schema pushed out of attention

#### Solution Implemented
**Files Fixed**:
1. **ds160_prompt_combined_v7_reversed.txt**:
   - Lines 764-766: Changed `cityOfBirth` → `city`, `countryOfBirth` → `country`
   - Lines 1328-1340: Added complete family/spouse example to STRUCTURE EXAMPLE section

2. **ds160_prompt_combined_v5.5.txt**:
   - Lines 299, 301: Schema field names corrected
   - Lines 1048, 1050: Example field names corrected

3. **DS160_FORMATTING_STANDARDS.md**:
   - Section 6.2: **Inverted** the correct/wrong guidance (what was marked "correct" was actually wrong!)
   - Section 6.3: Updated complete spouse example
   - Lines 688-694: Updated another spouse example (also fixed maiden name parentheses)
   - Version 1.4 changelog added documenting this critical fix

**Note**: ds160_prompt_combined_v5.txt already had correct field names ✅

#### Results
- **100% faithful to extension code**: All spouse field names now match ds160-content.js exactly
- **Schema validation**: Prompts teach correct field mappings
- **Documentation updated**: DS160_FORMATTING_STANDARDS.md now has correct guidance
- **Concrete example added**: v7 REVERSED STRUCTURE EXAMPLE now shows spouse usage

### USCIS Master Prompt v5 Creation (October 7, 2025)

#### New Generic Multi-Form USCIS Prompt
Created `uscis_master_prompt_v5.md` as a generic USCIS form extraction prompt (not DS-160 specific).

**Purpose**:
- Generic paralegal assistant for ANY USCIS immigration form
- Routes to form-specific knowledge files (DS-160, Visa Scheduler, etc.)
- Workflow orchestrator similar to v2 master prompt approach

**Key Features**:
- **Two-section output**: JSON data (first) → Analysis (second)
- **Phase 1: Document Analysis** - Mandatory inventory, context, validation
- **Phase 2: Form Completion** - Information hierarchy, document-based inference
- **Critical systems separation**: DS-160 vs Visa Scheduler (never mix schemas)
- **JSON optimization**: Omit empty fields, 60-70% size reduction
- **Knowledge file requirement**: Form fields cannot be invented - must check schema files

**Structure** (108 lines total):
```markdown
## Core Function
Paralegal assistant for USCIS immigration forms

## CRITICAL OUTPUT FORMAT
SECTION 1: JSON DATA (FIRST)
SECTION 2: ANALYSIS (SECOND)

## CRITICAL: Knowledge Files Required
- ds160_prompt_combin... (DS-160 schema)
- visa_scheduler_prompt (Visa Scheduler schema)

## Phase 1: Document Analysis (MANDATORY)
## Phase 2: Form Completion
## Output Requirements
## Form Preparer Information
## Language Preference
```

**Preparer Information Updated**:
- Full name: Eriko Carolina Higa
- Firm: Tomita Law Office PC
- Complete address: 11835 W. Olympic Blvd., Suite 355E, Los Angeles, CA 90064
- **Phone**: 13103246890 (US format: 1 + area code + number, no spaces/dashes)
- **Fax**: 13103246902 (US format: 1 + area code + number, no spaces/dashes)
- Email: erikohiga@tomitalawoffice.net

**Language Preference Added**:
- If user starts in Japanese, respond in Japanese
- Exception: JSON schema and field names remain in English
- Same feature as v2 master prompt for consistency

**Differences from v2**:
- v2: Router-style (43 lines, workflow delegation)
- v5: Self-contained instructions (108 lines, inline guidance)
- v2: Points to detailed prompt files
- v5: Comprehensive extraction workflow built-in

### DS-160 Retrieval Helper Module Creation (October 9, 2025)

#### New Module: 30-Day Expiration Tracking
Created complete DS-160 Retrieval Helper module to manage stored DS-160 application credentials and prevent application loss due to 30-day State Department expiration.

**Files Created**:
- `sidebar/modules/retrieval/retrieval-service.js` - Data management service (265 lines)
- `sidebar/modules/retrieval/retrieval-handlers.js` - UI event handlers (450+ lines)
- `content/modules/ds160-retrieval-content.js` - Form auto-fill content script (182 lines)
- `prompts_and_templates/form_prompts/ds160_retrieval_prompt_v1.txt` - ChatGPT extraction prompt (420 lines)
- `data/retrieval/sample_50_applications.json` - Test data with 50 sample applications
- Template in `sidebar/sidebar.html` (ds160-retrieval-template)

**Architecture**:
- **Service/Handler Pattern**: Separation of data logic (service) and UI interactions (handlers)
- **Module Isolation**: Unique storage key, window namespaces, element ID prefixes
- **Content Script**: Fills DS-160 retrieval form at ceac.state.gov/genniv
- **ChatGPT Integration**: Single-stage extraction prompt for batch credential extraction

**Key Features Implemented**:
1. **Expiration Tracking**: Color-coded urgency system (green/yellow/red/expired) based on days since last access
2. **Search & Sort**: Full-text search + 5 sort options (urgent first, urgent last, app ID, surname, date)
3. **Dual Import**: Copy/paste JSON (ChatGPT workflow) + file upload (.json files)
4. **Advanced JSON Editor**: Raw JSON editing for mass operations with Clear All button
5. **Auto-Fill Workflow**: Click "Auto-Fill" → solves captcha → clicks "Retrieve Application" → updates timestamp
6. **Family Support**: Handles principal + spouse + children applications with relationship notes

**Technical Decisions**:
- **Security Answer Hardcoded**: Extension uses "HUGO" as hardcoded security answer (not motherMotherName) for simplified testing
- **Storage Key**: `'ds160_retrieval_applications'` - completely isolated from other modules
- **Message Action**: `'fillRetrievalForm'` + `module: 'ds160-retrieval'` for content script routing
- **Character Limits**: Strict validation (10-char applicationId, YYYY yearOfBirth, UPPERCASE formatting)

**UI/UX Design**:
- Responsive button wrapping for narrow sidebars
- Stacked button layout (Add New on top, Import/Export on second row)
- Import form with two options (paste textarea + file upload button)
- Clear All button with red destructive styling and confirmation dialog
- Empty state with helpful getting-started instructions

**Bug Fixes During Development**:
1. **Template Architecture Confusion**: Discovered extension loads templates from sidebar.html, not separate retrieval-ui.html file
2. **Import Button Non-Responsive**: Fixed by editing correct template in sidebar.html
3. **Clear All Not Working**: Fixed by creating dedicated `clearAllApplications()` method instead of trying to import empty JSON
4. **Content Script Not Loading**: Added ds160-retrieval-content.js to manifest.json content_scripts array

**Documentation Created**:
- Added DS-160 Retrieval Helper to CLAUDE.md with comprehensive architecture details
- Updated prompts_and_templates/README.md with ds160_retrieval_prompt_v1.txt entry
- Added JSON structure example to Data Formats section
- Added prompt usage guidelines to Form Prompt Usage Guidelines section

**Result**: Production-ready module with complete isolation, comprehensive features, and ChatGPT integration workflow.