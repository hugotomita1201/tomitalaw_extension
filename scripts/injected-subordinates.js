(() => {
  // This script runs in the page context for subordinate field filling
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
      
      if (matched) {
        console.log(`[Subordinate Script] Set dropdown ${field.id} to ${element.value}`);
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
      console.log(`[Subordinate Script] Set ${field.id} to ${field.value}`);
      
      // Trigger native validation
      if (typeof element.onchange === 'function') {
        element.onchange();
      }
      return true;
    }
  }
  
  // Function to click Add Another button
  function clickAddButton(addButtonId) {
    if (!addButtonId) return false;
    
    let addButton = null;
    
    // Try to find by ID first
    if (addButtonId.startsWith('ctl00_')) {
      addButton = document.getElementById(addButtonId);
    } else if (addButtonId.startsWith('javascript:')) {
      // Handle href-based buttons
      const links = document.querySelectorAll('a[href*="Insert"]');
      for (const link of links) {
        if (link.getAttribute('href') === addButtonId) {
          addButton = link;
          break;
        }
      }
    }
    
    if (addButton) {
      console.log(`[Subordinate Script] Clicking Add Another button:`, addButton);
      addButton.click();
      return true;
    } else {
      console.warn(`[Subordinate Script] Add Another button not found:`, addButtonId);
      return false;
    }
  }
  
  // Check if we're doing batch processing with an add button
  if (params.addButtonId) {
    console.log(`[Subordinate Script] Batch processing subordinates with Add button: ${params.addButtonId}`);
    
    // Track which subordinate sections have been created
    // ctl00 always exists when "Has Immediate Subordinates = Yes" is selected
    const createdSections = new Set(['00']);
    
    // Process fields sequentially with delays
    params.fields.forEach((field, index) => {
      setTimeout(() => {
        const element = document.getElementById(field.id);
        
        if (!element) {
          // Field doesn't exist yet
          const match = field.id.match(/ctl(\d{2})/);
          if (match) {
            const sectionNumber = match[1];
            
            // Only click "Add Another" once per new subordinate section
            // Check if this is the surname field (first field of the section)
            if (!createdSections.has(sectionNumber) && field.id.includes('tbxEVISA_SUB_SURNAME')) {
              console.log(`[Subordinate Script] Creating new subordinate section ${sectionNumber}`);
              
              if (clickAddButton(params.addButtonId)) {
                createdSections.add(sectionNumber);
                
                // Wait for the section to be created, then fill this field
                setTimeout(() => {
                  const newElement = document.getElementById(field.id);
                  if (newElement) {
                    fillElement(newElement, field);
                  } else {
                    console.warn(`[Subordinate Script] Field still not found after clicking Add: ${field.id}`);
                    
                    // Try alternative button clicking approach
                    const retryButtons = document.querySelectorAll('a[href*="Insert"], input[value*="Add"], button:contains("Add")');
                    console.log(`[Subordinate Script] Found ${retryButtons.length} potential retry buttons`);
                    
                    for (let i = 0; i < retryButtons.length; i++) {
                      const btn = retryButtons[i];
                      if (btn.textContent.includes('Add') || btn.value?.includes('Add') || 
                          btn.getAttribute('href')?.includes('Insert')) {
                        console.log(`[Subordinate Script] Trying alternative button:`, btn);
                        btn.click();
                        
                        // Wait and check again
                        setTimeout(() => {
                          const retryElement = document.getElementById(field.id);
                          if (retryElement) {
                            fillElement(retryElement, field);
                            return;
                          }
                        }, 1500);
                        break;
                      }
                    }
                  }
                }, 1500); // Longer delay for subordinate creation
              }
            }
          }
        } else {
          // Field exists, fill it immediately
          fillElement(element, field);
        }
      }, index * 200); // 200ms delay between each field (slower for subordinates)
    });
    
  } else {
    // Regular processing (single fields)
    params.fields.forEach(field => {
      const element = document.getElementById(field.id);
      
      if (!element) {
        console.warn(`[Subordinate Script] Element not found: ${field.id}`);
        return;
      }
      
      fillElement(element, field);
    });
  }
})();