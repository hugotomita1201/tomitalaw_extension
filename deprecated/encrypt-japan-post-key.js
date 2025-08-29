/**
 * Japan Post API Credentials Encryption Utility
 * 
 * This script encrypts your Japan Post API credentials for use in the extension.
 * Run this script locally with your credentials, then copy the generated chunks
 * into the japan-post-client.js file.
 * 
 * DO NOT COMMIT THIS FILE TO VERSION CONTROL WITH REAL CREDENTIALS
 * DO NOT INCLUDE THIS FILE IN THE EXTENSION PACKAGE
 * 
 * Usage:
 * 1. Replace placeholders with your actual Japan Post API credentials
 * 2. Run: node encrypt-japan-post-key.js
 * 3. Copy the generated C1-C4 and S1-S4 values to japan-post-client.js
 * 4. Delete this file or keep it secure
 */

class JapanPostKeySetup {
  static encrypt(credential) {
    // Multi-layer obfuscation with unique salt
    const salt = 'tomitalaw-japan-post-2024';
    
    // Step 1: Reverse the credential
    const reversed = credential.split('').reverse().join('');
    
    // Step 2: XOR with salt
    const xored = reversed.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
    
    // Step 3: Base64 encode (using Node.js Buffer)
    const base64 = Buffer.from(xored).toString('base64');
    
    // Step 4: Reverse again and split into chunks
    const finalReversed = base64.split('').reverse().join('');
    
    // Split into 4 parts for additional obfuscation
    const chunkSize = Math.ceil(finalReversed.length / 4);
    const chunks = [];
    for (let i = 0; i < finalReversed.length; i += chunkSize) {
      chunks.push(finalReversed.slice(i, i + chunkSize));
    }
    
    // Pad chunks to ensure we always have 4
    while (chunks.length < 4) {
      chunks.push('');
    }
    
    return chunks;
  }
  
  static decrypt(chunks) {
    // This is for testing - shows how the decryption works
    const salt = 'tomitalaw-japan-post-2024';
    const encrypted = chunks.join('');
    
    // Step 1: Reverse back
    const reversed = encrypted.split('').reverse().join('');
    
    // Step 2: Base64 decode
    const decoded = Buffer.from(reversed, 'base64').toString();
    
    // Step 3: XOR with salt again (XOR is its own inverse)
    const unxored = decoded.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
    
    // Step 4: Reverse to get original
    return unxored.split('').reverse().join('');
  }
  
  static generateEncryptedCredentials() {
    // ================================================
    // REPLACE THESE WITH YOUR ACTUAL JAPAN POST API CREDENTIALS
    // From your .env file:
    // JAPAN_POST_CLIENT_ID and JAPAN_POST_SECRET
    // ================================================
    const clientId = '025fbb7b6e2d430599ede09c9e1e966a';  // Your actual CLIENT_ID
    const clientSecret = '05645e78cfcc40b9b0e9855e2bbd1ffa';  // Your actual SECRET
    
    // Encrypt both credentials
    const clientChunks = this.encrypt(clientId);
    const secretChunks = this.encrypt(clientSecret);
    
    // Test decryption to make sure it works
    const decryptedClient = this.decrypt(clientChunks);
    const decryptedSecret = this.decrypt(secretChunks);
    
    if (decryptedClient !== clientId) {
      console.error('❌ ERROR: Client ID encryption/decryption test failed!');
      console.error('Original:', clientId);
      console.error('Decrypted:', decryptedClient);
      return;
    }
    
    if (decryptedSecret !== clientSecret) {
      console.error('❌ ERROR: Client Secret encryption/decryption test failed!');
      console.error('Original:', clientSecret);
      console.error('Decrypted:', decryptedSecret);
      return;
    }
    
    console.log('\n✅ Japan Post API credentials encrypted successfully!\n');
    console.log('Copy these lines into japan-post-client.js (replace the placeholder values):\n');
    console.log('----------------------------------------');
    console.log('  initializeCredentials() {');
    console.log(`    // Client ID chunks`);
    console.log(`    this.C1 = '${clientChunks[0]}';`);
    console.log(`    this.C2 = '${clientChunks[1]}';`);
    console.log(`    this.C3 = '${clientChunks[2]}';`);
    console.log(`    this.C4 = '${clientChunks[3]}';`);
    console.log('');
    console.log(`    // Client Secret chunks`);
    console.log(`    this.S1 = '${secretChunks[0]}';`);
    console.log(`    this.S2 = '${secretChunks[1]}';`);
    console.log(`    this.S3 = '${secretChunks[2]}';`);
    console.log(`    this.S4 = '${secretChunks[3]}';`);
    console.log('  }');
    console.log('----------------------------------------\n');
    console.log('After copying, remember to:');
    console.log('1. Save japan-post-client.js');
    console.log('2. Delete or secure this encrypt-japan-post-key.js file');
    console.log('3. Update manifest.json to allow Japan Post API connections');
    console.log('4. Test the postal code lookup in the extension\n');
  }
}

// Run the encryption
JapanPostKeySetup.generateEncryptedCredentials();