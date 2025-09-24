# DS-160 Split Prompts Implementation
**Date:** January 16, 2025
**Version:** 1.0

## Overview
Due to token limitations and field naming issues when generating complete DS-160 + E-visa JSONs, we've split the data extraction into two separate prompts and updated the extension to handle dual JSON inputs.

## Problem Solved
1. **Token Limit Issues**: Full DS-160 + E-visa JSON was too large for ChatGPT to handle in one generation
2. **Field Naming Errors**: ChatGPT was using incorrect field names (establishedDate instead of incorporationDate) when generating large combined JSONs
3. **Better Accuracy**: Splitting allows ChatGPT to focus on each section properly

## Implementation

### 1. Two New Prompts Created

#### A. Core DS-160 Prompt (`ds160_prompt_core_v1.txt`)
Handles all non-E-visa sections:
- Personal information
- Travel details
- Contact information  
- US Contact
- Passport details
- Family information
- Work & Education
- Security questions
- Crew visa (C-1/D)

#### B. E-visa Prompt (`ds160_prompt_evisa_v1.txt`)
Handles ONLY E-visa sections:
- evisaClassification
- evisaBusiness (with strict field naming enforcement)
- evisaFinanceTrade
- evisaEmployeeCounts
- evisaUSPersonnel
- evisaApplicantPosition
- evisaApplicantUSPosition
- evisaApplicationContact
- evisaEmployee
- evisaInvestment (E-2 only)
- evisaTrade (E-1 only)
- evisaOwnership
- evisaFinancial
- evisaForeignBusiness

### 2. Sidebar UI Updates

#### HTML Changes (`sidebar.html`)
- Added two separate textareas:
  1. "DS-160 Core Data (JSON format)" - 8 rows
  2. "E-visa Data (Optional JSON format)" - 8 rows
- Single "Load Data" button handles both

#### JavaScript Changes (`sidebar.js`)
- Updated `loadData()` function to:
  - Parse core JSON data first
  - Parse E-visa JSON if provided
  - Merge using spread operator: `{...coreData, ...evisaData}`
  - Show appropriate status messages
- Updated auto-load to handle both fields
- Updated clear function to clear both textareas
- Backward compatible with old single-field data

## Key Improvements

### E-visa Prompt Enforcement
The E-visa prompt includes STRICT field naming rules:
```
## CRITICAL E-VISA FIELD NAMING RULES
1. USE EXACT FIELD NAMES - Do not improvise
2. Business fields:
   - Use "incorporationDate" NOT "establishedDate"
   - Use "incorporationCity" and "incorporationState" separately
   - Use "businessType" for the CODE ONLY (C, P, B, R, J, S, or O)
3. Do NOT add fields not in the structure
4. Company names: Remove ALL punctuation
5. Phone numbers: Digits only, no formatting
```

### Data Validation
- Core data is required
- E-visa data is optional
- If E-visa JSON is invalid, core data still loads with warning
- Proper error messages for each scenario

## Usage Workflow

### For Users:
1. Upload documents to ChatGPT
2. Use `ds160_prompt_core_v1.txt` to generate core DS-160 JSON
3. If E-1/E-2 visa: Use `ds160_prompt_evisa_v1.txt` to generate E-visa JSON
4. Paste core JSON in first textarea
5. Paste E-visa JSON in second textarea (if applicable)
6. Click "Load Data" - extension merges automatically
7. Click "Auto-Fill DS-160 Form"

### For Non-E-visa Applications:
- Only need to use core prompt
- Leave E-visa textarea empty
- Extension works normally

## Testing Checklist
- [ ] Core data loads alone
- [ ] Core + E-visa data merge correctly
- [ ] Invalid E-visa data shows warning but loads core
- [ ] Auto-load remembers both fields
- [ ] Clear button clears both fields
- [ ] Backward compatibility with old single JSON
- [ ] Business name punctuation removed
- [ ] Incorporation fields use correct names
- [ ] Phone numbers formatted correctly

## Benefits
1. **Better Accuracy**: Each prompt is focused and specific
2. **Flexibility**: Can regenerate just one section if needed
3. **Token Efficiency**: Stays within ChatGPT limits
4. **Field Compliance**: Enforced field naming prevents errors
5. **User Control**: Users can see/edit each section separately

## Files Modified
1. `/data/ds160/ds160_prompt_core_v1.txt` - New core prompt
2. `/data/ds160/ds160_prompt_evisa_v1.txt` - New E-visa prompt
3. `/sidebar/sidebar.html` - Added dual textareas
4. `/sidebar/sidebar.js` - Updated to handle JSON merging

## Next Steps
- Monitor user feedback on dual-input workflow
- Consider adding validation indicators for each textarea
- Could add "Paste Sample" buttons with examples
- Consider adding field-level validation before merge