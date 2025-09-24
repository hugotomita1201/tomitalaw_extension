# E-visa Business Profile Field Mapping Documentation
**Module:** ds160-content.js
**Date:** January 16, 2025

## Summary
This document details the field mapping for the E-visa Business Profile page in the DS-160 form. The extension now includes comprehensive support for transforming various JSON data structures into the specific format required by the DS-160 E-visa Business Profile fields.

## Key Transformations Added

### 1. Business Type Mapping (`mapBusinessType()`)
Converts descriptive business type text to DS-160 codes:
- "Corporation" → "C"
- "Partnership" → "P" 
- "Branch/Liaison Office" → "B"
- "Privately Owned" → "R"
- "Joint Venture" → "J"
- "Subsidiary" → "S"
- "Other" → "O"

### 2. US State Mapping (`mapUSState()`)
Maps state names to 2-letter codes:
- "Delaware" → "DE"
- "New York" → "NY"
- Full mapping for all 50 states + DC

### 3. Business Nature Parser (`parseBusinessNature()`)
Extracts checkbox values from business description:
- Detects keywords: "Services", "Technology", "Research", "Management"
- Returns array of applicable checkbox values

### 4. Data Structure Transformation (`transformEvisaBusinessData()`)
Handles various JSON formats:
- Converts `establishedDate` → `incorporationDate`
- Parses `establishedPlace` → `incorporationCity` + `incorporationState`
- Creates office structure from company address data
- Extracts business activities from compound business type strings

## Field Mappings

### Business Information
| Field ID | JSON Path | Transformation |
|----------|-----------|----------------|
| `tbxBusinessName` | `evisaBusiness.businessName` | Direct mapping |
| `ddlBusinessType` | `evisaBusiness.businessType` | Via `mapBusinessType()` |
| `tbxBusinessTypeOther` | `evisaBusiness.businessTypeOther` | Direct mapping |

### Incorporation Date
| Field ID | JSON Path | Transformation |
|----------|-----------|----------------|
| `dllBusinessStartDateDay` | `evisaBusiness.establishedDate` | Via `getDayFromDate()` |
| `ddlBusinessStartMonth` | `evisaBusiness.establishedDate` | Via `getMonthNumber()` |
| `tbxBusinessStartDateYear` | `evisaBusiness.establishedDate` | Via `getYearFromDate()` |

### Incorporation Location
| Field ID | JSON Path | Transformation |
|----------|-----------|----------------|
| `tbxBusinessStartCity` | `evisaBusiness.establishedPlace` | Split and extract city |
| `ddlBusinessStartState` | `evisaBusiness.establishedPlace` | Split, extract state, map via `mapUSState()` |

### Office Information (First Office)
| Field ID | JSON Path | Transformation |
|----------|-----------|----------------|
| `ddlEVISA_OFFICE_TYPE` | `evisaBusiness.offices[0].type` | Default to 'H' (Headquarters) |
| `tbxEVISA_OFFICE_NAME` | `evisaBusiness.offices[0].name` | Uses `businessName` if not present |
| `tbxEVISA_OFFICE_ST_LN1` | `travel.usStreetAddress` | Falls back to `travel.companyInfo.address1` |
| `tbxEVISA_OFFICE_ST_LN2` | `travel.usStreetAddress2` | Falls back to `travel.companyInfo.address2` |
| `tbxEVISA_OFFICE_CITY` | `travel.usCity` | Falls back to `travel.companyInfo.city` |
| `tbxEVISA_OFFICE_STATE` | `travel.usState` | Falls back to `travel.companyInfo.state` |
| `tbxEVISA_OFFICE_POSTAL_CD` | `travel.usZipCode` | Falls back to `travel.companyInfo.zipCode` |
| `ddlEVISA_OFFICE_CNTRY` | Fixed: 'USA' | Via `mapCountry()` |
| `tbxEVISA_OFFICE_TEL` | `contact.workPhone` | Falls back to employer phone |

### Business Nature Checkboxes
| Field ID | Description | Detection Logic |
|----------|-------------|-----------------|
| `cbxEVISA_BUS_NATURE_GEN_IND` | General Trade | Keywords: "trade" |
| `cbxEVISA_BUS_NATURE_EXP_IND` | Exports from U.S. | Keywords: "export" |
| `cbxEVISA_BUS_NATURE_RET_IND` | Retail Sales | Keywords: "retail" |
| `cbxEVISA_BUS_NATURE_IMP_IND` | Imports to U.S. | Keywords: "import" |
| `cbxEVISA_BUS_NATURE_MAN_IND` | Manufacturing | Keywords: "manufactur" |
| `cbxEVISA_BUS_NATURE_SVC_IND` | Services/Technology | Keywords: "service", "technology", "research", "management" |
| `cbxEVISA_BUS_NATURE_OTH_IND` | Other | Keywords: "other" |

### Business Description
| Field ID | JSON Path | Transformation |
|----------|-----------|----------------|
| `tbxBusinessNatureDescription` | `evisaBusiness.businessActivities` | Extracts from businessType after "–" if present |

## JSON Structure Examples

### Input JSON (Your Format)
```json
{
  "evisaBusiness": {
    "businessName": "DLI North America, Inc.",
    "businessType": "Services/Technology – Subsidiary management and research",
    "establishedDate": "01-OCT-1997",
    "establishedPlace": "Delaware, USA"
  }
}
```

### Transformed Structure (Internal)
```json
{
  "evisaBusiness": {
    "businessName": "DLI North America, Inc.",
    "businessTypeCode": "S",
    "businessActivities": "Subsidiary management and research",
    "incorporationDate": "01-OCT-1997",
    "incorporationCity": "Delaware",
    "incorporationState": "DE",
    "natureOfBusiness": ["Services/Technology"],
    "offices": [{
      "type": "H",
      "name": "DLI North America, Inc.",
      "address": {
        "street1": "400 Park Avenue",
        "street2": "4th Floor",
        "city": "New York",
        "state": "NY",
        "postalCode": "10022",
        "country": "USA"
      },
      "phone": "5038466514"
    }]
  }
}
```

## Date Format Support

The system now handles multiple date formats:
- `DD-MMM-YYYY` (e.g., "01-OCT-1997")
- `DD-MON-YYYY` (e.g., "21-NOV-1982")
- `YYYY-MM-DD` (e.g., "1997-10-01")

The `getMonthNumber()` function returns non-padded values for DS-160 dropdowns:
- "JAN" → "1" (not "01")
- "OCT" → "10"
- "DEC" → "12"

## Testing Checklist

- [ ] Business name fills correctly
- [ ] Business type dropdown selects correct option
- [ ] Incorporation date fields (day, month, year) populate
- [ ] Incorporation city and state fill correctly
- [ ] Office address fields populate from travel/company data
- [ ] Business nature checkboxes select based on keywords
- [ ] Business activities description fills when type contains "–"
- [ ] Phone and fax numbers populate
- [ ] State codes map correctly (Delaware → DE)

## Common Issues and Solutions

1. **Business Type Not Selecting**: Ensure the JSON contains either a direct code (C, S, etc.) or descriptive text that can be mapped.

2. **Date Fields Not Filling**: Check date format matches DD-MMM-YYYY or other supported formats.

3. **State Not Selecting**: Verify state name maps to valid 2-letter code via `mapUSState()`.

4. **Office Address Missing**: The transformation creates office structure from travel company info if not explicitly provided.

5. **Checkboxes Not Checking**: Business nature must contain recognizable keywords or be provided as an array in `natureOfBusiness`.

## Implementation Notes

- All transformations happen in `transformEvisaBusinessData()` before field mapping
- The function is called automatically in `findMatchingValue()` 
- Backward compatibility maintained for existing JSON formats
- Falls back gracefully when optional fields are missing