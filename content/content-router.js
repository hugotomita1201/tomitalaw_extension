// Content Router - Routes to appropriate module based on current site

// Module loading state
let loadedModule = null;
let moduleScript = null;

// Detect which module to load based on current URL
function detectModule() {
  const currentUrl = window.location.href;
  
  // Check if we're on DS-160 site
  if (currentUrl.includes('ceac.state.gov')) {
    return 'ds160';
  }
  
  // Check if we're on Visa Scheduling sites
  if (currentUrl.includes('usvisascheduling.com') ||
      currentUrl.includes('ais.usvisa-info.com') ||
      currentUrl.includes('ayobaspremium.jp') ||
      currentUrl.includes('atlasauth.b2clogin.com')) {
    return 'visa';
  }
  
  return null;
}

// Dynamically load module script
async function loadModule(moduleId) {
  if (loadedModule === moduleId) {
    console.log(`Module ${moduleId} already loaded`);
    return;
  }
  
  try {
    // Remove previously loaded module if exists
    if (moduleScript) {
      moduleScript.remove();
    }
    
    // Create and inject module script
    moduleScript = document.createElement('script');
    moduleScript.src = chrome.runtime.getURL(`content/modules/${moduleId}-content.js`);
    moduleScript.dataset.module = moduleId;
    
    // Wait for script to load
    await new Promise((resolve, reject) => {
      moduleScript.onload = resolve;
      moduleScript.onerror = reject;
      document.head.appendChild(moduleScript);
    });
    
    loadedModule = moduleId;
    console.log(`Module ${moduleId} loaded successfully`);
    
  } catch (error) {
    console.error(`Error loading module ${moduleId}:`, error);
  }
}

// Initialize router
function initRouter() {
  const moduleId = detectModule();
  
  if (moduleId) {
    console.log(`TomitaLaw Extension: Detected ${moduleId} module for current site`);
    loadModule(moduleId);
  } else {
    console.log('TomitaLaw Extension: No module for current site');
  }
}

// Listen for messages from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content router received message:', request);
  
  if (request.action === 'fillForm') {
    // Check if correct module is loaded
    if (loadedModule !== request.module) {
      console.error(`Module mismatch: loaded=${loadedModule}, requested=${request.module}`);
      chrome.runtime.sendMessage({
        action: 'fillError',
        module: request.module,
        error: 'Wrong page for this module'
      });
      return;
    }
    
    // Forward message to loaded module
    // The module script will handle this message
    window.postMessage({
      source: 'tomitalaw-router',
      action: 'fillForm',
      module: request.module,
      data: request.data
    }, '*');
  }
});

// Listen for responses from module scripts
window.addEventListener('message', (event) => {
  if (event.data.source === 'tomitalaw-module') {
    // Forward module responses to sidebar
    chrome.runtime.sendMessage({
      action: event.data.action,
      module: event.data.module,
      ...event.data
    });
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouter);
} else {
  initRouter();
}

// Re-initialize on navigation (for SPAs)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    initRouter();
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });