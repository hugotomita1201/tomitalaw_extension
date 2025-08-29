// Japanese Postal Code Service
// Primary: ZipCloud API for regular postal codes
// Fallback: Local business codes database

export class PostalCodeService {
  constructor() {
    // ZipCloud API for regular postal codes
    this.zipCloudUrl = 'https://zipcloud.ibsnet.co.jp/api/search';
    
    // Local business codes cache
    this.businessCodes = null;
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

      // 1. Try ZipCloud API first (works for most regular postal codes)
      try {
        console.log('Trying ZipCloud API for:', normalized);
        const response = await fetch(`${this.zipCloudUrl}?zipcode=${normalized}`);
        const data = await response.json();

        // Check for valid response
        if (data.status === 200 && data.results?.length > 0) {
          console.log('✓ Found via ZipCloud');
          return this.formatZipCloudResponse(data.results[0], normalized);
        }
      } catch (zipCloudError) {
        console.warn('ZipCloud API failed:', zipCloudError.message);
      }

      // 2. Try local business codes database (corporate postal codes)
      console.log('Checking local business codes for:', normalized);
      const businessResult = await this.lookupBusinessCode(normalized);
      if (businessResult.success) {
        console.log('✓ Found in business codes database');
        return businessResult;
      }

      // 3. Not found anywhere
      return {
        success: false,
        error: `Postal code ${this.formatPostalCode(normalized)} not found. Please enter the address manually.`,
        notFound: true
      };

    } catch (error) {
      console.error('Postal code lookup error:', error);
      return {
        success: false,
        error: 'Failed to lookup postal code. Please try again or enter the address manually.'
      };
    }
  }

  /**
   * Load business codes database
   * @returns {Object} Business codes indexed by postal code
   */
  async loadBusinessCodes() {
    if (!this.businessCodes) {
      try {
        const response = await fetch(chrome.runtime.getURL('data/postal/business-codes.json'));
        this.businessCodes = await response.json();
        console.log(`Loaded ${Object.keys(this.businessCodes).length} business postal codes`);
      } catch (error) {
        console.error('Failed to load business codes:', error);
        this.businessCodes = {};
      }
    }
    return this.businessCodes;
  }

  /**
   * Lookup postal code in local business codes database
   * @param {string} postalCode - Normalized 7-digit postal code
   * @returns {Object} Address data or not found
   */
  async lookupBusinessCode(postalCode) {
    const codes = await this.loadBusinessCodes();
    const businessData = codes[postalCode];
    
    if (businessData) {
      return {
        success: true,
        source: 'BusinessCodes',
        data: {
          fullAddress: `${businessData.prefecture}${businessData.city}${businessData.street}`,
          prefecture: businessData.prefecture,
          city: businessData.city,
          street: businessData.street,
          business: businessData.business,
          postalCode: this.formatPostalCode(postalCode),
          addressLine1: businessData.prefecture + businessData.city,
          addressLine2: businessData.street,
          isCorporate: true,
          raw: businessData
        }
      };
    }
    
    return {
      success: false,
      notFound: true
    };
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