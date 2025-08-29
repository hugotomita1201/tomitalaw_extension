/**
 * Japan Post Digital Address API Client for Chrome Extension
 * Provides official postal code and digital address lookup
 * 
 * API Documentation: https://api-auth-pro.japanpost.jp/docs/
 */

export class JapanPostClient {
  constructor() {
    // OAuth2 endpoints
    this.authUrl = 'https://api-auth-pro.japanpost.jp/auths/v1/users/token';
    this.apiUrl = 'https://api-pro.japanpost.jp/postcode/v1/addresses';
    
    // Token cache
    this.tokenCache = {
      token: null,
      expiresAt: null
    };
    
    // Initialize encrypted credentials
    this.initializeCredentials();
  }

  /**
   * Initialize encrypted API credentials
   * These are encrypted using the same pattern as OpenAI API keys
   */
  initializeCredentials() {
    // Client ID chunks (encrypted)
    this.C1 = '=w1UB9wDNMk';
    this.C2 = 'VEUFAJBEQfV';
    this.C3 = 'EFXRAFEoFFU';
    this.C4 = 'gVCQFBUblVF';

    // Client Secret chunks (encrypted)
    this.S1 = '=wFVC1FWKME';
    this.S2 = 'DRZVUOB0QNk';
    this.S3 = '0TeRQSZ9FGS';
    this.S4 = 'MlDDABWLkQF';
  }

  /**
   * Decrypt credentials when needed
   * @param {Array} chunks - Encrypted chunks
   * @returns {string} Decrypted credential
   */
  decryptCredential(chunks) {
    const salt = 'tomitalaw-japan-post-2024';
    const encrypted = chunks.join('');
    
    // Step 1: Reverse back
    const reversed = encrypted.split('').reverse().join('');
    
    // Step 2: Base64 decode
    const decoded = atob(reversed);
    
    // Step 3: XOR with salt (XOR is its own inverse)
    const unxored = decoded.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
    
    // Step 4: Reverse to get original
    return unxored.split('').reverse().join('');
  }

  /**
   * Get OAuth2 access token
   * Tokens expire after 10 minutes, so we cache and refresh as needed
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.tokenCache.token && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    try {
      // Decrypt credentials
      const clientId = this.decryptCredential([this.C1, this.C2, this.C3, this.C4]);
      const clientSecret = this.decryptCredential([this.S1, this.S2, this.S3, this.S4]);

      // Prepare OAuth2 request
      const params = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'secret_key': clientSecret  // Note: Japan Post uses 'secret_key' not 'client_secret'
      });

      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      if (!response.ok) {
        console.error('Japan Post Auth failed:', response.status);
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the token (expires in 10 minutes, we'll refresh at 9 minutes)
      this.tokenCache.token = data.access_token;
      this.tokenCache.expiresAt = Date.now() + (9 * 60 * 1000);
      
      return data.access_token;
    } catch (error) {
      console.error('Failed to get Japan Post access token:', error);
      throw error;
    }
  }

  /**
   * Search for address by postal code
   * @param {string} postalCode - 7-digit postal code
   * @returns {Promise<Object>} Address data or null
   */
  async searchByPostalCode(postalCode) {
    try {
      const token = await this.getAccessToken();
      
      // Format postal code (remove hyphens and spaces)
      const cleanCode = postalCode.replace(/[^0-9]/g, '');
      if (cleanCode.length !== 7) {
        return null;
      }

      // Format as XXX-XXXX for API
      const formattedCode = `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}`;
      
      const response = await fetch(`${this.apiUrl}?postcode=${formattedCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        // Postal code not found
        return null;
      }

      if (!response.ok) {
        console.error('Japan Post API error:', response.status);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Return the first result if available
      if (data.addresses && data.addresses.length > 0) {
        return this.formatJapanPostResponse(data.addresses[0], formattedCode);
      }
      
      return null;
    } catch (error) {
      console.error('Japan Post postal code search failed:', error);
      throw error;
    }
  }

  /**
   * Format Japan Post API response to match our standard format
   * @param {Object} address - Japan Post API address object
   * @param {string} postalCode - Formatted postal code
   * @returns {Object} Formatted address data
   */
  formatJapanPostResponse(address, postalCode) {
    // Extract Japanese address components
    const prefecture = address.prefecture || '';
    const city = address.city || '';
    const town = address.town || '';
    
    return {
      success: true,
      source: 'JapanPost',
      data: {
        // Full formatted address
        fullAddress: `${prefecture}${city}${town}`,
        
        // Individual components for visa forms
        prefecture: prefecture,         // 東京都 (State field)
        city: city,                    // 渋谷区 (City field)  
        street: town,                  // 渋谷 (Street/Area field)
        postalCode: postalCode,        // 150-0002 (formatted)
        
        // Address lines for forms that use line format
        addressLine1: prefecture + city,  // Prefecture + City
        addressLine2: town,               // Street/Area
        
        // Digital address if available
        digitalAddress: address.digitalAddress || null,
        
        // Corporate flag
        isCorporate: address.corporateFlag || false,
        
        // Original raw data
        raw: address
      }
    };
  }

  /**
   * Search for postal code by digital address (7-character code)
   * @param {string} digitalAddress - Digital address code
   * @returns {Promise<Object>} Address data or null
   */
  async searchByDigitalAddress(digitalAddress) {
    try {
      const token = await this.getAccessToken();
      
      // Validate digital address format
      if (!digitalAddress || digitalAddress.length !== 7) {
        return null;
      }

      const response = await fetch(`${this.apiUrl}?digitalAddress=${digitalAddress}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error('Japan Post API error:', response.status);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.addresses && data.addresses.length > 0) {
        const addr = data.addresses[0];
        // Extract postal code from the response
        const postalCode = addr.postcode || '';
        return this.formatJapanPostResponse(addr, postalCode);
      }
      
      return null;
    } catch (error) {
      console.error('Japan Post digital address search failed:', error);
      throw error;
    }
  }
}