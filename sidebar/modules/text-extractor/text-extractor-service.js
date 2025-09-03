/**
 * Text Extractor Service
 * Handles document processing and OpenAI API integration for text extraction
 * Completely isolated from other modules
 */

class TextExtractorService {
  constructor() {
    // Encrypted API key chunks - replace these with your encrypted values
    this.K1 = '=EwHVVxXbIBSMgHENYSBTUQW1IRd01HAlFjIDkBADIgAdIUHTUzKORw';
    this.K2 = 'MNQFAisVFFBWcydXQCsAPpUwXEo0Ub4jN8YwWRklNN0BMU9DOH0WcTp';
    this.K3 = 'nJcZzDDkhMyQ1HhggK44kEVNgL/QyHXEhADp0SUoDLQETGhERKu4ERN';
    this.K4 = 'YxHYxDM8UwPRQyPy0lZeJ2QVkRAVRhQdsBJ31iP9YDRHY1IGczPB8VN';
    
    this.apiKey = null;
    this.initialized = false;
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4o';
    this.maxTokens = 4096;
    this.temperature = 0.2; // Lower temperature for more consistent extraction
    
    // Extraction prompt for various document types
    this.EXTRACTION_PROMPT = `
Analyze this document image and extract all visible text and information.
Identify the document type and structure the extracted data appropriately.

Instructions:
1. Detect the document type (passport, driver_license, id_card, handwritten_form, typed_document, etc.)
2. Extract ALL visible text and data fields
3. Use clear, descriptive field names in snake_case
4. For dates, preserve the format as shown in the document
5. Include any document numbers, codes, or reference numbers
6. If text is unclear, include your best interpretation with a confidence note

Output as clean JSON with this structure:
{
  "document_type": "detected_type_here",
  "extracted_data": {
    // All extracted fields here
  },
  "metadata": {
    "extraction_confidence": 0.95,
    "language": "detected_language",
    "notes": "any relevant notes"
  }
}

For ID Documents (passport, license, ID card), include:
- full_name, document_number, date_of_birth, issue_date, expiry_date, 
- nationality/country, address, gender, etc.

For Handwritten Forms:
- Preserve the field labels exactly as written
- Extract the corresponding values

For General Documents:
- Organize by logical sections
- Preserve formatting structure where relevant

Extract all visible information and return as structured JSON.`;
  }
  
  /**
   * Decrypt the API key from encrypted chunks
   */
  decrypt() {
    // Reconstruct the encrypted string
    const encrypted = this.K1 + this.K2 + this.K3 + this.K4;
    const salt = 'tomitalaw-text-extractor-2024';
    
    // Reverse the encryption process
    // Step 1: Reverse back
    const reversed = encrypted.split('').reverse().join('');
    
    // Step 2: Base64 decode
    const decoded = atob(reversed);
    
    // Step 3: XOR with salt again (XOR is its own inverse)
    const unxored = decoded.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
    
    // Step 4: Reverse to get original
    return unxored.split('').reverse().join('');
  }
  
  /**
   * Initialize the service with decrypted API key
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if we have valid encrypted values
      if (!this.K1 || this.K1 === 'PLACEHOLDER_K1') {
        throw new Error('Text Extractor API key not configured. Please run the setup script to encrypt your API key.');
      }
      
      // Decrypt API key at runtime
      this.apiKey = this.decrypt();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize text extractor service:', error);
      throw new Error('Text extraction service initialization failed: ' + error.message);
    }
  }
  
  /**
   * Convert file to base64
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Extract base64 data (remove data:image/jpeg;base64, prefix)
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Convert PDF to image using PDF.js
   */
  async convertPDFToImage(file) {
    try {
      // Read PDF file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      // Get first page (usually contains the main ID/passport info)
      const pageNumber = 1;
      const page = await pdf.getPage(pageNumber);
      
      // Set scale for good quality (2.0 = 200% zoom)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to base64 PNG image
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      
      console.log('[TextExtractor] PDF converted to image successfully');
      return base64;
      
    } catch (error) {
      console.error('[TextExtractor] PDF conversion error:', error);
      throw new Error(`Failed to convert PDF: ${error.message}`);
    }
  }
  
  /**
   * Process image with OpenAI Vision API
   */
  async extractFromImage(file) {
    try {
      // Initialize if needed
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if file is PDF and convert to image if needed
      let base64Image;
      let mimeType = file.type;
      
      if (file.type === 'application/pdf') {
        console.log('[TextExtractor] Detected PDF file, converting to image...');
        base64Image = await this.convertPDFToImage(file);
        mimeType = 'image/png'; // PDF is converted to PNG
      } else {
        // Regular image file
        base64Image = await this.fileToBase64(file);
      }
      
      // Prepare the API request
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: this.EXTRACTION_PROMPT
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high" // High detail for better text extraction
                }
              }
            ]
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      };
      
      // Make API call
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse the response
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in API response');
      }
      
      // Try to parse as JSON
      try {
        // Extract JSON from the response (in case it's wrapped in markdown)
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        const extractedData = JSON.parse(jsonStr);
        
        return {
          success: true,
          data: extractedData,
          filename: file.name,
          timestamp: new Date().toISOString()
        };
      } catch (parseError) {
        // If JSON parsing fails, return raw text
        return {
          success: true,
          data: {
            document_type: 'unknown',
            extracted_data: {
              raw_text: content
            },
            metadata: {
              parse_error: 'Could not parse as JSON',
              extraction_confidence: 0.5
            }
          },
          filename: file.name,
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error('[TextExtractor] Extraction error:', error);
      return {
        success: false,
        error: error.message,
        filename: file.name
      };
    }
  }
  
  /**
   * Process multiple files
   */
  async extractFromMultipleFiles(files) {
    const results = [];
    
    for (const file of files) {
      const result = await this.extractFromImage(file);
      results.push(result);
      
      // Add small delay between requests to avoid rate limiting
      if (files.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  /**
   * Validate file type
   */
  isValidFileType(file) {
    const validTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf' // Note: PDF support would need additional handling
    ];
    
    return validTypes.includes(file.type);
  }
  
  /**
   * Format extracted data for display
   */
  formatExtractedData(data) {
    // Pretty print JSON with proper indentation
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Export data as JSON file
   */
  exportAsJson(data, filename = 'extracted_data.json') {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Store extraction history
   */
  async saveToHistory(extractionResult) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['textExtractor_history'], (result) => {
        const history = result.textExtractor_history || [];
        
        // Add new extraction to beginning
        history.unshift({
          ...extractionResult,
          id: Date.now().toString()
        });
        
        // Keep only last 10 extractions
        const trimmedHistory = history.slice(0, 10);
        
        chrome.storage.local.set({ 'textExtractor_history': trimmedHistory }, resolve);
      });
    });
  }
  
  /**
   * Get extraction history
   */
  async getHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['textExtractor_history'], (result) => {
        resolve(result.textExtractor_history || []);
      });
    });
  }
  
  /**
   * Clear history
   */
  async clearHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.remove('textExtractor_history', resolve);
    });
  }
}

// Export for use in UI module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextExtractorService;
}