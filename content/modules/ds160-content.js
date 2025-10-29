// Fixed Two-Pass DS-160 Auto-Filler with Complete Field Support
// Properly handles all Personal Page 1 & 2 fields including gender dropdown, marital status, birth location, telecode

// Prevent duplicate initialization
if (typeof window.DS160_INITIALIZED === 'undefined') {
  window.DS160_INITIALIZED = true;
  
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
        'PREV_VISA', 'rblPREV_VISA_REFUSED', 'tbxPREV_VISA_REFUSED_EXPL',
        'rblVWP_DENIAL_IND'
      ],
      'addressPhone': [
        'tbxAPP_ADDR_LN1', 'tbxAPP_ADDR_LN2', 'tbxAPP_ADDR_CITY',
        'ddlAPP_ADDR_STATE', 'tbxAPP_ADDR_POSTAL_CD', 'ddlAPP_ADDR_CNTRY', 'ddlCountry',
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
      ],
      'evisaBusiness': [
        'tbxBusinessName', 'ddlBusinessType', 
        'dllBusinessStartDateDay', 'ddlBusinessStartMonth', 'tbxBusinessStartDateYear',
        'tbxBusinessStartCity', 'ddlBusinessStartState',
        'ddlEVISA_OFFICE_TYPE', 'tbxEVISA_OFFICE_NAME',
        'tbxEVISA_OFFICE_ST_LN1', 'tbxEVISA_OFFICE_ST_LN2',
        'tbxEVISA_OFFICE_CITY', 'tbxEVISA_OFFICE_STATE',
        'cbxEVISA_OFFICE_STATE_NA', 'tbxEVISA_OFFICE_POSTAL_CD',
        'cbxEVISA_OFFICE_POSTAL_CD_NA', 'ddlEVISA_OFFICE_CNTRY',
        'tbxEVISA_OFFICE_TEL', 'tbxEVISA_OFFICE_FAX',
        'cbxEVISA_BUS_NATURE_GEN_IND', 'cbxEVISA_BUS_NATURE_EXP_IND', 
        'cbxEVISA_BUS_NATURE_RET_IND', 'cbxEVISA_BUS_NATURE_IMP_IND',
        'cbxEVISA_BUS_NATURE_MAN_IND', 'cbxEVISA_BUS_NATURE_SVC_IND',
        'cbxEVISA_BUS_NATURE_OTH_IND', 'tbxBusinessNatureDescription'
      ],
      'evisaInvestment': [
        // Investment type
        'rblEVISA_BUS_TYPE_IND', 'cbxEVISA_BUS_TYPE_NA',
        // Financial year
        'tbxEVISA_BUS_FI_YR', 'rblEVISA_BUS_FI_YR_TYPE',
        // Investment amounts
        'tbxEVISA_BUS_CI_INITIAL', 'tbxEVISA_BUS_CI_TOTAL',
        'tbxEVISA_BUS_II_INITIAL', 'tbxEVISA_BUS_II_TOTAL', 
        'tbxEVISA_BUS_EI_INITIAL', 'tbxEVISA_BUS_EI_TOTAL',
        'tbxEVISA_BUS_PI_INITIAL', 'tbxEVISA_BUS_PI_TOTAL',
        'tbxEVISA_BUS_OI_INITIAL', 'tbxEVISA_BUS_OI_TOTAL',
        // Source of funds
        'ddlInvestmentCaptial', 'ddlFundsFrom', 'tbxEVISA_BUS_INV_FUNDS_AMT',
        // Documentation
        'cbxEVISA_BUS_INV_DOC_WIRE_IND', 'cbxEVISA_BUS_INV_DOC_BANK_IND',
        'cbxEVISA_BUS_INV_DOC_NOTE_IND', 'cbxEVISA_BUS_INV_DOC_OTH_IND'
      ],
      'evisaForeignBusiness': [
        // Radio button questions
        'rblForeignBusinessQuestion', 'rblForeignEntityQuestion',
        'rblForeignIndividualOwnerQuestion',
        // Parent business fields (appear when Foreign Business = Yes)
        'tbxEVISA_BUS_PARENT', 'tbxEVISA_BUS_PARENT_LN1', 
        'tbxEVISA_BUS_PARENT_LN2', 'tbxEVISA_BUS_PARENT_CITY',
        'tbxEVISA_BUS_PARENT_STATE', 'cbexEVISA_BUS_PARENT_STATE_NA',
        'tbxEVISA_BUS_PARENT_POSTAL_CD', 'cbexEVISA_BUS_PARENT_POSTAL_CD_NA',
        'ddlEVISA_BUS_PARENT_CNTRY', 'tbxEVISA_BUS_PARENT_TEL',
        'tbxEVISA_BUS_PARENT_FAX',
        // Foreign entity fields (appear when Foreign Entity = Yes)
        'dtlForeignEntity_ctl00_tbxBUS_ENT_NAME',
        'dtlForeignEntity_ctl00_ddlBUS_ENT_NATL',
        'dtlForeignEntity_ctl00_tbxOWNERSHIP_PCT',
        // Foreign individual owner fields (appear when Individual Owner = Yes)
        'dtlForeignOwner_ctl00_tbxIND_OWNER_SURNAME',
        'dtlForeignOwner_ctl00_tbxIND_OWNER_GIVEN_NAME',
        'dtlForeignOwner_ctl00_tbxIND_OWNER_STATUS',
        'dtlForeignOwner_ctl00_ddlIND_OWNER_RES_CNTRY',
        'dtlForeignOwner_ctl00_ddlIND_OWNER_NATL',
        'dtlForeignOwner_ctl00_tbxIND_OWNERSHIP_PCT'
      ],
      'evisaFinanceTrade': [
        // Radio buttons for year/asset types
        'rblYearType', 'rblAssetsType',
        // Financial statement fields
        'tbxEVISA_BUS_CASH', 'tbxEVISA_BUS_RECEIVABLES', 
        'tbxEVISA_BUS_INVENTORY', 'tbxEVISA_BUS_OTHR_CURR_ASSTS',
        'tbxEVISA_BUS_LAND', 'tbxEVISA_BUS_BUILDING', 
        'tbxEVISA_BUS_MACHINERY', 'tbxEVISA_BUS_OTHR_PROP_ASSTS',
        'tbxEVISA_BUS_LIABILITIES', 'tbxEVISA_BUS_DEBT',
        'tbxEVISA_BUS_REVENUES', 'tbxEVISA_BUS_COSTS', 
        'tbxEVISA_BUS_INCOME', 'tbxEVISA_BUS_TAX',
        'tbxEVISA_GOODS_SOLD_VALUE', 'tbxEVISA_EXPORTED_VALUE',
        'tbxEVISA_PRINCIPAL_TRADE_SERVICE', 'tbxEVISA_SERVICES_USA',
        'tbxEVISA_BUS_IMP_US', 'tbxEVISA_BUS_IMP_OTHR',
        'tbxEVISA_BUS_EXP_US', 'tbxEVISA_BUS_EXP_OTHR',
        'tbxEVISA_BUS_MANUF_TRANS'
      ],
      'evisaUSPersonnel': [
        // US Personnel fields (dynamic entries)
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_SURNAME',
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_GIVEN_NAME',
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_POSITION',
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_DIVISION',
        'dtlUSBusPers_ctl00_ddlEVISA_PSNL_NATL',
        'dtlUSBusPers_ctl00_ddlEVISA_PSNL_STATUS_IND',
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_STATUS_OTH',
        'dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_TYPE',
        'dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_DTE_DY',
        'dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_DTE_MO',
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_VISA_DTE_YR',
        'dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_PLACE',
        'dtlUSBusPers_ctl00_tbxEVISA_PSNL_A_NUM',
        'dtlUSBusPers_ctl00_cbxEVISA_PSNL_A_NUM_DNK'
      ],
      'evisaApplicantPosition': [
        // Applicant Present Position fields
        'ddlApplicantType', 'tbxPresentPosition',
        'tbxEmployerName', 'tbxYearsWithEmployer',
        // Employer Address
        'tbxEmpStreetAddress1', 'tbxEmpStreetAddress2',
        'tbxEmpCity', 'tbxEVISA_APP_EMP_STATE',
        'cbexEVISA_APP_EMP_STATE_NA', 'tbxEVISA_APP_EMP_POSTAL_CD',
        'cbexEVISA_APP_EMP_POSTAL_CD_NA', 'ddlEmpCountry',
        // Education
        'tbxSchool', 'tbxDegree', 'tbxMajor', 'tbxYear',
        'rblOtherEducation'
      ],
      'evisaApplicantUSPosition': [
        // Applicant Position in U.S. fields
        'tbxTitle', 'tbxDuties', 'tbxSalary', 'tbxBenefits'
      ],
      
      'evisaApplicationContact': [
        // Application Contact Information fields
        'tbxOfficerSurname', 'tbxOfficerGivenName', 'tbxOfficerPosition',
        'tbxContactSurname', 'tbxContactGivenName', 'tbxAddress1', 'tbxAddress2',
        'tbxCity', 'tbxEVISA_APP_POC_STATE', 'tbxEVISA_APP_POC_POSTAL_CD',
        'ddlCountry', 'tbxPhoneNum', 'tbxEVISA_APP_POC_FAX', 'tbxEVISA_APP_POC_EMAIL'
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
      'travelCompanions': 'dlTravelCompanions',  // Changed to look for the actual travel companions fields
      'previousTravel': 'rblPREV_US_TRAVEL_IND',
      'addressPhone': 'tbxAPP_ADDR_LN1',
      'contact': 'rblAddSocial', // Social media question on contact page
      'usContact': 'tbxUS_POC_SURNAME',
      'passport': 'ddlPPT_TYPE',
      'family': 'tbxFATHER_SURNAME',
      'workEducation': 'ddlPresentOccupation',
      'security': 'rblDisease',
      'evisaBusiness': 'tbxBusinessName', // E-visa business profile page
      'evisaForeignBusiness': 'rblForeignBusinessQuestion', // E-visa foreign parent business page
      'evisaInvestment': 'rblEVISA_BUS_TYPE_IND', // E-visa investment information page
      'evisaFinanceTrade': 'tbxEVISA_BUS_CASH', // E-visa finance and trade page
      'evisaUSPersonnel': 'dtlUSBusPers', // E-visa US personnel information page
      'evisaApplicantPosition': 'ddlApplicantType', // E-visa applicant present position page
      'evisaApplicantUSPosition': 'tbxTitle', // E-visa applicant position in U.S. page
      'evisaApplicationContact': 'tbxOfficerSurname' // E-visa application contact page
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
        
        // Skip already filled text inputs (but not selects, radio/checkboxes)
        // For dropdowns, we want to allow overwriting default values
        if (element.type === 'text' && element.value && element.value.trim() !== '') {
          // Mark as filled so we don't try again
          this.filledFields.add(element.id);
          console.log(`[SKIP] Field ${element.id} already has value: ${element.value}`);
          return;
        }
        
        // For dropdowns, only skip if it has a meaningful value (not default placeholders)
        if (element.type === 'select-one' && element.value && element.value.trim() !== '') {
          // List of default/placeholder values that should be overwritten
          const defaultValues = ['', 'NONE', 'SONE', '- Select One -', '--'];
          const isDefault = defaultValues.includes(element.value) || 
                          element.selectedIndex === 0; // First option is usually default
          
          if (!isDefault) {
            // Only skip if it's a meaningful value
            this.filledFields.add(element.id);
            console.log(`[SKIP] Dropdown ${element.id} already has meaningful value: ${element.value}`);
            return;
          }
          // Allow overwriting default values
          console.log(`[OVERRIDE] Dropdown ${element.id} has default value: ${element.value}, will fill`);
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

  // Safely fill text field with character limit checking
  fillFieldSafely(element, value, fieldId) {
    if (!element || !value) return false;

    const maxLength = element.getAttribute('maxlength');

    // Check if value exceeds character limit
    if (maxLength && value.length > parseInt(maxLength)) {
      // Visual warning - RED BORDER + PLACEHOLDER
      element.style.border = '3px solid #ff0000';
      element.style.backgroundColor = '#ffe6e6';
      element.placeholder = `⚠️ TOO LONG: ${value.length} chars (max ${maxLength})`;

      // Console warning for debugging
      console.warn(`⚠️ SKIPPED ${fieldId}: Value too long (${value.length} > ${maxLength})`);
      console.warn(`   Value: "${value}"`);

      // Don't fill the field
      return false;
    }

    // Safe to fill
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
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
      
      
      // Check if this field should use script injection
      const needsInjection = fieldId.includes('dtlPrevEmpl') && 
                            (fieldId.includes('ddlEmpDateFrom') || fieldId.includes('ddlEmpDateTo'));
      
      if (needsInjection) {
        // Use script injection for previous employer date dropdowns
        console.log(`Using script injection for field: ${fieldId}`);
        this.injectScript([{ id: fieldId, value: value }]);
        
      } else if (field.type === 'text' || field.type === 'textarea' || field.type === 'tel' || field.type === 'email') {
        // CRITICAL: Convert "N/A" to empty string to prevent crashes
        if (value === 'N/A' || value === 'n/a' || value === 'N/a') {
          value = '';  // Replace N/A with empty string
        }

        // Don't log every field operation

        // Safe filling with character limit checking
        const filled = this.fillFieldSafely(element, value, fieldId);

        // Only schedule retry if field was successfully filled
        if (filled) {
          // Add simple retry mechanism for fields that might get cleared
          // Retry up to 3 times with 4-second delays (like Lollylaw)
          this.scheduleRetry(element, value, fieldId, 1);
        }
      } else if (field.type === 'select' || field.type === 'select-one') {
        // Simple dropdown filling
        const options = Array.from(element.options);
        let matched = false;
        
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
            const countryMap = this.mapCountry(value);
            if (countryMap) {
              element.value = countryMap;
              matched = true;
              console.log(`Mapped country: "${value}" -> "${countryMap}"`);
            }
          }
        }
        
        if (matched) {
          // Fire change event for dropdowns
          element.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Add retry mechanism for dropdowns too
          this.scheduleRetry(element, element.value, fieldId, 1);
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

  // Simple retry mechanism - inspired by Lollylaw's approach
  scheduleRetry(element, expectedValue, fieldId, attemptNumber) {
    // Max 3 attempts with 4-second delays
    if (attemptNumber > 3) return;

    setTimeout(() => {
      // Check if the value was cleared or changed
      if (element.value !== expectedValue) {
        console.log(`Retry ${attemptNumber}/3 for field ${fieldId}`);

        // Use safe filling that respects character limits
        const filled = this.fillFieldSafely(element, expectedValue, fieldId);

        // Only schedule next retry if field was successfully filled
        // (If over-limit, fillFieldSafely returns false and shows red border)
        if (filled) {
          this.scheduleRetry(element, expectedValue, fieldId, attemptNumber + 1);
        }
      }
    }, 4000); // 4-second delay like Lollylaw
  }

  // Script injection for fields that need to run in page context
  injectScript(fields, addButtonId = null) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/injected.js');
    script.dataset.params = JSON.stringify({ 
      fields: fields,
      addButtonId: addButtonId 
    });
    document.body.appendChild(script);
    script.onload = () => script.remove();
  }

  // Batch process all previous employers with Add Another functionality
  fillPreviousEmployers(data) {
    console.log('Starting batch processing for previous employers');
    
    // Find the Add Another button for employers - look for enabled buttons only
    const addButtons = document.querySelectorAll('a[id*="InsertButtonPrevEmpl"]');
    let employerAddButton = null;
    
    // Find the first enabled button (should be ctl00's button)
    for (const btn of addButtons) {
      if (!btn.disabled && !btn.hasAttribute('disabled')) {
        employerAddButton = btn;
        console.log('Found enabled Add Another button:', btn.id);
        break;
      }
    }
    
    if (!employerAddButton) {
      console.log('No enabled Add Another button found for employers');
      // Log all buttons for debugging
      console.log('Available buttons:', Array.from(addButtons).map(b => ({
        id: b.id,
        disabled: b.disabled || b.hasAttribute('disabled')
      })));
      return false;
    }
    
    console.log(`Found Add Another button: ${employerAddButton.id}`);
    
    const allFields = [];
    
    // Process each employer
    data.workEducation?.previousEmployers?.forEach((employer, index) => {
      if (!employer) return;
      
      const ctl = `ctl${index.toString().padStart(2, '0')}`;
      console.log(`Processing employer ${index}: ${employer.name}`);
      
      // Add all fields for this employer
      // Basic information
      if (employer.name) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbEmployerName`, 
          value: this.sanitizeEmployerName(employer.name)
        });
      }
      
      // Address fields
      if (employer.address?.street1) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbEmployerStreetAddress1`, 
          value: this.truncateAddress(employer.address.street1)
        });
      }
      if (employer.address?.street2) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbEmployerStreetAddress2`, 
          value: employer.address.street2
        });
      }
      if (employer.address?.city) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbEmployerCity`, 
          value: employer.address.city
        });
      }
      if (employer.address?.state) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbxPREV_EMPL_ADDR_STATE`, 
          value: employer.address.state
        });
      }
      if (employer.address?.postalCode) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbxPREV_EMPL_ADDR_POSTAL_CD`, 
          value: employer.address.postalCode
        });
      }
      if (employer.address?.country) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_ddlPREV_EMPL_ADDR_CNTRY`, 
          value: this.mapCountry(employer.address.country)
        });
      }
      
      // Phone
      if (employer.phone) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbEmployerPhone`, 
          value: employer.phone
        });
      }
      
      // Job title
      if (employer.jobTitle) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbJobTitle`, 
          value: employer.jobTitle
        });
      }
      
      // Supervisor
      if (employer.supervisorSurname) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbSupervisorSurname`, 
          value: employer.supervisorSurname
        });
      }
      if (employer.supervisorGivenName) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbSupervisorGivenName`, 
          value: employer.supervisorGivenName
        });
      }
      
      // Start date fields
      if (employer.startDate) {
        const startDay = this.getDayFromDate(employer.startDate);
        const startMonth = this.getMonthNumber(employer.startDate);
        const startYear = this.getYearFromDate(employer.startDate);
        
        if (startDay) {
          allFields.push({
            id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_ddlEmpDateFromDay`, 
            value: startDay
          });
        }
        if (startMonth) {
          allFields.push({
            id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_ddlEmpDateFromMonth`, 
            value: startMonth
          });
        }
        if (startYear) {
          allFields.push({
            id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbxEmpDateFromYear`, 
            value: startYear
          });
        }
      }
      
      // End date fields
      if (employer.endDate) {
        const endDay = this.getDayFromDate(employer.endDate);
        const endMonth = this.getMonthNumber(employer.endDate);
        const endYear = this.getYearFromDate(employer.endDate);
        
        if (endDay) {
          allFields.push({
            id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_ddlEmpDateToDay`, 
            value: endDay
          });
        }
        if (endMonth) {
          allFields.push({
            id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_ddlEmpDateToMonth`, 
            value: endMonth
          });
        }
        if (endYear) {
          allFields.push({
            id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbxEmpDateToYear`, 
            value: endYear
          });
        }
      }
      
      // Duties
      if (employer.duties) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_${ctl}_tbDescribeDuties`, 
          value: employer.duties
        });
      }
    });
    
    // Filter out null/undefined values
    const validFields = allFields.filter(f => f.value != null && f.value !== '' && f.value !== 'N/A');
    
    console.log(`Injecting ${validFields.length} fields for ${data.workEducation?.previousEmployers?.length} employers`);
    
    // Inject script with all fields and the add button
    if (validFields.length > 0) {
      this.injectScript(validFields, employerAddButton.id);
      return true;
    }
    
    return false;
  }

  // Batch process all immediate subordinates with Add Another functionality
  fillImmediateSubordinates(data) {
    
    // Find the Add Another button for subordinates - look for enabled buttons only
    const addButtons = document.querySelectorAll('a[id*="InsertButtonImmSubor"], a[id*="InsertButton"][id*="Subor"], a[href*="InsertImmSubor"]');
    let subordinateAddButton = null;
    
    // Find the first enabled button (should be ctl00's button)
    for (const btn of addButtons) {
      if (!btn.disabled && !btn.hasAttribute('disabled')) {
        subordinateAddButton = btn;
        break;
      }
    }
    
    // If not found by ID pattern, try finding by proximity to subordinate fields
    if (!subordinateAddButton) {
      const subordinateSection = document.querySelector('input[id*="dtlImmSubor"]');
      if (subordinateSection) {
        // Look for "Add Another" link near the subordinate fields
        const container = subordinateSection.closest('table, div, fieldset');
        if (container) {
          const links = container.querySelectorAll('a');
          for (const link of links) {
            if (link.textContent.includes('Add Another') || link.textContent.includes('Add') || 
                link.getAttribute('href')?.includes('Insert')) {
              subordinateAddButton = link;
              console.log('Found Add Another button by proximity:', link.id || link.outerHTML.substring(0, 100));
              break;
            }
          }
        }
      }
    }
    
    if (!subordinateAddButton) {
      return false;
    }
    
    const allFields = [];
    
    // Process each subordinate
    data.evisaApplicantUSPosition?.immediateSubordinates?.forEach((subordinate, index) => {
      if (!subordinate) return;
      
      const ctl = `ctl${index.toString().padStart(2, '0')}`;
      
      // Add surname field
      if (subordinate.surname) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_${ctl}_tbxEVISA_SUB_SURNAME`, 
          value: subordinate.surname.toUpperCase()
        });
      }
      
      // Add given name field
      if (subordinate.givenName) {
        allFields.push({
          id: `ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_${ctl}_tbxEVISA_SUB_GIVEN_NAME`, 
          value: subordinate.givenName.toUpperCase()
        });
      }
    });
    
    const validFields = allFields.filter(field => field.value && field.value !== 'N/A');
    
    if (validFields.length === 0) {
      console.log('No valid subordinate fields to fill');
      return false;
    }
    
    console.log(`Injecting ${validFields.length} fields for ${data.evisaApplicantUSPosition?.immediateSubordinates?.length} subordinates`);
    
    // Inject script with all fields and the add button
    if (validFields.length > 0) {
      this.injectSubordinateScript(validFields, subordinateAddButton.id || subordinateAddButton.getAttribute('href'));
      return true;
    }
    
    return false;
  }

  // Script injection specifically for subordinate fields
  injectSubordinateScript(fields, addButtonId = null) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/injected-subordinates.js');
    script.dataset.params = JSON.stringify({ 
      fields: fields,
      addButtonId: addButtonId 
    });
    document.body.appendChild(script);
    script.onload = () => script.remove();
  }
  // Country code mapping for dropdowns

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

  // Map US state names to codes
  mapUSState(state) {
    if (!state) return null;
    
    // If already a 2-letter code, return it
    if (state.length === 2) {
      return state.toUpperCase();
    }
    
    const stateUpper = state.toUpperCase();
    
    const stateMap = {
      'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
      'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
      'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
      'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
      'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
      'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
      'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
      'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
      'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
      'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
      'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
      'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
      'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC',
      'WASHINGTON DC': 'DC', 'WASHINGTON D.C.': 'DC', 'D.C.': 'DC'
    };
    
    return stateMap[stateUpper] || state;
  }

  // Map business type descriptions to DS-160 codes
  mapBusinessType(businessType) {
    if (!businessType) return null;
    
    const typeUpper = businessType.toUpperCase();
    
    // Check for specific patterns in the business type string
    if (typeUpper.includes('CORPORATION')) return 'C';
    if (typeUpper.includes('PARTNERSHIP')) return 'P';
    if (typeUpper.includes('BRANCH') || typeUpper.includes('LIAISON')) return 'B';
    if (typeUpper.includes('PRIVATELY OWNED') || typeUpper.includes('PRIVATE')) return 'R';
    if (typeUpper.includes('JOINT VENTURE')) return 'J';
    if (typeUpper.includes('SUBSIDIARY')) return 'S';
    if (typeUpper.includes('OTHER')) return 'O';
    
    // Direct mapping for codes
    const mappings = {
      'C': 'C',
      'P': 'P',
      'B': 'B',
      'R': 'R',
      'J': 'J',
      'S': 'S',
      'O': 'O'
    };
    
    return mappings[businessType] || null;
  }

  // Parse business nature string into array of checkbox values
  parseBusinessNature(natureString) {
    if (!natureString) return [];
    
    const nature = [];
    const upperString = natureString.toUpperCase();
    
    if (upperString.includes('GENERAL TRADE') || upperString.includes('TRADE')) {
      nature.push('General Trade');
    }
    if (upperString.includes('EXPORT')) {
      nature.push('Exports from U.S.');
    }
    if (upperString.includes('RETAIL')) {
      nature.push('Retail Sales');
    }
    if (upperString.includes('IMPORT')) {
      nature.push('Imports to U.S.');
    }
    if (upperString.includes('MANUFACTUR')) {
      nature.push('Manufacturing');
    }
    if (upperString.includes('SERVICE') || upperString.includes('TECHNOLOGY') || upperString.includes('TECH')) {
      nature.push('Services/Technology');
    }
    if (upperString.includes('RESEARCH') || upperString.includes('MANAGEMENT') || upperString.includes('CONSULTING')) {
      if (!nature.includes('Services/Technology')) {
        nature.push('Services/Technology');
      }
    }
    
    return nature;
  }

  // Transform evisaBusiness data structure for compatibility
  transformEvisaBusinessData(data) {
    if (!data.evisaBusiness) return data;
    
    const transformed = { ...data };
    const evisa = data.evisaBusiness;
    
    // Parse business type
    if (evisa.businessType && !evisa.businessTypeCode) {
      transformed.evisaBusiness.businessTypeCode = this.mapBusinessType(evisa.businessType);
      // Extract description after dash if present
      const dashIndex = evisa.businessType.indexOf('–');
      if (dashIndex > -1) {
        transformed.evisaBusiness.businessActivities = evisa.businessType.substring(dashIndex + 1).trim();
      }
    }
    
    // Parse incorporation date
    if (evisa.establishedDate && !evisa.incorporationDate) {
      transformed.evisaBusiness.incorporationDate = evisa.establishedDate;
    }
    
    // Parse incorporation place
    if (evisa.establishedPlace && !evisa.incorporationCity && !evisa.incorporationState) {
      const parts = evisa.establishedPlace.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        transformed.evisaBusiness.incorporationCity = parts[0];
        // Map state name to code
        const statePart = parts[1].replace('USA', '').trim();
        transformed.evisaBusiness.incorporationState = this.mapUSState(statePart);
      }
    }
    
    // Create office structure if not present
    if (!evisa.offices && evisa.businessName) {
      transformed.evisaBusiness.offices = [{
        type: 'H', // Headquarters
        name: evisa.businessName,
        address: {
          street1: data.travel?.usStreetAddress || data.travel?.companyInfo?.address1,
          street2: data.travel?.usStreetAddress2 || data.travel?.companyInfo?.address2,
          city: data.travel?.usCity || data.travel?.companyInfo?.city,
          state: data.travel?.usState || data.travel?.companyInfo?.state,
          postalCode: data.travel?.usZipCode || data.travel?.companyInfo?.zipCode,
          country: 'USA'
        },
        phone: data.contact?.workPhone || data.workEducation?.presentEmployer?.phone
      }];
    }
    
    // Parse business nature
    if (evisa.businessType && !evisa.natureOfBusiness) {
      transformed.evisaBusiness.natureOfBusiness = this.parseBusinessNature(evisa.businessType);
    }
    
    return transformed;
  }

  // Find matching value in data for a field ID
  findMatchingValue(fieldId, data) {
    // Transform evisaBusiness data if needed
    data = this.transformEvisaBusinessData(data);
    
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
        const school = data.workEducation?.education?.institutions?.[index];
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
          const educationCount = data.workEducation?.education?.institutions?.length || 0;
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
      return this.getMonthNumber(data.travel?.intendedArrivalDate);
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
    
    // Special handling for City field based on current page
    // The same field ID is used on multiple pages for different purposes
    if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxCity') {
      const currentPage = this.detectCurrentPage();

      if (currentPage === 'evisaApplicationContact') {
        // On E-visa Application Contact page - contact's city
        return data.evisaApplicationContact?.address?.city ||
               data.evisa_application_contact?.address?.city ||
               data.evisaApplicationContact?.city ||
               data.evisa_application_contact?.city;
      }
      // For travel and other pages, fall through to fieldMappings
      // which will use data.travel?.usCity
    }

    // Special handling for employer fields on E-visa Applicant Present Position page
    // These field IDs are shared with Temporary Work Visa section but need different data sources
    if (currentPageCheck === 'evisaApplicantPosition') {
      // Employer Name
      if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxEmployerName') {
        return data.evisaApplicantPosition?.employerName ||
               data.evisa_applicant_position?.employer_name;
      }

      // Years With Employer
      if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxYearsWithEmployer') {
        return data.evisaApplicantPosition?.yearsWithEmployer ||
               data.evisa_applicant_position?.years_with_employer;
      }

      // Employer Street Address 1
      if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress1') {
        return data.evisaApplicantPosition?.employerAddress?.street1 ||
               data.evisa_applicant_position?.employer_address?.street1;
      }

      // Employer Street Address 2
      if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress2') {
        return data.evisaApplicantPosition?.employerAddress?.street2 ||
               data.evisa_applicant_position?.employer_address?.street2;
      }

      // Employer City
      if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpCity') {
        return data.evisaApplicantPosition?.employerAddress?.city ||
               data.evisa_applicant_position?.employer_address?.city;
      }

      // Employer Country
      if (fieldId === 'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpCountry') {
        return this.mapCountry(data.evisaApplicantPosition?.employerAddress?.country ||
               data.evisa_applicant_position?.employer_address?.country);
      }
    }
    // For other pages (Temporary Work Visa section, etc.), fall through to fieldMappings

    // Helper function to handle missing security fields - defaults to false
    // This allows the JSON to omit the entire security section if all values are false
    const getSecurityValue = (value) => {
      return value === true || value === 'YES' || value === 'yes';
    };
    
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
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_CITY':
        data.personal?.birthCity ? data.personal.birthCity.substring(0, 20) : undefined,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_ST_PROVINCE': data.personal?.birthState,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_POB_CNTRY': this.mapCountry(data.personal?.birthCountry),
      
      // Other names - Using structured format {surname: "", givenName: ""}
      'ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl00_tbxSURNAME': (() => {
        const otherName = data.personal?.otherNames?.[0];
        if (!otherName) return '';
        return otherName.surname || '';
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_DListAlias_ctl00_tbxGIVEN_NAME': (() => {
        const otherName = data.personal?.otherNames?.[0];
        if (!otherName) return '';
        return otherName.givenName || '';
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
      'ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_NATL': this.mapCountry(data.personal?.nationality),
      
      // Dynamic fields for other nationalities (conditional - appear when "Yes" selected)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_ddlOTHER_NATL': this.mapCountry(data.personal?.otherNationalities?.[0]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl01_ddlOTHER_NATL': this.mapCountry(data.personal?.otherNationalities?.[1]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl00_tbxOTHER_PPT_NUM': data.personal?.otherPassportNumbers?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOTHER_NATL_ctl01_tbxOTHER_PPT_NUM': data.personal?.otherPassportNumbers?.[1],
      
      // Permanent resident country (conditional - appears when permanent resident = "Yes")
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOthPermResCntry_ctl00_ddlOthPermResCntry': this.mapCountry(data.personal?.permanentResidentCountry),
      
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
      
      // Principal Applicant fields (used for primary applicants on certain visa types)
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPrincipleAppSurname': data.travel?.principalApplicant?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPrincipleAppGivenName': data.travel?.principalApplicant?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPRIN_APP_PETITION_NUM': data.travel?.petitionNumber || data.travel?.principalApplicant?.petitionNumber,
      
      // E-visa specific fields for EXECUTIVE/MGR/ESSENTIAL EMP (E1/E2)
      // Radio button: Has the principal Treaty Trader/Investor already been issued a visa?
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_rblEvisaEX_0': 
        data.travel?.principalVisaIssued === true,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_rblEvisaEX_1': 
        data.travel?.principalVisaIssued === false || !data.travel?.principalVisaIssued,
      
      // If principal visa already issued (for E2-EX, E1-EX types)
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxEVPrincipleAppSurname': 
        data.travel?.evisaPrincipal?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxEVPrincipleAppGivenName': 
        data.travel?.evisaPrincipal?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlDOBDay': 
        this.parseDate(data.travel?.evisaPrincipal?.dateOfBirth)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_ddlDOBMonth': 
        this.parseDate(data.travel?.evisaPrincipal?.dateOfBirth)?.month,
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxDOBYear': 
        this.parseDate(data.travel?.evisaPrincipal?.dateOfBirth)?.year,
      
      // Principal's company (for E2-SP, E2-CH, E1-SP, E1-CH types)
      'ctl00_SiteContentPlaceHolder_FormView1_dlPrincipalAppTravel_ctl00_tbxPrincipalAppCompany': 
        data.travel?.principalApplicant?.companyName,
      
      // Intended Travel Date - Use intendedArrivalDate since intendedTravelDate doesn't exist
      'ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEDay': this.parseDate(data.travel?.intendedArrivalDate)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlTRAVEL_DTEMonth': this.getMonthNumber(data.travel?.intendedArrivalDate),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTRAVEL_DTEYear': this.parseDate(data.travel?.intendedArrivalDate)?.year,
      
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
        this.parseDate(data.previousTravel?.visits?.[0]?.arrivalDate || data.previousTravel?.visits?.[0]?.entryDate)?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_DTEMonth': (() => {
        const visit1 = data.previousTravel?.visits?.[0];
        const date = visit1?.arrivalDate || visit1?.entryDate;
        const monthValue = this.getMonthNumber(date);
        console.log(`[MONTH BUG DEBUG] Visit 1 (ctl00): date="${date}", month="${monthValue}"`);
        return monthValue;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_tbxPREV_US_VISIT_DTEYear': 
        this.parseDate(data.previousTravel?.visits?.[0]?.arrivalDate || data.previousTravel?.visits?.[0]?.entryDate)?.year,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_tbxPREV_US_VISIT_LOS': 
        data.previousTravel?.visits?.[0]?.lengthOfStayNumber || this.parseLengthOfStay(data.previousTravel?.visits?.[0]?.lengthOfStay)?.number,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_ddlPREV_US_VISIT_LOS_CD': 
        this.mapStayUnit(data.previousTravel?.visits?.[0]?.lengthOfStayUnit || this.parseLengthOfStay(data.previousTravel?.visits?.[0]?.lengthOfStay)?.unit),
      
      // Additional visits - Only fill if the visit data exists
      // Visit 2 (ctl01)
      ...(() => {
        const visit2 = data.previousTravel?.visits?.[1];
        if (visit2) {
          return {
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_DTEDay': 
              this.parseDate(visit2.arrivalDate || visit2.entryDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_DTEMonth': (() => {
              const date = visit2.arrivalDate || visit2.entryDate;
              const monthValue = this.getMonthNumber(date);
              console.log(`[MONTH BUG DEBUG] Visit 2 (ctl01): date="${date}", month="${monthValue}"`);
              return monthValue;
            })(),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit2.arrivalDate || visit2.entryDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_tbxPREV_US_VISIT_LOS': 
              visit2.lengthOfStayNumber || this.parseLengthOfStay(visit2.lengthOfStay)?.number,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl01_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit2.lengthOfStayUnit || this.parseLengthOfStay(visit2.lengthOfStay)?.unit)
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
              this.parseDate(visit3.arrivalDate || visit3.entryDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_ddlPREV_US_VISIT_DTEMonth': (() => {
              const date = visit3.arrivalDate || visit3.entryDate;
              const monthValue = this.getMonthNumber(date);
              console.log(`[MONTH BUG DEBUG] Visit 3 (ctl02): date="${date}", month="${monthValue}"`);
              return monthValue;
            })(),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit3.arrivalDate || visit3.entryDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_tbxPREV_US_VISIT_LOS': 
              visit3.lengthOfStayNumber || this.parseLengthOfStay(visit3.lengthOfStay)?.number,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl02_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit3.lengthOfStayUnit || this.parseLengthOfStay(visit3.lengthOfStay)?.unit)
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
              this.parseDate(visit4.arrivalDate || visit4.entryDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_ddlPREV_US_VISIT_DTEMonth': (() => {
              const date = visit4.arrivalDate || visit4.entryDate;
              const monthValue = this.getMonthNumber(date);
              console.log(`[MONTH BUG DEBUG] Visit 4 (ctl03): date="${date}", month="${monthValue}"`);
              return monthValue;
            })(),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit4.arrivalDate || visit4.entryDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_tbxPREV_US_VISIT_LOS': 
              visit4.lengthOfStayNumber || this.parseLengthOfStay(visit4.lengthOfStay)?.number,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl03_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit4.lengthOfStayUnit || this.parseLengthOfStay(visit4.lengthOfStay)?.unit)
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
              this.parseDate(visit5.arrivalDate || visit5.entryDate)?.day,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_ddlPREV_US_VISIT_DTEMonth': (() => {
              const date = visit5.arrivalDate || visit5.entryDate;
              const monthValue = this.getMonthNumber(date);
              console.log(`[MONTH BUG DEBUG] Visit 5 (ctl04): date="${date}", month="${monthValue}"`);
              return monthValue;
            })(),
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_tbxPREV_US_VISIT_DTEYear': 
              this.parseDate(visit5.arrivalDate || visit5.entryDate)?.year,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_tbxPREV_US_VISIT_LOS': 
              visit5.lengthOfStayNumber || this.parseLengthOfStay(visit5.lengthOfStay)?.number,
            'ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl04_ddlPREV_US_VISIT_LOS_CD': 
              this.mapStayUnit(visit5.lengthOfStayUnit || this.parseLengthOfStay(visit5.lengthOfStay)?.unit)
          };
        }
        return {};
      })(),
      
      // US Driver's License - Support both array and single format
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUS_DRIVER_LICENSE_ctl00_tbxUS_DRIVER_LICENSE': (() => {
        // Only fill if has license is true
        if (data.previousTravel?.driverLicense?.hasLicense !== true) {
          return null; // Don't fill if they don't have a license
        }
        // Check for array format first (licenses), then fall back to single format (number)
        const licenseNumber = data.previousTravel?.driverLicense?.licenses?.[0]?.number || 
                             data.previousTravel?.driverLicense?.number;
        console.log('[DRIVER LICENSE] Number field mapping:', licenseNumber);
        return licenseNumber;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUS_DRIVER_LICENSE_ctl00_ddlUS_DRIVER_LICENSE_STATE': (() => {
        // Only fill if has license is true
        if (data.previousTravel?.driverLicense?.hasLicense !== true) {
          return null; // Don't fill if they don't have a license
        }
        // Check for array format first (licenses), then fall back to single format (state)
        const state = data.previousTravel?.driverLicense?.licenses?.[0]?.state || 
                     data.previousTravel?.driverLicense?.state;
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
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou_0': 
        data.travelCompanions && data.travelCompanions.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherPersonsTravelingWithYou_1': 
        !data.travelCompanions || data.travelCompanions.length === 0,
      
      // Are you traveling as part of a group or organization?
      'ctl00_SiteContentPlaceHolder_FormView1_rblGroupTravel_0': 
        data.travelGroup?.traveling === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblGroupTravel_1': 
        data.travelGroup?.traveling !== true,
      
      // Group name (if traveling as group - but we always select No)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxGroupName': 
        data.travelGroup?.name || '',
      
      // Travel companion details (if traveling with others)
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_tbxSurname': 
        data.travelCompanions?.[0]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_tbxGivenName': 
        data.travelCompanions?.[0]?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl00_ddlTCRelationship': 
        this.mapRelationship(data.travelCompanions?.[0]?.relationship),
      
      // Additional travel companions (if more than one)
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl01_tbxSurname': 
        data.travelCompanions?.[1]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl01_tbxGivenName': 
        data.travelCompanions?.[1]?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl01_ddlTCRelationship': 
        this.mapRelationship(data.travelCompanions?.[1]?.relationship),
      
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl02_tbxSurname': 
        data.travelCompanions?.[2]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl02_tbxGivenName': 
        data.travelCompanions?.[2]?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dlTravelCompanions_ctl02_ddlTCRelationship': 
        this.mapRelationship(data.travelCompanions?.[2]?.relationship),
      
      // Group travel name (if traveling as part of a group)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxGroupName': 
        data.travelGroup?.name,
      
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
      
      // ESTA denial - Have you ever been denied travel authorization by DHS through ESTA?
      'ctl00_SiteContentPlaceHolder_FormView1_rblVWP_DENIAL_IND_0': 
        data.previousTravel?.estaDenied === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblVWP_DENIAL_IND_1': 
        data.previousTravel?.estaDenied === false || !data.previousTravel?.estaDenied,
      
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
      
      // Have you been to US before radio buttons
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_VISIT_IND_0': 
        data.previousTravel?.hasBeenToUS === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_VISIT_IND_1': 
        data.previousTravel?.hasBeenToUS === false || !data.previousTravel?.hasBeenToUS,
      
      // US Driver's License radio buttons (using correct field names from the form)
      'ctl00_SiteContentPlaceHolder_FormView1_rblUS_DRIVER_LICENSE_IND_0': 
        data.previousTravel?.driverLicense?.hasLicense === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblUS_DRIVER_LICENSE_IND_1': 
        data.previousTravel?.driverLicense?.hasLicense === false || !data.previousTravel?.driverLicense?.hasLicense,
      
      // Also keeping old field names for backward compatibility
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
        data.previousTravel?.previousVisa?.sameType === true || data.previousTravel?.previousVisa?.sameVisaType === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblPREV_VISA_SAME_TYPE_IND_1': 
        (data.previousTravel?.previousVisa?.sameType === false || data.previousTravel?.previousVisa?.sameVisaType === false) || 
        (!data.previousTravel?.previousVisa?.sameType && !data.previousTravel?.previousVisa?.sameVisaType),
      
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
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN2': data.contact?.homeStreet2 || data.contact?.homeApt,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_CITY': data.contact?.homeCity,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_STATE': data.contact?.homeState,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_ADDR_STATE_NA': 
        !data.contact?.homeState || data.contact?.homeState === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_POSTAL_CD': data.contact?.homePostalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexAPP_ADDR_POSTAL_CD_NA': 
        !data.contact?.homePostalCode || data.contact?.homePostalCode === 'N/A',
      'ctl00_SiteContentPlaceHolder_FormView1_ddlCountry': (() => {
        const country = data.contact?.homeCountry;
        const mapped = this.mapCountry(country);
        console.log('[HOME COUNTRY] Input:', country, '→ Mapped:', mapped);
        return mapped;
      })(),
      
      // Mailing Address Same as Home
      'ctl00_SiteContentPlaceHolder_FormView1_rblMailingAddrSame_0': 
        data.contact?.mailingSameAsHome === true || data.contact?.mailingAddressSameAsHome === true || 
        data.contact?.mailingSameAsHome === 'YES' || data.contact?.mailingAddressSameAsHome === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblMailingAddrSame_1': 
        data.contact?.mailingSameAsHome === false || data.contact?.mailingAddressSameAsHome === false || 
        data.contact?.mailingSameAsHome === 'NO' || data.contact?.mailingAddressSameAsHome === 'NO',
      
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
        data.contact?.hasOtherEmails === 'YES' || (data.contact?.otherEmails && data.contact?.otherEmails.length > 0) || (data.contact?.additionalEmails && data.contact?.additionalEmails.length > 0),
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddEmail_1':
        data.contact?.hasOtherEmails === 'NO' || (!data.contact?.otherEmails || data.contact?.otherEmails.length === 0) && (!data.contact?.additionalEmails || data.contact?.additionalEmails.length === 0),
      
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
      // Always default to NO - this information is not needed
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddSocial_0': false,  // Yes radio button - always false
      'ctl00_SiteContentPlaceHolder_FormView1_rblAddSocial_1': true,   // No radio button - always true
      
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
        const handle = data.contact?.socialMediaAccounts?.[0]?.handle || 
                      data.contact?.socialMedia?.[0]?.handle || 
                      data.contact?.socialMedia?.[0]?.username ||  // Support username field
                      data.contact?.socialMedia?.[0]?.identifier;
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
        const handle = data.contact?.socialMediaAccounts?.[1]?.handle || 
                      data.contact?.socialMedia?.[1]?.handle ||
                      data.contact?.socialMedia?.[1]?.username;  // Support username field
        console.log('[SOCIAL MEDIA] Handle 1:', handle);
        return handle;
      })(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl02_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[2]?.platform || data.contact?.socialMedia?.[2]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl02_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[2]?.handle || data.contact?.socialMedia?.[2]?.handle || data.contact?.socialMedia?.[2]?.username,
      // Additional social media fields (up to 10 total)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl03_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[3]?.platform || data.contact?.socialMedia?.[3]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl03_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[3]?.handle || data.contact?.socialMedia?.[3]?.handle || data.contact?.socialMedia?.[3]?.username,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl04_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[4]?.platform || data.contact?.socialMedia?.[4]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl04_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[4]?.handle || data.contact?.socialMedia?.[4]?.handle || data.contact?.socialMedia?.[4]?.username,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl05_ddlSocialMedia': 
        this.mapSocialMediaPlatform(data.contact?.socialMediaAccounts?.[5]?.platform || data.contact?.socialMedia?.[5]?.platform),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlSocial_ctl05_tbxSocialMediaIdent': 
        data.contact?.socialMediaAccounts?.[5]?.handle || data.contact?.socialMedia?.[5]?.handle || data.contact?.socialMedia?.[5]?.username,
      
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
      // PPT_ISSUED_CNTRY = The government/country that issued the passport
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_CNTRY': 
        this.mapCountry(data.passport?.issuingAuthority),
      // PPT_ISSUED_IN_CNTRY = Physical location country where passport was issued  
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_IN_CNTRY': 
        this.mapCountry(data.passport?.issueCountry),
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
        this.mapSpouseAddressType(data.family?.spouse?.addressType || data.family?.spouse?.address || data.family?.spouseAddress),
      
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
        data.usContact?.contactPerson?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_GIVEN_NAME':
        data.usContact?.contactPerson?.givenName,
      // DISABLED: Do not auto-check "Do Not Know" - paralegals fill manually when client doesn't provide
      'ctl00_SiteContentPlaceHolder_FormView1_cbxUS_POC_NAME_NA':
        false,

      // Organization
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ORGANIZATION': (() => {
        const org = data.usContact?.organizationName;
        // Don't fill the text field if it's N/A - the checkbox will be checked instead
        return (org && org !== 'N/A') ? org : null;
      })(),
      // DISABLED: Do not auto-check "Do Not Know" - paralegals fill manually when client doesn't provide
      'ctl00_SiteContentPlaceHolder_FormView1_cbxUS_POC_ORG_NA_IND':
        false,

      // Relationship
      'ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_REL_TO_APP':
        this.mapRelationship(data.usContact?.relationship),

      // Contact Address
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_LN1':
        data.usContact?.address?.street1,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_LN2':
        data.usContact?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_CITY':
        data.usContact?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlUS_POC_ADDR_STATE':
        data.usContact?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_ADDR_POSTAL_CD':
        data.usContact?.address?.zipCode,

      // Contact Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_HOME_TEL':
        data.usContact?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxUS_POC_EMAIL_ADDR':
        data.usContact?.email,
      // DISABLED: Do not auto-check "Do Not Know" - paralegals fill manually when client doesn't provide
      'ctl00_SiteContentPlaceHolder_FormView1_cbexUS_POC_EMAIL_ADDR_NA':
        false,
      
      // === PRESENT WORK/EDUCATION/TRAINING INFORMATION PAGE ===
      // Primary Occupation
      'ctl00_SiteContentPlaceHolder_FormView1_ddlPresentOccupation': 
        this.mapOccupation(data.workEducation?.primaryOccupation),
      
      // Specify Other (when Primary Occupation is OTHER)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxExplainOtherPresentOccupation': 
        data.workEducation?.primaryOccupationOther || data.workEducation?.occupationOther,
      
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
        data.workEducation?.education?.institutions && data.workEducation?.education?.institutions.length > 0,
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherEduc_1': 
        !data.workEducation?.education?.institutions || data.workEducation?.education?.institutions.length === 0,
      
      // Dynamic Previous Employers (up to 5 entries typically)
      // First Employer (ctl00)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[0]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[0]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[0]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[0]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[0]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[0]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[0]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[0]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[0]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[0]?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbJobTitle': 
        data.workEducation?.previousEmployers?.[0]?.duties,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[0]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[0]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[0]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[0]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateFromDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[0]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[0]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxEmpDateFromYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[0]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateToDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[0]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_ddlEmpDateToMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[0]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbxEmpDateToYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[0]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl00_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[0]?.duties,
      
      // Second Employer (ctl01) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[1]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[1]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[1]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[1]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[1]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[1]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[1]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[1]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[1]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[1]?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbJobTitle': 
        data.workEducation?.previousEmployers?.[1]?.duties,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[1]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[1]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[1]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[1]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateFromDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[1]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[1]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxEmpDateFromYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[1]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateToDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[1]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_ddlEmpDateToMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[1]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbxEmpDateToYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[1]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl01_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[1]?.duties,
      
      // Third Employer (ctl02) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[2]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[2]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[2]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[2]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[2]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[2]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[2]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[2]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[2]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[2]?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbJobTitle': 
        data.workEducation?.previousEmployers?.[2]?.duties,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[2]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[2]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[2]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[2]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateFromDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[2]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[2]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxEmpDateFromYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[2]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateToDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[2]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_ddlEmpDateToMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[2]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbxEmpDateToYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[2]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl02_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[2]?.duties,
      
      // Fourth Employer (ctl03) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[3]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[3]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[3]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[3]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[3]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[3]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[3]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[3]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[3]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[3]?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbJobTitle': 
        data.workEducation?.previousEmployers?.[3]?.duties,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[3]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[3]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[3]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[3]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateFromDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[3]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[3]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxEmpDateFromYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[3]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateToDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[3]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_ddlEmpDateToMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[3]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbxEmpDateToYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[3]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl03_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[3]?.duties,
      
      // Fifth Employer (ctl04) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerName': 
        this.sanitizeEmployerName(data.workEducation?.previousEmployers?.[4]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerStreetAddress1': 
        this.truncateAddress(data.workEducation?.previousEmployers?.[4]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerStreetAddress2': 
        data.workEducation?.previousEmployers?.[4]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerCity': 
        data.workEducation?.previousEmployers?.[4]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxPREV_EMPL_ADDR_STATE': 
        data.workEducation?.previousEmployers?.[4]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxPREV_EMPL_ADDR_STATE_NA': 
        !data.workEducation?.previousEmployers?.[4]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxPREV_EMPL_ADDR_POSTAL_CD': 
        data.workEducation?.previousEmployers?.[4]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxPREV_EMPL_ADDR_POSTAL_CD_NA': 
        !data.workEducation?.previousEmployers?.[4]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_DropDownList2': 
        this.mapCountry(data.workEducation?.previousEmployers?.[4]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbEmployerPhone': 
        data.workEducation?.previousEmployers?.[4]?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbJobTitle': 
        data.workEducation?.previousEmployers?.[4]?.duties,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbSupervisorSurname': 
        data.workEducation?.previousEmployers?.[4]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxSupervisorSurname_NA': 
        !data.workEducation?.previousEmployers?.[4]?.supervisorSurname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbSupervisorGivenName': 
        data.workEducation?.previousEmployers?.[4]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_cbxSupervisorGivenName_NA': 
        !data.workEducation?.previousEmployers?.[4]?.supervisorGivenName,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateFromDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[4]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[4]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxEmpDateFromYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[4]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateToDay': 
        (() => this.getDayFromDate(data.workEducation?.previousEmployers?.[4]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_ddlEmpDateToMonth': 
        (() => this.getMonthNumber(data.workEducation?.previousEmployers?.[4]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbxEmpDateToYear': 
        (() => this.getYearFromDate(data.workEducation?.previousEmployers?.[4]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEmpl_ctl04_tbDescribeDuties': 
        data.workEducation?.previousEmployers?.[4]?.duties,
      
      // Dynamic Previous Education (up to 5 entries typically)
      // First School (ctl00)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.education?.institutions?.[0]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.education?.institutions?.[0]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolAddr2': 
        data.workEducation?.education?.institutions?.[0]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolCity': 
        data.workEducation?.education?.institutions?.[0]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.education?.institutions?.[0]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.education?.institutions?.[0]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.education?.institutions?.[0]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.education?.institutions?.[0]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.education?.institutions?.[0]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolCourseOfStudy': 
        data.workEducation?.education?.institutions?.[0]?.courseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolFromDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[0]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[0]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolFromYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[0]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolToDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[0]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_ddlSchoolToMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[0]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl00_tbxSchoolToYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[0]?.toDate))(),
      
      // Second School (ctl01) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.education?.institutions?.[1]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.education?.institutions?.[1]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolAddr2': 
        data.workEducation?.education?.institutions?.[1]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolCity': 
        data.workEducation?.education?.institutions?.[1]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.education?.institutions?.[1]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.education?.institutions?.[1]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.education?.institutions?.[1]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.education?.institutions?.[1]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.education?.institutions?.[1]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolCourseOfStudy': 
        data.workEducation?.education?.institutions?.[1]?.courseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolFromDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[1]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[1]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolFromYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[1]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolToDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[1]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_ddlSchoolToMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[1]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl01_tbxSchoolToYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[1]?.toDate))(),
      
      // Third School (ctl02) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.education?.institutions?.[2]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.education?.institutions?.[2]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolAddr2': 
        data.workEducation?.education?.institutions?.[2]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolCity': 
        data.workEducation?.education?.institutions?.[2]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.education?.institutions?.[2]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.education?.institutions?.[2]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.education?.institutions?.[2]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.education?.institutions?.[2]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.education?.institutions?.[2]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolCourseOfStudy': 
        data.workEducation?.education?.institutions?.[2]?.courseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolFromDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[2]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[2]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolFromYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[2]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolToDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[2]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_ddlSchoolToMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[2]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl02_tbxSchoolToYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[2]?.toDate))(),
      
      // Fourth School (ctl03) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.education?.institutions?.[3]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.education?.institutions?.[3]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolAddr2': 
        data.workEducation?.education?.institutions?.[3]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolCity': 
        data.workEducation?.education?.institutions?.[3]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.education?.institutions?.[3]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.education?.institutions?.[3]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.education?.institutions?.[3]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.education?.institutions?.[3]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.education?.institutions?.[3]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolCourseOfStudy': 
        data.workEducation?.education?.institutions?.[3]?.courseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolFromDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[3]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[3]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolFromYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[3]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolToDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[3]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_ddlSchoolToMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[3]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl03_tbxSchoolToYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[3]?.toDate))(),
      
      // Fifth School (ctl04) - if exists
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolName': 
        this.sanitizeEmployerName(data.workEducation?.education?.institutions?.[4]?.name),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolAddr1': 
        this.truncateAddress(data.workEducation?.education?.institutions?.[4]?.address?.street1),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolAddr2': 
        data.workEducation?.education?.institutions?.[4]?.address?.street2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolCity': 
        data.workEducation?.education?.institutions?.[4]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxEDUC_INST_ADDR_STATE': 
        data.workEducation?.education?.institutions?.[4]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_cbxEDUC_INST_ADDR_STATE_NA': 
        !data.workEducation?.education?.institutions?.[4]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxEDUC_INST_POSTAL_CD': 
        data.workEducation?.education?.institutions?.[4]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_cbxEDUC_INST_POSTAL_CD_NA': 
        !data.workEducation?.education?.institutions?.[4]?.address?.postalCode,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolCountry': 
        this.mapCountry(data.workEducation?.education?.institutions?.[4]?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolCourseOfStudy': 
        data.workEducation?.education?.institutions?.[4]?.courseOfStudy,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolFromDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[4]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolFromMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[4]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolFromYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[4]?.fromDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolToDay': 
        (() => this.getDayFromDate(data.workEducation?.education?.institutions?.[4]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_ddlSchoolToMonth': 
        (() => this.getMonthNumber(data.workEducation?.education?.institutions?.[4]?.toDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlPrevEduc_ctl04_tbxSchoolToYear': 
        (() => this.getYearFromDate(data.workEducation?.education?.institutions?.[4]?.toDate))(),
      
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
        data.workEducation?.countriesVisited?.hasVisited === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblCOUNTRIES_VISITED_IND_1': 
        data.workEducation?.countriesVisited?.hasVisited === false || !data.workEducation?.countriesVisited?.hasVisited,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl00_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[0]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl01_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[1]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl02_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[2]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl03_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[3]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl04_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[4]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl05_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[5]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl06_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[6]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl07_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[7]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl08_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[8]),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlCountriesVisited_ctl09_ddlCOUNTRIES_VISITED': 
        this.mapCountry(data.workEducation?.countriesVisited?.countries?.[9]),
      
      // Clan/Tribe Membership
      'ctl00_SiteContentPlaceHolder_FormView1_rblCLAN_TRIBE_IND_0': 
        data.workEducation?.clanTribe?.belongsToClan === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblCLAN_TRIBE_IND_1': 
        data.workEducation?.clanTribe?.belongsToClan === false || !data.workEducation?.clanTribe?.belongsToClan,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxCLAN_TRIBE_NAME': 
        data.workEducation?.clanTribe?.clanName,
      
      // Organization Membership
      'ctl00_SiteContentPlaceHolder_FormView1_rblORGANIZATION_IND_0': 
        data.workEducation?.organizationMembership?.hasMembership === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblORGANIZATION_IND_1': 
        data.workEducation?.organizationMembership?.hasMembership === false || !data.workEducation?.organizationMembership?.hasMembership,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl00_tbxORGANIZATION_NAME': 
        data.workEducation?.organizationMembership?.organizations?.[0]?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl01_tbxORGANIZATION_NAME': 
        data.workEducation?.organizationMembership?.organizations?.[1]?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl02_tbxORGANIZATION_NAME': 
        data.workEducation?.organizationMembership?.organizations?.[2]?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl03_tbxORGANIZATION_NAME': 
        data.workEducation?.organizationMembership?.organizations?.[3]?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlORGANIZATIONS_ctl04_tbxORGANIZATION_NAME': 
        data.workEducation?.organizationMembership?.organizations?.[4]?.name,
      
      // Military Service
      'ctl00_SiteContentPlaceHolder_FormView1_rblMILITARY_SERVICE_IND_0': 
        data.workEducation?.militaryService?.hasServed === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblMILITARY_SERVICE_IND_1': 
        data.workEducation?.militaryService?.hasServed === false || !data.workEducation?.militaryService?.hasServed,
      
      // Military Service Details (dynamic)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_CNTRY': 
        this.mapCountry(data.workEducation?.militaryService?.details?.[0]?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_BRANCH': 
        data.workEducation?.militaryService?.details?.[0]?.branch,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_RANK': 
        data.workEducation?.militaryService?.details?.[0]?.rank,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_SPECIALTY': 
        data.workEducation?.militaryService?.details?.[0]?.specialty,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_FROMDay': 
        (() => this.getDayFromDate(data.workEducation?.militaryService?.details?.[0]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_FROMMonth': 
        (() => this.getMonthNumber(data.workEducation?.militaryService?.details?.[0]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_FROMYear': 
        (() => this.getYearFromDate(data.workEducation?.militaryService?.details?.[0]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_TODay': 
        (() => this.getDayFromDate(data.workEducation?.militaryService?.details?.[0]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_ddlMILITARY_SVC_TOMonth': 
        (() => this.getMonthNumber(data.workEducation?.militaryService?.details?.[0]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl00_tbxMILITARY_SVC_TOYear': 
        (() => this.getYearFromDate(data.workEducation?.militaryService?.details?.[0]?.endDate))(),
      
      // Additional Military Service entries (if exists)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_ddlMILITARY_SVC_CNTRY': 
        this.mapCountry(data.workEducation?.militaryService?.details?.[1]?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_tbxMILITARY_SVC_BRANCH': 
        data.workEducation?.militaryService?.details?.[1]?.branch,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_tbxMILITARY_SVC_RANK': 
        data.workEducation?.militaryService?.details?.[1]?.rank,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_tbxMILITARY_SVC_SPECIALTY': 
        data.workEducation?.militaryService?.details?.[1]?.specialty,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_ddlMILITARY_SVC_FROMDay': 
        (() => this.getDayFromDate(data.workEducation?.militaryService?.details?.[1]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_ddlMILITARY_SVC_FROMMonth': 
        (() => this.getMonthNumber(data.workEducation?.militaryService?.details?.[1]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_tbxMILITARY_SVC_FROMYear': 
        (() => this.getYearFromDate(data.workEducation?.militaryService?.details?.[1]?.startDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_ddlMILITARY_SVC_TODay': 
        (() => this.getDayFromDate(data.workEducation?.militaryService?.details?.[1]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_ddlMILITARY_SVC_TOMonth': 
        (() => this.getMonthNumber(data.workEducation?.militaryService?.details?.[1]?.endDate))(),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlMILITARY_SERVICE_ctl01_tbxMILITARY_SVC_TOYear': 
        (() => this.getYearFromDate(data.workEducation?.militaryService?.details?.[1]?.endDate))(),
      
      // Specialized Skills
      'ctl00_SiteContentPlaceHolder_FormView1_rblSPECIALIZED_SKILLS_IND_0': 
        data.workEducation?.specializedSkills?.hasSkills === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblSPECIALIZED_SKILLS_IND_1': 
        data.workEducation?.specializedSkills?.hasSkills === false || !data.workEducation?.specializedSkills?.hasSkills,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSPECIALIZED_SKILLS_EXPL': 
        data.workEducation?.specializedSkills?.explanation,
      
      // Security Questions (Default to NO unless explicitly stated)
      'ctl00_SiteContentPlaceHolder_FormView1_rblINSURGENT_ORG_IND_0': 
        data.workEducation?.insurgentOrganization?.hasInvolvement === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblINSURGENT_ORG_IND_1': 
        data.workEducation?.insurgentOrganization?.hasInvolvement === false || !data.workEducation?.insurgentOrganization?.hasInvolvement,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxINSURGENT_ORG_EXPL': 
        data.workEducation?.insurgentOrganization?.explanation,
      'ctl00_SiteContentPlaceHolder_FormView1_rblTALIBAN_IND_0': 
        data.workEducation?.talibanAssociation === true || data.workEducation?.talibanAssociation === 'YES',
      'ctl00_SiteContentPlaceHolder_FormView1_rblTALIBAN_IND_1': 
        data.workEducation?.talibanAssociation !== true && data.workEducation?.talibanAssociation !== 'YES',
      
      // === SECURITY AND BACKGROUND: PART 1 PAGE ===
      // Medical/Health Questions - DEFAULT TO NO unless explicitly stated
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisease_0': 
        getSecurityValue(data.security?.medicalHealth?.hasInfectiousDisease || data.security?.part1?.disease),
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisease_1': 
        !getSecurityValue(data.security?.medicalHealth?.hasInfectiousDisease || data.security?.part1?.disease),
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisorder_0': 
        getSecurityValue(data.security?.medicalHealth?.hasMentalDisorder || data.security?.part1?.disorder),
      'ctl00_SiteContentPlaceHolder_FormView1_rblDisorder_1': 
        !getSecurityValue(data.security?.medicalHealth?.hasMentalDisorder || data.security?.part1?.disorder),
      'ctl00_SiteContentPlaceHolder_FormView1_rblDruguser_0': 
        getSecurityValue(data.security?.medicalHealth?.hasDrugAbuse || data.security?.part1?.drugUser),
      'ctl00_SiteContentPlaceHolder_FormView1_rblDruguser_1': 
        !getSecurityValue(data.security?.medicalHealth?.hasDrugAbuse || data.security?.part1?.drugUser),
        
      // === SECURITY AND BACKGROUND: PART 2 PAGE ===
      // Criminal/Security Questions - DEFAULT TO NO unless explicitly stated
      // Arrested or convicted
      'ctl00_SiteContentPlaceHolder_FormView1_rblArrested_0': 
        getSecurityValue(data.security?.criminal?.hasBeenArrested || data.security?.part2?.arrested),
      'ctl00_SiteContentPlaceHolder_FormView1_rblArrested_1': 
        !getSecurityValue(data.security?.criminal?.hasBeenArrested || data.security?.part2?.arrested),
        
      // Controlled substances violation
      'ctl00_SiteContentPlaceHolder_FormView1_rblControlledSubstances_0': 
        getSecurityValue(data.security?.criminal?.hasViolatedDrugLaw || data.security?.part2?.controlledSubstances),
      'ctl00_SiteContentPlaceHolder_FormView1_rblControlledSubstances_1': 
        !getSecurityValue(data.security?.criminal?.hasViolatedDrugLaw || data.security?.part2?.controlledSubstances),
        
      // Prostitution
      'ctl00_SiteContentPlaceHolder_FormView1_rblProstitution_0': 
        getSecurityValue(data.security?.criminal?.hasEngagedInProstitution || data.security?.part2?.prostitution),
      'ctl00_SiteContentPlaceHolder_FormView1_rblProstitution_1': 
        !getSecurityValue(data.security?.criminal?.hasEngagedInProstitution || data.security?.part2?.prostitution),
        
      // Money laundering
      'ctl00_SiteContentPlaceHolder_FormView1_rblMoneyLaundering_0': 
        getSecurityValue(data.security?.criminal?.hasEngagedInMoneyLaundering || data.security?.part2?.moneyLaundering),
      'ctl00_SiteContentPlaceHolder_FormView1_rblMoneyLaundering_1': 
        !getSecurityValue(data.security?.criminal?.hasEngagedInMoneyLaundering || data.security?.part2?.moneyLaundering),
        
      // Human trafficking
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTrafficking_0': 
        getSecurityValue(data.security?.criminal?.hasCommittedHumanTrafficking || data.security?.part2?.humanTrafficking),
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTrafficking_1': 
        !getSecurityValue(data.security?.criminal?.hasCommittedHumanTrafficking || data.security?.part2?.humanTrafficking),
        
      // Assisted severe trafficking
      'ctl00_SiteContentPlaceHolder_FormView1_rblAssistedSevereTrafficking_0': 
        getSecurityValue(data.security?.criminal?.hasAssistedInTrafficking || data.security?.part2?.assistedTrafficking),
      'ctl00_SiteContentPlaceHolder_FormView1_rblAssistedSevereTrafficking_1': 
        !getSecurityValue(data.security?.criminal?.hasAssistedInTrafficking || data.security?.part2?.assistedTrafficking),
        
      // Human trafficking related (spouse/son/daughter)
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTraffickingRelated_0': 
        getSecurityValue(data.security?.criminal?.isRelatedToTrafficker || data.security?.part2?.traffickingRelated),
      'ctl00_SiteContentPlaceHolder_FormView1_rblHumanTraffickingRelated_1': 
        !getSecurityValue(data.security?.criminal?.isRelatedToTrafficker || data.security?.part2?.traffickingRelated),
        
      // === SECURITY AND BACKGROUND: PART 3 PAGE ===
      // Security/Terrorism Questions - DEFAULT TO NO unless explicitly stated
      
      // Illegal activity/espionage/sabotage
      'ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity_0':
        getSecurityValue(data.security?.part3?.illegalActivity || data.security?.securityViolations?.hasOtherIllegalActivity),
      'ctl00_SiteContentPlaceHolder_FormView1_rblIllegalActivity_1':
        !getSecurityValue(data.security?.part3?.illegalActivity || data.security?.securityViolations?.hasOtherIllegalActivity),
        
      // Terrorist activity
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristActivity_0':
        getSecurityValue(data.security?.part3?.terroristActivity || data.security?.securityViolations?.hasTerrorism),
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristActivity_1':
        !getSecurityValue(data.security?.part3?.terroristActivity || data.security?.securityViolations?.hasTerrorism),
        
      // Terrorist support (financial)
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristSupport_0':
        getSecurityValue(data.security?.part3?.terroristSupport || data.security?.securityViolations?.hasProvidedFinancialSupport),
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristSupport_1':
        !getSecurityValue(data.security?.part3?.terroristSupport || data.security?.securityViolations?.hasProvidedFinancialSupport),
        
      // Terrorist organization member
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristOrg_0':
        getSecurityValue(data.security?.part3?.terroristOrg || data.security?.securityViolations?.hasTerroristMembership),
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristOrg_1':
        !getSecurityValue(data.security?.part3?.terroristOrg || data.security?.securityViolations?.hasTerroristMembership),
        
      // Related to terrorist (spouse, son, or daughter)
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristRel_0':
        getSecurityValue(data.security?.part3?.terroristRelated),
      'ctl00_SiteContentPlaceHolder_FormView1_rblTerroristRel_1':
        !getSecurityValue(data.security?.part3?.terroristRelated),
        
      // Genocide
      'ctl00_SiteContentPlaceHolder_FormView1_rblGenocide_0':
        getSecurityValue(data.security?.part3?.genocide || data.security?.securityViolations?.hasGenocide),
      'ctl00_SiteContentPlaceHolder_FormView1_rblGenocide_1':
        !getSecurityValue(data.security?.part3?.genocide || data.security?.securityViolations?.hasGenocide),
        
      // Torture
      'ctl00_SiteContentPlaceHolder_FormView1_rblTorture_0':
        getSecurityValue(data.security?.part3?.torture || data.security?.securityViolations?.hasTorture),
      'ctl00_SiteContentPlaceHolder_FormView1_rblTorture_1':
        !getSecurityValue(data.security?.part3?.torture || data.security?.securityViolations?.hasTorture),
        
      // Extrajudicial/political killings
      'ctl00_SiteContentPlaceHolder_FormView1_rblExViolence_0':
        getSecurityValue(data.security?.part3?.extrajudicialViolence || 
          data.security?.securityViolations?.hasExtrajudicialKillings ||
          data.security?.securityViolations?.hasPoliticalKillings),
      'ctl00_SiteContentPlaceHolder_FormView1_rblExViolence_1':
        !getSecurityValue(data.security?.part3?.extrajudicialViolence || 
          data.security?.securityViolations?.hasExtrajudicialKillings ||
          data.security?.securityViolations?.hasPoliticalKillings),
        
      // Child soldier
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildSoldier_0':
        getSecurityValue(data.security?.part3?.childSoldier),
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildSoldier_1':
        !getSecurityValue(data.security?.part3?.childSoldier),
        
      // Religious freedom violation
      'ctl00_SiteContentPlaceHolder_FormView1_rblReligiousFreedom_0':
        getSecurityValue(data.security?.part3?.religiousFreedom || data.security?.securityViolations?.hasReligiousFreedomViolation),
      'ctl00_SiteContentPlaceHolder_FormView1_rblReligiousFreedom_1':
        !getSecurityValue(data.security?.part3?.religiousFreedom || data.security?.securityViolations?.hasReligiousFreedomViolation),
        
      // Population controls (forced abortion/sterilization)
      'ctl00_SiteContentPlaceHolder_FormView1_rblPopulationControls_0':
        getSecurityValue(data.security?.part3?.populationControls),
      'ctl00_SiteContentPlaceHolder_FormView1_rblPopulationControls_1':
        !getSecurityValue(data.security?.part3?.populationControls),
        
      // Organ transplant
      'ctl00_SiteContentPlaceHolder_FormView1_rblTransplant_0':
        getSecurityValue(data.security?.part3?.organTransplant),
      'ctl00_SiteContentPlaceHolder_FormView1_rblTransplant_1':
        !getSecurityValue(data.security?.part3?.organTransplant),
        
      // === SECURITY AND BACKGROUND: PART 4 PAGE ===
      // Immigration Questions - DEFAULT TO NO unless explicitly stated
      
      // Immigration fraud/misrepresentation
      'ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud_0':
        getSecurityValue(data.security?.part4?.immigrationFraud || 
          data.security?.immigration?.hasImmigrationFraud ||
          data.security?.immigration?.hasVisaFraud),
      'ctl00_SiteContentPlaceHolder_FormView1_rblImmigrationFraud_1':
        !getSecurityValue(data.security?.part4?.immigrationFraud || 
          data.security?.immigration?.hasImmigrationFraud ||
          data.security?.immigration?.hasVisaFraud),
        
      // Failed to attend removal proceedings
      'ctl00_SiteContentPlaceHolder_FormView1_rblFailToAttend_0':
        getSecurityValue(data.security?.part4?.failedToAttend),
      'ctl00_SiteContentPlaceHolder_FormView1_rblFailToAttend_1':
        !getSecurityValue(data.security?.part4?.failedToAttend),
        
      // Unlawful presence (subject to 3 or 10 year bar)
      'ctl00_SiteContentPlaceHolder_FormView1_rblVisaViolation_0':
        getSecurityValue(data.security?.part4?.visaViolation || data.security?.other?.hasViolatedUSVisa),
      'ctl00_SiteContentPlaceHolder_FormView1_rblVisaViolation_1':
        !getSecurityValue(data.security?.part4?.visaViolation || data.security?.other?.hasViolatedUSVisa),
        
      // Removal hearing (ordered to appear before immigration judge)
      'ctl00_SiteContentPlaceHolder_FormView1_rblRemovalHearing_0':
        getSecurityValue(data.security?.part4?.removalHearing),
      'ctl00_SiteContentPlaceHolder_FormView1_rblRemovalHearing_1':
        !getSecurityValue(data.security?.part4?.removalHearing),
        
      // Deportation or removal from US
      'ctl00_SiteContentPlaceHolder_FormView1_rblDeport_0':
        getSecurityValue(data.security?.part4?.deported || data.security?.part4?.deportation),
      'ctl00_SiteContentPlaceHolder_FormView1_rblDeport_1':
        !getSecurityValue(data.security?.part4?.deported || data.security?.part4?.deportation),
        
      // === SECURITY AND BACKGROUND: PART 5 PAGE ===
      // Other Questions - DEFAULT TO NO unless explicitly stated
      
      // Child custody
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody_0':
        getSecurityValue(data.security?.part5?.childCustody || data.security?.other?.hasChildCustodyIssue),
      'ctl00_SiteContentPlaceHolder_FormView1_rblChildCustody_1':
        !getSecurityValue(data.security?.part5?.childCustody || data.security?.other?.hasChildCustodyIssue),
        
      // Voting violation
      'ctl00_SiteContentPlaceHolder_FormView1_rblVotingViolation_0':
        getSecurityValue(data.security?.part5?.votingViolation || data.security?.other?.hasVotingViolation),
      'ctl00_SiteContentPlaceHolder_FormView1_rblVotingViolation_1':
        !getSecurityValue(data.security?.part5?.votingViolation || data.security?.other?.hasVotingViolation),
        
      // Renounced US citizenship for tax purposes
      'ctl00_SiteContentPlaceHolder_FormView1_rblRenounceExp_0':
        getSecurityValue(data.security?.part5?.renounceExpenses),
      'ctl00_SiteContentPlaceHolder_FormView1_rblRenounceExp_1':
        !getSecurityValue(data.security?.part5?.renounceExpenses),
        
      // Attended public school (F-1 violation)
      'ctl00_SiteContentPlaceHolder_FormView1_rblSchoolViolation_0':
        getSecurityValue(data.security?.other?.hasAttendedPublicSchool),
      'ctl00_SiteContentPlaceHolder_FormView1_rblSchoolViolation_1':
        !getSecurityValue(data.security?.other?.hasAttendedPublicSchool),
        
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
      // Handles both regular temporary work visas (L, H, O) and E-visas
      // Application Receipt/Petition Number (still using WP_APP_RCPT_NUM for this field)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxWP_APP_RCPT_NUM': 
        data.travel?.petitionNumber || data.petition?.receiptNumber || data.temporaryWork?.petitionNumber || data.petitionerInfo?.petitionNumber,
        
      // Name of Person/Company who Filed Petition
      'ctl00_SiteContentPlaceHolder_FormView1_tbxNameOfPetitioner':
        data.temporaryWork?.petitionerName || 
        data.petition?.petitionerName || 
        data.petitionerInfo?.petitionerCompanyName,
        
      // Where Do You Intend to Work - Employer Information
      // Supports temporaryWork (L/H/O), evisaBusiness (E visas), and evisaApplicantPosition (E visa current employer)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmployerName':
        data.temporaryWork?.intendedEmployer?.name || 
        data.evisaBusiness?.businessName ||
        data.evisaApplicantPosition?.employerName ||
        data.petition?.employerName || 
        data.petitionerInfo?.petitionerCompanyName,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress1':
        data.temporaryWork?.intendedEmployer?.address1 || 
        data.evisaBusiness?.businessAddress?.street1 || 
        data.evisaBusiness?.offices?.[0]?.address?.street1 ||
        data.evisaApplicantPosition?.employerAddress?.street1 ||
        data.petition?.employerAddress1 || 
        data.petitionerInfo?.petitionerAddress?.street1,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress2':
        data.temporaryWork?.intendedEmployer?.address2 || 
        data.evisaBusiness?.businessAddress?.street2 || 
        data.evisaBusiness?.offices?.[0]?.address?.street2 ||
        data.evisaApplicantPosition?.employerAddress?.street2 ||
        data.petition?.employerAddress2 || 
        data.petitionerInfo?.petitionerAddress?.street2,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpCity':
        data.temporaryWork?.intendedEmployer?.city || 
        data.evisaBusiness?.businessAddress?.city ||
        data.evisaBusiness?.offices?.[0]?.address?.city ||
        data.evisaApplicantPosition?.employerAddress?.city ||
        data.petition?.employerCity || 
        data.petitionerInfo?.petitionerAddress?.city,
        
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpState':
        data.temporaryWork?.intendedEmployer?.state || 
        data.evisaBusiness?.businessAddress?.state ||
        data.evisaBusiness?.offices?.[0]?.address?.state ||
        data.petition?.employerState || 
        data.petitionerInfo?.petitionerAddress?.state,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxZIPCode':
        data.temporaryWork?.intendedEmployer?.zipCode || 
        data.evisaBusiness?.businessAddress?.postalCode ||
        data.evisaBusiness?.offices?.[0]?.address?.postalCode ||
        data.petition?.employerZipCode || 
        data.petitionerInfo?.petitionerAddress?.postalCode,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTEMP_WORK_TEL':
        data.temporaryWork?.intendedEmployer?.phone || 
        data.evisaBusiness?.businessPhone ||
        data.evisaBusiness?.offices?.[0]?.phone ||
        data.petition?.employerPhone || 
        data.petitionerInfo?.petitionerPhone,
        
      // Monthly Income in USD
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpSalaryInUSD':
        data.temporaryWork?.monthlyIncome || 
        data.evisaApplicantUSPosition?.salary ||
        data.petition?.monthlyIncome || 
        (data.workEducation?.presentEmployer?.monthlyIncome ? String(data.workEducation.presentEmployer.monthlyIncome) : null),
        
      // E-visa Registration Number (if applicable)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEvisaCoRegNum':
        data.evisaBusiness?.registrationNumber || '',
        
      // === E-VISA BUSINESS PROFILE FIELDS ===
      // Business Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessName': 
        data.evisaBusiness?.businessName || data.evisa_business?.business_name,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlBusinessType': 
        data.evisaBusiness?.businessTypeCode || this.mapBusinessType(data.evisaBusiness?.businessType) || 
        data.evisa_business?.business_type,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessTypeOther': 
        data.evisaBusiness?.businessTypeOther || data.evisa_business?.business_type_other,
        
      // Business Incorporation Date
      'ctl00_SiteContentPlaceHolder_FormView1_dllBusinessStartDateDay': 
        this.getDayFromDate(data.evisaBusiness?.incorporationDate) || 
        data.evisa_business?.incorporation_date?.day,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlBusinessStartMonth': 
        this.getMonthNumber(data.evisaBusiness?.incorporationDate) || 
        data.evisa_business?.incorporation_date?.month,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessStartDateYear': 
        this.getYearFromDate(data.evisaBusiness?.incorporationDate) || 
        data.evisa_business?.incorporation_date?.year,
        
      // Business Incorporation Location
      'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessStartCity': 
        data.evisaBusiness?.incorporationCity || 
        data.evisa_business?.incorporation_location?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlBusinessStartState': 
        this.mapUSState(data.evisaBusiness?.incorporationState) || 
        this.mapUSState(data.evisa_business?.incorporation_location?.state),
        
      // Office Information (First Office - usually headquarters)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_ddlEVISA_OFFICE_TYPE': 
        data.evisaBusiness?.offices?.[0]?.type || data.evisa_business?.offices?.[0]?.type,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_TYPE_OTHER': 
        data.evisaBusiness?.offices?.[0]?.typeOther || data.evisa_business?.offices?.[0]?.type_other,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_NAME': 
        data.evisaBusiness?.offices?.[0]?.name || data.evisa_business?.offices?.[0]?.name,
        
      // Office Address
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_ST_LN1': 
        data.evisaBusiness?.offices?.[0]?.address?.street1 || 
        data.evisa_business?.offices?.[0]?.address?.street_line1,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_ST_LN2': 
        data.evisaBusiness?.offices?.[0]?.address?.street2 || 
        data.evisa_business?.offices?.[0]?.address?.street_line2,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_CITY': 
        data.evisaBusiness?.offices?.[0]?.address?.city || 
        data.evisa_business?.offices?.[0]?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_STATE': 
        data.evisaBusiness?.offices?.[0]?.address?.state || 
        data.evisa_business?.offices?.[0]?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_cbxEVISA_OFFICE_STATE_NA': 
        data.evisaBusiness?.offices?.[0]?.address?.stateNA || 
        data.evisa_business?.offices?.[0]?.address?.state_na,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_POSTAL_CD': 
        data.evisaBusiness?.offices?.[0]?.address?.postalCode || 
        data.evisa_business?.offices?.[0]?.address?.postal_code,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_cbxEVISA_OFFICE_POSTAL_CD_NA': 
        data.evisaBusiness?.offices?.[0]?.address?.postalCodeNA || 
        data.evisa_business?.offices?.[0]?.address?.postal_code_na,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_ddlEVISA_OFFICE_CNTRY': 
        this.mapCountry(data.evisaBusiness?.offices?.[0]?.address?.country || 
        data.evisa_business?.offices?.[0]?.address?.country),
        
      // Office Phone and Fax
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_TEL': 
        data.evisaBusiness?.offices?.[0]?.phone || 
        data.evisa_business?.offices?.[0]?.phone ||
        data.evisaBusiness?.businessPhone || 
        data.evisa_business?.business_phone,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlOffice_ctl00_tbxEVISA_OFFICE_FAX': 
        data.evisaBusiness?.offices?.[0]?.fax || 
        data.evisa_business?.offices?.[0]?.fax ||
        data.evisaBusiness?.businessFax || 
        data.evisa_business?.business_fax,
        
      // Business Nature Checkboxes (correct field IDs from actual form)
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_GEN_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('General Trade') || 
        data.evisa_business?.nature_of_business?.includes('General Trade') || false,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_EXP_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('Exports from U.S.') || 
        data.evisa_business?.nature_of_business?.includes('Exports from U.S.') || false,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_RET_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('Retail Sales') || 
        data.evisa_business?.nature_of_business?.includes('Retail Sales') || false,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_IMP_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('Imports to U.S.') || 
        data.evisa_business?.nature_of_business?.includes('Imports to U.S.') || false,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_MAN_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('Manufacturing') || 
        data.evisa_business?.nature_of_business?.includes('Manufacturing') || false,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_SVC_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('Services/Technology') || 
        data.evisa_business?.nature_of_business?.includes('Services/Technology') || true, // Default to true for tech companies
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_NATURE_OTH_IND': 
        data.evisaBusiness?.natureOfBusiness?.includes('Other') || 
        data.evisa_business?.nature_of_business?.includes('Other') || false,
        
      // Business Activities Description (correct field ID from actual form)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxBusinessNatureDescription': 
        data.evisaBusiness?.businessActivities || 
        data.evisa_business?.business_activities ||
        (() => {
          // Extract description from businessType if it contains a dash
          if (data.evisaBusiness?.businessType?.includes('–')) {
            return data.evisaBusiness.businessType.split('–')[1].trim();
          }
          return null;
        })(),
        
      // Additional offices would use ctl01, ctl02, etc. for the index
      // These would be filled dynamically when multiple offices are present
      
      // === E-VISA FOREIGN PARENT BUSINESS FIELDS (PAGE 2) ===
      
      // Radio button questions
      'ctl00_SiteContentPlaceHolder_FormView1_rblForeignBusinessQuestion_0': 
        data.evisaForeignBusiness?.hasForeignBusiness === true || 
        data.evisa_foreign_business?.has_foreign_business === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblForeignBusinessQuestion_1': 
        data.evisaForeignBusiness?.hasForeignBusiness === false || 
        data.evisa_foreign_business?.has_foreign_business === 'No',
        
      'ctl00_SiteContentPlaceHolder_FormView1_rblForeignEntityQuestion_0': 
        data.evisaForeignBusiness?.hasForeignEntity === true || 
        data.evisa_foreign_business?.has_foreign_entity === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblForeignEntityQuestion_1': 
        data.evisaForeignBusiness?.hasForeignEntity === false || 
        data.evisa_foreign_business?.has_foreign_entity === 'No',
        
      'ctl00_SiteContentPlaceHolder_FormView1_rblForeignIndividualOwnerQuestion_0': 
        data.evisaForeignBusiness?.hasForeignIndividualOwner === true || 
        data.evisa_foreign_business?.has_foreign_individual_owner === 'Yes',
      'ctl00_SiteContentPlaceHolder_FormView1_rblForeignIndividualOwnerQuestion_1': 
        data.evisaForeignBusiness?.hasForeignIndividualOwner === false || 
        data.evisa_foreign_business?.has_foreign_individual_owner === 'No',
        
      // === E-VISA FINANCE AND TRADE RADIO BUTTONS ===
      // Year Type (Fiscal/Calendar) for Financial Statement
      'ctl00_SiteContentPlaceHolder_FormView1_rblYearType_0': 
        data.evisaFinanceTrade?.yearType === 'F' || 
        data.evisa_finance_trade?.year_type === 'F',
      'ctl00_SiteContentPlaceHolder_FormView1_rblYearType_1': 
        data.evisaFinanceTrade?.yearType === 'C' || 
        data.evisa_finance_trade?.year_type === 'C',
        
      // Second Year Type for Trade section
      'ctl00_SiteContentPlaceHolder_FormView1_rblYearType1_0': 
        (data.evisaFinanceTrade?.yearType2 || 
         data.evisa_finance_trade?.year_type2 ||
         data.evisaFinanceTrade?.yearType || 
         data.evisa_finance_trade?.year_type || 'F') === 'F',
      'ctl00_SiteContentPlaceHolder_FormView1_rblYearType1_1': 
        (data.evisaFinanceTrade?.yearType2 || 
         data.evisa_finance_trade?.year_type2 ||
         data.evisaFinanceTrade?.yearType || 
         data.evisa_finance_trade?.year_type || 'F') === 'C',
        
      // Assets Type (Current Cash/Historical Cost)
      'ctl00_SiteContentPlaceHolder_FormView1_rblAssetsType_0': 
        data.evisaFinanceTrade?.assetsType === 'C' || 
        data.evisa_finance_trade?.assets_type === 'C',
      'ctl00_SiteContentPlaceHolder_FormView1_rblAssetsType_1': 
        data.evisaFinanceTrade?.assetsType === 'H' || 
        data.evisa_finance_trade?.assets_type === 'H',
        
      // === E-VISA APPLICANT POSITION RADIO BUTTONS (PAGE 5) ===
      // Other Education
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherEducation_0': 
        data.evisaApplicantPosition?.hasOtherEducation === true || 
        data.evisa_applicant_position?.has_other_education === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblOtherEducation_1': 
        data.evisaApplicantPosition?.hasOtherEducation === false || 
        data.evisa_applicant_position?.has_other_education === false,
      
      // Other Education Explanation (appears when Other Education = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxOtherEducation':
        data.evisaApplicantPosition?.otherEducationExplanation ||
        data.evisa_applicant_position?.other_education_explanation,
        
      // Parent Business Fields (appear when Foreign Business = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT': 
        data.evisaForeignBusiness?.parentBusiness?.name ||  // Added nested camelCase structure
        data.evisaForeignBusiness?.parentBusinessName || 
        data.evisa_foreign_business?.parent_business?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_LN1': 
        data.evisaForeignBusiness?.parentBusiness?.address?.street1 ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.street1 || 
        data.evisa_foreign_business?.parent_business?.address?.street_line1,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_LN2': 
        data.evisaForeignBusiness?.parentBusiness?.address?.street2 ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.street2 || 
        data.evisa_foreign_business?.parent_business?.address?.street_line2,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_CITY': 
        data.evisaForeignBusiness?.parentBusiness?.address?.city ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.city || 
        data.evisa_foreign_business?.parent_business?.address?.city,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_STATE': 
        data.evisaForeignBusiness?.parentBusiness?.address?.state ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.state || 
        data.evisa_foreign_business?.parent_business?.address?.state,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_BUS_PARENT_STATE_NA': 
        data.evisaForeignBusiness?.parentBusiness?.address?.stateNA ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.stateNA || 
        data.evisa_foreign_business?.parent_business?.address?.state_na,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_POSTAL_CD': 
        data.evisaForeignBusiness?.parentBusiness?.address?.postalCode ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.postalCode || 
        data.evisa_foreign_business?.parent_business?.address?.postal_code,
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_BUS_PARENT_POSTAL_CD_NA': 
        data.evisaForeignBusiness?.parentBusiness?.address?.postalCodeNA ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.postalCodeNA || 
        data.evisa_foreign_business?.parent_business?.address?.postal_code_na,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEVISA_BUS_PARENT_CNTRY': 
        this.mapCountry(data.evisaForeignBusiness?.parentBusiness?.address?.country ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessAddress?.country || 
        data.evisa_foreign_business?.parent_business?.address?.country),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_TEL': 
        data.evisaForeignBusiness?.parentBusiness?.phone ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessPhone || 
        data.evisa_foreign_business?.parent_business?.phone,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PARENT_FAX': 
        data.evisaForeignBusiness?.parentBusiness?.fax ||  // Added nested camelCase
        data.evisaForeignBusiness?.parentBusinessFax || 
        data.evisa_foreign_business?.parent_business?.fax,
        
      // Foreign Entity Fields (appear when Foreign Entity = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignEntity_ctl00_tbxBUS_ENT_NAME': 
        data.evisaForeignBusiness?.foreignEntities?.[0]?.name || 
        data.evisa_foreign_business?.foreign_entities?.[0]?.name,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignEntity_ctl00_ddlBUS_ENT_NATL': 
        this.mapCountry(data.evisaForeignBusiness?.foreignEntities?.[0]?.nationality || 
        data.evisa_foreign_business?.foreign_entities?.[0]?.nationality),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignEntity_ctl00_tbxOWNERSHIP_PCT': 
        data.evisaForeignBusiness?.foreignEntities?.[0]?.ownershipPercentage || 
        data.evisa_foreign_business?.foreign_entities?.[0]?.ownership_percentage,
        
      // Foreign Individual Owner Fields (appear when Individual Owner = Yes)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignOwner_ctl00_tbxIND_OWNER_SURNAME': 
        data.evisaForeignBusiness?.foreignOwners?.[0]?.surname || 
        data.evisa_foreign_business?.foreign_owners?.[0]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignOwner_ctl00_tbxIND_OWNER_GIVEN_NAME': 
        data.evisaForeignBusiness?.foreignOwners?.[0]?.givenName || 
        data.evisa_foreign_business?.foreign_owners?.[0]?.given_name,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignOwner_ctl00_tbxIND_OWNER_STATUS': 
        data.evisaForeignBusiness?.foreignOwners?.[0]?.status || 
        data.evisa_foreign_business?.foreign_owners?.[0]?.status,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignOwner_ctl00_ddlIND_OWNER_RES_CNTRY': 
        this.mapCountry(data.evisaForeignBusiness?.foreignOwners?.[0]?.residenceCountry || 
        data.evisa_foreign_business?.foreign_owners?.[0]?.residence_country),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignOwner_ctl00_ddlIND_OWNER_NATL': 
        this.mapCountry(data.evisaForeignBusiness?.foreignOwners?.[0]?.nationality || 
        data.evisa_foreign_business?.foreign_owners?.[0]?.nationality),
      'ctl00_SiteContentPlaceHolder_FormView1_dtlForeignOwner_ctl00_tbxIND_OWNERSHIP_PCT': 
        data.evisaForeignBusiness?.foreignOwners?.[0]?.ownershipPercentage || 
        data.evisa_foreign_business?.foreign_owners?.[0]?.ownership_percentage,
        
      // === E-VISA INVESTMENT INFORMATION FIELDS ===
      
      // Investment type radio buttons
      'ctl00_SiteContentPlaceHolder_FormView1_rblEVISA_BUS_TYPE_IND_0':
        data.evisaInvestment?.investmentType === 'C', // Creation of new business
      'ctl00_SiteContentPlaceHolder_FormView1_rblEVISA_BUS_TYPE_IND_1':
        data.evisaInvestment?.investmentType === 'P', // Purchase of existing
      'ctl00_SiteContentPlaceHolder_FormView1_rblEVISA_BUS_TYPE_IND_2':
        data.evisaInvestment?.investmentType === 'E', // Continuation of existing
      
      // Fair market value (appears when Continuation is selected)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_CONT_COST':
        data.evisaInvestment?.fairMarketValue,

      // Financial year
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_FI_YR':
        data.evisaInvestment?.financialYear,
      'ctl00_SiteContentPlaceHolder_FormView1_rblEVISA_BUS_FI_YR_TYPE_0':
        data.evisaInvestment?.yearType === 'F', // Fiscal
      'ctl00_SiteContentPlaceHolder_FormView1_rblEVISA_BUS_FI_YR_TYPE_1':
        data.evisaInvestment?.yearType === 'C', // Calendar

      // Cash Investment
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_CI_INITIAL':
        data.evisaInvestment?.cashInitial,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_CI_TOTAL':
        data.evisaInvestment?.cashTotal,

      // Inventory Investment  
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_II_INITIAL':
        data.evisaInvestment?.inventoryInitial,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_II_TOTAL':
        data.evisaInvestment?.inventoryTotal,

      // Equipment Investment
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_EI_INITIAL':
        data.evisaInvestment?.equipmentInitial,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_EI_TOTAL':
        data.evisaInvestment?.equipmentTotal,

      // Property Investment
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PI_INITIAL':
        data.evisaInvestment?.propertyInitial,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_PI_TOTAL':
        data.evisaInvestment?.propertyTotal,

      // Other Investment
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_OI_INITIAL':
        data.evisaInvestment?.otherInitial,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_OI_TOTAL':
        data.evisaInvestment?.otherTotal,

      // Source of funds
      'ctl00_SiteContentPlaceHolder_FormView1_ddlInvestmentCaptial':
        data.evisaInvestment?.sourceOfFunds, // P=Personal, C=Corporate, L=Loans, O=Other
      'ctl00_SiteContentPlaceHolder_FormView1_ddlFundsFrom':
        data.evisaInvestment?.fundsFrom, // P=Treaty country, C=Domestic, L=Third countries
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_INV_FUNDS_AMT':
        data.evisaInvestment?.fundsAmount,

      // Documentation checkboxes
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_INV_DOC_WIRE_IND':
        data.evisaInvestment?.hasWireTransfers,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_INV_DOC_BANK_IND':
        data.evisaInvestment?.hasBankStatements,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_INV_DOC_NOTE_IND':
        data.evisaInvestment?.hasPromissoryNote,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_INV_DOC_OTH_IND':
        data.evisaInvestment?.hasOtherDocs,

      // Does Not Apply checkboxes (skip if we have data)
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_TYPE_NA':
        !data.evisaInvestment?.investmentType,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_BUS_INVEST_ABROAD_NA':
        !data.evisaInvestment?.cashInitial && !data.evisaInvestment?.inventoryInitial,
      'ctl00_SiteContentPlaceHolder_FormView1_cbxEVISA_SOURCE_INVEST_CAP_NA':
        !data.evisaInvestment?.sourceOfFunds,
        
      // === E-VISA FINANCE AND TRADE FIELDS (PAGE 3) ===
      
      // Financial Statement Fields
      'ctl00_SiteContentPlaceHolder_FormView1_tbxForYear': 
        data.evisaFinanceTrade?.financialYear || 
        data.evisa_finance_trade?.financial_year ||
        data.evisaFinancial?.taxYear ||
        new Date().getFullYear().toString(),
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_ASSETS': 
        data.evisaFinanceTrade?.totalAssets || 
        data.evisa_finance_trade?.total_assets ||
        data.evisaFinancial?.totalAssets,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_LIABILITIES': 
        data.evisaFinanceTrade?.totalLiabilities || 
        data.evisa_finance_trade?.total_liabilities ||
        data.evisaFinancial?.totalLiabilities,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_OWN_EQUITY': 
        data.evisaFinanceTrade?.ownerEquity || 
        data.evisa_finance_trade?.owner_equity ||
        data.evisaFinancial?.ownerEquity ||
        data.evisaFinancial?.netWorth,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_EXPENSES_PRETAX': 
        data.evisaFinanceTrade?.operatingIncomeBeforeTax || 
        data.evisa_finance_trade?.operating_income_before_tax ||
        data.evisaFinancial?.operatingIncomeBeforeTax ||
        data.evisaFinancial?.grossIncome,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_EXPENSES_POSTAX': 
        data.evisaFinanceTrade?.operatingIncomeAfterTax || 
        data.evisa_finance_trade?.operating_income_after_tax ||
        data.evisaFinancial?.operatingIncomeAfterTax ||
        data.evisaFinancial?.netIncome,
        
      // Gross International Trade
      'ctl00_SiteContentPlaceHolder_FormView1_cbxGROSS_INTL_TRADE_NA': 
        data.evisaFinanceTrade?.tradeNotApplicable || 
        data.evisa_finance_trade?.trade_not_applicable || false,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_GIT_YR': 
        data.evisaFinanceTrade?.grossInternationalTradeYear || 
        data.evisa_finance_trade?.gross_international_trade_year ||
        data.evisaFinanceTrade?.financialYear ||
        new Date().getFullYear().toString(),
        
      // Treaty Country Trade
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_TRTY_IMP_USD': 
        data.evisaFinanceTrade?.treatyCountryImports || 
        data.evisa_finance_trade?.treaty_country_imports,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_TRTY_IMP_TRANS': 
        data.evisaFinanceTrade?.treatyCountryImportTransactions || 
        data.evisa_finance_trade?.treaty_country_import_transactions,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_TRTY_EXP_USD': 
        data.evisaFinanceTrade?.treatyCountryExports || 
        data.evisa_finance_trade?.treaty_country_exports,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_TRTY_EXP_TRANS': 
        data.evisaFinanceTrade?.treatyCountryExportTransactions || 
        data.evisa_finance_trade?.treaty_country_export_transactions,
        
      // Third Country Trade
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_THRD_IMP_USD': 
        data.evisaFinanceTrade?.thirdCountryImports || 
        data.evisa_finance_trade?.third_country_imports,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_THRD_IMP_TRANS': 
        data.evisaFinanceTrade?.thirdCountryImportTransactions || 
        data.evisa_finance_trade?.third_country_import_transactions,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_THRD_EXP_USD': 
        data.evisaFinanceTrade?.thirdCountryExports || 
        data.evisa_finance_trade?.third_country_exports,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_THRD_EXP_TRANS': 
        data.evisaFinanceTrade?.thirdCountryExportTransactions || 
        data.evisa_finance_trade?.third_country_export_transactions,
        
      // Domestic Production
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_MANUF_USD': 
        data.evisaFinanceTrade?.domesticProductionValue || 
        data.evisa_finance_trade?.domestic_production_value ||
        data.evisaFinanceTrade?.domesticProduction,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_BUS_MANUF_TRANS': 
        data.evisaFinanceTrade?.domesticProductionTransactions || 
        data.evisa_finance_trade?.domestic_production_transactions,
        
      // === E-VISA US PERSONNEL INFORMATION (PAGE 4) ===
      // Personnel fields (support multiple personnel with ctl00, ctl01, etc.)
      // First person
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_SURNAME': 
        data.evisaUSPersonnel?.personnel?.[0]?.surname || 
        data.evisa_us_personnel?.personnel?.[0]?.surname,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_GIVEN_NAME': 
        data.evisaUSPersonnel?.personnel?.[0]?.givenName || 
        data.evisa_us_personnel?.personnel?.[0]?.given_name,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_POSITION': 
        data.evisaUSPersonnel?.personnel?.[0]?.position || 
        data.evisa_us_personnel?.personnel?.[0]?.position,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_DIVISION': 
        data.evisaUSPersonnel?.personnel?.[0]?.division || 
        data.evisa_us_personnel?.personnel?.[0]?.division,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_ddlEVISA_PSNL_NATL': 
        this.mapCountry(data.evisaUSPersonnel?.personnel?.[0]?.nationality || 
        data.evisa_us_personnel?.personnel?.[0]?.nationality),
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_ddlEVISA_PSNL_STATUS_IND': (function() {
        const status = data.evisaUSPersonnel?.personnel?.[0]?.usStatus || 
                        data.evisa_us_personnel?.personnel?.[0]?.us_status;
        const mapped = this.mapUSStatus(status);
        return mapped;
      }).call(this),
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_STATUS_OTH': 
        data.evisaUSPersonnel?.personnel?.[0]?.usStatusOther || 
        data.evisa_us_personnel?.personnel?.[0]?.us_status_other,
        
      // Visa information for personnel
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_TYPE': 
        data.evisaUSPersonnel?.personnel?.[0]?.visaType || 
        data.evisa_us_personnel?.personnel?.[0]?.visa_type,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_DTE_DY': 
        this.parseDate(data.evisaUSPersonnel?.personnel?.[0]?.visaIssueDate || 
        data.evisa_us_personnel?.personnel?.[0]?.visa_issue_date)?.day,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_DTE_MO': 
        this.parseDate(data.evisaUSPersonnel?.personnel?.[0]?.visaIssueDate || 
        data.evisa_us_personnel?.personnel?.[0]?.visa_issue_date)?.month,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_VISA_DTE_YR': 
        this.parseDate(data.evisaUSPersonnel?.personnel?.[0]?.visaIssueDate || 
        data.evisa_us_personnel?.personnel?.[0]?.visa_issue_date)?.year,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_ddlEVISA_PSNL_VISA_PLACE': 
        data.evisaUSPersonnel?.personnel?.[0]?.visaIssuePlace || 
        data.evisa_us_personnel?.personnel?.[0]?.visa_issue_place,
        
      // A Number (Alien Registration Number)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_tbxEVISA_PSNL_A_NUM': 
        data.evisaUSPersonnel?.personnel?.[0]?.alienNumber || 
        data.evisa_us_personnel?.personnel?.[0]?.alien_number,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl00_cbxEVISA_PSNL_A_NUM_DNK': 
        !data.evisaUSPersonnel?.personnel?.[0]?.alienNumber || 
        data.evisaUSPersonnel?.personnel?.[0]?.alienNumberUnknown === true,
        
      // Second person (if exists)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl01_tbxEVISA_PSNL_SURNAME': 
        data.evisaUSPersonnel?.personnel?.[1]?.surname || 
        data.evisa_us_personnel?.personnel?.[1]?.surname,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl01_tbxEVISA_PSNL_GIVEN_NAME': 
        data.evisaUSPersonnel?.personnel?.[1]?.givenName || 
        data.evisa_us_personnel?.personnel?.[1]?.given_name,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl01_tbxEVISA_PSNL_POSITION': 
        data.evisaUSPersonnel?.personnel?.[1]?.position || 
        data.evisa_us_personnel?.personnel?.[1]?.position,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl01_tbxEVISA_PSNL_DIVISION': 
        data.evisaUSPersonnel?.personnel?.[1]?.division || 
        data.evisa_us_personnel?.personnel?.[1]?.division,
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl01_ddlEVISA_PSNL_NATL': 
        this.mapCountry(data.evisaUSPersonnel?.personnel?.[1]?.nationality || 
        data.evisa_us_personnel?.personnel?.[1]?.nationality),
        
      'ctl00_SiteContentPlaceHolder_FormView1_dtlUSBusPers_ctl01_ddlEVISA_PSNL_STATUS_IND': (function() {
        const status = data.evisaUSPersonnel?.personnel?.[1]?.usStatus || 
                        data.evisa_us_personnel?.personnel?.[1]?.us_status;
        const mapped = this.mapUSStatus(status);
        return mapped;
      }).call(this),
      
      // === E-VISA US PERSONNEL INFORMATION 1 - EMPLOYEE COUNTS ===
      // Year Type radio buttons for Employee Counts page
      'ctl00_SiteContentPlaceHolder_FormView1_rblYearType_0': 
        (data.evisaEmployeeCounts?.yearType || 
         data.evisa_employee_counts?.year_type || 'F') === 'F',
      'ctl00_SiteContentPlaceHolder_FormView1_rblYearType_1': 
        (data.evisaEmployeeCounts?.yearType || 
         data.evisa_employee_counts?.year_type || 'F') === 'C',
      
      // Treaty Country National Employee Counts
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_TRTY_MGR_CY': 
        data.evisaEmployeeCounts?.treatyNationals?.managerial?.thisYear || 
        data.evisa_employee_counts?.treaty_nationals?.managerial?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_TRTY_MGR_NY': 
        data.evisaEmployeeCounts?.treatyNationals?.managerial?.nextYear || 
        data.evisa_employee_counts?.treaty_nationals?.managerial?.next_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_TRTY_SPEC_CY': 
        data.evisaEmployeeCounts?.treatyNationals?.specialized?.thisYear || 
        data.evisa_employee_counts?.treaty_nationals?.specialized?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_TRTY_SPEC_NY': 
        data.evisaEmployeeCounts?.treatyNationals?.specialized?.nextYear || 
        data.evisa_employee_counts?.treaty_nationals?.specialized?.next_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_TRTY_OTH_CY': 
        data.evisaEmployeeCounts?.treatyNationals?.other?.thisYear || 
        data.evisa_employee_counts?.treaty_nationals?.other?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_TRTY_OTH_NY': 
        data.evisaEmployeeCounts?.treatyNationals?.other?.nextYear || 
        data.evisa_employee_counts?.treaty_nationals?.other?.next_year,
      
      // US Citizens/LPR Employee Counts
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_US_MGR_CY': 
        data.evisaEmployeeCounts?.usCitizensLPR?.managerial?.thisYear || 
        data.evisa_employee_counts?.us_citizens_lpr?.managerial?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_US_MGR_NY': 
        data.evisaEmployeeCounts?.usCitizensLPR?.managerial?.nextYear || 
        data.evisa_employee_counts?.us_citizens_lpr?.managerial?.next_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_US_SPEC_CY': 
        data.evisaEmployeeCounts?.usCitizensLPR?.specialized?.thisYear || 
        data.evisa_employee_counts?.us_citizens_lpr?.specialized?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_US_SPEC_NY': 
        data.evisaEmployeeCounts?.usCitizensLPR?.specialized?.nextYear || 
        data.evisa_employee_counts?.us_citizens_lpr?.specialized?.next_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_US_OTH_CY': 
        data.evisaEmployeeCounts?.usCitizensLPR?.other?.thisYear || 
        data.evisa_employee_counts?.us_citizens_lpr?.other?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_US_OTH_NY': 
        data.evisaEmployeeCounts?.usCitizensLPR?.other?.nextYear || 
        data.evisa_employee_counts?.us_citizens_lpr?.other?.next_year,
      
      // Third Country National Employee Counts
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_THRD_MGR_CY': 
        data.evisaEmployeeCounts?.thirdCountryNationals?.managerial?.thisYear || 
        data.evisa_employee_counts?.third_country_nationals?.managerial?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_THRD_MGR_NY': 
        data.evisaEmployeeCounts?.thirdCountryNationals?.managerial?.nextYear || 
        data.evisa_employee_counts?.third_country_nationals?.managerial?.next_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_THRD_SPEC_CY': 
        data.evisaEmployeeCounts?.thirdCountryNationals?.specialized?.thisYear || 
        data.evisa_employee_counts?.third_country_nationals?.specialized?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_THRD_SPEC_NY': 
        data.evisaEmployeeCounts?.thirdCountryNationals?.specialized?.nextYear || 
        data.evisa_employee_counts?.third_country_nationals?.specialized?.next_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_THRD_OTH_CY': 
        data.evisaEmployeeCounts?.thirdCountryNationals?.other?.thisYear || 
        data.evisa_employee_counts?.third_country_nationals?.other?.this_year,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_PERS_THRD_OTH_NY': 
        data.evisaEmployeeCounts?.thirdCountryNationals?.other?.nextYear || 
        data.evisa_employee_counts?.third_country_nationals?.other?.next_year,
        
      // === E-VISA APPLICANT PRESENT POSITION (PAGE 5) ===
      // Applicant Type
      'ctl00_SiteContentPlaceHolder_FormView1_ddlApplicantType': 
        data.evisaApplicantPosition?.applicantType || 
        data.evisa_applicant_position?.applicant_type,
        
      // Present Position and Duties
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPresentPosition': 
        data.evisaApplicantPosition?.presentPosition || 
        data.evisa_applicant_position?.present_position,
        
      // NOTE: These employer field mappings have been merged into the Temporary Work Visa
      // mappings at lines 3193-3222 to avoid duplicate mappings and undefined overwrites
      /*
      // Employer Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmployerName': 
        data.evisaApplicantPosition?.employerName || 
        data.evisa_applicant_position?.employer_name,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxYearsWithEmployer': 
        data.evisaApplicantPosition?.yearsWithEmployer || 
        data.evisa_applicant_position?.years_with_employer,
        
      // Employer Address
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress1': 
        data.evisaApplicantPosition?.employerAddress?.street1 || 
        data.evisa_applicant_position?.employer_address?.street1,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress2': 
        data.evisaApplicantPosition?.employerAddress?.street2 || 
        data.evisa_applicant_position?.employer_address?.street2,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpCity': 
        data.evisaApplicantPosition?.employerAddress?.city || 
        data.evisa_applicant_position?.employer_address?.city,
      */
      
      // Note: Keep this state field as it uses different field ID (tbxEVISA_APP_EMP_STATE vs ddlEmpState)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_EMP_STATE': 
        data.evisaApplicantPosition?.employerAddress?.state || 
        data.evisa_applicant_position?.employer_address?.state,
        
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_APP_EMP_STATE_NA': 
        !data.evisaApplicantPosition?.employerAddress?.state || 
        data.evisaApplicantPosition?.employerAddress?.stateNA === true,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_EMP_POSTAL_CD': 
        data.evisaApplicantPosition?.employerAddress?.postalCode || 
        data.evisa_applicant_position?.employer_address?.postal_code,
        
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_APP_EMP_POSTAL_CD_NA': 
        !data.evisaApplicantPosition?.employerAddress?.postalCode || 
        data.evisaApplicantPosition?.employerAddress?.postalCodeNA === true,
        
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpCountry': 
        this.mapCountry(data.evisaApplicantPosition?.employerAddress?.country || 
        data.evisa_applicant_position?.employer_address?.country),
        
      // Education Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSchool': 
        data.evisaApplicantPosition?.education?.school || 
        data.evisa_applicant_position?.education?.school,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxDegree': 
        data.evisaApplicantPosition?.education?.degree || 
        data.evisa_applicant_position?.education?.degree,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxMajor': 
        data.evisaApplicantPosition?.education?.major || 
        data.evisa_applicant_position?.education?.major,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxYear': 
        data.evisaApplicantPosition?.education?.year || 
        data.evisa_applicant_position?.education?.year,
        
      // === E-VISA APPLICANT POSITION IN U.S. (PAGE 6) ===
      // Position details in the United States
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTitle': 
        data.evisaApplicantUSPosition?.title || 
        data.evisa_applicant_us_position?.title,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxDuties': 
        data.evisaApplicantUSPosition?.duties || 
        data.evisa_applicant_us_position?.duties,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxSalary': 
        data.evisaApplicantUSPosition?.salary || 
        data.evisa_applicant_us_position?.salary,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxBenefits': 
        data.evisaApplicantUSPosition?.benefits || 
        data.evisa_applicant_us_position?.benefits,
        
      // Immediate Subordinates Question
      'ctl00_SiteContentPlaceHolder_FormView1_rblImmSuborQuestion_0':
        data.evisaApplicantUSPosition?.hasImmediateSubordinates === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblImmSuborQuestion_1':
        data.evisaApplicantUSPosition?.hasImmediateSubordinates === false,
        
      // Immediate Subordinates (up to 6, following pattern of other "Add Another" fields)
      // First Subordinate (ctl00)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl00_tbxEVISA_SUB_SURNAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[0]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl00_tbxEVISA_SUB_GIVEN_NAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[0]?.givenName,
        
      // Second Subordinate (ctl01)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl01_tbxEVISA_SUB_SURNAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[1]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl01_tbxEVISA_SUB_GIVEN_NAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[1]?.givenName,
        
      // Third Subordinate (ctl02)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl02_tbxEVISA_SUB_SURNAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[2]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl02_tbxEVISA_SUB_GIVEN_NAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[2]?.givenName,
        
      // Fourth Subordinate (ctl03)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl03_tbxEVISA_SUB_SURNAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[3]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl03_tbxEVISA_SUB_GIVEN_NAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[3]?.givenName,
        
      // Fifth Subordinate (ctl04)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl04_tbxEVISA_SUB_SURNAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[4]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl04_tbxEVISA_SUB_GIVEN_NAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[4]?.givenName,
        
      // Sixth Subordinate (ctl05)
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl05_tbxEVISA_SUB_SURNAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[5]?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_dtlImmSubor_ctl05_tbxEVISA_SUB_GIVEN_NAME':
        data.evisaApplicantUSPosition?.immediateSubordinates?.[5]?.givenName,
        
      // Worker Replacement Question
      'ctl00_SiteContentPlaceHolder_FormView1_rblWorkerReplacedQuestion_0':
        data.evisaApplicantUSPosition?.isReplacingWorker === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblWorkerReplacedQuestion_1':
        data.evisaApplicantUSPosition?.isReplacingWorker === false,
        
      // Replaced Worker Details (if applicable)
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_REPL_SURNAME':
        data.evisaApplicantUSPosition?.replacedWorker?.surname,
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_REPL_GIVEN_NAME':
        data.evisaApplicantUSPosition?.replacedWorker?.givenName,
      'ctl00_SiteContentPlaceHolder_FormView1_ddlVisaType':
        data.evisaApplicantUSPosition?.replacedWorker?.visaType,
        
      // Replaced Worker Visa Issue Date
      'ctl00_SiteContentPlaceHolder_FormView1_ddlVisaIssuedDateDay':
        data.evisaApplicantUSPosition?.replacedWorker?.visaIssuedDate?.split('-')?.[0],
      'ctl00_SiteContentPlaceHolder_FormView1_ddlVisaIssuedDateMonth':
        (() => {
          const month = data.evisaApplicantUSPosition?.replacedWorker?.visaIssuedDate?.split('-')?.[1];
          const monthMap = { 'JAN': '1', 'FEB': '2', 'MAR': '3', 'APR': '4', 'MAY': '5', 'JUN': '6', 
                           'JUL': '7', 'AUG': '8', 'SEP': '9', 'OCT': '10', 'NOV': '11', 'DEC': '12' };
          return monthMap[month];
        })(),
      'ctl00_SiteContentPlaceHolder_FormView1_tbxVisaIssuedDateYear':
        data.evisaApplicantUSPosition?.replacedWorker?.visaIssuedDate?.split('-')?.[2],
        
      // Replaced Worker Visa Issue Country
      'ctl00_SiteContentPlaceHolder_FormView1_ddlVisaIssuePlace':
        data.evisaApplicantUSPosition?.replacedWorker?.visaIssuedCountry,
        
      // Staff Increase Question (only relevant if not replacing worker)
      'ctl00_SiteContentPlaceHolder_FormView1_rblIncreaseStaffQuestion_0':
        data.evisaApplicantUSPosition?.willIncreaseStaff === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblIncreaseStaffQuestion_1':
        data.evisaApplicantUSPosition?.willIncreaseStaff === false,
        
      // Continuation of Employment Question (only relevant if not replacing worker)
      'ctl00_SiteContentPlaceHolder_FormView1_rblContinuedEmploymentQuestion_0':
        data.evisaApplicantUSPosition?.continuationOfEmployment === true,
      'ctl00_SiteContentPlaceHolder_FormView1_rblContinuedEmploymentQuestion_1':
        data.evisaApplicantUSPosition?.continuationOfEmployment === false,
        
      // === E-VISA APPLICATION CONTACT (PAGE 7) ===
      // Officer Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxOfficerSurname': 
        data.evisaApplicationContact?.officer?.surname || 
        data.evisa_application_contact?.officer?.surname ||
        data.evisaApplicationContact?.officerSurname ||
        data.evisa_application_contact?.officer_surname,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxOfficerGivenName': 
        data.evisaApplicationContact?.officer?.givenName || 
        data.evisa_application_contact?.officer?.given_name ||
        data.evisaApplicationContact?.officerGivenName ||
        data.evisa_application_contact?.officer_given_name,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxOfficerPosition': 
        data.evisaApplicationContact?.officer?.position || 
        data.evisa_application_contact?.officer?.position ||
        data.evisaApplicationContact?.officerPosition ||
        data.evisa_application_contact?.officer_position,
        
      // Contact Person Information
      'ctl00_SiteContentPlaceHolder_FormView1_tbxContactSurname': 
        data.evisaApplicationContact?.contact?.surname || 
        data.evisa_application_contact?.contact?.surname ||
        data.evisaApplicationContact?.contactSurname ||
        data.evisa_application_contact?.contact_surname,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxContactGivenName': 
        data.evisaApplicationContact?.contact?.givenName || 
        data.evisa_application_contact?.contact?.given_name ||
        data.evisaApplicationContact?.contactGivenName ||
        data.evisa_application_contact?.contact_given_name,
        
      // Contact Address
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAddress1': 
        data.evisaApplicationContact?.address?.street1 || 
        data.evisa_application_contact?.address?.street1 ||
        data.evisaApplicationContact?.street1 ||
        data.evisa_application_contact?.street1,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxAddress2': 
        data.evisaApplicationContact?.address?.street2 || 
        data.evisa_application_contact?.address?.street2 ||
        data.evisaApplicationContact?.street2 ||
        data.evisa_application_contact?.street2,
        
      // City field handled specially in findMatchingValue based on page context
      // Removed duplicate mapping - see special handling at line 1006
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_POC_STATE': 
        data.evisaApplicationContact?.address?.state || 
        data.evisa_application_contact?.address?.state ||
        data.evisaApplicationContact?.state ||
        data.evisa_application_contact?.state,
        
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_APP_POC_STATE_NA': 
        data.evisaApplicationContact?.address?.stateNA || 
        data.evisa_application_contact?.address?.state_na ||
        data.evisaApplicationContact?.stateNA ||
        data.evisa_application_contact?.state_na,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_POC_POSTAL_CD': 
        data.evisaApplicationContact?.address?.postalCode || 
        data.evisa_application_contact?.address?.postal_code ||
        data.evisaApplicationContact?.postalCode ||
        data.evisa_application_contact?.postal_code,
        
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_APP_POC_POSTAL_CD_NA': 
        data.evisaApplicationContact?.address?.postalCodeNA || 
        data.evisa_application_contact?.address?.postal_code_na ||
        data.evisaApplicationContact?.postalCodeNA ||
        data.evisa_application_contact?.postal_code_na,
        
      'ctl00_SiteContentPlaceHolder_FormView1_ddlCountry': (() => {
        const country = data.contact?.homeCountry || 
                       data.evisaApplicationContact?.address?.country || 
                       data.evisa_application_contact?.address?.country ||
                       data.evisaApplicationContact?.country ||
                       data.evisa_application_contact?.country;
        const mapped = this.mapCountry(country);
        console.log('[DS160] Mapping country (E-visa section):', country, '->', mapped);
        return mapped;
      })(),
        
      // Contact Communication
      'ctl00_SiteContentPlaceHolder_FormView1_tbxPhoneNum': 
        data.evisaApplicationContact?.phone || 
        data.evisa_application_contact?.phone ||
        data.evisaApplicationContact?.phoneNumber ||
        data.evisa_application_contact?.phone_number,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_POC_FAX': 
        data.evisaApplicationContact?.fax || 
        data.evisa_application_contact?.fax ||
        data.evisaApplicationContact?.faxNumber ||
        data.evisa_application_contact?.fax_number,
        
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_APP_POC_FAX_NA': 
        data.evisaApplicationContact?.faxNA || 
        data.evisa_application_contact?.fax_na,
        
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEVISA_APP_POC_EMAIL': 
        data.evisaApplicationContact?.email || 
        data.evisa_application_contact?.email ||
        data.evisaApplicationContact?.emailAddress ||
        data.evisa_application_contact?.email_address,
        
      'ctl00_SiteContentPlaceHolder_FormView1_cbexEVISA_APP_POC_EMAIL_NA': 
        data.evisaApplicationContact?.emailNA || 
        data.evisa_application_contact?.email_na,
        
      // === TEMPORARY WORK VISA INFORMATION PAGE === 
      // NOTE: These duplicate E-visa mappings have been commented out and merged
      // into the main temporary work visa mappings at lines 3189-3213
      // to avoid undefined values overwriting valid data.
      /*
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmployerName': 
        data.evisaBusiness?.businessName,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEvisaCoRegNum':
        data.evisaBusiness?.registrationNumber || '',
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress1':
        data.evisaBusiness?.businessAddress?.street1 || 
        data.evisaBusiness?.offices?.[0]?.address?.street1,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpStreetAddress2':
        data.evisaBusiness?.businessAddress?.street2 || 
        data.evisaBusiness?.offices?.[0]?.address?.street2 || '',
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxEmpCity':
        data.evisaBusiness?.businessAddress?.city ||
        data.evisaBusiness?.offices?.[0]?.address?.city,
      
      'ctl00_SiteContentPlaceHolder_FormView1_ddlEmpState':
        data.evisaBusiness?.businessAddress?.state ||
        data.evisaBusiness?.offices?.[0]?.address?.state,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxZIPCode':
        data.evisaBusiness?.businessAddress?.postalCode ||
        data.evisaBusiness?.offices?.[0]?.address?.postalCode,
      
      'ctl00_SiteContentPlaceHolder_FormView1_tbxTEMP_WORK_TEL':
        data.evisaBusiness?.businessPhone ||
        data.evisaBusiness?.offices?.[0]?.phone,
      */
        
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
    
    // DS-160 month dropdowns expect numeric values: "1" for JAN, "2" for FEB, etc.
    // NOT zero-padded ("01", "02")
    
    // Check for month name format (e.g., "09-JUL-2025" or "01-OCT-1997")
    const parts = dateStr.toUpperCase().split(/[-/]/);
    const monthAbbreviations = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                                 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    console.log(`Date parts: ${parts.join(', ')}`);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const monthIndex = monthAbbreviations.indexOf(part);
      if (monthIndex !== -1) {
        // Found month abbreviation - return numeric value for dropdown WITHOUT leading zero
        console.log(`Found month abbreviation: ${part} (index: ${monthIndex + 1})`);
        return (monthIndex + 1).toString(); // Return "1" for JAN, "2" for FEB, "10" for OCT, etc.
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
  
  // Map US Status abbreviations to dropdown values (single letter codes)
  mapUSStatus(status) {
    if (!status) return '';
    
    const statusMap = {
      // Map common abbreviations to dropdown letter codes
      'USC': 'U',              // U.S. Citizen
      'U.S. Citizen': 'U',
      'U.S. CITIZEN': 'U',
      'LPR': 'L',              // Lawful Permanent Resident
      'Legal Permanent Resident': 'L',
      'LAWFUL PERMANENT RESIDENT': 'L',
      'NI': 'N',               // NonImmigrant
      'Nonimmigrant': 'N',
      'NONIMMIGRANT': 'N',
      'Other': 'O',            // Other/I Don't Know
      'Unknown': 'O',
      'OTHER': 'O'
    };
    
    // Check if it's a visa type (for non-immigrant status)
    const visaTypes = ['H1B', 'H-1B', 'H1', 'H-1', 'L1', 'L-1', 'L2', 'L-2', 
                      'E1', 'E-1', 'E2', 'E-2', 'F1', 'F-1', 'J1', 'J-1', 
                      'O1', 'O-1', 'P1', 'P-1', 'TN', 'B1', 'B-1', 'B2', 'B-2'];
    const upperStatus = status?.toUpperCase();
    for (const visa of visaTypes) {
      if (upperStatus === visa || upperStatus === visa.replace('-', '')) {
        return 'N';  // Return 'N' for NonImmigrant
      }
    }
    
    return statusMap[status] || statusMap[upperStatus] || status;
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
      'CHN': 'CHIN',  // ISO-3 code
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
      'GBR': 'GRBR',  // ISO-3 code
      'GREAT BRITAIN': 'GRBR',
      'ENGLAND': 'GRBR',
      'SCOTLAND': 'GRBR',
      'WALES': 'GRBR',
      'GRBR': 'GRBR',
      
      'GERMANY': 'GER',
      'DEUTSCHLAND': 'GER',
      'DEU': 'GER',  // ISO-3 code
      'GER': 'GER',
      
      'FRANCE': 'FRAN',
      'FRA': 'FRAN',  // ISO-3 code
      'FRAN': 'FRAN',
      
      'INDIA': 'IND',
      'IND': 'IND',
      
      'MEXICO': 'MEX',
      'MEX': 'MEX',
      
      'BRAZIL': 'BRZL',
      'BRA': 'BRZL',  // ISO-3 code
      'BRZL': 'BRZL',
      'BRASIL': 'BRZL',
      
      'AUSTRALIA': 'ASTL',
      'AUS': 'ASTL',
      
      'ITALY': 'ITLY',
      'ITALIA': 'ITLY',
      'ITA': 'ITLY',  // ISO-3 code
      'ITLY': 'ITLY',
      
      'SPAIN': 'SPN',
      'ESPANA': 'SPN',
      'ESPAÑA': 'SPN',
      'ESP': 'SPN',  // ISO-3 code
      'SPN': 'SPN',
      
      'RUSSIA': 'RUS',
      'RUSSIAN FEDERATION': 'RUS',
      'RUS': 'RUS',  // ISO-3 code
      
      'PHILIPPINES': 'PHIL',
      'PHL': 'PHIL',  // ISO-3 code
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
      'THA': 'THAI',  // ISO-3 code
      'THAI': 'THAI',
      
      'VIETNAM': 'VTNM',
      'VNM': 'VTNM',  // ISO-3 code
      'VIET NAM': 'VTNM',
      
      'CAMBODIA': 'CBDA',
      'KHM': 'CBDA',  // ISO-3 code
      'KAMPUCHEA': 'CBDA',
      'CBDA': 'CBDA',
      
      'INDONESIA': 'IDSA',
      'IDN': 'IDSA',  // ISO-3 code
      'IDSA': 'IDSA',
      
      'MALAYSIA': 'MLAS',
      'MYS': 'MLAS',  // ISO-3 code
      'MLAS': 'MLAS',
      
      'NETHERLANDS': 'NETH',
      'HOLLAND': 'NETH',
      'NLD': 'NETH',  // ISO-3 code
      'NETH': 'NETH',
      
      'BELGIUM': 'BELG',
      'BEL': 'BELG',  // ISO-3 code
      'BELG': 'BELG',
      
      'SWITZERLAND': 'SWTZ',
      'CHE': 'SWTZ',  // ISO-3 code
      'SWTZ': 'SWTZ',
      
      'SWEDEN': 'SWDN',
      'SWE': 'SWDN',  // ISO-3 code
      'SWDN': 'SWDN',
      
      'NORWAY': 'NORW',
      'NOR': 'NORW',  // ISO-3 code
      'NORW': 'NORW',
      
      'DENMARK': 'DEN',
      'DNK': 'DEN',  // ISO-3 code
      'DEN': 'DEN',
      
      'FINLAND': 'FIN',
      'FIN': 'FIN',  // ISO-3 code
      
      'POLAND': 'POL',
      'POL': 'POL',  // ISO-3 code
      
      'IRELAND': 'IRE',
      'IRL': 'IRE',  // ISO-3 code
      'IRE': 'IRE',
      
      'NEW ZEALAND': 'NZLD',
      'NZL': 'NZLD',  // ISO-3 code
      'NZ': 'NZLD',
      'NZLD': 'NZLD',
      
      'ARGENTINA': 'ARG',
      'ARG': 'ARG',  // ISO-3 code
      
      'CHILE': 'CHIL',
      'CHL': 'CHIL',  // ISO-3 code
      'CHIL': 'CHIL',
      
      'COLOMBIA': 'COL',
      'COL': 'COL',  // ISO-3 code
      
      'PERU': 'PERU',
      'PER': 'PERU',  // ISO-3 code
      'PERU': 'PERU',
      
      'VENEZUELA': 'VENZ',
      'VEN': 'VENZ',  // ISO-3 code
      'VENZ': 'VENZ',
      
      'ISRAEL': 'ISRL',
      'ISR': 'ISRL',  // ISO-3 code
      'ISRL': 'ISRL',
      
      'SAUDI ARABIA': 'SARB',
      'SAU': 'SARB',  // ISO-3 code
      'KSA': 'SARB',
      'SARB': 'SARB',
      
      'UAE': 'UAE',
      'ARE': 'UAE',  // ISO-3 code
      'UNITED ARAB EMIRATES': 'UAE',
      
      'TURKEY': 'TRKY',
      'TURKIYE': 'TRKY',
      'TUR': 'TRKY',  // ISO-3 code
      'TRKY': 'TRKY',
      
      'EGYPT': 'EGYP',
      'EGY': 'EGYP',  // ISO-3 code
      'EGYP': 'EGYP',
      
      'SOUTH AFRICA': 'SAFR',
      'ZAF': 'SAFR',  // ISO-3 code
      'SAFR': 'SAFR',
      
      'NIGERIA': 'NRA',
      'NGA': 'NRA',  // ISO-3 code
      'NRA': 'NRA',
      
      'PAKISTAN': 'PKST',
      'PAK': 'PKST',  // ISO-3 code
      'PKST': 'PKST',
      
      'BANGLADESH': 'BANG',
      'BGD': 'BANG',  // ISO-3 code
      'BANG': 'BANG',
      
      'SRI LANKA': 'SRL',
      'LKA': 'SRL',  // ISO-3 code
      'SRL': 'SRL',
      
      'NEPAL': 'NEP',
      'NPL': 'NEP',  // ISO-3 code
      
      'PORTUGAL': 'PORT',
      'PRT': 'PORT',  // ISO-3 code
      'PORT': 'PORT',
      
      'AUSTRIA': 'AUST',
      'AUT': 'AUST',  // ISO-3 code
      'AUST': 'AUST',
      
      'GREECE': 'GRC',
      'GRC': 'GRC',  // ISO-3 code
      
      'CZECH REPUBLIC': 'CZEC',
      'CZECHIA': 'CZEC',
      'CZE': 'CZEC',  // ISO-3 code
      'CZEC': 'CZEC',
      
      'HUNGARY': 'HUNG',
      'HUN': 'HUNG',  // ISO-3 code
      'HUNG': 'HUNG',
      
      'ROMANIA': 'ROM',
      'ROU': 'ROM',  // ISO-3 code
      'ROM': 'ROM',
      
      'UKRAINE': 'UKR',
      'UKR': 'UKR',  // ISO-3 code
      
      // Additional comprehensive country mappings
      'AFGHANISTAN': 'AFGH',
      'AFG': 'AFGH',  // ISO-3 code
      'AFGH': 'AFGH',
      
      'ALBANIA': 'ALB',
      'ALB': 'ALB',  // ISO-3 code
      
      'ALGERIA': 'ALGR',
      'DZA': 'ALGR',  // ISO-3 code
      'ALGR': 'ALGR',
      
      'AMERICAN SAMOA': 'ASMO',
      'ASM': 'ASMO',  // ISO-3 code
      'ASMO': 'ASMO',
      
      'ANDORRA': 'ANDO',
      'AND': 'ANDO',  // ISO-3 code
      'ANDO': 'ANDO',
      
      'ANGOLA': 'ANGL',
      'AGO': 'ANGL',  // ISO-3 code
      'ANGL': 'ANGL',
      
      'ANGUILLA': 'ANGU',
      'AIA': 'ANGU',  // ISO-3 code
      'ANGU': 'ANGU',
      
      'ANTIGUA AND BARBUDA': 'ANTI',
      'ANTIGUA': 'ANTI',
      'ATG': 'ANTI',  // ISO-3 code
      'ANTI': 'ANTI',
      
      'ARMENIA': 'ARM',
      'ARM': 'ARM',  // ISO-3 code
      
      'ARUBA': 'ARB',
      'ABW': 'ARB',  // ISO-3 code
      'ARB': 'ARB',
      
      'AZERBAIJAN': 'AZR',
      'AZE': 'AZR',  // ISO-3 code
      'AZR': 'AZR',
      
      'BAHAMAS': 'BAMA',
      'BHS': 'BAMA',  // ISO-3 code
      'BAMA': 'BAMA',
      
      'BAHRAIN': 'BAHR',
      'BHR': 'BAHR',  // ISO-3 code
      'BAHR': 'BAHR',
      
      'BARBADOS': 'BRDO',
      'BRB': 'BRDO',  // ISO-3 code
      'BRDO': 'BRDO',
      
      'BELARUS': 'BYS',
      'BLR': 'BYS',  // ISO-3 code
      'BYS': 'BYS',
      
      'BELIZE': 'BLZ',
      'BLZ': 'BLZ',  // ISO-3 code
      
      'BENIN': 'BENN',
      'BEN': 'BENN',  // ISO-3 code
      'BENN': 'BENN',
      
      'BERMUDA': 'BERM',
      'BMU': 'BERM',  // ISO-3 code
      'BERM': 'BERM',
      
      'BHUTAN': 'BHU',
      'BTN': 'BHU',  // ISO-3 code
      'BHU': 'BHU',
      
      'BOLIVIA': 'BOL',
      'BOL': 'BOL',  // ISO-3 code
      
      'BONAIRE': 'BON',
      'BES': 'BON',  // ISO-3 code for Caribbean Netherlands
      'BON': 'BON',
      
      'BOSNIA': 'BIH',
      'BOSNIA-HERZEGOVINA': 'BIH',
      'BOSNIA AND HERZEGOVINA': 'BIH',
      'BIH': 'BIH',  // ISO-3 code
      
      'BOTSWANA': 'BOT',
      'BWA': 'BOT',  // ISO-3 code
      'BOT': 'BOT',
      
      'BRITISH INDIAN OCEAN TERRITORY': 'IOT',
      'IOT': 'IOT',  // ISO-3 code
      
      'BRUNEI': 'BRNI',
      'BRN': 'BRNI',  // ISO-3 code
      'BRNI': 'BRNI',
      
      'BULGARIA': 'BULG',
      'BGR': 'BULG',  // ISO-3 code
      'BULG': 'BULG',
      
      'BURKINA FASO': 'BURK',
      'BFA': 'BURK',  // ISO-3 code
      'BURK': 'BURK',
      
      'BURMA': 'BURM',
      'MYANMAR': 'BURM',
      'MMR': 'BURM',  // ISO-3 code
      'BURM': 'BURM',
      
      'BURUNDI': 'BRND',
      'BDI': 'BRND',  // ISO-3 code
      'BRND': 'BRND',
      
      'CAMEROON': 'CMRN',
      'CMR': 'CMRN',  // ISO-3 code
      'CMRN': 'CMRN',
      
      'CABO VERDE': 'CAVI',
      'CAPE VERDE': 'CAVI',
      'CPV': 'CAVI',  // ISO-3 code
      'CAVI': 'CAVI',
      
      'CAYMAN ISLANDS': 'CAYI',
      'CYM': 'CAYI',  // ISO-3 code
      'CAYI': 'CAYI',
      
      'CENTRAL AFRICAN REPUBLIC': 'CAFR',
      'CAF': 'CAFR',  // ISO-3 code
      'CAFR': 'CAFR',
      
      'CHAD': 'CHAD',
      'TCD': 'CHAD',  // ISO-3 code
      
      'CHRISTMAS ISLAND': 'CHRI',
      'CXR': 'CHRI',  // ISO-3 code
      'CHRI': 'CHRI',
      
      'COCOS ISLANDS': 'COCI',
      'COCOS KEELING ISLANDS': 'COCI',
      'CCK': 'COCI',  // ISO-3 code
      'COCI': 'COCI',
      
      'COMOROS': 'COMO',
      'COM': 'COMO',  // ISO-3 code
      'COMO': 'COMO',
      
      'CONGO, DEMOCRATIC REPUBLIC': 'COD',
      'CONGO DRC': 'COD',
      'DEMOCRATIC REPUBLIC OF CONGO': 'COD',
      'COD': 'COD',  // ISO-3 code
      
      'CONGO, REPUBLIC': 'CONB',
      'CONGO': 'CONB',
      'CONGO BRAZZAVILLE': 'CONB',
      'COG': 'CONB',  // ISO-3 code
      'CONB': 'CONB',
      
      'COOK ISLANDS': 'CKIS',
      'COK': 'CKIS',  // ISO-3 code
      'CKIS': 'CKIS',
      
      'COSTA RICA': 'CSTR',
      'CRI': 'CSTR',  // ISO-3 code
      'CSTR': 'CSTR',
      
      'COTE D\'IVOIRE': 'IVCO',
      'IVORY COAST': 'IVCO',
      'CIV': 'IVCO',  // ISO-3 code
      'IVCO': 'IVCO',
      
      'CROATIA': 'HRV',
      'HRV': 'HRV',  // ISO-3 code
      
      'CUBA': 'CUBA',
      'CUB': 'CUBA',  // ISO-3 code
      
      'CURACAO': 'CUR',
      'CUW': 'CUR',  // ISO-3 code
      'CUR': 'CUR',
      
      'CYPRUS': 'CYPR',
      'CYP': 'CYPR',  // ISO-3 code
      'CYPR': 'CYPR',
      
      'DJIBOUTI': 'DJI',
      'DJI': 'DJI',  // ISO-3 code
      
      'DOMINICA': 'DOMN',
      'DMA': 'DOMN',  // ISO-3 code
      'DOMN': 'DOMN',
      
      'DOMINICAN REPUBLIC': 'DOMR',
      'DOM': 'DOMR',  // ISO-3 code
      'DOMR': 'DOMR',
      
      'ECUADOR': 'ECUA',
      'ECU': 'ECUA',  // ISO-3 code
      'ECUA': 'ECUA',
      
      'EL SALVADOR': 'ELSL',
      'SLV': 'ELSL',  // ISO-3 code
      'ELSL': 'ELSL',
      
      'EQUATORIAL GUINEA': 'EGN',
      'GNQ': 'EGN',  // ISO-3 code
      'EGN': 'EGN',
      
      'ERITREA': 'ERI',
      'ERI': 'ERI',  // ISO-3 code
      
      'ESTONIA': 'EST',
      'EST': 'EST',  // ISO-3 code
      
      'ESWATINI': 'SZLD',
      'SWAZILAND': 'SZLD',
      'SWZ': 'SZLD',  // ISO-3 code
      'SZLD': 'SZLD',
      
      'ETHIOPIA': 'ETH',
      'ETH': 'ETH',  // ISO-3 code
      
      'FALKLAND ISLANDS': 'FKLI',
      'FLK': 'FKLI',  // ISO-3 code
      'FKLI': 'FKLI',
      
      'FAROE ISLANDS': 'FRO',
      'FRO': 'FRO',  // ISO-3 code
      
      'FIJI': 'FIJI',
      'FJI': 'FIJI',  // ISO-3 code
      
      'FRENCH GUIANA': 'FRGN',
      'GUF': 'FRGN',  // ISO-3 code
      'FRGN': 'FRGN',
      
      'FRENCH POLYNESIA': 'FPOL',
      'PYF': 'FPOL',  // ISO-3 code
      'FPOL': 'FPOL',
      
      'FRENCH SOUTHERN TERRITORIES': 'FSAT',
      'ATF': 'FSAT',  // ISO-3 code
      'FSAT': 'FSAT',
      
      'GABON': 'GABN',
      'GAB': 'GABN',  // ISO-3 code
      'GABN': 'GABN',
      
      'GAMBIA': 'GAM',
      'THE GAMBIA': 'GAM',
      'GMB': 'GAM',  // ISO-3 code
      'GAM': 'GAM',
      
      'GAZA STRIP': 'XGZ',
      'GAZA': 'XGZ',
      'XGZ': 'XGZ',
      
      'GEORGIA': 'GEO',
      'GEO': 'GEO',  // ISO-3 code
      
      'GHANA': 'GHAN',
      'GHA': 'GHAN',  // ISO-3 code
      'GHAN': 'GHAN',
      
      'GIBRALTAR': 'GIB',
      'GIB': 'GIB',  // ISO-3 code
      
      'GREENLAND': 'GRLD',
      'GRL': 'GRLD',  // ISO-3 code
      'GRLD': 'GRLD',
      
      'GRENADA': 'GREN',
      'GRD': 'GREN',  // ISO-3 code
      'GREN': 'GREN',
      
      'GUADELOUPE': 'GUAD',
      'GLP': 'GUAD',  // ISO-3 code
      'GUAD': 'GUAD',
      
      'GUAM': 'GUAM',
      'GUM': 'GUAM',  // ISO-3 code
      
      'GUATEMALA': 'GUAT',
      'GTM': 'GUAT',  // ISO-3 code
      'GUAT': 'GUAT',
      
      'GUINEA': 'GNEA',
      'GIN': 'GNEA',  // ISO-3 code
      'GNEA': 'GNEA',
      
      'GUINEA-BISSAU': 'GUIB',
      'GUINEA BISSAU': 'GUIB',
      'GNB': 'GUIB',  // ISO-3 code
      'GUIB': 'GUIB',
      
      'GUYANA': 'GUY',
      'GUY': 'GUY',  // ISO-3 code
      
      'HAITI': 'HAT',
      'HTI': 'HAT',  // ISO-3 code
      'HAT': 'HAT',
      
      'HEARD AND MCDONALD ISLANDS': 'HMD',
      'HMD': 'HMD',  // ISO-3 code
      
      'HOLY SEE': 'VAT',
      'VATICAN': 'VAT',
      'VATICAN CITY': 'VAT',
      'VAT': 'VAT',  // ISO-3 code
      
      'HONDURAS': 'HOND',
      'HND': 'HOND',  // ISO-3 code
      'HOND': 'HOND',
      
      'ICELAND': 'ICLD',
      'ISL': 'ICLD',  // ISO-3 code
      'ICLD': 'ICLD',
      
      'IRAN': 'IRAN',
      'IRN': 'IRAN',  // ISO-3 code
      
      'IRAQ': 'IRAQ',
      'IRQ': 'IRAQ',  // ISO-3 code
      
      'JAMAICA': 'JAM',
      'JAM': 'JAM',  // ISO-3 code
      
      'JERUSALEM': 'JRSM',
      'JRSM': 'JRSM',
      
      'JORDAN': 'JORD',
      'JOR': 'JORD',  // ISO-3 code
      'JORD': 'JORD',
      
      'KAZAKHSTAN': 'KAZ',
      'KAZ': 'KAZ',  // ISO-3 code
      
      'KENYA': 'KENY',
      'KEN': 'KENY',  // ISO-3 code
      'KENY': 'KENY',
      
      'KIRIBATI': 'KIRI',
      'KIR': 'KIRI',  // ISO-3 code
      'KIRI': 'KIRI',
      
      'KOSOVO': 'KSV',
      'XKX': 'KSV',  // Unofficial ISO-3 code
      'KSV': 'KSV',
      
      'KUWAIT': 'KUWT',
      'KWT': 'KUWT',  // ISO-3 code
      'KUWT': 'KUWT',
      
      'KYRGYZSTAN': 'KGZ',
      'KGZ': 'KGZ',  // ISO-3 code
      
      'LAOS': 'LAOS',
      'LAO': 'LAOS',  // ISO-3 code
      
      'LATVIA': 'LATV',
      'LVA': 'LATV',  // ISO-3 code
      'LATV': 'LATV',
      
      'LEBANON': 'LEBN',
      'LBN': 'LEBN',  // ISO-3 code
      'LEBN': 'LEBN',
      
      'LESOTHO': 'LES',
      'LSO': 'LES',  // ISO-3 code
      'LES': 'LES',
      
      'LIBERIA': 'LIBR',
      'LBR': 'LIBR',  // ISO-3 code
      'LIBR': 'LIBR',
      
      'LIBYA': 'LBYA',
      'LBY': 'LBYA',  // ISO-3 code
      'LBYA': 'LBYA',
      
      'LIECHTENSTEIN': 'LCHT',
      'LIE': 'LCHT',  // ISO-3 code
      'LCHT': 'LCHT',
      
      'LITHUANIA': 'LITH',
      'LTU': 'LITH',  // ISO-3 code
      'LITH': 'LITH',
      
      'LUXEMBOURG': 'LXM',
      'LUX': 'LXM',  // ISO-3 code
      'LXM': 'LXM',
      
      'MACAU': 'MAC',
      'MACAO': 'MAC',
      'MAC': 'MAC',  // ISO-3 code
      
      'MACEDONIA': 'MKD',
      'NORTH MACEDONIA': 'MKD',
      'MKD': 'MKD',  // ISO-3 code
      
      'MADAGASCAR': 'MADG',
      'MDG': 'MADG',  // ISO-3 code
      'MADG': 'MADG',
      
      'MALAWI': 'MALW',
      'MWI': 'MALW',  // ISO-3 code
      'MALW': 'MALW',
      
      'MALDIVES': 'MLDV',
      'MDV': 'MLDV',  // ISO-3 code
      'MLDV': 'MLDV',
      
      'MALI': 'MALI',
      'MLI': 'MALI',  // ISO-3 code
      
      'MALTA': 'MLTA',
      'MLT': 'MLTA',  // ISO-3 code
      'MLTA': 'MLTA',
      
      'MARSHALL ISLANDS': 'RMI',
      'MHL': 'RMI',  // ISO-3 code
      'RMI': 'RMI',
      
      'MARTINIQUE': 'MART',
      'MTQ': 'MART',  // ISO-3 code
      'MART': 'MART',
      
      'MAURITANIA': 'MAUR',
      'MRT': 'MAUR',  // ISO-3 code
      'MAUR': 'MAUR',
      
      'MAURITIUS': 'MRTS',
      'MUS': 'MRTS',  // ISO-3 code
      'MRTS': 'MRTS',
      
      'MAYOTTE': 'MYT',
      'MYT': 'MYT',  // ISO-3 code
      
      'MICRONESIA': 'FSM',
      'FSM': 'FSM',  // ISO-3 code
      
      'MOLDOVA': 'MLD',
      'MDA': 'MLD',  // ISO-3 code
      'MLD': 'MLD',
      
      'MONACO': 'MON',
      'MCO': 'MON',  // ISO-3 code
      'MON': 'MON',
      
      'MONGOLIA': 'MONG',
      'MNG': 'MONG',  // ISO-3 code
      'MONG': 'MONG',
      
      'MONTENEGRO': 'MTG',
      'MNE': 'MTG',  // ISO-3 code
      'MTG': 'MTG',
      
      'MONTSERRAT': 'MONT',
      'MSR': 'MONT',  // ISO-3 code
      'MONT': 'MONT',
      
      'MOROCCO': 'MORO',
      'MAR': 'MORO',  // ISO-3 code
      'MORO': 'MORO',
      
      'MOZAMBIQUE': 'MOZ',
      'MOZ': 'MOZ',  // ISO-3 code
      
      'NAMIBIA': 'NAMB',
      'NAM': 'NAMB',  // ISO-3 code
      'NAMB': 'NAMB',
      
      'NAURU': 'NAU',
      'NRU': 'NAU',  // ISO-3 code
      'NAU': 'NAU',
      
      'NEW CALEDONIA': 'NCAL',
      'NCL': 'NCAL',  // ISO-3 code
      'NCAL': 'NCAL',
      
      'NICARAGUA': 'NIC',
      'NIC': 'NIC',  // ISO-3 code
      
      'NIGER': 'NIR',
      'NER': 'NIR',  // ISO-3 code
      'NIR': 'NIR',
      
      'NIUE': 'NIUE',
      'NIU': 'NIUE',  // ISO-3 code
      
      'NORFOLK ISLAND': 'NFK',
      'NFK': 'NFK',  // ISO-3 code
      
      'NORTHERN MARIANA ISLANDS': 'MNP',
      'NORTH MARIANA ISLANDS': 'MNP',
      'MNP': 'MNP',  // ISO-3 code
      
      'OMAN': 'OMAN',
      'OMN': 'OMAN',  // ISO-3 code
      
      'PALAU': 'PALA',
      'PLW': 'PALA',  // ISO-3 code
      'PALA': 'PALA',
      
      'PANAMA': 'PAN',
      'PAN': 'PAN',  // ISO-3 code
      
      'PAPUA NEW GUINEA': 'PNG',
      'PNG': 'PNG',  // ISO-3 code
      
      'PARAGUAY': 'PARA',
      'PRY': 'PARA',  // ISO-3 code
      'PARA': 'PARA',
      
      'PITCAIRN': 'PITC',
      'PITCAIRN ISLANDS': 'PITC',
      'PCN': 'PITC',  // ISO-3 code
      'PITC': 'PITC',
      
      'PUERTO RICO': 'PR',
      'PRI': 'PR',  // ISO-3 code
      'PR': 'PR',
      
      'QATAR': 'QTAR',
      'QAT': 'QTAR',  // ISO-3 code
      'QTAR': 'QTAR',
      
      'REUNION': 'REUN',
      'REU': 'REUN',  // ISO-3 code
      'REUN': 'REUN',
      
      'RWANDA': 'RWND',
      'RWA': 'RWND',  // ISO-3 code
      'RWND': 'RWND',
      
      'SAINT MARTIN': 'MAF',
      'ST MARTIN': 'MAF',
      'MAF': 'MAF',  // ISO-3 code
      
      'SAMOA': 'WSAM',
      'WSM': 'WSAM',  // ISO-3 code
      'WSAM': 'WSAM',
      
      'SAN MARINO': 'SMAR',
      'SMR': 'SMAR',  // ISO-3 code
      'SMAR': 'SMAR',
      
      'SAO TOME': 'STPR',
      'SAO TOME AND PRINCIPE': 'STPR',
      'STP': 'STPR',  // ISO-3 code
      'STPR': 'STPR',
      
      'SENEGAL': 'SENG',
      'SEN': 'SENG',  // ISO-3 code
      'SENG': 'SENG',
      
      'SERBIA': 'SBA',
      'SRB': 'SBA',  // ISO-3 code
      'SBA': 'SBA',
      
      'SEYCHELLES': 'SEYC',
      'SYC': 'SEYC',  // ISO-3 code
      'SEYC': 'SEYC',
      
      'SIERRA LEONE': 'SLEO',
      'SLE': 'SLEO',  // ISO-3 code
      'SLEO': 'SLEO',
      
      'SINT MAARTEN': 'STM',
      'SXM': 'STM',  // ISO-3 code
      'STM': 'STM',
      
      'SLOVAKIA': 'SVK',
      'SVK': 'SVK',  // ISO-3 code
      
      'SLOVENIA': 'SVN',
      'SVN': 'SVN',  // ISO-3 code
      
      'SOLOMON ISLANDS': 'SLMN',
      'SLB': 'SLMN',  // ISO-3 code
      'SLMN': 'SLMN',
      
      'SOMALIA': 'SOMA',
      'SOM': 'SOMA',  // ISO-3 code
      'SOMA': 'SOMA',
      
      'SOUTH GEORGIA': 'SGS',
      'SGS': 'SGS',  // ISO-3 code
      
      'SOUTH SUDAN': 'SSDN',
      'SSD': 'SSDN',  // ISO-3 code
      'SSDN': 'SSDN',
      
      'ST HELENA': 'SHEL',
      'SAINT HELENA': 'SHEL',
      'SHN': 'SHEL',  // ISO-3 code
      'SHEL': 'SHEL',
      
      'ST KITTS': 'STCN',
      'SAINT KITTS': 'STCN',
      'ST KITTS AND NEVIS': 'STCN',
      'KNA': 'STCN',  // ISO-3 code
      'STCN': 'STCN',
      
      'ST LUCIA': 'SLCA',
      'SAINT LUCIA': 'SLCA',
      'LCA': 'SLCA',  // ISO-3 code
      'SLCA': 'SLCA',
      
      'ST PIERRE': 'SPMI',
      'SAINT PIERRE': 'SPMI',
      'ST PIERRE AND MIQUELON': 'SPMI',
      'SPM': 'SPMI',  // ISO-3 code
      'SPMI': 'SPMI',
      
      'ST VINCENT': 'STVN',
      'SAINT VINCENT': 'STVN',
      'ST VINCENT AND THE GRENADINES': 'STVN',
      'VCT': 'STVN',  // ISO-3 code
      'STVN': 'STVN',
      
      'SUDAN': 'SUDA',
      'SDN': 'SUDA',  // ISO-3 code
      'SUDA': 'SUDA',
      
      'SURINAME': 'SURM',
      'SUR': 'SURM',  // ISO-3 code
      'SURM': 'SURM',
      
      'SVALBARD': 'SJM',
      'SJM': 'SJM',  // ISO-3 code
      
      'SYRIA': 'SYR',
      'SYR': 'SYR',  // ISO-3 code
      
      'TAJIKISTAN': 'TJK',
      'TJK': 'TJK',  // ISO-3 code
      
      'TANZANIA': 'TAZN',
      'TZA': 'TAZN',  // ISO-3 code
      'TAZN': 'TAZN',
      
      'TIMOR-LESTE': 'TMOR',
      'EAST TIMOR': 'TMOR',
      'TLS': 'TMOR',  // ISO-3 code
      'TMOR': 'TMOR',
      
      'TOGO': 'TOGO',
      'TGO': 'TOGO',  // ISO-3 code
      
      'TOKELAU': 'TKL',
      'TKL': 'TKL',  // ISO-3 code
      
      'TONGA': 'TONG',
      'TON': 'TONG',  // ISO-3 code
      'TONG': 'TONG',
      
      'TRINIDAD': 'TRIN',
      'TRINIDAD AND TOBAGO': 'TRIN',
      'TTO': 'TRIN',  // ISO-3 code
      'TRIN': 'TRIN',
      
      'TUNISIA': 'TNSA',
      'TUN': 'TNSA',  // ISO-3 code
      'TNSA': 'TNSA',
      
      'TURKMENISTAN': 'TKM',
      'TKM': 'TKM',  // ISO-3 code
      
      'TURKS AND CAICOS': 'TCIS',
      'TCA': 'TCIS',  // ISO-3 code
      'TCIS': 'TCIS',
      
      'TUVALU': 'TUV',
      'TUV': 'TUV',  // ISO-3 code
      
      'UGANDA': 'UGAN',
      'UGA': 'UGAN',  // ISO-3 code
      'UGAN': 'UGAN',
      
      'URUGUAY': 'URU',
      'URY': 'URU',  // ISO-3 code
      'URU': 'URU',
      
      'UZBEKISTAN': 'UZB',
      'UZB': 'UZB',  // ISO-3 code
      
      'VANUATU': 'VANU',
      'VUT': 'VANU',  // ISO-3 code
      'VANU': 'VANU',
      
      'VIRGIN ISLANDS': 'VI',
      'US VIRGIN ISLANDS': 'VI',
      'VIR': 'VI',  // ISO-3 code
      'VI': 'VI',
      
      'BRITISH VIRGIN ISLANDS': 'BRVI',
      'VGB': 'BRVI',  // ISO-3 code
      'BRVI': 'BRVI',
      
      'WALLIS AND FUTUNA': 'WAFT',
      'WLF': 'WAFT',  // ISO-3 code
      'WAFT': 'WAFT',
      
      'WEST BANK': 'XWB',
      'PSE': 'XWB',  // ISO-3 code for Palestine
      'PALESTINE': 'XWB',
      'XWB': 'XWB',
      
      'WESTERN SAHARA': 'SSAH',
      'ESH': 'SSAH',  // ISO-3 code
      'SSAH': 'SSAH',
      
      'YEMEN': 'YEM',
      'YEM': 'YEM',  // ISO-3 code
      
      'ZAMBIA': 'ZAMB',
      'ZMB': 'ZAMB',  // ISO-3 code
      'ZAMB': 'ZAMB',
      
      'ZIMBABWE': 'ZIMB',
      'ZWE': 'ZIMB',  // ISO-3 code
      'ZIMB': 'ZIMB'
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
      'E3D': 'SPOUSE OF E3 (E3D)',
      
      // E-1 visa specific subtypes
      'E1-CH': 'E1-CH',  // CHILD OF AN E1 (E1)
      'E1-EX': 'E1-EX',  // EXECUTIVE/MGR/ESSENTIAL EMP (E1)
      'E1-SP': 'E1-SP',  // SPOUSE OF AN E1 (E1)
      'E1-TR': 'E1-TR',  // TREATY TRADER (E1)
      
      // E-2 visa specific subtypes
      'E2-CH': 'E2-CH',  // CHILD OF AN E2 (E2)
      'E2-EX': 'E2-EX',  // EXECUTIVE/MGR/ESSENTIAL EMP (E2)
      'E2-SP': 'E2-SP',  // SPOUSE OF AN E2 (E2)
      'E2-TR': 'E2-TR',  // TREATY INVESTOR (E2)
      
      // E-3 visa specific subtypes
      'E3D-CH': 'E3D-CH',  // CHILD OF AN E3 (E3D)
      'E3D-SP': 'E3D-SP'   // SPOUSE OF AN E3 (E3D)
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
      // Direct DS-160 codes (map to themselves)
      'FCBK': 'FCBK',
      'TWIT': 'TWIT',
      'INST': 'INST',
      'LINK': 'LINK',
      'YTUB': 'YTUB',
      'PTST': 'PTST',
      'TUMB': 'TUMB',
      'ASKF': 'ASKF',
      'DUBN': 'DUBN',
      'FLKR': 'FLKR',
      'GOGL': 'GOGL',
      'MYSP': 'MYSP',
      'QZNE': 'QZNE',
      'RDDT': 'RDDT',
      'SWBO': 'SWBO',
      'TWBO': 'TWBO',
      'TWOO': 'TWOO',
      'VINE': 'VINE',
      'VKON': 'VKON',
      'YUKU': 'YUKU',
      // User-friendly names
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
  mapSpouseAddressType(addressType) {
    if (!addressType) return 'H'; // Default to same as home address if no address specified
    
    // Handle explicit addressType values from the new prompt structure
    if (typeof addressType === 'string') {
      const typeUpper = addressType.toUpperCase();
      
      // Map from prompt values to DS-160 dropdown values
      const addressTypeMap = {
        'SAME_AS_HOME': 'H',
        'SAME AS HOME': 'H',
        'SAME_AS_MAILING': 'M',
        'SAME AS MAILING': 'M',
        'SAME_AS_US_CONTACT': 'U',
        'SAME AS US CONTACT': 'U',
        'DO_NOT_KNOW': 'D',
        'DO NOT KNOW': 'D',
        'OTHER': 'O'
      };
      
      // Check if it's an explicit type from the new prompt
      if (addressTypeMap[typeUpper]) {
        return addressTypeMap[typeUpper];
      }
      
      // Legacy support: check for keywords in the string
      if (typeUpper.includes('SAME AS MY RESIDENCE') || typeUpper.includes('SAME AS HOME') || typeUpper.includes('SAME AS APPLICANT')) {
        return 'H'; // Same as Home Address
      }
      if (typeUpper.includes('SAME AS MAILING')) {
        return 'M'; // Same as Mailing Address
      }
      if (typeUpper.includes('SAME AS U.S. CONTACT') || typeUpper.includes('SAME AS US CONTACT')) {
        return 'U'; // Same as U.S. Contact Address
      }
      if (typeUpper.includes('DO NOT KNOW') || typeUpper.includes("DON'T KNOW")) {
        return 'D'; // Do Not Know
      }
      
      // If it's any other string value that's not "N/A", assume it's a different address
      if (addressType !== 'N/A') {
        return 'O'; // Other (Specify Address)
      }
    }
    
    // Legacy support: if address is an object with street/city/etc, it's a different address
    if (typeof addressType === 'object' && (addressType.street1 || addressType.city || addressType.country)) {
      return 'O'; // Other (Specify Address)
    }
    
    return 'H'; // Default to same as home address
  }

  
  mapPayerType(payer) {
    if (!payer) return null;
    
    const payerMap = {
      'SELF': 'S',
      'S': 'S',
      'COMPANY': 'P',           // Map COMPANY to Present Employer
      'PRESENT_EMPLOYER': 'P',
      'EMPLOYER_IN_US': 'U',
      'OTHER_PERSON': 'O',
      'O': 'O',
      'P': 'P',
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
      // Travel companion relationships
      'PARENT': 'P',
      'P': 'P',
      'SPOUSE': 'S',
      'S': 'S',
      'CHILD': 'C',
      'C': 'C',
      'OTHER RELATIVE': 'R',
      'RELATIVE': 'R',
      'R': 'R',
      'FRIEND': 'C',  // Changed from 'F' to 'C' for US Contact
      'F': 'C',       // Changed from 'F' to 'C'
      'BUSINESS': 'B',
      'BUSINESS ASSOCIATE': 'B',
      'B': 'B',
      'OTHER': 'O',
      'O': 'O',
      // US Contact relationships (correct DS-160 values)
      'SCHOOL': 'H',           // School Official
      'SCHOOL OFFICIAL': 'H',
      'EMPLOYER': 'P',         // Fixed: P for EMPLOYER
      'E': 'P',               // Fixed: map E to P
      'HOTEL': 'H',
      'H': 'H',
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
      previousEducationCount: data?.workEducation?.education?.institutions?.length || 0,
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
    const petitionNumber = data.travel?.petitionNumber || data.petition?.receiptNumber;
    if (petitionField && petitionNumber) {
      const expectedValue = petitionNumber;
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
  
  showSubordinatesNotification(subordinatesCount) {
    // Only show if there are multiple subordinates
    if (subordinatesCount <= 1) return;
    
    this.showUnifiedNotification({
      title: '👥 Multiple Subordinates Detected',
      sections: [{
        icon: '👤',
        title: `${subordinatesCount} Immediate Subordinates`,
        description: 'After filling the first subordinate, click "Add Another" to add additional subordinates. Each entry will be auto-filled in order.'
      }]
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
          const educationCount = this.data.workEducation?.education?.institutions?.length || 0;
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
        
        // Show notification if on E-visa Applicant US Position page with multiple subordinates
        if (currentPage === 'evisaApplicantUSPosition' && this.data) {
          const subordinatesCount = this.data.evisaApplicantUSPosition?.immediateSubordinates?.length || 0;
          this.filler.showSubordinatesNotification(subordinatesCount);
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
      const educationCount = this.data.workEducation?.education?.institutions?.length || 0;
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
      const socialCount = this.checkForMultipleSocialMedia(this.data);
      
      // Show social media helper if user has any accounts - EXACTLY like US travel notification
      if (socialCount > 0) {
        const socialAccounts = this.data?.contact?.socialMediaAccounts || this.data?.contact?.socialMedia || [];
        this.showSocialMediaHelper(socialAccounts);
      }
      
      // Don't show the generic notification - the detailed helper is enough
      // if (socialCount > 1) {
      //   this.showMultipleSocialMediaNotification(socialCount);
      // }
      
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
      const educationCount = this.data.workEducation?.education?.institutions?.length || 0;
      this.filler.showMultipleEntriesNotification(employerCount, educationCount);
      
      // Use batch processing for previous employers if we have any
      if (employerCount > 0) {
        const success = this.filler.fillPreviousEmployers(this.data);
      }
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
    
    // Check for multiple travel companions - only on travel companions page
    if (currentPage === 'travelCompanions') {
      const companionsCount = this.checkForMultipleTravelCompanions(this.data);
      if (companionsCount > 1) {
        this.showMultipleTravelCompanionsNotification(companionsCount);
      }
    }
    
    // Check for multiple immediate subordinates - only on E-Visa applicant position page
    if (currentPage === 'evisaApplicantUSPosition') {
      const subordinatesCount = this.data.evisaApplicantUSPosition?.immediateSubordinates?.length || 0;
      if (subordinatesCount > 1) {
        this.filler.showSubordinatesNotification(subordinatesCount);
        
        // Use batch processing for immediate subordinates if we have any
        const success = this.filler.fillImmediateSubordinates(this.data);
      }
    }
    
    const count = await this.filler.fillWithTwoPasses(this.data);
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
        <div class="copyable-field" data-value="${account.handle || account.username || ''}" style="
          padding: 8px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          <span style="font-weight: 500;">Handle:</span> ${account.handle || account.username || 'Not provided'}
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
    if (data && data.workEducation?.countriesVisited?.countries) {
      return data.workEducation.countriesVisited.countries.length;
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
    // Check for array format first (new format)
    if (data && data.previousTravel?.driverLicense?.licenses) {
      return data.previousTravel.driverLicense.licenses.length;
    }
    // Check for old plural format
    if (data && data.previousTravel?.driversLicenses) {
      return data.previousTravel.driversLicenses.length;
    }
    // Check if single license exists (old format)
    if (data && data.previousTravel?.driverLicense?.number) {
      return 1;
    }
    return 0;
  }
  
  checkForMultipleTravelCompanions(data) {
    // Return the count of travel companions
    if (data && data.travelCompanions) {
      return Array.isArray(data.travelCompanions) ? data.travelCompanions.length : 0;
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
      const countries = this.data?.workEducation?.countriesVisited?.countries || [];
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
        visitsList += `<td style="padding: 4px;">${visit.arrivalDate || visit.entryDate || 'N/A'}</td>`;
        visitsList += `<td style="padding: 4px;">${visit.lengthOfStayNumber || this.parseLengthOfStay(visit.lengthOfStay)?.number || 'N/A'} ${visit.lengthOfStayUnit || this.parseLengthOfStay(visit.lengthOfStay)?.unit || ''}</td>`;
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
  
  showMultipleTravelCompanionsNotification(companionsCount) {
    this.filler.showUnifiedNotification({
      title: '👥 Multiple Travel Companions Detected',
      sections: [{
        icon: '✈️',
        title: `${companionsCount} Travel Companions Found`,
        description: 'The extension will fill the first companion. Click "Add Another" button on the Travel Companions page to add additional companions.',
        fieldInfo: 'Fields: Surnames, Given Names, and Relationship'
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

} // End of DS160_INITIALIZED check