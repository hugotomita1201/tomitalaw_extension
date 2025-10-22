// US Visa Scheduling Auto-Filler Content Script with Dependent Management
console.log('US Visa Scheduling Auto-Filler v1.1.1 loaded - with auto date format conversion');

class VisaSchedulingFiller {
  constructor() {
    this.currentData = null;
    this.dependents = [];
    this.filledFields = new Set();
    this.selectorVisible = false;
    this.init();
  }

  init() {
    // Listen for messages from extension (sidebar/background)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'fillForm' && request.module === 'visa') {
        console.log('Visa module received fill command');
        try {
          this.fillForm(request.data);
          // Send success response
          chrome.runtime.sendMessage({
            action: 'fillComplete',
            module: 'visa'
          });
          sendResponse({ success: true });
        } catch (error) {
          // Send error response
          chrome.runtime.sendMessage({
            action: 'fillError',
            module: 'visa',
            error: error.message
          });
          sendResponse({ success: false, error: error.message });
        }
      }
    });

    // Auto-detect page and show notification
    const pageType = this.detectPageType();
    if (pageType !== 'unknown') {
      console.log(`Detected page: ${pageType}`);
    }
    
    // Check if we're on visa options page and show helper popup
    // DISABLED - No longer needed
    // if (pageType === 'visa_options' || pageType === 'additional_options') {
    //   this.checkAndShowVisaOptionsPopup();
    // }
    
    // Removed auto-show selector - now triggered manually via popup button
    // if (this.isOnDependentPage()) {
    //   this.loadDependentsFromStorage();
    //   this.createDependentSelector();
    // }
  }
  
  // Check if we're on a dependent-related page
  isOnDependentPage() {
    const url = window.location.href;
    const title = document.title;
    return (
      url.includes('manage_dependents') || 
      url.includes('daddcontact') || 
      url.includes('dep_applicant_add') ||
      title.includes('Dependent Contact') ||
      title.includes('Dependent Applicant')
    );
  }
  
  // Load dependents from storage
  async loadDependentsFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['visaData'], (result) => {
        if (result.visaData && result.visaData.dependents) {
          this.dependents = result.visaData.dependents;
          console.log(`Loaded ${this.dependents.length} dependents from storage`);
        }
        resolve();
      });
    });
  }

  // Detect which page we're on
  detectPageType() {
    const path = window.location.pathname;
    const title = document.title.toLowerCase();
    const url = window.location.href;

    // Check for passport delivery pages (pds subdomain)
    if (url.includes('pds.ayobaspremium.jp')) {
      if (path.includes('delivery_address')) {
        return 'passport_delivery';
      } else if (path.includes('choose_interview_loc')) {
        // Interview location selection page
        return 'passport_delivery_interview_loc';
      } else if (path.includes('kmjcheckout')) {
        // Payment/checkout page (after delivery address)
        return 'passport_delivery_checkout';
      } else if (path === '/' || path.startsWith('/?')) {
        // Root page with UID entry
        return 'passport_delivery_uid';
      }
    } else if (url.includes('ayobaspremium') || title.includes('ayobas premium') || path.includes('payment')) {
      // Regular Ayobas payment page
      return 'payment';
    } else if (url.includes('atlasauth.b2clogin.com') || title.includes('user details')) {
      return 'signup';
    } else if (path.includes('visa_options') || title.includes('visa options')) {
      return 'visa_options';
    } else if (path.includes('additional_visa_options') || title.includes('additional options')) {
      return 'additional_options';
    } else if (path.includes('applicant_details') || title.includes('applicant')) {
      return 'applicant_details';
    } else if (path.includes('family') || title.includes('family')) {
      return 'family_details';
    } else if (path.includes('travel') || title.includes('travel')) {
      return 'travel_info';
    } else if (path.includes('address') || title.includes('address')) {
      return 'address';
    } else if (path.includes('passport') || title.includes('passport')) {
      return 'passport';
    } else if (path.includes('contact') || title.includes('contact')) {
      return 'contact_info';
    } else if (path.includes('schedule') || title.includes('appointment')) {
      return 'appointment';
    } else if (path.includes('document_delivery') || title.includes('document delivery') || title.includes('delivery options')) {
      return 'document_delivery';
    }

    return 'unknown';
  }

  // Detect all fields on current page
  detectFields() {
    const fields = [];
    
    document.querySelectorAll('input, select, textarea').forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit') return;
      if (!element.offsetParent) return; // Skip invisible fields
      
      const field = {
        id: element.id || '',
        name: element.name || '',
        type: element.type || element.tagName.toLowerCase(),
        label: this.getLabel(element),
        value: element.value || '',
        required: element.required || element.hasAttribute('required')
      };
      
      if (element.tagName === 'SELECT') {
        field.options = Array.from(element.options).slice(0, 5).map(opt => ({
          text: opt.text,
          value: opt.value
        }));
        field.optionCount = element.options.length;
      }
      
      fields.push(field);
    });
    
    return fields;
  }

  // Get label for a field
  getLabel(element) {
    // Try multiple methods to find label
    const labelFor = document.querySelector(`label[for="${element.id}"]`);
    if (labelFor) return labelFor.textContent.trim();
    
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const text = parentLabel.textContent;
      return text.replace(element.value || '', '').trim();
    }
    
    if (element.placeholder) return element.placeholder;
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
    
    // Look for nearby text
    const parent = element.closest('.form-group, .field-wrapper, div');
    if (parent) {
      const labels = parent.querySelectorAll('label');
      if (labels.length > 0) {
        return labels[0].textContent.trim();
      }
    }
    
    return element.name || element.id || '';
  }

  // Main form filling function
  fillForm(data) {
    if (!data) {
      console.log('No data to fill');
      return;
    }

    this.currentData = data;
    this.filledFields.clear();
    
    console.log('Starting form fill with data:', data);
    
    // Detect page type first
    const pageType = this.detectPageType();
    
    // Force payment page to use specialized function
    if (pageType === 'payment') {
      console.log('Payment page detected - using fillPaymentPage');
      this.fillPaymentPage(data);
      return;  // Exit early
    }
    
    // Check if data has atlas_ fields (new format)
    const hasAtlasFields = Object.keys(data).some(key => key.startsWith('atlas_'));
    
    if (hasAtlasFields) {
      // Direct filling with atlas_ fields for non-payment pages
      console.log('Using atlas_ field format');
      this.fillGenericFields(data);
    } else {
      // Legacy format - use page-specific functions
      
      switch(pageType) {
        case 'payment':
          this.fillPaymentPage(data);
          break;
        case 'signup':
          this.fillSignupPage(data);
          break;
        case 'applicant_details':
          this.fillApplicantDetails(data);
          break;
        case 'family_details':
          this.fillFamilyDetails(data);
          break;
        case 'travel_info':
          this.fillTravelInfo(data);
          break;
        case 'address':
          this.fillAddress(data);
          break;
        case 'passport':
          this.fillPassport(data);
          break;
        case 'contact_info':
          this.fillContactInfo(data);
          break;
        case 'document_delivery':
          this.fillDocumentDelivery(data);
          break;
        case 'passport_delivery_uid':
          // Fill UID entry page (first page)
          this.fillUIDEntryPage(data.passportReturn);
          break;
        case 'passport_delivery_interview_loc':
          // Fill interview location selection page (second page)
          this.fillInterviewLocationPage(data.passportReturn);
          break;
        case 'passport_delivery':
          // Fill BOTH delivery address page and modal
          this.fillDeliveryAddressPage(data.passportReturn);

          // Try to fill modal if visible (with delay for modal to appear)
          setTimeout(() => {
            this.fillPassportDeliveryModal(data.passportReturn);
          }, 1000);
          break;
        case 'passport_delivery_checkout':
          // Fill checkout/payment page (uses same fields as regular payment page)
          if (data.passportReturn && data.passportReturn.mainApplicant) {
            // Transform passport return data structure to match payment page expectations
            const main = data.passportReturn.mainApplicant;
            const applicant = data.passportReturn.applicants ? data.passportReturn.applicants[0] : {};

            const transformedData = {
              // Names from applicants array (use native names for payment page, fallback to romaji)
              name_first: applicant.first_name_native || applicant.first_name_romaji || '',
              name_last: applicant.last_name_native || applicant.last_name_romaji || '',
              // Address from mainApplicant
              postal_code: main.postal_code,
              region: main.region,
              city: main.city,
              street: main.address,  // Map 'address' → 'street'
              street2: main.apartment || '',  // Map 'apartment' → 'street2'
              phone: main.phone,
              email: main.email
            };

            this.fillPaymentPage(transformedData);
          } else {
            this.fillPaymentPage(data);
          }
          break;
        default:
          // Try to fill any matching fields
          this.fillGenericFields(data);
      }
    }
    
    console.log(`Form filling complete. Filled ${this.filledFields.size} fields`);
  }

  // Fill applicant details page - Using actual atlas_ field IDs
  fillApplicantDetails(data) {
    // Personal information
    this.fillField('atlas_first_name', data.atlas_first_name);
    this.fillField('atlas_last_name', data.atlas_last_name);
    
    // Birth information
    this.fillField('atlas_birthdate_datepicker_description', data.atlas_birthdate_datepicker_description);
    this.fillDropdownByText('atlas_pob_country', data.atlas_pob_country);
    
    // Country/Nationality - Use text matching for dropdowns
    this.fillDropdownByText('atlas_country', data.atlas_country);
    this.fillDropdownByText('atlas_nationality', data.atlas_nationality);
    
    // Contact information
    this.fillField('atlas_email', data.atlas_email);
    this.fillDropdownByText('atlas_home_phone_country_code', data.atlas_home_phone_country_code);
    this.fillField('atlas_home_phone', data.atlas_home_phone);
    this.fillDropdownByText('atlas_mobile_phone_country_code', data.atlas_mobile_phone_country_code);
    this.fillField('atlas_mobile_phone', data.atlas_mobile_phone);
    
    // Mailing address
    this.fillField('atlas_mailing_street', data.atlas_mailing_street);
    this.fillField('atlas_mailing_city', data.atlas_mailing_city);
    this.fillField('atlas_mailing_state', data.atlas_mailing_state);
    this.fillField('atlas_mailing_postal_code', data.atlas_mailing_postal_code);
    
    // Passport information
    this.fillField('atlas_passport_number', data.atlas_passport_number);
    this.fillField('atlas_passport_issuance_date_datepicker_description', data.atlas_passport_issuance_date_datepicker_description);
    this.fillField('atlas_passport_place_of_issue', data.atlas_passport_place_of_issue);
    this.fillField('atlas_passport_expiration_date_datepicker_description', data.atlas_passport_expiration_date_datepicker_description);
    
    // IDs
    this.fillField('atlas_national_id', data.atlas_national_id);
  }

  // Fill family details
  fillFamilyDetails(data) {
    if (data.father) {
      this.fillField('father_first_name', data.father.firstName);
      this.fillField('father_last_name', data.father.lastName);
      this.fillDropdownByText('father_nationality', data.father.nationality);
    }
    
    if (data.mother) {
      this.fillField('mother_first_name', data.mother.firstName);
      this.fillField('mother_last_name', data.mother.lastName);
      this.fillDropdownByText('mother_nationality', data.mother.nationality);
    }
    
    if (data.spouse) {
      this.fillField('spouse_first_name', data.spouse.firstName);
      this.fillField('spouse_last_name', data.spouse.lastName);
      this.fillDropdownByText('spouse_nationality', data.spouse.nationality);
    }
  }

  // Fill travel information
  fillTravelInfo(data) {
    this.fillField('purpose_of_trip', data.purposeOfTrip);
    this.fillField('intended_arrival_date', data.arrivalDate);
    this.fillField('intended_departure_date', data.departureDate);
    this.fillField('length_of_stay', data.lengthOfStay);
    
    // Previous US travel
    this.fillRadioByValue('previous_us_travel', data.previousUSTravel ? 'yes' : 'no');
    if (data.previousUSTravel) {
      this.fillField('previous_visa_number', data.previousVisaNumber);
      this.fillField('previous_visa_issue_date', data.previousVisaIssueDate);
    }
  }

  // Fill address information
  fillAddress(data) {
    if (data.homeAddress) {
      this.fillField('address_line_1', data.homeAddress.street1);
      this.fillField('address_line_2', data.homeAddress.street2);
      this.fillField('city', data.homeAddress.city);
      this.fillField('state', data.homeAddress.state);
      this.fillField('postal_code', data.homeAddress.postalCode);
      this.fillDropdownByText('country', data.homeAddress.country);
    }
    
    // US Address
    if (data.usAddress) {
      this.fillField('us_address_line_1', data.usAddress.street1);
      this.fillField('us_address_line_2', data.usAddress.street2);
      this.fillField('us_city', data.usAddress.city);
      this.fillDropdownByText('us_state', data.usAddress.state);
      this.fillField('us_zip_code', data.usAddress.zipCode);
    }
  }

  // Fill passport information
  fillPassport(data) {
    if (data.passport) {
      this.fillField('passport_number', data.passport.number);
      this.fillDropdownByText('passport_country', data.passport.issuingCountry);
      this.fillField('passport_issue_date', data.passport.issueDate);
      this.fillField('passport_expiry_date', data.passport.expiryDate);
      this.fillField('passport_issue_city', data.passport.issueCity);
    }
  }

  // Fill signup page (Atlas Auth)
  fillSignupPage(data) {
    // Username: full first name + last name (no numbers)
    const firstName = data.givenName || data.atlas_first_name || data.firstname || '';
    const lastName = data.surname || data.atlas_last_name || data.lastname || '';
    if (firstName && lastName) {
      const username = firstName.toLowerCase() + lastName.toLowerCase();
      this.fillField('signInName', username);
    }
    
    // Password fields - leave empty for user to create their own password
    // User will enter their preferred password
    
    // Email field - leave empty for user to fill manually
    // User will enter their preferred email
    
    // Name fields
    this.fillField('givenName', firstName);
    this.fillField('surname', lastName);
    
    // Security questions and answers
    // Question 1: Mother's maiden name -> Tomita
    this.fillDropdownByText('extension_kbq1', "What is your mother's maiden name?");
    this.fillField('extension_kba1', 'Tomita');
    
    // Question 2: Street you grew up on -> Law
    this.fillDropdownByText('extension_kbq2', "What is the name of the road/street you grew up on?");
    this.fillField('extension_kba2', 'Law');
    
    // Question 3: Where you met spouse -> Office
    this.fillDropdownByText('extension_kbq3', "Where did you meet your spouse?");
    this.fillField('extension_kba3', 'Office');
    
    this.showNotification('Signup form filled successfully!');
  }
  
  // Extract apartment/floor/unit info from address for street2 field
  extractAddressLine2(fullAddress) {
    if (!fullAddress) return { street: '', unit: '' };
    
    // Common patterns for apartment/floor/unit
    const patterns = [
      // Japanese
      /(\d+階)$/,                    // Floor: 6階
      /(\d+[FＦ])$/,                  // Floor: 3F
      /(\d+号室)$/,                  // Room: 101号室
      /(\d+号)$/,                    // Number: 5号
      // English
      /(Apt\.?\s*\S+)$/i,            // Apt 4B
      /(Suite\s*\S+)$/i,             // Suite 200
      /(Unit\s*\S+)$/i,              // Unit 5A
      /(Room\s*\S+)$/i,              // Room 305
      /(#\s*\S+)$/,                  // #204
      // With comma or space separation
      /[,\s]+(\d+[階FＦ号室号])$/,    // , 6階
      /[,\s]+((Apt|Suite|Unit|Room)\.?\s*\S+)$/i
    ];
    
    for (const pattern of patterns) {
      const match = fullAddress.match(pattern);
      if (match) {
        const unit = match[1].trim();
        const street = fullAddress.substring(0, match.index).trim();
        return { street, unit };
      }
    }
    
    return { street: fullAddress, unit: '' };
  }
  
  // Fill payment page (Ayobas Premium)
  fillPaymentPage(data) {
    // DO NOT FILL amount or receipt fields - user will enter manually
    // Skip these fields even if data is present
    
    // Email fields - leave empty for user to fill manually
    // User will enter their preferred email for payment receipt
    
    // Name fields - prioritize payment-specific fields, then fall back to atlas fields
    this.fillField('name_first', data.name_first || data.atlas_first_name || data.firstname);
    this.fillField('name_last', data.name_last || data.atlas_last_name || data.lastname);
    
    // Address fields - use payment-specific fields if available, otherwise atlas fields
    this.fillField('postal_code', data.postal_code || data.atlas_mailing_postal_code);
    this.fillField('region', data.region || data.atlas_mailing_state);
    this.fillField('city', data.city || data.atlas_mailing_city);
    
    // Handle street address with smart extraction
    let streetAddress = data.street || data.atlas_mailing_street;
    let apartmentUnit = data.street2 || '';
    
    // If street2 is empty but we have a street address, try to extract
    if (!apartmentUnit && streetAddress) {
      const extracted = this.extractAddressLine2(streetAddress);
      streetAddress = extracted.street;
      apartmentUnit = extracted.unit;
      if (extracted.unit) {
        console.log(`Extracted unit/floor "${extracted.unit}" from address`);
      }
    }
    
    this.fillField('street', streetAddress);
    this.fillField('street2', apartmentUnit);
    
    // Phone number - use payment-specific phone or fall back to atlas mobile/home
    const phone = data.phone || data.atlas_mobile_phone || data.atlas_home_phone;
    if (phone) {
      this.fillField('phone', phone);
    }
    
    // Check any required checkboxes (if they exist and are visible)
    const policyCheckbox = document.getElementById('ckb_policy');
    if (policyCheckbox && policyCheckbox.offsetParent !== null && data.accept_terms !== false) {
      policyCheckbox.checked = true;
      policyCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    const confirmCheckbox = document.getElementById('chbx_confirm');
    if (confirmCheckbox && confirmCheckbox.offsetParent !== null && data.confirm_details !== false) {
      confirmCheckbox.checked = true;
      confirmCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    this.showNotification('Payment form filled (except amount & receipt)');
  }

  // Fill passport delivery UID entry page (pds.ayobaspremium.jp root)
  fillUIDEntryPage(data) {
    if (!data || !data.mainApplicant) {
      this.showNotification('⚠️ No passport return data found');
      return;
    }

    const main = data.mainApplicant;
    if (!main.uid) {
      this.showNotification('⚠️ Main applicant UID missing');
      return;
    }

    // Fill UID field
    this.fillField('txt_ref_id', main.uid);

    console.log(`Filled UID entry page with UID: ${main.uid}`);
    this.showNotification('✓ UID filled - Click continue to proceed');
  }

  // Fill interview location selection page
  fillInterviewLocationPage(data) {
    if (!data || !data.mainApplicant) {
      this.showNotification('⚠️ No passport return data found');
      return;
    }

    const main = data.mainApplicant;
    if (!main.interview_location) {
      this.showNotification('⚠️ Interview location missing');
      return;
    }

    // Fill interview location dropdown
    this.fillField('sel_interview_loc', main.interview_location);

    console.log(`Filled interview location: ${main.interview_location}`);
    this.showNotification('✓ Interview location filled - Click continue to proceed');
  }

  // Fill passport delivery address page (pds.ayobaspremium.jp)
  fillDeliveryAddressPage(data) {
    if (!data || !data.mainApplicant) {
      this.showNotification('⚠️ No passport return data found');
      return;
    }

    const main = data.mainApplicant;
    if (!main.uid) {
      this.showNotification('⚠️ Main applicant UID missing');
      return;
    }

    const uid = main.uid;

    // Fill delivery address fields with UID suffix
    this.fillField(`postal_code_${uid}`, main.postal_code);
    this.fillField(`region_${uid}`, main.region);
    this.fillField(`city_${uid}`, main.city);
    this.fillField(`address_${uid}`, main.address);
    this.fillField(`phone_${uid}`, main.phone);
    this.fillField(`email_${uid}`, main.email);

    console.log(`Filled delivery address fields for UID: ${uid}`);
    this.showNotification('✓ Delivery address filled');
  }

  // Fill passport delivery modal (#dialog_shopping)
  fillPassportDeliveryModal(data) {
    if (!data || !data.applicants) {
      console.log('No passport return applicants data found');
      return;
    }

    // Check if modal is visible (Bootstrap modal check)
    const modal = document.querySelector('#dialog_shopping');
    const isVisible = modal && (
      modal.classList.contains('in') ||  // Bootstrap 3
      modal.classList.contains('show') || // Bootstrap 4+
      (modal.style.display && modal.style.display !== 'none')
    );

    if (!isVisible) {
      console.log('Passport delivery modal not visible yet');
      this.showNotification('⚠️ Please open the delivery modal first');
      return;
    }

    const applicants = data.applicants;
    if (applicants.length === 0) {
      this.showNotification('⚠️ No applicants to fill');
      return;
    }

    console.log(`Filling modal for ${applicants.length} applicant(s)`);

    // Fill main applicant (first 5 fields)
    this.fillApplicantFields(applicants[0], 0);

    // Fill dependents with delay for DOM updates
    for (let i = 1; i < applicants.length; i++) {
      setTimeout(() => {
        this.clickAddApplicantButton();
        setTimeout(() => {
          this.fillApplicantFields(applicants[i], i);
        }, 500); // Wait for new fields to appear
      }, i * 1000); // Stagger button clicks
    }

    this.showNotification(`✓ Filling ${applicants.length} applicant(s) in modal`);
  }

  // Fill applicant fields in modal by position
  fillApplicantFields(applicant, index) {
    const startIdx = index * 5;
    const inputs = Array.from(document.querySelectorAll('#dialog_shopping input[type="text"]:not([type="hidden"])')).filter(input => input.offsetParent !== null);

    if (inputs.length < startIdx + 5) {
      console.error(`Not enough input fields for applicant ${index + 1}`);
      return;
    }

    console.log(`Filling applicant ${index + 1}: ${applicant.first_name_romaji} ${applicant.last_name_romaji}`);

    // Fill in order: Passport, DS160, UID, Last name, First name
    inputs[startIdx + 0].value = applicant.passport_number || '';
    inputs[startIdx + 1].value = applicant.ds160_confirmation || '';
    inputs[startIdx + 2].value = applicant.uid || '';
    inputs[startIdx + 3].value = applicant.last_name_romaji || '';
    inputs[startIdx + 4].value = applicant.first_name_romaji || '';

    // Trigger events for each field
    for (let i = 0; i < 5; i++) {
      const input = inputs[startIdx + i];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }

  // Click "Add Additional Applicants" button
  clickAddApplicantButton() {
    // Find green "Add Additional Applicants" button
    const buttons = Array.from(document.querySelectorAll('button, .btn, .btn-success'));
    const addButton = buttons.find(btn =>
      btn.textContent && btn.textContent.includes('Add Additional Applicants')
    );

    if (addButton) {
      addButton.click();
      console.log('Clicked "Add Additional Applicants" button');
    } else {
      console.error('Add Additional Applicants button not found');
    }
  }

  // Fill contact information
  fillContactInfo(data) {
    // Note: signup email fields are different from contact email fields
    // Signup uses 'email', contact info uses 'atlas_email' or 'atlas_emailaddress1'
    this.fillField('phone', data.phone);
    this.fillField('mobile', data.mobile);
    this.fillField('work_phone', data.workPhone);
    
    // Emergency contact
    if (data.emergencyContact) {
      this.fillField('emergency_name', data.emergencyContact.name);
      this.fillField('emergency_phone', data.emergencyContact.phone);
      this.fillField('emergency_email', data.emergencyContact.email);
      this.fillField('emergency_relationship', data.emergencyContact.relationship);
    }
  }

  // Fill document delivery page (premium delivery option)
  fillDocumentDelivery(data) {
    console.log('Filling Document Delivery page');
    
    // Use main applicant's mailing address for delivery
    // Fill address fields
    this.fillField('DDAddress', data.DDAddress || data.atlas_mailing_street || data.street || '');
    this.fillField('DDAddress2', data.DDAddress2 || data.street2 || '');
    this.fillField('DDAddress3', data.DDAddress3 || '');
    this.fillField('DDCity', data.DDCity || data.atlas_mailing_city || data.city || '');
    this.fillField('DDState', data.DDState || data.atlas_mailing_state || data.region || '');
    this.fillField('DDPostalCode', data.DDPostalCode || data.atlas_mailing_postal_code || data.postal_code || '');
    
    // Handle country dropdown - use text matching like other country fields
    const countryValue = data.document_delivery_country || data.atlas_country || 'Japan';
    this.fillDropdownByText('document_delivery_country', countryValue);
    
    // Select premium delivery option if radio buttons exist
    const premiumRadio = document.querySelector('input[type="radio"][value="premium"]');
    if (premiumRadio) {
      premiumRadio.checked = true;
      premiumRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    console.log('Document Delivery fields filled');
  }


  // Generic field filling - works with atlas_ fields
  fillGenericFields(data) {
    // Check page type to exclude certain fields
    const pageType = this.detectPageType();
    const isSignupPage = pageType === 'signup';
    
    // Fields to skip - these are metadata, not form fields
    const skipFields = ['id', 'displayName'];
    
    Object.keys(data).forEach(key => {
      // Skip metadata fields
      if (skipFields.includes(key)) {
        console.log(`Skipping ${key} - metadata field, not a form field`);
        return;
      }
      
      // Skip signup email fields only - these are for account creation
      if (key === 'email' || key === 'reemail') {
        console.log(`Skipping ${key} - signup email field, user enters manually`);
        return;
      }
      
      // Skip password fields on signup page - user enters manually
      if (isSignupPage && (key === 'newPassword' || key === 'reenterPassword')) {
        console.log(`Skipping ${key} on signup page - user will enter manually`);
        return;
      }
      
      const value = data[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        // Special handling for language field - MUST map to native script
        if (key === 'adx_preferredlanguageid') {
          const mappedLanguage = this.getLanguageMapping(value);
          console.log(`Mapping language "${value}" to "${mappedLanguage}" for field ${key}`);
          this.fillDropdownByText(key, mappedLanguage);
        }
        // Check if it's a dropdown field (by looking for country_code or known dropdowns)
        else if (key.includes('country') || key.includes('nationality') || key.includes('country_code')) {
          this.fillDropdownByText(key, value);
        } else {
          this.fillField(key, value);
        }
      }
    });
  }

  // Detect website language from URL
  detectWebsiteLanguage() {
    const url = window.location.href;
    // Check for Japanese: /ja/, /ja-JP/, /ja-JA/, etc.
    if (url.includes('/ja/') || url.includes('/ja-')) return 'ja';
    // Check for English: /en-US/, /en-us/, /en/, etc.
    if (url.includes('/en-US/') || url.includes('/en-us/') || url.includes('/en/') || url.includes('/en-')) return 'en';
    // Fallback to document language attribute
    return document.documentElement.lang?.startsWith('ja') ? 'ja' : 'en';
  }

  // Convert ISO date to website-specific format
  formatDateForWebsite(isoDate, language) {
    if (!isoDate) return '';
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return isoDate; // Not ISO format, return as-is
    const [_, year, month, day] = match;
    return language === 'ja' ? `${year}/${month}/${day}` : `${month}/${day}/${year}`;
  }

  // Check if field is a date field
  isDateField(identifier) {
    return identifier.includes('date') ||
           identifier.includes('birthdate') ||
           identifier.includes('_datepicker_');
  }

  // Core filling functions
  fillField(identifier, value) {
    if (!value || this.filledFields.has(identifier)) return;
    
    console.log(`Trying to fill field: ${identifier} with value: ${value}`);
    
    // Try multiple ways to find the field
    let element = document.getElementById(identifier);
    if (!element) element = document.querySelector(`[name="${identifier}"]`);
    if (!element) element = document.querySelector(`[name*="${identifier}"]`);
    if (!element) element = document.querySelector(`[id*="${identifier}"]`);
    
    if (!element) {
      console.log(`Field not found: ${identifier}`);
      return;
    }
    
    if (element && element.offsetParent) {
      if (element.type === 'select-one') {
        this.fillDropdownByText(identifier, value);
      } else if (element.type === 'radio') {
        this.fillRadioByValue(identifier, value);
      } else if (element.type === 'checkbox') {
        element.checked = value === true || value === 'yes' || value === 'Y';
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Convert dates if needed
        let finalValue = value;
        if (this.isDateField(identifier) && typeof value === 'string') {
          const language = this.detectWebsiteLanguage();
          finalValue = this.formatDateForWebsite(value, language);
          console.log(`[Date Conversion] ${identifier}: ${value} → ${finalValue} (${language})`);
        }
        element.value = finalValue;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      this.filledFields.add(identifier);
      console.log(`Filled ${identifier} with ${value}`);
    }
  }

  // Fill dropdown by matching text (not value)
  fillDropdownByText(identifier, text) {
    if (!text || this.filledFields.has(identifier)) return;
    
    let element = document.getElementById(identifier);
    if (!element) element = document.querySelector(`[name="${identifier}"]`);
    if (!element) element = document.querySelector(`[name*="${identifier}"]`);
    if (!element) element = document.querySelector(`[id*="${identifier}"]`);
    
    if (element && element.tagName === 'SELECT') {
      // Find option by text match
      const options = Array.from(element.options);
      let matchedOption = null;
      
      // Try exact match first
      matchedOption = options.find(opt => 
        opt.text.trim().toLowerCase() === text.toLowerCase()
      );
      
      // Try contains match
      if (!matchedOption) {
        matchedOption = options.find(opt => 
          opt.text.toLowerCase().includes(text.toLowerCase())
        );
      }
      
      // Try partial match
      if (!matchedOption) {
        matchedOption = options.find(opt => 
          text.toLowerCase().includes(opt.text.toLowerCase()) ||
          opt.text.toLowerCase().includes(text.split(' ')[0].toLowerCase())
        );
      }
      
      if (matchedOption) {
        element.value = matchedOption.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        this.filledFields.add(identifier);
        console.log(`Filled dropdown ${identifier} with ${text} (value: ${matchedOption.value})`);
      } else {
        console.log(`Could not find option "${text}" in dropdown ${identifier}`);
      }
    }
  }

  // Fill radio button by value
  fillRadioByValue(name, value) {
    if (!value || this.filledFields.has(name)) return;
    
    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"], input[type="radio"][name*="${name}"]`);
    
    radios.forEach(radio => {
      if (radio.value === value || 
          radio.value.toLowerCase() === value.toLowerCase() ||
          (value === 'yes' && radio.value === 'Y') ||
          (value === 'no' && radio.value === 'N')) {
        radio.checked = true;
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        this.filledFields.add(name);
        console.log(`Selected radio ${name} with value ${value}`);
      }
    });
  }

  // Date helper functions
  extractDay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    return parts[2] || parts[0];
  }

  extractMonth(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    return parts[1];
  }

  extractYear(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    return parts[0].length === 4 ? parts[0] : parts[2];
  }

  // Create floating dependent selector UI
  createDependentSelector() {
    // Remove existing selector if present
    const existing = document.getElementById('visa-dependent-selector');
    if (existing) existing.remove();
    
    if (this.dependents.length === 0) {
      console.log('No dependents found in data');
      return;
    }
    
    // Create selector container
    const selector = document.createElement('div');
    selector.id = 'visa-dependent-selector';
    selector.innerHTML = `
      <div class="vds-header">
        <span class="vds-title">👥 Select Dependent to Fill</span>
        <button class="vds-minimize">_</button>
        <button class="vds-close">✕</button>
      </div>
      <div class="vds-body">
        <div class="vds-list">
          ${this.dependents.map(dep => `
            <div class="vds-item">
              <input type="radio" name="dependent" id="${dep.id}" value="${dep.id}">
              <label for="${dep.id}">${dep.displayName}</label>
            </div>
          `).join('')}
        </div>
        <button class="vds-fill-btn">Fill Selected Dependent</button>
      </div>
    `;
    
    // Add styles
    const styles = `
      #visa-dependent-selector {
        position: fixed;
        top: 100px;
        right: 20px;
        width: 300px;
        background: white;
        border: 2px solid #4CAF50;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        font-family: Arial, sans-serif;
      }
      .vds-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px;
        border-radius: 6px 6px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .vds-title {
        font-weight: bold;
        font-size: 14px;
      }
      .vds-minimize, .vds-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0 5px;
      }
      .vds-body {
        padding: 15px;
      }
      .vds-body.hidden {
        display: none;
      }
      .vds-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 15px;
      }
      .vds-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
      }
      .vds-item:hover {
        background: #f5f5f5;
      }
      .vds-item label {
        margin-left: 8px;
        cursor: pointer;
        font-size: 14px;
      }
      .vds-fill-btn {
        width: 100%;
        padding: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
      }
      .vds-fill-btn:hover {
        background: #45a049;
      }
      .vds-fill-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    `;
    
    // Add styles to page
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Add to page
    document.body.appendChild(selector);
    
    // Add event listeners
    selector.querySelector('.vds-close').addEventListener('click', () => {
      selector.remove();
      this.selectorVisible = false;
    });
    
    selector.querySelector('.vds-minimize').addEventListener('click', () => {
      const body = selector.querySelector('.vds-body');
      body.classList.toggle('hidden');
    });
    
    selector.querySelector('.vds-fill-btn').addEventListener('click', () => {
      this.fillSelectedDependent();
    });
    
    this.selectorVisible = true;
    console.log('Dependent selector created');
  }
  
  // Fill form with dependent data from popup
  fillDependentData(dependent) {
    if (!dependent) {
      console.error('No dependent data provided');
      return;
    }
    
    console.log('Filling form with dependent:', dependent.displayName || `${dependent.firstname} ${dependent.lastname}`);
    
    // Determine which page we're on and fill accordingly
    const url = window.location.href;
    const title = document.title;
    
    if (url.includes('daddcontact') || title.includes('Dependent Contact') || title.includes('Contact Information')) {
      this.fillDependentContactPage(dependent);
    } else if (url.includes('dep_applicant_add') || url.includes('dependent') || title.includes('Dependent Applicant') || title.includes('Dependent')) {
      this.fillDependentApplicantPage(dependent);
    } else {
      // Try to fill any matching fields generically
      console.log('Not on a specific dependent page, attempting generic fill');
      this.fillGenericDependentFields(dependent);
    }
  }
  
  // Generic fill for dependent fields
  fillGenericDependentFields(dependent) {
    // Try all possible field names
    const fieldMappings = {
      'firstname': dependent.firstname,
      'lastname': dependent.lastname,
      'atlas_first_name': dependent.atlas_first_name,
      'atlas_last_name': dependent.atlas_last_name,
      'atlas_emailaddress1': dependent.atlas_emailaddress1,
      'atlas_email': dependent.atlas_email,
      'atlas_relation_to_applicant': dependent.atlas_relation_to_applicant,
      'atlas_pob_country': dependent.atlas_pob_country,
      'atlas_birthdate_datepicker_description': dependent.atlas_birthdate_datepicker_description,
      'atlas_nationality': dependent.atlas_nationality,
      'atlas_passport_number': dependent.atlas_passport_number,
      'atlas_passport_issuance_date_datepicker_description': dependent.atlas_passport_issuance_date_datepicker_description,
      'atlas_passport_expiration_date_datepicker_description': dependent.atlas_passport_expiration_date_datepicker_description,
      'atlas_passport_place_of_issue': dependent.atlas_passport_place_of_issue,
      'atlas_home_phone_country_code': dependent.atlas_home_phone_country_code,
      'atlas_home_phone': dependent.atlas_home_phone,
      'atlas_mobile_phone_country_code': dependent.atlas_mobile_phone_country_code,
      'atlas_mobile_phone': dependent.atlas_mobile_phone,
      'atlas_mailing_street': dependent.atlas_mailing_street,
      'atlas_mailing_city': dependent.atlas_mailing_city,
      'atlas_mailing_state': dependent.atlas_mailing_state,
      'atlas_mailing_postal_code': dependent.atlas_mailing_postal_code,
      'atlas_national_id': dependent.atlas_national_id,
      'adx_preferredlanguageid': dependent.adx_preferredlanguageid
    };
    
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      if (value) {
        if (fieldName.includes('country') || fieldName.includes('nationality') || fieldName.includes('country_code') || fieldName.includes('preferredlanguageid') || fieldName.includes('relation')) {
          this.fillDropdownByText(fieldName, value);
        } else {
          this.fillField(fieldName, value);
        }
      }
    });
    
    this.showNotification('Form filled with dependent data!');
  }
  
  // Language mapping for preferred language dropdown
  // ⚠️ WARNING: DO NOT CHANGE THESE MAPPINGS! ⚠️
  // These MUST match EXACTLY what appears in the dropdown on the actual website
  // The dropdown shows language names in their NATIVE SCRIPTS (e.g., 日本語 not "Japanese")
  // Changing these will break the form filling functionality
  getLanguageMapping(language) {
    if (!language) return 'English';
    
    // Normalize the input - handle case variations (ENGLISH, English, english)
    const normalizedLanguage = language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
    
    // ⚠️ DO NOT MODIFY THE VALUES BELOW - They must match the dropdown text EXACTLY ⚠️
    const languageMap = {
      'Japanese': '日本語',  // The dropdown shows "日本語" 
      'English': 'English',
      'Chinese': '中文(中国)',
      'Chinese (Taiwan)': '中文(台灣)',
      'Korean': '한국어',
      'Spanish': 'español',
      'French': 'français',  // The dropdown shows "français"
      'German': 'Deutsch',  // The dropdown shows "Deutsch"
      'Russian': 'русский',  // The dropdown shows "русский"
      'Arabic': 'العربية',  // The dropdown shows "العربية"
      'Thai': 'ไทย',  // The dropdown shows "ไทย"
      'Vietnamese': 'Tiếng Việt',  // The dropdown shows "Tiếng Việt"
      'Turkish': 'Türkçe',  // The dropdown shows "Türkçe"
      'Portuguese': 'português',
      'Italian': 'italiano',
      'Hindi': 'हिंदी',
      'Indonesian': 'Bahasa Indonesia',  // The dropdown shows "Bahasa Indonesia"
      'Malay': 'Bahasa Melayu',  // The dropdown shows "Bahasa Melayu"
      'Filipino': 'Filipino',
      'Urdu': 'Urdu',
      'Tamil': 'Tamil',
      'Polish': 'polski',  // The dropdown shows "polski"
      'Swedish': 'Swedish',  // The dropdown shows "Swedish"
      'Norwegian': 'Norwegian Bokmål',  // The dropdown shows "Norwegian Bokmål"
      'Danish': 'Danish',  // The dropdown shows "Danish"
      'Finnish': 'Finnish'  // The dropdown shows "Finnish"
    };
    
    // Return mapped language or the normalized version if not in map
    return languageMap[normalizedLanguage] || normalizedLanguage;
  }
  
  // Fill the contact information page
  fillDependentContactPage(dependent) {
    console.log('Filling Dependent Contact page');
    console.log('Language field value:', dependent.adx_preferredlanguageid);
    
    this.fillField('firstname', dependent.firstname);
    this.fillField('lastname', dependent.lastname);
    this.fillField('atlas_emailaddress1', dependent.atlas_emailaddress1);
    
    // Map language to native script before filling
    const language = this.getLanguageMapping(dependent.adx_preferredlanguageid) || 'English';
    console.log('Mapped language:', language);
    this.fillDropdownByText('adx_preferredlanguageid', language);
    
    // Show success message
    this.showNotification('Contact information filled successfully!');
  }
  
  // Fill the dependent applicant page
  fillDependentApplicantPage(dependent) {
    console.log('Filling Dependent Applicant page');
    
    // Basic information
    this.fillDropdownByText('atlas_relation_to_applicant', dependent.atlas_relation_to_applicant);
    this.fillField('atlas_first_name', dependent.atlas_first_name);
    this.fillField('atlas_last_name', dependent.atlas_last_name);
    
    // Birth information
    this.fillDropdownByText('atlas_pob_country', dependent.atlas_pob_country);
    this.fillField('atlas_birthdate_datepicker_description', dependent.atlas_birthdate_datepicker_description);
    this.fillDropdownByText('atlas_nationality', dependent.atlas_nationality);
    
    // Passport information
    this.fillField('atlas_passport_number', dependent.atlas_passport_number);
    this.fillField('atlas_passport_issuance_date_datepicker_description', dependent.atlas_passport_issuance_date_datepicker_description);
    this.fillField('atlas_passport_expiration_date_datepicker_description', dependent.atlas_passport_expiration_date_datepicker_description);
    this.fillField('atlas_passport_place_of_issue', dependent.atlas_passport_place_of_issue);
    
    // Contact information
    this.fillDropdownByText('atlas_home_phone_country_code', dependent.atlas_home_phone_country_code);
    this.fillField('atlas_home_phone', dependent.atlas_home_phone);
    this.fillDropdownByText('atlas_mobile_phone_country_code', dependent.atlas_mobile_phone_country_code);
    this.fillField('atlas_mobile_phone', dependent.atlas_mobile_phone);
    this.fillField('atlas_email', dependent.atlas_email);
    
    // Address
    this.fillField('atlas_mailing_street', dependent.atlas_mailing_street);
    this.fillField('atlas_mailing_city', dependent.atlas_mailing_city);
    this.fillField('atlas_mailing_state', dependent.atlas_mailing_state);
    this.fillField('atlas_mailing_postal_code', dependent.atlas_mailing_postal_code);
    
    // National ID
    this.fillField('atlas_national_id', dependent.atlas_national_id);
    
    // Show success message
    this.showNotification('Dependent applicant information filled successfully!');
  }
  
  // Show notification
  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 15px 25px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 100000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Check and show visa options popup
  checkAndShowVisaOptionsPopup() {
    // Check if popup was already shown this session
    if (window.visaOptionsPopupShown) return;
    
    // Load visa data from storage
    chrome.storage.local.get(['visaData'], (result) => {
      if (result.visaData && result.visaData.applicant) {
        const data = result.visaData.applicant;
        
        // Check if we have visa options data
        if (data.atlas_visa_type || data.atlas_post || data.atlas_post_visa_category || 
            data.atlas_visa_class || data.atlas_petitioner_name || data.atlas_ds_160_confirmation_number) {
          this.showVisaOptionsPopup(data);
          window.visaOptionsPopupShown = true;
        }
      }
    });
  }

  // Show visa options helper popup
  showVisaOptionsPopup(data) {
    // Remove existing popup if any
    const existingPopup = document.getElementById('visa-options-helper-popup');
    if (existingPopup) existingPopup.remove();
    
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'visa-options-helper-popup';
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: white;
      border: 2px solid #003366;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #333;
      cursor: move;
    `;
    
    // Create popup content
    popup.innerHTML = `
      <div id="popup-header" style="background: #003366; color: white; padding: 12px 15px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; cursor: move;">
        <span style="font-weight: 600; font-size: 16px;">📋 Visa Options Information</span>
        <div>
          <button id="minimize-popup" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px;">−</button>
          <button id="close-popup" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px;">×</button>
        </div>
      </div>
      <div id="popup-content" style="padding: 15px;">
        <div style="background: #FFF3CD; padding: 10px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #FFC107;">
          <strong>ℹ️ Manual Selection Required</strong><br>
          <small>Please select the matching options from the dropdowns based on the information below.</small>
        </div>
        
        ${this.formatVisaOptionsContent(data)}
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px;">
          <button id="copy-all-btn" style="flex: 1; padding: 8px; background: #003366; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
            Copy All
          </button>
          <button id="refresh-data-btn" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
            Refresh Data
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Add event listeners
    document.getElementById('close-popup').addEventListener('click', () => {
      popup.remove();
    });
    
    document.getElementById('minimize-popup').addEventListener('click', () => {
      const content = document.getElementById('popup-content');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        popup.style.width = '400px';
      } else {
        content.style.display = 'none';
        popup.style.width = 'auto';
      }
    });
    
    document.getElementById('copy-all-btn').addEventListener('click', () => {
      const text = this.formatVisaOptionsForCopy(data);
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('Visa options copied to clipboard!');
      });
    });
    
    document.getElementById('refresh-data-btn').addEventListener('click', () => {
      chrome.storage.local.get(['visaData'], (result) => {
        if (result.visaData && result.visaData.applicant) {
          popup.remove();
          this.showVisaOptionsPopup(result.visaData.applicant);
        }
      });
    });
    
    // Make popup draggable
    this.makeDraggable(popup);
  }
  
  // Make element draggable
  makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById('popup-header');
    
    if (header) {
      header.onmousedown = dragMouseDown;
    } else {
      element.onmousedown = dragMouseDown;
    }
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // Format visa options content for display
  formatVisaOptionsContent(data) {
    const sections = [];
    
    // Visa type and embassy
    if (data.atlas_visa_type || data.atlas_post || data.atlas_first_name || data.atlas_last_name) {
      sections.push(`
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 600; color: #003366; margin-bottom: 5px;">Basic Information</div>
          ${data.atlas_first_name || data.atlas_last_name ? `<div style="padding: 3px 0;"><strong>Applicant:</strong> ${data.atlas_first_name || ''} ${data.atlas_last_name || ''}</div>` : ''}
          ${data.atlas_visa_type ? `<div style="padding: 3px 0;"><strong>Visa Type:</strong> ${data.atlas_visa_type}</div>` : ''}
          ${data.atlas_post ? `<div style="padding: 3px 0;"><strong>Embassy/Consulate:</strong> ${data.atlas_post}</div>` : ''}
        </div>
      `);
    }
    
    // Visa category and class
    if (data.atlas_post_visa_category || data.atlas_visa_class || data.atlas_visa_priority) {
      sections.push(`
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 600; color: #003366; margin-bottom: 5px;">Visa Classification</div>
          ${data.atlas_post_visa_category ? `<div style="padding: 3px 0;"><strong>Category:</strong> ${data.atlas_post_visa_category}</div>` : ''}
          ${data.atlas_visa_class ? `<div style="padding: 3px 0;"><strong>Class:</strong> ${data.atlas_visa_class}</div>` : ''}
          ${data.atlas_visa_priority ? `<div style="padding: 3px 0;"><strong>Priority:</strong> ${data.atlas_visa_priority}</div>` : ''}
        </div>
      `);
    }
    
    // Petition information (for work visas)
    if (data.atlas_petitioner_name || data.atlas_petition_receipt_number) {
      sections.push(`
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 600; color: #003366; margin-bottom: 5px;">Petition Information</div>
          ${data.atlas_petitioner_name ? `<div style="padding: 3px 0;"><strong>Petitioner:</strong> ${data.atlas_petitioner_name}</div>` : ''}
          ${data.atlas_petition_receipt_number ? `<div style="padding: 3px 0;"><strong>Receipt #:</strong> ${data.atlas_petition_receipt_number}</div>` : ''}
        </div>
      `);
    }
    
    // Additional information
    if (data.atlas_ds_160_confirmation_number || data.atlas_sevis_number || data.atlas_language_of_interview) {
      sections.push(`
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 600; color: #003366; margin-bottom: 5px;">Additional Information</div>
          ${data.atlas_ds_160_confirmation_number ? `<div style="padding: 3px 0;"><strong>DS-160 Confirmation:</strong> ${data.atlas_ds_160_confirmation_number}</div>` : ''}
          ${data.atlas_sevis_number ? `<div style="padding: 3px 0;"><strong>SEVIS Number:</strong> ${data.atlas_sevis_number}</div>` : ''}
          ${data.atlas_language_of_interview ? `<div style="padding: 3px 0;"><strong>Interview Language:</strong> ${data.atlas_language_of_interview}</div>` : ''}
        </div>
      `);
    }
    
    return sections.join('') || '<div style="color: #666;">No visa options data available</div>';
  }

  // Format visa options for copying
  formatVisaOptionsForCopy(data) {
    const lines = [];
    
    if (data.atlas_visa_type) lines.push(`Visa Type: ${data.atlas_visa_type}`);
    if (data.atlas_post) lines.push(`Embassy/Consulate: ${data.atlas_post}`);
    if (data.atlas_post_visa_category) lines.push(`Category: ${data.atlas_post_visa_category}`);
    if (data.atlas_visa_class) lines.push(`Class: ${data.atlas_visa_class}`);
    if (data.atlas_visa_priority) lines.push(`Priority: ${data.atlas_visa_priority}`);
    if (data.atlas_petitioner_name) lines.push(`Petitioner: ${data.atlas_petitioner_name}`);
    if (data.atlas_petition_receipt_number) lines.push(`Receipt Number: ${data.atlas_petition_receipt_number}`);
    if (data.atlas_ds_160_confirmation_number) lines.push(`DS-160 Confirmation: ${data.atlas_ds_160_confirmation_number}`);
    if (data.atlas_sevis_number) lines.push(`SEVIS Number: ${data.atlas_sevis_number}`);
    if (data.atlas_language_of_interview) lines.push(`Interview Language: ${data.atlas_language_of_interview}`);
    
    return lines.join('\n');
  }
}

// Initialize the filler
const visaFiller = new VisaSchedulingFiller();

// Add indicator that extension is active
const indicator = document.createElement('div');
indicator.innerHTML = '✓ Visa Filler v1.1.2 Active';
indicator.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #4CAF50;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  font-size: 14px;
  z-index: 10000;
  opacity: 0.9;
`;
document.body.appendChild(indicator);

// Hide indicator after 3 seconds
setTimeout(() => {
  indicator.style.display = 'none';
}, 3000);