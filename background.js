// TomitaLaw AI Extension - Background Service Worker
console.log('TomitaLaw AI Extension background service worker started');

// Import module configuration
import { MODULES, getModuleForUrl } from './modules.config.js';

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  // Set default storage values
  chrome.storage.local.set({
    extensionEnabled: true,
    activeModules: MODULES.filter(m => m.active).map(m => m.id)
  });
});

// Handle action button click - open side panel
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel when extension icon is clicked
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content scripts and sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Handle getStoredData request (for DS-160 backward compatibility)
  if (request.action === 'getStoredData') {
    chrome.storage.local.get(['ds160Data'], (result) => {
      sendResponse({ data: result.ds160Data });
    });
    return true; // Keep channel open for async response
  }
  
  // Handle module status updates
  if (request.action === 'fillComplete' || request.action === 'fillError') {
    // Forward to sidebar if it's open
    chrome.runtime.sendMessage(request);
  }
  
  return true;
});

// Handle external messages from TomitaLaw website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('External message received:', request);
  
  // Verify sender is from allowed domain
  const allowedDomains = [
    'https://i129-pdf-filler.vercel.app',
    'https://i129-backend-452425445497.us-central1.run.app'
  ];
  
  if (allowedDomains.some(domain => sender.url?.startsWith(domain))) {
    if (request.action === 'storeData') {
      // Determine which module based on data type
      const storageKey = request.dataType === 'ds160' ? 'ds160Data' : 'visaData';
      chrome.storage.local.set({ [storageKey]: request.data }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
  }
});

// Monitor tab updates to inject content scripts if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this URL matches any module
    const module = getModuleForUrl(tab.url);
    
    if (module) {
      // Content script should already be injected via manifest
      // Just log for debugging
      console.log(`Tab ${tabId} loaded ${module.name} site: ${tab.url}`);
    }
  }
});

// Handle side panel setup
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// Periodic cleanup of old data (runs every 24 hours)
setInterval(() => {
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    Object.keys(items).forEach(key => {
      if (key.endsWith('_timestamp') && items[key] < oneWeekAgo) {
        // Remove old timestamp and associated data
        const dataKey = key.replace('_timestamp', '');
        chrome.storage.local.remove([key, dataKey]);
      }
    });
  });
}, 24 * 60 * 60 * 1000); // 24 hours

console.log('Background service worker initialization complete');