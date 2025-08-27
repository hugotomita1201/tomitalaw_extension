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
  const fillBtn = document.getElementById('visa-fill');
  const testBtn = document.getElementById('visa-test');
  const clearBtn = document.getElementById('visa-clear');
  const dataInput = document.getElementById('visa-data');
  
  if (fillBtn) {
    fillBtn.addEventListener('click', async () => {
      const data = dataInput.value.trim();
      if (!data) {
        showStatus('Please paste your visa scheduling data first', 'error');
        return;
      }
      
      try {
        const jsonData = JSON.parse(data);
        await fillForm('visa', jsonData);
        showStatus('Visa scheduling form filling initiated', 'success');
      } catch (e) {
        showStatus('Invalid JSON format. Please check your data.', 'error');
      }
    });
  }
  
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      // Load sample data
      const sampleData = getSampleVisaData();
      dataInput.value = JSON.stringify(sampleData, null, 2);
      showStatus('Sample data loaded', 'info');
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      dataInput.value = '';
      chrome.storage.local.remove(['visaData']);
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
          chrome.storage.local.set({ visaData: data });
        } catch (e) {
          // Invalid JSON, don't save
        }
      }
    }, 1000));
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