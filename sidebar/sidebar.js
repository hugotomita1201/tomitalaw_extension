// TomitaLaw AI Extension - Sidebar Controller
import { MODULES, getActiveModules } from '../modules.config.js';
// Icons are loaded globally from icons.js

// Current active module
let currentModule = null;

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sidebar initializing...');
  try {
    initializeTabs();
    setupEventListeners();
    loadFirstModule();
  } catch (error) {
    console.error('Error initializing sidebar:', error);
    // Fallback to show something if initialization fails
    document.querySelector('.tab-content').innerHTML = '<div class="card"><div class="card-content"><p>Error loading extension. Please reload.</p></div></div>';
  }
});

// Initialize tab navigation
function initializeTabs() {
  const tabNav = document.querySelector('.tab-navigation');
  const activeModules = getActiveModules();
  
  // Map module IDs to icon names
  const moduleIcons = {
    'ds160': 'fileText',
    'visa': 'calendar',
    'postal': 'mapPin',
    'photo': 'camera',
    'text-extractor': 'fileSearch'
  };
  
  activeModules.forEach((module, index) => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.moduleId = module.id;
    
    // Create icon element
    const iconSpan = document.createElement('span');
    iconSpan.className = 'tab-icon';
    const iconName = moduleIcons[module.id] || 'file';
    // Check if Icons is available, fallback to empty if not
    if (typeof Icons !== 'undefined' && Icons[iconName]) {
      iconSpan.innerHTML = Icons[iconName];
    } else {
      iconSpan.innerHTML = ''; // Empty icon if Icons not loaded
    }
    
    // Create label element
    const labelSpan = document.createElement('span');
    labelSpan.className = 'tab-label';
    labelSpan.textContent = module.name;
    
    tabButton.appendChild(iconSpan);
    tabButton.appendChild(labelSpan);
    
    tabButton.addEventListener('click', () => switchToModule(module.id));
    tabNav.appendChild(tabButton);
  });
}

// Switch to a specific module
function switchToModule(moduleId) {
  const module = MODULES.find(m => m.id === moduleId);
  if (!module || !module.active) return;
  
  currentModule = module;
  
  // Update active tab
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.moduleId === moduleId);
  });
  
  // Load module content
  loadModuleContent(module);
}

// Load module-specific content
function loadModuleContent(module) {
  const contentArea = document.querySelector('.tab-content');
  const template = document.getElementById(`${module.id}-template`);
  
  if (template) {
    // Clear current content
    contentArea.innerHTML = '';
    
    // Clone and insert template content
    const content = template.content.cloneNode(true);
    contentArea.appendChild(content);
    
    // Add icons to the module content
    injectModuleIcons(module);
    
    // Setup module-specific event handlers
    setupModuleHandlers(module);
    
    // Load saved data if exists
    loadSavedData(module);
  } else {
    contentArea.innerHTML = `<p>Module template not found for ${module.name}</p>`;
  }
}

// Inject icons into module content
function injectModuleIcons(module) {
  // Map of element IDs to icon names
  const iconMappings = {
    // DS-160 icons
    'ds160-icon': 'fileText',
    'ds160-load-icon': 'upload',
    'ds160-data-icon': 'file',
    'ds160-fill-icon': 'rocket',
    
    // Text Extractor icons
    'text-extractor-icon': 'fileSearch',
    'text-extractor-upload-icon': 'upload',
    'text-extractor-process-icon': 'loader',
    'text-extractor-export-icon': 'download',
    
    // Add more mappings as needed
  };
  
  // Inject icons
  Object.entries(iconMappings).forEach(([elementId, iconName]) => {
    const element = document.getElementById(elementId);
    if (element && Icons[iconName]) {
      element.innerHTML = Icons[iconName];
    }
  });
}

// Setup event handlers for the current module
function setupModuleHandlers(module) {
  switch (module.id) {
    case 'ds160':
      setupDS160Handlers();
      break;
    case 'visa':
      setupVisaHandlers();
      break;
    case 'postal':
      setupPostalHandlers();
      break;
    case 'photo':
      setupPhotoHandlers();
      break;
    case 'text-extractor':
      setupTextExtractorHandlers();
      break;
    // Add more cases as modules are added
  }
}

// DS-160 specific handlers
function setupDS160Handlers() {
  let currentData = null;
  
  const loadBtn = document.getElementById('ds160-load');
  const clearInputBtn = document.getElementById('ds160-clear-input');
  const fillBtn = document.getElementById('ds160-fill');
  const editBtn = document.getElementById('ds160-edit');
  const dataInput = document.getElementById('ds160-data');
  const dataInputSection = document.getElementById('ds160DataInputSection');
  const dataSection = document.getElementById('ds160DataSection');
  const dataPreview = document.getElementById('ds160DataPreview');
  
  // Helper function to display extracted data
  function displayData(data) {
    if (!data) return;
    
    const preview = [];
    
    if (data.personal) {
      preview.push('=== PERSONAL ===' );
      preview.push(`Name: ${data.personal.givenName || ''} ${data.personal.surname || ''}`.trim());
      if (data.personal.dateOfBirth) {
        preview.push(`DOB: ${data.personal.dateOfBirth}`);
      }
      if (data.personal.nationality) {
        preview.push(`Nationality: ${data.personal.nationality}`);
      }
    }
    
    if (data.passport) {
      preview.push('');
      preview.push('=== PASSPORT ===' );
      if (data.passport.passportNumber) {
        preview.push(`Passport #: ${data.passport.passportNumber}`);
      }
      if (data.passport.issuingCountry) {
        preview.push(`Issuing Country: ${data.passport.issuingCountry}`);
      }
    }
    
    if (data.travel) {
      preview.push('');
      preview.push('=== TRAVEL ===' );
      if (data.travel.purposeOfTrip) {
        preview.push(`Purpose: ${data.travel.purposeOfTrip}`);
      }
      if (data.travel.arrivalDate) {
        preview.push(`Arrival: ${data.travel.arrivalDate}`);
      }
    }
    
    if (data.contact) {
      preview.push('');
      preview.push('=== CONTACT ===' );
      if (data.contact.email) {
        preview.push(`Email: ${data.contact.email}`);
      }
      if (data.contact.phone) {
        preview.push(`Phone: ${data.contact.phone}`);
      }
    }
    
    dataPreview.textContent = preview.join('\n') || 'Data loaded (no preview available)';
    dataSection.style.display = 'block';
    dataInputSection.style.display = 'none';
  }
  
  // Load saved data on module load
  chrome.storage.local.get(['ds160Data', 'lastDS160Data'], (result) => {
    if (result.lastDS160Data) {
      // Auto-load last used data
      dataInput.value = result.lastDS160Data;
      // Trigger load automatically
      if (loadBtn) {
        loadBtn.click();
      }
    } else if (result.ds160Data) {
      // Load any saved data
      dataInput.value = typeof result.ds160Data === 'string' 
        ? result.ds160Data 
        : JSON.stringify(result.ds160Data, null, 2);
    }
  });
  
  // Load Data button
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const pastedData = dataInput.value.trim();
      
      if (!pastedData) {
        showStatus('Please paste the extracted data from the web app', 'error');
        return;
      }
      
      try {
        // Parse the JSON data
        currentData = JSON.parse(pastedData);
        displayData(currentData);
        showStatus('Data loaded successfully!', 'success');
        
        // Save the data for next time
        chrome.storage.local.set({ 
          ds160Data: currentData,
          lastDS160Data: pastedData 
        });
        
      } catch (error) {
        console.error('Error parsing data:', error);
        showStatus('Error: Invalid JSON data. Please copy the complete data from the web app.', 'error');
      }
    });
  }
  
  // Clear input button
  if (clearInputBtn) {
    clearInputBtn.addEventListener('click', () => {
      dataInput.value = '';
      currentData = null;
      chrome.storage.local.remove(['ds160Data', 'lastDS160Data']);
      showStatus('Data cleared', 'info');
    });
  }
  
  // Auto-Fill DS-160 Form button
  if (fillBtn) {
    fillBtn.addEventListener('click', async () => {
      if (!currentData) {
        showStatus('No data loaded', 'error');
        return;
      }
      
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url || !tab.url.includes('ceac.state.gov')) {
          showStatus('Please navigate to the DS-160 form first', 'error');
          return;
        }
        
        // Store data in chrome storage
        await chrome.storage.local.set({ ds160Data: currentData });
        
        // Try to inject content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/modules/ds160-content.js']
          });
          console.log('DS-160 content script injected');
        } catch (e) {
          console.log('DS-160 content script might already be injected:', e);
        }
        
        showStatus('Auto-filling form...', 'info');
        
        // Send message to content script
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'fillForm', 
            module: 'ds160',
            data: currentData 
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              showStatus('Error: Could not communicate with the page. Try refreshing.', 'error');
            } else if (response && response.success) {
              showStatus('Form filled successfully!', 'success');
              // Don't close sidebar - let user continue working
            } else {
              showStatus('Form filling completed. Check the page.', 'info');
              // Don't close sidebar - let user continue working
            }
          });
        }, 100);
        
      } catch (error) {
        console.error('Error filling form:', error);
        showStatus('Error: ' + error.message, 'error');
      }
    });
  }
  
  // Edit Data button - go back to input
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      dataSection.style.display = 'none';
      dataInputSection.style.display = 'block';
      showStatus('Edit your data and click Load Data again', 'info');
    });
  }
}

// Visa Scheduling specific handlers
function setupVisaHandlers() {
  let currentData = null;
  
  const loadBtn = document.getElementById('visa-load');
  const clearBtn = document.getElementById('visa-clear');
  const dataInput = document.getElementById('visa-data');
  const fillSelectedBtn = document.getElementById('fillSelectedPersonBtn');
  const editDataBtn = document.getElementById('editDataBtn');
  
  // Load saved data on module load
  chrome.storage.local.get(['visaData'], (result) => {
    if (result.visaData) {
      currentData = result.visaData;
      dataInput.value = typeof result.visaData === 'string' 
        ? result.visaData 
        : JSON.stringify(result.visaData, null, 2);
      updateFieldCount();
      updatePersonSelector();
      
      if (hasPersonData()) {
        showPersonSelector();
        showStatus('Ready to fill form', 'success');
      }
    }
  });
  
  // Load Data button
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const input = dataInput.value.trim();
      
      if (!input) {
        showStatus('Please paste your data first', 'error');
        return;
      }
      
      try {
        currentData = JSON.parse(input);
        
        // Save to storage
        chrome.storage.local.set({ visaData: currentData }, () => {
          showStatus('Data loaded and saved successfully!', 'success');
          updateFieldCount();
          updatePersonSelector();
          
          // Show person selector if data has person info
          if (hasPersonData()) {
            showPersonSelector();
          }
        });
      } catch (e) {
        showStatus('Invalid JSON format. Please check your data.', 'error');
        console.error('JSON parse error:', e);
      }
    });
  }
  
  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      dataInput.value = '';
      currentData = null;
      
      chrome.storage.local.remove(['visaData', 'selectedPersonId']);
      showStatus('Data cleared', 'info');
      updateFieldCount();
      hidePersonSelector();
    });
  }
  
  // Fill Selected Person button
  if (fillSelectedBtn) {
    fillSelectedBtn.addEventListener('click', async () => {
      const selectedRadio = document.querySelector('input[name="personRadio"]:checked');
      
      if (!selectedRadio) {
        showStatus('Please select a person first', 'error');
        return;
      }
      
      const personId = selectedRadio.value;
      let personData = null;
      
      if (personId === 'main_applicant') {
        // Get main applicant data
        personData = currentData.applicant || currentData;
      } else {
        // Get dependent data
        if (currentData.dependents) {
          personData = currentData.dependents.find(d => d.id === personId);
        }
      }
      
      if (!personData) {
        showStatus('Person data not found', 'error');
        return;
      }
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on the right domain
      const module = MODULES.find(m => m.id === 'visa');
      const isCorrectDomain = module.domains.some(domain => {
        const pattern = domain.replace(/\*/g, '.*');
        return new RegExp(pattern).test(tab.url);
      });
      
      if (!isCorrectDomain) {
        showStatus('Please navigate to the US Visa Scheduling site first', 'error');
        return;
      }
      
      // Show loading
      document.getElementById('loadingSpinner').style.display = 'block';
      fillSelectedBtn.disabled = true;
      
      // Send message to content script with just the person data
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        module: 'visa',
        data: personData  // Send only the selected person's data
      }, (response) => {
        // Hide loading
        document.getElementById('loadingSpinner').style.display = 'none';
        fillSelectedBtn.disabled = false;
        
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError);
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else {
          const personName = personId === 'main_applicant' ? 'Main Applicant' : 
                            (personData.displayName || `${personData.firstname || ''} ${personData.lastname || ''}`);
          showStatus(`Filled form with ${personName}`, 'success');
        }
      });
    });
  }
  
  // Edit Data button - go back to data input
  if (editDataBtn) {
    editDataBtn.addEventListener('click', () => {
      hidePersonSelector();
      showStatus('Edit your data and click Load Data again', 'info');
    });
  }
  
  // Helper functions specific to visa module
  function hasPersonData() {
    return currentData && (currentData.applicant || currentData.dependents || 
           currentData.atlas_first_name || currentData.firstName);
  }
  
  function showPersonSelector() {
    document.getElementById('personSelectionArea').style.display = 'block';
    document.getElementById('dataInputArea').style.display = 'none';
    updatePersonSelector();
  }
  
  function hidePersonSelector() {
    document.getElementById('personSelectionArea').style.display = 'none';
    document.getElementById('dataInputArea').style.display = 'block';
  }
  
  function updateFieldCount() {
    const countDiv = document.getElementById('fieldCount');
    if (!countDiv) return;
    
    if (currentData) {
      let personCount = 0;
      let fieldCount = 0;
      
      // Count main applicant
      if (currentData.applicant || currentData.atlas_first_name || currentData.firstName) {
        personCount = 1;
        const applicantData = currentData.applicant || currentData;
        fieldCount = countFields(applicantData);
      }
      
      // Count dependents
      if (currentData.dependents && Array.isArray(currentData.dependents)) {
        personCount += currentData.dependents.length;
      }
      
      if (personCount > 1) {
        countDiv.textContent = `${personCount} people loaded • ${fieldCount} fields ready`;
      } else if (personCount === 1) {
        countDiv.textContent = `${fieldCount} fields ready to fill`;
      } else {
        countDiv.textContent = 'Data contains ' + Object.keys(currentData).length + ' fields';
      }
    } else {
      countDiv.textContent = '';
    }
  }
  
  function countFields(obj) {
    let count = 0;
    for (let key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== '') {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          count += countFields(obj[key]);
        } else if (!Array.isArray(obj[key])) {
          count++;
        }
      }
    }
    return count;
  }
  
  function updatePersonSelector() {
    const radioList = document.getElementById('personRadioList');
    if (!radioList || !currentData) return;
    
    radioList.innerHTML = '';
    
    // Add main applicant if exists
    if (currentData.applicant || currentData.atlas_first_name || currentData.firstName) {
      const applicantData = currentData.applicant || currentData;
      const radioItem = createPersonRadioItem('main_applicant', 'Main Applicant', applicantData);
      radioList.appendChild(radioItem);
    }
    
    // Add dependents
    if (currentData.dependents && Array.isArray(currentData.dependents)) {
      currentData.dependents.forEach((dep, index) => {
        const name = dep.displayName || `${dep.firstname || dep.atlas_first_name || ''} ${dep.lastname || dep.atlas_last_name || ''}`.trim() || `Dependent ${index + 1}`;
        const radioItem = createPersonRadioItem(dep.id || `dep_${index}`, name, dep);
        radioList.appendChild(radioItem);
      });
    }
    
    // Enable fill button if there's at least one person
    const fillBtn = document.getElementById('fillSelectedPersonBtn');
    if (fillBtn) {
      fillBtn.disabled = radioList.children.length === 0;
    }
  }
  
  function createPersonRadioItem(id, name, data) {
    const div = document.createElement('div');
    div.className = 'person-radio-item';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'personRadio';
    radio.value = id;
    radio.id = `person_${id}`;
    
    const label = document.createElement('label');
    label.htmlFor = `person_${id}`;
    label.style.cursor = 'pointer';
    label.style.flex = '1';
    
    const personInfo = document.createElement('div');
    personInfo.className = 'person-info';
    
    const personName = document.createElement('div');
    personName.className = 'person-name';
    personName.textContent = name;
    
    const personDetails = document.createElement('div');
    personDetails.className = 'person-details';
    
    // Add some key details
    const details = [];
    if (data.atlas_relation_to_applicant) details.push(data.atlas_relation_to_applicant);
    if (data.atlas_email || data.email) details.push(data.atlas_email || data.email);
    if (data.atlas_passport_number || data.passport_number) details.push(`Passport: ${data.atlas_passport_number || data.passport_number}`);
    
    personDetails.textContent = details.join(' • ');
    
    personInfo.appendChild(personName);
    if (details.length > 0) {
      personInfo.appendChild(personDetails);
    }
    
    label.appendChild(personInfo);
    
    div.appendChild(radio);
    div.appendChild(label);
    
    // Add click handler to select radio
    div.addEventListener('click', (e) => {
      if (e.target.type !== 'radio') {
        radio.checked = true;
      }
      // Update selected styling
      document.querySelectorAll('.person-radio-item').forEach(item => {
        item.classList.remove('selected');
      });
      div.classList.add('selected');
    });
    
    return div;
  }
}

// Postal Code specific handlers
async function setupPostalHandlers() {
  const { PostalCodeService } = await import('./modules/postal/postal-service.js');
  const postalService = new PostalCodeService();
  
  const lookupBtn = document.getElementById('postal-lookup');
  const postalInput = document.getElementById('postal-code-input');
  const resultsDiv = document.getElementById('postal-results');
  const errorDiv = document.getElementById('postal-error');
  
  // Lookup button handler
  if (lookupBtn) {
    lookupBtn.addEventListener('click', async () => {
      const postalCode = postalInput.value.trim();
      
      if (!postalCode) {
        showPostalError('Please enter a postal code');
        return;
      }
      
      // Show loading state
      lookupBtn.disabled = true;
      lookupBtn.textContent = 'Looking up...';
      hidePostalError();
      hidePostalResults();
      
      try {
        const result = await postalService.lookup(postalCode);
        
        if (result.success) {
          displayPostalResults(result.data);
          showStatus('Address found successfully', 'success');
        } else {
          showPostalError(result.error);
        }
      } catch (error) {
        showPostalError('An unexpected error occurred. Please try again.');
        console.error('Postal lookup error:', error);
      } finally {
        lookupBtn.disabled = false;
        lookupBtn.textContent = 'Lookup';
      }
    });
  }
  
  // Enter key handler for input
  if (postalInput) {
    postalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        lookupBtn.click();
      }
    });
  }
  
  // Copy button handlers
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
      const fieldId = e.target.dataset.copy;
      const fieldElement = document.getElementById(fieldId);
      
      if (fieldElement && fieldElement.textContent) {
        copyToClipboard(fieldElement.textContent);
        
        // Show copied feedback
        const originalText = e.target.textContent;
        e.target.textContent = '✓';
        e.target.style.color = '#4CAF50';
        
        setTimeout(() => {
          e.target.textContent = originalText;
          e.target.style.color = '';
        }, 1500);
      }
    }
  });
  
  // Helper function to display results
  function displayPostalResults(data) {
    document.getElementById('full-address').textContent = data.fullAddress;
    document.getElementById('prefecture').textContent = data.prefecture;
    document.getElementById('city').textContent = data.city;
    document.getElementById('street').textContent = data.street;
    document.getElementById('formatted-postal').textContent = data.postalCode;
    document.getElementById('address-line1').textContent = data.addressLine1;
    document.getElementById('address-line2').textContent = data.addressLine2;
    
    resultsDiv.classList.remove('hidden');
  }
  
  // Helper function to hide results
  function hidePostalResults() {
    resultsDiv.classList.add('hidden');
  }
  
  // Helper function to show error
  function showPostalError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }
  
  // Helper function to hide error
  function hidePostalError() {
    errorDiv.classList.add('hidden');
  }
  
  // Copy to clipboard function
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showStatus('Copied to clipboard!', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showStatus('Copied to clipboard!', 'success');
    }
  }
}

// Photo Checker specific handlers
async function setupPhotoHandlers() {
  const { PhotoValidationService } = await import('./modules/photo/photo-service.js');
  const service = new PhotoValidationService();
  let currentFile = null;

  // Get DOM elements
  const uploadArea = document.getElementById('photo-upload-area');
  const fileInput = document.getElementById('photo-input');
  const validateBtn = document.getElementById('photo-validate');
  const clearBtn = document.getElementById('photo-clear');
  const previewDiv = document.getElementById('photo-preview');
  const previewImg = document.getElementById('preview-image');
  const metadataDisplay = document.getElementById('metadata-display');
  const loadingDiv = document.getElementById('validation-loading');
  const resultsDiv = document.getElementById('validation-results');

  // File upload handlers
  if (uploadArea) {
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        await handleFileSelect(file);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        await handleFileSelect(e.target.files[0]);
      }
    });
  }

  async function handleFileSelect(file) {
    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg)/)) {
      showStatus('Please select a JPEG image', 'error');
      return;
    }

    // Warn if file too large
    if (file.size > 240 * 1024) {
      showStatus('Warning: File exceeds 240KB limit', 'warning');
    }

    currentFile = file;
    
    // Display preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Extract and display metadata
    try {
      const metadata = await service.extractMetadata(file);
      metadataDisplay.innerHTML = `
        <small>
          Size: ${metadata.fileSizeKB} KB | 
          Dimensions: ${metadata.dimensions.width}×${metadata.dimensions.height}px | 
          Ratio: ${metadata.dimensions.ratio}
        </small>
      `;
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }
    
    validateBtn.disabled = false;
  }

  // Validate button handler
  if (validateBtn) {
    validateBtn.addEventListener('click', async () => {
      if (!currentFile) return;
      
      // Show loading
      loadingDiv.style.display = 'block';
      resultsDiv.style.display = 'none';
      validateBtn.disabled = true;
      
      try {
        const results = await service.validatePhoto(currentFile);
        displayResults(results);
        showStatus('Photo validation completed', 'success');
      } catch (error) {
        console.error('Validation error:', error);
        if (error.message.includes('API key not configured')) {
          showStatus('API key not configured. Please contact support.', 'error');
        } else {
          showStatus(`Validation error: ${error.message}`, 'error');
        }
      } finally {
        loadingDiv.style.display = 'none';
        validateBtn.disabled = false;
      }
    });
  }

  function displayResults(results) {
    const colors = {
      'PASS': '#28a745',
      'FAIL': '#dc3545', 
      'WARNING': '#ffc107'
    };
    
    const icon = {
      'PASS': '✅',
      'FAIL': '❌',
      'WARNING': '⚠️'
    };
    
    let html = `
      <div class="result-header" style="background: ${colors[results.overall_result]}20; 
           border-left: 4px solid ${colors[results.overall_result]}; padding: 10px; margin-bottom: 15px;">
        <h3 style="color: ${colors[results.overall_result]}; margin: 0;">
          ${icon[results.overall_result]} ${results.overall_result}
        </h3>
        ${results.confidence_score ? `<small>Confidence: ${(results.confidence_score * 100).toFixed(0)}%</small>` : ''}
      </div>
    `;
    
    // Add check sections
    if (results.technical_checks) {
      html += renderCheckSection('⚙️ Technical Requirements', results.technical_checks, colors, icon);
    }
    if (results.composition_checks) {
      html += renderCheckSection('📐 Composition', results.composition_checks, colors, icon);
    }
    if (results.quality_checks) {
      html += renderCheckSection('✨ Quality', results.quality_checks, colors, icon);
    }
    
    // Add recommendations if any
    if (results.recommendations && results.recommendations.length > 0) {
      html += `
        <div class="recommendations" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <h4 style="margin: 0 0 10px 0;">📋 Recommendations:</h4>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${results.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
  }

  function renderCheckSection(title, checks, colors, icons) {
    let html = `<div class="check-section" style="margin: 15px 0;">
      <h4 style="margin: 10px 0 5px 0;">${title}</h4>`;
    
    for (const [key, value] of Object.entries(checks)) {
      const color = colors[value.status] || '#666';
      const icon = icons[value.status] || '•';
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `
        <div class="check-item" style="padding: 5px 0; margin-left: 10px;">
          <span style="color: ${color}; margin-right: 8px;">${icon}</span>
          <span>${value.detail || label}</span>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  // Clear button handler
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentFile = null;
      previewDiv.style.display = 'none';
      resultsDiv.style.display = 'none';
      validateBtn.disabled = true;
      fileInput.value = '';
      metadataDisplay.innerHTML = '';
    });
  }
}

// Text Extractor specific handlers
function setupTextExtractorHandlers() {
  try {
    // Initialize the Text Extractor UI directly
    // The scripts are now loaded in sidebar.html
    if (typeof TextExtractorUI !== 'undefined') {
      const textExtractorUI = new TextExtractorUI();
      textExtractorUI.init();
      console.log('[TextExtractor] Module initialized');
    } else {
      console.error('[TextExtractor] TextExtractorUI class not found');
      showStatus('Failed to load Text Extractor module', 'error');
    }
  } catch (error) {
    console.error('[TextExtractor] Failed to initialize module:', error);
    showStatus('Failed to load Text Extractor module', 'error');
  }
}

// Fill form by sending message to content script
async function fillForm(moduleId, data) {
  try {
    // Store data
    const storageKey = moduleId === 'ds160' ? 'ds160Data' : 'visaData';
    await chrome.storage.local.set({ [storageKey]: data });
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on the right domain
    const module = MODULES.find(m => m.id === moduleId);
    const isCorrectDomain = module.domains.some(domain => {
      const pattern = domain.replace(/\*/g, '.*');
      return new RegExp(pattern).test(tab.url);
    });
    
    if (!isCorrectDomain) {
      showStatus(`Please navigate to the correct website first`, 'error');
      return;
    }
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillForm',
      module: moduleId,
      data: data
    });
    
  } catch (error) {
    console.error('Error filling form:', error);
    showStatus('Error filling form. Please try again.', 'error');
  }
}

// Load saved data for module
async function loadSavedData(module) {
  const storageKey = module.dataKey || `${module.id}Data`;
  
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      const dataInput = document.getElementById(`${module.id}-data`);
      if (dataInput) {
        if (typeof result[storageKey] === 'string') {
          dataInput.value = result[storageKey];
        } else {
          dataInput.value = JSON.stringify(result[storageKey], null, 2);
        }
      }
    }
  });
}

// Load the first module by default
function loadFirstModule() {
  const activeModules = getActiveModules();
  if (activeModules.length > 0) {
    switchToModule(activeModules[0].id);
  }
}

// Setup global event listeners
function setupEventListeners() {
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillComplete') {
      showStatus(`${request.module} form filled successfully`, 'success');
    } else if (request.action === 'fillError') {
      showStatus(`Error: ${request.error}`, 'error');
    }
  });
}

// Show status message
function showStatus(message, type = 'info') {
  const statusBar = document.querySelector('.status-bar');
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message alert-${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusMessage.textContent = '';
    }, 5000);
  }
}


// Utility: Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Sample visa data for testing
function getSampleVisaData() {
  return {
    email: "test@example.com",
    password: "TestPassword123",
    security_question: "What is your pet's name?",
    security_answer: "Fluffy",
    first_name: "John",
    last_name: "Doe",
    middle_name: "Robert",
    gender: "Male",
    date_of_birth: "1990-01-15",
    marital_status: "Single",
    nationality: "Japan",
    passport_number: "AB123456",
    passport_expiry: "2030-12-31",
    street_address: "123 Main St",
    city: "Tokyo",
    state: "Tokyo",
    postal_code: "100-0001",
    country: "Japan",
    phone_country_code: "+81",
    phone_number: "90-1234-5678",
    primary_email: "john.doe@example.com"
  };
}