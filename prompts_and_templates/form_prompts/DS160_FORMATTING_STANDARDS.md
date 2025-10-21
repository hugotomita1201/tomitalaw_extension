# DS-160 Data Formatting Standards

**Version:** 1.29
**Last Updated:** October 14, 2025
**Purpose:** Master reference for DS-160 form data formatting rules. Use this document when creating prompts for DS-160 and other immigration forms.

---

## Table of Contents

1. [Company/Organization Names](#1-companyorganization-names)
2. [Phone Numbers](#2-phone-numbers)
3. [Dates](#3-dates)
4. [Address Formatting](#4-address-formatting)
5. [Japanese Address Handling](#5-japanese-address-handling)
6. [Spouse Information](#6-spouse-information)
7. [Postal Codes](#7-postal-codes)
8. [Country Codes](#8-country-codes)
9. [Field-Specific Constraints](#9-field-specific-constraints)
10. [JSON Optimization Rules](#10-json-optimization-rules)
11. [Complete Examples](#11-complete-examples)

---

## 1. Company/Organization Names

### Rule
**LETTERS AND SPACES ONLY** - Remove ALL punctuation

### What to Remove
- Periods (.)
- Commas (,)
- Parentheses ()
- Apostrophes (')
- Hyphens (-)
- Ampersands (&) → spell out "AND"
- All other special characters

### Examples

✅ **Correct:**
- `SANYO DENKI AMERICA INC` (not "SANYO DENKI AMERICA, INC.")
- `NISSIN FOODS USA CO INC` (not "NISSIN FOODS (U.S.A.) CO., INC.")
- `SMITH AND JOHNSON LLC` (not "Smith & Johnson, LLC")
- `ABC COMPANY` (not "A.B.C. Company")

❌ **Wrong:**
- `SANYO DENKI AMERICA, INC.` (has comma and period)
- `NISSIN FOODS (U.S.A.) CO., INC.` (has parentheses, periods, comma)
- `Smith & Johnson, LLC` (has ampersand, comma)

### Extraction Guidance
When auditing: If source has punctuation but JSON doesn't → this is CORRECT, not an error. The difference is expected and required.

---

## 2. Phone Numbers

### General Rules
- Remove ALL dashes, spaces, and parentheses
- Include country code according to rules below
- Format: continuous digits only

### US Numbers
- Format: `1` + area code + number (NO `+` sign)
- Length: 11 digits
- Examples:
  - ✅ `13107835484` (correct)
  - ❌ `3107835484` (missing country code)
  - ❌ `+13107835484` (has + sign)
  - ❌ `1-310-783-5484` (has dashes)

### Japanese Numbers
- Format: `+81` + number (DROP leading `0` from prefix)
- Examples:
  - ✅ `+819012345678` (correct - 090 becomes 90)
  - ✅ `+81312345678` (correct - 03 becomes 3)
  - ❌ `+8109012345678` (wrong - kept the leading 0)
  - ❌ `819012345678` (missing +)
  - ❌ `+81-90-1234-5678` (has dashes)

### Other Countries
- Format: `+` + country code + number
- Follow country-specific international dialing rules
- Remove all formatting (dashes, spaces, parentheses)

### Conversion Table

| Source Format | Correct Output | Wrong Output |
|--------------|----------------|--------------|
| (310) 783-5484 | `13107835484` | `3107835484` or `+13107835484` |
| 090-1234-5678 (JP) | `+819012345678` | `+8109012345678` |
| 03-1234-5678 (JP) | `+81312345678` | `+810312345678` |
| +44 20 1234 5678 (UK) | `+442012345678` | `442012345678` |

---

## 3. Dates

### Format
**DD-MMM-YYYY** (day-month-year with 3-letter month abbreviation)

### Month Abbreviations
| Month | Abbreviation |
|-------|-------------|
| January | JAN |
| February | FEB |
| March | MAR |
| April | APR |
| May | MAY |
| June | JUN |
| July | JUL |
| August | AUG |
| September | SEP |
| October | OCT |
| November | NOV |
| December | DEC |

### Examples

✅ **Correct:**
- `15-JAN-2020`
- `01-MAR-1985`
- `28-DEC-2030`

❌ **Wrong:**
- `2020-01-15` (ISO format)
- `1/15/2020` (US format)
- `15-January-2020` (full month name)
- `15-1-2020` (numeric month)

### Special Cases
- If date not available: Use `N/A` or omit field entirely
- Never fabricate dates

---

## 4. Address Formatting

### 4.1 Street Address Structure

**CRITICAL RULE:** Building/house number MUST come FIRST, then street name

✅ **Correct:**
- `123 Main Street`
- `3-14-7 Shibuya`
- `456 International Plaza`

❌ **Wrong:**
- `Main Street 123`
- `Shibuya 3-14-7`
- `International Plaza 456`

### 4.2 USPS Secondary Unit Designators

**Format:** `ABBREVIATION.NUMBER` (period, NO space before number)

#### Complete USPS Designator Table

| Description | Abbreviation | Example |
|------------|-------------|---------|
| Apartment | APT | APT.701 |
| Suite | STE | STE.355E |
| Unit | UNIT | UNIT.5 |
| Building | BLDG | BLDG.A |
| Floor | FL | FL.20 |
| Room | RM | RM.302 |
| Office | OFC | OFC.100 |
| Penthouse | PH | PH.1 |
| Space | SPC | SPC.15 |
| Department | DEPT | DEPT.5 |
| Basement | BSMT | BSMT.1 |
| Lobby | LBBY | LBBY.2 |
| Trailer | TRLR | TRLR.10 |
| Front | FRNT | FRNT.A |
| Rear | REAR | REAR.B |
| Upper | UPPR | UPPR.1 |
| Lower | LOWR | LOWR.2 |
| Side | SIDE | SIDE.A |
| Slip | SLIP | SLIP.12 |
| Pier | PIER | PIER.5 |
| Stop | STOP | STOP.3 |
| Hanger | HNGR | HNGR.7 |
| Key | KEY | KEY.45 |
| Lot | LOT | LOT.23 |

#### Examples

✅ **Correct:**
- `APT.701` (apartment 701)
- `STE.355E` (suite 355E)
- `FL.20` (20th floor)
- `BLDG.A` (building A)

❌ **Wrong:**
- `Apartment 701` (not abbreviated)
- `APT 701` (has space)
- `#701` (using # symbol)
- `701号室` (Japanese format)

### 4.3 Japanese Unit Numbers

**Conversion Rules:**
- `701号室` → `APT.701`
- `502号` → `APT.502`
- `20階` → `FL.20`

### 4.4 Building Name + Unit Combination

When address has both building name and unit number:
- **Street Line 1:** Building name + street address (number first)
- **Street Line 2 (homeApt):** Unit designator only

**Example:**
- Source: `PARK TOWER 502号室, 3-14-7 渋谷`
- Output:
  - `homeStreet`: `3-14-7 SHIBUYA PARK TOWER`
  - `homeApt`: `APT.502`

---

## 5. Japanese Address Handling

### 5.1 Language Format
**DS-160 uses ENGLISH/ROMAJI** for all non-US addresses (NOT kanji/kana)

### 5.2 Administrative Suffix Removal

DS-160 form fields are already labeled "City" and "State/Province", so administrative suffixes are REDUNDANT and must be removed.

#### City-Level Suffixes (REMOVE)

| Suffix | Meaning | Example Before | Example After |
|--------|---------|---------------|---------------|
| -shi (市) | City | Osaka-shi | Osaka |
| -ku (区) | Ward | Shibuya-ku | Shibuya |
| -cho (町) | Town | Fuchu-cho | Fuchu |
| -machi (町) | Town | Fuchu-machi | Fuchu |
| -mura (村) | Village | Yamada-mura | Yamada |
| -gun (郡) | District | Aichi-gun | Aichi |

#### Prefecture-Level Suffixes (REMOVE)

| Suffix | Meaning | Example Before | Example After |
|--------|---------|---------------|---------------|
| -to (都) | Metropolis | Tokyo-to | Tokyo |
| -fu (府) | Urban prefecture | Osaka-fu | Osaka |
| -ken (県) | Prefecture | Kanagawa-ken | Kanagawa |
| -do (道) | Territory | Hokkaido | Hokkaido * |

\* Hokkaido already has no suffix in practice

### 5.3 Complete Japanese Address Example

**Source Document:**
```
パークタワー 502号室
3-14-7 渋谷
渋谷区
東京都 150-0002
```

**Correct JSON Output:**
```json
{
  "homeStreet": "3-14-7 SHIBUYA PARK TOWER",
  "homeApt": "APT.502",
  "homeCity": "Shibuya",
  "homeState": "Tokyo",
  "homePostalCode": "150-0002",
  "homeCountry": "JPN"
}
```

**Explanation:**
- Street: Number first (3-14-7), then district (SHIBUYA), then building name (PARK TOWER)
- Apt: Japanese 502号室 → APT.502
- City: 渋谷区 (Shibuya-ku) → Shibuya (remove -ku)
- State: 東京都 (Tokyo-to) → Tokyo (remove -to)

### 5.4 Why Remove Suffixes?

The DS-160 form has separate labeled fields:
- **"City"** field → already indicates city level
- **"State/Province"** field → already indicates prefecture level

Including suffixes creates redundancy:
- ❌ Wrong: "Shibuya-ku City, Tokyo-to State"
- ✅ Correct: "Shibuya City, Tokyo State"

---

## 6. Spouse Information

### 6.1 Maiden Name Format

If spouse has a maiden name, include it in the surname field with specific formatting.

**Format:** `CURRENT_NAME MAIDEN NAME PREVIOUS_NAME`

**Examples:**
- ✅ `YAMAMOTO MAIDEN NAME TANAKA`
- ✅ `SMITH MAIDEN NAME JOHNSON`
- ❌ `YAMAMOTO TANAKA` (missing "MAIDEN NAME" label)
- ❌ `YAMAMOTO (MAIDEN NAME TANAKA)` (parentheses not allowed by DS-160)

**When to Use:**
- Only if maiden name information is available in source documents
- Omit entirely if no maiden name information exists

### 6.2 Spouse Place of Birth Fields

**IMPORTANT:** Use correct field names that match extension code

✅ **Correct Fields:**
```json
"spouse": {
  "city": "Osaka",        // Correct - extension expects "city" for place of birth
  "birthState": "Osaka",
  "country": "JPN"        // Correct - extension expects "country" for place of birth
}
```

❌ **Wrong Fields:**
```json
"spouse": {
  "cityOfBirth": "Osaka",    // Wrong - extension doesn't recognize this
  "countryOfBirth": "JPN"     // Wrong - extension doesn't recognize this
}
```

### 6.3 Complete Spouse Example

```json
"spouse": {
  "surname": "YAMAMOTO MAIDEN NAME TANAKA",
  "givenName": "YUKI",
  "dateOfBirth": "20-AUG-1987",
  "nationality": "JPN",
  "city": "Osaka",
  "birthState": "Osaka",
  "country": "JPN",
  "addressType": "SAME_AS_HOME"
}
```

---

## 7. Postal Codes

### Rule
**Normal formatting ALLOWED** (can include dashes)

### Examples

✅ **Correct:**
- `532-0011` (Japanese format with dash)
- `90249-1234` (US ZIP+4 format with dash)
- `90249` (US 5-digit ZIP)
- `SW1A 1AA` (UK format with space)

❌ **Wrong:**
- None - all standard postal code formats are acceptable

### Note
Unlike phone numbers, postal codes MAY retain their standard formatting including dashes and spaces.

---

## 8. Country Codes

### Standard Format
Use **3-letter country codes** (ISO Alpha-3)

### DS-160 Non-Standard Mappings

**CRITICAL:** DS-160 uses some non-standard codes. Always use `mapCountry()` function.

| Standard ISO-3 | DS-160 Code | Country Name |
|---------------|-------------|--------------|
| DEU | GER | Germany |
| THA | THAI | Thailand |
| GBR | GRBR | United Kingdom |
| CHN | CHIN | China |
| USA | USA | United States ✓ |
| JPN | JPN | Japan ✓ |
| CAN | CAN | Canada ✓ |

### Common Countries (Standard Codes)

| Code | Country |
|------|---------|
| USA | United States |
| JPN | Japan |
| CHN | China |
| KOR | South Korea |
| GBR | United Kingdom |
| DEU | Germany |
| FRA | France |
| CAN | Canada |
| AUS | Australia |
| IND | India |
| MEX | Mexico |
| BRA | Brazil |

### Important Notes
- Extension has `mapCountry()` function that handles non-standard mappings
- Always reference the mapping function for accuracy
- Full mapping in ds160-content.js lines 2300-2450

---

## 9. Field-Specific Constraints

### 9.1 Job Titles

**Maximum Length:** 70 characters

**Rules:**
- Title ONLY, not description
- Short, concise
- No full sentences

**Examples:**
- ✅ `Software Engineer`
- ✅ `Chief Technology Officer`
- ✅ `Senior Marketing Manager`
- ❌ `Software Engineer responsible for developing enterprise applications` (too long, description)

### 9.2 Monthly Income

**Format:** String, whole number only (no decimals, no currency symbols)

**Examples:**
- ✅ `1500000` (Japanese yen)
- ✅ `9417` (US dollars)
- ❌ `1,500,000` (has commas)
- ❌ `9417.50` (has decimals)
- ❌ `$9,417` (has currency symbol)

**Note:** Round to nearest whole number if decimals exist

### 9.3 Gender Field

**Values:** `MALE` or `FEMALE`

**Inference:** Infer from given name if not explicitly stated in documents

### 9.4 Marital Status

**Values:** `SINGLE`, `MARRIED`, `DIVORCED`, `WIDOWED`, `SEPARATED`

**Inference:** Infer from spouse information if present in documents

### 9.5 Primary Occupation

**Standard Values:**
- `AGRICULTURE`
- `BUSINESS`
- `COMPUTER SCIENCE`
- `EDUCATION`
- `GOVERNMENT`
- `HOMEMAKER`
- `MEDICAL`
- `MILITARY`
- `NOT EMPLOYED`
- `RETIRED`
- `STUDENT`
- `OTHER`

**Inference Rules:**
- Corporate work → `BUSINESS`
- Academic positions → `EDUCATION`
- Government positions → `GOVERNMENT`
- Tech roles → `COMPUTER SCIENCE`

**Conditional:**
- If `PRIMARY_OCCUPATION = OTHER`, then `primaryOccupationOther` is REQUIRED
- If `PRIMARY_OCCUPATION ≠ OTHER`, then OMIT `primaryOccupationOther` field entirely

### 9.6 Boolean Defaults

**Security Questions:** Default to `false` when missing (State Department requirement)

**Implementation:**
```javascript
const getSecurityValue = (value) => value === true || value === 'true';
```

**Rule:** If boolean is `false`, OMIT corresponding explanation field

**Examples:**
- If `lostPassport.hasLost = false` → OMIT `lostPassport.explanation`
- If `visaRefused = false` → OMIT `visaRefusedExplanation`

### 9.7 Array Structures

**CRITICAL:** Preserve array structures for auto-boolean logic

✅ **Correct:**
```json
{
  "visits": [],
  "licenses": [],
  "previousEmployers": []
}
```

❌ **Wrong:**
```json
{
  "visits": "Array of previous visits...",
  "licenses": "Array of driver licenses..."
}
```

**Why:** Auto-boolean fields depend on array presence/length:
```javascript
hasBeenToUS: data.previousTravel?.visits?.length > 0
hasDriversLicense: data.personal?.licenses?.length > 0
```

### 9.8 Array Ordering

**CRITICAL:** Sort arrays chronologically OLDEST FIRST

**Applies to:**
- `previousTravel.visits` → Oldest visit first
- `workEducation.education.institutions` → Oldest school first
- `workEducation.previousEmployers` → Oldest job first

**Why:** Allows appending recent items without re-sorting

### 9.9 Present Employer Definition

**IMPORTANT:** `presentEmployer` = where applicant CURRENTLY works (at time of DS-160 submission)

**Rules:**
- Use the employer where applicant works RIGHT NOW
- NOT the employer they are applying to work for
- Even if same company (e.g., visa renewal, internal transfer), use CURRENT employer information

**Examples:**
- ✅ Applicant works at Company A, applying to work at Company B → `presentEmployer` = Company A
- ✅ Applicant works at Company A, renewing visa for Company A → `presentEmployer` = Company A
- ✅ Applicant works at Company A (Japan branch), transferring to Company A (US branch) → `presentEmployer` = Company A Japan branch

**Key Point:** Always focus on CURRENT employment status, regardless of future plans

---

## 10. JSON Optimization Rules

### 10.1 When to OMIT Fields

**Rule:** Reduce JSON size to prevent API cutoffs

**Omit These:**
1. All empty strings (`""`)
2. All `null` values
3. All `N/A` values
4. All `false` boolean fields
5. All explanation fields when corresponding boolean is `false`
6. Entire security section if all values are `false`
7. Optional fields with no data
8. Conditional fields when condition not met

### 10.2 Examples

✅ **Good (Optimized):**
```json
{
  "personal": {
    "surname": "SMITH",
    "givenName": "JOHN"
  }
}
```

❌ **Bad (Bloated):**
```json
{
  "personal": {
    "surname": "SMITH",
    "givenName": "JOHN",
    "middleName": "",
    "telecodeSurname": "",
    "telecodeGivenName": "",
    "nationalId": "N/A",
    "usSocialSecurity": "",
    "usTaxId": null
  }
}
```

### 10.3 Security Section Handling

If ALL security questions are `false`:

❌ **Don't Include:**
```json
{
  "security": {
    "hasCommunicableDisease": false,
    "hasPhysicalDisorder": false,
    "hasDrugAddiction": false,
    ...
  }
}
```

✅ **Omit Entirely:**
```json
{
  // No security section at all
}
```

**Why:** Extension automatically defaults missing booleans to `false`

### 10.4 Optional Chaining Benefits

Omitting empty fields allows safe optional chaining:
```javascript
data.contact?.homeStreet  // Works even if homeStreet omitted
data.passport?.number     // Works even if number omitted
```

---

## 11. Complete Examples

### 11.1 Japanese Address (E-2 Visa Applicant)

**Source Documents:**
```
Name: YAMAMOTO Takeshi (山本武)
DOB: March 15, 1985
Passport: TK1234567
Address: パークタワー 701号室
         3-14-7 渋谷
         渋谷区
         東京都 150-0002
Phone: 090-1234-5678
Spouse: YAMAMOTO Yuki (maiden name: TANAKA)
        Born: Osaka-shi, Osaka-fu
```

**Correct JSON:**
```json
{
  "personal": {
    "surname": "YAMAMOTO",
    "givenName": "TAKESHI",
    "fullNameNative": "山本武",
    "gender": "MALE",
    "maritalStatus": "MARRIED",
    "dateOfBirth": "15-MAR-1985",
    "birthCity": "Tokyo",
    "birthState": "Tokyo",
    "birthCountry": "JPN",
    "nationality": "JPN"
  },

  "passport": {
    "type": "REGULAR",
    "number": "TK1234567",
    "issueCountry": "JPN",
    "issueCity": "Tokyo",
    "issueState": "Tokyo",
    "issueDate": "01-MAR-2020",
    "expirationDate": "28-FEB-2030"
  },

  "contact": {
    "homeStreet": "3-14-7 SHIBUYA PARK TOWER",
    "homeApt": "APT.701",
    "homeCity": "Shibuya",
    "homeState": "Tokyo",
    "homePostalCode": "150-0002",
    "homeCountry": "JPN",
    "homePhone": "+819012345678",
    "email": "takeshi.yamamoto@example.com"
  },

  "family": {
    "spouse": {
      "surname": "YAMAMOTO MAIDEN NAME TANAKA",
      "givenName": "YUKI",
      "dateOfBirth": "20-AUG-1987",
      "nationality": "JPN",
      "city": "Osaka",
      "birthState": "Osaka",
      "country": "JPN",
      "addressType": "SAME_AS_HOME"
    }
  }
}
```

### 11.2 US Address (H-1B Visa Applicant)

**Source Documents:**
```
Name: SMITH, John David
DOB: January 10, 1990
Address: 123 Main Street, Suite 456
         Los Angeles, CA 90001
Phone: (310) 783-5484
Company: ABC TECHNOLOGY, INC.
```

**Correct JSON:**
```json
{
  "personal": {
    "surname": "SMITH",
    "givenName": "JOHN",
    "gender": "MALE",
    "dateOfBirth": "10-JAN-1990",
    "birthCity": "Los Angeles",
    "birthState": "CA",
    "birthCountry": "USA",
    "nationality": "USA"
  },

  "contact": {
    "homeStreet": "123 MAIN STREET",
    "homeApt": "STE.456",
    "homeCity": "Los Angeles",
    "homeState": "CA",
    "homePostalCode": "90001",
    "homeCountry": "USA",
    "homePhone": "13107835484",
    "email": "john.smith@example.com"
  },

  "workEducation": {
    "primaryOccupation": "COMPUTER SCIENCE",
    "presentEmployer": {
      "name": "ABC TECHNOLOGY INC",
      "jobTitle": "Software Engineer",
      "startDate": "01-JUN-2020",
      "monthlyIncome": "8333"
    }
  }
}
```

### 11.3 Mixed Scenario (Japanese Applicant, US Company)

**Source Documents:**
```
Applicant: TANAKA Hiroshi
Current Address (Japan): マンション東京 502号
                        1-2-3 新宿
                        新宿区, 東京都
US Employment: NISSAN NORTH AMERICA, INC.
              789 Business Park Drive, Building C, Floor 5
              Nashville, TN 37201
              Phone: (615) 555-0100
```

**Correct JSON:**
```json
{
  "personal": {
    "surname": "TANAKA",
    "givenName": "HIROSHI",
    "nationality": "JPN"
  },

  "contact": {
    "homeStreet": "1-2-3 SHINJUKU MANSION TOKYO",
    "homeApt": "APT.502",
    "homeCity": "Shinjuku",
    "homeState": "Tokyo",
    "homeCountry": "JPN"
  },

  "workEducation": {
    "primaryOccupation": "BUSINESS",
    "presentEmployer": {
      "name": "NISSAN NORTH AMERICA INC",
      "address": {
        "street1": "789 BUSINESS PARK DRIVE",
        "street2": "BLDG.C FL.5",
        "city": "Nashville",
        "state": "TN",
        "postalCode": "37201",
        "country": "USA"
      },
      "phone": "16155550100",
      "jobTitle": "Regional Sales Manager"
    }
  }
}
```

---

## Usage Guidelines

### For Prompt Creation

When creating new form prompts (I-129, I-140, DS-156E, etc.):

1. **Reference this document** for all formatting rules
2. **Copy applicable sections** to new prompt
3. **Adapt field names** to match target form schema
4. **Maintain consistency** with DS-160 standards where possible

### For Validation/Audit

When auditing JSON output:

1. **Check company names** - no punctuation
2. **Check phone numbers** - correct country code format
3. **Check dates** - DD-MMM-YYYY format
4. **Check addresses** - number first, USPS designators
5. **Check Japanese addresses** - suffixes removed
6. **Check spouse** - maiden name format, POB fields
7. **Check arrays** - preserved structure, chronological order
8. **Check omissions** - unnecessary fields removed

### For ChatGPT Extraction

Include these instructions in prompts:

> "Apply DS-160 formatting standards during extraction:
> - Company names: Remove ALL punctuation
> - Phone numbers: Apply country-specific formatting
> - Addresses: Number first, USPS designators, Japanese suffix removal
> - Dates: DD-MMM-YYYY format
> - Reference: DS160_FORMATTING_STANDARDS.md"

---

## Change Log

### Version 1.29 (October 14, 2025)
- **CRITICAL JSON SYNTAX FIX**: Fixed 3 critical errors in ds160_prompt_combined_v5.6.txt preventing ChatGPT from parsing schema correctly
  - **Problem**: v5.6 file had JSON syntax errors that broke ChatGPT's ability to generate valid JSON output
  - **Error #1 (Line 693)**: Missing comma after `givenName` field in `evisaApplicationContact.officer` object
    * Before: `"givenName": "string - Applicant/company officer given name"` ❌ (no comma)
    * After: `"givenName": "string - Applicant/company officer given name",` ✅
  - **Error #2 (Line 509)**: Improper inline text after comma in `presentEmployer.name` field
    * Before: `"name": "string or omit", CRITICAL FOR RENEWALS: MAKE SURE...` ❌ (breaks JSON structure)
    * After: Moved renewal instruction to comment on line 508, added comma to line 509 ✅
  - **Error #3 (Line 1)**: Version header mismatch - header said v5.5 but filename is v5.6
    * Before: `# DS-160 Combined Prompt v5.5 - Enhanced Formatting + Schema Updates` ❌
    * After: `# DS-160 Combined Prompt v5.6 - Enhanced Formatting + Schema Updates` ✅
  - **Impact**: These syntax errors prevented ChatGPT from:
    * Parsing the schema template correctly
    * Generating valid JSON output that matches the expected format
    * Enabling the extension to successfully parse ChatGPT's output for form filling
  - **Root Cause**: Schema example had invalid JSON structure that violated JSON syntax rules
  - **Result**: v5.6 prompt now has valid JSON syntax and can be used by ChatGPT to generate correct DS-160 data
- Files updated:
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/ds160_prompt_combined_v5.6.txt (lines 1, 509, 693)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.28 → 1.29)

### Version 1.28 (October 14, 2025)
- **INTERACTIVE SECTION HEADERS**: Added clickable toggle functionality for DS-160 section headers
  - **User Request**: "can we have that become an interactable button that when we click on it it switches to the information of the auto-fill partial section? and vice versa? so we can see the different json's that are imported."
  - **Purpose**: Enable toggling between viewing main DS-160 data and partial JSON data after both are loaded, without losing either dataset
  - **Previous Limitation**: Could only view whichever dataset was loaded LAST - no way to switch between viewing the two different JSONs
  - **HTML Changes** (sidebar.html):
    * Line 51: Added `id="main-section-header"` to Main DS-160 Data section header
    * Line 86: Added `id="partial-section-header"` to Partial JSON section header
    * IDs enable JavaScript targeting for click event listeners
  - **JavaScript Changes** (sidebar.js):
    * Lines 193-196: Changed from single `currentData` to separate storage variables:
      - `mainLoadedData = null` - Stores loaded main DS-160 data
      - `partialLoadedData = null` - Stores loaded partial JSON data
      - `currentData = null` - Points to whichever data is currently being viewed
      - `currentDataType = null` - Tracks 'main' or 'partial' for active state
    * Lines 216-217: Added element references for both section headers
    * Lines 804-839: Updated "Load Main Data" button handler:
      - Stores in `mainLoadedData` variable (not `currentData` directly)
      - Sets `currentData = mainLoadedData` and `currentDataType = 'main'`
      - Calls `updateSectionHeaderStates()` to update visual indicators
    * Lines 841-876: Updated "Load Partial Data" button handler:
      - Stores in `partialLoadedData` variable
      - Sets `currentData = partialLoadedData` and `currentDataType = 'partial'`
      - Calls `updateSectionHeaderStates()` to update visual indicators
    * Lines 1147-1178: Created `updateSectionHeaderStates()` helper function:
      - Manages active/disabled classes on both headers
      - Adds 'active' class to currently viewed data type
      - Sets cursor to 'pointer' when data is loaded, 'default' when disabled
      - Prevents clicks on headers without loaded data
    * Lines 1180-1196: Added click handler for Main section header:
      - Checks if `mainLoadedData` exists before allowing click
      - Switches `currentData = mainLoadedData` and `currentDataType = 'main'`
      - Refreshes preview with `displayEditableData(currentData)`
      - Shows status message: "Switched to Main DS-160 Data view"
    * Lines 1198-1214: Added click handler for Partial section header:
      - Checks if `partialLoadedData` exists before allowing click
      - Switches `currentData = partialLoadedData` and `currentDataType = 'partial'`
      - Refreshes preview with `displayEditableData(currentData)`
      - Shows status message: "Switched to Partial JSON view"
  - **CSS Changes** (sidebar.css lines 1284-1318):
    * Base styles for `.section-header-ds160`:
      - `display: flex`, `align-items: center`, `gap: 8px`
      - `transition: all 0.2s ease`, `user-select: none`
      - `padding: 8px`, `border-radius: 6px`
    * Hover state `.section-header-ds160:not(.disabled):hover`:
      - Background: `rgba(255, 255, 255, 0.5)`
      - Box shadow: `0 2px 4px rgba(0, 0, 0, 0.05)`
      - Transform: `translateY(-1px)` for subtle lift effect
    * Active state `.section-header-ds160.active`:
      - Background: `rgba(255, 255, 255, 0.8)`
      - Box shadow: `0 2px 6px rgba(0, 0, 0, 0.1)`
      - Border: `1px solid rgba(74, 144, 226, 0.3)` for visual emphasis
    * Disabled state `.section-header-ds160.disabled`:
      - Opacity: `0.5` to indicate non-interactive state
      - Cursor: `default !important` to prevent misleading pointer cursor
  - **Visual Feedback**:
    * Before loading data: Both headers disabled (opacity 0.5, no hover effect)
    * After loading: Loaded headers become clickable with hover effect
    * Active header: White background with blue border, clearly distinguished
    * Status messages: "Switched to Main DS-160 Data view" or "Switched to Partial JSON view"
  - **Architecture**:
    * Two independent datasets maintained in memory simultaneously
    * `currentData` pointer switches between `mainLoadedData` and `partialLoadedData`
    * Visual state management via `updateSectionHeaderStates()` keeps UI synchronized
    * No data loss when toggling - both datasets persist until explicitly cleared
  - **Workflow Example**:
    1. User loads complete DS-160 JSON → Main header becomes clickable and active
    2. User loads partial section JSON → Partial header becomes clickable and active
    3. User clicks Main header → Preview switches to show main data, Main header highlighted
    4. User clicks Partial header → Preview switches to show partial data, Partial header highlighted
    5. User can toggle back and forth without re-loading or losing data
  - **Impact**: Users can now easily compare and verify both main and partial JSONs without needing to re-paste data or lose track of which dataset they're viewing
- Files updated:
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.html (lines 51, 86)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.js (lines 193-196, 216-217, 804-876, 1147-1214)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.css (lines 1284-1318)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.27 → 1.28)

### Version 1.25 (October 13, 2025)
- **EDIT DATA BUTTON FIX**: Fixed Edit Data button to clear opposite textarea when restoring data
  - **Problem**: After loading partial JSON and clicking "Edit Data", the partial JSON appeared in the main DS-160 field because old data from previous load remained visible in wrong field
  - **User Report**: "for some reason though after i load just the partial json data, and then click edit json, the partial json gets moved up to the main ds-160 data for some reason"
  - **Root Cause**: Edit Data button correctly restored data to appropriate textarea based on currentDataType, but didn't clear the OTHER textarea
  - **Solution**: Added code to clear opposite textarea when restoring data
  - **Code Changes** (sidebar.js lines 1117-1127):
    * When restoring to main textarea (currentDataType === 'main'): Clear partialDataInput with `partialDataInput.value = ''`
    * When restoring to partial textarea (currentDataType === 'partial'): Clear dataInput with `dataInput.value = ''`
    * Added comments: "Clear the partial field since we're editing main data" and "Clear the main field since we're editing partial data"
  - **Impact**: Edit Data button now ensures only the correct textarea contains data when returning to input view, eliminating confusion about which field should be used
  - **Visual Result**: User sees data ONLY in the textarea corresponding to currentDataType - no more data appearing in wrong field
- Files updated:
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.js (lines 1117-1127)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.24 → 1.25)

### Version 1.24 (October 13, 2025)
- **E2 ESSENTIAL SKILLS TEMPLATE FIX**: Added critical instruction to prevent background history compression
  - **Problem**: E2 Essential Skills template had "concise but comprehensive narrative" language (line 461) that could cause ChatGPT to produce compressed summaries instead of detailed multi-paragraph background histories
  - **User Discovery**: User provided actual E2 Essential Skills letter example (Mr. Kosei Sarai at Nissin Foods) showing **detailed 7-paragraph background history** covering 26 years of career progression (1999-2025):
    * 7 distinct employment periods at Panasonic and Nissin Foods
    * Each period with comprehensive details: team sizes (3-88 direct staff + 500 contractors), financial results (2.1B-11.8B yen), geographic assignments (Mexico, Brazil, Argentina, Thailand)
    * Specific achievements: 100+ units/month milestones, 4x sales growth, returning to profitability, subsidiary consolidation
    * Each 2-6 year period got its own detailed paragraph - NOT compressed into summaries
  - **Root Cause**: ChatGPT follows instructions more than examples - "concise" language can lead to 200-300 word summaries instead of 800-1200 word detailed histories
  - **User Quote**: "well wait. the e2_essential skills template also needs to have a detailed background history. look at the example above."
  - **Comparison Table**:
    | Template | Before Fix | After Fix |
    |----------|-----------|-----------|
    | **E2 Manager** | ✅ Has critical instruction (line 671) + detailed 7-paragraph examples | ✅ No change needed |
    | **E2 Executive** | ⚠️ Had examples but missing critical instruction | ✅ Fixed in v1.23 (added line 528) |
    | **E2 Essential Skills** | ⚠️ Had "concise" language (line 461) causing potential compression | ✅ Fixed in v1.24 (added line 456) |
  - **Solution**: Added critical instruction at line 456 (after "### Formatting Standards" header, before existing preface):
    * **🚨 CRITICAL: Each distinct position/role period (typically 2-6 years) requires its own detailed paragraph. DO NOT condense or group multiple positions into summary paragraphs. See detailed examples below for required level of detail.**
  - **Impact**: E2 Essential Skills template now has same protection as E2 Manager and E2 Executive templates - explicit instruction ensures ChatGPT produces detailed 800-1200 word background histories instead of compressed summaries
  - **Placement**: Critical instruction appears FIRST (line 456), before existing preface, for maximum visibility
- File updated: e2_essential_skills_template.md (line 456)
- Result: All three E2 templates now have consistent protection against background history compression with explicit critical instructions

### Version 1.23 (October 13, 2025)
- **E2 EXECUTIVE TEMPLATE FIX**: Added critical instruction to prevent background history compression
  - **Problem**: E2 Executive template had detailed multi-paragraph examples (lines 595-606) but was MISSING the critical instruction that prevents ChatGPT from compressing background history sections into summaries
  - **Root Cause**: ChatGPT follows instructions more than examples - without explicit "each 2-6 year period requires its own detailed paragraph" instruction, ChatGPT might ignore detailed examples and produce compressed output
  - **Comparison**:
    * ✅ **E2 Manager Template**: Has critical instruction (line 671) + detailed 7-paragraph examples → No compression problem
    * ✅ **E2 Essential Skills Template**: Intentionally uses "concise but comprehensive narrative" format (line 458) → Different format by design, appropriate for Essential Skills category
    * ⚠️ **E2 Executive Template (BEFORE FIX)**: Had detailed examples but missing critical instruction → Compression risk
  - **Solution**: Added critical instruction at line 528 (after "### Formatting Standards" header):
    * **🚨 CRITICAL: Each distinct position/role period (typically 2-6 years) requires its own detailed paragraph. DO NOT condense or group multiple positions into summary paragraphs. See detailed examples below for required level of detail.**
  - **Impact**: E2 Executive template now has same protection as E2 Manager template - explicit instruction ensures ChatGPT produces detailed 800-1200 word background histories instead of 200-300 word compressed summaries
  - **Placement**: Critical instruction appears FIRST (line 528), before general preface (line 530), for maximum visibility
  - **Examples Present**: Template already had good detailed multi-paragraph examples (Mr. Iwashita at Isuzu/ITCA showing 5 distinct employment periods with progressive promotions, supervisory scope, and project leadership)
- File updated: e2_executive_template.md (line 528)
- Result: All three E2 templates now have consistent protection against background history compression (E2 Manager and E2 Executive have explicit instructions; E2 Essential Skills intentionally uses shorter format)

### Version 1.22 (October 13, 2025)
- **DUAL LOAD DATA FUNCTIONALITY**: Added independent Load Data buttons for both main DS-160 and partial JSON sections
  - **User Request**: "can we make it so that we can load data just with the partial json as well?"
  - **Purpose**: Enable validation and preview for both main DS-160 JSON and partial JSON data before auto-filling
  - **Previous Limitation**: Only main DS-160 field had Load Data → Preview → Auto-Fill workflow; partial JSON could only be auto-filled directly without validation
  - **HTML Changes** (sidebar.html):
    * Lines 70-78: Moved Load Data + Clear buttons inside main DS-160 section
      - Button IDs: `ds160-load-main` (blue btn-primary), `ds160-clear-main` (btn-outline)
      - Buttons now color-coded to match blue main section container
    * Lines 112-120: Added Load Data + Clear buttons inside partial JSON section
      - Button IDs: `ds160-load-partial` (orange btn-orange), `ds160-clear-partial` (btn-outline)
      - Load button uses orange btn-orange to match partial section theme
    * Line 131: Added data type badge to preview section header
      - Element ID: `ds160-data-type-badge`, hidden by default
      - Shows "Main DS-160 Data" (blue badge) or "Partial JSON Data" (orange badge)
  - **JavaScript Changes** (sidebar.js):
    * Line 194: Added `currentDataType` variable to track 'main' or 'partial'
    * Lines 198-213: Updated button element references for new IDs
    * Lines 800-831: Created `ds160-load-main` button handler
      - Reads from `ds160-data` textarea
      - Sets `currentDataType = 'main'`
      - Saves to chrome.storage with `lastDS160DataType: 'main'`
    * Lines 833-864: Created `ds160-load-partial` button handler
      - Reads from `ds160-evisa-data` textarea
      - Sets `currentDataType = 'partial'`
      - Saves to chrome.storage with `lastDS160DataType: 'partial'`
    * Lines 697-703: Updated `displayEditableData()` to show data type badge
      - Badge text: "Main DS-160 Data" or "Partial JSON Data"
      - Badge class: `section-badge required` (blue) or `section-badge optional` (orange)
    * Lines 956-968: Created `ds160-clear-main` button handler
      - Clears main textarea only
      - Resets currentData/currentDataType if main was loaded
    * Lines 970-985: Created `ds160-clear-partial` button handler
      - Clears partial textarea only
      - Resets currentData/currentDataType if partial was loaded
    * Lines 1115-1127: Updated Edit Data button
      - Restores data to correct textarea based on currentDataType
      - Main data → main textarea, Partial data → partial textarea
    * Lines 770-798: Updated saved data loading
      - Remembers which type was loaded last via `lastDS160DataType`
      - Auto-clicks correct Load button on module reload
  - **Visual Result**:
    * Main section: Blue Load Data + Clear buttons below textarea
    * Partial section: Orange Load Data + Clear buttons below textarea (Load button matches orange theme)
    * Preview section: Shows blue "Main DS-160 Data" badge or orange "Partial JSON Data" badge
    * Clear visual separation: Each section has independent load/clear controls
  - **Workflow Examples**:
    * **Main workflow**: Paste complete JSON → Click "Load Data" → Validate → Preview with blue badge → Edit if needed → Click "Auto-Fill DS-160 Form (Main Data)"
    * **Partial workflow**: Paste section JSON → Click "Load Data" → Validate → Preview with orange badge → Edit if needed → Click "Auto-Fill Partial Section"
  - **Impact**: Both sections now have complete load → validate → preview → auto-fill capability; users can verify data correctness before filling
  - **Architecture**: Two independent workflows maintained - no data merging, each button operates on its own textarea and sets currentDataType accordingly
- Files updated:
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.html (lines 70-78, 112-120, 131)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.js (lines 194, 198-213, 697-703, 770-798, 800-864, 956-985, 1115-1127)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.21 → 1.22)

### Version 1.21 (October 13, 2025)
- **BUTTON COLOR UPDATE**: Made "Auto-Fill Partial Section" button orange to match partial JSON section theme
  - **User Request**: "can we make it so the auto fill partial json button is orange?"
  - **Purpose**: Visual consistency - button now matches the #ff9800 orange accent color used in partial JSON section container
  - **CSS Changes** (sidebar.css lines 295-304):
    * Added `.btn-orange` class - Background: #ff9800, color: white
    * Added `.btn-orange:hover` - Background: #e68900 (darker), translateY(-2px), box-shadow with orange tint
    * Follows same pattern as other button classes (btn-primary, btn-secondary, btn-success, btn-danger)
  - **HTML Changes** (sidebar.html line 150):
    * Changed button class from `btn btn-secondary` to `btn btn-orange`
    * Button id `ds160-fill-partial` and functionality unchanged
  - **Visual Result**:
    * "Auto-Fill DS-160 Form (Main Data)" button: Blue (btn-primary) - matches main section
    * "Auto-Fill Partial Section" button: Orange (btn-orange) - matches partial section
    * Consistent theming: Both buttons now visually match their corresponding sections
  - **Impact**: Improved UI clarity - users can now immediately associate the orange button with the orange partial JSON section
- Files updated:
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.css (lines 295-304)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.html (line 150)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.20 → 1.21)

### Version 1.20 (October 13, 2025)
- **UI ENHANCEMENT**: Added visual distinction between main DS-160 JSON and partial JSON workflows
  - **Problem**: Users couldn't easily distinguish between main DS-160 data field and partial JSON field - both looked the same
  - **User Request**: "update the UI so that the person can properly see what is the original ds160, and what is the partial json"
  - **Solution**: Enhanced UI with color-coded containers, icons, badges, and helper text
  - **CSS Changes** (sidebar.css lines 1289-1373):
    * Added `.ds160-main-section` - Blue-themed container (background: #f0f7ff, border-left: 4px solid #4A90E2)
    * Added `.ds160-partial-section` - Orange-themed container (background: #fff8f0, border-left: 4px solid #ff9800)
    * Added `.section-header-ds160` - Section header with icon styling
    * Added `.section-helper-text` - Small gray helper text below headers
    * Added `.section-badge` with `.required` and `.optional` variants
    * Added `.section-separator-or` - Horizontal divider with centered "OR" text
  - **HTML Changes** (sidebar.html lines 48-103):
    * **Main section** (blue container):
      - Header: 🎯 "Main DS-160 Data" with blue "REQUIRED" badge
      - Helper text: "Use for complete DS-160 form auto-fill with all sections"
      - Textarea preserved with same id `ds160-data`
    * **OR separator**: Horizontal line with centered "OR" text between sections
    * **Partial section** (orange container):
      - Header: 📝 "Partial JSON - Section Updates" with orange "OPTIONAL" badge
      - Helper text: "Use to fill ONLY specific sections (e.g., missing E-visa fields) without affecting existing data"
      - Textarea preserved with same id `ds160-evisa-data`
  - **Visual Result**:
    * Clear separation: Blue main section vs Orange partial section
    * Icons: 🎯 for main (target/complete form), 📝 for partial (pencil/updates)
    * Badges: "REQUIRED" (blue) vs "OPTIONAL" (orange)
    * Helper text explains when to use each field
    * "OR" separator emphasizes these are alternative workflows
  - **Impact**: Users can now immediately distinguish the two independent workflows at a glance
  - **Functionality Preserved**: All existing functionality unchanged - only visual styling enhanced
- Files updated:
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.css (lines 1289-1373)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.html (lines 48-103)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.19 → 1.20)

### Version 1.19 (October 13, 2025)
- **EDIT DATA BUTTON FIX**: Fixed Edit Data button to match independent workflow architecture
  - **Problem**: When user clicked "Edit Data" after loading full DS-160 JSON, E-visa sections automatically appeared in partial JSON field
  - **Root Cause**: Edit Data button was still using old merge-based logic that separated E-visa fields from core fields
  - **Old Behavior** (lines 1067-1097):
    * Iterated through currentData to separate E-visa fields from core fields
    * Put E-visa fields (evisaClassification, evisaBusiness, etc.) in partial JSON textarea
    * Put core fields (personal, passport, travel, etc.) in main textarea
    * User confusion: "Why is E-visa data in partial JSON field when I loaded complete JSON?"
  - **New Behavior** (lines 1067-1083):
    * Put ENTIRE currentData back into main field only (no separation)
    * Clear partial JSON field (it's independent, not derived from currentData)
    * Simple 16-line implementation vs previous 33-line separation logic
  - **Impact**: Edit Data now correctly treats partial JSON field as independent - it's only for section-specific fills, not derived from loaded data
  - **Workflow Preserved**: Two independent workflows remain intact:
    1. Main JSON → Load Data → Store as currentData → Edit Data puts back entire JSON
    2. Partial JSON → Paste directly → Auto-Fill Partial Section (never touches currentData)
- Files updated:
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.js (lines 1067-1083)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.18 → 1.19)

### Version 1.18 (October 13, 2025)
- **PARTIAL JSON AUTO-FILL FEATURE**: Added section extraction mode to enable independent partial JSON workflow
  - **Problem**: When ChatGPT forgets to extract a section (e.g., E-visa fields), paralegals must regenerate entire 1300+ line JSON (5+ minutes) instead of just the missing section (30 seconds)
  - **Root Cause**: Extension was using shallow merge that lost nested properties, and workflow required complete JSON regeneration
  - **Solution**: Eliminated merge entirely - created two independent auto-fill workflows with separate buttons
  - **Prompt Changes** (ds160_prompt_combined_v5.6.txt):
    * Added "SECTION EXTRACTION MODE (Partial JSON)" section (lines 217-280)
    * Teaches ChatGPT to extract ONLY requested sections when user asks (e.g., "extract E-visa sections only")
    * Use cases: Missing section, field updates, supplemental data, corrections
    * Single example showing E-visa section extraction with validation
    * Note at end: "This partial JSON can be pasted in the extension's 'Partial JSON' field for section-specific auto-fill"
  - **Extension Code Changes** (sidebar.js):
    * Removed complex merge logic from Load Data button (lines 738-785)
    * Simplified to single-field loading: `currentData = parsedData` (no merge)
    * Added second auto-fill button handler `ds160-fill-partial` (lines 999-1062)
    * New handler reads from `ds160-evisa-data` textarea independently
    * Both buttons send JSON directly to content script - no merging at all
  - **UI Changes** (sidebar.html):
    * Updated textarea label: "Partial JSON - Section-Specific Fill (Optional):" (line 64)
    * Updated placeholder text to clarify independent fill behavior (lines 65-84)
    * Added second button "Auto-Fill Partial Section" with id `ds160-fill-partial` (lines 131-134)
    * Renamed main button to "Auto-Fill DS-160 Form (Main Data)" for clarity (line 129)
  - **Architecture**: Two completely independent workflows:
    1. Main JSON → "Load Data" → Stores as currentData → "Auto-Fill DS-160 Form (Main Data)" button
    2. Partial JSON → Paste directly → "Auto-Fill Partial Section" button (no Load Data needed)
  - **Impact**: Paralegals can now quickly fill missing sections without affecting already-filled form fields or regenerating entire JSON
  - **Workflow Example**:
    * Upload documents to ChatGPT → Generate complete DS-160 JSON → Fill form
    * Notice E-visa section is missing
    * Ask ChatGPT: "extract E-visa sections only"
    * ChatGPT outputs partial JSON with just evisaClassification, evisaBusiness, etc.
    * Paste in Partial JSON field → Click "Auto-Fill Partial Section" → Only E-visa fields fill
- Files updated:
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/ds160_prompt_combined_v5.6.txt (lines 217-280)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.js (lines 738-785, 999-1062)
  - /Users/hugo/tomitalaw_extension/sidebar/sidebar.html (lines 64, 65-84, 129, 131-134)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/DS160_FORMATTING_STANDARDS.md (version 1.17 → 1.18)

### Version 1.17 (October 10, 2025)
- **PASSPORT RETURN PROMPT - FICTIONAL DATA REPLACEMENT**: Replaced all real case data with fictional examples to prevent data leakage and hallucination
  - **Problem #1**: Prompt used real client data (Odagiri 小田桐) as examples → privacy violation and data leakage
  - **Problem #2**: ChatGPT pattern-matched example kanji instead of extracting from worksheet → produced wrong kanji (小田切 instead of 小田桐)
  - **Root Cause**: Homophone collision - when real case surname matched example romaji, ChatGPT used example kanji from prompt instead of worksheet kanji
  - **Solution**: Complete replacement with clearly fictional but format-correct data
  - **Fictional Example Data**:
    * Name: Yamada Hanako (山田 花子) - classic Japanese "Jane Doe" equivalent
    * UID: 100000001 (clearly sequential test number)
    * Passport: TK0000001 (TK prefix not used in real Japanese passports)
    * DS-160: AA00SAMPLE (clearly example format)
    * Address: 丸の内1-1-1, 千代田区, 東京都 100-0001 (common example address in Tokyo)
    * Phone: 9012345678 (090 prefix with sequential digits)
    * Email: example@example.com
  - **Changes Made** (passport_return_prompt_v1.txt):
    * Lines 21-46: First JSON example in CRITICAL OUTPUT FORMAT
    * Lines 149, 155, 162, 175: Romaji and native name examples
    * Lines 192-215: Appointment confirmation example fields
    * Lines 219-246: Worksheet example fields
    * Lines 255-264: Phone formatting examples
    * Lines 268-278: Address formatting examples
    * Lines 287-292: Name formatting examples
    * Lines 300-345: MULTIPLE APPLICANTS family example (3 people)
    * Lines 378-418: EXAMPLE EXTRACTION section (source + output)
  - **Added Critical Kanji Extraction Warnings** (lines 166-170):
    * "Japanese kanji MUST be extracted EXACTLY from source document character-by-character"
    * "NEVER infer kanji from romaji - same pronunciation maps to different kanji (同音異字)"
    * "Example: 'Odagiri' could be 小田桐 OR 小田切 - completely different names!"
    * "Double-check: Does worksheet kanji match your JSON output exactly?"
  - **Updated Validation Checklist** (line 369):
    * Added: "✅ Native names (kanji): Character-by-character match with worksheet (NEVER infer from romaji)"
  - **Impact**:
    * Zero data leakage risk - all examples now clearly fictional
    * Prevents hallucination - examples won't collide with real case names
    * Stronger anti-homophone guidance - ChatGPT warned about 同音異字 errors
    * Character-by-character verification required before JSON output
- Files updated:
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/passport_return_prompt_v1.txt (comprehensive example data replacement + kanji warnings)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/ds160_formatting_standards.md (version 1.16 → 1.17)

### Version 1.16 (October 10, 2025)
- **MASTER PROMPT UPDATE**: Added Passport Return Delivery prompt reference to USCIS Master Prompt v5
  - **Purpose**: Integrate passport return delivery workflow into ChatGPT's multi-form USCIS routing system
  - **Changes Made** (uscis_master_prompt_v5.md):
    * Added `passport_return_prompt_v1.txt` to knowledge files list (line 53)
    * Added "Passport Return" to Critical Systems Separation section (line 60)
    * Clarifies schema: `mainApplicant` and `applicants` array structure
  - **Impact**: ChatGPT now knows to check passport_return_prompt_v1.txt for schema reference alongside DS-160 and Visa Scheduler
  - **Schema Separation**: Prevents mixing of DS-160 (personal, travel, work), Visa Scheduler (atlas_ fields), and Passport Return (mainApplicant, applicants) formats
  - **Workflow Integration**: Completes multi-form architecture for all TomitaLaw Office workflows
- Files updated:
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/main_prompts/uscis_master_prompt_v5.md (lines 53, 60)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/ds160_formatting_standards.md (version 1.15 → 1.16)

### Version 1.15 (October 10, 2025)
- **APARTMENT/ROOM NUMBER SUPPORT**: Added support for apartment/room number field in passport delivery checkout page
  - **Problem**: Worksheet has "部屋番号" (Room Number) field, but prompt wasn't extracting it and code was hardcoding street2 to empty
  - **Use Case**: When applicants have apartment/floor numbers (e.g., "301号室", "6階", "13F"), the payment page "Apartment name and room number" field should be filled
  - **Solution**: Added apartment field extraction + code mapping
  - **Prompt Changes** (passport_return_prompt_v1.txt):
    * Added `apartment` field to mainApplicant schema (optional field, line 82-86)
    * Added extraction guidance: "Worksheet '18. 住所（日本）' → 部屋番号 field"
    * Added examples: "301号室", "6階", "13F", "マンション東京 502号"
    * Updated Address Formatting section (lines 261-266) to clarify apartment extraction
    * Updated first JSON example to include apartment: "301号室" (line 29)
    * Note: Omit field if worksheet "部屋番号" is blank
  - **Code Changes** (visa-content.js line 284):
    * Changed `street2: ''` to `street2: main.apartment || ''`
    * Added comment: "Map 'apartment' → 'street2'"
  - **Behavior**:
    * When worksheet "部屋番号" has data → payment page apartment field fills
    * When worksheet "部屋番号" is blank → payment page apartment field remains empty (current behavior maintained)
    * Graceful fallback with `|| ''` prevents errors if field missing
  - **Module**: Visa Scheduling (passport return delivery feature)
- Files updated:
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/passport_return_prompt_v1.txt (lines 82-86, 29, 261-266)
  - /Users/hugo/tomitalaw_extension/content/modules/visa-content.js (line 284)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/ds160_formatting_standards.md (version 1.14 → 1.15)

### Version 1.14 (October 10, 2025)
- **NATIVE NAME SUPPORT**: Added support for both Romaji and Native (Japanese) names in passport return delivery workflow
  - **Problem**: Modal popup and payment page need DIFFERENT name formats - modal uses Romaji (for credential entry), payment page uses Native Japanese kanji/kana
  - **Root Cause**: ChatGPT prompt only extracted Romaji names (`first_name_romaji`, `last_name_romaji`), and code transformation used Romaji for payment page
  - **Solution**: Updated both prompt and code to support dual name formats
  - **Prompt Changes** (passport_return_prompt_v1.txt):
    * Added `first_name_native` and `last_name_native` field definitions (lines 149-161)
    * Added field usage notes: "Romaji for modal popup, Native for payment/checkout page"
    * Added examples for Japanese kanji/kana names (e.g., "小田切" Odagiri, "大次郎" Daijiro, "花子" Hanako)
    * Added note for non-Japanese applicants: "omit this field or use same as romaji"
    * Updated all JSON examples (lines 32-42, 295-327, 376-400) to include native name fields
  - **Code Changes** (visa-content.js lines 276-278):
    * Changed `name_first` to use `applicant.first_name_native || applicant.first_name_romaji || ''`
    * Changed `name_last` to use `applicant.last_name_native || applicant.last_name_romaji || ''`
    * Added comment: "use native names for payment page, fallback to romaji"
  - **Fallback Strategy**: If native names missing (e.g., non-Japanese applicant), automatically falls back to Romaji
  - **Impact**:
    * Modal popup correctly uses Romaji for credential entry (Passport#, DS-160, UID, "Odagiri", "Daijiro")
    * Payment page correctly uses Native names (First Name: "大次郎", Last Name: "小田切")
    * Non-Japanese applicants gracefully fall back to Romaji for both pages
  - **Module**: Visa Scheduling (passport return delivery feature)
- Files updated:
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/passport_return_prompt_v1.txt (lines 149-161, 32-42, 295-327, 376-400)
  - /Users/hugo/tomitalaw_extension/content/modules/visa-content.js (lines 276-278)
  - /Users/hugo/tomitalaw_extension/prompts_and_templates/form_prompts/ds160_formatting_standards.md (version 1.13 → 1.14)

### Version 1.13 (October 10, 2025)
- **PASSPORT DELIVERY CHECKOUT PAGE**: Added support for passport delivery checkout/payment page with data transformation
  - **Problem #1**: Checkout page at `https://pds.ayobaspremium.jp/ap/kmjcheckout` was not filling - page detection returned 'unknown'
  - **Problem #2**: After initial fix, only postal_code/region/city/phone filled - names and address line 1 were empty
  - **Root Cause #1**: Page detection logic only checked for `/delivery_address`, `/choose_interview_loc`, and `/` paths - missed `/ap/kmjcheckout`
  - **Root Cause #2**: Data structure mismatch - passport return has `first_name_romaji`/`last_name_romaji` in applicants[0] and `address` in mainApplicant, but payment page expects `name_first`/`name_last` and `street`
  - **Solution**: Added detection + data transformation before calling `fillPaymentPage()`
  - **Code Changes**:
    - detectPageType() (line 96-98): Added condition `path.includes('kmjcheckout')` → returns `'passport_delivery_checkout'`
    - fillForm() switch (lines 268-293): Added case for `'passport_delivery_checkout'` with data transformation:
      ```javascript
      const transformedData = {
        name_first: applicants[0].first_name_romaji,
        name_last: applicants[0].last_name_romaji,
        postal_code: mainApplicant.postal_code,
        region: mainApplicant.region,
        city: mainApplicant.city,
        street: mainApplicant.address,  // Map 'address' → 'street'
        street2: '',
        phone: mainApplicant.phone,
        email: mainApplicant.email
      };
      ```
  - **Fields Filled**: name_first, name_last, postal_code, region, city, street, phone (email/reemail skipped per payment page logic, chbx_confirm auto-checked)
  - **Impact**: Completes 4-page passport delivery workflow (UID → Interview Location → Delivery Address → Checkout Payment)
  - **Module**: Visa Scheduling (passport return delivery feature)
- Files updated: /Users/hugo/tomitalaw_extension/content/modules/visa-content.js (lines 96-98, 268-293)

### Version 1.12 (October 10, 2025)
- **PASSPORT DELIVERY FIX**: Fixed field position mismatch in passport delivery modal filling
  - **Problem**: Modal fields were being filled in wrong positions - Last name field showed "Daijiro" (first name value), First name field was empty
  - **Root Cause**: Hidden `type="text"` input field was being counted by selector but wasn't visible on screen, throwing off position indexing (6 inputs counted instead of 5 visible)
  - **Solution**: Filter input selector to only visible inputs using `offsetParent !== null` check
  - **Code Change** (visa-content.js line 620 in fillApplicantFields function):
    ```javascript
    // Before:
    const inputs = document.querySelectorAll('#dialog_shopping input[type="text"]:not([type="hidden"])');

    // After:
    const inputs = Array.from(document.querySelectorAll('#dialog_shopping input[type="text"]:not([type="hidden"])')).filter(input => input.offsetParent !== null);
    ```
  - **Impact**: Passport delivery modal now correctly fills all 5 fields per applicant (Passport#, DS-160, UID, Last name, First name) in proper positions
  - **Module**: Visa Scheduling (passport return delivery feature)
- File updated: /Users/hugo/tomitalaw_extension/content/modules/visa-content.js (line 620)

### Version 1.11 (October 10, 2025)
- **E-VISA INLINE COMMENTS**: Added source mapping guidance for worksheet-fillable E-visa sections
  - **Problem**: ChatGPT unable to fill E-visa fields using only biographical worksheet (no DS-156E form/corporate docs)
  - **Solution**: Added comprehensive inline comments with source mappings to 3 worksheet-fillable sections
  - **evisaClassification** (lines 571-576):
    * treatyCountry: "Extract from personal.nationality"
    * principalName: "Use personal.surname and personal.givenName"
    * User provides: visaType (E1/E2), principalApplicant status (true/false)
  - **evisaApplicationContact** (line 627):
    * officer.position: "Extract from presentEmployer.jobTitle (e.g., CEO, President, Manager)"
  - **evisaApplicantPosition** (lines 746-767):
    * Comprehensive mappings for all fields to presentEmployer.* and education.institutions[most recent].*
    * Added fallback: presentPosition uses presentEmployer.duties if DS-156E Section 18 missing
    * Added calculation: yearsWithEmployer = calculate from startDate to current date
  - **Header added** (lines 566-570): User provides visa type/applicant type in chat, extract other fields from worksheet
  - **Impact**: ChatGPT can now correctly fill 3 E-visa sections using worksheet data with proper fallback strategies
- Files updated: ds160_prompt_combined_v5.6.txt (lines 566-767), DS160_FORMATTING_STANDARDS.md (version 1.10 → 1.11)

### Version 1.10 (October 8, 2025)
- **DATA CONSISTENCY VALIDATION FOR RENEWALS**: Added automatic conflict detection for renewal cases
  - **Problem**: Need to flag when immutable fields change or historical facts are altered between old DS-160 and renewal worksheet
  - **Solution**: Added "DATA CONSISTENCY" subsection to analysis template in uscis_master_prompt_v5.md
  - **Two categories**:
    * **CONFLICT**: Immutable fields that changed (dateOfBirth, cityOfBirth, countryOfBirth, gender) or booleans that reverted true→false (visaRefused, estaDenied, immigrantPetition, security.*)
    * **CHANGE**: Legitimate updates to track (maritalStatus, otherNames[], address, visits[], employer changes) - informational only
  - **Impact**: ChatGPT will now automatically compare old DS-160 vs renewal and flag conflicts in analysis section
- **SECURITY QUESTION AUTO-FLAGGING**: Added automatic flagging for security questions answered "Yes"
  - **Problem**: Security questions with "Yes" answers need immediate manual review and explanation
  - **Solution**: Added "SECURITY QUESTIONS FLAGGED" subsection to analysis template (line 118-119)
  - **Impact**: ChatGPT will automatically flag ANY security question answered "Yes" for review
- **LOGICAL INCONSISTENCY DETECTION**: Added automatic detection of logical conflicts within application data
  - **Problem**: Need to flag logical inconsistencies that suggest missing or incorrect information
  - **Solution**: Added "LOGICAL INCONSISTENCIES" subsection to analysis template (lines 124-127)
  - **Three checks**:
    * Married but no maiden/other name for applicant or spouse
    * U.S. education history but no visa record
    * U.S. work experience but no SSN
  - **Impact**: ChatGPT will automatically flag these logical inconsistencies in ALL applications (new and renewal)
- **Character budget**: Added 614 chars total (6,064 → 6,678), staying well under 8,000 char limit
- Updated files:
  - uscis_master_prompt_v5.md (added DATA CONSISTENCY lines 129-132, SECURITY QUESTIONS lines 118-119, LOGICAL INCONSISTENCIES lines 124-127)
  - DS160_FORMATTING_STANDARDS.md (version 1.9 → 1.10, added this changelog)

### Version 1.9 (October 8, 2025)
- **REFERENCE INFORMATION INLINE COMMENTS**: Added inline schema comments for two critical reference information rules to prevent ChatGPT from forgetting them
  - **Problem**: Two important rules from "Reference Information Not Included in Worksheet" section needed to be added as inline comments in schema for better ChatGPT adherence
  - **E Principal Clarification** (Line 253-257):
    * Added inline comment: "CRITICAL: Enter person who MOST RECENTLY obtained an E visa"
    * Visa must be ISSUED (physically in passport), not just interviewed
    * Person doesn't need to have traveled to US yet
    * If multiple E visa holders exist, use the one with latest visa issue date
  - **Renewal Phone/Email Logic** (Lines 359-365):
    * **additionalEmails field**: Added inline comment for renewals - "Include primary email from old DS-160 as additional email (old primary email becomes 'other email used in past 5 years' in renewal)"
    * **NEW otherPhones field**: Created new array field with inline comment - "Include primary phone from old DS-160 as other phone (old primary phone becomes 'other phone used in past 5 years' in renewal)"
    * Format guidance included: No dashes/spaces/parens. US: 1 prefix, no +. Japan: +81, drop leading 0. Other: + with country code
  - **Why Inline Comments**: Schema-level reminders ensure ChatGPT sees the rules when generating JSON, not just in section-level documentation
  - **Pattern**: Similar to previousEmployers "CRITICAL: FOR RENEWALS..." comment approach - keeps important logic at field definition level
- Updated files:
  - ds160_prompt_combined_v5.6.txt (added 3 inline comments, created otherPhones field)
  - DS160_FORMATTING_STANDARDS.md (version 1.8 → 1.9, added this changelog)

### Version 1.8 (October 8, 2025)
- **PASSPORT ISSUANCE LOCATION GUIDANCE**: Added comprehensive rules for Japanese passport issuance fields
  - **Problem**: No guidance on how to fill issueCity, issueState, issueCountry for Japanese passports stating "Ministry of Foreign Affairs" vs embassy/consulate issued
  - **New Section 8** (Lines 170-187): Passport Issuance Location (Japanese Passports)
    * **Ministry of Foreign Affairs scenario**: issueCity: "Tokyo", issueState: "Tokyo", issueCountry: "JPN" (Tokyo is both city and prefecture)
    * **Embassy/consulate abroad scenario**: Use exact location from passport (e.g., Los Angeles, California, USA)
    * **All 3 fields must be filled**: issueCity, issueState, issueCountry
  - **Updated Schema Field Descriptions** (Lines 360-363):
    * issuingAuthority: Added clarification "passport holder's nationality"
    * issueCountry: Added clarification "WHERE passport was physically issued"
    * issueCity: Added guidance "(use 'Tokyo' for Japanese Ministry of Foreign Affairs)"
    * issueState: Added guidance "(use 'Tokyo' for Japanese Ministry of Foreign Affairs)"
  - **JSON Example Verified Correct** (Line 1099):
    * `"issueState": "Tokyo"` ✅
    * Tokyo is both a city AND a prefecture (Tokyo-to), so issueState correctly uses "Tokyo"
  - **Key Rule**: Ministry of Foreign Affairs = issueCity: "Tokyo", issueState: "Tokyo" (Tokyo is both city and prefecture). Embassy/consulate = use exact location from passport.
- Updated files:
  - ds160_prompt_combined_v5.6.txt (added Section 8, updated schema descriptions, fixed JSON example)
  - DS160_FORMATTING_STANDARDS.md (version 1.7 → 1.8, added this changelog)

### Version 1.7 (October 8, 2025)
- **U.S. ADDRESS FORMATTING ADDITIONS**: Added comprehensive US street address abbreviation rules
  - **Problem**: v5.6 had no guidance on US street type abbreviations, directional abbreviations, or state name formatting
  - **New Section 4.5** (Lines 72-96): U.S. Street Address Abbreviations
    * **Directional Abbreviations**: North → N., South → S., West → W., East → E.
    * **Street Type Abbreviations**: Avenue → Ave., Boulevard → Blvd., Street → St., Road → Rd., Lane → Ln., Highway → Hwy., Circle → Cir.
    * **State Names**: Spell out in FULL (California, not CA; New York, not NY; Texas, not TX)
    * **Complete Example**: "11835 West Olympic Boulevard, Suite 355E, Los Angeles, CA 90064" → "11835 W. Olympic Blvd.", "STE.355E", "Los Angeles", "California", "90064"
  - **Fixed All US Address Examples in JSON**:
    * "Wilshire Boulevard" → "Wilshire Blvd." (4 instances at lines 937, 960, 1210, 1239)
    * "Century Boulevard" → "Century Blvd." (1 instance at line 1064)
    * "CA" → "California" (8 instances: usState, state, incorporationState fields throughout JSON examples)
    * Attorney address already correctly abbreviated: "11835 W OLYMPIC BLVD"
  - **Format Requirements**:
    * ALL US addresses must use abbreviated street types with periods
    * ALL US addresses must use abbreviated directional words with periods
    * ALL US state fields must use full state name, never 2-letter abbreviations
  - **Impact**: Ensures DS-160 compliance with US Postal Service standards for domestic addresses
- Updated files:
  - ds160_prompt_combined_v5.6.txt (added Section 4.5, fixed all US address examples)
  - DS160_FORMATTING_STANDARDS.md (version 1.6 → 1.7, added this changelog)

### Version 1.6 (October 8, 2025)
- **JAPANESE ADDRESS FORMATTING FIX**: Corrected Japanese address formatting rules to comply with U.S. Consulate standards
  - **Problem**: v5.5 was removing ALL Japanese administrative suffixes (-shi, -ku, -cho, -gun), violating U.S. Consulate formatting
  - **Correct Standard (U.S. Consulate)**:
    * **REMOVE** only from City/State fields: -shi (city), -ken/-fu/-to (prefecture)
    * **KEEP** in Street Address: -ku (ward), -cho/-machi (town), -gun (county)
    * **Building names**: Move to apartment field (APT. format), not in street address
  - **Section 6 Rewrite** (Lines 90-115):
    * Renamed section: "Japanese Address Suffixes" → "Japanese Address Formatting"
    * Clarified what to REMOVE: Only -shi from city, -ken/-fu/-to from prefecture
    * Clarified what to KEEP: -ku, -cho, -gun in street address
    * Added Building/Apartment handling instructions
    * Added Format Structure template for consistency
  - **Added Two Concrete Examples** (Lines 117-137):
    * **Example 1**: Osaka double-name handling (Osaka-fu, Osaka-shi) → both become "OSAKA"
    * **Example 2**: Hokkaido (no prefecture suffix) + Sapporo-shi
    * Both examples show -ku KEPT in street address: "2-11-5 NISHITENMA, KITA-KU"
    * Both examples show building names omitted from street
  - **Fixed All 6 JSON Examples**:
    1. **contact address** (Lines 994-1000): homeStreet includes ward, city is Tokyo not Minato
    2. **mailingAddress** (Lines 1002-1009): street includes ward, city is Tokyo not Chiyoda
    3. **presentEmployer** (Lines 1109-1118): address includes ward in street1
    4. **previousEmployers** (Lines 1127-1137): address includes ward, city is Tokyo
    5. **education/institutions** (Lines 1149-1158): street includes ward, city is Tokyo not Bunkyo
    6. **payerInfo** (Lines 917-930): street includes ward, city is Tokyo not Shibuya
  - **Format Structure**:
    * homeStreet: "[number-number-number] [street name], [ward/district]"
    * homeCity: "[city name without -shi]"
    * homeState: "[prefecture without -ken/-fu/-to]"
    * homePostalCode: "[xxx-xxxx with hyphen]"
  - **Key Changes**:
    * Ward (-ku) now KEPT in street address, not removed
    * City field gets actual city name (Tokyo, Osaka, Sapporo), not ward name
    * Building names extracted to apartment field
    * Examples corrected to reflect proper hierarchy: ward within city within prefecture
- Updated files:
  - ds160_prompt_combined_v5.6.txt (created from v5.5 with Japanese address fixes)
  - DS160_FORMATTING_STANDARDS.md (version 1.5 → 1.6, added this changelog)

### Version 1.5 (October 7, 2025)
- **WORKFLOW FIX**: Added employment transfer logic and renewal analysis summary for visa renewal cases
  - **Problem**: When processing renewals where employment changed, ChatGPT was omitting old employer from previousEmployers array
  - **Root Cause #1**: Prompt said "REPLACE all fields" without distinguishing single-value vs array fields
  - **Root Cause #2**: No explicit instruction to move old presentEmployer → previousEmployers
  - **Solution**: Three-part fix in "VISA RENEWAL SCENARIOS" section:
    1. **Processing Rules** (Section 2): Clear field update logic - REPLACE single-value, APPEND arrays, use newest booleans
    2. **Employment Changes** (Section 3): Move old presentEmployer → previousEmployers when employment changes
    3. **Intra-Company Transfer Detection** (Section 4): Detect foreign employer by country code → move to previousEmployers
    4. **Inline Schema Comments**: Added CRITICAL instructions directly in presentEmployer.name and previousEmployers field definitions
  - **Processing Logic**:
    * **Single-value fields**: REPLACE (passport, address, salary, presentEmployer, phones)
    * **Array fields**: APPEND (previousEmployers, visits, emails, education)
    * **Boolean fields**: Use newest value
  - **Employment Transfer Logic**:
    * Move old DS-160's presentEmployer → previousEmployers array
    * Extract new presentEmployer from renewal worksheet/documents
    * Preserve any previousEmployers from old DS-160 (append, don't replace)
    * Sort previousEmployers chronologically (oldest first)
    * **Detection**: If presentEmployer country ≠ USA (e.g., JPN, GBR), treat as foreign office transfer
    * **Sources**: evisaApplicantPosition (E-visa), old presentEmployer, support letters
  - **Impact**: Fixes all intra-company transfer cases (E-2, L-1, H-1B, O-1, etc.) + preserves all array history
  - **Example**: E-2 renewal - NISSIN FOOD PRODUCTS (JPN) → previousEmployers, NISSIN FOODS USA → presentEmployer
- **Renewal Analysis Summary**: Added "RENEWAL CHANGES SUMMARY" section to analysis output template
  - Lists modified fields (old → new values)
  - Lists appended arrays (new items added)
  - Lists preserved data from original DS-160
  - Helps paralegals quickly verify renewal processing logic
- Updated files:
  - ds160_prompt_combined_v7_reversed.txt (lines 488-519: processing rules, employment changes, transfer detection, inline comments at 799, 816)
  - ds160_prompt_combined_v5.5.txt (lines 16-46: processing rules, employment changes, transfer detection, inline comments at 330, 347)
  - uscis_master_prompt_v5.md (lines 113-116: added renewal changes summary to analysis template)

### Version 1.4 (October 7, 2025)
- **CRITICAL FIX**: Corrected spouse schema field names to match extension code (ds160-content.js)
  - **Root Cause**: Prompts were teaching ChatGPT WRONG field names that extension doesn't recognize
  - **Extension expects**: `spouse.city`, `spouse.birthState`, `spouse.country`
  - **Prompts incorrectly had**: `spouse.cityOfBirth`, `spouse.birthState`, `spouse.countryOfBirth`
  - **Impact**: ChatGPT outputs were actually CORRECT for extension but "wrong" according to prompt
- Updated files:
  - ds160_prompt_combined_v7_reversed.txt (lines 764-766, added family example in STRUCTURE EXAMPLE section)
  - ds160_prompt_combined_v5.5.txt (lines 299, 301, 1048, 1050)
  - DS160_FORMATTING_STANDARDS.md (Section 6.2: inverted correct/wrong guidance, Section 6.3: updated examples)
- Note: ds160_prompt_combined_v5.txt already had correct field names

### Version 1.3 (October 6, 2025)
- **USABILITY FIX**: Improved audit report formatting in v7_reversed for better readability
  - **Timeline format**: Added concrete example with proper column spacing to prevent cramped output
    - Shows alignment for FROM DATE, TO DATE, CATEGORY, LOCATION, ACTIVITY/INSTITUTION columns
    - Example includes education and employment entries for ChatGPT reference
    - Prevents cramped output like "04/01/1982 03/31/1985 EDUCATION Ome, Tokyo (JPN) Fukiage..."
  - **Bold formatting**: Added bold to key terms in missing data sections for easier paralegal scanning
    - MISSING CRITICAL DATA: Item labels now bolded (e.g., **Passport number**: Not found...)
    - INCONSISTENCIES TO VERIFY: Issue labels now bolded (e.g., **Employment gap (1993-2003)**: University...)
    - GAPS/EXPLANATIONS NEEDED: Gap descriptions now bolded (e.g., **SSN exists but no employment**: How obtained?)
    - Applies to both general template (lines 246-254) and concrete example (lines 278-288)
- File updated: ds160_prompt_combined_v7_reversed.txt
- Added `presentEmployer` clarification (Section 9.9) to prevent confusion between current employer vs applying to
  - Updated field descriptions in v5.5 (line 317) and v7_reversed (line 777)

### Version 1.2 (October 6, 2025)
- **CRITICAL FIX**: Corrected spouse maiden name format to remove parentheses
  - **Reason**: DS-160 website does NOT allow parentheses in surname field
  - **Old format**: `YAMAMOTO (MAIDEN NAME TANAKA)` ❌
  - **New format**: `YAMAMOTO MAIDEN NAME TANAKA` ✅
- Updated across all files:
  - ds160_prompt_combined_v5.5.txt (4 locations)
  - ds160_prompt_combined_v7_reversed.txt (3 locations)
  - DS160_FORMATTING_STANDARDS.md (4 locations + examples)

### Version 1.1 (October 6, 2025)
- Created `ds160_prompt_combined_v5.5.txt`
- Applied all v7_reversed formatting improvements and schema updates to v5 base
- Added comprehensive formatting rules section (7 rules):
  - Company names (no punctuation)
  - Phone numbers (US/Japan/international formats)
  - Street address format (building number first)
  - USPS secondary unit designators (24 total)
  - Japanese address suffix removal
  - Spouse maiden name format
- Updated JSON schema:
  - Added phone formatting instructions to all 13 phone fields
  - Updated spouse schema (NOTE: This incorrectly introduced cityOfBirth/countryOfBirth - fixed in v1.4)
  - Made passport fields optional when not in documents
  - Added "Extract ALL" instructions to array field comments
  - Expanded array structure details for previousEmployers and education.institutions
  - Added "round to nearest whole number" to monthlyIncome fields
  - Added detailed comments for evisaApplicationContact officer vs contact roles
- Fixed evisaForeignBusiness.parentBusiness.phone field (was missing formatting instructions)
- Updated example to demonstrate all new formatting rules

### Version 1.0 (October 2025)
- Initial creation
- Consolidated all DS-160 formatting rules
- Added comprehensive examples
- Created USPS designator complete table
- Added Japanese address handling
- Added spouse formatting rules
- Added complete JSON examples

---

## References

- USPS Publication 28: [https://pe.usps.com/text/pub28/welcome.htm](https://pe.usps.com/text/pub28/welcome.htm)
- DS-160 Form: [https://ceac.state.gov/genniv/](https://ceac.state.gov/genniv/)
- Extension Field Mappings: `/content/modules/ds160-content.js`
- Prompt Files:
  - v7 Reversed (current production): `/prompts_and_templates/form_prompts/ds160_prompt_combined_v7_reversed.txt`
  - v5.5 (v5 + formatting improvements): `/prompts_and_templates/form_prompts/ds160_prompt_combined_v5.5.txt`
  - v5 (hybrid extraction): `/prompts_and_templates/form_prompts/ds160_prompt_combined_v5.txt`

---

**END OF DOCUMENT**

### Version 1.27 (October 13, 2025)
- **L1A AND L1B TEMPLATE ENHANCEMENT**: Added critical instructions to prevent background history compression in both L1A Manager and L1B Specialized Knowledge templates
  - **Context**: Both templates had detailed background history examples but were MISSING the critical instruction that explicitly prohibits compression
  - **Issue Identified**: Same pattern as E2 Executive before v1.23 fix - examples present but no explicit anti-compression instruction
  - **Root Cause**: ChatGPT follows instructions more than examples - without explicit "each 2-6 year period requires its own detailed paragraph" instruction, ChatGPT might ignore detailed examples and produce compressed output
  - **Analysis Results**:
    * **L1A Manager Template**: ✅ Had 5-period example (Mr. Eirai) BUT ❌ Missing critical instruction
    * **L1B Template**: ✅ Had 4-period example (Mr. Manago with $5M/$8.5M quantified achievements) BUT ❌ Missing critical instruction
  - **Solution Implemented**: Added identical critical instruction to both templates (same wording as E2 templates):
    * **L1A Manager** (line 513): "🚨 CRITICAL: Each distinct position/role period (typically 2-6 years) requires its own detailed paragraph. DO NOT condense or group multiple positions into summary paragraphs. See detailed examples below for required level of detail."
    * **L1B Template** (line 638): Same critical instruction added
  - **Placement**: Both added after "### Formatting Standards" header, before existing preface text (consistent with E2 Executive/Essential Skills pattern)
  - **Impact**: All 5 immigration letter templates now have consistent protection against background history compression
  - **Template Consistency Table After Fix**:
    | Template | Critical Instruction | Detailed Examples | Status |
    |----------|---------------------|-------------------|---------|
    | E2 Manager | ✅ (line 671) | ✅ (7 paragraphs) | ✅ Protected |
    | E2 Executive | ✅ (line 528, v1.23) | ✅ (5 paragraphs) | ✅ Protected |
    | E2 Essential Skills | ✅ (line 456, v1.24) | ✅ (7 paragraphs, v1.26) | ✅ Protected |
    | **L1A Manager** | ✅ (line 513, v1.27) | ✅ (5 periods) | ✅ Protected |
    | **L1B Specialized Knowledge** | ✅ (line 638, v1.27) | ✅ (4 periods) | ✅ Protected |
  - **Result**: Both instructions AND examples now work together to prevent ChatGPT from producing 200-300 word summaries instead of 800-1200 word detailed background histories
- Files updated:
  - l1a_manager_application_template.md (line 513)
  - l1b_blanket_application_template.md (line 638)
- Template consistency: All 5 templates (E2 Manager, E2 Executive, E2 Essential Skills, L1A Manager, L1B Specialized Knowledge) now have explicit anti-compression instructions paired with detailed examples

### Version 1.26 (October 13, 2025)
- **E2 ESSENTIAL SKILLS TEMPLATE ENHANCEMENT**: Added detailed 7-paragraph background history example to support critical instruction
  - **Context**: Version 1.24 added critical instruction at line 456 stating "See detailed examples below for required level of detail," but NO detailed multi-paragraph examples existed
  - **User Discovery**: User identified gap - "but the essential skills template doesn't have a detailed example like the e2 manager?"
  - **Problem**: Critical instruction referenced non-existent examples, risking background history compression despite the warning
  - **Solution**: Created comprehensive 7-paragraph fictional example (lines 482-498)
  - **Example Character**: Ms. Yuki Kobayashi - Marketing and Business Development Professional
  - **Career Timeline**: April 1999 - Present (25 years of progression)
  - **Example Structure**:
    * 7 employment periods showing clear progression: Marketing Coordinator → Senior Marketing Specialist → Marketing Manager → Deputy Director → Director → Senior Director → Vice President
    * Each paragraph: Dates, title, company, responsibilities, team sizes (3→8→15→22→45→75 staff), revenue figures (3.2B→67B→127B yen), achievements
    * Fictional companies: Global Electronics Corporation, Pacific Industries Limited, Summit Technology Corporation, Zenith Industries International
    * Proper format: "From [month year] to [month year], [Name] held the position of..."
  - **Placement**: After existing short metric snippets (line 480), before "## Content Development Strategy" section
  - **Decision**: Only added background history example (not opening/employer/education examples) because other sections already have specific placeholder templates with low variation
  - **Impact**: E2 Essential Skills template now matches pattern of E2 Manager and E2 Executive templates - critical instruction at line 456 correctly references detailed examples that now exist
  - **Result**: All three E2 templates (Manager, Executive, Essential Skills) now have consistent protection against background history compression with both explicit instructions AND detailed examples
- File updated: e2_essential_skills_template.md (lines 482-498)
- Template consistency: Critical instruction (line 456) + Detailed 7-paragraph example (lines 482-498) = Complete anti-compression protection

### Version 1.5 (October 13, 2025)
- **CRITICAL DATA PRIVACY FIX**: Replaced all real client data in E2 Manager Template with fictional examples
  - **Real client removed**: Mr. Koji Ugajin (Isuzu Corporation case)
  - **Fictional replacement**: Mr. Tanaka (Horizon Electronics Manufacturing Corporation)
  - **Examples replaced**: 
    - Lines 764-783: Background history examples (7 employment periods)
    - Lines 247-258: U.S. Employer format example 
    - Line 671: Reference to "Ugajin-style" changed to "detailed manufacturing examples"
    - Lines 786-789: "WRONG" examples updated with fictional data
  - **Data removed**: Real company (Isuzu, INAC), real school (Kanto Daiichi High School), real projects ("700 Project", "VC60 Project"), real facility (South Carolina Plant), real career dates (1998-2025), real team sizes (25/100/700)
  - **Fictional data created**: Mr. Tanaka at Horizon Electronics, Sakura Technical High School, "Phoenix Initiative" and "Apex System Upgrade" projects, different dates (2000-2027), different team sizes (20/85/600)
  - **Company example replaced**: GlobalTech Industries Corporation (GTI) with North Carolina facility investment ($195M) replacing real Isuzu/INAC data
- File updated: e2_manager_template.md (lines 671, 764-793, 247-258)
- Result: Zero data leakage risk - all examples now use completely fictional but equally detailed sample data

