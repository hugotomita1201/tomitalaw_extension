// Japanese Postal Code Service
// Primary: Backend proxy (Japan Post API + ZipCloud fallback)
// Fallback: Direct ZipCloud API call

export class PostalCodeService {
  constructor() {
    // Backend API endpoint (uses Japan Post API)
    this.backendUrl = 'https://i129-backend-452425445497.us-central1.run.app/api/postal-lookup';
    
    // Direct ZipCloud API (fallback if backend unavailable)
    this.zipCloudUrl = 'https://zipcloud.ibsnet.co.jp/api/search';
    
    // For local development, uncomment this:
    // this.backendUrl = 'http://localhost:3000/api/postal-lookup';
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

      // Try backend API first (has Japan Post + ZipCloud)
      try {
        console.log('Trying backend API for:', normalized);
        const response = await fetch(`${this.backendUrl}?code=${normalized}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log(`✓ Found via backend (${data.source})`);
            return data;
          } else if (data.notFound) {
            // Backend checked both APIs and found nothing
            return data;
          }
        }
      } catch (backendError) {
        console.warn('Backend API unavailable, trying direct ZipCloud:', backendError.message);
      }

      // Fallback to direct ZipCloud API if backend is unavailable
      try {
        console.log('Trying direct ZipCloud API for:', normalized);
        const response = await fetch(`${this.zipCloudUrl}?zipcode=${normalized}`);
        const data = await response.json();

        // Check for valid response
        if (data.status === 200 && data.results?.length > 0) {
          console.log('✓ Found via direct ZipCloud');
          return this.formatZipCloudResponse(data.results[0], normalized);
        } else if (data.status === 200 && !data.results) {
          // Postal code not found
          return {
            success: false,
            error: `Postal code ${this.formatPostalCode(normalized)} not found. Please enter the address manually.`,
            notFound: true
          };
        }
      } catch (zipCloudError) {
        console.warn('Direct ZipCloud also failed:', zipCloudError.message);
      }

      // All methods failed
      return {
        success: false,
        error: 'Failed to lookup postal code. Please try again or enter the address manually.'
      };

    } catch (error) {
      console.error('Postal code lookup error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Lookup by digital address (7-character code)
   * Only available via backend (Japan Post API)
   * @param {string} digitalAddress - Digital address code
   * @returns {Object} Address data or error
   */
  async lookupDigitalAddress(digitalAddress) {
    try {
      if (!digitalAddress || digitalAddress.length !== 7) {
        return {
          success: false,
          error: 'Digital address must be exactly 7 characters (e.g., A7E2FK2)'
        };
      }

      // Digital address only works via backend
      const response = await fetch(`${this.backendUrl}?code=${digitalAddress}&type=digital`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      return {
        success: false,
        error: 'Failed to lookup digital address. Backend service may be unavailable.',
        notFound: true
      };
    } catch (error) {
      console.error('Digital address lookup error:', error);
      return {
        success: false,
        error: 'Failed to lookup digital address. Please try again.'
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
   * Format ZipCloud API response into structured address data
   * @param {Object} result - API result object
   * @param {string} postalCode - Original postal code
   * @returns {Object} Formatted address data
   */
  formatZipCloudResponse(result, postalCode) {
    const formatted = this.formatPostalCode(postalCode);
    
    return {
      success: true,
      source: 'ZipCloud',
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