/**
 * Test suite for OCR debugging and full text extraction
 * Moved from test-ocr-debug.js for better organization
 */

import { OcrService } from '../../ocr/ocr.service';
import * as path from 'path';
import * as fs from 'fs';

export class OCRDebugTest {
  private ocrService: OcrService;

  constructor() {
    this.ocrService = new OcrService();
  }

  async runComprehensiveOCRTest(): Promise<void> {
    console.log('🔍 OCR Comprehensive Debug Test Suite\n');

    // 1. Check environment variables
    console.log('📋 Environment Configuration:');
    console.log(`MISTRAL_API_KEY: ${process.env.MISTRAL_API_KEY ? '✅ Present (' + process.env.MISTRAL_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
    console.log(`MISTRAL_MODEL: ${process.env.MISTRAL_MODEL || '❌ Not set'}`);
    console.log(`MISTRAL_OCR_MODEL: ${process.env.MISTRAL_OCR_MODEL || '❌ Not set'}`);

    // 2. Test Mistral API connection
    console.log('\n🔌 Testing Mistral API Connection:');
    try {
      const connectionTest = await this.ocrService.testConnection();
      console.log(`Connection Status: ${connectionTest ? '✅ Success' : '❌ Failed'}`);
    } catch (error) {
      console.log(`❌ Connection test failed: ${error.message}`);
    }

    // 3. Test with available PDF files
    console.log('\n📁 Looking for test files...');
    const uploadsPath = path.join(process.cwd(), 'uploads');
    
    if (fs.existsSync(uploadsPath)) {
      await this.testAvailablePDFs(uploadsPath);
    } else {
      console.log('❌ Uploads directory not found');
    }

    console.log('\n🏁 Debug session complete');
  }

  private async testAvailablePDFs(uploadsPath: string): Promise<void> {
    try {
      const files = this.findPDFFiles(uploadsPath);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      console.log(`Found ${pdfFiles.length} PDF files:`, pdfFiles.slice(0, 3));

      if (pdfFiles.length > 0) {
        const testPdfPath = pdfFiles[0];
        console.log(`\n🧪 Testing OCR with file: ${testPdfPath}`);
        
        if (fs.existsSync(testPdfPath)) {
          await this.runSingleFileOCRTest(testPdfPath);
        }
      }
    } catch (error) {
      console.log(`❌ PDF testing failed: ${error.message}`);
    }
  }

  private findPDFFiles(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.findPDFFiles(fullPath));
      } else if (item.name.toLowerCase().endsWith('.pdf')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async runSingleFileOCRTest(testPdfPath: string): Promise<void> {
    try {
      console.log('📊 File stats:', {
        size: fs.statSync(testPdfPath).size,
        exists: true
      });
      
      // Test the actual OCR process
      console.log('\n🚀 Starting OCR extraction...');
      const result = await this.ocrService.extractTextFromPdf(testPdfPath);
      
      console.log('\n📋 OCR Result Summary:');
      console.log(`Success: ${result.success}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Raw text length: ${result.rawText?.length || 0} characters`);
      console.log(`Clean text length: ${result.extractedText?.length || 0} characters`);
      console.log(`Processing time: ${result.metadata?.processingTime}ms`);
      console.log(`Method used: ${result.metadata?.processingMetrics?.successfulMethod}`);
      
      if (result.cleaningStats) {
        console.log('\n🧹 Cleaning Stats:');
        console.log(`Folio refs removed: ${result.cleaningStats.removedItems.folioReferences}`);
        console.log(`Repertorio codes removed: ${result.cleaningStats.removedItems.repertorioCodes}`);
        console.log(`Dates preserved: ${result.cleaningStats.preservedItems.dates}`);
        console.log(`Names preserved: ${result.cleaningStats.preservedItems.names}`);
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