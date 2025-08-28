// Module Configuration - Add new tools here
export const MODULES = [
  {
    id: 'ds160',
    name: 'DS-160',
    icon: '📋',
    description: 'Auto-fill DS-160 visa application forms',
    contentScript: 'ds160-content.js',
    domains: [
      'https://ceac.state.gov/*'
    ],
    dataKey: 'ds160Data',
    active: true
  },
  {
    id: 'visa',
    name: 'Visa Scheduling',
    icon: '📅',
    description: 'Auto-fill US Visa Scheduling forms',
    contentScript: 'visa-content.js',
    domains: [
      'https://www.usvisascheduling.com/*',
      'https://ais.usvisa-info.com/*',
      'https://ayobaspremium.jp/*',
      'https://atlasauth.b2clogin.com/*'
    ],
    dataKey: 'visaData',
    active: true
  },
  {
    id: 'postal',
    name: 'Postal Lookup',
    icon: '📮',
    description: 'Japanese postal code to address lookup',
    contentScript: null, // No content script needed - utility tool
    domains: [], // Works on any site
    dataKey: 'postalData',
    active: true
  },
  {
    id: 'photo',
    name: 'Photo Checker',
    icon: '📸',
    description: 'AI-powered passport photo validation',
    contentScript: null, // No content script needed - utility tool
    domains: [], // Works on any site
    dataKey: 'photoData',
    active: true
  }
  // To add a new tool in the future:
  // 1. Add a new module object here
  // 2. Add content script to content/modules/
  // 3. Add UI files to sidebar/modules/[module-id]/
  // The framework will automatically handle the rest
];

// Helper function to get module by ID
export function getModuleById(id) {
  return MODULES.find(module => module.id === id);
}

// Helper function to get active modules
export function getActiveModules() {
  return MODULES.filter(module => module.active);
}

// Helper function to check if current URL matches any module
export function getModuleForUrl(url) {
  return MODULES.find(module => {
    return module.domains.some(domain => {
      const pattern = domain.replace(/\*/g, '.*');
      return new RegExp(pattern).test(url);
    });
  });
}