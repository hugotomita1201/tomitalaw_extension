/**
 * Text Extractor UI Module
 * Handles the user interface for the text extraction tool
 * Provides drag-drop functionality and JSON display with copy features
 */

class TextExtractorUI {
  constructor() {
    this.service = new TextExtractorService();
    this.currentExtractions = [];
    this.selectedFiles = [];
  }
  
  /**
   * Initialize the module
   */
  async init() {
    console.log('[TextExtractor] Initializing UI...');
    this.setupEventListeners();
    await this.loadHistory();
  }
  
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Drag and drop zone
    const dropZone = document.getElementById('text-extractor-drop-zone');
    if (dropZone) {
      // Prevent default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, this.preventDefaults, false);
        document.body.addEventListener(eventName, this.preventDefaults, false);
      });
      
      // Highlight drop zone when item is dragged over it
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
      });
      
      // Handle dropped files
      dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
      
      // Click to select files
      dropZone.addEventListener('click', () => {
        document.getElementById('text-extractor-file-input').click();
      });
    }
    
    // File input
    const fileInput = document.getElementById('text-extractor-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
    
    // Process button
    const processBtn = document.getElementById('text-extractor-process-btn');
    if (processBtn) {
      processBtn.addEventListener('click', () => this.processFiles());
    }
    
    // Clear button
    const clearBtn = document.getElementById('text-extractor-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearResults());
    }
    
    // Export all button
    const exportBtn = document.getElementById('text-extractor-export-all');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAllResults());
    }
    
    // Clear history button
    const clearHistoryBtn = document.getElementById('text-extractor-clear-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }
  }
  
  /**
   * Prevent default drag behaviors
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  /**
   * Highlight drop zone
   */
  highlight(element) {
    element.classList.add('drag-over');
  }
  
  /**
   * Remove highlight from drop zone
   */
  unhighlight(element) {
    element.classList.remove('drag-over');
  }
  
  /**
   * Handle dropped files
   */
  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    this.handleFiles(files);
  }
  
  /**
   * Handle file selection
   */
  handleFileSelect(e) {
    const files = e.target.files;
    this.handleFiles(files);
  }
  
  /**
   * Process selected files
   */
  handleFiles(files) {
    const validFiles = [];
    const fileList = document.getElementById('text-extractor-file-list');
    
    // Clear previous file list
    fileList.innerHTML = '';
    
    // Validate and display files
    ([...files]).forEach(file => {
      if (this.service.isValidFileType(file)) {
        validFiles.push(file);
        this.displayFilePreview(file, fileList);
      } else {
        this.showStatus(`Invalid file type: ${file.name}. Please use JPG, PNG, or similar image formats.`, 'error');
      }
    });
    
    this.selectedFiles = validFiles;
    
    // Enable/disable process button
    const processBtn = document.getElementById('text-extractor-process-btn');
    processBtn.disabled = validFiles.length === 0;
    
    if (validFiles.length > 0) {
      this.showStatus(`${validFiles.length} file(s) ready for processing`, 'info');
    }
  }
  
  /**
   * Display file preview in list
   */
  displayFilePreview(file, container) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <span class="file-icon">📄</span>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${this.formatFileSize(file.size)}</span>
    `;
    container.appendChild(fileItem);
  }
  
  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Process selected files
   */
  async processFiles() {
    if (this.selectedFiles.length === 0) {
      this.showStatus('Please select files to process', 'error');
      return;
    }
    
    // Show processing state
    this.showProcessing(true);
    this.showStatus('Processing files...', 'info');
    
    try {
      // Process files
      const results = await this.service.extractFromMultipleFiles(this.selectedFiles);
      
      // Store successful extractions
      this.currentExtractions = results.filter(r => r.success);
      
      // Display results
      this.displayResults(results);
      
      // Save to history
      for (const result of results) {
        if (result.success) {
          await this.service.saveToHistory(result);
        }
      }
      
      // Update history display
      await this.loadHistory();
      
      // Show completion status
      const successCount = results.filter(r => r.success).length;
      this.showStatus(`Processed ${successCount} of ${results.length} files successfully`, 'success');
      
    } catch (error) {
      console.error('[TextExtractor] Processing error:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    } finally {
      this.showProcessing(false);
    }
  }
  
  /**
   * Display extraction results
   */
  displayResults(results) {
    const resultsContainer = document.getElementById('text-extractor-results');
    resultsContainer.innerHTML = '';
    
    results.forEach((result, index) => {
      const resultCard = document.createElement('div');
      resultCard.className = `result-card ${result.success ? 'success' : 'error'}`;
      
      if (result.success) {
        resultCard.innerHTML = `
          <div class="result-header">
            <h3>${result.filename}</h3>
            <div class="result-actions">
              <button class="copy-all-btn" data-index="${index}">📋 Copy JSON</button>
              <button class="export-btn" data-index="${index}">💾 Export</button>
              <button class="expand-btn" data-index="${index}">▼</button>
            </div>
          </div>
          <div class="result-content" id="result-content-${index}">
            <div class="document-type">
              Document Type: <strong>${result.data.document_type || 'Unknown'}</strong>
            </div>
            <div class="extracted-fields">
              ${this.renderExtractedFields(result.data.extracted_data, index)}
            </div>
            <div class="json-view">
              <h4>Raw JSON:</h4>
              <pre>${this.service.formatExtractedData(result.data)}</pre>
            </div>
          </div>
        `;
      } else {
        resultCard.innerHTML = `
          <div class="result-header error">
            <h3>${result.filename}</h3>
            <span class="error-message">Failed: ${result.error}</span>
          </div>
        `;
      }
      
      resultsContainer.appendChild(resultCard);
    });
    
    // Add event listeners to result actions
    this.setupResultEventListeners();
  }
  
  /**
   * Render extracted fields with copy buttons
   */
  renderExtractedFields(data, resultIndex) {
    if (!data || typeof data !== 'object') {
      return '<p>No structured data extracted</p>';
    }
    
    let html = '<div class="field-list">';
    
    Object.entries(data).forEach(([key, value]) => {
      const fieldId = `field-${resultIndex}-${key}`;
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      
      html += `
        <div class="field-item">
          <span class="field-label">${displayKey}:</span>
          <span class="field-value" id="${fieldId}">${displayValue}</span>
          <button class="copy-field-btn" data-field-id="${fieldId}" title="Copy this value">📋</button>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Setup event listeners for result actions
   */
  setupResultEventListeners() {
    // Copy all JSON buttons
    document.querySelectorAll('.copy-all-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.copyFullJson(index);
      });
    });
    
    // Export buttons
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.exportSingleResult(index);
      });
    });
    
    // Expand/collapse buttons
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        this.toggleResultExpansion(index, e.target);
      });
    });
    
    // Copy field buttons
    document.querySelectorAll('.copy-field-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fieldId = e.target.dataset.fieldId;
        this.copyFieldValue(fieldId);
      });
    });
  }
  
  /**
   * Copy full JSON for a result
   */
  copyFullJson(index) {
    const result = this.currentExtractions[index];
    if (result) {
      const jsonStr = JSON.stringify(result.data, null, 2);
      this.copyToClipboard(jsonStr);
      this.showStatus('JSON copied to clipboard!', 'success');
    }
  }
  
  /**
   * Copy individual field value
   */
  copyFieldValue(fieldId) {
    const element = document.getElementById(fieldId);
    if (element) {
      this.copyToClipboard(element.textContent);
      this.showStatus('Value copied to clipboard!', 'success');
    }
  }
  
  /**
   * Copy to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
  
  /**
   * Export single result
   */
  exportSingleResult(index) {
    const result = this.currentExtractions[index];
    if (result) {
      const filename = `extracted_${result.filename.replace(/\.[^/.]+$/, '')}_${Date.now()}.json`;
      this.service.exportAsJson(result.data, filename);
      this.showStatus(`Exported: ${filename}`, 'success');
    }
  }
  
  /**
   * Export all results
   */
  exportAllResults() {
    if (this.currentExtractions.length === 0) {
      this.showStatus('No results to export', 'error');
      return;
    }
    
    const allData = this.currentExtractions.map(r => ({
      filename: r.filename,
      timestamp: r.timestamp,
      data: r.data
    }));
    
    const filename = `extracted_batch_${Date.now()}.json`;
    this.service.exportAsJson(allData, filename);
    this.showStatus(`Exported ${allData.length} results to ${filename}`, 'success');
  }
  
  /**
   * Toggle result expansion
   */
  toggleResultExpansion(index, button) {
    const content = document.getElementById(`result-content-${index}`);
    if (content) {
      content.classList.toggle('collapsed');
      button.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
    }
  }
  
  /**
   * Clear results
   */
  clearResults() {
    this.currentExtractions = [];
    this.selectedFiles = [];
    document.getElementById('text-extractor-results').innerHTML = '';
    document.getElementById('text-extractor-file-list').innerHTML = '';
    document.getElementById('text-extractor-file-input').value = '';
    document.getElementById('text-extractor-process-btn').disabled = true;
    this.showStatus('Results cleared', 'info');
  }
  
  /**
   * Load and display history
   */
  async loadHistory() {
    const history = await this.service.getHistory();
    const historyContainer = document.getElementById('text-extractor-history');
    
    if (!historyContainer) return;
    
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="no-history">No extraction history</p>';
      return;
    }
    
    historyContainer.innerHTML = history.map((item, index) => `
      <div class="history-item">
        <span class="history-filename">${item.filename}</span>
        <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
        <button class="history-load-btn" data-index="${index}">Load</button>
      </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.history-load-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const historyItem = history[index];
        if (historyItem) {
          this.currentExtractions = [historyItem];
          this.displayResults([historyItem]);
          this.showStatus('Loaded from history', 'success');
        }
      });
    });
  }
  
  /**
   * Clear history
   */
  async clearHistory() {
    if (confirm('Are you sure you want to clear all extraction history?')) {
      await this.service.clearHistory();
      await this.loadHistory();
      this.showStatus('History cleared', 'info');
    }
  }
  
  /**
   * Show processing state
   */
  showProcessing(show) {
    const processingDiv = document.getElementById('text-extractor-processing');
    if (processingDiv) {
      processingDiv.style.display = show ? 'block' : 'none';
    }
    
    const processBtn = document.getElementById('text-extractor-process-btn');
    if (processBtn) {
      processBtn.disabled = show;
      processBtn.textContent = show ? 'Processing...' : 'Process Files';
    }
  }
  
  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('text-extractor-status');
    if (statusDiv) {
      statusDiv.className = `status-message ${type}`;
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Initialize when module is loaded
let textExtractorUI = null;

function initTextExtractor() {
  console.log('[TextExtractor] Module loading...');
  textExtractorUI = new TextExtractorUI();
  textExtractorUI.init();
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initTextExtractor, TextExtractorUI };
}