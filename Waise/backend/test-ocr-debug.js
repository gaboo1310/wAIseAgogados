require('dotenv').config();
const { OcrService } = require('./dist/ocr/ocr.service');
const path = require('path');
const fs = require('fs');

async function debugOCRIssues() {
  console.log('🔍 Debugging OCR Issues...\n');

  // 1. Check environment variables
  console.log('📋 Environment Configuration:');
  console.log(`MISTRAL_API_KEY: ${process.env.MISTRAL_API_KEY ? '✅ Present (' + process.env.MISTRAL_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
  console.log(`MISTRAL_MODEL: ${process.env.MISTRAL_MODEL || '❌ Not set'}`);

  // 2. Initialize OCR service
  const ocrService = new OcrService();

  // 3. Test Mistral API connection
  console.log('\n🔌 Testing Mistral API Connection:');
  try {
    const connectionTest = await ocrService.testConnection();
    console.log(`Connection Status: ${connectionTest ? '✅ Success' : '❌ Failed'}`);
    
    if (connectionTest) {
      console.log('✅ Mistral API is accessible');
    } else {
      console.log('❌ Mistral API connection failed - checking details...');
      
      // Manual API test
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Manual API test status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`API Error: ${errorText}`);
      }
    }
  } catch (error) {
    console.log(`❌ Connection test failed: ${error.message}`);
  }

  // 4. Test PDF2PIC availability
  console.log('\n🖼️ Testing PDF2PIC (ImageMagick/GraphicsMagick):');
  try {
    const { fromPath } = require('pdf2pic');
    console.log('✅ PDF2PIC module loaded successfully');
    
    // Try to find a sample PDF to test
    const testPDFs = [
      './database.sqlite', // This won't work but let's see what we have
      './uploads',
      './test-files'
    ];
    
    console.log('\n📁 Looking for test files in uploads directory...');
    const uploadsPath = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath, { recursive: true });
      const pdfFiles = files.filter(f => f.toString().toLowerCase().endsWith('.pdf'));
      console.log(`Found ${pdfFiles.length} PDF files:`, pdfFiles.slice(0, 3));
      
      if (pdfFiles.length > 0) {
        const testPdfPath = path.join(uploadsPath, pdfFiles[0].toString());
        console.log(`\n🧪 Testing OCR with file: ${testPdfPath}`);
        
        if (fs.existsSync(testPdfPath)) {
          try {
            console.log('📊 File stats:', {
              size: fs.statSync(testPdfPath).size,
              exists: true
            });
            
            // Test the actual OCR process
            console.log('\n🚀 Starting OCR extraction...');
            const result = await ocrService.extractTextFromPdf(testPdfPath);
            
            console.log('\n📋 OCR Result:');
            console.log(`Success: ${result.success}`);
            console.log(`Confidence: ${result.confidence}`);
            console.log(`Extracted length: ${result.extractedText?.length || 0} characters`);
            console.log(`Processing time: ${result.metadata?.processingTime}ms`);
            console.log(`Method used: ${result.metadata?.processingMetrics?.successfulMethod}`);
            
            if (result.extractedText && result.extractedText.length > 0) {
              console.log('\n📝 Text Preview (first 300 chars):');
              console.log('=' .repeat(50));
              console.log(result.extractedText.substring(0, 300) + '...');
              console.log('=' .repeat(50));
            }
            
            if (result.metadata?.extractionAttempts) {
              console.log('\n🔄 Extraction Attempts:');
              result.metadata.extractionAttempts.forEach((attempt, i) => {
                console.log(`${i + 1}. ${attempt.method}: ${attempt.success ? '✅' : '❌'} (${attempt.charactersExtracted} chars)`);
                if (attempt.errorMessage) {
                  console.log(`   Error: ${attempt.errorMessage}`);
                }
              });
            }
          } catch (ocrError) {
            console.error(`❌ OCR test failed: ${ocrError.message}`);
            console.error(`Stack: ${ocrError.stack}`);
          }
        }
      }
    } else {
      console.log('❌ Uploads directory not found');
    }
    
  } catch (error) {
    console.log(`❌ PDF2PIC test failed: ${error.message}`);
  }

  console.log('\n🏁 Debug session complete');
}

// Run the debug
debugOCRIssues()
  .then(() => {
    console.log('\n✨ Debug session finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Debug session failed:', error);
    process.exit(1);
  });