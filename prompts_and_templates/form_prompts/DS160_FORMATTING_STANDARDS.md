# DS-160 Data Formatting Standards

**Version:** 1.10
**Last Updated:** October 8, 2025
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
