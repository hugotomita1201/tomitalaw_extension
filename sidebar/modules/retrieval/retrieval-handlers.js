/**
 * DS-160 Retrieval Module Event Handlers
 * To be integrated into sidebar.js setupModuleHandlers() function
 */

async function setupRetrievalHandlers() {
  // Initialize service
  await window.ds160RetrievalService.init();

  // State
  let editingId = null;
  let currentSortOrder = 'urgent-first';

  // Get sort function based on current sort order
  function getSortFunction() {
    const sortFunctions = {
      'urgent-first': (a, b) => {
        const urgencyOrder = { expired: 0, critical: 1, warning: 2, safe: 3 };
        return urgencyOrder[a.expirationStatus.urgency] - urgencyOrder[b.expirationStatus.urgency];
      },
      'urgent-last': (a, b) => {
        const urgencyOrder = { expired: 0, critical: 1, warning: 2, safe: 3 };
        return urgencyOrder[b.expirationStatus.urgency] - urgencyOrder[a.expirationStatus.urgency];
      },
      'app-id': (a, b) => a.applicationId.localeCompare(b.applicationId),
      'surname': (a, b) => a.surname.localeCompare(b.surname),
      'date-added': (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
    };
    return sortFunctions[currentSortOrder];
  }

  // Render applications list
  function renderApplicationsList() {
    const listContainer = document.getElementById('retrieval-list');
    const apps = window.ds160RetrievalService.getApplicationsWithStatus();

    if (apps.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p class="text-muted">No applications stored yet.</p>
          <p class="text-sm text-muted">Click "Add New" or "Import JSON" to get started.</p>
        </div>
      `;
      return;
    }

    // Sort by current sort order
    apps.sort(getSortFunction());

    listContainer.innerHTML = apps.map(app => `
      <div class="app-item" data-id="${app.id}">
        <div class="app-header">
          <div>
            <span class="app-id">${app.applicationId}</span>
            <span class="app-surname">${app.surname}</span>
          </div>
          <div class="app-status" style="color: ${app.expirationStatus.color};">
            <span class="status-indicator" style="background-color: ${app.expirationStatus.color};"></span>
            ${app.expirationStatus.message}
          </div>
        </div>
        <div class="app-details">
          📅 Year: ${app.yearOfBirth} | Last accessed: ${app.expirationStatus.lastAccessedDate} (${app.expirationStatus.daysSinceAccess} days ago)
        </div>
        ${app.notes ? `<div class="app-notes">📝 ${app.notes}</div>` : ''}
        <div class="app-actions">
          <button class="btn btn-sm btn-primary auto-fill-btn" data-id="${app.id}">
            🚀 Auto-Fill
          </button>
          <button class="btn btn-sm btn-outline update-date-btn" data-id="${app.id}">
            🔄 Update Date
          </button>
          <button class="btn btn-sm btn-outline edit-btn" data-id="${app.id}">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-outline delete-btn" data-id="${app.id}">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    attachAppItemListeners();
  }

  // Attach listeners to app item buttons
  function attachAppItemListeners() {
    // Auto-fill buttons
    document.querySelectorAll('.auto-fill-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await handleAutoFill(id);
      });
    });

    // Update Date buttons
    document.querySelectorAll('.update-date-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await window.ds160RetrievalService.updateLastAccessed(id);
        showStatus('✅ Date updated - 30 days refreshed', 'success');
        renderApplicationsList();
      });
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        showEditForm(id);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await handleDelete(id);
      });
    });
  }

  // Handle auto-fill
  async function handleAutoFill(id) {
    console.log('[RETRIEVAL-HANDLER] Auto-fill clicked for ID:', id);

    const app = window.ds160RetrievalService.applications.find(a => a.id === id);
    if (!app) {
      console.error('[RETRIEVAL-HANDLER] Application not found:', id);
      return;
    }

    console.log('[RETRIEVAL-HANDLER] Application found:', app);

    // Send message to content script
    console.log('[RETRIEVAL-HANDLER] Querying active tab...');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('[RETRIEVAL-HANDLER] Tabs query result:', tabs);

      if (tabs[0]) {
        console.log('[RETRIEVAL-HANDLER] Active tab found:', tabs[0].id, tabs[0].url);

        const message = {
          action: 'fillRetrievalForm',
          module: 'ds160-retrieval',
          data: {
            applicationId: app.applicationId,
            surname: app.surname,
            yearOfBirth: app.yearOfBirth,
            motherMotherName: app.motherMotherName
          }
        };

        console.log('[RETRIEVAL-HANDLER] Sending message to tab:', message);

        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          console.log('[RETRIEVAL-HANDLER] Response received:', response);
          console.log('[RETRIEVAL-HANDLER] Chrome runtime error:', chrome.runtime.lastError);

          if (chrome.runtime.lastError) {
            console.error('[RETRIEVAL-HANDLER] Error sending message:', chrome.runtime.lastError);
            showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
            return;
          }

          if (response && response.success) {
            console.log('[RETRIEVAL-HANDLER] Fill successful!');
            showStatus('✅ Form filled successfully! Solve the captcha and click "Retrieve Application"', 'success');
            // Refresh list to show updated "last accessed" time
            renderApplicationsList();
          } else {
            console.error('[RETRIEVAL-HANDLER] Fill failed:', response);
            showStatus('❌ ' + (response?.error || 'Failed to fill form'), 'error');
          }
        });
      } else {
        console.error('[RETRIEVAL-HANDLER] No active tab found');
        showStatus('Error: No active tab found', 'error');
      }
    });
  }

  // Show add/edit form
  function showEditForm(id = null) {
    editingId = id;
    const form = document.getElementById('retrieval-form');
    const title = document.getElementById('form-title');

    if (id) {
      // Edit mode
      const app = window.ds160RetrievalService.applications.find(a => a.id === id);
      if (app) {
        title.textContent = 'Edit Application';
        document.getElementById('form-appId').value = app.applicationId;
        document.getElementById('form-surname').value = app.surname;
        document.getElementById('form-year').value = app.yearOfBirth;
        document.getElementById('form-mother').value = app.motherMotherName;
        document.getElementById('form-notes').value = app.notes || '';
      }
    } else {
      // Add mode
      title.textContent = 'Add New Application';
      clearForm();
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  // Clear form
  function clearForm() {
    document.getElementById('form-appId').value = '';
    document.getElementById('form-surname').value = '';
    document.getElementById('form-year').value = '';
    document.getElementById('form-mother').value = 'HUGO';  // Default security answer
    document.getElementById('form-notes').value = '';
  }

  // Hide form
  function hideForm() {
    document.getElementById('retrieval-form').style.display = 'none';
    editingId = null;
  }

  // Handle save
  async function handleSave() {
    const data = {
      applicationId: document.getElementById('form-appId').value.trim().toUpperCase(),
      surname: document.getElementById('form-surname').value.trim().toUpperCase(),
      yearOfBirth: document.getElementById('form-year').value.trim(),
      motherMotherName: document.getElementById('form-mother').value.trim().toUpperCase(),
      notes: document.getElementById('form-notes').value.trim()
    };

    // Validate
    if (!data.applicationId || !data.surname || !data.yearOfBirth || !data.motherMotherName) {
      showStatus('❌ Please fill all required fields', 'error');
      return;
    }

    // Validate year format
    if (!/^\d{4}$/.test(data.yearOfBirth)) {
      showStatus('❌ Year of birth must be 4 digits (e.g., 1968)', 'error');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await window.ds160RetrievalService.updateApplication(editingId, data);
        showStatus('✅ Application updated successfully', 'success');
      } else {
        // Add new
        await window.ds160RetrievalService.addApplication(data);
        showStatus('✅ Application added successfully', 'success');
      }

      hideForm();
      renderApplicationsList();
    } catch (error) {
      showStatus('❌ ' + error.message, 'error');
    }
  }

  // Handle delete
  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      await window.ds160RetrievalService.deleteApplication(id);
      showStatus('✅ Application deleted', 'success');
      renderApplicationsList();
    } catch (error) {
      showStatus('❌ ' + error.message, 'error');
    }
  }

  // Show import form
  function handleImport() {
    const form = document.getElementById('import-form');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('import-json-text').value = ''; // Clear textarea
  }

  // Hide import form
  function hideImportForm() {
    document.getElementById('import-form').style.display = 'none';
    document.getElementById('import-json-text').value = '';
  }

  // Handle import from pasted JSON
  async function handleImportFromPaste() {
    const jsonText = document.getElementById('import-json-text').value.trim();

    if (!jsonText) {
      showStatus('❌ Please paste JSON text', 'error');
      return;
    }

    try {
      const result = await window.ds160RetrievalService.importFromJSON(jsonText);
      showStatus(`✅ Imported ${result.imported} applications`, 'success');
      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
        showStatus(`⚠️ ${result.errors.length} applications skipped (duplicates or errors)`, 'warning');
      }
      hideImportForm();
      renderApplicationsList();
    } catch (error) {
      showStatus('❌ ' + error.message, 'error');
    }
  }

  // Handle import from file
  function handleImportFromFile() {
    document.getElementById('retrieval-file-input').click();
  }

  // Process imported file
  async function processImportedFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await window.ds160RetrievalService.importFromJSON(e.target.result);
        showStatus(`✅ Imported ${result.imported} applications`, 'success');
        if (result.errors.length > 0) {
          console.warn('Import errors:', result.errors);
          showStatus(`⚠️ ${result.errors.length} applications skipped (duplicates or errors)`, 'warning');
        }
        hideImportForm();
        renderApplicationsList();
      } catch (error) {
        showStatus('❌ ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // Handle export
  function handleExport() {
    try {
      const json = window.ds160RetrievalService.exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ds160-retrieval-apps-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('✅ Applications exported', 'success');
    } catch (error) {
      showStatus('❌ ' + error.message, 'error');
    }
  }

  // Handle edit JSON
  function handleEditJSON() {
    const form = document.getElementById('edit-json-form');
    const textarea = document.getElementById('edit-json-text');

    // Load current JSON (pretty-printed for readability)
    const json = window.ds160RetrievalService.exportToJSON();
    const prettyJSON = JSON.stringify(JSON.parse(json), null, 2);
    textarea.value = prettyJSON;

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  // Hide edit JSON form
  function hideEditJSONForm() {
    document.getElementById('edit-json-form').style.display = 'none';
    document.getElementById('edit-json-text').value = '';
  }

  // Handle save JSON
  async function handleSaveJSON() {
    const jsonText = document.getElementById('edit-json-text').value.trim();

    if (!jsonText) {
      showStatus('❌ JSON cannot be empty', 'error');
      return;
    }

    try {
      // Validate JSON
      JSON.parse(jsonText);

      // Import the edited JSON (this will replace all data)
      const result = await window.ds160RetrievalService.importFromJSON(jsonText);
      showStatus(`✅ Saved! ${result.imported} applications loaded`, 'success');
      if (result.errors.length > 0) {
        console.warn('Save errors:', result.errors);
        showStatus(`⚠️ ${result.errors.length} applications had errors`, 'warning');
      }

      hideEditJSONForm();
      renderApplicationsList();
    } catch (error) {
      showStatus('❌ Invalid JSON: ' + error.message, 'error');
    }
  }

  // Handle clear all JSON
  async function handleClearJSON() {
    const count = window.ds160RetrievalService.applications.length;

    if (count === 0) {
      showStatus('ℹ️ No applications to clear', 'info');
      return;
    }

    // Confirm before clearing
    if (!confirm(`Are you sure you want to delete all ${count} applications? This cannot be undone.`)) {
      return;
    }

    try {
      // Clear all applications
      await window.ds160RetrievalService.clearAllApplications();

      showStatus('✅ All applications cleared', 'success');
      hideEditJSONForm();
      renderApplicationsList();
    } catch (error) {
      showStatus('❌ ' + error.message, 'error');
    }
  }

  // Handle search
  function handleSearch(query) {
    if (!query.trim()) {
      renderApplicationsList();
      return;
    }

    const results = window.ds160RetrievalService.searchApplications(query);
    const listContainer = document.getElementById('retrieval-list');

    if (results.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p class="text-muted">No applications found matching "${query}"</p>
        </div>
      `;
      return;
    }

    // Render filtered results (reuse existing render logic)
    const appsWithStatus = results.map(app => ({
      ...app,
      expirationStatus: window.ds160RetrievalService.getExpirationStatus(app)
    }));

    // Sort filtered results
    appsWithStatus.sort(getSortFunction());

    listContainer.innerHTML = appsWithStatus.map(app => `
      <div class="app-item" data-id="${app.id}">
        <div class="app-header">
          <div>
            <span class="app-id">${app.applicationId}</span>
            <span class="app-surname">${app.surname}</span>
          </div>
          <div class="app-status" style="color: ${app.expirationStatus.color};">
            <span class="status-indicator" style="background-color: ${app.expirationStatus.color};"></span>
            ${app.expirationStatus.message}
          </div>
        </div>
        <div class="app-details">
          📅 Year: ${app.yearOfBirth} | Last accessed: ${app.expirationStatus.lastAccessedDate} (${app.expirationStatus.daysSinceAccess} days ago)
        </div>
        ${app.notes ? `<div class="app-notes">📝 ${app.notes}</div>` : ''}
        <div class="app-actions">
          <button class="btn btn-sm btn-primary auto-fill-btn" data-id="${app.id}">
            🚀 Auto-Fill
          </button>
          <button class="btn btn-sm btn-outline update-date-btn" data-id="${app.id}">
            🔄 Update Date
          </button>
          <button class="btn btn-sm btn-outline edit-btn" data-id="${app.id}">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-outline delete-btn" data-id="${app.id}">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

    attachAppItemListeners();
  }

  // Show status message
  function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }

  // Attach event listeners
  document.getElementById('retrieval-add-new').addEventListener('click', () => showEditForm());
  document.getElementById('retrieval-import').addEventListener('click', handleImport);
  document.getElementById('retrieval-export').addEventListener('click', handleExport);
  document.getElementById('form-save').addEventListener('click', handleSave);
  document.getElementById('form-cancel').addEventListener('click', hideForm);
  document.getElementById('import-from-paste').addEventListener('click', handleImportFromPaste);
  document.getElementById('import-from-file-btn').addEventListener('click', handleImportFromFile);
  document.getElementById('import-cancel').addEventListener('click', hideImportForm);
  document.getElementById('retrieval-edit-json').addEventListener('click', handleEditJSON);
  document.getElementById('edit-json-save').addEventListener('click', handleSaveJSON);
  document.getElementById('edit-json-clear').addEventListener('click', handleClearJSON);
  document.getElementById('edit-json-cancel').addEventListener('click', hideEditJSONForm);
  document.getElementById('retrieval-search').addEventListener('input', (e) => handleSearch(e.target.value));
  document.getElementById('retrieval-sort').addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    // Re-render with new sort order (respect current search if active)
    const searchQuery = document.getElementById('retrieval-search').value;
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      renderApplicationsList();
    }
  });
  document.getElementById('retrieval-file-input').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      processImportedFile(e.target.files[0]);
    }
  });

  // Initial render
  renderApplicationsList();
}
