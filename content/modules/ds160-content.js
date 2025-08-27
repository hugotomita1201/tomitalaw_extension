// Fixed Two-Pass DS-160 Auto-Filler with Complete Field Support
// Properly handles all Personal Page 1 & 2 fields including gender dropdown, marital status, birth location, telecode

console.log('DS-160 Two-Pass Auto-Filler (Complete Field Support) loaded');

// Simple configuration
const CONFIG = {
  fillDelay: 100,
  passDelay: 3500,  // Increased to allow dynamic petition field to load
  maxPasses: 2,  // Reduced from 3 to prevent aggressive re-filling
};

class TwoPassFiller {
  constructor() {
    this.filledFields = new Set();
    this.currentData = null;
    this.debugLog = [];  // Store logs in memory
    this.startPersistentLogging();  // Start saving logs to localStorage
  }
  
  // Persistent logging system that survives page crashes
  startPersistentLogging() {
    // Save logs to localStorage every 500ms
    setInterval(() => {
      if (this.debugLog.length > 0) {
        try {
          // Get existing logs
          const existingLogs = JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]');
          // Append new logs
          const allLogs = [...existingLogs, ...this.debugLog];
          // Keep only last 500 entries to prevent overflow
          const trimmedLogs = allLogs.slice(-500);
          // Save to localStorage
          localStorage.setItem('ds160_debug_logs', JSON.stringify(trimmedLogs));
          localStorage.setItem('ds160_last_log_time', new Date().toISOString());
          // Clear buffer
          this.debugLog = [];
        } catch (e) {
          console.error('Failed to save debug logs:', e);
        }
      }
    }, 500);
  }
  
  // Enhanced logging that saves to both console and localStorage
  log(message, data = null) {
    // Simplified logging - only log errors and critical messages
    if (message.includes('ERROR') || message.includes('CRASH')) {
      console.error(`[DS160] ${message}`, data || '');
    }
    
    // Store in buffer for crash recovery
    const timestamp = new Date().toISOString();
    this.debugLog.push({
      time: timestamp,
      message: message,
      data: data,
      url: window.location.href
    });
  }
  
  // Method to retrieve and display crash logs
  static showCrashLogs() {
    const logs = JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]');
    const lastTime = localStorage.getItem('ds160_last_log_time');
    
    console.log('=== DS-160 CRASH LOGS ===');
    console.log(`Last log time: ${lastTime}`);
    console.log(`Total logs: ${logs.length}`);
    
    // Show last 50 logs before crash
    const recentLogs = logs.slice(-50);
    recentLogs.forEach(log => {
      console.log(`[${log.time}] [${log.page}] ${log.message}`, log.data || '');
    });
    
    console.log('=== END CRASH LOGS ===');
    console.log('To clear logs, run: localStorage.removeItem("ds160_debug_logs")');
    
    return logs;
  }
  
  // Clear stored logs
  static clearLogs() {
    localStorage.removeItem('ds160_debug_logs');
    localStorage.removeItem('ds160_last_log_time');
    console.log('Debug logs cleared');
  }

  // Check if a field belongs to the current page
  isFieldOnCurrentPage(fieldId, currentPage) {
    // Page-specific field prefixes
    const pageFieldPatterns = {
      'personal1': [
        'tbxAPP_SURNAME', 'tbxAPP_GIVEN_NAME', 'tbxAPP_FULL_NAME_NATIVE',
        'ddlAPP_GENDER', 'ddlAPP_MARITAL_STATUS', 'tbxAPP_POB',
        'DListAlias', 'ddlDOBDay', 'ddlDOBMonth', 'tbxDOBYear'
      ],
      'personal2': [
        'ddlAPP_NATL', 'ddlOtherNationality', 'tbxAPP_NATIONAL_ID',
        'tbxAPP_SSN', 'tbxAPP_TAX_ID'
      ],
      'travel': [
        'ddlPurposeOfTrip', 'tbxSpecificTravel', 'tbxIntendedArrivalDate',
        'tbxTRAVEL_LOS', 'tbxArriveFlight', 'tbxDepartFlight',
        'tbxWhoIsPaying', 'tbxPayerAddress', 'tbxPayerTel',
        'tbxPrincipleApp', 'tbxMissionOrg'
      ],
      'travelCompanions': [
        'rblTravelingWithYou', 'dtlTravelingWithYou', 'rblGroupTravel'
      ],
      'previousTravel': [
        'rblPREV_US_TRAVEL', 'dtlPREV_US_VISIT', 'dtlUS_DRIVER_LICENSE',
        'PREV_VISA', 'rblPREV_VISA_REFUSED', 'tbxPREV_VISA_REFUSED_EXPL'
      ],
      'addressPhone': [
        'tbxAPP_ADDR_LN1', 'tbxAPP_ADDR_LN2', 'tbxAPP_ADDR_CITY',
        'ddlAPP_ADDR_STATE', 'tbxAPP_ADDR_POSTAL_CD', 'ddlAPP_ADDR_CNTRY',
        'tbxAPP_HOME_TEL', 'tbxAPP_MOBILE_TEL', 'tbxAPP_BUS_TEL',
        'tbxAPP_EMAIL', 'tbxAPP_HOME_ADDR'
      ],
      'contact': [
        'rblAddSocial', 'dtlSocial', 'tbxSocialMediaIdent', 'ddlSocialMediaProvider'
      ],
      'usContact': [
        'tbxUS_POC_SURNAME', 'tbxUS_POC_GIVEN_NAME', 'tbxUS_POC_ORGANIZATION',
        'ddlUS_POC_REL_TO_APP', 'tbxUS_POC_ADDR_LN1', 'tbxUS_POC_ADDR_CITY',
        'ddlUS_POC_ADDR_STATE', 'tbxUS_POC_ADDR_POSTAL_CD', 'tbxUS_POC_TEL',
        'tbxUS_POC_EMAIL'
      ],
      'passport': [
        'ddlPPT_TYPE', 'tbxPPT_NUM', 'tbxPPT_BOOK_NUM', 'ddlPPT_ISSUED_CNTRY',
        'tbxPPT_ISSUED_IN_CITY', 'tbxPPT_ISSUED_IN_STATE', 'ddlPPT_ISSUED_IN_CNTRY',
        'ddlPPT_ISSUED_DTEDay', 'ddlPPT_ISSUED_DTEMonth', 'tbxPPT_ISSUED_DTEYear',
        'ddlPPT_EXPIRE_DTEDay', 'ddlPPT_EXPIRE_DTEMonth', 'tbxPPT_EXPIRE_DTEYear',
        'rblLOST_PPT', 'tbxLOST_PPT_NUM', 'ddlLOST_PPT_CNTRY'
      ],
      'family': [
        'tbxFATHER_SURNAME', 'tbxFATHER_GIVEN_NAME', 'ddlFathersDOBDay',
        'tbxMOTHER_SURNAME', 'tbxMOTHER_GIVEN_NAME', 'ddlMothersDOBDay',
        'rblUS_IMMED_RELATIVE', 'ddlUS_IMMED_RELATIVE_TYPE',
        'rblUS_OTHER_RELATIVE', 'rblSPOUSE_IND',
        'tbxSpouseSurname', 'tbxSpouseGivenName', 'ddlSpouseDOBDay',
        'ddlSpouseNatl', 'tbxSpousePOBCity', 'ddlSpousePOBCountry',
        'ddlSpouseAddressType', 'tbxSpouseAddress'
      ],
      'workEducation': [
        'ddlPresentOccupation', 'tbxEmpSchName', 'tbxEmpSchAddr1',
        'tbxEmpSchAddr2', 'tbxEmpSchCity', 'ddlEmpSchState',
        'tbxEmpSchPostalCd', 'ddlEmpSchCountry', 'tbxEmpSchTel',
        'tbxCURR_MONTHLY_SALARY', 'ddlCURR_MONTHLY_SALARY_CURRENCY',
        'tbxDescribeDuties'
      ],
      'workEducationPrevious': [
        'dtlPrevEmpl', 'dtlPrevEduc', 'tbEmployerName', 'tbEmployerStreetAddress1',
        'tbEmployerCity', 'ddlEmployerCountryCode', 'tbEmployerTel',
        'tbJobTitle', 'tbEmployerDateFrom', 'tbEmployerDateTo',
        'tbDescribeDuties', 'tbxSchoolName', 'tbxSchoolAddr1',
        'tbxSchoolCity', 'ddlSchoolCountryCode', 'tbxCourseOfStudy',
        'tbxSchoolFromDate', 'tbxSchoolToDate'
      ],
      'additionalWorkEducation': [
        'dtlLANGUAGES', 'tbxLANGUAGE_NAME', 'dtlCountriesVisited',
        'ddlCountriesVisited', 'dtlOrganization', 'tbxOrganizationName',
        'rblCLAN_OR_TRIBE', 'tbxCLAN_OR_TRIBE_NAME',
        'rblSPECIALIZED_SKILLS', 'rblMILITARY_SERVICE'
      ],
      'security': [
        'rblDisease', 'rblDisorder', 'rblDrugUser', 'rblArrested',
        'rblControlledSubstances', 'rblProstitution', 'rblMoneyLaundering',
        'rblHumanTrafficking', 'rblAssistedSevereTrafficking',
        'rblIllegalActivity', 'rblTerroristActivity', 'rblTerroristSupport',
        'rblTerroristOrg', 'rblGenocide', 'rblTorture', 'rblExViolence',
        'rblChildSoldier', 'rblReligiousFreedom', 'rblPopulationControls',
        'rblTransplant'
      ]
    };

    // If page is unknown, allow all fields (fallback)
    if (!currentPage || currentPage === 'unknown') {
      return true;
    }

    // Get patterns for current page
    const patterns = pageFieldPatterns[currentPage];
    if (!patterns) {
      return true; // If no patterns defined for page, allow field
    }

    // Check if field matches any pattern for current page
    return patterns.some(pattern => fieldId.includes(pattern));
  }

  // Detect which page we're on (improved detection)
  detectCurrentPage() {
    // Check for previous work/education page first (it has specific fields)
    if (document.querySelector('[id*="dtlPrevEmpl_ctl00_tbEmployerName"]') || 
        document.querySelector('[id*="dtlPrevEduc_ctl00_tbxSchoolName"]')) {
      return 'workEducationPrevious';
    }
    
    // Check for Additional Work/Education/Training Information page (languages, etc.)
    if (document.querySelector('[id*="dtlLANGUAGES"]') || 
        document.querySelector('[id*="tbxLANGUAGE_NAME"]')) {
      return 'additionalWorkEducation';
    }
    
    const pageIndicators = {
      'personal1': 'tbxAPP_SURNAME',
      'personal2': 'ddlAPP_NATL', // Nationality dropdown is unique to page 2
      'travel': 'ddlPurposeOfTrip',
      'travelCompanions': 'rblTravelingWithYou',
      'previousTravel': 'rblPREV_US_TRAVEL_IND',
      'addressPhone': 'tbxAPP_ADDR_LN1',
      'contact': 'rblAddSocial', // Social media question on contact page
      'usContact': 'tbxUS_POC_SURNAME',
      'passport': 'ddlPPT_TYPE',
      'family': 'tbxFATHER_SURNAME',
      'workEducation': 'ddlPresentOccupation',
      'security': 'rblDisease'
    };

    for (const [page, indicator] of Object.entries(pageIndicators)) {
      const fields = document.querySelectorAll(`[id*="${indicator}"]`);
      if (fields.length > 0 && fields[0].offsetParent !== null) {
        // Additional check for personal pages
        if (page === 'personal1' && document.querySelector('[id*="ddlAPP_NATL"]')) {
          // If nationality dropdown is visible, it's page 2
          return 'personal2';
        }
        return page;
      }
    }
    
    return 'unknown';
  }

  // Get all visible fields on the current page
  getVisibleFields() {
    const fields = [];
    const elements = document.querySelectorAll('input, select, textarea');
    
    // Count dropdowns found (but don't log)
    const dropdowns = Array.from(elements).filter(e => e.tagName === 'SELECT');
    
    elements.forEach(element => {
      if (element.id && element.offsetParent !== null && !element.disabled) {
        if (this.filledFields.has(element.id)) {
          return;
        }
        
        // Skip already filled text inputs and selects (but not radio/checkboxes)
        if ((element.type === 'text' || element.type === 'select-one') && element.value && element.value.trim() !== '') {
          // Mark as filled so we don't try again
          this.filledFields.add(element.id);
          console.log(`[SKIP] Field ${element.id} already has value: ${element.value}`);
          return;
        }
        
        fields.push({
          id: element.id,
          type: element.type || element.tagName.toLowerCase(),
          element: element
        });
      }
    });
    
    return fields;
  }

  // Fill a field with matching data
  fillField(field, data) {
    const fieldId = field.id;
    const element = field.element;
    
    // Debug driver's license fields
    if (fieldId.includes('DRIVER_LIC')) {
      console.log(`[DRIVER LICENSE FIELD] Processing: ${fieldId}, type: ${field.type}`);
    }
    
    
    if (this.filledFields.has(fieldId)) {
      return false;
    }
    
    const value = this.findMatchingValue(fieldId, data);
    // Don't log every field lookup - creates too much noise
    
    
    if (value === null || value === undefined || value === 'N/A') {
      // Don't log - creates noise
      return false;
    }
    
    // Allow empty strings for optional fields
    if (value === '') {
      // Only fill if it's an optional field (Line 2, cities, etc.)
      if (fieldId.includes('2') || fieldId.includes('City') || fieldId.includes('Flight')) {
        // Continue to fill with empty string
      } else {
        return false; // Skip empty values for required fields
      }
    }
    
    try {
      // Don't log every field fill attempt
      
      
      if (field.type === 'text' || field.type === 'textarea' || field.type === 'tel' || field.type === 'email') {
        // CRITICAL: Convert "N/A" to empty string to prevent crashes
        if (value === 'N/A' || value === 'n/a' || value === 'N/a') {
          value = '';  // Replace N/A with empty string
        }
        
        // Don't log every field operation
        
        // Detect if we're on the previous travel page
        const currentPage = this.detectCurrentPage();
        const isOnPreviousTravelPage = currentPage === 'previousTravel';
        
        // Special handling for TEXT fields that get cleared by the form's JavaScript
        // Only apply to text fields on Previous Travel page, not radio/checkboxes
        const needsAggressiveFilling = (isOnPreviousTravelPage && !fieldId.includes('rbl')) ||  // Text fields on previous travel page
            fieldId.includes('PETITION_NUM') || 
            fieldId.includes('PPT_NUM') || 
            fieldId.includes('Spouse') || 
            fieldId.includes('SPOUSE') ||
            fieldId.includes('PRIN_APP_PETITION_NUM') || 
            fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxPETITION_NUM' ||
            fieldId.includes('tbxSocialMediaIdent');
            
        if (needsAggressiveFilling) {
          
          // Method 1: Set value multiple times with delays
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Method 2: Monitor and re-fill if cleared
          let refillAttempts = 0;
          const maxRefillAttempts = 5;
          const checkInterval = setInterval(() => {
            if (element.value !== value && refillAttempts < maxRefillAttempts) {
              console.log(`Re-filling ${fieldId} (attempt ${refillAttempts + 1})`);
              element.value = value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              refillAttempts++;
            } else if (element.value === value || refillAttempts >= maxRefillAttempts) {
              clearInterval(checkInterval);
              if (element.value === value) {
                console.log(`Successfully kept ${fieldId} filled with value: ${value}`);
              } else {
                console.warn(`Failed to keep ${fieldId} filled after ${maxRefillAttempts} attempts`);
              }
            }
          }, 200); // Check every 200ms
          
          // Method 3: Set value after a longer delay as backup
          setTimeout(() => {
            if (element.value !== value) {
              console.log(`Final attempt to set ${fieldId}`);
              element.value = value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, 2000);
          
          // Method 4: Extra aggressive for social media fields
          if (fieldId.includes('tbxSocialMediaIdent') || fieldId.includes('dtlSocial')) {
            console.log(`Extra aggressive filling for social media field: ${fieldId}`);
            // First ensure the social media question is answered "Yes"
            const socialYesRadio = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_rblAddSocial_0');
            if (socialYesRadio && !socialYesRadio.checked) {
              console.log('Clicking Yes on social media question first');
              socialYesRadio.click();
              socialYesRadio.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Try multiple times with increasing delays
            [100, 500, 1000, 1500, 3000, 5000].forEach(delay => {
              setTimeout(() => {
                if (element.value !== value) {
                  console.log(`Social media refill attempt at ${delay}ms for ${fieldId}`);
                  element.focus();
                  element.value = value;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  element.dispatchEvent(new Event('blur', { bubbles: true }));
                }
              }, delay);
            });
          }
        } else {
          // Check if we're on work/education page and should be careful with events
          const currentPage = this.detectCurrentPage();
          const isWorkEducationPage = currentPage === 'workEducationPrevious' || currentPage === 'workEducation';
          
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          
          // On work/education pages, skip change event for certain fields that might trigger postbacks
          const skipChangeEvent = isWorkEducationPage && (
            fieldId.includes('Country') || 
            fieldId.includes('ddl') ||  // dropdowns
            fieldId.includes('rbl')      // radio buttons
          );
          
          if (!skipChangeEvent) {
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            this.log(`Skipping change event to avoid postback`, { fieldId });
          }
        }
      } else if (field.type === 'select' || field.type === 'select-one') {
        // Now that we fixed the address issue, we can fill dropdowns normally!
        // For dropdowns, try to match the value
        this.log(`Processing dropdown field`, { fieldId, value, optionsCount: element.options.length });
        const options = Array.from(element.options);
        let matched = false;
        
        // Debug country dropdowns
        if (fieldId.includes('Country') || fieldId.includes('DropDownList2')) {
          console.log(`[COUNTRY DROPDOWN] Field: ${fieldId}, Value to set: "${value}"`);
          console.log(`[COUNTRY DROPDOWN] First 10 options:`, options.slice(0, 10).map(o => ({
            value: o.value,
            text: o.text
          })));
        }
        
        // Special debugging for Primary Occupation
        if (fieldId.includes('ddlPresentOccupation')) {
          console.log(`[PRIMARY OCCUPATION] Attempting to fill`);
          console.log(`Field ID: ${fieldId}`);
          console.log(`Value trying to set: "${value}"`);
          console.log(`Current dropdown value: "${element.value}"`);
          console.log(`Available options:`, options.slice(0, 5).map(o => ({ value: o.value, text: o.text })));
        }
        
        // Debug logging for date dropdowns
        if (fieldId.includes('Month') || fieldId.includes('Day')) {
          console.log(`[DATE DROPDOWN] Setting ${fieldId} with value: "${value}"`);
          console.log('[DATE DROPDOWN] First 15 options:', options.slice(0, 15).map(o => ({ value: o.value, text: o.text })));
        }
        
        // Try exact match first
        for (const option of options) {
          if (option.value === value || option.text === value) {
            element.value = option.value;
            matched = true;
            break;
          }
        }
        
        // For day/month dropdowns, try converting "01" to "1", "02" to "2", etc.
        if (!matched && (fieldId.includes('Day') || fieldId.includes('Month'))) {
          const numericValue = parseInt(value, 10).toString(); // Convert "01" to "1"
          for (const option of options) {
            if (option.value === numericValue) {
              element.value = option.value;
              matched = true;
              console.log(`Matched numeric date value: "${value}" -> "${numericValue}"`);
              break;
            }
          }
        }
        
        // Try case-insensitive match
        if (!matched) {
          for (const option of options) {
            if (option.value.toLowerCase() === value.toLowerCase() || 
                option.text.toLowerCase() === value.toLowerCase()) {
              element.value = option.value;
              matched = true;
              break;
            }
          }
        }
        
        // Special handling for month dropdowns
        if (!matched && fieldId.includes('Month')) {
          console.log(`Special month handling for ${fieldId} with value: ${value}`);
          
          // Try to match month in various formats
          const monthMappings = {
            'JAN': ['JAN', 'JANUARY', '01', '1'],
            'FEB': ['FEB', 'FEBRUARY', '02', '2'],
            'MAR': ['MAR', 'MARCH', '03', '3'],
            'APR': ['APR', 'APRIL', '04', '4'],
            'MAY': ['MAY', 'MAY', '05', '5'],
            'JUN': ['JUN', 'JUNE', '06', '6'],
            'JUL': ['JUL', 'JULY', '07', '7'],
            'AUG': ['AUG', 'AUGUST', '08', '8'],
            'SEP': ['SEP', 'SEPTEMBER', '09', '9'],
            'OCT': ['OCT', 'OCTOBER', '10', '10'],
            'NOV': ['NOV', 'NOVEMBER', '11', '11'],
            'DEC': ['DEC', 'DECEMBER', '12', '12']
          };
          
          // Find which month we're trying to set
          let targetMonth = null;
          let targetNumeric = null;
          for (const [abbr, variants] of Object.entries(monthMappings)) {
            if (value === abbr || variants.includes(value.toUpperCase())) {
              targetMonth = abbr;
              // Get numeric value (e.g., "07" for JUL)
              targetNumeric = variants.find(v => v.match(/^\d{2}$/)) || variants[2];
              break;
            }
          }
          
          if (targetMonth) {
            console.log(`Target month: ${targetMonth}, numeric: ${targetNumeric}`);
            
            // Try to find an option that matches any variant of this month
            for (const option of options) {
              const optVal = option.value.toUpperCase();
              const optText = option.text.toUpperCase();
              
              // Check for direct month abbreviation match or numeric match
              if (optVal === targetMonth || optText === targetMonth ||
                  optVal === targetNumeric || optText === targetNumeric ||
                  monthMappings[targetMonth].includes(optVal) ||
                  monthMappings[targetMonth].includes(optText)) {
                element.value = option.value;
                matched = true;
                console.log(`Matched month ${targetMonth} to option value: ${option.value} (text: ${option.text})`);
                break;
              }
            }
          }
        }
        
        // Try partial match for countries
        if (!matched && (fieldId.includes('NATL') || fieldId.includes('CNTRY') || fieldId.includes('Country') || fieldId.includes('DropDownList2'))) {
          // First try if the value is already a valid country code
          for (const option of options) {
            if (option.value === value) {
              element.value = value;
              matched = true;
              console.log(`Direct country match: "${value}"`);
              break;
            }
          }
          
          // If not matched, try mapping
          if (!matched) {
            const countryMap = this.getCountryMapping(value);
            if (countryMap) {
              element.value = countryMap;
              matched = true;
              console.log(`Mapped country: "${value}" -> "${countryMap}"`);
            }
          }
        }
        
        if (matched) {
          // Check if this is a problematic dropdown on present work page that causes reload
          const currentPage = this.detectCurrentPage();
          const isPresentWorkPage = currentPage === 'workEducation';
          
          // These specific dropdowns cause page reloads on present work page
          const problematicPresentWorkDropdowns = isPresentWorkPage && (
            fieldId.includes('ddlPresentOccupation') ||  // Primary Occupation causes reload
            fieldId.includes('ddlEmpSchCountry')         // Country sometimes causes reload
          );
          
          if (problematicPresentWorkDropdowns) {
            console.log(`[RELOAD PREVENTION] Skipping change event for ${fieldId} to prevent page reload`);
            this.log(`Skipping change event to prevent reload`, { fieldId });
            // Value is set but change event not fired - form will validate on Next button
          } else {
            // Fire change event normally for other dropdowns
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          console.warn(`Could not find matching option for ${fieldId}: ${value}`);
          return false;
        }
      } else if (field.type === 'radio' || field.type === 'checkbox') {
        // For radio buttons and checkboxes, value=true means we should check this element
        // IMPORTANT: For "No" radio buttons, the field mapping returns true when "No" should be selected
        if (value === true || value === 'true' || value === 'yes' || value === 'on') {
          console.log(`[RADIO/CHECKBOX] Checking ${fieldId} because value is truthy:`, value);
          element.checked = true;
          element.dispatchEvent(new Event('click', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (value === false || value === 'false' || value === 'no' || value === 'off' || value === null || value === undefined) {
          console.log(`[RADIO/CHECKBOX] NOT checking ${fieldId} because value is falsy:`, value);
          // Don't check it - the field mapping already determines which radio button gets checked
          element.checked = false;
        }
      }
      
      // Field filled successfully
      this.filledFields.add(fieldId);
      return true;
    } catch (error) {
      this.log(`ERROR filling field`, { fieldId, errorMessage: error.message, errorStack: error.stack });
      console.error(`Error filling ${fieldId}:`, error);
      return false;
    }
  }

  // Country code mapping for dropdowns
  getCountryMapping(country) {
    const countryMappings = {
      'China': 'CHIN',
      'CHINA': 'CHIN',
      'Japan': 'JPN',
      'JAPAN': 'JPN',
      'United States': 'USA',
      'UNITED STATES': 'USA',
      'USA': 'USA',
      'US': 'USA',
      'Canada': 'CAN',
      'CANADA': 'CAN',
      // Add more as needed
    };
    
    return countryMappings[country] || null;
  }

  // Parse SSN for split fields
  parseSSN(ssn) {
    if (!ssn || ssn === 'N/A') return null;
    
    // Remove any non-numeric characters
    const cleaned = ssn.replace(/\D/g, '');
    
    if (cleaned.length !== 9) return null;
    
    return {
      part1: cleaned.substring(0, 3),
      part2: cleaned.substring(3, 5),
      part3: cleaned.substring(5, 9)
    };
  }

  // Find matching value in data for a field ID
  findMatchingValue(fieldId, data) {
    // CRITICAL: Prevent accessing previous employer/education fields when not on the right page
    const currentPage = this.detectCurrentPage();
    const isPreviousWorkField = fieldId.includes('dtlPrevEmpl') || fieldId.includes('dtlPrevEduc');
    
    // If we're NOT on the previous work page but trying to access previous work fields, skip immediately
    if (isPreviousWorkField && currentPage !== 'workEducationPrevious') {
      // Don't log - this is expected behavior and creates noise
      return null;
    }
    
    // SPECIAL HANDLING FOR ADDRESS FIELDS WITH OVERFLOW
    // Check if this is an address line 2 field that needs overflow from line 1
    if (fieldId.includes('tbEmployerStreetAddress2')) {
      // Extract the index (ctl00, ctl01, etc)
      const indexMatch = fieldId.match(/ctl(\d+)/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1]);
        const employer = data.workEducation?.previousEmployers?.[index];
        if (employer) {
          const addr1 = employer.employerStreetAddress1;
          const addr2 = employer.employerStreetAddress2;
          
          // If addr1 is long, calculate overflow
          if (addr1 && addr1.length > 40) {
            const split = this.splitAddress(addr1, 40);
            // If there's already an addr2, append overflow to it
            if (addr2 && addr2 !== 'N/A') {
              return split.line2 + ' ' + addr2;
            }
            // Otherwise just return the overflow
            return split.line2;
          }
          // If addr1 is not long, return original addr2
          return addr2;
        }
      }
    }
    
    // Similar handling for education address line 2
    if (fieldId.includes('tbxSchoolAddr2')) {
      const indexMatch = fieldId.match(/ctl(\d+)/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1]);
        const school = data.workEducation?.previousEducation?.[index];
        if (school) {
          const addr1 = school.schoolAddr1;
          const addr2 = school.schoolAddr2;
          
          // If addr1 is long, calculate overflow
          if (addr1 && addr1.length > 40) {
            const split = this.splitAddress(addr1, 40);
            // If there's already an addr2, append overflow to it
            if (addr2 && addr2 !== 'N/A') {
              return split.line2 + ' ' + addr2;
            }
            // Otherwise just return the overflow
            return split.line2;
          }
          // If addr1 is not long, return original addr2
          return addr2;
        }
      }
    }
    
    // Handle present employer address line 2
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchAddr2') {
      const addr1 = data.workEducation?.presentEmployer?.address?.street1 || data.workEducation?.employerAddress;
      const addr2 = data.workEducation?.presentEmployer?.address?.street2;
      
      if (addr1 && addr1.length > 40) {
        const split = this.splitAddress(addr1, 40);
        if (addr2 && addr2 !== 'N/A') {
          return split.line2 + ' ' + addr2;
        }
        return split.line2;
      }
      return addr2;
    }
    
    // Additional safety: Check if we're trying to access an array index that doesn't exist
    if (isPreviousWorkField) {
      // Extract the index from field ID (ctl00, ctl01, ctl02, etc.)
      const indexMatch = fieldId.match(/ctl(\d+)/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1]);
        
        // Check if this is an employer field
        if (fieldId.includes('dtlPrevEmpl')) {
          const employersCount = data.workEducation?.previousEmployers?.length || 0;
          if (index >= employersCount) {
            this.log(`[SAFETY] Skipping employer field - index out of bounds`, { 
              fieldId, 
              index, 
              employersCount 
            });
            return null;
          }
        }
        
        // Check if this is an education field
        if (fieldId.includes('dtlPrevEduc')) {
          const educationCount = data.workEducation?.previousEducation?.length || 0;
          if (index >= educationCount) {
            this.log(`[SAFETY] Skipping education field - index out of bounds`, { 
              fieldId, 
              index, 
              educationCount 
            });
            return null;
          }
        }
      }
    }
    
    // Debug critical fields
    if (fieldId.includes('PRIN_APP_PETITION_NUM')) {
      console.log(`Looking for petition number: fieldId="${fieldId}"`);
      console.log(`Travel data:`, data.travel);
      console.log(`Principal applicant:`, data.travel?.principalApplicant);
      console.log(`Petition number value: "${data.travel?.principalApplicant?.petitionNumber}"`);
    }
    
    if (fieldId.includes('TRAVEL_LOS')) {
      console.log(`Looking for length of stay: fieldId="${fieldId}"`);
      console.log(`Travel lengthOfStay: "${data.travel?.lengthOfStay}"`);
      console.log(`Travel lengthOfStayNumber: "${data.travel?.lengthOfStayNumber}"`);
      console.log(`Travel lengthOfStayUnit: "${data.travel?.lengthOfStayUnit}"`);
    }
    
    // Debug social media fields
    if (fieldId.includes('Social') || fieldId.includes('tbxSocialMediaIdent')) {
      console.log(`Looking for social media data: fieldId="${fieldId}"`);
      console.log(`Contact data:`, data.contact);
      console.log(`Social media accounts:`, data.contact?.socialMediaAccounts);
      console.log(`Social media (alt):`, data.contact?.socialMedia);
    }
    
    // Special handling for page-specific DOB fields
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlDOBDay' ||
        fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlDOBMonth' ||
        fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxDOBYear') {
      
      // Check if we're on the spouse page by looking for spouse-specific fields
      const spouseSurnameField = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseSurname');
      if (spouseSurnameField) {
        // We're on the spouse page, use spouse DOB
        console.log('On spouse page, using spouse DOB for field:', fieldId);
        if (fieldId.includes('Day')) {
          return this.getDayFromDate(data.family?.spouse?.dateOfBirth || data.family?.spouseDateOfBirth);
        } else if (fieldId.includes('Month')) {
          return this.getMonthNumber(data.family?.spouse?.dateOfBirth || data.family?.spouseDateOfBirth);
        } else if (fieldId.includes('Year')) {
          return this.getYearFromDate(data.family?.spouse?.dateOfBirth || data.family?.spouseDateOfBirth);
        }
      } else {
        // We're on the personal information page, use applicant DOB
        console.log('On personal page, using applicant DOB for field:', fieldId);
        if (fieldId.includes('Day')) {
          return this.getDayFromDate(data.personal?.dateOfBirth);
        } else if (fieldId.includes('Month')) {
          return this.getMonthNumber(data.personal?.dateOfBirth);
        } else if (fieldId.includes('Year')) {
          return this.getYearFromDate(data.personal?.dateOfBirth);
        }
      }
    }
    
    // DOB Month is now handled above in the page-specific section
    
    // Handle travel date months
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEMonth') {
      return this.getMonthNumber(data.travel?.intendedTravelDate);
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlARRIVAL_US_DTEMonth') {
      return this.getMonthNumber(data.travel?.intendedArrivalDate);
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlDEPARTURE_US_DTEMonth') {
      return this.getMonthNumber(data.travel?.intendedDepartureDate);
    }
    
    // Handle passport date months
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEMonth') {
      return this.getMonthNumber(data.passport?.issueDate);
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEMonth') {
      return this.getMonthNumber(data.passport?.expirationDate);
    }
    
    // Handle employment date month
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromMonth') {
      return this.getMonthNumber(data.workEducation?.presentEmployer?.startDate || data.workEducation?.employmentStartDate);
    }
    
    // Handle previous visa date month
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlPREV_VISA_ISSUED_DTEMonth') {
      return this.getMonthNumber(data.previousTravel?.previousVisa?.issueDate);
    }
    
    // Handle previous US visit date months (dynamic fields)
    if (fieldId.includes('PREV_US_VISIT') && fieldId.includes('Month')) {
      const match = fieldId.match(/ctl(\d+)/);
      if (match) {
        const index = parseInt(match[1]);
        return this.getMonthNumber(data.previousTravel?.visits?.[index]?.arrivalDate);
      }
    }
    
    // Special handling for SSN fields
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN1') {
      const ssn = this.parseSSN(data.personal?.usSocialSecurity);
      return ssn?.part1;
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN2') {
      const ssn = this.parseSSN(data.personal?.usSocialSecurity);
      return ssn?.part2;
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN3') {
      const ssn = this.parseSSN(data.personal?.usSocialSecurity);
      return ssn?.part3;
    }
    
    // Handle "Does Not Apply" checkboxes - FIXED: cbex not cbx
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_NATIONAL_ID_NA') {
      return data.personal?.nationalId === 'N/A' || !data.personal?.nationalId;
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_SSN_NA') {
      return data.personal?.usSocialSecurity === 'N/A' || !data.personal?.usSocialSecurity;
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_cbxPREV_VISA_FOIL_NUMBER_NA') {
      return data.previousTravel?.previousVisa?.visaNumber === 'N/A' || 
             data.previousTravel?.previousVisa?.visaNumber === 'Do Not Know' || 
             !data.previousTravel?.previousVisa?.visaNumber;
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_TAX_ID_NA') {
      return data.personal?.usTaxId === 'N/A' || !data.personal?.usTaxId;
    }
    // Personal Page 1 "Does Not Apply" checkboxes
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_FULL_NAME_NATIVE_NA') {
      return !data.personal?.fullNameNative || data.personal?.fullNameNative === 'N/A';
    }
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_POB_ST_PROVINCE_NA') {
      return !data.personal?.birthState || data.personal?.birthState === 'N/A';
    }
    
    // No longer need to skip dropdowns - we fixed the address issue!
    
    // Get the current page once at the beginning
    const currentPageCheck = this.detectCurrentPage();
    
    // Don't filter fields - let them all be processed
    // The form will only fill fields that exist on the current page anyway
    
    // Only log for important operations
    // this.log(`Creating field mappings`, { 
    //   fieldId,
    //   currentPage: currentPageCheck 
    // });
    
    // Direct field mappings
    const fieldMappings = {
      // Personal Information Page 1
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME': data.personal?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_GIVEN_NAME': (() => {
        // Combine given name and middle name if both exist
        const given = data.personal?.givenName || '';
        const middle = data.personal?.middleName || '';
        return middle ? `${given} ${middle}`.trim() : given;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_FULL_NAME_NATIVE': data.personal?.fullNameNative,
      // DOB fields are handled specially in findMatchingValue based on current page context
      
      // Gender - Now a dropdown instead of radio buttons
      'ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_GENDER': this.mapGender(data.personal?.gender),
      
      // Marital Status - Was missing
      'ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_MARITAL_STATUS': this.mapMaritalStatus(data.personal?.maritalStatus),
      
      // Birth Location - These are on Page 1, NOT Page 2!
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_CITY': data.personal?.birthCity,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_ST_PROVINCE': data.personal?.birthState,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_POB_CNTRY': data.personal?.birthCountry,
      
      // Other names (dynamic) - Split the name if it contains both given and surname
      'ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl00_tbxSURNAME': (() => {
        const otherName = data.personal?.otherNames?.[0];
        if (!otherName) return '';
        // If the name contains a space, split it (e.g., "BRYAN LI" -> surname: "LI")
        const parts = otherName.trim().split(/\s+/);
        if (parts.length > 1) {
          // Last part is surname
          return parts[parts.length - 1];
        }
        // If no space, it's likely just a surname variation
        return otherName;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl00_tbxGIVEN_NAME': (() => {
        const otherName = data.personal?.otherNames?.[0];
        if (!otherName) return '';
        // If the name contains a space, split it (e.g., "BRYAN LI" -> given: "BRYAN")
        const parts = otherName.trim().split(/\s+/);
        if (parts.length > 1) {
          // Everything except last part is given name
          return parts.slice(0, -1).join(' ');
        }
        // If no space, leave given name empty
        return '';
      })(),
      
      // Additional other names (if more than one)
      'ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl01_tbxSURNAME': (() => {
        const otherName = data.personal?.otherNames?.[1];
        if (!otherName) return '';
        const parts = otherName.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : otherName;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl01_tbxGIVEN_NAME': (() => {
        const otherName = data.personal?.otherNames?.[1];
        if (!otherName) return '';
        const parts = otherName.trim().split(/\s+/);
        return parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
      })(),
      
      // Telecode fields (conditional - for Chinese names)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_TelecodeSURNAME': data.personal?.telecodeSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_TelecodeGIVEN_NAME': data.personal?.telecodeGivenName,
      
      // Personal Information Page 2 - CRITICAL FIELDS
      'ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_NATL': data.personal?.nationality,
      
      // Dynamic fields for other nationalities (conditional - appear when "Yes" selected)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_ddlOTHER_NATL': data.personal?.otherNationalities?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl01_ddlOTHER_NATL': data.personal?.otherNationalities?.[1],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_tbxOTHER_PPT_NUM': data.personal?.otherPassportNumbers?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl01_tbxOTHER_PPT_NUM': data.personal?.otherPassportNumbers?.[1],
      
      // Permanent resident country (conditional - appears when permanent resident = "Yes")
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOthPermResCntry_ctl00_ddlOthPermResCntry': data.personal?.permanentResidentCountry,
      
      // National ID - only fill if not N/A
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_NATIONAL_ID': 
        (data.personal?.nationalId && data.personal.nationalId !== 'N/A') ? data.personal.nationalId : '',
      
      // SSN - single field version (some forms have this)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN': 
        (data.personal?.usSocialSecurity && data.personal.usSocialSecurity !== 'N/A') ? 
        data.personal.usSocialSecurity.replace(/-/g, '') : '',
      
      // Tax ID - only fill if not N/A
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_TAX_ID': 
        (data.personal?.usTaxId && data.personal.usTaxId !== 'N/A') ? data.personal.usTaxId : '',
      
      // === TRAVEL INFORMATION PAGE ===
      
      // Purpose of Trip - Gemini now outputs the letter code directly (L, H, E, etc.)
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip': data.travel?.purposeOfTrip,
      // Specify dropdown - Maps the visa subtype (H-1B, L-1, E-2, etc.)
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlOtherPurpose': this.mapVisaSubtype(data.travel?.otherPurposeDetail),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSpecifyOther': data.travel?.purposeSpecify,
      
      // Application Receipt/Petition Number (main applicant's own petition)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPETITION_NUM': data.travel?.petitionNumber || data.petition?.receiptNumber,
      
      // Who is Paying
      'ctl00_SiteContentPlaceHolder_FormView1_ddlWhoIsPaying': this.mapPayerType(data.travel?.tripPayer),
      
      // Principal Applicant (for dependents)
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPrincipleAppSurname': data.travel?.principalApplicant?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPrincipleAppGivenName': data.travel?.principalApplicant?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPRIN_APP_PETITION_NUM': data.travel?.principalApplicant?.petitionNumber,
      
      // Intended Travel Date
      'ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEDay': this.parseDate(data.travel?.intendedTravelDate)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEMonth': this.getMonthNumber(data.travel?.intendedTravelDate),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_DTEYear': this.parseDate(data.travel?.intendedTravelDate)?.year,
      
      // Length of Stay - handle both separate and combined formats
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_LOS': 
        this.parseLengthOfStay(data.travel?.lengthOfStay)?.number || data.travel?.lengthOfStayNumber,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_LOS_CD': 
        this.mapStayUnit(this.parseLengthOfStay(data.travel?.lengthOfStay)?.unit) || this.mapStayUnit(data.travel?.lengthOfStayUnit),
      
      // Arrival Information
      'ctl00_SiteContentPlaceHolder_FormView1_ddlARRIVAL_US_DTEDay': this.parseDate(data.travel?.intendedArrivalDate)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlARRIVAL_US_DTEMonth': this.getMonthNumber(data.travel?.intendedArrivalDate),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxARRIVAL_US_DTEYear': this.parseDate(data.travel?.intendedArrivalDate)?.year,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxArriveFlight': data.travel?.arrivalFlightNumber,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxArriveCity': data.travel?.arrivalCity,
      
      // Departure Information
      'ctl00_SiteContentPlaceHolder_FormView1_ddlDEPARTURE_US_DTEDay': this.parseDate(data.travel?.intendedDepartureDate)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlDEPARTURE_US_DTEMonth': this.getMonthNumber(data.travel?.intendedDepartureDate),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxDEPARTURE_US_DTEYear': this.parseDate(data.travel?.intendedDepartureDate)?.year,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxDepartFlight': data.travel?.departureFlightNumber,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxDepartCity': data.travel?.departureCity,
      
      // US Address/Hotel Information
      'ctl00_SiteContentPlaceHolder_FormView1_dtlTravelLoc_ctl00_tbxSPECTRAVEL_LOCATION': data.travel?.usContactName,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxStreetAddress1': data.travel?.usStreetAddress,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxStreetAddress2': data.travel?.usStreetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxCity': data.travel?.usCity,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlTravelState': data.travel?.usState,
      'ctl00_SiteContentPlaceHolder_FormView1_tbZIPCode': data.travel?.usZipCode,
      
      // Payer Information (Person)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerSurname': data.travel?.payerInfo?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerGivenName': data.travel?.payerInfo?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerPhone': data.travel?.payerInfo?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPAYER_EMAIL_ADDR': data.travel?.payerInfo?.email,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPayerRelationship': data.travel?.payerInfo?.relationship,
      
      // Payer Company Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayingCompany': data.travel?.companyInfo?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxCompanyRelation': data.travel?.companyInfo?.relationship,
      
      // Payer Address
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerStreetAddress1': data.travel?.payerInfo?.address1,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerStreetAddress2': data.travel?.payerInfo?.address2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerCity': data.travel?.payerInfo?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerStateProvince': data.travel?.payerInfo?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPayerPostalZIPCode': data.travel?.payerInfo?.zipCode,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPayerCountry': data.travel?.payerInfo?.country,
      
      // Mission/Organization Fields (for religious/official visas)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrg': data.travel?.missionOrg?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgContactSurname': data.travel?.missionOrg?.contactSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgContactGivenName': data.travel?.missionOrg?.contactGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgAddress1': data.travel?.missionOrg?.address1,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgAddress2': data.travel?.missionOrg?.address2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgCity': data.travel?.missionOrg?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlMissionOrgState': data.travel?.missionOrg?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgZipCode': data.travel?.missionOrg?.zipCode,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMissionOrgTel': data.travel?.missionOrg?.phone,
      
      // === PREVIOUS U.S. TRAVEL PAGE ===
      
      
      // Previous US Visit Information (dynamic fields - ctl00 for first visit, ctl01 for second, etc.)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_DTEDay': 
        this.parseDate(data.previousTravel?.visits?.[0]?.arrivalDate)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_DTEMonth': 
        this.getMonthNumber(data.previousTravel?.visits?.[0]?.arrivalDate),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_tbxPREV_US_VISIT_DTEYear': 
        this.parseDate(data.previousTravel?.visits?.[0]?.arrivalDate)?.year,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_tbxPREV_US_VISIT_LOS': 
        data.previousTravel?.visits?.[0]?.lengthOfStayNumber,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_LOS_CD': 
        this.mapStayUnit(data.previousTravel?.visits?.[0]?.lengthOfStayUnit),
      
      // Additional visits - Only fill if the visit data exists
      // Visit 2 (ctl01)
      ...(() => {
        const visit2 = data.previousTravel?.visits?.[1];
        if (visit2) {
          return {
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_DTEDay': 
              this.parseDate(visit2.arrivalDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_DTEMonth': 
              this.getMonthNumber(visit2.arrivalDate),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit2.arrivalDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_tbxPREV_US_VISIT_LOS': 
              visit2.lengthOfStayNumber,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit2.lengthOfStayUnit)
          };
        }
        return {};
      })(),
      
      // Visit 3 (ctl02)
      ...(() => {
        const visit3 = data.previousTravel?.visits?.[2];
        if (visit3) {
          return {
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_ddlPREV_US_VISIT_DTEDay': 
              this.parseDate(visit3.arrivalDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_ddlPREV_US_VISIT_DTEMonth': 
              this.getMonthNumber(visit3.arrivalDate),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit3.arrivalDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_tbxPREV_US_VISIT_LOS': 
              visit3.lengthOfStayNumber,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit3.lengthOfStayUnit)
          };
        }
        return {};
      })(),
      
      // Visit 4 (ctl03)
      ...(() => {
        const visit4 = data.previousTravel?.visits?.[3];
        if (visit4) {
          return {
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_ddlPREV_US_VISIT_DTEDay': 
              this.parseDate(visit4.arrivalDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_ddlPREV_US_VISIT_DTEMonth': 
              this.getMonthNumber(visit4.arrivalDate),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit4.arrivalDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_tbxPREV_US_VISIT_LOS': 
              visit4.lengthOfStayNumber,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit4.lengthOfStayUnit)
          };
        }
        return {};
      })(),
      
      // Visit 5 (ctl04)
      ...(() => {
        const visit5 = data.previousTravel?.visits?.[4];
        if (visit5) {
          return {
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_ddlPREV_US_VISIT_DTEDay': 
              this.parseDate(visit5.arrivalDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_ddlPREV_US_VISIT_DTEMonth': 
              this.getMonthNumber(visit5.arrivalDate),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit5.arrivalDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_tbxPREV_US_VISIT_LOS': 
              visit5.lengthOfStayNumber,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit5.lengthOfStayUnit)
          };
        }
        return {};
      })(),
      
      // US Driver's License
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUS_DRIVER_LICENSE_ctl00_tbxUS_DRIVER_LICENSE': (() => {
        // Only fill if has license is true
        if (data.previousTravel?.driverLicense?.hasLicense !== true) {
          return null; // Don't fill if they don't have a license
        }
        const licenseNumber = data.previousTravel?.driverLicense?.number;
        console.log('[DRIVER LICENSE] Number field mapping:', licenseNumber);
        return licenseNumber;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUS_DRIVER_LICENSE_ctl00_ddlUS_DRIVER_LICENSE_STATE': (() => {
        // Only fill if has license is true
        if (data.previousTravel?.driverLicense?.hasLicense !== true) {
          return null; // Don't fill if they don't have a license
        }
        const state = data.previousTravel?.driverLicense?.state;
        console.log('[DRIVER LICENSE] State field mapping:', state);
        return state;
      })(),
      
      // Previous Visa Information
      // Only fill date if hasVisa is true AND date is not N/A
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPREV_VISA_ISSUED_DTEDay': 
        (data.previousTravel?.previousVisa?.hasVisa && data.previousTravel?.previousVisa?.issueDate !== 'N/A') 
          ? this.parseDate(data.previousTravel?.previousVisa?.issueDate)?.day : null,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPREV_VISA_ISSUED_DTEMonth': 
        (data.previousTravel?.previousVisa?.hasVisa && data.previousTravel?.previousVisa?.issueDate !== 'N/A')
          ? this.getMonthNumber(data.previousTravel?.previousVisa?.issueDate) : null,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_ISSUED_DTEYear': 
        (data.previousTravel?.previousVisa?.hasVisa && data.previousTravel?.previousVisa?.issueDate !== 'N/A')
          ? this.parseDate(data.previousTravel?.previousVisa?.issueDate)?.year : null,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_FOIL_NUMBER': 
        data.previousTravel?.previousVisa?.visaNumber,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxPREV_VISA_FOIL_NUMBER_NA':
        data.previousTravel?.previousVisa?.visaNumber === 'N/A' || 
        data.previousTravel?.previousVisa?.visaNumber === 'Do Not Know' || 
        !data.previousTravel?.previousVisa?.visaNumber,
      
      // Same type of visa question
      'ctl00_SiteContentPlaceHolder_FormView1_rblSAME_VISA_IND_0': 
        data.previousTravel?.previousVisa?.sameVisaType === true || data.previousTravel?.previousVisa?.sameType === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblSAME_VISA_IND_1': 
        (data.previousTravel?.previousVisa?.sameVisaType === false || data.previousTravel?.previousVisa?.sameType === false) || 
        (data.previousTravel?.previousVisa?.sameVisaType === null && data.previousTravel?.previousVisa?.sameType === null),
      
      // Same country or location question
      'ctl00_SiteContentPlaceHolder_FormView1_rblSAME_CNTRY_IND_0': 
        data.previousTravel?.previousVisa?.sameCountry === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblSAME_CNTRY_IND_1': 
        data.previousTravel?.previousVisa?.sameCountry === false || data.previousTravel?.previousVisa?.sameCountry === null,
      
      // Ten-printed question
      'ctl00_SiteContentPlaceHolder_FormView1_rblFINGERPRINT_IND_0': 
        data.previousTravel?.previousVisa?.tenPrinted === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblFINGERPRINT_IND_1': 
        data.previousTravel?.previousVisa?.tenPrinted === false || data.previousTravel?.previousVisa?.tenPrinted === null,
      
      // Explanation Fields
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_LOST_YEAR': 
        data.previousTravel?.previousVisa?.lostYear,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_LOST_EXPL': 
        data.previousTravel?.previousVisa?.lostExplanation,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_CANCELLED_EXPL': 
        data.previousTravel?.previousVisa?.cancelledExplanation,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPREV_VISA_REFUSED_EXPL': 
        data.previousTravel?.visaRefusedExplanation,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPERM_RESIDENT_EXPL': 
        data.previousTravel?.permanentResidentExplanation,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxIV_PETITION_EXPL': 
        data.previousTravel?.immigrantPetitionExplanation,
      
      // All other existing mappings...
    };

    // Handle radio buttons
    const radioMappings = {
      // Gender - Keeping for backward compatibility (some forms may still use radio buttons)
      'ctl00_SiteContentPlaceHolder_FormView1_rblAPP_GENDER_0': data.personal?.gender === 'M' || data.personal?.gender === 'MALE',
      'ctl00_SiteContentPlaceHolder_FormView1_rblAPP_GENDER_1': data.personal?.gender === 'F' || data.personal?.gender === 'FEMALE',
      
      // Other names
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherNames_0': data.personal?.otherNames?.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherNames_1': !data.personal?.otherNames?.length || data.personal?.otherNames?.length === 0,
      
      // Telecode question (for Chinese names)
      'ctl00_SiteContentPlaceHolder_FormView1_rblTelecodeQuestion_0': 
        data.personal?.hasTelecode === true || data.personal?.hasTelecode === 'yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTelecodeQuestion_1': 
        data.personal?.hasTelecode === false || data.personal?.hasTelecode === 'no' || !data.personal?.hasTelecode,
      
      // Personal Page 2 specific radios
      'ctl00_SiteContentPlaceHolder_FormView1_rblAPP_OTH_NATL_IND_0': 
        data.personal?.otherNationalities?.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblAPP_OTH_NATL_IND_1': 
        !data.personal?.otherNationalities?.length || data.personal?.otherNationalities?.length === 0,
      
      // Has passport for other nationality (dynamic fields)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_rblOTHER_PPT_IND_0': 
        data.personal?.otherNationalityPassports?.[0] === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_rblOTHER_PPT_IND_1': 
        data.personal?.otherNationalityPassports?.[0] === false || !data.personal?.otherNationalityPassports?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl01_rblOTHER_PPT_IND_0': 
        data.personal?.otherNationalityPassports?.[1] === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl01_rblOTHER_PPT_IND_1': 
        data.personal?.otherNationalityPassports?.[1] === false || !data.personal?.otherNationalityPassports?.[1],
      
      // Permanent resident
      'ctl00_SiteContentPlaceHolder_FormView1_rblPermResOtherCntryInd_0': 
        data.personal?.permanentResident === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPermResOtherCntryInd_1': 
        data.personal?.permanentResident === false || !data.personal?.permanentResident,
      
      // === TRAVEL PAGE RADIO BUTTONS ===
      
      // Specific travel plans
      // Always select "No" for specific travel plans
      'ctl00_SiteContentPlaceHolder_FormView1_rblSpecificTravel_0': 
        false,  // Never select "Yes"
      'ctl00_SiteContentPlaceHolder_FormView1_rblSpecificTravel_1': 
        true,  // Always select "No"
      
      // Travel companions - Are there other persons traveling with you?
      // Always select "No" for work visa applicants
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou_0': 
        false,  // Never select "Yes"
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou_1': 
        true,  // Always select "No"
      
      // Are you traveling as part of a group or organization?
      // Always select "No" for work visa applicants
      'ctl00_SiteContentPlaceHolder_FormView1_rblGroupTravel_0': 
        false,  // Never select "Yes"
      'ctl00_SiteContentPlaceHolder_FormView1_rblGroupTravel_1': 
        true,  // Always select "No"
      
      // Group name (if traveling as group - but we always select No)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxGroupName': 
        data.travelGroup?.name || '',
      
      // Travel companion details (if traveling with others - but we always select No)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlTravelCompanions_ctl00_tbxSurname': 
        data.travelCompanions?.[0]?.surname || '',
      'ctl00_SiteContentPlaceHolder_FormView1_dtlTravelCompanions_ctl00_tbxGivenName': 
        data.travelCompanions?.[0]?.givenName || '',
      'ctl00_SiteContentPlaceHolder_FormView1_dtlTravelCompanions_ctl00_ddlRelationship': 
        data.travelCompanions?.[0]?.relationship || '',
      
      // Payer address same as applicant
      'ctl00_SiteContentPlaceHolder_FormView1_rblPayerAddrSameAsInd_0': 
        data.travel?.payerInfo?.sameAddress === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPayerAddrSameAsInd_1': 
        data.travel?.payerInfo?.sameAddress === false || !data.travel?.payerInfo?.sameAddress,
      
      // === PREVIOUS U.S. TRAVEL PAGE RADIO BUTTONS ===
      
      // Been to US before
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_TRAVEL_IND_0': 
        data.previousTravel?.hasBeenToUS === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_TRAVEL_IND_1': 
        data.previousTravel?.hasBeenToUS === false || !data.previousTravel?.hasBeenToUS,
      
      // Had US visa before
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_IND_0': 
        data.previousTravel?.previousVisa?.hasVisa === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_IND_1': 
        data.previousTravel?.previousVisa?.hasVisa === false || !data.previousTravel?.previousVisa?.hasVisa,
      
      // Visa refused
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_REFUSED_IND_0': 
        data.previousTravel?.visaRefused === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_REFUSED_IND_1': 
        data.previousTravel?.visaRefused === false || !data.previousTravel?.visaRefused,
      
      // Applied for permanent residence
      'ctl00_SiteContentPlaceHolder_FormView1_rblPERM_RESIDENT_IND_0': 
        data.previousTravel?.appliedForPermanentResident === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPERM_RESIDENT_IND_1': 
        data.previousTravel?.appliedForPermanentResident === false || !data.previousTravel?.appliedForPermanentResident,
      
      // Immigrant petition filed
      'ctl00_SiteContentPlaceHolder_FormView1_rblIV_PETITION_IND_0': 
        data.previousTravel?.immigrantPetition === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblIV_PETITION_IND_1': 
        data.previousTravel?.immigrantPetition === false || !data.previousTravel?.immigrantPetition,
      
      // US Driver's License
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_DRIVER_LIC_IND_0': (() => {
        const hasLicense = data.previousTravel?.driverLicense?.hasLicense;
        console.log('[DRIVER LICENSE RADIO] YES option - hasLicense:', hasLicense, 'Will check:', hasLicense === true);
        return hasLicense === true;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_DRIVER_LIC_IND_1': (() => {
        const hasLicense = data.previousTravel?.driverLicense?.hasLicense;
        const shouldCheckNo = hasLicense === false || hasLicense === undefined || hasLicense === null || hasLicense === 'false' || hasLicense === 'N';
        console.log('[DRIVER LICENSE RADIO] NO option - hasLicense:', hasLicense, 'Will check:', shouldCheckNo);
        return shouldCheckNo;
      })(),
      
      // Previous visa questions
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_TYPE_IND_0': 
        data.previousTravel?.previousVisa?.sameType === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_TYPE_IND_1': 
        data.previousTravel?.previousVisa?.sameType === false || !data.previousTravel?.previousVisa?.sameType,
      
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_CNTRY_IND_0': 
        data.previousTravel?.previousVisa?.sameCountry === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_CNTRY_IND_1': 
        data.previousTravel?.previousVisa?.sameCountry === false || !data.previousTravel?.previousVisa?.sameCountry,
      
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_TEN_PRINT_IND_0': 
        data.previousTravel?.previousVisa?.tenPrinted === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_TEN_PRINT_IND_1': 
        data.previousTravel?.previousVisa?.tenPrinted === false || !data.previousTravel?.previousVisa?.tenPrinted,
      
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_LOST_IND_0': 
        data.previousTravel?.previousVisa?.lost === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_LOST_IND_1': 
        data.previousTravel?.previousVisa?.lost === false || !data.previousTravel?.previousVisa?.lost,
      
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_CANCELLED_IND_0': 
        data.previousTravel?.previousVisa?.cancelled === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_CANCELLED_IND_1': 
        data.previousTravel?.previousVisa?.cancelled === false || !data.previousTravel?.previousVisa?.cancelled,
      
      // All other existing radio mappings...
      
      // === ADDRESS AND PHONE PAGE ===
      // Home Address
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN1': data.contact?.homeStreet,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN2': data.contact?.homeStreet2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_CITY': data.contact?.homeCity,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_STATE': data.contact?.homeState,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_ADDR_STATE_NA': 
        !data.contact?.homeState || data.contact?.homeState === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_POSTAL_CD': data.contact?.homePostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_ADDR_POSTAL_CD_NA': 
        !data.contact?.homePostalCode || data.contact?.homePostalCode === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_ddlCountry': this.mapCountry(data.contact?.homeCountry),
      
      // Mailing Address Same as Home
      'ctl00_SiteContentPlaceHolder_FormView1_rblMailingAddrSame_0': 
        data.contact?.mailingSameAsHome === true || data.contact?.mailingSameAsHome === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblMailingAddrSame_1': 
        data.contact?.mailingSameAsHome === false || data.contact?.mailingSameAsHome === 'NO',
      
      // Phone Numbers
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_HOME_TEL': data.contact?.primaryPhone || data.contact?.homePhone,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_MOBILE_TEL': data.contact?.secondaryPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_MOBILE_TEL_NA': 
        !data.contact?.secondaryPhone || data.contact?.secondaryPhone === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_BUS_TEL': data.contact?.workPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_BUS_TEL_NA': 
        !data.contact?.workPhone || data.contact?.workPhone === 'N/A',
      
      // Additional Phones
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddPhone_0': 
        data.contact?.hasOtherPhones === 'YES' || (data.contact?.otherPhones && data.contact?.otherPhones.length > 0),
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddPhone_1': 
        data.contact?.hasOtherPhones === 'NO' || !data.contact?.otherPhones || data.contact?.otherPhones.length === 0,
      
      // Email
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_EMAIL_ADDR': 
        data.contact?.email || data.contact?.emailAddress,
      
      // Additional Emails
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddEmail_0': 
        data.contact?.hasOtherEmails === 'YES' || (data.contact?.otherEmails && data.contact?.otherEmails.length > 0),
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddEmail_1': 
        data.contact?.hasOtherEmails === 'NO' || !data.contact?.otherEmails || data.contact?.otherEmails.length === 0,
      
      // Dynamic Mailing Address fields (appear when mailing address different from home)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_LN1': 
        data.contact?.mailingStreet || data.contact?.mailingAddress?.street,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_LN2': 
        data.contact?.mailingAddress?.apt,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_CITY': 
        data.contact?.mailingCity || data.contact?.mailingAddress?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_STATE': 
        data.contact?.mailingState || data.contact?.mailingAddress?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexMAILING_ADDR_STATE_NA': 
        !data.contact?.mailingState && !data.contact?.mailingAddress?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_POSTAL_CD': 
        data.contact?.mailingPostalCode || data.contact?.mailingAddress?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexMAILING_ADDR_POSTAL_CD_NA': 
        !data.contact?.mailingPostalCode && !data.contact?.mailingAddress?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlMailCountry': 
        this.mapCountry(data.contact?.mailingCountry || data.contact?.mailingAddress?.country),
      
      // Dynamic Additional Phone Numbers (appear when has other phones = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddPhone_ctl00_tbxAddPhoneInfo': data.contact?.otherPhones?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddPhone_ctl01_tbxAddPhoneInfo': data.contact?.otherPhones?.[1],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddPhone_ctl02_tbxAddPhoneInfo': data.contact?.otherPhones?.[2],
      
      // Dynamic Additional Email Addresses (appear when has other emails = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddEmail_ctl00_tbxAddEmailInfo': data.contact?.otherEmails?.[0] || data.contact?.additionalEmails?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddEmail_ctl01_tbxAddEmailInfo': data.contact?.otherEmails?.[1] || data.contact?.additionalEmails?.[1],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddEmail_ctl02_tbxAddEmailInfo': data.contact?.otherEmails?.[2] || data.contact?.additionalEmails?.[2],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddEmail_ctl03_tbxAddEmailInfo': data.contact?.otherEmails?.[3] || data.contact?.additionalEmails?.[3],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlAddEmail_ctl04_tbxAddEmailInfo': data.contact?.otherEmails?.[4] || data.contact?.additionalEmails?.[4],
      
      // NOTE: There is NO Yes/No question for "Do you have social media?"
      // The form goes directly to the dropdown and text field
      
      // "Do you wish to provide information about your presence on any other websites..." Question
      // This is the rblAddSocial field - should default to NO
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddSocial_0': false,  // Yes radio button
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddSocial_1': true,   // No radio button - default to NO
      
      // Other Websites/Applications Question - Default to NO unless additional platforms specified
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherWebsites_0': false,  // Yes radio button
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherWebsites_1': true,   // No radio button - default to NO
      
      // Social Media - Using actual field IDs from DS-160
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_ddlSocialMedia': (() => {
        const platform = data.contact?.socialMediaAccounts?.[0]?.platform || data.contact?.socialMedia?.[0]?.platform;
        const mapped = this.mapSocialMediaPlatform(platform);
        console.log('[SOCIAL MEDIA] Platform 0:', platform, '→ mapped to:', mapped);
        return mapped;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl00_tbxSocialMediaIdent': (() => {
        const handle = data.contact?.socialMediaAccounts?.[0]?.handle || data.contact?.socialMedia?.[0]?.handle || data.contact?.socialMedia?.[0]?.identifier;
        console.log('[SOCIAL MEDIA] Handle 0:', handle);
        return handle;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl01_ddlSocialMedia': (() => {
        const platform = data.contact?.socialMediaAccounts?.[1]?.platform || data.contact?.socialMedia?.[1]?.platform;
        const mapped = this.mapSocialMediaPlatform(platform);
        console.log('[SOCIAL MEDIA] Platform 1:', platform, '→ mapped to:', mapped);
        return mapped;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl01_tbxSocialMediaIdent': (() => {
        const handle = data.contact?.socialMediaAccounts?.[1]?.handle || data.contact?.socialMedia?.[1]?.handle;
        console.log('[SOCIAL MEDIA] Handle 1:', handle);
        return handle;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl02_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[2]?.platform || data.contact?.socialMedia?.[2]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl02_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[2]?.handle || data.contact?.socialMedia?.[2]?.handle,
      // Additional social media fields (up to 10 total)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl03_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[3]?.platform || data.contact?.socialMedia?.[3]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl03_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[3]?.handle || data.contact?.socialMedia?.[3]?.handle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl04_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[4]?.platform || data.contact?.socialMedia?.[4]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl04_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[4]?.handle || data.contact?.socialMedia?.[4]?.handle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl05_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[5]?.platform || data.contact?.socialMedia?.[5]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl05_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[5]?.handle || data.contact?.socialMedia?.[5]?.handle,
      
      // === PASSPORT INFORMATION PAGE ===
      // Passport Type and Number
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_TYPE': this.mapPassportType(data.passport?.type),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM': (() => {
        const value = data.passport?.number || data.passport?.passportNumber;
        console.log(`Passport number mapping: ${value}`);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_BOOK_NUM': data.passport?.bookNumber || data.passport?.passportBookNumber,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexPPT_BOOK_NUM_NA': 
        !data.passport?.bookNumber || data.passport?.bookNumber === 'N/A',
      
      // Passport Issuance
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_CNTRY': 
        this.mapCountry(data.passport?.issuingAuthority || data.passport?.issueCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_IN_CNTRY': 
        this.mapCountry(data.passport?.issueCountry || data.passport?.countryOfIssuance),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUED_IN_CITY': data.passport?.issueCity,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUED_IN_STATE': data.passport?.issueState,
      
      // Issue Date (split into day/month/year)
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEDay': (() => {
        const value = this.getDayFromDate(data.passport?.issueDate);
        console.log(`Passport issue day: ${value} from ${data.passport?.issueDate}`);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_DTEMonth': (() => {
        const value = this.getMonthNumber(data.passport?.issueDate);
        console.log(`Passport issue month: ${value} from ${data.passport?.issueDate}`);
        return value;
      })(),
      // Issue year - correct field ID without underscore before Year
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUEDYear': (() => {
        const value = this.getYearFromDate(data.passport?.issueDate);
        console.log(`Passport issue year: ${value} from ${data.passport?.issueDate}`);
        return value;
      })(),
      
      // Expiration Date (split into day/month/year)
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEDay': (() => {
        const value = this.getDayFromDate(data.passport?.expirationDate);
        console.log(`Passport expiration day: ${value} from ${data.passport?.expirationDate}`);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEMonth': (() => {
        const value = this.getMonthNumber(data.passport?.expirationDate);
        console.log(`Passport expiration month: ${value} from ${data.passport?.expirationDate}`);
        return value;
      })(),
      // Expiration year - correct field ID without underscore before Year
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_EXPIREYear': (() => {
        const value = this.getYearFromDate(data.passport?.expirationDate);
        console.log(`Passport expiration year: ${value} from ${data.passport?.expirationDate}`);
        return value;
      })(),
      
      // Expiration N/A checkbox (some passports don't expire)
      'ctl00_SiteContentPlaceHolder_FormView1_cbxPPT_EXPIRE_NA': 
        data.passport?.expirationDate === 'N/A' || data.passport?.noExpiration === true,
      
      // Lost/Stolen Passport
      'ctl00_SiteContentPlaceHolder_FormView1_rblLOST_PPT_IND_0': 
        data.passport?.lostPassport?.hasLost === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblLOST_PPT_IND_1': 
        data.passport?.lostPassport?.hasLost === false || !data.passport?.lostPassport?.hasLost,
      
      // Other passport type explanation (for diplomatic/official passports)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPptOtherExpl': data.passport?.otherTypeExplanation,
      
      // Dynamic Lost Passport Details (appear when lost passport = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_tbxLOST_PPT_NUM': 
        data.passport?.lostPassport?.number,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_cbxLOST_PPT_NUM_UNKN_IND': 
        !data.passport?.lostPassport?.number || data.passport?.lostPassport?.number === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_ddlLOST_PPT_NATL': 
        this.mapCountry(data.passport?.lostPassport?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLostPPT_ctl00_tbxLOST_PPT_EXPL': 
        data.passport?.lostPassport?.explanation,
      
      // === FAMILY INFORMATION: RELATIVES PAGE ===
      // Father's Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME': (() => {
        const value = data.family?.father?.surnames || data.family?.fatherSurname || data.family?.father?.surname;
        console.log(`Father's surname: ${value} from family data:`, data.family?.father);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxFATHER_SURNAME_UNK_IND': 
        !data.family?.father?.surnames && !data.family?.fatherSurname && !data.family?.father?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_GIVEN_NAME': (() => {
        const value = data.family?.father?.givenNames || data.family?.fatherGivenName || data.family?.father?.givenName;
        console.log(`Father's given name: ${value}`);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxFATHER_GIVEN_NAME_UNK_IND': 
        !data.family?.father?.givenNames && !data.family?.fatherGivenName && !data.family?.father?.givenName,
      
      // Father's Date of Birth
      'ctl00_SiteContentPlaceHolder_FormView1_ddlFathersDOBDay': 
        this.getDayFromDate(data.family?.father?.dateOfBirth || data.family?.fatherDateOfBirth),
      'ctl00_SiteContentPlaceHolder_FormView1_ddlFathersDOBMonth': 
        this.getMonthNumber(data.family?.father?.dateOfBirth || data.family?.fatherDateOfBirth),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxFathersDOBYear': 
        this.getYearFromDate(data.family?.father?.dateOfBirth || data.family?.fatherDateOfBirth),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxFATHER_DOB_UNK_IND': 
        !data.family?.father?.dateOfBirth && !data.family?.fatherDateOfBirth,
      
      // Father in US?
      'ctl00_SiteContentPlaceHolder_FormView1_rblFATHER_LIVE_IN_US_IND_0': 
        data.family?.father?.isInUS === true || data.family?.fatherInUS === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblFATHER_LIVE_IN_US_IND_1': 
        data.family?.father?.isInUS === false || data.family?.fatherInUS === 'No' || 
        data.family?.father?.isInUS === undefined,
      
      // Father's US Status (appears when Father in US = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_ddlFATHER_US_STATUS': (() => {
        if (data.family?.father?.isInUS || data.family?.fatherInUS === 'Yes') {
          const status = data.family?.father?.usStatus || data.family?.fatherUSStatus;
          console.log(`Father's US status: ${status}`);
          return this.mapUSStatus(status);
        }
        return null;
      })(),
      
      // Mother's Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_SURNAME': (() => {
        const value = data.family?.mother?.surnames || data.family?.motherSurname || data.family?.mother?.surname;
        console.log(`Mother's surname: ${value} from family data:`, data.family?.mother);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxMOTHER_SURNAME_UNK_IND': 
        !data.family?.mother?.surnames && !data.family?.motherSurname && !data.family?.mother?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_GIVEN_NAME': (() => {
        const value = data.family?.mother?.givenNames || data.family?.motherGivenName || data.family?.mother?.givenName;
        console.log(`Mother's given name: ${value}`);
        return value;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxMOTHER_GIVEN_NAME_UNK_IND': 
        !data.family?.mother?.givenNames && !data.family?.motherGivenName && !data.family?.mother?.givenName,
      
      // Mother's Date of Birth
      'ctl00_SiteContentPlaceHolder_FormView1_ddlMothersDOBDay': 
        this.getDayFromDate(data.family?.mother?.dateOfBirth || data.family?.motherDateOfBirth),
      'ctl00_SiteContentPlaceHolder_FormView1_ddlMothersDOBMonth': 
        this.getMonthNumber(data.family?.mother?.dateOfBirth || data.family?.motherDateOfBirth),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMothersDOBYear': 
        this.getYearFromDate(data.family?.mother?.dateOfBirth || data.family?.motherDateOfBirth),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxMOTHER_DOB_UNK_IND': 
        !data.family?.mother?.dateOfBirth && !data.family?.motherDateOfBirth,
      
      // Mother in US?
      'ctl00_SiteContentPlaceHolder_FormView1_rblMOTHER_LIVE_IN_US_IND_0': 
        data.family?.mother?.isInUS === true || data.family?.motherInUS === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblMOTHER_LIVE_IN_US_IND_1': 
        data.family?.mother?.isInUS === false || data.family?.motherInUS === 'No' || 
        data.family?.mother?.isInUS === undefined,
      
      // Mother's US Status (appears when Mother in US = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_ddlMOTHER_US_STATUS': (() => {
        if (data.family?.mother?.isInUS || data.family?.motherInUS === 'Yes') {
          const status = data.family?.mother?.usStatus || data.family?.motherUSStatus;
          console.log(`Mother's US status: ${status}`);
          return this.mapUSStatus(status);
        }
        return null;
      })(),
      
      // Immediate relatives in US
      'ctl00_SiteContentPlaceHolder_FormView1_rblUS_IMMED_RELATIVE_IND_0': 
        data.family?.hasImmediateRelativesInUS === true || data.family?.immediateRelativesInUS === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblUS_IMMED_RELATIVE_IND_1': 
        data.family?.hasImmediateRelativesInUS === false || data.family?.immediateRelativesInUS === 'No' || 
        data.family?.hasImmediateRelativesInUS === undefined,
      
      // Other relatives in US
      'ctl00_SiteContentPlaceHolder_FormView1_rblUS_OTHER_RELATIVE_IND_0': 
        data.family?.hasOtherRelativesInUS === true || data.family?.otherRelativesInUS === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblUS_OTHER_RELATIVE_IND_1': 
        data.family?.hasOtherRelativesInUS === false || data.family?.otherRelativesInUS === 'No' || 
        data.family?.hasOtherRelativesInUS === undefined,
      
      // === SPOUSE INFORMATION PAGE ===
      // Spouse's Names (correct field IDs without underscores)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseSurname': 
        data.family?.spouse?.surname || data.family?.spouseSurname || data.spouse?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSpouseGivenName': 
        data.family?.spouse?.givenName || data.family?.spouseGivenName || data.spouse?.givenName,
      
      // NOTE: Spouse DOB fields have same IDs as applicant DOB fields
      // They are filled contextually based on which page is active
      // The fields below will only be filled when on the spouse information page
      
      // Spouse's Nationality
      'ctl00_SiteContentPlaceHolder_FormView1_ddlSpouseNatDropDownList': 
        this.mapCountry(data.family?.spouse?.nationality || data.family?.spouseNationality),
      
      // Spouse's Place of Birth
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSpousePOBCity': 
        data.family?.spouse?.city || this.extractCity(data.family?.spouseBirthPlace),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSpousePOBStateProvince': 
        data.family?.spouse?.birthState || data.family?.spouse?.birthProvince,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxSpousePOBStateProvinceNA': 
        !data.family?.spouse?.birthState && !data.family?.spouse?.birthProvince,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlSpousePOBCountry': 
        this.mapCountry(data.family?.spouse?.country || this.extractCountry(data.family?.spouseBirthPlace)),
      
      // Spouse's Address Type (new dropdown for address selection)
      'ctl00_SiteContentPlaceHolder_FormView1_ddlSpouseAddressType': 
        this.mapSpouseAddressType(data.family?.spouse?.address || data.family?.spouseAddress),
      
      // Spouse's Address fields (when "Other" is selected - actual field IDs from HTML)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_LN1': 
        data.family?.spouse?.addressLine1 || data.family?.spouse?.address?.street1 || data.family?.spouse?.streetAddress1,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_LN2': 
        data.family?.spouse?.addressLine2 || data.family?.spouse?.address?.street2 || data.family?.spouse?.streetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_CITY': 
        data.family?.spouse?.addressCity || data.family?.spouse?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_STATE': 
        data.family?.spouse?.addressState || data.family?.spouse?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxSPOUSE_ADDR_STATE_NA': 
        !data.family?.spouse?.addressState && !data.family?.spouse?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_ADDR_POSTAL_CD': 
        data.family?.spouse?.addressPostalCode || data.family?.spouse?.address?.postalCode || data.family?.spouse?.address?.zipCode,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxSPOUSE_ADDR_POSTAL_CD_NA': 
        !data.family?.spouse?.addressPostalCode && !data.family?.spouse?.address?.postalCode && !data.family?.spouse?.address?.zipCode,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlSPOUSE_ADDR_CNTRY': 
        this.mapCountry(data.family?.spouse?.addressCountry || data.family?.spouse?.address?.country),
      
      // === U.S. POINT OF CONTACT INFORMATION PAGE ===
      // Contact Person
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_SURNAME': 
        data.usPointOfContact?.contactName?.split(' ').slice(-1)[0] || data.usPointOfContact?.contactSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_GIVEN_NAME': 
        data.usPointOfContact?.contactName?.split(' ').slice(0, -1).join(' ') || data.usPointOfContact?.contactGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxUS_POC_NAME_NA': 
        !data.usPointOfContact?.contactName && !data.usPointOfContact?.contactSurname,
      
      // Organization
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ORGANIZATION': (() => {
        const org = data.usPointOfContact?.contactOrganization || data.usPointOfContact?.organization;
        // Don't fill the text field if it's N/A - the checkbox will be checked instead
        return (org && org !== 'N/A') ? org : null;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_cbxUS_POC_ORG_NA_IND': (() => {
        const org = data.usPointOfContact?.contactOrganization || data.usPointOfContact?.organization;
        // Check the "Do Not Know" checkbox if organization is N/A or missing
        console.log('[US CONTACT] Organization value:', org, 'Will check Do Not Know:', !org || org === 'N/A');
        return !org || org === 'N/A';
      })(),
      
      // Relationship
      'ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_REL_TO_APP': 
        this.mapRelationship(data.usPointOfContact?.contactRelationship || data.usPointOfContact?.relationship),
      
      // Contact Address
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_LN1': 
        data.usPointOfContact?.contactAddress1 || data.usPointOfContact?.address?.street1,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_LN2': 
        data.usPointOfContact?.contactAddress2 || data.usPointOfContact?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_CITY': 
        data.usPointOfContact?.contactCity || data.usPointOfContact?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_ADDR_STATE': 
        data.usPointOfContact?.contactState || data.usPointOfContact?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_POSTAL_CD': 
        data.usPointOfContact?.contactZipCode || data.usPointOfContact?.address?.zipCode,
      
      // Contact Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_HOME_TEL': 
        data.usPointOfContact?.contactPhone || data.usPointOfContact?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_EMAIL_ADDR': 
        data.usPointOfContact?.contactEmail || data.usPointOfContact?.email,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexUS_POC_EMAIL_ADDR_NA': 
        !data.usPointOfContact?.contactEmail && !data.usPointOfContact?.email,
      
      // === PRESENT WORK/EDUCATION/TRAINING INFORMATION PAGE ===
      // Primary Occupation
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPresentOccupation': 
        this.mapOccupation(data.workEducation?.primaryOccupation),
      
      // Employer/School Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchName': 
        this.sanitizeEmployerName(data.workEducation?.presentEmployer?.name || data.workEducation?.employerName),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchAddr1': 
        this.truncateAddress(data.workEducation?.presentEmployer?.address?.street1 || data.workEducation?.employerAddress),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchAddr2': 
        data.workEducation?.presentEmployer?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSchCity': 
        data.workEducation?.presentEmployer?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_ADDR_STATE': 
        data.workEducation?.presentEmployer?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxWORK_EDUC_ADDR_STATE_NA': 
        !data.workEducation?.presentEmployer?.address?.state || 
        data.workEducation?.presentEmployer?.address?.state === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_ADDR_POSTAL_CD': 
        data.workEducation?.presentEmployer?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxWORK_EDUC_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.presentEmployer?.address?.postalCode || 
        data.workEducation?.presentEmployer?.address?.postalCode === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpSchCountry': 
        this.mapCountry(data.workEducation?.presentEmployer?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxWORK_EDUC_TEL': 
        data.workEducation?.presentEmployer?.phone || data.workEducation?.employerPhone,
      
      // Employment Start Date
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromDay': 
        this.getDayFromDate(data.workEducation?.presentEmployer?.startDate || data.workEducation?.employmentStartDate),
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpDateFromMonth': 
        this.getMonthNumber(data.workEducation?.presentEmployer?.startDate || data.workEducation?.employmentStartDate),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpDateFromYear': 
        this.getYearFromDate(data.workEducation?.presentEmployer?.startDate || data.workEducation?.employmentStartDate),
      
      // Salary and Duties
      'ctl00_SiteContentPlaceHolder_FormView1_tbxCURR_MONTHLY_SALARY': 
        data.workEducation?.presentEmployer?.monthlyIncome || data.workEducation?.monthlyIncome,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxCURR_MONTHLY_SALARY_NA': 
        !data.workEducation?.presentEmployer?.monthlyIncome && !data.workEducation?.monthlyIncome,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxDescribeDuties': 
        data.workEducation?.presentEmployer?.duties || data.workEducation?.jobDuties,
      
      // === PREVIOUS WORK/EDUCATION/TRAINING INFORMATION PAGE ===
      // Main Questions
      'ctl00_SiteContentPlaceHolder_FormView1_rblPreviouslyEmployed_0': 
        data.workEducation?.previousEmployers && data.workEducation?.previousEmployers.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPreviouslyEmployed_1': 
        !data.workEducation?.previousEmployers || data.workEducation?.previousEmployers.length === 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherEduc_0': 
        data.workEducation?.previousEducation && data.workEducation?.previousEducation.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherEduc_1': 
        !data.workEducation?.previousEducation || data.workEducation?.previousEducation.length === 0,
      
      // Dynamic Previous Employers (up to 5 entries typically)
      // First Employer (ctl00)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[0]?.employerName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[0]?.employerStreetAddress1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[0]?.employerStreetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[0]?.employerCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[0]?.employerState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[0]?.employerState || 
        data.workEducation?.previousEmployers?.[0]?.employerStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[0]?.employerPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[0]?.employerPostalCode || 
        data.workEducation?.previousEmployers?.[0]?.employerPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[0]?.employerCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[0]?.employerPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbJobTitle': 
        data.workEducation?.previousEmployers?.[0]?.jobTitle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[0]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[0]?.supervisorSurname || 
        data.workEducation?.previousEmployers?.[0]?.supervisorSurnameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[0]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[0]?.supervisorGivenName || 
        data.workEducation?.previousEmployers?.[0]?.supervisorGivenNameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateFromDay': 
        data.workEducation?.previousEmployers?.[0]?.empDateFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateFromMonth': 
        data.workEducation?.previousEmployers?.[0]?.empDateFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxEmpDateFromYear': 
        data.workEducation?.previousEmployers?.[0]?.empDateFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateToDay': 
        data.workEducation?.previousEmployers?.[0]?.empDateToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateToMonth': 
        data.workEducation?.previousEmployers?.[0]?.empDateToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxEmpDateToYear': 
        data.workEducation?.previousEmployers?.[0]?.empDateToYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[0]?.describeDuties,
      
      // Second Employer (ctl01) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[1]?.employerName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[1]?.employerStreetAddress1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[1]?.employerStreetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[1]?.employerCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[1]?.employerState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[1]?.employerState || 
        data.workEducation?.previousEmployers?.[1]?.employerStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[1]?.employerPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[1]?.employerPostalCode || 
        data.workEducation?.previousEmployers?.[1]?.employerPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[1]?.employerCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[1]?.employerPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbJobTitle': 
        data.workEducation?.previousEmployers?.[1]?.jobTitle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[1]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[1]?.supervisorSurname || 
        data.workEducation?.previousEmployers?.[1]?.supervisorSurnameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[1]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[1]?.supervisorGivenName || 
        data.workEducation?.previousEmployers?.[1]?.supervisorGivenNameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateFromDay': 
        data.workEducation?.previousEmployers?.[1]?.empDateFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateFromMonth': 
        data.workEducation?.previousEmployers?.[1]?.empDateFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxEmpDateFromYear': 
        data.workEducation?.previousEmployers?.[1]?.empDateFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateToDay': 
        data.workEducation?.previousEmployers?.[1]?.empDateToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateToMonth': 
        data.workEducation?.previousEmployers?.[1]?.empDateToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxEmpDateToYear': 
        data.workEducation?.previousEmployers?.[1]?.empDateToYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[1]?.describeDuties,
      
      // Third Employer (ctl02) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[2]?.employerName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[2]?.employerStreetAddress1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[2]?.employerStreetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[2]?.employerCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[2]?.employerState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[2]?.employerState || 
        data.workEducation?.previousEmployers?.[2]?.employerStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[2]?.employerPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[2]?.employerPostalCode || 
        data.workEducation?.previousEmployers?.[2]?.employerPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[2]?.employerCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[2]?.employerPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbJobTitle': 
        data.workEducation?.previousEmployers?.[2]?.jobTitle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[2]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[2]?.supervisorSurname || 
        data.workEducation?.previousEmployers?.[2]?.supervisorSurnameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[2]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[2]?.supervisorGivenName || 
        data.workEducation?.previousEmployers?.[2]?.supervisorGivenNameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateFromDay': 
        data.workEducation?.previousEmployers?.[2]?.empDateFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateFromMonth': 
        data.workEducation?.previousEmployers?.[2]?.empDateFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxEmpDateFromYear': 
        data.workEducation?.previousEmployers?.[2]?.empDateFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateToDay': 
        data.workEducation?.previousEmployers?.[2]?.empDateToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateToMonth': 
        data.workEducation?.previousEmployers?.[2]?.empDateToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxEmpDateToYear': 
        data.workEducation?.previousEmployers?.[2]?.empDateToYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[2]?.describeDuties,
      
      // Fourth Employer (ctl03) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[3]?.employerName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[3]?.employerStreetAddress1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[3]?.employerStreetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[3]?.employerCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[3]?.employerState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[3]?.employerState || 
        data.workEducation?.previousEmployers?.[3]?.employerStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[3]?.employerPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[3]?.employerPostalCode || 
        data.workEducation?.previousEmployers?.[3]?.employerPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[3]?.employerCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[3]?.employerPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbJobTitle': 
        data.workEducation?.previousEmployers?.[3]?.jobTitle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[3]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[3]?.supervisorSurname || 
        data.workEducation?.previousEmployers?.[3]?.supervisorSurnameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[3]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[3]?.supervisorGivenName || 
        data.workEducation?.previousEmployers?.[3]?.supervisorGivenNameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateFromDay': 
        data.workEducation?.previousEmployers?.[3]?.empDateFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateFromMonth': 
        data.workEducation?.previousEmployers?.[3]?.empDateFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxEmpDateFromYear': 
        data.workEducation?.previousEmployers?.[3]?.empDateFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateToDay': 
        data.workEducation?.previousEmployers?.[3]?.empDateToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateToMonth': 
        data.workEducation?.previousEmployers?.[3]?.empDateToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxEmpDateToYear': 
        data.workEducation?.previousEmployers?.[3]?.empDateToYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[3]?.describeDuties,
      
      // Fifth Employer (ctl04) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[4]?.employerName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[4]?.employerStreetAddress1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[4]?.employerStreetAddress2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[4]?.employerCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[4]?.employerState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[4]?.employerState || 
        data.workEducation?.previousEmployers?.[4]?.employerStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[4]?.employerPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[4]?.employerPostalCode || 
        data.workEducation?.previousEmployers?.[4]?.employerPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[4]?.employerCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[4]?.employerPhone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbJobTitle': 
        data.workEducation?.previousEmployers?.[4]?.jobTitle,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[4]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[4]?.supervisorSurname || 
        data.workEducation?.previousEmployers?.[4]?.supervisorSurnameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[4]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[4]?.supervisorGivenName || 
        data.workEducation?.previousEmployers?.[4]?.supervisorGivenNameNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateFromDay': 
        data.workEducation?.previousEmployers?.[4]?.empDateFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateFromMonth': 
        data.workEducation?.previousEmployers?.[4]?.empDateFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxEmpDateFromYear': 
        data.workEducation?.previousEmployers?.[4]?.empDateFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateToDay': 
        data.workEducation?.previousEmployers?.[4]?.empDateToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateToMonth': 
        data.workEducation?.previousEmployers?.[4]?.empDateToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxEmpDateToYear': 
        data.workEducation?.previousEmployers?.[4]?.empDateToYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[4]?.describeDuties,
      
      // Dynamic Previous Education (up to 5 entries typically)
      // First School (ctl00)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.previousEducation?.[0]?.schoolName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.previousEducation?.[0]?.schoolAddr1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolAddr2': 
        data.workEducation?.previousEducation?.[0]?.schoolAddr2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolCity': 
        data.workEducation?.previousEducation?.[0]?.schoolCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.previousEducation?.[0]?.educInstAddrState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.previousEducation?.[0]?.educInstAddrState || 
        data.workEducation?.previousEducation?.[0]?.educInstAddrStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.previousEducation?.[0]?.educInstPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.previousEducation?.[0]?.educInstPostalCode || 
        data.workEducation?.previousEducation?.[0]?.educInstPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.previousEducation?.[0]?.schoolCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolCourseOfStudy': 
        data.workEducation?.previousEducation?.[0]?.schoolCourseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolFromDay': 
        data.workEducation?.previousEducation?.[0]?.schoolFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolFromMonth': 
        data.workEducation?.previousEducation?.[0]?.schoolFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolFromYear': 
        data.workEducation?.previousEducation?.[0]?.schoolFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolToDay': 
        data.workEducation?.previousEducation?.[0]?.schoolToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolToMonth': 
        data.workEducation?.previousEducation?.[0]?.schoolToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolToYear': 
        data.workEducation?.previousEducation?.[0]?.schoolToYear,
      
      // Second School (ctl01) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.previousEducation?.[1]?.schoolName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.previousEducation?.[1]?.schoolAddr1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolAddr2': 
        data.workEducation?.previousEducation?.[1]?.schoolAddr2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolCity': 
        data.workEducation?.previousEducation?.[1]?.schoolCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.previousEducation?.[1]?.educInstAddrState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.previousEducation?.[1]?.educInstAddrState || 
        data.workEducation?.previousEducation?.[1]?.educInstAddrStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.previousEducation?.[1]?.educInstPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.previousEducation?.[1]?.educInstPostalCode || 
        data.workEducation?.previousEducation?.[1]?.educInstPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.previousEducation?.[1]?.schoolCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolCourseOfStudy': 
        data.workEducation?.previousEducation?.[1]?.schoolCourseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolFromDay': 
        data.workEducation?.previousEducation?.[1]?.schoolFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolFromMonth': 
        data.workEducation?.previousEducation?.[1]?.schoolFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolFromYear': 
        data.workEducation?.previousEducation?.[1]?.schoolFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolToDay': 
        data.workEducation?.previousEducation?.[1]?.schoolToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolToMonth': 
        data.workEducation?.previousEducation?.[1]?.schoolToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolToYear': 
        data.workEducation?.previousEducation?.[1]?.schoolToYear,
      
      // Third School (ctl02) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.previousEducation?.[2]?.schoolName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.previousEducation?.[2]?.schoolAddr1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolAddr2': 
        data.workEducation?.previousEducation?.[2]?.schoolAddr2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolCity': 
        data.workEducation?.previousEducation?.[2]?.schoolCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.previousEducation?.[2]?.educInstAddrState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.previousEducation?.[2]?.educInstAddrState || 
        data.workEducation?.previousEducation?.[2]?.educInstAddrStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.previousEducation?.[2]?.educInstPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.previousEducation?.[2]?.educInstPostalCode || 
        data.workEducation?.previousEducation?.[2]?.educInstPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.previousEducation?.[2]?.schoolCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolCourseOfStudy': 
        data.workEducation?.previousEducation?.[2]?.schoolCourseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolFromDay': 
        data.workEducation?.previousEducation?.[2]?.schoolFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolFromMonth': 
        data.workEducation?.previousEducation?.[2]?.schoolFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolFromYear': 
        data.workEducation?.previousEducation?.[2]?.schoolFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolToDay': 
        data.workEducation?.previousEducation?.[2]?.schoolToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolToMonth': 
        data.workEducation?.previousEducation?.[2]?.schoolToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolToYear': 
        data.workEducation?.previousEducation?.[2]?.schoolToYear,
      
      // Fourth School (ctl03) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.previousEducation?.[3]?.schoolName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.previousEducation?.[3]?.schoolAddr1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolAddr2': 
        data.workEducation?.previousEducation?.[3]?.schoolAddr2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolCity': 
        data.workEducation?.previousEducation?.[3]?.schoolCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.previousEducation?.[3]?.educInstAddrState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.previousEducation?.[3]?.educInstAddrState || 
        data.workEducation?.previousEducation?.[3]?.educInstAddrStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.previousEducation?.[3]?.educInstPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.previousEducation?.[3]?.educInstPostalCode || 
        data.workEducation?.previousEducation?.[3]?.educInstPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.previousEducation?.[3]?.schoolCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolCourseOfStudy': 
        data.workEducation?.previousEducation?.[3]?.schoolCourseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolFromDay': 
        data.workEducation?.previousEducation?.[3]?.schoolFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolFromMonth': 
        data.workEducation?.previousEducation?.[3]?.schoolFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolFromYear': 
        data.workEducation?.previousEducation?.[3]?.schoolFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolToDay': 
        data.workEducation?.previousEducation?.[3]?.schoolToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolToMonth': 
        data.workEducation?.previousEducation?.[3]?.schoolToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolToYear': 
        data.workEducation?.previousEducation?.[3]?.schoolToYear,
      
      // Fifth School (ctl04) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.previousEducation?.[4]?.schoolName),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.previousEducation?.[4]?.schoolAddr1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolAddr2': 
        data.workEducation?.previousEducation?.[4]?.schoolAddr2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolCity': 
        data.workEducation?.previousEducation?.[4]?.schoolCity,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.previousEducation?.[4]?.educInstAddrState,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.previousEducation?.[4]?.educInstAddrState || 
        data.workEducation?.previousEducation?.[4]?.educInstAddrStateNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.previousEducation?.[4]?.educInstPostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.previousEducation?.[4]?.educInstPostalCode || 
        data.workEducation?.previousEducation?.[4]?.educInstPostalCodeNA === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.previousEducation?.[4]?.schoolCountry),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolCourseOfStudy': 
        data.workEducation?.previousEducation?.[4]?.schoolCourseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolFromDay': 
        data.workEducation?.previousEducation?.[4]?.schoolFromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolFromMonth': 
        data.workEducation?.previousEducation?.[4]?.schoolFromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolFromYear': 
        data.workEducation?.previousEducation?.[4]?.schoolFromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolToDay': 
        data.workEducation?.previousEducation?.[4]?.schoolToDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolToMonth': 
        data.workEducation?.previousEducation?.[4]?.schoolToMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolToYear': 
        data.workEducation?.previousEducation?.[4]?.schoolToYear,
      
      // === ADDITIONAL WORK/EDUCATION/TRAINING INFORMATION PAGE ===
      // Languages
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl00_tbxLANGUAGE_NAME': 
        data.workEducation?.languages?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl01_tbxLANGUAGE_NAME': 
        data.workEducation?.languages?.[1],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl02_tbxLANGUAGE_NAME': 
        data.workEducation?.languages?.[2],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl03_tbxLANGUAGE_NAME': 
        data.workEducation?.languages?.[3],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl04_tbxLANGUAGE_NAME': 
        data.workEducation?.languages?.[4],
      
      // Countries Visited in Last 5 Years
      'ctl00_SiteContentPlaceHolder_FormView1_rblCOUNTRIES_VISITED_IND_0': 
        data.workEducation?.countriesVisited5Years && data.workEducation?.countriesVisited5Years.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblCOUNTRIES_VISITED_IND_1': 
        !data.workEducation?.countriesVisited5Years || data.workEducation?.countriesVisited5Years.length === 0,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl00_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited5Years?.[0]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl01_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited5Years?.[1]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl02_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited5Years?.[2]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl03_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited5Years?.[3]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl04_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited5Years?.[4]),
      
      // Clan/Tribe Membership
      'ctl00_SiteContentPlaceHolder_FormView1_rblCLAN_TRIBE_IND_0': 
        data.workEducation?.clanTribeMembership === 'YES' || data.workEducation?.clanTribeMembership === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblCLAN_TRIBE_IND_1': 
        data.workEducation?.clanTribeMembership === 'NO' || data.workEducation?.clanTribeMembership === false || 
        !data.workEducation?.clanTribeMembership,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxCLAN_TRIBE_NAME': 
        data.workEducation?.clanTribeName,
      
      // Organization Membership
      'ctl00_SiteContentPlaceHolder_FormView1_rblORGANIZATION_IND_0': 
        data.workEducation?.organizationMembership === 'YES' || 
        (data.workEducation?.organizations && data.workEducation?.organizations.length > 0),
      'ctl00_SiteContentPlaceHolder_FormView1_rblORGANIZATION_IND_1': 
        data.workEducation?.organizationMembership === 'NO' || 
        !data.workEducation?.organizations || data.workEducation?.organizations.length === 0,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl00_tbxORGANIZATION_NAME': 
        data.workEducation?.organizations?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl01_tbxORGANIZATION_NAME': 
        data.workEducation?.organizations?.[1],
      
      // Military Service
      'ctl00_SiteContentPlaceHolder_FormView1_rblMILITARY_SERVICE_IND_0': 
        data.workEducation?.hasMilitaryService === 'YES' || data.workEducation?.hasMilitaryService === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblMILITARY_SERVICE_IND_1': 
        data.workEducation?.hasMilitaryService === 'NO' || data.workEducation?.hasMilitaryService === false || 
        !data.workEducation?.hasMilitaryService,
      
      // Military Service Details (dynamic)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_CNTRY': 
        this.mapCountry(data.workEducation?.militaryService?.[0]?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_BRANCH': 
        data.workEducation?.militaryService?.[0]?.branch,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_RANK': 
        data.workEducation?.militaryService?.[0]?.rank,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_SPECIALTY': 
        data.workEducation?.militaryService?.[0]?.specialty,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_FROMDay': 
        data.workEducation?.militaryService?.[0]?.fromDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_FROMMonth': 
        data.workEducation?.militaryService?.[0]?.fromMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_FROMYear': 
        data.workEducation?.militaryService?.[0]?.fromYear,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_TODay': 
        data.workEducation?.militaryService?.[0]?.toDay,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_TOMonth': 
        data.workEducation?.militaryService?.[0]?.toMonth,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_TOYear': 
        data.workEducation?.militaryService?.[0]?.toYear,
      
      // Specialized Skills
      'ctl00_SiteContentPlaceHolder_FormView1_rblSPECIALIZED_SKILLS_IND_0': 
        data.workEducation?.specialSkills && data.workEducation?.specialSkills !== 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_rblSPECIALIZED_SKILLS_IND_1': 
        !data.workEducation?.specialSkills || data.workEducation?.specialSkills === 'N/A',
      
      // Security Questions (Default to NO unless explicitly stated)
      'ctl00_SiteContentPlaceHolder_FormView1_rblINSURGENT_ORG_IND_0': 
        data.workEducation?.insurgentOrganization === true || data.workEducation?.insurgentOrganization === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblINSURGENT_ORG_IND_1': 
        data.workEducation?.insurgentOrganization !== true && data.workEducation?.insurgentOrganization !== 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTALIBAN_IND_0': 
        data.workEducation?.talibanAssociation === true || data.workEducation?.talibanAssociation === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTALIBAN_IND_1': 
        data.workEducation?.talibanAssociation !== true && data.workEducation?.talibanAssociation !== 'YES',
      
      // === SECURITY AND BACKGROUND: PART 1 PAGE ===
      // Medical/Health Questions - DEFAULT TO NO unless explicitly stated
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisease_0': 
        data.security?.medicalHealth?.hasInfectiousDisease === true || 
        data.security?.medicalHealth?.hasInfectiousDisease === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisease_1': 
        data.security?.medicalHealth?.hasInfectiousDisease !== true && 
        data.security?.medicalHealth?.hasInfectiousDisease !== 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisorder_0': 
        data.security?.medicalHealth?.hasMentalDisorder === true || 
        data.security?.medicalHealth?.hasMentalDisorder === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisorder_1': 
        data.security?.medicalHealth?.hasMentalDisorder !== true && 
        data.security?.medicalHealth?.hasMentalDisorder !== 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblDruguser_0': 
        data.security?.medicalHealth?.hasDrugAbuse === true || 
        data.security?.medicalHealth?.hasDrugAbuse === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblDruguser_1': 
        data.security?.medicalHealth?.hasDrugAbuse !== true && 
        data.security?.medicalHealth?.hasDrugAbuse !== 'YES',
        
      // === SECURITY AND BACKGROUND: PART 2 PAGE ===
      // Criminal/Security Questions - DEFAULT TO NO unless explicitly stated
      // Arrested or convicted
      'ctl00_SiteContentPlaceHolder_FormView1_rblArrested_0': 
        data.security?.criminal?.hasBeenArrested === true || 
        data.security?.criminal?.hasBeenArrested === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblArrested_1': 
        data.security?.criminal?.hasBeenArrested !== true && 
        data.security?.criminal?.hasBeenArrested !== 'YES',
        
      // Controlled substances violation
      'ctl00_SiteContentPlaceHolder_FormView1_rblControlledSubstances_0': 
        data.security?.criminal?.hasViolatedDrugLaw === true || 
        data.security?.criminal?.hasViolatedDrugLaw === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblControlledSubstances_1': 
        data.security?.criminal?.hasViolatedDrugLaw !== true && 
        data.security?.criminal?.hasViolatedDrugLaw !== 'YES',
        
      // Prostitution
      'ctl00_SiteContentPlaceHolder_FormView1_rblProstitution_0': 
        data.security?.criminal?.hasEngagedInProstitution === true || 
        data.security?.criminal?.hasEngagedInProstitution === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblProstitution_1': 
        data.security?.criminal?.hasEngagedInProstitution !== true && 
        data.security?.criminal?.hasEngagedInProstitution !== 'YES',
        
      // Money laundering
      'ctl00_SiteContentPlaceHolder_FormView1_rblMoneyLaundering_0': 
        data.security?.criminal?.hasEngagedInMoneyLaundering === true || 
        data.security?.criminal?.hasEngagedInMoneyLaundering === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblMoneyLaundering_1': 
        data.security?.criminal?.hasEngagedInMoneyLaundering !== true && 
        data.security?.criminal?.hasEngagedInMoneyLaundering !== 'YES',
        
      // Human trafficking
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTrafficking_0': 
        data.security?.criminal?.hasCommittedHumanTrafficking === true || 
        data.security?.criminal?.hasCommittedHumanTrafficking === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTrafficking_1': 
        data.security?.criminal?.hasCommittedHumanTrafficking !== true && 
        data.security?.criminal?.hasCommittedHumanTrafficking !== 'YES',
        
      // Assisted severe trafficking
      'ctl00_SiteContentPlaceHolder_FormView1_rblAssistedSevereTrafficking_0': 
        data.security?.criminal?.hasAssistedInTrafficking === true || 
        data.security?.criminal?.hasAssistedInTrafficking === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblAssistedSevereTrafficking_1': 
        data.security?.criminal?.hasAssistedInTrafficking !== true && 
        data.security?.criminal?.hasAssistedInTrafficking !== 'YES',
        
      // Human trafficking related (spouse/son/daughter)
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTraffickingRelated_0': 
        data.security?.criminal?.isRelatedToTrafficker === true || 
        data.security?.criminal?.isRelatedToTrafficker === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTraffickingRelated_1': 
        data.security?.criminal?.isRelatedToTrafficker !== true && 
        data.security?.criminal?.isRelatedToTrafficker !== 'YES',
        
      // === SECURITY AND BACKGROUND: PART 3 PAGE ===
      // Security/Terrorism Questions - DEFAULT TO NO unless explicitly stated
      
      // Illegal activity/espionage/sabotage
      'ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity_0':
        data.security?.part3?.illegalActivity === true ||
        data.security?.securityViolations?.hasOtherIllegalActivity === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity_1':
        data.security?.part3?.illegalActivity !== true &&
        data.security?.securityViolations?.hasOtherIllegalActivity !== 'YES',
        
      // Terrorist activity
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristActivity_0':
        data.security?.part3?.terroristActivity === true ||
        data.security?.securityViolations?.hasTerrorism === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristActivity_1':
        data.security?.part3?.terroristActivity !== true &&
        data.security?.securityViolations?.hasTerrorism !== 'YES',
        
      // Terrorist support (financial)
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristSupport_0':
        data.security?.part3?.terroristSupport === true ||
        data.security?.securityViolations?.hasProvidedFinancialSupport === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristSupport_1':
        data.security?.part3?.terroristSupport !== true &&
        data.security?.securityViolations?.hasProvidedFinancialSupport !== 'YES',
        
      // Terrorist organization member
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristOrg_0':
        data.security?.part3?.terroristOrg === true ||
        data.security?.securityViolations?.hasTerroristMembership === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristOrg_1':
        data.security?.part3?.terroristOrg !== true &&
        data.security?.securityViolations?.hasTerroristMembership !== 'YES',
        
      // Related to terrorist (spouse, son, or daughter)
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristRel_0':
        data.security?.part3?.terroristRelated === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristRel_1':
        data.security?.part3?.terroristRelated !== true,
        
      // Genocide
      'ctl00_SiteContentPlaceHolder_FormView1_rblGenocide_0':
        data.security?.part3?.genocide === true ||
        data.security?.securityViolations?.hasGenocide === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblGenocide_1':
        data.security?.part3?.genocide !== true &&
        data.security?.securityViolations?.hasGenocide !== 'YES',
        
      // Torture
      'ctl00_SiteContentPlaceHolder_FormView1_rblTorture_0':
        data.security?.part3?.torture === true ||
        data.security?.securityViolations?.hasTorture === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTorture_1':
        data.security?.part3?.torture !== true &&
        data.security?.securityViolations?.hasTorture !== 'YES',
        
      // Extrajudicial/political killings
      'ctl00_SiteContentPlaceHolder_FormView1_rblExViolence_0':
        data.security?.part3?.extrajudicialViolence === true ||
        data.security?.securityViolations?.hasExtrajudicialKillings === 'YES' ||
        data.security?.securityViolations?.hasPoliticalKillings === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblExViolence_1':
        data.security?.part3?.extrajudicialViolence !== true &&
        data.security?.securityViolations?.hasExtrajudicialKillings !== 'YES' &&
        data.security?.securityViolations?.hasPoliticalKillings !== 'YES',
        
      // Child soldier
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildSoldier_0':
        data.security?.part3?.childSoldier === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildSoldier_1':
        data.security?.part3?.childSoldier !== true,
        
      // Religious freedom violation
      'ctl00_SiteContentPlaceHolder_FormView1_rblReligiousFreedom_0':
        data.security?.part3?.religiousFreedom === true ||
        data.security?.securityViolations?.hasReligiousFreedomViolation === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblReligiousFreedom_1':
        data.security?.part3?.religiousFreedom !== true &&
        data.security?.securityViolations?.hasReligiousFreedomViolation !== 'YES',
        
      // Population controls (forced abortion/sterilization)
      'ctl00_SiteContentPlaceHolder_FormView1_rblPopulationControls_0':
        data.security?.part3?.populationControls === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPopulationControls_1':
        data.security?.part3?.populationControls !== true,
        
      // Organ transplant
      'ctl00_SiteContentPlaceHolder_FormView1_rblTransplant_0':
        data.security?.part3?.organTransplant === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblTransplant_1':
        data.security?.part3?.organTransplant !== true,
        
      // === SECURITY AND BACKGROUND: PART 4 PAGE ===
      // Immigration Questions - DEFAULT TO NO unless explicitly stated
      
      // Immigration fraud/misrepresentation
      'ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud_0':
        data.security?.part4?.immigrationFraud === true ||
        data.security?.immigration?.hasImmigrationFraud === 'YES' ||
        data.security?.immigration?.hasVisaFraud === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud_1':
        data.security?.part4?.immigrationFraud !== true &&
        data.security?.immigration?.hasImmigrationFraud !== 'YES' &&
        data.security?.immigration?.hasVisaFraud !== 'YES',
        
      // Failed to attend removal proceedings
      'ctl00_SiteContentPlaceHolder_FormView1_rblFailToAttend_0':
        data.security?.part4?.failedToAttend === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblFailToAttend_1':
        data.security?.part4?.failedToAttend !== true,
        
      // Unlawful presence (subject to 3 or 10 year bar)
      'ctl00_SiteContentPlaceHolder_FormView1_rblVisaViolation_0':
        data.security?.part4?.visaViolation === true ||
        data.security?.other?.hasViolatedUSVisa === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblVisaViolation_1':
        data.security?.part4?.visaViolation !== true &&
        data.security?.other?.hasViolatedUSVisa !== 'YES',
        
      // Removal hearing (ordered to appear before immigration judge)
      'ctl00_SiteContentPlaceHolder_FormView1_rblRemovalHearing_0':
        data.security?.part4?.removalHearing === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblRemovalHearing_1':
        data.security?.part4?.removalHearing !== true,
        
      // Deportation or removal from US
      'ctl00_SiteContentPlaceHolder_FormView1_rblDeport_0':
        data.security?.part4?.deported === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblDeport_1':
        data.security?.part4?.deported !== true,
        
      // === SECURITY AND BACKGROUND: PART 5 PAGE ===
      // Other Questions - DEFAULT TO NO unless explicitly stated
      
      // Child custody
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody_0':
        data.security?.part5?.childCustody === true ||
        data.security?.other?.hasChildCustodyIssue === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody_1':
        data.security?.part5?.childCustody !== true &&
        data.security?.other?.hasChildCustodyIssue !== 'YES',
        
      // Voting violation
      'ctl00_SiteContentPlaceHolder_FormView1_rblVotingViolation_0':
        data.security?.part5?.votingViolation === true ||
        data.security?.other?.hasVotingViolation === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblVotingViolation_1':
        data.security?.part5?.votingViolation !== true &&
        data.security?.other?.hasVotingViolation !== 'YES',
        
      // Renounced US citizenship for tax purposes
      'ctl00_SiteContentPlaceHolder_FormView1_rblRenounceExp_0':
        data.security?.part5?.renounceExpenses === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblRenounceExp_1':
        data.security?.part5?.renounceExpenses !== true,
        
      // Attended public school (F-1 violation)
      'ctl00_SiteContentPlaceHolder_FormView1_rblSchoolViolation_0':
        data.security?.other?.hasAttendedPublicSchool === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblSchoolViolation_1':
        data.security?.other?.hasAttendedPublicSchool !== 'YES',
        
      // Exchange visitor (J-1/J-2) subject to 2-year foreign residence requirement
      'ctl00_SiteContentPlaceHolder_FormView1_rblExchangeVisitor_0':
        data.security?.part5?.exchangeVisitor === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblExchangeVisitor_1':
        data.security?.part5?.exchangeVisitor !== true,
        
      // Attended public elementary school or adult education without reimbursement
      'ctl00_SiteContentPlaceHolder_FormView1_rblAttWoReimb_0':
        data.security?.part5?.attendedWithoutReimbursement === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblAttWoReimb_1':
        data.security?.part5?.attendedWithoutReimbursement !== true,
        
      // === TEMPORARY WORK VISA INFORMATION PAGE ===
      // Application Receipt/Petition Number (still using WP_APP_RCPT_NUM for this field)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxWP_APP_RCPT_NUM': 
        data.travel?.petitionNumber || data.petition?.receiptNumber || data.temporaryWork?.petitionNumber || data.petitionerInfo?.petitionNumber,
        
      // Name of Person/Company who Filed Petition
      'ctl00_SiteContentPlaceHolder_FormView1_tbxNameOfPetitioner':
        data.petition?.petitionerName || data.temporaryWork?.petitionerName || data.petitionerInfo?.petitionerCompanyName,
        
      // Where Do You Intend to Work - Employer Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmployerName':
        data.temporaryWork?.intendedEmployer?.name || data.petition?.employerName || data.petitionerInfo?.petitionerCompanyName,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress1':
        data.temporaryWork?.intendedEmployer?.address1 || data.petition?.employerAddress1 || data.petitionerInfo?.petitionerAddress?.street1,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress2':
        data.temporaryWork?.intendedEmployer?.address2 || data.petition?.employerAddress2 || data.petitionerInfo?.petitionerAddress?.street2,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpCity':
        data.temporaryWork?.intendedEmployer?.city || data.petition?.employerCity || data.petitionerInfo?.petitionerAddress?.city,
        
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpState':
        data.temporaryWork?.intendedEmployer?.state || data.petition?.employerState || data.petitionerInfo?.petitionerAddress?.state,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxZIPCode':
        data.temporaryWork?.intendedEmployer?.zipCode || data.petition?.employerZipCode || data.petitionerInfo?.petitionerAddress?.postalCode,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTEMP_WORK_TEL':
        data.temporaryWork?.intendedEmployer?.phone || data.petition?.employerPhone || data.petitionerInfo?.petitionerPhone,
        
      // Monthly Income in USD
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSalaryInUSD':
        data.temporaryWork?.monthlyIncome || data.petition?.monthlyIncome || 
        (data.workEducation?.presentEmployer?.monthlyIncome ? String(data.workEducation.presentEmployer.monthlyIncome) : null),
    };

    // Check direct mapping first
    if (fieldMappings.hasOwnProperty(fieldId)) {
      return fieldMappings[fieldId];
    }
    
    // Check radio mappings
    if (radioMappings.hasOwnProperty(fieldId)) {
      return radioMappings[fieldId];
    }
    
    return null;
  }

  // Parse date string and return month value for DS-160 dropdowns
  getMonthNumber(dateStr) {
    if (!dateStr || dateStr === 'N/A') return null;
    
    console.log(`getMonthNumber called with: ${dateStr}`);
    
    // DS-160 month dropdowns can expect either:
    // 1. Month abbreviation (e.g., "JAN", "FEB", "JUL")
    // 2. Numeric value (e.g., "01", "02", "07")
    
    // Check for month name format (e.g., "09-JUL-2025")
    const parts = dateStr.toUpperCase().split(/[-/]/);
    const monthAbbreviations = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                                 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    console.log(`Date parts: ${parts.join(', ')}`);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const monthIndex = monthAbbreviations.indexOf(part);
      if (monthIndex !== -1) {
        // Found month abbreviation - return numeric value for dropdown with leading zero
        console.log(`Found month abbreviation: ${part} (index: ${monthIndex + 1})`);
        return (monthIndex + 1).toString().padStart(2, '0'); // Return "01" for JAN, "02" for FEB, etc.
      }
    }
    
    // If numeric format (e.g., "1991-09-20"), convert to abbreviation
    const numericParts = dateStr.split(/[-/]/);
    if (numericParts.length === 3) {
      let monthNum;
      if (numericParts[0].length === 4) {
        // YYYY-MM-DD format
        monthNum = parseInt(numericParts[1]);
      } else if (numericParts[2].length === 4) {
        // DD-MM-YYYY or MM-DD-YYYY
        // Assume MM-DD-YYYY for US format
        monthNum = parseInt(numericParts[0]);
      }
      
      if (monthNum >= 1 && monthNum <= 12) {
        // Return the numeric value for dropdown with leading zero
        console.log(`Found numeric month: ${monthNum}`);
        return monthNum.toString().padStart(2, '0');
      }
    }
    
    console.log(`Could not parse month from: ${dateStr}`);
    return null;
  }

  // Helper functions
  mapGender(gender) {
    if (!gender) return null;
    
    const genderMap = {
      'M': 'MALE',
      'MALE': 'MALE',
      'F': 'FEMALE',
      'FEMALE': 'FEMALE'
    };
    
    return genderMap[gender.toUpperCase()] || gender;
  }

  mapMaritalStatus(status) {
    if (!status) return null;
    
    const statusMap = {
      'SINGLE': 'S',
      'S': 'S',
      'MARRIED': 'M',
      'M': 'M',
      'DIVORCED': 'D',
      'D': 'D',
      'WIDOWED': 'W',
      'W': 'W',
      'SEPARATED': 'P',
      'P': 'P',
      'LEGAL SEPARATION': 'L',
      'L': 'L',
      'CIVIL UNION': 'C',
      'C': 'C',
      'DOMESTIC PARTNERSHIP': 'O',
      'O': 'O'
    };
    
    return statusMap[status.toUpperCase()] || status;
  }

  mapCountry(country) {
    console.log(`mapCountry called with: "${country}"`);
    if (!country || country === 'N/A') {
      console.log('Country is null or N/A, returning null');
      return null;
    }
    
    // DS-160 uses country CODES in the dropdown, not full names
    // Map from full country names (what Gemini outputs) to DS-160 codes
    const countryMap = {
      // Full names to DS-160 codes
      'UNITED STATES': 'USA',
      'USA': 'USA',
      'US': 'USA',
      'AMERICA': 'USA',
      
      'CHINA': 'CHIN',
      'PRC': 'CHIN',
      'PEOPLE\'S REPUBLIC OF CHINA': 'CHIN',
      'CHIN': 'CHIN',
      
      'JAPAN': 'JPN',
      'JPN': 'JPN',
      
      'CANADA': 'CAN',
      'CAN': 'CAN',
      
      'KOREA': 'KOR',
      'SOUTH KOREA': 'KOR',
      'KOREA, SOUTH': 'KOR',
      'REPUBLIC OF KOREA': 'KOR',
      'KOREA, REPUBLIC OF (SOUTH)': 'KOR',
      'KOR': 'KOR',
      
      'NORTH KOREA': 'PRK',
      'KOREA, NORTH': 'PRK',
      'DPRK': 'PRK',
      
      'UNITED KINGDOM': 'GRBR',
      'UK': 'GRBR',
      'GREAT BRITAIN': 'GRBR',
      'ENGLAND': 'GRBR',
      'SCOTLAND': 'GRBR',
      'WALES': 'GRBR',
      
      'GERMANY': 'GER',
      'DEUTSCHLAND': 'GER',
      
      'FRANCE': 'FRAN',
      
      'INDIA': 'IND',
      'IND': 'IND',
      
      'MEXICO': 'MEX',
      'MEX': 'MEX',
      
      'BRAZIL': 'BRZL',
      'BRASIL': 'BRZL',
      
      'AUSTRALIA': 'ASTL',
      'AUS': 'ASTL',
      
      'ITALY': 'ITLY',
      'ITALIA': 'ITLY',
      
      'SPAIN': 'SPN',
      'ESPANA': 'SPN',
      'ESPAÑA': 'SPN',
      
      'RUSSIA': 'RUS',
      'RUSSIAN FEDERATION': 'RUS',
      
      'PHILIPPINES': 'PHIL',
      'PHIL': 'PHIL',
      
      'TAIWAN': 'TWAN',
      'CHINESE TAIPEI': 'TWAN',
      'TW': 'TWAN',
      
      'SINGAPORE': 'SING',
      'SGP': 'SING',
      
      'HONG KONG': 'HNK',
      'HK': 'HNK',
      'HONG KONG SAR': 'HNK',
      
      'THAILAND': 'THAI',
      
      'VIETNAM': 'VTNM',
      'VIET NAM': 'VTNM',
      
      'INDONESIA': 'IDSA',
      
      'MALAYSIA': 'MLAS',
      
      'NETHERLANDS': 'NL',
      'HOLLAND': 'NL',
      
      'BELGIUM': 'B',
      
      'SWITZERLAND': 'CH',
      
      'SWEDEN': 'S',
      
      'NORWAY': 'N',
      
      'DENMARK': 'DK',
      
      'FINLAND': 'SF',
      
      'POLAND': 'PL',
      
      'IRELAND': 'IRL',
      
      'NEW ZEALAND': 'NZ',
      'NZ': 'NZ',
      
      'ARGENTINA': 'RA',
      
      'CHILE': 'RCH',
      
      'COLOMBIA': 'CO',
      
      'PERU': 'PE',
      
      'VENEZUELA': 'YV',
      
      'ISRAEL': 'IL',
      
      'SAUDI ARABIA': 'SA',
      'KSA': 'SA',
      
      'UAE': 'UAE',
      'UNITED ARAB EMIRATES': 'UAE',
      
      'TURKEY': 'TR',
      'TURKIYE': 'TR',
      
      'EGYPT': 'ET',
      
      'SOUTH AFRICA': 'ZA',
      
      'NIGERIA': 'WAN',
      
      'PAKISTAN': 'PK',
      
      'BANGLADESH': 'BD',
      
      'SRI LANKA': 'CL',
      
      'NEPAL': 'NEP',
      
      'PORTUGAL': 'P',
      
      'AUSTRIA': 'A',
      
      'GREECE': 'GR',
      
      'CZECH REPUBLIC': 'CZ',
      'CZECHIA': 'CZ',
      
      'HUNGARY': 'H',
      
      'ROMANIA': 'RO',
      
      'UKRAINE': 'UA'
    };
    
    const upperCountry = country.toUpperCase().trim();
    const mapped = countryMap[upperCountry];
    
    // If no mapping found, log warning and return null
    if (!mapped) {
      console.log(`WARNING: No DS-160 country code mapping for: ${country}`);
      // Try common 2-letter and 3-letter codes as fallback
      if (upperCountry.length === 2 || upperCountry.length === 3) {
        console.log(`Trying ${upperCountry} as country code directly`);
        return upperCountry;
      }
      return null;
    }
    
    console.log(`Country mapping: ${country} -> ${mapped}`);
    return mapped;
  }

  // Smart address splitting to handle long addresses
  // Returns an object with line1 and line2 (overflow)
  splitAddress(address, maxLength = 40) {
    if (!address) return { line1: '', line2: '' };
    if (address === 'N/A') return { line1: '', line2: '' };
    
    // First sanitize the address
    let sanitized = address
      .replace(/[,;:]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim();
    
    // If it fits in line 1, no need for line 2
    if (sanitized.length <= maxLength) {
      return { line1: sanitized, line2: '' };
    }
    
    // Find a good split point (word boundary)
    let splitPoint = maxLength;
    const possibleSplit = sanitized.lastIndexOf(' ', maxLength);
    
    // If we can split at a word boundary (and keep at least 30 chars in line 1)
    if (possibleSplit > 30) {
      splitPoint = possibleSplit;
    }
    
    const line1 = sanitized.substring(0, splitPoint).trim();
    const line2 = sanitized.substring(splitPoint).trim();
    
    console.log(`ADDRESS SPLIT: "${address}"`);
    console.log(`  Line 1: "${line1}" (${line1.length} chars)`);
    console.log(`  Line 2: "${line2}" (${line2.length} chars)`);
    
    this.log(`ADDRESS SPLIT`, { 
      original: address,
      originalLength: address.length,
      line1: line1,
      line1Length: line1.length,
      line2: line2,
      line2Length: line2.length,
      maxLength: maxLength 
    });
    
    // If line2 is still too long, truncate it
    if (line2.length > maxLength) {
      const truncatedLine2 = line2.substring(0, maxLength);
      console.warn(`  Line 2 truncated from ${line2.length} to ${maxLength} chars`);
      return { line1: line1, line2: truncatedLine2 };
    }
    
    return { line1: line1, line2: line2 };
  }
  
  // Backward compatibility - keep truncateAddress for simple cases
  truncateAddress(address, maxLength = 40) {
    const split = this.splitAddress(address, maxLength);
    return split.line1;
  }

  // Sanitize employer/school names to only allow DS-160 valid characters
  // Valid: A-Z, 0-9, hyphen (-), apostrophe ('), ampersand (&), and single spaces
  sanitizeEmployerName(name) {
    if (!name) return '';  // Return empty string instead of null
    if (name === 'N/A') return '';  // Convert N/A to empty string
    
    // Remove periods from common abbreviations
    let sanitized = name
      .replace(/\bInc\./gi, 'Inc')
      .replace(/\bCorp\./gi, 'Corp')
      .replace(/\bLtd\./gi, 'Ltd')
      .replace(/\bCo\./gi, 'Co')
      .replace(/\bLLC\./gi, 'LLC')
      .replace(/\bL\.L\.C\./gi, 'LLC')
      .replace(/\bP\.C\./gi, 'PC')
      .replace(/\bS\.A\./gi, 'SA')
      .replace(/\bN\.A\./gi, 'NA')
      .replace(/\bU\.S\.A?\./gi, 'USA')
      .replace(/\bU\.S\./gi, 'US');
    
    // Remove all periods that aren't part of decimals
    sanitized = sanitized.replace(/\.(?!\d)/g, '');
    
    // Replace common punctuation with spaces or remove
    sanitized = sanitized
      .replace(/[,;:]/g, ' ')  // Replace commas, semicolons, colons with space
      .replace(/[!@#$%^*+=\[\]{}|\\/<>?~`"]/g, '')  // Remove other special characters
      .replace(/[()]/g, '')  // Remove parentheses
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim();
    
    // Keep only allowed characters: A-Z, 0-9, hyphen, apostrophe, ampersand, spaces
    sanitized = sanitized.replace(/[^A-Za-z0-9\-'& ]/g, '');
    
    // Ensure no double spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    console.log(`Sanitized employer/school name: "${name}" -> "${sanitized}"`);
    return sanitized;
  }

  // Map visa subtypes to dropdown values
  mapVisaSubtype(subtype) {
    if (!subtype || subtype === 'N/A') return null;
    
    const subtypeMap = {
      // H visa subtypes - actual dropdown values
      'H-1B': 'SPECIALTY OCCUPATION (H1B)',
      'H1B': 'SPECIALTY OCCUPATION (H1B)',
      'H-1B1': 'CHILEAN SPEC. OCCUPATION (H1B1)',
      'H1B1': 'CHILEAN SPEC. OCCUPATION (H1B1)',
      'H-1B1-SINGAPORE': 'SINGAPOREAN SPEC. OCCUPATION (H1B1)',
      'H1B1-SINGAPORE': 'SINGAPOREAN SPEC. OCCUPATION (H1B1)',
      'H-1C': 'NURSE IN SHORTAGE AREA (H1C)',
      'H1C': 'NURSE IN SHORTAGE AREA (H1C)',
      'H-2A': 'AGRICULTURAL WORKER (H2A)',
      'H2A': 'AGRICULTURAL WORKER (H2A)',
      'H-2B': 'NONAGRICULTURAL WORKER (H2B)',
      'H2B': 'NONAGRICULTURAL WORKER (H2B)',
      'H-3': 'TRAINEE (H3)',
      'H3': 'TRAINEE (H3)',
      'H-4': 'SPOUSE OF AN H (H4)',
      'H4': 'SPOUSE OF AN H (H4)',
      'H-4-CHILD': 'CHILD OF AN H (H4)',
      'H4-CHILD': 'CHILD OF AN H (H4)',
      
      // L visa subtypes - actual dropdown values
      'L-1': 'INTRACOMPANY TRANSFEREE (L1)',
      'L1': 'INTRACOMPANY TRANSFEREE (L1)',
      'L-1A': 'INTRACOMPANY TRANSFEREE (L1)',
      'L1A': 'INTRACOMPANY TRANSFEREE (L1)',
      'L-1B': 'INTRACOMPANY TRANSFEREE (L1)',
      'L1B': 'INTRACOMPANY TRANSFEREE (L1)',
      'L-2': 'SPOUSE OF A L1 (L2)',
      'L2': 'SPOUSE OF A L1 (L2)',
      'L-2-CHILD': 'CHILD OF A L1 (L2)',
      'L2-CHILD': 'CHILD OF A L1 (L2)',
      
      // E visa subtypes - actual dropdown values
      'E-1': 'TREATY TRADER (E1)',
      'E1': 'TREATY TRADER (E1)',
      'E-2': 'TREATY INVESTOR (E2)',
      'E2': 'TREATY INVESTOR (E2)',
      'E-3': 'AUSTRALIAN SPECIALTY (E3)',
      'E3': 'AUSTRALIAN SPECIALTY (E3)',
      'E-3D': 'SPOUSE OF E3 (E3D)',
      'E3D': 'SPOUSE OF E3 (E3D)'
    };
    
    return subtypeMap[subtype.toUpperCase()] || subtype;
  }
  
  mapPurposeOfTrip(purpose, purposeSpecify, petitionerInfo) {
    if (!purpose) return null;
    
    // First, check purposeSpecify for specific visa type information
    if (purposeSpecify) {
      const specify = purposeSpecify.toUpperCase();
      
      // L visa types
      if (specify.includes('L-1') || specify.includes('L1') || 
          specify.includes('INTRACOMPANY') || specify.includes('BLANKET')) {
        return 'L';  // INTRACOMPANY TRANSFEREE (L)
      }
      
      // H visa types
      if (specify.includes('H-1B') || specify.includes('H1B')) {
        return 'H';  // TEMPORARY WORKER (H)
      }
      if (specify.includes('H-2A') || specify.includes('H2A')) {
        return 'H';  // TEMPORARY WORKER (H)
      }
      if (specify.includes('H-2B') || specify.includes('H2B')) {
        return 'H';  // TEMPORARY WORKER (H)
      }
      if (specify.includes('H-3') || specify.includes('H3')) {
        return 'H';  // TEMPORARY WORKER (H)
      }
      if (specify.includes('H-4') || specify.includes('H4')) {
        return 'H';  // TEMPORARY WORKER (H) - dependent
      }
      
      // E visa types
      if (specify.includes('E-1') || specify.includes('E1') || 
          specify.includes('TREATY TRADER')) {
        return 'E';  // TREATY TRADER OR INVESTOR (E)
      }
      if (specify.includes('E-2') || specify.includes('E2') || 
          specify.includes('TREATY INVESTOR')) {
        return 'E';  // TREATY TRADER OR INVESTOR (E)
      }
      if (specify.includes('E-3') || specify.includes('E3')) {
        return 'E';  // TREATY TRADER OR INVESTOR (E)
      }
      
      // O visa types
      if (specify.includes('O-1') || specify.includes('O1') || 
          specify.includes('EXTRAORDINARY')) {
        return 'O';  // ALIEN WITH EXTRAORDINARY ABILITY (O)
      }
      
      // P visa types
      if (specify.includes('P-1') || specify.includes('P1') || 
          specify.includes('ATHLETE') || specify.includes('ENTERTAINER')) {
        return 'P';  // INTERNATIONALLY RECOGNIZED ALIEN (P)
      }
      
      // F visa types
      if (specify.includes('F-1') || specify.includes('F1') || 
          specify.includes('STUDENT')) {
        return 'F';  // ACADEMIC OR LANGUAGE STUDENT (F)
      }
      
      // J visa types
      if (specify.includes('J-1') || specify.includes('J1') || 
          specify.includes('EXCHANGE')) {
        return 'J';  // EXCHANGE VISITOR (J)
      }
      
      // B visa types
      if (specify.includes('B-1') || specify.includes('B1') || 
          specify.includes('BUSINESS VISITOR')) {
        return 'B';  // TEMP. BUSINESS OR PLEASURE VISITOR (B)
      }
      if (specify.includes('B-2') || specify.includes('B2') || 
          specify.includes('TOURIST') || specify.includes('PLEASURE')) {
        return 'B';  // TEMP. BUSINESS OR PLEASURE VISITOR (B)
      }
      
      // K visa types
      if (specify.includes('K-1') || specify.includes('K1') || 
          specify.includes('FIANCÉ') || specify.includes('FIANCE')) {
        return 'K';  // FIANCÉ(E) OR SPOUSE OF A U.S. CITIZEN (K)
      }
      
      // R visa types
      if (specify.includes('R-1') || specify.includes('R1') || 
          specify.includes('RELIGIOUS')) {
        return 'R';  // RELIGIOUS WORKER (R)
      }
      
      // TN/TD visa types
      if (specify.includes('TN') || specify.includes('TD') || 
          specify.includes('NAFTA')) {
        return 'TD/TN';  // NAFTA PROFESSIONAL (TD/TN)
      }
    }
    
    // Check petitioner information for clues
    if (petitionerInfo && petitionerInfo.hasPetitioner === 'YES') {
      const companyName = petitionerInfo.petitionerCompanyName?.toUpperCase() || '';
      
      // If petitioner exists and purposeSpecify mentions certain keywords
      if (purposeSpecify) {
        const specify = purposeSpecify.toUpperCase();
        if (specify.includes('TRANSFER') || companyName.includes('AMERICA')) {
          // Likely an L-1 intracompany transfer
          return 'L';
        }
      }
    }
    
    // Fallback to basic purpose mapping
    const purposeMap = {
      // Generic mappings
      'BUSINESS': 'B',
      'TOURISM': 'B',
      'BUSINESS/TOURISM': 'B',
      'STUDENT': 'F',
      'WORK': 'H',  // Default to H for generic work if no specific type found
      'DIPLOMATIC': 'A',
      'GOVERNMENT': 'A',
      'TRANSIT': 'C',
      'CREW': 'D',
      'CREWMEMBER': 'D',
      'MEDIA': 'I',
      'EXCHANGE': 'J',
      'FIANCE': 'K',
      'FIANCÉ': 'K',
      'INTRACOMPANY': 'L',
      'RELIGIOUS': 'R',
      
      // Specific visa class text
      'FOREIGN GOVERNMENT OFFICIAL': 'A',
      'TEMP. BUSINESS OR PLEASURE VISITOR': 'B',
      'ALIEN IN TRANSIT': 'C',
      'CNMI WORKER OR INVESTOR': 'CNMI',
      'CREWMEMBER': 'D',
      'TREATY TRADER OR INVESTOR': 'E',
      'ACADEMIC OR LANGUAGE STUDENT': 'F',
      'INTERNATIONAL ORGANIZATION REP./EMP.': 'G',
      'TEMPORARY WORKER': 'H',
      'FOREIGN MEDIA REPRESENTATIVE': 'I',
      'EXCHANGE VISITOR': 'J',
      'FIANCÉ(E) OR SPOUSE OF A U.S. CITIZEN': 'K',
      'INTRACOMPANY TRANSFEREE': 'L',
      'VOCATIONAL/NONACADEMIC STUDENT': 'M',
      'OTHER': 'N',
      'NATO STAFF': 'NATO',
      'ALIEN WITH EXTRAORDINARY ABILITY': 'O',
      'INTERNATIONALLY RECOGNIZED ALIEN': 'P',
      'CULTURAL EXCHANGE VISITOR': 'Q',
      'RELIGIOUS WORKER': 'R',
      'INFORMANT OR WITNESS': 'S',
      'VICTIM OF TRAFFICKING': 'T',
      'NAFTA PROFESSIONAL': 'TD/TN',
      'VICTIM OF CRIMINAL ACTIVITY': 'U',
      'PAROLE BENEFICIARY': 'PAROLE-BEN'
    };
    
    const upperPurpose = purpose.toUpperCase();
    return purposeMap[upperPurpose] || purpose;
  }

  mapPassportType(type) {
    if (!type) return null;
    
    // Map passport types to DS-160 dropdown values
    const typeMap = {
      'REGULAR': 'R',
      'R': 'R',
      'DIPLOMATIC': 'D',
      'D': 'D',
      'OFFICIAL': 'O',
      'O': 'O',
      'SERVICE': 'S',
      'S': 'S',
      'OTHER': 'OT',
      'OT': 'OT'
    };
    
    return typeMap[type.toUpperCase()] || type;
  }

  mapSocialMediaPlatform(platform) {
    if (!platform || platform === 'N/A') return null;
    
    // Map social media platform names to actual DS-160 dropdown codes
    const platformMap = {
      'FACEBOOK': 'FCBK',
      'FB': 'FCBK',
      'TWITTER': 'TWIT',
      'X': 'TWIT',
      'INSTAGRAM': 'INST',
      'IG': 'INST',
      'LINKEDIN': 'LINK',
      'YOUTUBE': 'YTUB',
      'YT': 'YTUB',
      'PINTEREST': 'PTST',
      'TUMBLR': 'TUMB',
      'REDDIT': 'RDDT',
      'GOOGLE+': 'GOGL',
      'GOOGLE PLUS': 'GOGL',
      'FLICKR': 'FLKR',
      'MYSPACE': 'MYSP',
      'QZONE': 'QZNE',
      'QQ': 'QZNE',
      'SINA WEIBO': 'SWBO',
      'WEIBO': 'SWBO',
      'TENCENT WEIBO': 'TWBO',
      'VINE': 'VINE',
      'VKONTAKTE': 'VKON',
      'VK': 'VKON',
      'YOUKU': 'YUKU',
      'ASK.FM': 'ASKF',
      'ASKFM': 'ASKF',
      'DOUBAN': 'DUBN',
      'TWOO': 'TWOO',
      'NONE': 'NONE'
    };
    
    const upperPlatform = platform.toUpperCase().trim();
    const mapped = platformMap[upperPlatform];
    
    if (!mapped) {
      console.log(`WARNING: No social media platform mapping for: ${platform}`);
      // Try the platform name as-is
      return upperPlatform;
    }
    
    console.log(`Social media platform mapping: ${platform} -> ${mapped}`);
    return mapped;
  }

  // Extract day from date string (DD-MON-YYYY format)
  getDayFromDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return null;
    
    console.log(`getDayFromDate called with: ${dateStr}`);
    
    // Expected format: "09-JUL-2025" or "1991-09-20"
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        const day = parts[2].padStart(2, '0');
        console.log(`Extracted day (YYYY-MM-DD): ${day}`);
        return day;
      } else {
        // DD-MM-YYYY or DD-MON-YYYY format
        const day = parts[0].padStart(2, '0');
        console.log(`Extracted day (DD-MON-YYYY): ${day}`);
        return day;
      }
    }
    console.log(`Failed to extract day from: ${dateStr}`);
    return null;
  }

  // Extract year from date string
  getYearFromDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return null;
    
    console.log(`getYearFromDate called with: ${dateStr}`);
    
    // Expected format: "09-JUL-2025" or "1991-09-20"
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        console.log(`Extracted year (YYYY-MM-DD): ${parts[0]}`);
        return parts[0];
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY or DD-MON-YYYY format
        console.log(`Extracted year (DD-MON-YYYY): ${parts[2]}`);
        return parts[2];
      }
    }
    console.log(`Failed to extract year from: ${dateStr}`);
    return null;
  }

  // Extract city from birthPlace string like "OLONGAPO, PHILIPPINES"
  extractCity(birthPlace) {
    if (!birthPlace || birthPlace === 'N/A') return null;
    
    const parts = birthPlace.split(',');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return null;
  }
  
  // Extract country from birthPlace string like "OLONGAPO, PHILIPPINES"
  extractCountry(birthPlace) {
    if (!birthPlace || birthPlace === 'N/A') return null;
    
    const parts = birthPlace.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return null;
  }
  
  // Map spouse address type
  mapSpouseAddressType(address) {
    if (!address) return 'H'; // Default to same as home address if no address specified
    
    // If address is an object with street/city/etc, it's a different address
    if (typeof address === 'object' && (address.street1 || address.city || address.country)) {
      return 'O'; // Other (Specify Address)
    }
    
    // Only try to uppercase if it's a string
    if (typeof address === 'string') {
      const addressUpper = address.toUpperCase();
      
      if (addressUpper.includes('SAME AS MY RESIDENCE') || addressUpper.includes('SAME AS HOME')) {
        return 'H'; // Same as Home Address
      }
      if (addressUpper.includes('SAME AS MAILING')) {
        return 'M'; // Same as Mailing Address
      }
      if (addressUpper.includes('SAME AS U.S. CONTACT') || addressUpper.includes('SAME AS US CONTACT')) {
        return 'U'; // Same as U.S. Contact Address
      }
      if (addressUpper.includes('DO NOT KNOW') || addressUpper.includes("DON'T KNOW")) {
        return 'D'; // Do Not Know
      }
      
      // If it's any other string value that's not "N/A", assume it's a different address
      if (address !== 'N/A') {
        return 'O'; // Other (Specify Address)
      }
    }
    
    return 'H'; // Default to same as home address
  }

  mapUSStatus(status) {
    if (!status) return null;
    
    const statusMap = {
      'CITIZEN': 'S',
      'US_CITIZEN': 'S',
      'U.S. CITIZEN': 'S',
      'LPR': 'C',
      'LEGAL_PERMANENT_RESIDENT': 'C',
      'U.S. LEGAL PERMANENT RESIDENT': 'C',
      'GREEN_CARD': 'C',
      'NONIMMIGRANT': 'P',
      'NON_IMMIGRANT': 'P',
      'OTHER': 'O',
      'UNKNOWN': 'O',
      'I DON\'T KNOW': 'O',
      'DONT_KNOW': 'O'
    };
    
    const upperStatus = status.toUpperCase();
    const mapped = statusMap[upperStatus] || null;
    console.log(`US Status mapping: ${status} -> ${mapped}`);
    return mapped;
  }
  
  mapPayerType(payer) {
    if (!payer) return null;
    
    const payerMap = {
      'SELF': 'S',
      'S': 'S',
      'OTHER_PERSON': 'O',
      'O': 'O',
      'PRESENT_EMPLOYER': 'P',
      'P': 'P',
      'EMPLOYER_IN_US': 'U',
      'U': 'U',
      'OTHER_COMPANY': 'C',
      'C': 'C'
    };
    
    return payerMap[payer.toUpperCase()] || payer;
  }

  mapRelationship(relationship) {
    if (!relationship) return null;
    
    // Map common relationships to DS-160 codes
    const relationshipMap = {
      'FRIEND': 'F',
      'F': 'F',
      'RELATIVE': 'R',
      'R': 'R',
      'BUSINESS': 'B',
      'BUSINESS ASSOCIATE': 'B',
      'B': 'B',
      'SCHOOL': 'S',
      'S': 'S',
      'EMPLOYER': 'E',
      'E': 'E',
      'HOTEL': 'H',
      'H': 'H',
      'OTHER': 'O',
      'O': 'O',
      'SELF': 'SELF'
    };
    
    return relationshipMap[relationship.toUpperCase()] || relationship;
  }

  mapOccupation(occupation) {
    if (!occupation) return null;
    
    // Map occupation types to DS-160 dropdown codes
    const occupationMap = {
      'STUDENT': 'S',
      'EMPLOYED': 'O',  // Use OTHER for general employed
      'BUSINESS': 'B',
      'COMPUTER_SCIENCE': 'CS',
      'COMPUTER SCIENCE': 'CS',
      'EDUCATION': 'ED',
      'ENGINEERING': 'EN',
      'GOVERNMENT': 'G',
      'HOMEMAKER': 'H',
      'MEDICAL': 'MH',
      'MEDICAL_HEALTH': 'MH',
      'MILITARY': 'M',
      'NATURAL_SCIENCES': 'NS',
      'NATURAL SCIENCES': 'NS',
      'NATURAL_SCIENCE': 'NS',
      'NOT_EMPLOYED': 'N',
      'NOT EMPLOYED': 'N',
      'UNEMPLOYED': 'N',
      'RETIRED': 'RT',
      'AGRICULTURE': 'A',
      'ARTIST': 'AP',
      'ARTIST_PERFORMER': 'AP',
      'COMMUNICATIONS': 'CM',
      'CULINARY': 'C',
      'FOOD_SERVICES': 'C',
      'FINANCE': 'B',  // Map finance to BUSINESS
      'LEGAL': 'LP',
      'LEGAL_PROFESSION': 'LP',
      'PHYSICAL_SCIENCES': 'PS',
      'PHYSICAL SCIENCES': 'PS',
      'RESEARCH': 'R',
      'RELIGIOUS': 'RV',
      'RELIGIOUS_VOCATION': 'RV',
      'SOCIAL_SCIENCES': 'SS',
      'SOCIAL SCIENCES': 'SS',
      'OTHER': 'O'
    };
    
    return occupationMap[occupation.toUpperCase()] || 'O';  // Default to OTHER if not found
  }

  // Parse length of stay from string like "14 days" or "3 weeks"
  parseLengthOfStay(lengthOfStay) {
    if (!lengthOfStay || lengthOfStay === 'N/A') {
      console.log('No length of stay to parse');
      return null;
    }
    
    console.log(`Parsing length of stay: "${lengthOfStay}"`);
    
    // Match patterns like "14 days", "3 weeks", "2 months", etc.
    const match = lengthOfStay.match(/(\d+)\s*(day|days|week|weeks|month|months|year|years)/i);
    
    if (match) {
      const number = match[1];
      const unit = match[2];
      console.log(`Successfully parsed length of stay: number="${number}", unit="${unit}"`);
      return {
        number: number,
        unit: unit.toUpperCase()
      };
    }
    
    // Try to parse just a number (default to days)
    const numberMatch = lengthOfStay.match(/^\d+$/);
    if (numberMatch) {
      console.log(`Parsed as number only: ${numberMatch[0]} (defaulting to days)`);
      return {
        number: numberMatch[0],
        unit: 'DAYS'
      };
    }
    
    console.log(`Could not parse length of stay: "${lengthOfStay}"`);
    return null;
  }

  mapStayUnit(unit) {
    if (!unit) return null;
    
    const unitMap = {
      'DAYS': 'D',
      'DAY': 'D',
      'D': 'D',
      'WEEKS': 'W',
      'WEEK': 'W',
      'W': 'W',
      'MONTHS': 'M',
      'MONTH': 'M',
      'M': 'M',
      'YEARS': 'Y',
      'YEAR': 'Y',
      'Y': 'Y'
    };
    
    return unitMap[unit.toUpperCase()] || unit;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle format like "20-SEP-1991"
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthMap = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      let day, month, year;
      
      // Check if middle part is a month name
      if (monthMap[parts[1]]) {
        day = parseInt(parts[0], 10).toString(); // Remove leading zeros for dropdown
        month = monthMap[parts[1]];
        year = parts[2];
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD format
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parseInt(parts[2], 10).toString(); // Remove leading zeros for dropdown
      } else {
        // DD-MM-YYYY format
        day = parseInt(parts[0], 10).toString(); // Remove leading zeros for dropdown
        month = parts[1].padStart(2, '0');
        year = parts[2];
      }
      
      return { year, month, day };
    }
    
    return null;
  }

  // Show Work/Education guide popup
  showWorkEducationGuide(data) {
    // Remove any existing guide
    const existingGuide = document.getElementById('ds160-work-education-guide');
    if (existingGuide) {
      existingGuide.remove();
    }
    
    // Extract work/education data
    const workData = data.workEducation || {};
    const employer = workData.presentEmployer || {};
    const address = employer.address || {};
    
    // Create guide HTML
    const guideHTML = `
      <div id="ds160-work-education-guide" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #2c3e50;
        border-radius: 8px;
        padding: 0;
        width: 400px;
        max-height: 80vh;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
      ">
        <div id="guide-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #2c3e50;
          color: white;
          padding: 10px 15px;
          border-radius: 6px 6px 0 0;
          cursor: move;
          user-select: none;
        ">
          <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center;">
            <span style="margin-right: 8px;">☰</span> Work/Education Guide
          </h3>
          <button id="close-guide" style="
            background: transparent;
            color: white;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">✕</button>
        </div>
        <div style="padding: 20px; overflow-y: auto; max-height: calc(80vh - 50px);">
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
            <strong style="color: #856404;">⚠️ Manual Entry Required</strong><br>
            <span style="color: #856404; font-size: 14px;">Click each field below to copy, then paste into the form</span>
          </div>
        
        <div class="guide-fields" style="display: flex; flex-direction: column; gap: 12px;">
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Primary Occupation:</label>
            <div class="copyable-field" data-value="${this.mapOccupation(workData.primaryOccupation) || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${this.mapOccupation(workData.primaryOccupation) || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Employer/School Name:</label>
            <div class="copyable-field" data-value="${employer.name || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${employer.name || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Street Address 1:</label>
            <div class="copyable-field" data-value="${address.street1 || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${address.street1 || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">City:</label>
            <div class="copyable-field" data-value="${address.city || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${address.city || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">State/Province:</label>
            <div class="copyable-field" data-value="${address.state || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${address.state || 'Does not apply'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Postal/ZIP Code:</label>
            <div class="copyable-field" data-value="${address.postalCode || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${address.postalCode || 'Does not apply'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Country:</label>
            <div class="copyable-field" data-value="${address.country || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${address.country || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Start Date (MM-DD-YYYY):</label>
            <div class="copyable-field" data-value="${employer.startDate || workData.startDate || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${employer.startDate || workData.startDate || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Telephone Number:</label>
            <div class="copyable-field" data-value="${employer.phone || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${employer.phone || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Monthly Salary (USD):</label>
            <div class="copyable-field" data-value="${employer.monthlyIncome || workData.monthlyIncome || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              ${employer.monthlyIncome || workData.monthlyIncome || 'Not provided'}
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #6c757d;">📋 Click to copy</span>
            </div>
          </div>
          
          <div class="guide-field">
            <label style="font-weight: bold; color: #555; font-size: 12px; display: block; margin-bottom: 4px;">Briefly describe your duties:</label>
            <div class="copyable-field" data-value="${employer.duties || workData.jobDuties || ''}" style="
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 8px 40px 8px 8px;
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
              min-height: 60px;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              font-size: 14px;
              line-height: 1.4;
            ">
              <div style="word-wrap: break-word; word-break: break-word;">
                ${employer.duties || workData.jobDuties || ''}
              </div>
              <span class="copy-indicator" style="position: absolute; right: 8px; top: 8px; font-size: 12px; color: #6c757d;">📋</span>
            </div>
          </div>
          
        </div>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
          <strong>Instructions:</strong><br>
          1. Drag this window by the header to move it<br>
          2. Click any field to copy its value<br>
          3. Paste into the corresponding form field<br>
          4. Close this guide when done
        </div>
        </div>
      </div>
    `;
    
    // Add guide to page
    const guideContainer = document.createElement('div');
    guideContainer.innerHTML = guideHTML;
    document.body.appendChild(guideContainer.firstElementChild);
    
    // Add drag functionality
    const guideElement = document.getElementById('ds160-work-education-guide');
    const header = document.getElementById('guide-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    function dragStart(e) {
      if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
      } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
      }
      
      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
      }
    }
    
    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }
    
    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        
        if (e.type === "touchmove") {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }
        
        xOffset = currentX;
        yOffset = currentY;
        
        guideElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
        guideElement.style.top = '20px';
        guideElement.style.right = '20px';
        guideElement.style.left = 'auto';
      }
    }
    
    // Attach drag event listeners
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    // Touch events for mobile
    header.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);
    
    // Add click-to-copy functionality
    document.querySelectorAll('.copyable-field').forEach(field => {
      field.addEventListener('click', async (e) => {
        const value = field.dataset.value;
        if (!value) return;
        
        try {
          await navigator.clipboard.writeText(value);
          
          // Show success feedback
          const originalBg = field.style.background;
          const originalBorder = field.style.border;
          field.style.background = '#d4edda';
          field.style.border = '1px solid #28a745';
          
          const indicator = field.querySelector('.copy-indicator');
          const originalText = indicator.textContent;
          indicator.textContent = '✓ Copied!';
          indicator.style.color = '#28a745';
          
          setTimeout(() => {
            field.style.background = originalBg;
            field.style.border = originalBorder;
            indicator.textContent = originalText;
            indicator.style.color = '#6c757d';
          }, 1500);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
      
      // Hover effect
      field.addEventListener('mouseenter', () => {
        if (!field.style.background.includes('#d4edda')) {
          field.style.background = '#e9ecef';
          field.style.border = '1px solid #adb5bd';
        }
      });
      
      field.addEventListener('mouseleave', () => {
        if (!field.style.background.includes('#d4edda')) {
          field.style.background = '#f8f9fa';
          field.style.border = '1px solid #dee2e6';
        }
      });
    });
    
    // Close button functionality
    document.getElementById('close-guide').addEventListener('click', () => {
      document.getElementById('ds160-work-education-guide').remove();
    });
    
    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        const guide = document.getElementById('ds160-work-education-guide');
        if (guide) {
          guide.remove();
          document.removeEventListener('keydown', handleEsc);
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  // Main fill function with two passes
  async fillWithTwoPasses(data) {
    this.currentData = data;
    this.filledFields.clear();
    
    // TEST MODE: Allow selective field filling
    const testMode = data._testMode || false;
    const fieldsToFill = data._fieldsToFill || [];
    const fieldsToSkip = data._fieldsToSkip || [];
    
    if (testMode) {
      console.log('=== TEST MODE ENABLED ===');
      console.log('Fields to fill:', fieldsToFill);
      console.log('Fields to skip:', fieldsToSkip);
      this.log('TEST MODE ACTIVE', { fieldsToFill, fieldsToSkip });
    }
    
    // Log start of filling process
    this.log(`=== STARTING FILL PROCESS ===`, {
      url: window.location.href,
      dataPresent: !!data,
      workEducationData: !!data?.workEducation,
      previousEmployersCount: data?.workEducation?.previousEmployers?.length || 0,
      previousEducationCount: data?.workEducation?.previousEducation?.length || 0,
      testMode
    });
    
    const page = this.detectCurrentPage();
    this.log(`Current page detected: ${page}`);
    
    // Now that we fixed the address issue, we can auto-fill present work/education page too!
    if (page === 'workEducation') {
      this.log('PRESENT Work/Education page - auto-filling normally');
      // Show notification about dropdowns
      this.showPresentWorkNotification();
      // Continue with normal auto-fill process
    }
    
    // Previous work/education page detection is handled separately
    if (page === 'workEducationPrevious') {
      this.log('PREVIOUS Work/Education page - continuing with auto-fill');
      // No longer need dropdown warning - we fixed the real issue!
    }
    
    // Special handling for Personal Page 2
    if (page === 'personal2') {
      console.log('Detected Personal Information Page 2 - will focus on nationality, IDs, and SSN fields');
    }
    
    let totalFilled = 0;
    
    for (let pass = 1; pass <= CONFIG.maxPasses; pass++) {
      console.log(`\n=== Pass ${pass} ===`);
      this.log(`Starting pass ${pass}`, { totalPasses: CONFIG.maxPasses });
      
      const visibleFields = this.getVisibleFields();
      console.log(`Found ${visibleFields.length} visible unfilled fields`);
      this.log(`Found visible fields`, { count: visibleFields.length, pass });
      
      if (visibleFields.length === 0) {
        console.log('No more fields to fill');
        break;
      }
      
      let filledInThisPass = 0;
      
      for (const field of visibleFields) {
        // TEST MODE: Check if we should skip this field
        const testMode = data._testMode || false;
        const fieldsToFill = data._fieldsToFill || [];
        const fieldsToSkip = data._fieldsToSkip || [];
        
        if (testMode) {
          // If fieldsToFill is specified and not empty, only fill those fields
          if (fieldsToFill.length > 0) {
            const shouldFill = fieldsToFill.some(pattern => field.id.includes(pattern));
            if (!shouldFill) {
              console.log(`TEST MODE: Skipping field ${field.id} - not in fill list`);
              continue;
            }
          }
          
          // If fieldsToSkip is specified, skip those fields
          if (fieldsToSkip.length > 0) {
            const shouldSkip = fieldsToSkip.some(pattern => field.id.includes(pattern));
            if (shouldSkip) {
              console.log(`TEST MODE: Skipping field ${field.id} - in skip list`);
              continue;
            }
          }
        }
        
        // Add longer delay for work/education pages to avoid triggering server-side issues
        const currentPage = this.detectCurrentPage();
        const isWorkEducationPage = currentPage === 'workEducationPrevious' || currentPage === 'workEducation';
        
        const filled = this.fillField(field, data);
        if (filled) {
          filledInThisPass++;
          totalFilled++;
          
          // Use standard delay - we fixed the crash issue!
          const delay = CONFIG.fillDelay;
          this.log(`Filled field, waiting ${delay}ms`, { fieldId: field.id, fieldNumber: totalFilled });
          await this.delay(delay);
        }
      }
      
      console.log(`Filled ${filledInThisPass} fields in pass ${pass}`);
      this.log(`Pass ${pass} complete`, { filledCount: filledInThisPass, totalSoFar: totalFilled });
      
      if (pass < CONFIG.maxPasses && filledInThisPass > 0) {
        console.log(`Waiting ${CONFIG.passDelay}ms for dynamic fields to appear...`);
        this.log(`Waiting between passes`, { delay: CONFIG.passDelay, nextPass: pass + 1 });
        await this.delay(CONFIG.passDelay);
        this.log(`Delay complete, ready for next pass`);
      }
      
      if (filledInThisPass === 0) {
        console.log('No fields filled in this pass, stopping');
        this.log(`No fields filled in pass ${pass}, stopping`);
        break;
      }
    }
    
    this.log(`All passes complete`, { totalFilled, totalPasses: CONFIG.maxPasses });
    
    // Final pass to check and re-fill problematic fields
    console.log('\n=== Final check for problematic fields ===');
    this.log(`Starting final field checks`);
    
    // Only do passport/petition checks on pages where these fields exist
    // Skip on work/education pages
    const currentPage = this.detectCurrentPage();
    if (currentPage === 'workEducationPrevious' || currentPage === 'workEducation') {
      this.log(`Skipping passport/petition checks on work/education page`);
      console.log('Skipping passport/petition checks - not applicable on work/education pages');
      return totalFilled;
    }
    
    await this.delay(1000);
    
    // Check passport number field
    const passportField = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM');
    if (passportField && data.passport?.number) {
      const expectedValue = data.passport.number;
      if (passportField.value !== expectedValue) {
        console.log(`Re-filling passport number field with: ${expectedValue}`);
        passportField.value = expectedValue;
        passportField.dispatchEvent(new Event('input', { bubbles: true }));
        passportField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    // Check petition number field
    const petitionField = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_tbxPETITION_NUM');
    if (petitionField && data.petition?.receiptNumber) {
      const expectedValue = data.petition.receiptNumber;
      if (petitionField.value !== expectedValue) {
        console.log(`Re-filling petition number field with: ${expectedValue}`);
        petitionField.value = expectedValue;
        petitionField.dispatchEvent(new Event('input', { bubbles: true }));
        petitionField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    // Check passport date fields - both issue and expiration
    console.log('Checking passport date fields...');
    
    // Correct field IDs based on actual HTML
    const issueYearId = 'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_ISSUEDYear';
    const expireYearId = 'ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_EXPIREYear';
    
    // Check issue year field
    if (data.passport?.issueDate && data.passport.issueDate !== 'N/A') {
      const issueYearField = document.getElementById(issueYearId);
      const expectedIssueYear = this.getYearFromDate(data.passport.issueDate);
      
      if (issueYearField) {
        console.log(`Issue year field found. Current value: "${issueYearField.value}", Expected: "${expectedIssueYear}"`);
        if (expectedIssueYear && (!issueYearField.value || issueYearField.value !== expectedIssueYear)) {
          console.log(`Force-filling issue year: ${expectedIssueYear}`);
          issueYearField.value = expectedIssueYear;
          issueYearField.dispatchEvent(new Event('input', { bubbles: true }));
          issueYearField.dispatchEvent(new Event('change', { bubbles: true }));
          issueYearField.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      } else {
        console.warn(`Issue year field not found with ID: ${issueYearId}`);
      }
    }
    
    // Check expiration date fields
    if (data.passport?.expirationDate && data.passport.expirationDate !== 'N/A') {
      const expDayField = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEDay');
      const expMonthField = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_EXPIRE_DTEMonth');
      const expYearField = document.getElementById(expireYearId);
      
      const expectedDay = this.getDayFromDate(data.passport.expirationDate);
      const expectedMonth = this.getMonthNumber(data.passport.expirationDate);
      const expectedYear = this.getYearFromDate(data.passport.expirationDate);
      
      if (expDayField && expectedDay && expDayField.value !== expectedDay) {
        console.log(`Re-filling expiration day: ${expectedDay}`);
        expDayField.value = expectedDay;
        expDayField.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (expMonthField && expectedMonth) {
        // Try to find the right option for month
        const monthOptions = Array.from(expMonthField.options);
        let monthSet = false;
        for (const option of monthOptions) {
          if (option.value === expectedMonth || option.text === expectedMonth ||
              option.value === '07' && expectedMonth === 'JUL' ||
              option.text === 'JUL' && expectedMonth === 'JUL') {
            console.log(`Re-filling expiration month: ${option.value}`);
            expMonthField.value = option.value;
            expMonthField.dispatchEvent(new Event('change', { bubbles: true }));
            monthSet = true;
            break;
          }
        }
        if (!monthSet) {
          console.warn(`Could not set expiration month: ${expectedMonth}`);
        }
      }
      
      if (expYearField) {
        console.log(`Expiration year field found. Current value: "${expYearField.value}", Expected: "${expectedYear}"`);
        if (expectedYear && (!expYearField.value || expYearField.value !== expectedYear)) {
          console.log(`Force-filling expiration year: ${expectedYear}`);
          expYearField.value = expectedYear;
          expYearField.dispatchEvent(new Event('input', { bubbles: true }));
          expYearField.dispatchEvent(new Event('change', { bubbles: true }));
          expYearField.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      } else {
        console.warn(`Expiration year field not found with ID: ${expireYearId}`);
      }
    }
    
    console.log(`\n=== Complete ===`);
    console.log(`Total fields filled: ${totalFilled}`);
    
    return totalFilled;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Show notification for present work page
  showPresentWorkNotification() {
    const notification = document.createElement('div');
    notification.id = 'present-work-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 350px;
        font-size: 14px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <strong style="display: block; margin-bottom: 5px;">✅ Auto-Fill Complete</strong>
            <span style="opacity: 0.95; font-size: 13px;">
              Primary Occupation and Country dropdowns are pre-selected but may appear unchanged. 
              They will validate when you click Next.
            </span>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
          ">×</button>
        </div>
      </div>
    `;
    
    // Remove any existing notification
    const existing = document.getElementById('present-work-notification');
    if (existing) existing.remove();
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      const elem = document.getElementById('present-work-notification');
      if (elem) elem.remove();
    }, 10000);
  }

  // Show dropdown warning for work/education pages
  showDropdownWarning() {
    const notification = document.createElement('div');
    notification.id = 'dropdown-warning-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(238, 90, 36, 0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 600px;
        animation: slideDown 0.5s ease-out;
      ">
        <div style="display: flex; align-items: flex-start; gap: 15px;">
          <div style="font-size: 24px;">⚠️</div>
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
              Manual Selection Required for Some Fields
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; opacity: 0.95;">
              To prevent form crashes, dropdowns and Yes/No questions must be filled manually.
              All text fields have been auto-filled.
            </p>
            <p style="margin: 0; font-size: 13px; opacity: 0.9;">
              Please manually select: Yes/No for employment history, Country/Region, Employment dates
            </p>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 4px;
            transition: background 0.2s;
          ">✕</button>
        </div>
      </div>
      <style>
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      </style>
    `;
    
    // Remove any existing warning
    const existing = document.getElementById('dropdown-warning-notification');
    if (existing) existing.remove();
    
    document.body.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      const elem = document.getElementById('dropdown-warning-notification');
      if (elem) elem.remove();
    }, 30000);
  }

  // Unified notification system
  showUnifiedNotification(config) {
    // Remove any existing notification
    const existingNotif = document.getElementById('ds160-unified-notification');
    if (existingNotif) existingNotif.remove();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'ds160-unified-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483646;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 420px;
      font-size: 14px;
      animation: slideUp 0.3s ease-out;
    `;
    
    // Build content
    let content = `<div style="margin-bottom: 15px; font-size: 16px; font-weight: bold;">${config.title || '📋 Notification'}</div>`;
    
    // Add sections
    if (config.sections && config.sections.length > 0) {
      config.sections.forEach((section, index) => {
        const marginBottom = index < config.sections.length - 1 ? 'margin-bottom: 12px;' : '';
        content += `
          <div style="${marginBottom} padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <span style="font-size: 18px; margin-right: 8px;">${section.icon || '📌'}</span>
              <strong>${section.title}</strong>
            </div>
            <div style="font-size: 13px; opacity: 0.95; line-height: 1.4;">
              ${section.description}
            </div>
          </div>
        `;
      });
    }
    
    notification.innerHTML = `
      ${content}
      <button style="
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
         onmouseout="this.style.background='rgba(255,255,255,0.2)'"
         onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add animation styles if not already added
    if (!document.getElementById('ds160-slide-animations')) {
      const style = document.createElement('style');
      style.id = 'ds160-slide-animations';
      style.textContent = `
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    // No auto-removal - user manually closes when done
  }
  
  showMultipleEntriesNotification(employerCount, educationCount) {
    // Only show if there are multiple entries
    if (employerCount <= 1 && educationCount <= 1) return;
    
    const sections = [];
    
    if (employerCount > 1) {
      sections.push({
        icon: '💼',
        title: `${employerCount} Previous Employers`,
        description: 'After filling the first employer, click "Add Another" to add additional employers. Each entry will be auto-filled.'
      });
    }
    
    if (educationCount > 1) {
      sections.push({
        icon: '🎓',
        title: `${educationCount} Education Entries`,
        description: 'After filling the first school, click "Add Another" to add additional education. Each entry will be auto-filled.'
      });
    }
    
    this.showUnifiedNotification({
      title: '📋 Multiple Entries Detected',
      sections: sections
    });
  }
  
  // Helper function to detect which employer/education entries are currently visible
  detectVisibleEmployerEntries() {
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const padded = i.toString().padStart(2, '0');
      const field = document.getElementById(
        `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl${padded}_tbEmployerName`
      );
      if (field && field.offsetParent !== null) {
        entries.push(i);
      }
    }
    return entries;
  }
  
  detectVisibleEducationEntries() {
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const padded = i.toString().padStart(2, '0');
      const field = document.getElementById(
        `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl${padded}_tbxSchoolName`
      );
      if (field && field.offsetParent !== null) {
        entries.push(i);
      }
    }
    return entries;
  }
}

// Main extension controller
class DS160Extension {
  constructor() {
    this.filler = new TwoPassFiller();
    this.data = null;
    this.init();
  }

  init() {
    if (window.location.hostname !== 'ceac.state.gov') {
      console.log('Not on CEAC website');
      return;
    }

    // Listen for direct messages from sidebar (chrome.runtime)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'fillForm' && request.module === 'ds160') {
        console.log('DS-160 module received direct fill command from sidebar');
        this.data = request.data;
        this.startFilling().then(result => {
          sendResponse({ success: true, filledCount: result });
        }).catch(error => {
          console.error('DS-160 fill error:', error);
          sendResponse({ success: false, error: error.message });
        });
        // Return true to indicate async response
        return true;
      }
    });
    
    // Also listen for messages from content router (backwards compatibility)
    window.addEventListener('message', (event) => {
      if (event.data.source === 'tomitalaw-router' && event.data.action === 'fillForm' && event.data.module === 'ds160') {
        console.log('DS-160 module received fill command from router');
        this.data = event.data.data;
        this.startFilling().then(result => {
          // Send success message back through router
          window.postMessage({
            source: 'tomitalaw-module',
            action: 'fillComplete',
            module: 'ds160',
            filledCount: result
          }, '*');
        }).catch(error => {
          // Send error message back through router
          window.postMessage({
            source: 'tomitalaw-module',
            action: 'fillError',
            module: 'ds160',
            error: error.message
          }, '*');
        });
      }
    });

    chrome.storage.local.get(['ds160Data'], (result) => {
      if (result && result.ds160Data) {
        console.log('Found stored DS-160 data');
        this.data = result.ds160Data;
        // Disabled floating button - using sidebar instead
        // this.addFloatingButton();
        this.monitorPageChanges();
      }
    });
  }
  
  monitorPageChanges() {
    let lastPage = this.filler.detectCurrentPage();
    
    // Check for page changes every 2 seconds
    setInterval(() => {
      const currentPage = this.filler.detectCurrentPage();
      if (currentPage !== lastPage) {
        console.log(`Page changed from ${lastPage} to ${currentPage}`);
        lastPage = currentPage;
        
        // Floating button disabled - using sidebar instead
        // const pageInfo = document.querySelector('#ds160-autofill-container div[style*="color: #999"]');
        // if (pageInfo) {
        //   pageInfo.textContent = `Page: ${currentPage}`;
        // }
        
        // Show notification if on previous work/education page
        if (currentPage === 'workEducationPrevious' && this.data) {
          const employerCount = this.data.workEducation?.previousEmployers?.length || 0;
          const educationCount = this.data.workEducation?.previousEducation?.length || 0;
          this.filler.showMultipleEntriesNotification(employerCount, educationCount);
        }
        
        // Show notification if on additional work/education page (languages and countries)
        if (currentPage === 'additionalWorkEducation' && this.data) {
          const languageCount = this.checkForMultipleLanguages(this.data);
          const countriesCount = this.checkForMultipleCountriesVisited(this.data);
          
          // Show combined notification if either languages or countries are present
          if (languageCount > 0 || countriesCount > 0) {
            this.showLanguagesAndCountriesNotification(languageCount, countriesCount);
          }
        }
        
        // Check for incorrect social media selection on contact page
        if (currentPage === 'contact' && this.data) {
          // Small delay to let page load
          setTimeout(() => {
            if (this.checkForIncorrectAdditionalSocialMedia(this.data)) {
              this.showAdditionalSocialMediaWarning();
            }
          }, 500);
        }
      }
    }, 2000);
  }

  addFloatingButton() {
    const existing = document.getElementById('ds160-autofill-container');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'ds160-autofill-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
      min-width: 280px;
      border: 2px solid #1976d2;
    `;
    
    const button = document.createElement('button');
    button.textContent = '🚀 Auto-Fill';
    button.style.cssText = `
      background: #1976d2;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      width: 100%;
      margin-bottom: 5px;
    `;
    
    const status = document.createElement('div');
    status.id = 'fill-status';
    status.style.cssText = `
      font-size: 12px;
      color: #666;
      text-align: center;
      min-height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Add disclaimer text
    const disclaimer = document.createElement('div');
    disclaimer.style.cssText = `
      font-size: 10px;
      color: #888;
      text-align: left;
      margin: 8px 0;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      line-height: 1.4;
    `;
    disclaimer.innerHTML = `
      <strong>Note:</strong> May require multiple attempts.<br>
      <strong>If dropdowns don't appear:</strong><br>
      1. Click "Next" to reload the page<br>
      2. Click Auto-Fill again
    `;
    
    const pageInfo = document.createElement('div');
    pageInfo.style.cssText = `
      font-size: 11px;
      color: #999;
      text-align: center;
      margin-top: 5px;
    `;
    const currentPage = this.filler.detectCurrentPage();
    pageInfo.textContent = `Page: ${currentPage}`;
    
    // Check if we're on the previous work/education page and show notification
    if (currentPage === 'workEducationPrevious' && this.data) {
      const employerCount = this.data.workEducation?.previousEmployers?.length || 0;
      const educationCount = this.data.workEducation?.previousEducation?.length || 0;
      this.filler.showMultipleEntriesNotification(employerCount, educationCount);
    }
    
    // Check if we're on the additional work/education page and show combined notification
    if (currentPage === 'additionalWorkEducation' && this.data) {
      const languageCount = this.checkForMultipleLanguages(this.data);
      const countriesCount = this.checkForMultipleCountriesVisited(this.data);
      
      if (languageCount > 0 || countriesCount > 0) {
        this.showLanguagesAndCountriesNotification(languageCount, countriesCount);
      }
    }
    
    button.addEventListener('click', () => {
      button.disabled = true;
      
      // Create loading spinner
      status.innerHTML = `
        <div style="
          border: 2px solid #f3f3f3;
          border-top: 2px solid #1976d2;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        "></div>
        <span style="color: #ff9800;">Processing...</span>
      `;
      
      // Add spinner animation if not already added
      if (!document.getElementById('ds160-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'ds160-spinner-style';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      this.startFilling().then(count => {
        button.disabled = false;
        status.innerHTML = `<span style="color: #4caf50;">✓ Filled ${count} fields</span>`;
        
        setTimeout(() => {
          status.innerHTML = '';
        }, 3000);
      }).catch(error => {
        button.disabled = false;
        status.innerHTML = `<span style="color: #f44336;">Error: ${error.message}</span>`;
        console.error('Fill error:', error);
      });
    });
    
    container.appendChild(button);
    container.appendChild(status);
    container.appendChild(disclaimer);
    container.appendChild(pageInfo);
    document.body.appendChild(container);
  }

  async startFilling() {
    if (!this.data) {
      console.error('No data available');
      return 0;
    }
    
    // Get current page
    const currentPage = this.filler.detectCurrentPage();
    
    // Check for multiple other names - only on personal page
    if (currentPage === 'personal1') {
      const otherNamesCount = this.checkForMultipleOtherNames(this.data);
      if (otherNamesCount > 2) {
        this.showMultipleOtherNamesNotification(otherNamesCount);
      }
    }
    
    // Check for multiple emails - only on contact pages
    if (currentPage === 'contact' || currentPage === 'address') {
      const emailCount = this.checkForMultipleEmails(this.data);
      if (emailCount > 2) {
        this.showMultipleEmailsNotification(emailCount);
      }
    }
    
    // Check for multiple social media accounts - only on contact page
    if (currentPage === 'contact' || currentPage === 'addressPhone') {
      console.log('[SOCIAL MEDIA CHECK] Current page:', currentPage);
      console.log('[SOCIAL MEDIA CHECK] Data:', this.data?.contact);
      
      const socialCount = this.checkForMultipleSocialMedia(this.data);
      console.log('[SOCIAL MEDIA CHECK] Found', socialCount, 'social media accounts');
      
      // Show social media helper if user has any accounts - EXACTLY like US travel notification
      if (socialCount > 0) {
        const socialAccounts = this.data?.contact?.socialMediaAccounts || [];
        console.log('[SOCIAL MEDIA] Calling showSocialMediaHelper with accounts:', socialAccounts);
        this.showSocialMediaHelper(socialAccounts);
      }
      
      // Also show the multiple accounts warning if more than 1
      if (socialCount > 1) {
        this.showMultipleSocialMediaNotification(socialCount);
      }
      
      // Check if additional social media is incorrectly set to Yes
      if (this.checkForIncorrectAdditionalSocialMedia(this.data)) {
        this.showAdditionalSocialMediaWarning();
      }
    }
    
    // Check for multiple languages and countries - only on additional work/education page
    if (currentPage === 'additionalWorkEducation') {
      const languageCount = this.checkForMultipleLanguages(this.data);
      const countriesCount = this.checkForMultipleCountriesVisited(this.data);
      
      if (languageCount > 0 || countriesCount > 0) {
        this.showLanguagesAndCountriesNotification(languageCount, countriesCount);
      }
    }
    
    // Check for multiple work/education entries - only on previous work/education page
    if (currentPage === 'workEducationPrevious') {
      const employerCount = this.data.workEducation?.previousEmployers?.length || 0;
      const educationCount = this.data.workEducation?.previousEducation?.length || 0;
      this.filler.showMultipleEntriesNotification(employerCount, educationCount);
    }
    
    // Check for multiple US travel entries and driver's licenses - only on previous travel page
    if (currentPage === 'previousTravel') {
      const travelCount = this.checkForMultipleUSTravel(this.data);
      if (travelCount > 1) {
        const visits = this.data?.previousTravel?.visits || [];
        this.showMultipleUSTravelNotification(travelCount, visits);
      }
      
      const licenseCount = this.checkForMultipleDriversLicenses(this.data);
      if (licenseCount > 1) {
        this.showMultipleDriversLicensesNotification(licenseCount);
      }
    }
    
    console.log('Starting two-pass fill process...');
    const count = await this.filler.fillWithTwoPasses(this.data);
    console.log('Fill process complete');
    return count;
  }
  
  checkForMultipleEmails(data) {
    // Return the count of additional emails
    if (data.contact?.otherEmails) {
      return data.contact.otherEmails.length;
    }
    if (data.contact?.additionalEmails) {
      return data.contact.additionalEmails.length;
    }
    return 0;
  }
  
  checkForMultipleSocialMedia(data) {
    // Return the count of social media accounts
    if (data.contact?.socialMediaAccounts) {
      return data.contact.socialMediaAccounts.length;
    }
    if (data.contact?.socialMedia) {
      return data.contact.socialMedia.length;
    }
    return 0;
  }
  
  // Show social media helper - follows exact same pattern as showMultipleUSTravelNotification
  showSocialMediaHelper(socialAccounts) {
    // Remove any existing notification
    const existingNotif = document.getElementById('ds160-social-media-guide');
    if (existingNotif) existingNotif.remove();
    
    if (!socialAccounts || socialAccounts.length === 0) return;
    
    console.log('[SOCIAL MEDIA] Creating helper notification for', socialAccounts.length, 'accounts');
    
    // Create the notification HTML
    const accountsHTML = socialAccounts.map((account, index) => `
      <div style="
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 10px;
      ">
        <div style="font-weight: 600; color: #495057; margin-bottom: 8px;">
          Account ${index + 1}
        </div>
        <div class="copyable-field" data-value="${this.filler.mapSocialMediaPlatform(account.platform) || account.platform}" style="
          padding: 8px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          <span style="font-weight: 500;">Platform:</span> ${account.platform} → ${this.filler.mapSocialMediaPlatform(account.platform) || 'Not mapped'}
          <span style="float: right; font-size: 12px; color: #6c757d;">📋</span>
        </div>
        <div class="copyable-field" data-value="${account.handle || ''}" style="
          padding: 8px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          <span style="font-weight: 500;">Handle:</span> ${account.handle || 'Not provided'}
          <span style="float: right; font-size: 12px; color: #6c757d;">📋</span>
        </div>
      </div>
    `).join('');
    
    const notificationHTML = `
      <div id="ds160-social-media-guide" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        max-width: 400px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      ">
        <button id="close-social-guide" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">×</button>
        
        <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">
          📱 Social Media Helper
        </h3>
        <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.95;">
          Please manually fill the social media fields. Click to copy the values below, then select from dropdown and paste:
        </p>
        
        <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 15px; color: #212529;">
          ${accountsHTML}
        </div>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
          <p style="margin: 0; font-size: 12px; opacity: 0.9;">
            💡 <strong>Tip:</strong> Click any field above to copy its value, then paste into the form.
          </p>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
    
    // Add close button handler
    document.getElementById('close-social-guide').addEventListener('click', () => {
      document.getElementById('ds160-social-media-guide').remove();
    });
    
    // Add click-to-copy functionality
    document.querySelectorAll('#ds160-social-media-guide .copyable-field').forEach(field => {
      field.addEventListener('click', async (e) => {
        const value = field.dataset.value;
        if (!value) return;
        
        try {
          await navigator.clipboard.writeText(value);
          
          // Show success feedback
          const originalBg = field.style.background;
          field.style.background = '#d4edda';
          field.style.border = '1px solid #28a745';
          
          const copyIcon = field.querySelector('span[style*="float: right"]');
          const originalIcon = copyIcon.textContent;
          copyIcon.textContent = '✓';
          copyIcon.style.color = '#28a745';
          
          setTimeout(() => {
            field.style.background = originalBg;
            field.style.border = '1px solid #dee2e6';
            copyIcon.textContent = originalIcon;
            copyIcon.style.color = '#6c757d';
          }, 1500);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
      
      // Add hover effect
      field.addEventListener('mouseenter', () => {
        field.style.background = '#e9ecef';
        field.style.borderColor = '#adb5bd';
      });
      
      field.addEventListener('mouseleave', () => {
        field.style.background = 'white';
        field.style.borderColor = '#dee2e6';
      });
    });
  }
  
  checkForMultipleLanguages(data) {
    // Return the count of languages
    if (data && data.workEducation?.languages) {
      return data.workEducation.languages.length;
    }
    return 0;
  }
  
  checkForMultipleCountriesVisited(data) {
    // Return the count of countries visited in last 5 years
    if (data && data.workEducation?.countriesVisited5Years) {
      return data.workEducation.countriesVisited5Years.length;
    }
    return 0;
  }
  
  checkForMultipleOtherNames(data) {
    // Return the count of other names used
    if (data && data.personal?.otherNames) {
      return data.personal.otherNames.length;
    }
    return 0;
  }
  
  checkForMultipleUSTravel(data) {
    // Return the count of previous US travel entries
    if (data && data.previousTravel?.visits) {
      return data.previousTravel.visits.length;
    }
    return 0;
  }
  
  checkForMultipleDriversLicenses(data) {
    // Return the count of driver's licenses
    if (data && data.previousTravel?.driversLicenses) {
      return data.previousTravel.driversLicenses.length;
    }
    // Check if single license exists
    if (data && data.previousTravel?.driverLicense?.number) {
      return 1;
    }
    return 0;
  }
  
  checkForIncorrectAdditionalSocialMedia(data) {
    // Check if additional social media question is set to Yes when it should be No
    // Check the actual radio button state on the page
    const yesRadio = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_rblOtherWebsites_0');
    const noRadio = document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_rblOtherWebsites_1');
    
    if (yesRadio && noRadio && data && data.contact) {
      const socialCount = data.contact?.socialMediaAccounts?.length || data.contact?.socialMedia?.length || 0;
      // If we only have 1 social media account (Facebook) and Yes is selected, show warning
      // The worksheet shows NO for additional platforms
      if (socialCount <= 1 && yesRadio.checked) {
        return true;
      }
    }
    return false;
  }
  
  showMultipleEmailsNotification(emailCount) {
    this.filler.showUnifiedNotification({
      title: '📧 Multiple Emails Detected',
      sections: [{
        icon: '✉️',
        title: `${emailCount} Additional Email Addresses`,
        description: 'After filling the first 2 additional emails, click "Add Another" to add more email addresses.'
      }]
    });
  }
  
  showMultipleSocialMediaNotification(socialCount) {
    this.filler.showUnifiedNotification({
      title: '📱 Multiple Social Media Detected',
      sections: [{
        icon: '💬',
        title: `${socialCount} Social Media Accounts`,
        description: 'After filling, click "Add Another" button on the social media field to add additional platforms.'
      }]
    });
  }
  
  showLanguagesAndCountriesNotification(languageCount, countriesCount) {
    const sections = [];
    
    // Add languages section if present
    if (languageCount > 0) {
      const languages = this.data?.workEducation?.languages || [];
      let languageList = languages.slice(0, Math.min(5, languages.length))
        .map((lang, index) => `${index + 1}. ${lang}`)
        .join('\n');
      
      sections.push({
        icon: '🗣️',
        title: `${languageCount} Language${languageCount !== 1 ? 's' : ''} Spoken`,
        description: `The extension will fill up to 5 languages. ${languageCount > 5 ? 'Click "Add Another" for more.' : ''}\n\nLanguages to be filled:\n${languageList}`,
        fieldInfo: 'Field ID: dtlLANGUAGES_ctl[N]_tbxLANGUAGE_NAME'
      });
    }
    
    // Add countries section if present
    if (countriesCount > 0) {
      const countries = this.data?.workEducation?.countriesVisited5Years || [];
      let countryList = countries.slice(0, Math.min(5, countries.length))
        .map((country, index) => `${index + 1}. ${country}`)
        .join('\n');
      
      sections.push({
        icon: '✈️',
        title: `${countriesCount} ${countriesCount !== 1 ? 'Countries' : 'Country'} Visited in Last 5 Years`,
        description: `The extension will fill up to 5 countries. ${countriesCount > 5 ? 'Click "Add Another" for more.' : ''}\n\nCountries to be filled:\n${countryList}`,
        fieldInfo: 'Field ID: dtlCountriesVisited_ctl[N]_ddlCOUNTRIES_VISITED'
      });
    }
    
    // Show combined notification
    this.filler.showUnifiedNotification({
      title: '📋 Additional Work/Education Information',
      sections: sections
    });
  }
  
  showMultipleLanguagesNotification(languageCount) {
    // Get the list of languages from data
    const languages = this.data?.workEducation?.languages || [];
    
    // Build the language list for display
    let languageList = languages.slice(0, Math.min(5, languages.length))
      .map((lang, index) => `${index + 1}. ${lang}`)
      .join('\n');
    
    this.filler.showUnifiedNotification({
      title: '🌐 Multiple Languages Detected',
      sections: [{
        icon: '🗣️',
        title: `${languageCount} Languages Spoken`,
        description: `The extension will fill up to 5 languages. ${languageCount > 5 ? 'If you have more than 5 languages, click "Add Another" button on the Additional Work/Education/Training Information page to add more.' : ''}\n\nLanguages to be filled:\n${languageList}`,
        fieldInfo: 'Text field ID: ctl00_SiteContentPlaceHolder_FormView1_dtlLANGUAGES_ctl[N]_tbxLANGUAGE_NAME'
      }]
    });
  }
  
  showMultipleCountriesVisitedNotification(countriesCount) {
    // Get the list of countries from data
    const countries = this.data?.workEducation?.countriesVisited5Years || [];
    
    // Build the country list for display
    let countryList = countries.slice(0, Math.min(5, countries.length))
      .map((country, index) => `${index + 1}. ${country}`)
      .join('\n');
    
    this.filler.showUnifiedNotification({
      title: '🌍 Multiple Countries Visited',
      sections: [{
        icon: '✈️',
        title: `${countriesCount} Countries Visited in Last 5 Years`,
        description: `The extension will fill up to 5 countries. ${countriesCount > 5 ? 'If you have more than 5 countries, click "Add Another" button on the Additional Work/Education/Training Information page to add more.' : ''}\n\nCountries to be filled:\n${countryList}`,
        fieldInfo: 'Dropdown field ID: ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl[N]_ddlCOUNTRIES_VISITED'
      }]
    });
  }
  
  showAdditionalSocialMediaWarning() {
    this.filler.showUnifiedNotification({
      title: '⚠️ Social Media Answer Should Be "No"',
      sections: [{
        icon: '📱',
        title: 'Change Selection to "No"',
        description: 'The worksheet indicates NO additional social media platforms beyond Facebook. Please change the answer from "Yes" to "No" for the question about providing information about other websites or applications.',
        fieldInfo: 'Field: rblOtherWebsites - Only Facebook is listed, no additional platforms needed'
      }],
      type: 'warning'
    });
  }
  
  showMultipleOtherNamesNotification(namesCount) {
    this.filler.showUnifiedNotification({
      title: '👤 Multiple Other Names Detected',
      sections: [{
        icon: '📝',
        title: `${namesCount} Other Names Found`,
        description: 'The extension will fill the first 2 names. Click "Add Another" button on the Personal Information page to add additional names.',
        fieldInfo: 'Fields: DListAlias_ctl[N]_tbxSURNAME and tbxGIVEN_NAME'
      }]
    });
  }
  
  showMultipleUSTravelNotification(travelCount, visits) {
    // Check which visit fields are actually present on the page
    const visit1Exists = !!document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_DTEDay');
    const visit2Exists = !!document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_DTEDay');
    const visit3Exists = !!document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_ddlPREV_US_VISIT_DTEDay');
    const visit4Exists = !!document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_ddlPREV_US_VISIT_DTEDay');
    const visit5Exists = !!document.getElementById('ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_ddlPREV_US_VISIT_DTEDay');
    
    let fieldsStatus = 'Fields available: ';
    let availableCount = 0;
    if (visit1Exists) { fieldsStatus += 'Visit 1 ✓ '; availableCount++; }
    if (visit2Exists) { fieldsStatus += 'Visit 2 ✓ '; availableCount++; }
    if (visit3Exists) { fieldsStatus += 'Visit 3 ✓ '; availableCount++; }
    if (visit4Exists) { fieldsStatus += 'Visit 4 ✓ '; availableCount++; }
    if (visit5Exists) { fieldsStatus += 'Visit 5 ✓ '; availableCount++; }
    
    // Create formatted list of visits
    let visitsList = '<div style="margin-top: 10px; font-family: monospace; font-size: 13px;">';
    visitsList += '<strong>Your US Visit History:</strong><br>';
    visitsList += '<table style="width: 100%; margin-top: 5px; border-collapse: collapse;">';
    visitsList += '<tr style="border-bottom: 1px solid #ddd;"><th style="text-align: left; padding: 4px;">Visit</th><th style="text-align: left; padding: 4px;">Arrival Date</th><th style="text-align: left; padding: 4px;">Length of Stay</th></tr>';
    
    if (visits && visits.length > 0) {
      visits.slice(0, 5).forEach((visit, index) => {
        visitsList += `<tr style="border-bottom: 1px solid #eee;">`;
        visitsList += `<td style="padding: 4px;">#${index + 1}</td>`;
        visitsList += `<td style="padding: 4px;">${visit.arrivalDate || 'N/A'}</td>`;
        visitsList += `<td style="padding: 4px;">${visit.lengthOfStayNumber || 'N/A'} ${visit.lengthOfStayUnit || ''}</td>`;
        visitsList += `</tr>`;
      });
    }
    visitsList += '</table></div>';
    
    if (availableCount < travelCount && availableCount < 5) {
      fieldsStatus += `\n⚠️ Click "Add Another" ${Math.min(travelCount, 5) - availableCount} more times to add all visit fields`;
    }
    
    this.filler.showUnifiedNotification({
      title: '✈️ Multiple US Travel Entries Detected',
      sections: [{
        icon: '📅',
        title: `${travelCount} Previous US Visits Found`,
        description: `${fieldsStatus}${visitsList}`,
        fieldInfo: 'You may need to click "Add Another" button multiple times to create fields for all visits, then click Auto-Fill again.'
      }]
    });
  }
  
  showMultipleDriversLicensesNotification(licenseCount) {
    this.filler.showUnifiedNotification({
      title: '🚗 Multiple Driver\'s Licenses Detected',
      sections: [{
        icon: '🆔',
        title: `${licenseCount} Driver's Licenses Found`,
        description: 'The extension will fill the first license. Click "Add Another" button on the Previous U.S. Travel page to add additional licenses.',
        fieldInfo: 'Fields: US_DRIVER_LICENSE and US_DRIVER_LICENSE_STATE'
      }]
    });
  }
}

// Initialize the extension
const extension = new DS160Extension();

// Make debug functions available globally for easy access after crash
// Using both window and globalThis for better compatibility
const DS160Debug = {
  showLogs: () => TwoPassFiller.showCrashLogs(),
  clearLogs: () => TwoPassFiller.clearLogs(),
  getLogs: () => JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]'),
  getLastLog: () => {
    const logs = JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]');
    return logs[logs.length - 1];
  },
  help: () => {
    console.log('=== DS-160 Debug Commands ===');
    console.log('DS160Debug.showLogs()  - Show last 50 logs before crash');
    console.log('DS160Debug.clearLogs() - Clear all stored logs');
    console.log('DS160Debug.getLogs()   - Get all logs as array');
    console.log('DS160Debug.getLastLog() - Get the very last log entry');
    console.log('');
    console.log('After a crash, reload the page and run: DS160Debug.showLogs()');
  }
};

// Expose to window object
window.DS160Debug = DS160Debug;
globalThis.DS160Debug = DS160Debug;

// Also inject into the page context to make it accessible from console
const script = document.createElement('script');
script.textContent = `
  window.DS160Debug = {
    showLogs: () => {
      const logs = JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]');
      const lastTime = localStorage.getItem('ds160_last_log_time');
      
      console.log('=== DS-160 CRASH LOGS ===');
      console.log('Last log time: ' + lastTime);
      console.log('Total logs: ' + logs.length);
      
      // Show last 50 logs before crash
      const recentLogs = logs.slice(-50);
      recentLogs.forEach(log => {
        console.log('[' + log.time + '] [' + log.page + '] ' + log.message, log.data || '');
      });
      
      console.log('=== END CRASH LOGS ===');
      console.log('To clear logs, run: DS160Debug.clearLogs()');
      
      return logs;
    },
    clearLogs: () => {
      localStorage.removeItem('ds160_debug_logs');
      localStorage.removeItem('ds160_last_log_time');
      console.log('Debug logs cleared');
    },
    getLogs: () => JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]'),
    getLastLog: () => {
      const logs = JSON.parse(localStorage.getItem('ds160_debug_logs') || '[]');
      return logs[logs.length - 1];
    },
    help: () => {
      console.log('=== DS-160 Debug Commands ===');
      console.log('DS160Debug.showLogs()  - Show last 50 logs before crash');
      console.log('DS160Debug.clearLogs() - Clear all stored logs');
      console.log('DS160Debug.getLogs()   - Get all logs as array');
      console.log('DS160Debug.getLastLog() - Get the very last log entry');
      console.log('');
      console.log('After a crash, reload the page and run: DS160Debug.showLogs()');
    }
  };
  console.log('DS-160 Debug tools injected into page. Run DS160Debug.help() for commands.');
`;
document.documentElement.appendChild(script);
script.remove();

console.log('DS-160 Debug tools loaded. Run DS160Debug.help() for commands.');
console.log('DS-160 Two-Pass Auto-Filler (Complete Field Support) initialized');