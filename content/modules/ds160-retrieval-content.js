// DS-160 Retrieval Form Auto-Filler
// Fills the DS-160 application retrieval page with stored credentials

console.log('[DS160-RETRIEVAL] Script file loaded, checking initialization...');

// Prevent duplicate initialization
if (typeof window.DS160_RETRIEVAL_INITIALIZED === 'undefined') {
  console.log('[DS160-RETRIEVAL] Initializing for the first time...');
  window.DS160_RETRIEVAL_INITIALIZED = true;

  console.log('[DS160-RETRIEVAL] Auto-Filler initialization started');

  class DS160RetrievalFiller {
    constructor() {
      this.data = null;
    }

    /**
     * Fill the DS-160 retrieval form
     * @param {Object} data - Application retrieval data
     * @param {string} data.applicationId - DS-160 application ID (e.g., "AA00EX69LD")
     * @param {string} data.surname - Applicant's surname (first 5 letters will be used)
     * @param {string} data.yearOfBirth - Year of birth (e.g., "1968")
     * @param {string} data.motherMotherName - Mother's mother's given name
     */
    async fillForm(data) {
      this.data = data;
      console.log('Starting DS-160 retrieval form fill:', data.applicationId);

      try {
        await this.fillRetrievalFields();
        console.log('DS-160 retrieval form filled successfully');
        return { success: true, message: 'Form filled successfully' };
      } catch (error) {
        console.error('Error filling retrieval form:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Fill all retrieval form fields
     */
    async fillRetrievalFields() {
      const filled = [];

      // Field mappings for DS-160 retrieval page (verified actual IDs)
      const fieldMappings = {
        // Application ID (10 chars max)
        'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_tbxApplicationID': this.data.applicationId,

        // First 5 letters of surname (5 chars max)
        'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbSurname': this.getSurnameFirstFive(),

        // Year of birth (4 chars max)
        'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbDOBYear': this.data.yearOfBirth,

        // Mother's mother's given name (50 chars max) - Always use HUGO as security answer
        'ctl00_SiteContentPlaceHolder_ApplicationRecovery1_txbAnswer': 'HUGO'
      };

      // Try to fill each field
      for (const [fieldId, value] of Object.entries(fieldMappings)) {
        if (!value) continue; // Skip if no value

        const element = document.getElementById(fieldId);
        if (element) {
          this.fillField(element, value);
          filled.push(fieldId);
          console.log(`Filled field: ${fieldId} = ${value}`);
        }
      }

      // If no fields were filled, log available form elements for debugging
      if (filled.length === 0) {
        console.warn('No retrieval form fields found. Available input elements:');
        const inputs = document.querySelectorAll('input[type="text"], input[type="password"], input:not([type])');
        inputs.forEach(input => {
          console.log(`- ID: ${input.id || 'N/A'}, Name: ${input.name || 'N/A'}, Placeholder: ${input.placeholder || 'N/A'}`);
        });
        throw new Error('Could not find retrieval form fields. Please verify you are on the correct page.');
      }

      return filled;
    }

    /**
     * Fill a single form field
     */
    fillField(element, value) {
      if (!element || !value) return;

      // Set value
      element.value = value;

      // Trigger events to ensure the form recognizes the change
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    /**
     * Get first 5 letters of surname in uppercase
     */
    getSurnameFirstFive() {
      if (!this.data.surname) return '';
      return this.data.surname.substring(0, 5).toUpperCase();
    }

    /**
     * Detect if we're on the retrieval page
     */
    static isRetrievalPage() {
      const url = window.location.href;
      const isCorrectUrl = url.includes('ceac.state.gov/genniv') ||
                          url.includes('retrieve') ||
                          url.includes('application');

      // Look for retrieval page indicators
      const hasRetrieveButton = document.querySelector('input[value*="Retrieve"]') ||
                                document.querySelector('button:contains("Retrieve")');
      const hasApplicationIdField = document.querySelector('input[id*="appId"], input[id*="application"]');

      return isCorrectUrl || hasRetrieveButton || hasApplicationIdField;
    }
  }

  // Create global instance
  window.ds160RetrievalFiller = new DS160RetrievalFiller();

  // Listen for messages from sidebar
  console.log('[DS160-RETRIEVAL] Setting up message listener...');
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[DS160-RETRIEVAL] Message received:', request.action, request.module);

    if (request.action === 'fillRetrievalForm' && request.module === 'ds160-retrieval') {
      console.log('[DS160-RETRIEVAL] Fill command matched! Processing...');
      console.log('[DS160-RETRIEVAL] Data:', request.data);

      // Check if we're on the correct page
      const isCorrectPage = DS160RetrievalFiller.isRetrievalPage();
      console.log('[DS160-RETRIEVAL] Is correct page:', isCorrectPage);

      if (!isCorrectPage) {
        const errorMsg = 'Not on DS-160 retrieval page. Please navigate to the "Retrieve a DS-160 Application" page.';
        console.error('[DS160-RETRIEVAL]', errorMsg);
        sendResponse({ success: false, error: errorMsg });
        return true;
      }

      // Fill the form
      console.log('[DS160-RETRIEVAL] Starting form fill...');
      window.ds160RetrievalFiller.fillForm(request.data)
        .then(result => {
          console.log('[DS160-RETRIEVAL] Fill completed:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('[DS160-RETRIEVAL] Fill error:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Indicate async response
    }
  });

  console.log('[DS160-RETRIEVAL] Message listener registered successfully');
  console.log('[DS160-RETRIEVAL] Auto-Filler ready');

  // Add global check function for debugging
  window.checkDS160RetrievalLoaded = () => {
    console.log('[DS160-RETRIEVAL DEBUG] Script status:');
    console.log('  - DS160_RETRIEVAL_INITIALIZED:', window.DS160_RETRIEVAL_INITIALIZED);
    console.log('  - ds160RetrievalFiller exists:', !!window.ds160RetrievalFiller);
    console.log('  - Current URL:', window.location.href);
    console.log('  - Is retrieval page:', DS160RetrievalFiller.isRetrievalPage());
  };

  console.log('[DS160-RETRIEVAL] Debug function available: window.checkDS160RetrievalLoaded()');
} else {
  console.log('[DS160-RETRIEVAL] Already initialized, skipping duplicate initialization');
}
