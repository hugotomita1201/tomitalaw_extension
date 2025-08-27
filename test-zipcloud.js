// Test script to check ZipCloud API response for 150-0002
const https = require('https');

const postalCode = '1500002';
const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`;

console.log('Testing ZipCloud API for postal code:', postalCode);
console.log('API URL:', apiUrl);
console.log('-----------------------------------\n');

https.get(apiUrl, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      
      // Pretty print the entire response
      console.log('RAW API RESPONSE:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      console.log('\n-----------------------------------');
      console.log('ANALYSIS:');
      console.log('Status:', jsonData.status);
      console.log('Number of results:', jsonData.results ? jsonData.results.length : 0);
      
      if (jsonData.results && jsonData.results.length > 0) {
        console.log('\n-----------------------------------');
        console.log('DETAILED RESULTS:');
        
        jsonData.results.forEach((result, index) => {
          console.log(`\nResult ${index + 1}:`);
          console.log('  Postal Code:', result.zipcode);
          console.log('  Prefecture:', result.address1);
          console.log('  City/Ward:', result.address2);
          console.log('  Area/Street:', result.address3);
          console.log('  Prefecture (Kana):', result.kana1);
          console.log('  City/Ward (Kana):', result.kana2);
          console.log('  Area/Street (Kana):', result.kana3);
          console.log('  Prefecture Code:', result.prefcode);
        });
      }
      
      console.log('\n-----------------------------------');
      console.log('WHAT OUR EXTENSION CURRENTLY SHOWS:');
      if (jsonData.results && jsonData.results.length > 0) {
        const firstResult = jsonData.results[0];
        console.log('  Full Address:', firstResult.address1 + firstResult.address2 + firstResult.address3);
        console.log('  Prefecture:', firstResult.address1);
        console.log('  City:', firstResult.address2);
        console.log('  Street:', firstResult.address3);
        console.log('  Postal:', `${postalCode.slice(0,3)}-${postalCode.slice(3)}`);
        console.log('  Address Line 1:', firstResult.address1 + firstResult.address2);
        console.log('  Address Line 2:', firstResult.address3);
      }
      
      if (jsonData.results && jsonData.results.length > 1) {
        console.log('\n⚠️  WARNING: Multiple results found but extension only uses the first one!');
      }
      
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error making request:', err);
});