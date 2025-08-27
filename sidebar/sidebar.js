// TomitaLaw AI Extension - Sidebar Controller
import { MODULES, getActiveModules } from '../modules.config.js';

// Current active module
let currentModule = null;

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  setupEventListeners();
  loadFirstModule();
});

// Initialize tab navigation
function initializeTabs() {
  const tabNav = document.querySelector('.tab-navigation');
  const activeModules = getActiveModules();
  
  activeModules.forEach((module, index) => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.moduleId = module.id;
    tabButton.innerHTML = `
      <span class="tab-icon">${module.icon}</span>
      <span class="tab-label">${module.name}</span>
    `;
    
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
    
    // Setup module-specific event handlers
    setupModuleHandlers(module);
    
    // Load saved data if exists
    loadSavedData(module);
  } else {
    contentArea.innerHTML = `<p>Module template not found for ${module.name}</p>`;
  }
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
    // Add more cases as modules are added
  }
}

// DS-160 specific handlers
function setupDS160Handlers() {
  const fillBtn = document.getElementById('ds160-fill');
  const clearBtn = document.getElementById('ds160-clear');
  const dataInput = document.getElementById('ds160-data');
  
  if (fillBtn) {
    fillBtn.addEventListener('click', async () => {
      const data = dataInput.value.trim();
      if (!data) {
        showStatus('Please paste your DS-160 data first', 'error');
        return;
      }
      
      try {
        const jsonData = JSON.parse(data);
        await fillForm('ds160', jsonData);
        showStatus('DS-160 form filling initiated', 'success');
      } catch (e) {
        showStatus('Invalid JSON format. Please check your data.', 'error');
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      dataInput.value = '';
      chrome.storage.local.remove(['ds160Data']);
      showStatus('Data cleared', 'info');
    });
  }
  
  // Auto-save data on input
  if (dataInput) {
    dataInput.addEventListener('input', debounce(() => {
      const data = dataInput.value.trim();
      if (data) {
        try {
          JSON.parse(data);
          chrome.storage.local.set({ ds160Data: data });
        } catch (e) {
          // Invalid JSON, don't save
        }
      }
    }, 1000));
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
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusEl.classList.remove('show');
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