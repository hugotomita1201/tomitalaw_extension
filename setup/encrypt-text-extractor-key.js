/**
 * Text Extractor API Key Encryption Utility
 * 
 * This script is used to encrypt your OpenAI API key for use with the Text Extractor tool.
 * Run this script locally with your API key, then copy the generated chunks
 * into the text-extractor-service.js file.
 * 
 * DO NOT COMMIT THIS FILE TO VERSION CONTROL
 * DO NOT INCLUDE THIS FILE IN THE EXTENSION PACKAGE
 * 
 * Usage:
 * 1. Replace 'YOUR_OPENAI_API_KEY_HERE' with your actual API key
 * 2. Run: node encrypt-text-extractor-key.js
 * 3. Copy the generated K1, K2, K3, K4 values to text-extractor-service.js
 * 4. Delete this file or keep it secure
 */

class TextExtractorAPIKeySetup {
  static encrypt(apiKey) {
    // Multi-layer obfuscation with Text Extractor specific salt
    const salt = 'tomitalaw-text-extractor-2024';
    
    // Step 1: Reverse the key
    const reversed = apiKey.split('').reverse().join('');
    
    // Step 2: XOR with salt
    const xored = reversed.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    ).join('');
    
    // Step 3: Base64 encode
    const base64 = Buffer.from(xored).toString('base64');
    
    // Step 4: Reverse again and split into chunks
    const finalReversed = base64.split('').reverse().join('');
    
    // Split into 4 parts for additional obfuscation
    const chunkSize = Math.ceil(finalReversed.length / 4);
    const chunks = [];
    for (let i = 0; i < finalReversed.length; i += chunkSize) {
      chunks.push(finalReversed.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
  
  static decrypt(encrypted) {
    // This is for testing - shows how the decryption works
    const salt = 'tomitalaw-text-extractor-2024';
    
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
  
  static generateEncryptedKey() {
    // ================================================
    // REPLACE THIS WITH YOUR ACTUAL OPENAI API KEY
    // ================================================
    const apiKey = 'sk-proj-YOUR_OPENAI_API_KEY_HERE';
    
    if (apiKey === 'sk-proj-YOUR_OPENAI_API_KEY_HERE') {
      console.error('\n❌ ERROR: Please replace the placeholder with your actual OpenAI API key!\n');
      console.log('Edit this file and replace:');
      console.log('  sk-proj-YOUR_OPENAI_API_KEY_HERE');
      console.log('with your actual API key from https://platform.openai.com/api-keys\n');
      return;
    }
    
    const chunks = this.encrypt(apiKey);
    
    // Test decryption to make sure it works
    const reconstructed = chunks.join('');
    const decrypted = this.decrypt(reconstructed);
    
    if (decrypted !== apiKey) {
      console.error('❌ ERROR: Encryption/decryption test failed!');
      console.error('Original:', apiKey);
      console.error('Decrypted:', decrypted);
      return;
    }
    
    console.log('\n✅ Text Extractor API Key encrypted successfully!\n');
    console.log('Copy these lines into text-extractor-service.js (replace the placeholder values):\n');
    console.log('----------------------------------------');
    console.log(`    this.K1 = '${chunks[0]}';`);
    console.log(`    this.K2 = '${chunks[1]}';`);
    console.log(`    this.K3 = '${chunks[2]}';`);
    console.log(`    this.K4 = '${chunks[3]}';`);
    console.log('----------------------------------------\n');
    console.log('After copying, remember to:');
    console.log('1. Save text-extractor-service.js');
    console.log('2. Delete or secure this encrypt-text-extractor-key.js file');
    console.log('3. Test the text extractor in the extension\n');
  }
}

// Run the encryption
TextExtractorAPIKeySetup.generateEncryptedKey();