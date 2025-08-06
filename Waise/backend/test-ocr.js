// Simple test script to verify OCR and Vector services
const https = require('https');
const fs = require('fs');

// Test data
const testDocument = {
  filename: 'test-contract.pdf',
  originalPath: './test-files/sample.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  userId: 'test-user-123',
};

// Mock JWT token for testing (replace with real token)
const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiaWF0IjoxNTE2MjM5MDIyfQ.test';

console.log('🔍 Starting OCR and Vector System Test...');
console.log('📋 Test Configuration:');
console.log('- Document:', testDocument.filename);
console.log('- User ID:', testDocument.userId);
console.log('- File Size:', testDocument.fileSize, 'bytes');

// Test 1: Check if backend is running
console.log('\n🚀 Test 1: Backend Health Check');
const healthCheck = https.request({
  hostname: 'localhost',
  port: 3000,
  path: '/vector/test',
  method: 'GET',
  headers: {
    'Authorization': mockToken,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('✅ Backend Status:', res.statusCode);
    console.log('📊 Vector Service Response:', JSON.parse(data));
  });
});

healthCheck.on('error', (err) => {
  console.log('❌ Backend connection failed:', err.message);
});

healthCheck.end();

console.log('\n📝 OCR and Vector Integration Test completed!');
console.log('🔧 Next steps:');
console.log('1. Start the frontend to test UI integration');
console.log('2. Upload a real PDF document');
console.log('3. Verify OCR extraction works');
console.log('4. Test vector search functionality');