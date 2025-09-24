# DS-160 Field Mapping Guide & Lessons Learned

## Overview
This document provides comprehensive documentation on DS-160 field mapping implementation, common pitfalls, and solutions learned during E-visa integration.

## Table of Contents
1. [Field Mapping Architecture](#field-mapping-architecture)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [E-Visa Integration Lessons](#e-visa-integration-lessons)
4. [Best Practices](#best-practices)
5. [Debugging Guide](#debugging-guide)

## Field Mapping Architecture

### Field Mapping Structure in ds160-content.js

The DS-160 auto-filler uses two main mapping objects:

#### 1. fieldMappings Object
For standard form fields (text, select, textarea):
```javascript
const fieldMappings = {
  'ctl00_SiteContentPlaceHolder_FormView1_tbxFieldName': 
    data.section?.fieldName || data.alternate_section?.field_name
};
```

#### 2. radioMappings Object  
For radio button fields:
```javascript
const radioMappings = {
  'ctl00_SiteContentPlaceHolder_FormView1_rblFieldName_0': 
    data.section?.value === true || data.section?.value === 'Yes',
  'ctl00_SiteContentPlaceHolder_FormView1_rblFieldName_1': 
    data.section?.value === false || data.section?.value === 'No'
};
```

### Page Detection Pattern
```javascript
const pageFieldPatterns = {
  'pageName': [
    'fieldPattern1', 'fieldPattern2', // Field ID fragments to match
  ]
};
```

## Common Issues & Solutions

### Issue 1: Fields Not Filling Despite Data Present

**Problem**: Data exists in JSON but fields remain empty on form
**Root Causes & Solutions**:

#### A. Incorrect Field ID Mapping
**Issue**: Using wrong field IDs (our most common E-visa mistake)
```javascript
// WRONG - Guessed field IDs
'ctl00_SiteContentPlaceHolder_FormView1_cbxGeneralTrade'
'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessActivities'

// CORRECT - Actual field IDs from form
'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_GEN_IND'
'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessNatureDescription'
```
**Solution**: Always extract actual field IDs from the form using field recorder

#### B. Data Structure Mismatch
**Issue**: Field mapping expects different data structure than provided
```javascript
// Mapping expects flat structure
data.evisaForeignBusiness?.parentBusinessName

// But JSON has nested structure
data.evisaForeignBusiness.parentBusiness.name
```
**Solution**: Support multiple data structures:
```javascript
'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT': 
  data.evisaForeignBusiness?.parentBusiness?.name ||      // Nested camelCase
  data.evisaForeignBusiness?.parentBusinessName ||        // Flat camelCase
  data.evisa_foreign_business?.parent_business?.name,     // Snake case
```

#### C. Radio Buttons in Wrong Mapping Object
**Issue**: Radio buttons placed in fieldMappings instead of radioMappings
**Solution**: Move radio button mappings to radioMappings object

### Issue 2: Checkbox Fields Not Working

**Problem**: Checkboxes not being checked even with correct data
**Solution**: 
- For single checkboxes, return boolean value
- For checkbox arrays (like business nature), check if array includes value:
```javascript
data.evisaBusiness?.natureOfBusiness?.includes('Services/Technology')
```

### Issue 3: Dynamic Fields Not Appearing

**Problem**: Conditional fields that appear based on radio/checkbox selections
**Solution**: 
- Ensure parent field is filled first
- May need multi-pass filling strategy
- Check if field exists before attempting to fill

## E-Visa Integration Lessons

### Lesson 1: Field ID Discovery Process
1. Use field recorder to capture ALL fields on page
2. Check for fields that appear after interactions (radio buttons, checkboxes)
3. Document both initial and dynamic fields

### Lesson 2: Data Structure Flexibility
Always support multiple data formats:
- Nested objects: `data.section.subsection.field`
- Flat structure: `data.section_field`
- Snake case: `data.section_field_name`
- Camel case: `data.sectionFieldName`

### Lesson 3: Office/Array Fields Pattern
For repeating sections (like multiple offices):
```javascript
// First office
'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_NAME'
// Second office  
'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl01_tbxEVISA_OFFICE_NAME'
```
Pattern: `ctl00`, `ctl01`, `ctl02` for array indices

### Lesson 4: Phone/Fax Field Placement
Phone and fax can be at different levels:
- Business level: `businessPhone`
- Office level: `offices[0].phone`
Always check both:
```javascript
data.evisaBusiness?.offices?.[0]?.phone || 
data.evisaBusiness?.businessPhone
```

## Best Practices

### 1. Field Mapping Organization
```javascript
// Group related fields with comments
// === SECTION NAME ===
// Subsection description
'field_id': data.path,
```

### 2. Null Safety
Always use optional chaining:
```javascript
data.section?.field?.subfield || defaultValue
```

### 3. Type Coercion
Handle different data types:
```javascript
// For boolean fields expecting 'Y'/'N'
data.field === true ? 'Y' : 'N'
// For string booleans
data.field === 'Yes' || data.field === true
```

### 4. Default Values
Provide sensible defaults for common fields:
```javascript
data.businessNature?.includes('Services/Technology') || 
  (data.businessType === 'tech' ? true : false)
```

## Debugging Guide

### 1. Check if Field is on Current Page
```javascript
const field = document.getElementById('field_id');
console.log('Field exists:', !!field);
console.log('Field visible:', field?.offsetParent !== null);
```

### 2. Verify Data Structure
```javascript
console.log('Data value:', data.evisaBusiness?.parentBusiness?.name);
console.log('Full path:', JSON.stringify(data.evisaBusiness, null, 2));
```

### 3. Field Mapping Diagnostic
Add logging to findMatchingValue:
```javascript
if (fieldId.includes('EVISA')) {
  console.log(`Field: ${fieldId}, Value: ${value}`);
}
```

### 4. Common Field ID Patterns

#### Personal Information
- Names: `tbxAPP_SURNAME`, `tbxAPP_GIVEN_NAME`
- Dates: `ddlDOBDay`, `ddlDOBMonth`, `tbxDOBYear`
- Nationality: `ddlAPP_NATL`

#### E-Visa Business
- Business: `tbxBusinessName`, `ddlBusinessType`
- Dates: `dllBusinessStartDateDay`, `ddlBusinessStartMonth`, `tbxBusinessStartDateYear`
- Office: `ddlEVISA_OFFICE_TYPE`, `tbxEVISA_OFFICE_NAME`
- Nature: `cbxEVISA_BUS_NATURE_*_IND` (GEN, EXP, RET, IMP, MAN, SVC, OTH)

#### E-Visa Foreign Business
- Questions: `rblForeignBusinessQuestion_0/1` (Yes/No)
- Parent: `tbxEVISA_BUS_PARENT`, `tbxEVISA_BUS_PARENT_LN1`
- Entity: `dtlForeignEntity_ctl00_tbxBUS_ENT_NAME`
- Owner: `dtlForeignOwner_ctl00_tbxIND_OWNER_SURNAME`

## Testing Checklist

Before declaring fields working:
- [ ] Field IDs match exactly from form
- [ ] Data structure paths are correct
- [ ] Radio buttons in radioMappings object
- [ ] Checkboxes return boolean values
- [ ] Multiple data format support added
- [ ] Page detection pattern includes field
- [ ] Test with sample data
- [ ] Check browser console for errors
- [ ] Verify conditional fields appear

## Common ASP.NET Field ID Components

- `ctl00`: Master page container
- `SiteContentPlaceHolder`: Content placeholder
- `FormView1`: Form view control
- `dtl`: Data list prefix
- `rbl`: Radio button list
- `ddl`: Dropdown list
- `tbx`: Textbox
- `cbx`: Checkbox

## Future Improvements

1. **Automatic Field Discovery**: Build tool to automatically extract and map fields
2. **Data Validation**: Pre-validate data structure before attempting to fill
3. **Error Reporting**: Better user feedback when fields fail to fill
4. **Field Recording Enhancement**: Auto-generate mapping code from recorded fields
5. **Multi-Format Parser**: Automatic detection of data format (camelCase vs snake_case)

## Conclusion

The key to successful DS-160 field mapping is:
1. Always verify actual field IDs from the form
2. Support multiple data structure formats
3. Properly categorize fields (text vs radio vs checkbox)
4. Test thoroughly with real sample data
5. Document patterns for future reference

Remember: When fields don't fill, it's usually one of:
- Wrong field ID
- Wrong data structure path
- Field in wrong mapping object (fieldMappings vs radioMappings)
- Missing support for data format variation