class PhotoValidationService {
  constructor() {
    // These will be the encrypted chunks from setup script
    // Encrypted API key chunks
    this.K1 = '=cABFBwXYsQQtETJYUROElXHAg3ShIQGy8SGLMgQDExBiIAetAyOQZy';
    this.K2 = 'OUFgLDAgSAQFHBIEBrMDF4sBWfdjJ8QjaahTClYiL5cFBTF2WD5BMCB';
    this.K3 = 'UNXtCAD0xal8TWkQCANwQDQckCGsxHhJAdxJ2FD0iV+oCFHUAYekxVL';
    this.K4 = 'kxegM1ObgBDokwKctQYRpxPZ8TERMAKggxWd5iBO0Ta1sgCRZzKsgQN';
    
    this.apiKey = null;
    this.initialized = false;
  }
  
  decrypt() {
    // Reconstruct the encrypted string
    const encrypted = this.K1 + this.K2 + this.K3 + this.K4;
    const salt = 'tomitalaw-photo-validator-2024';
    
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
  
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Decrypt API key at runtime
      this.apiKey = this.decrypt();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize photo service:', error);
      throw new Error('Photo validation service initialization failed: ' + error.message);
    }
  }
  
  async validatePhoto(file) {
    // Initialize if needed
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Extract metadata
    const metadata = await this.extractMetadata(file);
    
    // Convert to base64
    const base64Image = await this.fileToBase64(file);
    
    // Load requirements
    const requirements = await this.loadRequirements();
    
    // Build prompt
    const prompt = this.buildValidationPrompt(metadata, requirements);
    
    try {
      // Call OpenAI GPT-4 Vision API directly
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: prompt 
                },
                { 
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }
      
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Photo validation failed: ${error.message}`);
    }
  }
  
  async extractMetadata(file) {
    const dimensions = await this.getImageDimensions(file);
    return {
      fileName: file.name,
      fileSize: file.size,
      fileSizeKB: (file.size / 1024).toFixed(2),
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      fileType: file.type,
      isJPEG: file.type === 'image/jpeg' || file.type === 'image/jpg',
      dimensions: dimensions,
      isSquare: dimensions.width === dimensions.height,
      meetsMinSize: dimensions.width >= 600 && dimensions.height >= 600,
      meetsMaxSize: dimensions.width <= 1200 && dimensions.height <= 1200,
      meetsSizeRequirements: dimensions.width >= 600 && dimensions.width <= 1200 && 
                             dimensions.height >= 600 && dimensions.height <= 1200
    };
  }
  
  async getImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          ratio: (img.width / img.height).toFixed(2)
        });
        URL.revokeObjectURL(img.src); // Clean up
      };
      img.src = URL.createObjectURL(file);
    });
  }
  
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data:image/jpeg;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  async loadRequirements() {
    // Load requirements from local JSON file
    const response = await fetch(chrome.runtime.getURL('data/photo/requirements.json'));
    return await response.json();
  }
  
  buildValidationPrompt(metadata, requirements) {
    return `You are a DS-160 passport photo validator. Analyze this photo against official US visa requirements.

PROVIDED METADATA:
- File Type: ${metadata.fileType} (JPEG required: ${metadata.isJPEG ? 'YES ✓' : 'NO ✗'})
- File Size: ${metadata.fileSizeKB} KB (max 240KB, ${metadata.fileSize <= 245760 ? 'PASS ✓' : 'FAIL ✗'})
- Dimensions: ${metadata.dimensions.width} x ${metadata.dimensions.height} pixels
- Square Aspect: ${metadata.isSquare ? 'YES ✓ (1:1)' : `NO ✗ (${metadata.dimensions.ratio}:1)`}
- Min Size (600x600): ${metadata.meetsMinSize ? 'PASS ✓' : 'FAIL ✗'}
- Max Size (1200x1200): ${metadata.meetsMaxSize ? 'PASS ✓' : 'FAIL ✗'}
- Compression: Cannot determine from metadata (requires analysis)

OFFICIAL REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

VALIDATION TASKS:

TECHNICAL CHECKS (use metadata provided):
1. File Format: Confirm JPEG format (metadata shows ${metadata.isJPEG ? 'JPEG' : 'NOT JPEG'})
2. File Size: Confirm ≤240KB (currently ${metadata.fileSizeKB} KB)
3. Dimensions: Confirm 600-1200px square (${metadata.dimensions.width}x${metadata.dimensions.height})
4. Aspect Ratio: Confirm 1:1 square (ratio is ${metadata.dimensions.ratio})
5. Color Depth: Assess if image appears to be 24-bit color (not grayscale)
6. Compression: Note if image shows compression artifacts (max 20:1 ratio)

COMPOSITION CHECKS (visual analysis):
7. Head Size: Estimate percentage of image height (chin to top of hair). Target: 50-70%
8. Eye Level: Estimate position from bottom as percentage. Target: 55-70%
9. Face Centering: Confirm face is centered horizontally

QUALITY CHECKS (visual analysis):
10. Background: Plain white or off-white, no patterns or shadows
11. Lighting: Even lighting on face, no harsh shadows
12. Expression: Neutral expression, both eyes open, mouth closed
13. Glasses: None allowed (except rare medical exceptions)
14. Head Covering: None allowed (except religious worn daily)
15. Photo Quality: Sharp focus, no blur, professional appearance

CRITICAL: Return ONLY valid JSON in this exact format:
{
  "overall_result": "PASS" or "FAIL" or "WARNING",
  "confidence_score": 0.00 to 1.00,
  "technical_checks": {
    "file_format": { "status": "PASS/FAIL", "detail": "JPEG format confirmed/not JPEG" },
    "file_size": { "status": "PASS/FAIL", "detail": "${metadata.fileSizeKB} KB of 240KB max" },
    "dimensions": { "status": "PASS/FAIL", "detail": "${metadata.dimensions.width}x${metadata.dimensions.height} pixels (600-1200 required)" },
    "aspect_ratio": { "status": "PASS/FAIL", "detail": "Square ${metadata.dimensions.ratio}:1 ratio" },
    "color_depth": { "status": "PASS/FAIL", "detail": "24-bit color/grayscale detected" },
    "compression": { "status": "PASS/WARNING/FAIL", "detail": "No artifacts/Some artifacts/Heavy compression" }
  },
  "composition_checks": {
    "head_size": { "status": "PASS/FAIL/WARNING", "detail": "Head is approximately X% of image height (target: 50-70%)" },
    "eye_level": { "status": "PASS/FAIL", "detail": "Eyes are approximately X% from bottom (target: 55-70%)" },
    "face_centered": { "status": "PASS/FAIL", "detail": "Face is centered/off-center horizontally" }
  },
  "quality_checks": {
    "background": { "status": "PASS/FAIL", "detail": "Background assessment" },
    "lighting": { "status": "PASS/FAIL", "detail": "Lighting quality" },
    "expression": { "status": "PASS/FAIL", "detail": "Expression check" },
    "glasses": { "status": "PASS/FAIL", "detail": "Glasses detection" },
    "head_covering": { "status": "PASS/FAIL", "detail": "Head covering check" }
  },
  "recommendations": ["List of specific fixes if needed"]
}`;
  }
}

export { PhotoValidationService };