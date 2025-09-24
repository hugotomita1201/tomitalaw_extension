/**
 * DS-160 Field Recorder Script
 * Optimized version that skips large dropdown option lists
 * 
 * Usage: Copy and paste this entire script into the browser console
 * while on a DS-160 form page to extract field information
 */

(function() {
  'use strict';
  
  // Configuration
  const OPTION_THRESHOLD = 15; // Skip recording options if dropdown has more than this many
  const INCLUDE_HIDDEN = false; // Whether to include hidden fields
  const SKIP_HELPPOP = true; // Skip help/tooltip elements
  
  // Get current page info
  const pageInfo = {
    site: window.location.hostname,
    page: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  // Helper function to get field label
  function getFieldLabel(field) {
    // Try to find associated label
    const labels = document.querySelectorAll('label');
    for (let label of labels) {
      if (label.htmlFor === field.id || label.getAttribute('for') === field.id) {
        return label.innerText.trim();
      }
    }
    
    // Try to find label in parent structure
    let parent = field.parentElement;
    let attempts = 3;
    while (parent && attempts > 0) {
      const label = parent.querySelector('label');
      if (label && !label.htmlFor) {
        return label.innerText.trim();
      }
      parent = parent.parentElement;
      attempts--;
    }
    
    // Try to find text in table cell
    const td = field.closest('td');
    if (td) {
      const prevTd = td.previousElementSibling;
      if (prevTd && prevTd.tagName === 'TD') {
        return prevTd.innerText.trim();
      }
    }
    
    return '';
  }
  
  // Helper function to extract dropdown options
  function extractOptions(selectElement, threshold) {
    const options = Array.from(selectElement.options);
    
    // If too many options, just return metadata
    if (options.length > threshold) {
      return {
        hasLargeOptionList: true,
        optionCount: options.length,
        currentValue: selectElement.value,
        currentText: selectElement.options[selectElement.selectedIndex]?.text || ''
      };
    }
    
    // Otherwise return all options
    return options.map(option => ({
      value: option.value,
      text: option.text,
      selected: option.selected
    }));
  }
  
  // Main extraction function
  function extractFields() {
    const fields = [];
    const fieldStats = {
      total: 0,
      text: 0,
      select: 0,
      checkbox: 0,
      radio: 0,
      textarea: 0,
      hidden: 0,
      largeDropdowns: 0,
      skippedHelppop: 0
    };
    
    // Get all form elements
    const formElements = document.querySelectorAll('input, select, textarea');
    
    formElements.forEach(field => {
      // Skip hidden fields if configured
      if (!INCLUDE_HIDDEN && (field.type === 'hidden' || field.style.display === 'none')) {
        fieldStats.hidden++;
        return;
      }
      
      // Skip help popup elements
      if (SKIP_HELPPOP && field.id && field.id.includes('helppop')) {
        fieldStats.skippedHelppop++;
        return;
      }
      
      // Skip submit/button inputs
      if (field.type === 'submit' || field.type === 'button') {
        return;
      }
      
      fieldStats.total++;
      
      // Build field info object
      const fieldInfo = {
        id: field.id,
        name: field.name,
        type: field.type || field.tagName.toLowerCase(),
        label: getFieldLabel(field),
        value: field.value,
        visible: field.offsetParent !== null,
        required: field.required || field.hasAttribute('required'),
        className: field.className,
        xpath: `//*[@id="${field.id}"]`
      };
      
      // Handle select elements specially
      if (field.tagName === 'SELECT') {
        fieldStats.select++;
        const optionData = extractOptions(field, OPTION_THRESHOLD);
        
        if (optionData.hasLargeOptionList) {
          fieldStats.largeDropdowns++;
          // For large dropdowns, add metadata instead of options
          fieldInfo.hasLargeOptionList = true;
          fieldInfo.optionCount = optionData.optionCount;
          fieldInfo.currentValue = optionData.currentValue;
          fieldInfo.currentText = optionData.currentText;
        } else {
          // For small dropdowns, include all options
          fieldInfo.options = optionData;
        }
      } else if (field.type === 'text') {
        fieldStats.text++;
      } else if (field.type === 'checkbox') {
        fieldStats.checkbox++;
        fieldInfo.checked = field.checked;
      } else if (field.type === 'radio') {
        fieldStats.radio++;
        fieldInfo.checked = field.checked;
      } else if (field.tagName === 'TEXTAREA') {
        fieldStats.textarea++;
      }
      
      // Add data attributes if present
      if (field.dataset && Object.keys(field.dataset).length > 0) {
        fieldInfo.dataAttributes = field.dataset;
      }
      
      fields.push(fieldInfo);
    });
    
    return {
      pageInfo,
      fieldStats,
      fields
    };
  }
  
  // Extract and display results
  const results = extractFields();
  
  // Group fields by container pattern (for dynamic lists)
  const groupedFields = {};
  results.fields.forEach(field => {
    // Check for dynamic list pattern (dtl...ctl00, ctl01, etc.)
    const match = field.id.match(/(dtl[^_]+_ctl\d+)/);
    if (match) {
      const group = match[1];
      if (!groupedFields[group]) {
        groupedFields[group] = [];
      }
      groupedFields[group].push(field);
    }
  });
  
  // Add grouped fields to results
  if (Object.keys(groupedFields).length > 0) {
    results.dynamicGroups = groupedFields;
  }
  
  // Output results
  console.log('Field Extraction Complete!');
  console.log('========================');
  console.log(`Total fields found: ${results.fieldStats.total}`);
  console.log(`Text fields: ${results.fieldStats.text}`);
  console.log(`Dropdowns: ${results.fieldStats.select}`);
  console.log(`Large dropdowns skipped: ${results.fieldStats.largeDropdowns}`);
  console.log(`Checkboxes: ${results.fieldStats.checkbox}`);
  console.log(`Radio buttons: ${results.fieldStats.radio}`);
  console.log(`Textareas: ${results.fieldStats.textarea}`);
  if (results.fieldStats.skippedHelppop > 0) {
    console.log(`Help popups skipped: ${results.fieldStats.skippedHelppop}`);
  }
  console.log('========================');
  
  // Create clean output for copying
  const cleanOutput = {
    ...results.pageInfo,
    initialFields: results.fields
  };
  
  // Log the JSON for copying
  console.log('JSON Output (copy this):');
  console.log(JSON.stringify(cleanOutput, null, 2));
  
  // Also copy to clipboard if possible
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(JSON.stringify(cleanOutput, null, 2))
      .then(() => {
        console.log('✅ Results copied to clipboard!');
      })
      .catch(err => {
        console.log('❌ Could not copy to clipboard:', err);
        console.log('Please manually copy the JSON output above.');
      });
  } else {
    console.log('ℹ️ Clipboard API not available. Please manually copy the JSON output above.');
  }
  
  // Return results for further processing if needed
  return results;
})();