// Japanese Postal Code Service
// Uses ZipCloud API for address lookup

export class PostalCodeService {
  constructor() {
    // ZipCloud API - Free, no authentication required
    this.apiUrl = 'https://zipcloud.ibsnet.co.jp/api/search';
  }

  /**
   * Lookup address by postal code
   * @param {string} postalCode - Japanese postal code
   * @returns {Object} Address data or error
   */
  async lookup(postalCode) {
    try {
      // Normalize postal code
      const normalized = this.normalizePostalCode(postalCode);
      if (!normalized) {
        return {
          success: false,
          error: 'Invalid postal code format. Please enter 7 digits.'
        };
      }

      // Call ZipCloud API
      const response = await fetch(`${this.apiUrl}?zipcode=${normalized}`);
      const data = await response.json();

      // Handle corporate postal codes (4th digit is 8 or 9)
      if ((!data.results || data.results.length === 0) && 
          (normalized[3] === '8' || normalized[3] === '9')) {
        // Try base postal code for corporate addresses
        const baseCode = this.getBasePostalCode(normalized);
        const baseResponse = await fetch(`${this.apiUrl}?zipcode=${baseCode}`);
        const baseData = await baseResponse.json();
        
        if (baseData.status === 200 && baseData.results?.length > 0) {
          return this.formatResponse(baseData.results[0], normalized, true);
        }
      }

      // Check for valid response
      if (data.status === 200 && data.results?.length > 0) {
        return this.formatResponse(data.results[0], normalized, false);
      } else if (data.status === 200 && !data.results) {
        return {
          success: false,
          error: `Postal code ${this.formatPostalCode(normalized)} not found in database.`
        };
      } else {
        return {
          success: false,
          error: 'Failed to lookup postal code. Please try again.'
        };
      }

    } catch (error) {
      console.error('Postal code lookup error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Normalize postal code to 7 digits
   * @param {string} input - Input postal code
   * @returns {string|null} Normalized 7-digit code
   */
  normalizePostalCode(input) {
    if (!input) return null;
    
    // Remove all non-numeric characters
    const cleaned = input.toString().replace(/[^0-9]/g, '');
    
    // Must be exactly 7 digits
    return cleaned.length === 7 ? cleaned : null;
  }

  /**
   * Format postal code as XXX-XXXX
   * @param {string} postalCode - 7-digit postal code
   * @returns {string} Formatted postal code
   */
  formatPostalCode(postalCode) {
    if (!postalCode || postalCode.length !== 7) return postalCode;
    return `${postalCode.slice(0, 3)}-${postalCode.slice(3)}`;
  }

  /**
   * Get base postal code for corporate addresses
   * @param {string} postalCode - Corporate postal code
   * @returns {string} Base area postal code
   */
  getBasePostalCode(postalCode) {
    // Special handling for known corporate areas
    if (postalCode.startsWith('2208')) {
      // Minatomirai corporate codes
      return '2200012';
    }
    // Generic fallback: XXX-8XXX → XXX-0001
    return postalCode.slice(0, 3) + '0001';
  }

  /**
   * Format API response into structured address data
   * @param {Object} result - API result object
   * @param {string} postalCode - Original postal code
   * @param {boolean} isCorporate - Whether this is a corporate code
   * @returns {Object} Formatted address data
   */
  formatResponse(result, postalCode, isCorporate) {
    const formatted = this.formatPostalCode(postalCode);
    
    return {
      success: true,
      isCorporate: isCorporate,
      data: {
        // Full formatted address
        fullAddress: `${result.address1}${result.address2}${result.address3}`,
        
        // Individual components for visa forms
        prefecture: result.address1,        // 東京都 (State field)
        city: result.address2,              // 渋谷区 (City field)
        street: result.address3,            // 渋谷 (Street/Area field)
        postalCode: formatted,              // 150-0002 (formatted)
        
        // Address lines for forms that use line format
        addressLine1: result.address1 + result.address2,  // Prefecture + City
        addressLine2: result.address3,                     // Street/Area
        
        // Kana readings (useful for some forms)
        prefectureKana: result.kana1,
        cityKana: result.kana2,
        streetKana: result.kana3,
        
        // Original raw data
        raw: result
      }
    };
  }

  /**
   * Extract building/room info from an address string
   * @param {string} address - Address that may contain building info
   * @returns {string} Extracted building info or empty string
   */
  extractBuildingInfo(address) {
    if (!address) return '';
    
    // Common patterns for building/room numbers
    const patterns = [
      /\d+F/i,           // Floor numbers (3F, 10F)
      /\d+-\d+-\d+/,     // Building-Floor-Room (1-2-3)
      /\d+号室/,          // Room numbers (101号室)
      /[A-Z]\d+/,        // Building codes (B101)
      /\d+階/            // Floor in Japanese (3階)
    ];
    
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) return match[0];
    }
    
    return '';
  }
}