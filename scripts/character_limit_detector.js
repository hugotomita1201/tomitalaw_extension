/**
 * DS-160 Character Limit Detector Script
 *
 * Extracts maxlength attributes from all form fields to prevent
 * site crashes when character limits are exceeded.
 *
 * Usage: Copy and paste this entire script into the browser console
 * while on a DS-160 form page to extract character limit information
 */

(function() {
  'use strict';

  // Configuration
  const INCLUDE_NO_LIMIT = false; // Whether to include fields without maxlength
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

  // Helper function to extract short field ID
  function getShortFieldId(fullId) {
    // Extract the meaningful part after the last underscore
    // ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_POB_CITY -> tbxAPP_POB_CITY
    const match = fullId.match(/_([^_]+)$/);
    return match ? match[1] : fullId;
  }

  // Main extraction function
  function extractCharacterLimits() {
    const characterLimits = {};
    const limitGroups = {};
    const stats = {
      totalFields: 0,
      fieldsWithLimits: 0,
      fieldsWithoutLimits: 0,
      skippedHelppop: 0
    };

    // Get all input and textarea elements
    const formElements = document.querySelectorAll('input[type="text"], textarea');

    formElements.forEach(field => {
      // Skip help popup elements
      if (SKIP_HELPPOP && field.id && field.id.includes('helppop')) {
        stats.skippedHelppop++;
        return;
      }

      stats.totalFields++;

      const maxLength = field.getAttribute('maxlength');
      const hasLimit = maxLength && maxLength !== '-1';

      if (hasLimit) {
        stats.fieldsWithLimits++;
      } else {
        stats.fieldsWithoutLimits++;
        if (!INCLUDE_NO_LIMIT) {
          return;
        }
      }

      const shortId = getShortFieldId(field.id);
      const limit = hasLimit ? parseInt(maxLength) : null;

      // Build field info object
      const fieldInfo = {
        limit: limit,
        label: getFieldLabel(field),
        type: field.tagName.toLowerCase(),
        fullId: field.id,
        visible: field.offsetParent !== null,
        currentLength: field.value.length,
        currentValue: field.value
      };

      // Add to character limits map
      characterLimits[field.id] = fieldInfo;

      // Group by limit
      if (hasLimit) {
        if (!limitGroups[limit]) {
          limitGroups[limit] = [];
        }
        limitGroups[limit].push({
          shortId: shortId,
          fullId: field.id,
          label: fieldInfo.label
        });
      }
    });

    return {
      pageInfo,
      stats,
      characterLimits,
      limitGroups
    };
  }

  // Extract and display results
  const results = extractCharacterLimits();

  // Output statistics
  console.log('Character Limit Detection Complete!');
  console.log('====================================');
  console.log(`Total text fields: ${results.stats.totalFields}`);
  console.log(`Fields with character limits: ${results.stats.fieldsWithLimits}`);
  console.log(`Fields without limits: ${results.stats.fieldsWithoutLimits}`);
  if (results.stats.skippedHelppop > 0) {
    console.log(`Help popups skipped: ${results.stats.skippedHelppop}`);
  }
  console.log('====================================');

  // Output limit groups summary
  console.log('\nCharacter Limit Summary:');
  console.log('========================');
  const limitCounts = Object.keys(results.limitGroups).sort((a, b) => parseInt(a) - parseInt(b));
  limitCounts.forEach(limit => {
    console.log(`${limit} characters: ${results.limitGroups[limit].length} fields`);
  });
  console.log('========================\n');

  // Display most restrictive limits (20 chars or less)
  const restrictiveFields = Object.entries(results.characterLimits)
    .filter(([id, info]) => info.limit && info.limit <= 20)
    .map(([id, info]) => ({
      id: getShortFieldId(id),
      limit: info.limit,
      label: info.label,
      currentLength: info.currentLength
    }));

  if (restrictiveFields.length > 0) {
    console.log('⚠️ CRITICAL: Fields with 20 or fewer characters:');
    console.log('================================================');
    restrictiveFields.forEach(field => {
      const warning = field.currentLength > field.limit ? ' ⚠️ OVER LIMIT!' : '';
      console.log(`${field.limit} chars: ${field.label || field.id}${warning}`);
      console.log(`  ID: ${field.id}`);
      console.log(`  Current: ${field.currentLength}/${field.limit}\n`);
    });
  }

  // Create clean output for copying
  const cleanOutput = {
    ...results.pageInfo,
    summary: {
      totalFields: results.stats.totalFields,
      fieldsWithLimits: results.stats.fieldsWithLimits,
      limitDistribution: Object.keys(results.limitGroups).sort((a, b) => parseInt(a) - parseInt(b)).map(limit => ({
        limit: parseInt(limit),
        count: results.limitGroups[limit].length
      }))
    },
    characterLimits: results.characterLimits,
    limitGroups: results.limitGroups
  };

  // Log the JSON for copying
  console.log('\nJSON Output (copy this):');
  console.log('========================');
  console.log(JSON.stringify(cleanOutput, null, 2));

  // Also copy to clipboard if possible
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(JSON.stringify(cleanOutput, null, 2))
      .then(() => {
        console.log('\n✅ Results copied to clipboard!');
        console.log('You can paste this into a .json file for reference.');
      })
      .catch(err => {
        console.log('\n❌ Could not copy to clipboard:', err);
        console.log('Please manually copy the JSON output above.');
      });
  } else {
    console.log('\nℹ️ Clipboard API not available. Please manually copy the JSON output above.');
  }

  // Return results for further processing if needed
  return results;
})();
