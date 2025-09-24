(() => {
  // This script runs in the page context, not in the isolated content script world
  const params = JSON.parse(document.currentScript.dataset.params);
  
  // Function to fill an element
  function fillElement(element, field) {
    if (!element) return false;
    
    // Handle different element types
    if (element.tagName === 'SELECT') {
      // For dropdowns, find the matching option
      const options = Array.from(element.options);
      let matched = false;
      
      // Try exact match
      for (const option of options) {
        if (option.value === field.value || option.text === field.value) {
          element.value = option.value;
          matched = true;
          break;
        }
      }
      
      // Try numeric conversion for date dropdowns
      if (!matched && (field.id.includes('Day') || field.id.includes('Month'))) {
        const numericValue = parseInt(field.value, 10).toString();
        for (const option of options) {
          if (option.value === numericValue) {
            element.value = option.value;
            matched = true;
            break;
          }
        }
      }
      
      if (matched) {
        console.log(`[Injected Script] Set dropdown ${field.id} to ${element.value}`);
        // Trigger the page's native validation
        if (typeof element.onchange === 'function') {
          element.onchange();
        }
      }
      return matched;
      
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      // Handle checkboxes and radio buttons
      if (field.value) {
        element.checked = true;
        element.click();
      } else {
        element.checked = false;
      }
      return true;
      
    } else {
      // Text fields and other inputs
      element.value = field.value;
      console.log(`[Injected Script] Set ${field.id} to ${field.value}`);
      
      // Trigger native validation
      if (typeof element.onchange === 'function') {
        element.onchange();
      }
      return true;
    }
  }
  
  // Check if we're doing batch processing with an add button
  if (params.addButtonId) {
    const addButton = document.getElementById(params.addButtonId);
    console.log(`[Injected Script] Batch processing with Add button: ${params.addButtonId}`);
    
    // Track which employer sections have been created
    // ctl00 always exists when "Previously Employed = Yes" is selected
    const createdSections = new Set(['00']);
    
    // Process fields sequentially with delays, like Lollylaw
    params.fields.forEach((field, index) => {
      setTimeout(() => {
        const element = document.getElementById(field.id);
        
        if (!element) {
          // Field doesn't exist yet
          const match = field.id.match(/ctl(\d{2})/);
          if (match) {
            const sectionNumber = match[1];
            
            // Only click "Add Another" once per new employer section
            // Check if this is the employer name field (first field of the section)
            if (!createdSections.has(sectionNumber) && field.id.includes('tbEmployerName')) {
              console.log(`[Injected Script] Creating new employer section ${sectionNumber}`);
              addButton.click();
              createdSections.add(sectionNumber);
              
              // Wait for the section to be created, then fill this field
              setTimeout(() => {
                const newElement = document.getElementById(field.id);
                if (newElement) {
                  fillElement(newElement, field);
                } else {
                  console.warn(`[Injected Script] Field still not found after clicking Add: ${field.id}`);
                }
              }, 1000);
            }
          }
        } else {
          // Field exists, fill it immediately
          fillElement(element, field);
        }
      }, index * 100); // 100ms delay between each field
    });
    
  } else {
    // Regular processing (single fields)
    params.fields.forEach(field => {
      const element = document.getElementById(field.id);
      
      if (!element) {
        console.warn(`[Injected Script] Element not found: ${field.id}`);
        return;
      }
      
      fillElement(element, field);
    });
  }
})();