// Module Configuration - Add new tools here
export const MODULES = [
  {
    id: 'ds160',
    name: 'DS-160',
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
    id: 'ds160-retrieval',
    name: 'DS-160 Retrieval',
    description: 'Auto-fill DS-160 application retrieval forms with 30-day expiration tracking',
    contentScript: 'ds160-retrieval-content.js',
    domains: [
      'https://ceac.state.gov/genniv/*'
    ],
    dataKey: 'ds160RetrievalData',
    active: true
  },
  {
    id: 'postal',
    name: 'Postal Lookup',
    description: 'Japanese postal code to address lookup',
    contentScript: null, // No content script needed - utility tool
    domains: [], // Works on any site
    dataKey: 'postalData',
    active: true
  },
  {
    id: 'photo',
    name: 'Photo Checker',
    description: 'AI-powered passport photo validation',
    contentScript: null, // No content script needed - utility tool
    domains: [], // Works on any site
    dataKey: 'photoData',
    active: false
  },
  {
    id: 'text-extractor',
    name: 'Text Extractor',
    description: 'Extract text from documents and images using AI',
    contentScript: null, // No content script needed - utility tool
    domains: [], // Works on any site
    dataKey: 'textExtractorData',
    active: false
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