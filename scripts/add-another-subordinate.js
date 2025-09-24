/**
 * Standalone "Add Another" Button Clicker for DS-160 Immediate Subordinates
 * 
 * This script can be run independently in the browser console to click
 * the "Add Another" button for immediate subordinates section.
 * 
 * Usage: Copy and paste this script into the browser console while on
 * the DS-160 E-Visa Applicant Position page.
 */

(function() {
  'use strict';
  
  console.log('🔍 Starting Add Another Subordinate Button Search...');
  
  // Function to find and click the Add Another button
  function findAndClickAddButton() {
    // Strategy 1: Look for buttons with specific ID patterns
    const addButtons = document.querySelectorAll('a[id*="InsertButtonImmSubor"], a[id*="InsertButton"][id*="Subor"], a[href*="InsertImmSubor"]');
    
    console.log(`Found ${addButtons.length} potential subordinate insert buttons by ID pattern`);
    
    for (const btn of addButtons) {
      if (!btn.disabled && !btn.hasAttribute('disabled')) {
        console.log('✅ Found enabled Add Another button (ID pattern):', btn.id);
        btn.click();
        return true;
      }
    }
    
    // Strategy 2: Look for buttons near subordinate fields
    const subordinateSection = document.querySelector('input[id*="dtlImmSubor"], input[id*="SUB_SURNAME"], input[id*="SUB_GIVEN"]');
    
    if (subordinateSection) {
      console.log('📍 Found subordinate section, looking for nearby Add buttons...');
      
      const container = subordinateSection.closest('table, div, fieldset, form');
      if (container) {
        const links = container.querySelectorAll('a, input[type="button"], button');
        
        for (const element of links) {
          const text = element.textContent || element.value || '';
          const href = element.getAttribute('href') || '';
          
          if ((text.toLowerCase().includes('add') && text.toLowerCase().includes('another')) ||
              text.toLowerCase().includes('add') ||
              href.includes('Insert')) {
            console.log('✅ Found Add Another button (proximity search):', element);
            element.click();
            return true;
          }
        }
      }
    }
    
    // Strategy 3: Look for any Insert links on the page
    const insertLinks = document.querySelectorAll('a[href*="Insert"], a[onclick*="Insert"]');
    console.log(`Found ${insertLinks.length} Insert links on page`);
    
    for (const link of insertLinks) {
      const href = link.getAttribute('href') || '';
      const onclick = link.getAttribute('onclick') || '';
      
      // Look for subordinate-related insert links
      if (href.toLowerCase().includes('subor') || onclick.toLowerCase().includes('subor') ||
          href.includes('ImmSubor') || onclick.includes('ImmSubor')) {
        console.log('✅ Found subordinate Insert link:', link);
        link.click();
        return true;
      }
    }
    
    // Strategy 4: Generic Add Another button search
    console.log('🔍 Trying generic Add Another button search...');
    const allButtons = document.querySelectorAll('a, input[type="button"], button');
    
    for (const btn of allButtons) {
      const text = (btn.textContent || btn.value || '').toLowerCase();
      
      if (text.includes('add') && text.includes('another')) {
        // Check if this button is in the subordinate section
        const isNearSubordinates = btn.closest('table, div, fieldset')?.querySelector('input[id*="SUB_"], input[id*="Subor"]');
        
        if (isNearSubordinates) {
          console.log('✅ Found generic Add Another button in subordinate area:', btn);
          btn.click();
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Function to wait for new fields to appear
  function waitForNewFields(timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkForNewFields = () => {
        const subordinateFields = document.querySelectorAll('input[id*="dtlImmSubor"], input[id*="SUB_SURNAME"], input[id*="SUB_GIVEN"]');
        
        if (subordinateFields.length > 2) { // More than just the first subordinate
          console.log(`✅ New subordinate fields detected! Total fields: ${subordinateFields.length}`);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          console.log('⏰ Timeout waiting for new fields');
          resolve(false);
        } else {
          setTimeout(checkForNewFields, 100);
        }
      };
      
      checkForNewFields();
    });
  }
  
  // Function to show current subordinate fields
  function showCurrentFields() {
    const fields = document.querySelectorAll('input[id*="dtlImmSubor"], input[id*="SUB_SURNAME"], input[id*="SUB_GIVEN"]');
    console.log('📋 Current subordinate fields:');
    fields.forEach((field, index) => {
      console.log(`  ${index + 1}. ${field.id} = "${field.value}"`);
    });
    return fields.length;
  }
  
  // Main execution
  console.log('📊 Current state:');
  const initialFieldCount = showCurrentFields();
  
  console.log('\n🎯 Attempting to click Add Another button...');
  const success = findAndClickAddButton();
  
  if (success) {
    console.log('✅ Add Another button clicked successfully!');
    console.log('⏳ Waiting for new fields to appear...');
    
    waitForNewFields().then((fieldsAdded) => {
      if (fieldsAdded) {
        console.log('🎉 Success! New subordinate fields have been added.');
        console.log('📊 Updated field list:');
        showCurrentFields();
      } else {
        console.log('⚠️ Button was clicked but no new fields detected.');
        console.log('This might mean:');
        console.log('- The page is still loading');
        console.log('- You\'ve reached the maximum number of subordinates');
        console.log('- The button click didn\'t work as expected');
      }
    });
  } else {
    console.log('❌ Could not find Add Another button for subordinates');
    console.log('\n🔍 Debugging information:');
    
    // Show all links for debugging
    const allLinks = document.querySelectorAll('a');
    console.log(`Found ${allLinks.length} total links on page`);
    
    const insertLinks = Array.from(allLinks).filter(link => 
      link.getAttribute('href')?.includes('Insert') || 
      link.textContent.toLowerCase().includes('add')
    );
    
    console.log('🔗 All Insert/Add links found:');
    insertLinks.forEach((link, index) => {
      console.log(`  ${index + 1}. ID: ${link.id || 'none'}, Text: "${link.textContent.trim()}", Href: ${link.href}`);
    });
    
    console.log('\n💡 Manual instructions:');
    console.log('1. Look for an "Add Another" link or button near the subordinate fields');
    console.log('2. The button might be hidden or use a different pattern');
    console.log('3. Try clicking any Insert links manually to see which one adds subordinates');
  }
  
  // Return utility functions for manual use
  return {
    findAndClick: findAndClickAddButton,
    showFields: showCurrentFields,
    waitForFields: waitForNewFields
  };
})();