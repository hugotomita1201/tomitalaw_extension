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
    'ds160-retrieval': 'refreshCw',
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
    case 'ds160-retrieval':
      setupRetrievalHandlers();
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

// Preprocess JSON from ChatGPT to handle various formatting issues
function preprocessChatGPTJson(text) {
  let cleaned = text.trim();

  // Remove code block markers if present (```json ... ```)
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Handle Canvas Copy button quote wrapping
  // Canvas wraps entire JSON in quotes: "{ \"field\": \"value\" }"
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    // Check if it's actually a wrapped JSON object
    try {
      // Try to parse as string first
      const possiblyWrapped = JSON.parse(cleaned);
      if (typeof possiblyWrapped === 'string') {
        // It was wrapped - use the unwrapped version
        cleaned = possiblyWrapped;
      }
    } catch (e) {
      // Not wrapped, continue with original
    }
  }

  return cleaned.trim();
}

// DS-160 specific handlers
function setupDS160Handlers() {
  let mainLoadedData = null; // Stores loaded main DS-160 data
  let partialLoadedData = null; // Stores loaded partial JSON data
  let currentData = null; // Points to whichever data is currently being viewed
  let currentDataType = null; // Track whether 'main' or 'partial' data is being viewed
  let modifiedFields = new Set();
  let isRawView = false;
  
  const loadMainBtn = document.getElementById('ds160-load-main');
  const loadPartialBtn = document.getElementById('ds160-load-partial');
  const clearMainBtn = document.getElementById('ds160-clear-main');
  const clearPartialBtn = document.getElementById('ds160-clear-partial');
  const fillBtn = document.getElementById('ds160-fill');
  const editBtn = document.getElementById('ds160-edit');
  const saveChangesBtn = document.getElementById('ds160-save-changes');
  const copyJsonBtn = document.getElementById('ds160-copy-json');
  const viewRawBtn = document.getElementById('ds160-view-raw');
  const expandAllBtn = document.getElementById('ds160-expand-all');
  const dataInput = document.getElementById('ds160-data');
  const partialDataInput = document.getElementById('ds160-evisa-data');
  const dataInputSection = document.getElementById('ds160DataInputSection');
  const dataSection = document.getElementById('ds160DataSection');
  const dataPreview = document.getElementById('ds160DataPreview');
  const editableDataViewer = document.getElementById('ds160EditableData');
  const mainSectionHeader = document.getElementById('main-section-header');
  const partialSectionHeader = document.getElementById('partial-section-header');
  
  // Section configuration with icons and field labels
  // Ordered to match DS-160 form page sequence
  const sectionConfig = {
    // 1. Personal (Page 2)
    personal: {
      icon: '👤',
      title: 'Personal Information',
      fields: {
        surname: 'Last Name',
        givenName: 'First Name',
        fullNameNative: 'Full Name (Native)',
        gender: 'Gender',
        maritalStatus: 'Marital Status',
        dateOfBirth: 'Date of Birth',
        birthCity: 'Birth City',
        birthState: 'Birth State',
        birthCountry: 'Birth Country',
        nationality: 'Nationality',
        nationalId: 'National ID',
        usSocialSecurity: 'US SSN',
        usTaxId: 'US Tax ID'
      }
    },
    // 2. Travel (Page 3)
    travel: {
      icon: '✈️',
      title: 'Travel Information',
      fields: {
        purposeOfTrip: 'Purpose of Trip',
        otherPurposeDetail: 'Visa Type Detail',
        specificTravelPlans: 'Specific Plans',
        intendedArrivalDate: 'Arrival Date',
        arrivalFlightNumber: 'Arrival Flight',
        arrivalCity: 'Arrival City',
        intendedDepartureDate: 'Departure Date',
        lengthOfStay: 'Length of Stay',
        lengthOfStayNumber: 'Stay Duration',
        lengthOfStayUnit: 'Stay Unit',
        usStreetAddress: 'US Address',
        usCity: 'US City',
        usState: 'US State',
        usZipCode: 'US Zip Code',
        tripPayer: 'Trip Payer'
      }
    },
    // 3. Travel Companions (Page 4)
    travelCompanions: {
      icon: '👥',
      title: 'Travel Companions'
    },
    // 4. Previous U.S. Travel (Page 5)
    previousTravel: {
      icon: '🗺️',
      title: 'Previous U.S. Travel'
    },
    // 5. Address and Phone (Page 6) - combining homeAddress and contact
    homeAddress: {
      icon: '🏠',
      title: 'Address and Phone',
      fields: {
        street: 'Street Address',
        street2: 'Street Address 2',
        city: 'City',
        state: 'State/Province',
        postalCode: 'Postal Code',
        country: 'Country'
      }
    },
    contact: {
      icon: '📧',
      title: 'Contact Information',
      fields: {
        homeStreet: 'Home Street',
        homeApt: 'Apartment',
        homeCity: 'Home City',
        homeState: 'Home State',
        homePostalCode: 'Postal Code',
        homeCountry: 'Home Country',
        homePhone: 'Home Phone',
        secondaryPhone: 'Secondary Phone',
        workPhone: 'Work Phone',
        email: 'Email Address'
      }
    },
    // 6. Passport (Page 7)
    passport: {
      icon: '📔',
      title: 'Passport',
      fields: {
        type: 'Passport Type',
        number: 'Passport Number',
        bookNumber: 'Book Number',
        issuingAuthority: 'Issuing Authority',
        issueCountry: 'Issue Location Country',
        issueCity: 'Issue City',
        issueState: 'Issue State',
        issueDate: 'Issue Date',
        expirationDate: 'Expiration Date'
      }
    },
    // 7. U.S. Contact (Page 8)
    usContact: {
      icon: '🏢',
      title: 'U.S. Contact',
      fields: {
        organizationName: 'Organization',
        relationship: 'Relationship'
      }
    },
    // 8. Family (Page 9)
    family: {
      icon: '👨‍👩‍👧‍👦',
      title: 'Family'
    },
    // 9. Work / Education / Training (Page 10)
    workEducation: {
      icon: '💼',
      title: 'Work / Education / Training'
    },
    education: {
      icon: '🎓',
      title: 'Education',
      fields: {
        institutions: 'Educational Institutions'
      }
    },
    employment: {
      icon: '💼',
      title: 'Employment',
      fields: {
        currentEmployer: 'Current Employer',
        previousEmployers: 'Previous Employers'
      }
    },
    // 10. Security and Background (Page 11)
    security: {
      icon: '🔒',
      title: 'Security and Background'
    },
    // Additional sections that may appear
    countriesVisited: {
      icon: '🌍',
      title: 'Countries Visited',
      fields: {
        hasVisited: 'Has visited other countries',
        countries: 'List of countries'
      }
    },
    travelGroup: {
      icon: '👥',
      title: 'Travel Group'
    }
  };
  
  // Helper function to check if a field is a boolean and get its default
  function isBooleanField(fieldName) {
    // Convert to lowercase for checking
    const name = fieldName.toLowerCase();
    
    // Common DS-160 boolean fields - comprehensive list
    const booleanPatterns = [
      // Previous patterns
      'inus', 'inustemporary', 'visited', 'refused', 'arrested',
      'convicted', 'visa', 'lost', 'cancelled', 'denied', 'deported',
      'overstayed', 'worked', 'attended', 'married', 'permanent',
      'citizen', 'taxpayer', 'served', 'military', 'belonged', 'belongs',
      'participated', 'traveled', 'provided', 'trained',
      'violator', 'involved', 'engaged', 'related', 'sought',
      'assisted', 'committed', 'ordered', 'detained', 'withheld',
      'disease', 'disorder', 'addiction', 'associated', 'espionage',
      'sabotage', 'genocide', 'torture', 'killings', 'terrorist',
      'financial', 'representative', 'public', 'immunity', 'compulsory',
      'child', 'custody', 'voting', 'renounced', 'tax',
      
      // New patterns for missing fields
      'drug', 'user', 'controlled', 'substances', 'prostitution',
      'laundering', 'trafficking', 'human', 'money', 'weapons',
      'violation', 'fraud', 'misrepresentation', 'illegal', 'unlawful',
      'criminal', 'offense', 'conviction', 'removal', 'exclusion',
      'inadmissible', 'false', 'activity', 'organization', 'group',
      'violence', 'persecution', 'conflict', 'assistance', 'support',
      
      // Additional patterns from screenshots
      'hasmembership', 'membership', 'hasskills', 'skills',
      'hasinvolvement', 'involvement', 'deportation', 'deport',
      'renounce', 'expenses', 'hasserved'
    ];
    
    // Check if field name contains any boolean pattern
    return booleanPatterns.some(pattern => name.includes(pattern));
  }
  
  // Create editable field element
  function createEditableField(label, value, path, depth = 0) {
    // Check if value is an object or array - if so, handle it specially
    if (value && typeof value === 'object') {
      // For nested objects, create a container with the label at the top
      const containerDiv = document.createElement('div');
      containerDiv.className = 'nested-field-container';
      
      // Add the label for the nested object
      const labelDiv = document.createElement('div');
      labelDiv.className = 'nested-field-label';
      labelDiv.textContent = label + ':';
      containerDiv.appendChild(labelDiv);
      
      // Create container for child fields
      const childrenContainer = document.createElement('div');
      childrenContainer.className = depth > 1 ? 'nested-children-flat' : 'nested-children';
      
      if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const itemSection = document.createElement('div');
            itemSection.className = 'array-item-section';
            
            const itemHeader = document.createElement('div');
            itemHeader.className = 'array-item-header';
            itemHeader.textContent = `#${index + 1}`;
            itemSection.appendChild(itemHeader);
            
            // Render each property of the object
            Object.entries(item).forEach(([key, val]) => {
              const nestedField = createEditableField(key, val, `${path}[${index}].${key}`, depth + 1);
              itemSection.appendChild(nestedField);
            });
            
            childrenContainer.appendChild(itemSection);
          } else {
            // Simple array item
            const itemField = createEditableField(`[${index + 1}]`, item, `${path}[${index}]`, depth + 1);
            childrenContainer.appendChild(itemField);
          }
        });
      } else {
        // Handle nested objects - render each property
        Object.entries(value).forEach(([key, val]) => {
          const nestedField = createEditableField(key, val, `${path}.${key}`, depth + 1);
          childrenContainer.appendChild(nestedField);
        });
      }
      
      containerDiv.appendChild(childrenContainer);
      return containerDiv;
    }
    
    // Handle primitive values (strings, numbers, booleans, null)
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'data-field';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'field-label';
    labelDiv.textContent = label + ':';
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'field-value';
    valueDiv.dataset.path = path;
    
    if (!value || value === 'N/A') {
      // Check if this is a boolean field that should default to false
      if (isBooleanField(label)) {
        valueDiv.textContent = 'false';
        valueDiv.className += ' default-value';
      } else {
        valueDiv.className += ' empty';
        valueDiv.textContent = '';
      }
    } else {
      valueDiv.textContent = value;
    }
    
    // Track if this field was modified
    if (modifiedFields.has(path)) {
      valueDiv.classList.add('modified');
    }
    
    // Click to edit functionality for primitive values only
    valueDiv.addEventListener('click', function(e) {
      if (this.classList.contains('editing')) return;
      
      const currentValue = this.textContent;
      const isDefault = this.classList.contains('default-value');
      this.classList.add('editing');
      
      const input = document.createElement('input');
      input.type = 'text';
      // If it's a default value, start with empty input for easier typing
      input.value = (currentValue === '' || isDefault) ? '' : currentValue;
      input.addEventListener('blur', () => saveFieldValue(this, input, path));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveFieldValue(this, input, path);
        } else if (e.key === 'Escape') {
          this.classList.remove('editing');
          this.textContent = currentValue;
          // Restore default-value class if it was a default
          if (isDefault) {
            this.classList.add('default-value');
          }
        }
      });
      
      this.innerHTML = '';
      this.appendChild(input);
      input.focus();
      input.select();
    });
    
    fieldDiv.appendChild(labelDiv);
    fieldDiv.appendChild(valueDiv);
    return fieldDiv;
  }
  
  // Save field value after editing
  function saveFieldValue(fieldDiv, input, path) {
    const newValue = input.value.trim();
    
    // Parse the path to handle array indices
    const pathParts = [];
    let currentPath = '';
    for (let i = 0; i < path.length; i++) {
      if (path[i] === '[') {
        if (currentPath) {
          pathParts.push(currentPath);
          currentPath = '';
        }
        // Extract array index
        let j = i + 1;
        while (j < path.length && path[j] !== ']') {
          currentPath += path[j];
          j++;
        }
        pathParts.push(parseInt(currentPath));
        currentPath = '';
        i = j; // Skip the closing bracket
      } else if (path[i] === '.') {
        if (currentPath) {
          pathParts.push(currentPath);
          currentPath = '';
        }
      } else {
        currentPath += path[i];
      }
    }
    if (currentPath) {
      pathParts.push(currentPath);
    }
    
    // Update the data object
    let obj = currentData;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!obj[part]) {
        // Create array or object as needed
        if (typeof pathParts[i + 1] === 'number') {
          obj[part] = [];
        } else {
          obj[part] = {};
        }
      }
      obj = obj[part];
    }
    obj[pathParts[pathParts.length - 1]] = newValue || 'N/A';
    
    // Update display
    fieldDiv.classList.remove('editing', 'empty', 'default-value');
    if (!newValue) {
      // Check if this is a boolean field that should show default
      const label = fieldDiv.parentElement?.querySelector('.field-label')?.textContent?.replace(':', '');
      if (label && isBooleanField(label)) {
        fieldDiv.classList.add('default-value');
        fieldDiv.textContent = 'false';
      } else {
        fieldDiv.classList.add('empty');
        fieldDiv.textContent = '';
      }
    } else {
      fieldDiv.textContent = newValue;
    }
    
    // Mark as modified
    modifiedFields.add(path);
    fieldDiv.classList.add('modified');
    
    // Show save button
    if (saveChangesBtn) {
      saveChangesBtn.style.display = 'block';
    }
  }
  
  // Create collapsible section
  function createSection(sectionKey, sectionData, config) {
    const section = document.createElement('div');
    section.className = 'data-section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    
    const title = document.createElement('div');
    title.className = 'section-title';
    title.innerHTML = `<span>${config.icon || '📁'}</span><span>${config.title || sectionKey}</span>`;
    
    const chevron = document.createElement('span');
    chevron.className = 'section-chevron';
    chevron.textContent = '▶';
    
    header.appendChild(title);
    header.appendChild(chevron);
    
    const content = document.createElement('div');
    content.className = 'section-content';
    
    // Add fields based on config or data
    if (config.fields) {
      Object.entries(config.fields).forEach(([fieldKey, fieldLabel]) => {
        const value = sectionData?.[fieldKey];
        if (value !== undefined) {
          content.appendChild(createEditableField(fieldLabel, value, `${sectionKey}.${fieldKey}`, 0));
        }
      });
    } else {
      // Handle nested objects and arrays
      if (sectionData && typeof sectionData === 'object') {
        renderNestedData(sectionData, sectionKey, content);
      }
    }
    
    // Toggle section on header click
    header.addEventListener('click', () => {
      header.classList.toggle('active');
      content.classList.toggle('expanded');
    });
    
    // Auto-expand sections with data
    if (content.children.length > 0) {
      header.classList.add('active');
      content.classList.add('expanded');
    }
    
    section.appendChild(header);
    section.appendChild(content);
    return section;
  }
  
  // Render nested data structures
  function renderNestedData(data, parentPath, container, depth = 0) {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      // Pass all values (arrays, objects, primitives) to createEditableField for consistent handling
      container.appendChild(createEditableField(key, value, `${parentPath}.${key}`, depth));
    });
  }
  
  // Display data in editable format
  function displayEditableData(data) {
    if (!data) return;

    editableDataViewer.innerHTML = '';
    modifiedFields.clear();

    // Create sections based on data structure
    Object.entries(sectionConfig).forEach(([sectionKey, config]) => {
      if (data[sectionKey]) {
        const section = createSection(sectionKey, data[sectionKey], config);
        editableDataViewer.appendChild(section);
      }
    });

    // Handle any additional sections not in config
    Object.keys(data).forEach(key => {
      if (!sectionConfig[key]) {
        const section = createSection(key, data[key], {
          icon: '📋',
          title: key.charAt(0).toUpperCase() + key.slice(1)
        });
        editableDataViewer.appendChild(section);
      }
    });

    // Update data type badge
    const badge = document.getElementById('ds160-data-type-badge');
    if (badge && currentDataType) {
      badge.textContent = currentDataType === 'main' ? 'Main DS-160 Data' : 'Partial JSON Data';
      badge.className = currentDataType === 'main' ? 'section-badge required' : 'section-badge optional';
      badge.style.display = 'inline-block';
    }

    // Show editable viewer, hide text preview
    editableDataViewer.style.display = 'block';
    dataPreview.style.display = 'none';
    dataSection.style.display = 'block';
    dataInputSection.style.display = 'none';
  }
  
  // Display data in raw text format (legacy)
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
      if (data.passport.number) {
        preview.push(`Passport #: ${data.passport.number}`);
      }
      if (data.passport.issuingAuthority) {
        preview.push(`Issuing Authority: ${data.passport.issuingAuthority}`);
      }
    }
    
    if (data.travel) {
      preview.push('');
      preview.push('=== TRAVEL ===' );
      if (data.travel.purposeOfTrip) {
        preview.push(`Purpose: ${data.travel.purposeOfTrip}`);
      }
      if (data.travel.intendedArrivalDate) {
        preview.push(`Arrival: ${data.travel.intendedArrivalDate}`);
      }
    }
    
    if (data.contact) {
      preview.push('');
      preview.push('=== CONTACT ===' );
      if (data.contact.email) {
        preview.push(`Email: ${data.contact.email}`);
      }
      if (data.contact.homePhone) {
        preview.push(`Phone: ${data.contact.homePhone}`);
      }
    }
    
    dataPreview.textContent = preview.join('\n') || 'Data loaded (no preview available)';
    editableDataViewer.style.display = 'none';
    dataPreview.style.display = 'block';
    dataSection.style.display = 'block';
    dataInputSection.style.display = 'none';
  }
  
  // Load saved data on module load
  chrome.storage.local.get(['ds160Data', 'lastDS160CoreData', 'lastDS160EvisaData', 'lastDS160Data', 'lastDS160DataType'], (result) => {

    // Load core data
    if (result.lastDS160CoreData) {
      dataInput.value = result.lastDS160CoreData;
      // Load E-visa data if available
      if (result.lastDS160EvisaData && partialDataInput) {
        partialDataInput.value = result.lastDS160EvisaData;
      }
      // Trigger appropriate load button based on last data type
      if (result.lastDS160DataType === 'partial' && loadPartialBtn) {
        loadPartialBtn.click();
      } else if (loadMainBtn) {
        loadMainBtn.click();
      }
    } else if (result.lastDS160Data) {
      // Backward compatibility: load old single field data
      dataInput.value = result.lastDS160Data;
      // Trigger load automatically
      if (loadMainBtn) {
        loadMainBtn.click();
      }
    } else if (result.ds160Data) {
      // Load any saved data
      dataInput.value = typeof result.ds160Data === 'string'
        ? result.ds160Data
        : JSON.stringify(result.ds160Data, null, 2);
    }
  });

  // Load Main Data button - loads from main DS-160 data field
  if (loadMainBtn) {
    loadMainBtn.addEventListener('click', () => {
      const mainData = dataInput.value.trim();

      if (!mainData) {
        showStatus('Please paste data in the main DS-160 field', 'error');
        return;
      }

      try {
        const cleanedData = preprocessChatGPTJson(mainData);
        const parsedData = JSON.parse(cleanedData);
        mainLoadedData = parsedData; // Store in separate variable
        currentData = mainLoadedData; // Point to main data for viewing
        currentDataType = 'main';

        showStatus('Main DS-160 data loaded successfully!', 'success');
        displayEditableData(currentData);

        // Update header visual state
        updateSectionHeaderStates();

        // Save the data for next time
        chrome.storage.local.set({
          ds160Data: currentData,
          lastDS160CoreData: mainData,
          lastDS160DataType: 'main'
        });
      } catch (error) {
        console.error('Error parsing main data:', error);
        showStatus('Error parsing JSON data', 'error');
        return;
      }
    });
  }

  // Load Partial Data button - loads from partial JSON field
  if (loadPartialBtn) {
    loadPartialBtn.addEventListener('click', () => {
      const partial = partialDataInput.value.trim();

      if (!partial) {
        showStatus('Please paste data in the partial JSON field', 'error');
        return;
      }

      try {
        const cleanedData = preprocessChatGPTJson(partial);
        const parsedData = JSON.parse(cleanedData);
        partialLoadedData = parsedData; // Store in separate variable
        currentData = partialLoadedData; // Point to partial data for viewing
        currentDataType = 'partial';

        showStatus('Partial JSON data loaded successfully!', 'success');
        displayEditableData(currentData);

        // Update header visual state
        updateSectionHeaderStates();

        // Save the data for next time
        chrome.storage.local.set({
          ds160Data: currentData,
          lastDS160EvisaData: partial,
          lastDS160DataType: 'partial'
        });
      } catch (error) {
        console.error('Error parsing partial data:', error);
        showStatus('Error parsing JSON data', 'error');
        return;
      }
    });
  }
  
  // Copy Combined JSON button
  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', async () => {
      if (!currentData) {
        showStatus('No data to copy', 'error');
        return;
      }
      
      try {
        // Convert the current data to formatted JSON string
        const jsonString = JSON.stringify(currentData, null, 2);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(jsonString);
        
        // Show success message
        showStatus('Combined JSON copied to clipboard!', 'success');
        
        // Temporarily change button text to show success
        const originalText = copyJsonBtn.innerHTML;
        copyJsonBtn.innerHTML = '✅ Copied!';
        setTimeout(() => {
          copyJsonBtn.innerHTML = originalText;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        showStatus('Failed to copy to clipboard', 'error');
      }
    });
  }
  
  // View Raw button - toggle between editable and raw view
  if (viewRawBtn) {
    viewRawBtn.addEventListener('click', () => {
      isRawView = !isRawView;
      if (isRawView) {
        displayData(currentData);
        viewRawBtn.innerHTML = '📝 Editable';
      } else {
        displayEditableData(currentData);
        viewRawBtn.innerHTML = '<span style="font-size: 12px;">{ }</span> Raw';
      }
    });
  }
  
  // Expand All button
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      const sections = editableDataViewer.querySelectorAll('.data-section');
      const allExpanded = Array.from(sections).every(s => 
        s.querySelector('.section-header').classList.contains('active')
      );
      
      sections.forEach(section => {
        const header = section.querySelector('.section-header');
        const content = section.querySelector('.section-content');
        if (allExpanded) {
          header.classList.remove('active');
          content.classList.remove('expanded');
          expandAllBtn.textContent = 'Expand All';
        } else {
          header.classList.add('active');
          content.classList.add('expanded');
          expandAllBtn.textContent = 'Collapse All';
        }
      });
    });
  }
  
  // Save Changes button
  if (saveChangesBtn) {
    saveChangesBtn.addEventListener('click', () => {
      // Save the modified data
      chrome.storage.local.set({ 
        ds160Data: currentData,
        lastDS160Data: JSON.stringify(currentData, null, 2)
      });
      
      // Clear modified indicators
      modifiedFields.clear();
      document.querySelectorAll('.field-value.modified').forEach(field => {
        field.classList.remove('modified');
      });
      
      saveChangesBtn.style.display = 'none';
      showStatus('Changes saved successfully!', 'success');
    });
  }
  
  // Clear Main Data button
  if (clearMainBtn) {
    clearMainBtn.addEventListener('click', () => {
      dataInput.value = '';
      if (currentDataType === 'main') {
        currentData = null;
        currentDataType = null;
        dataSection.style.display = 'none';
        dataInputSection.style.display = 'block';
      }
      chrome.storage.local.remove(['lastDS160CoreData', 'lastDS160Data']);
      showStatus('Main data cleared', 'info');
    });
  }

  // Clear Partial Data button
  if (clearPartialBtn) {
    clearPartialBtn.addEventListener('click', () => {
      if (partialDataInput) {
        partialDataInput.value = '';
      }
      if (currentDataType === 'partial') {
        currentData = null;
        currentDataType = null;
        dataSection.style.display = 'none';
        dataInputSection.style.display = 'block';
      }
      chrome.storage.local.remove(['lastDS160EvisaData']);
      showStatus('Partial data cleared', 'info');
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
  
  // Auto-Fill Partial Section button (for partial JSON field)
  const fillPartialBtn = document.getElementById('ds160-fill-partial');

  if (fillPartialBtn && partialDataInput) {
    fillPartialBtn.addEventListener('click', async () => {
      const partialData = partialDataInput.value.trim();

      if (!partialData) {
        showStatus('Please paste partial JSON data', 'error');
        return;
      }

      try {
        const cleanedData = preprocessChatGPTJson(partialData);
        const parsedData = JSON.parse(cleanedData);

        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url || !tab.url.includes('ceac.state.gov')) {
          showStatus('Please navigate to the DS-160 form first', 'error');
          return;
        }

        // Store partial data in chrome storage temporarily
        await chrome.storage.local.set({ ds160Data: parsedData });

        // Try to inject content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/modules/ds160-content.js']
          });
        } catch (e) {
          console.log('DS-160 content script might already be injected:', e);
        }

        showStatus('Auto-filling partial section...', 'info');

        // Send message to content script
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'fillForm',
            module: 'ds160',
            data: parsedData  // Send partial JSON independently
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              showStatus('Error: Could not communicate with the page. Try refreshing.', 'error');
            } else if (response && response.success) {
              showStatus('Partial section filled successfully!', 'success');
            } else {
              showStatus('Partial section filling completed. Check the page.', 'info');
            }
          });
        }, 100);

      } catch (error) {
        console.error('Error parsing partial JSON:', error);
        showStatus('Error parsing partial JSON data', 'error');
      }
    });
  }

  // Edit Data button - go back to input
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Restore data to the correct textarea based on currentDataType
      if (currentData && currentDataType === 'main') {
        dataInput.value = JSON.stringify(currentData, null, 2);
        // Clear the partial field since we're editing main data
        if (partialDataInput) {
          partialDataInput.value = '';
        }
      } else if (currentData && currentDataType === 'partial') {
        if (partialDataInput) {
          partialDataInput.value = JSON.stringify(currentData, null, 2);
        }
        // Clear the main field since we're editing partial data
        dataInput.value = '';
      }

      dataSection.style.display = 'none';
      dataInputSection.style.display = 'block';
      showStatus('Edit your JSON data and click Load Data again', 'info');
    });
  }

  // Helper function to update section header visual states
  function updateSectionHeaderStates() {
    if (!mainSectionHeader || !partialSectionHeader) return;

    // Remove active class from both
    mainSectionHeader.classList.remove('active');
    partialSectionHeader.classList.remove('active');

    // Add active class to currently viewed data type
    if (currentDataType === 'main') {
      mainSectionHeader.classList.add('active');
    } else if (currentDataType === 'partial') {
      partialSectionHeader.classList.add('active');
    }

    // Update disabled state based on whether data is loaded
    if (mainLoadedData) {
      mainSectionHeader.classList.remove('disabled');
      mainSectionHeader.style.cursor = 'pointer';
    } else {
      mainSectionHeader.classList.add('disabled');
      mainSectionHeader.style.cursor = 'default';
    }

    if (partialLoadedData) {
      partialSectionHeader.classList.remove('disabled');
      partialSectionHeader.style.cursor = 'pointer';
    } else {
      partialSectionHeader.classList.add('disabled');
      partialSectionHeader.style.cursor = 'default';
    }
  }

  // Click handler for Main section header - toggle to view main data
  if (mainSectionHeader) {
    mainSectionHeader.addEventListener('click', () => {
      // Only allow clicking if main data is loaded
      if (!mainLoadedData) {
        showStatus('No main data loaded. Please load data first.', 'info');
        return;
      }

      // Switch to main data view
      currentData = mainLoadedData;
      currentDataType = 'main';
      displayEditableData(currentData);
      updateSectionHeaderStates();
      showStatus('Switched to Main DS-160 Data view', 'info');
    });
  }

  // Click handler for Partial section header - toggle to view partial data
  if (partialSectionHeader) {
    partialSectionHeader.addEventListener('click', () => {
      // Only allow clicking if partial data is loaded
      if (!partialLoadedData) {
        showStatus('No partial data loaded. Please load data first.', 'info');
        return;
      }

      // Switch to partial data view
      currentData = partialLoadedData;
      currentDataType = 'partial';
      displayEditableData(currentData);
      updateSectionHeaderStates();
      showStatus('Switched to Partial JSON view', 'info');
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

      // Check if this is passport return data
      if (currentData.passportReturn) {
        showPassportReturnArea(currentData.passportReturn);
        showStatus('Ready to fill passport return form', 'success');
      } else if (hasPersonData()) {
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
        const cleanedInput = preprocessChatGPTJson(input);
        const parsedData = JSON.parse(cleanedInput);

        // Smart detection: Check if this is passport return data
        const isPassportReturn = parsedData.mainApplicant && parsedData.applicants;

        if (isPassportReturn) {
          // Passport return format detected
          currentData = { passportReturn: parsedData };

          // Save to storage
          chrome.storage.local.set({ visaData: currentData }, () => {
            const applicantCount = parsedData.applicants ? parsedData.applicants.length : 0;
            showStatus(`Passport return data loaded! (${applicantCount} applicant${applicantCount !== 1 ? 's' : ''})`, 'success');
            showPassportReturnArea(parsedData);
          });
        } else {
          // Visa scheduling format
          // Unwrap applicant wrapper if present (for prompt compatibility)
          let unwrappedData;
          if (parsedData.applicant) {
            // Prompt format: {"applicant": {...}, "dependents": [...]}
            // Unwrap to flat format: {atlas_first_name: "...", dependents: [...]}
            unwrappedData = {
              ...parsedData.applicant,
              dependents: parsedData.dependents || []
            };
          } else {
            // Already flat format (sample data files)
            unwrappedData = parsedData;
          }

          currentData = unwrappedData;

          // Save to storage
          chrome.storage.local.set({ visaData: currentData }, () => {
            showStatus('Visa scheduling data loaded successfully!', 'success');
            updateFieldCount();
            updatePersonSelector();

            // Show person selector if data has person info
            if (hasPersonData()) {
              showPersonSelector();
            }
          });
        }
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

  // Passport Return helper functions
  function showPassportReturnArea(passportData) {
    document.getElementById('passportReturnArea').style.display = 'block';
    document.getElementById('personSelectionArea').style.display = 'none';
    document.getElementById('dataInputArea').style.display = 'none';

    // Update summary
    const summaryDiv = document.getElementById('passportReturnSummary');
    if (summaryDiv && passportData) {
      const applicantCount = passportData.applicants ? passportData.applicants.length : 0;
      const mainApp = passportData.mainApplicant || {};
      summaryDiv.innerHTML = `
        <strong>${applicantCount} Applicant${applicantCount !== 1 ? 's' : ''}</strong><br>
        <small>Delivery: ${mainApp.city || 'N/A'}, ${mainApp.region || 'N/A'} ${mainApp.postal_code || ''}</small><br>
        <small>Email: ${mainApp.email || 'N/A'}</small>
      `;
    }
  }

  function hidePassportReturnArea() {
    document.getElementById('passportReturnArea').style.display = 'none';
    document.getElementById('dataInputArea').style.display = 'block';
  }

  // Passport Return button handlers
  const fillPassportReturnBtn = document.getElementById('fillPassportReturnBtn');
  const editPassportDataBtn = document.getElementById('editPassportDataBtn');

  if (fillPassportReturnBtn) {
    fillPassportReturnBtn.addEventListener('click', async () => {
      if (!currentData || !currentData.passportReturn) {
        showStatus('No passport return data loaded', 'error');
        return;
      }

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if we're on the passport delivery page
      if (!tab.url || !tab.url.includes('pds.ayobaspremium.jp')) {
        showStatus('Please navigate to pds.ayobaspremium.jp first', 'error');
        return;
      }

      // Show loading
      document.getElementById('loadingSpinner').style.display = 'block';
      fillPassportReturnBtn.disabled = true;

      // Send message to content script with full currentData
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        module: 'visa',
        data: currentData  // Send full object with passportReturn property
      }, (response) => {
        // Hide loading
        document.getElementById('loadingSpinner').style.display = 'none';
        fillPassportReturnBtn.disabled = false;

        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError);
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else {
          showStatus('Passport delivery form filled!', 'success');
        }
      });
    });
  }

  if (editPassportDataBtn) {
    editPassportDataBtn.addEventListener('click', () => {
      hidePassportReturnArea();
      // Put the passport return JSON back in the input field
      if (currentData && currentData.passportReturn) {
        dataInput.value = JSON.stringify(currentData.passportReturn, null, 2);
      }
      showStatus('Edit your data and click Load Data again', 'info');
    });
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