/**
 * Full pipeline test: OCR + Text Cleaning + Vector preparation
 * Tests the complete workflow from PDF to vectorization-ready text
 */

import { OcrService } from '../../ocr/ocr.service';
import * as fs from 'fs';
import * as path from 'path';

export class FullPipelineTest {
  private ocrService: OcrService;

  constructor() {
    this.ocrService = new OcrService();
  }

  async runFullPipelineTest(specificFile?: string): Promise<void> {
    console.log('🔄 FULL OCR PIPELINE TEST\n');
    console.log('Testing: PDF → OCR → Text Cleaning → Vector-Ready Text');
    console.log('='.repeat(80));

    if (specificFile) {
      await this.testSpecificFile(specificFile);
    } else {
      await this.testAvailableDocuments();
    }
  }

  private async testAvailableDocuments(): Promise<void> {
    const uploadsPath = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsPath)) {
      console.log('❌ No uploads directory found');
      return;
    }

    const pdfFiles = this.findAllPDFs(uploadsPath);
    console.log(`\n📁 Found ${pdfFiles.length} PDF files to test`);

    for (const [index, pdfFile] of pdfFiles.entries()) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 TESTING FILE ${index + 1}/${pdfFiles.length}`);
      console.log(`📄 File: ${path.basename(pdfFile)}`);
      console.log(`${'='.repeat(60)}`);
      
      await this.testSpecificFile(pdfFile);
      
      if (index < pdfFiles.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next test...');
        await this.sleep(2000);
      }
    }
  }

  private async testSpecificFile(filePath: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      // File information
      const fileStats = fs.statSync(filePath);
      console.log(`📊 File size: ${Math.round(fileStats.size / 1024)} KB`);
      console.log(`📊 File path: ${filePath}`);
      
      // Run OCR pipeline
      console.log('\n🚀 Starting OCR pipeline...');
      const result = await this.ocrService.extractTextFromPdf(filePath);
      
      const totalTime = Date.now() - startTime;
      
      // Display results
      this.displayResults(result, totalTime, path.basename(filePath));
      
      // Analyze text quality
      this.analyzeTextQuality(result);
      
    } catch (error) {
      console.error(`❌ Pipeline test failed: ${error.message}`);
    }
  }

  private displayResults(result: any, totalTime: number, fileName: string): void {
    console.log('\n📋 PIPELINE RESULTS:');
    console.log('-'.repeat(40));
    
    console.log(`✅ Success: ${result.success}`);
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`🔧 OCR processing: ${result.metadata?.processingTime}ms`);
    console.log(`🎯 Confidence: ${Math.round((result.confidence || 0) * 100)}%`);
    console.log(`📊 Health score: ${result.metadata?.healthScore}/100`);
    
    console.log('\n📝 TEXT STATISTICS:');
    console.log('-'.repeat(40));
    console.log(`Raw text: ${result.rawText?.length || 0} characters`);
    console.log(`Clean text: ${result.extractedText?.length || 0} characters`);
    console.log(`Reduction: ${result.rawText ? Math.round(((result.rawText.length - result.extractedText.length) / result.rawText.length) * 100) : 0}%`);
    
    if (result.cleaningStats) {
      console.log('\n🧹 CLEANING STATISTICS:');
      console.log('-'.repeat(40));
      console.log(`Folio references removed: ${result.cleaningStats.removedItems.folioReferences}`);
      console.log(`Repertorio codes removed: ${result.cleaningStats.removedItems.repertorioCodes}`);
      console.log(`Marginal numbers removed: ${result.cleaningStats.removedItems.marginalNumbers}`);
      console.log(`Extra spaces fixed: ${result.cleaningStats.removedItems.extraSpaces}`);
      console.log(`Dates preserved: ${result.cleaningStats.preservedItems.dates}`);
      console.log(`Names preserved: ${result.cleaningStats.preservedItems.names}`);
    }
    
    if (result.metadata?.extractionAttempts) {
      console.log('\n🔄 EXTRACTION METHODS TRIED:');
      console.log('-'.repeat(40));
      result.metadata.extractionAttempts.forEach((attempt, i) => {
        const status = attempt.success ? '✅' : '❌';
        console.log(`${i + 1}. ${attempt.method}: ${status} (${attempt.charactersExtracted} chars)`);
        if (attempt.errorMessage && !attempt.success) {
          console.log(`   Error: ${attempt.errorMessage}`);
        }
      });
    }
  }

  private analyzeTextQuality(result: any): void {
    if (!result.extractedText) {
      console.log('\n⚠️ No text extracted for quality analysis');
      return;
    }

    const text = result.extractedText;
    
    console.log('\n📊 TEXT QUALITY ANALYSIS:');
    console.log('-'.repeat(40));
    
    // Basic metrics
    const words = text.split(/\\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? Math.round(words.length / sentences.length) : 0;
    
    console.log(`Words: ${words.length}`);
    console.log(`Sentences: ${sentences.length}`);
    console.log(`Avg words per sentence: ${avgWordsPerSentence}`);
    
    // Check for common patterns
    const hasRUT = /\\d{1,2}\\.\\d{3}\\.\\d{3}-[\\dkK]/.test(text);
    const hasDates = /\\d{1,2}\\s+de\\s+\\w+\\s+de\\s+\\d{4}|\\d{1,2}[-\\/]\\d{1,2}[-\\/]\\d{2,4}/.test(text);
    const hasNames = /Don\\s+\\w+|Doña\\s+\\w+|[A-ZÁÉÍÓÚ][a-záéíóúñ]+\\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+/.test(text);
    const hasMoney = /\\$[\\d.,]+|UF\\s*[\\d.,]+|pesos/.test(text);
    
    console.log('\\n🔍 CONTENT PATTERNS DETECTED:');
    console.log('-'.repeat(40));
    console.log(`RUT numbers: ${hasRUT ? '✅' : '❌'}`);
    console.log(`Dates: ${hasDates ? '✅' : '❌'}`);
    console.log(`Names: ${hasNames ? '✅' : '❌'}`);
    console.log(`Money amounts: ${hasMoney ? '✅' : '❌'}`);
    
    // Quality score
    let qualityScore = 0;
    if (text.length > 100) qualityScore += 25;
    if (words.length > 20) qualityScore += 25;
    if (hasRUT || hasDates) qualityScore += 25;
    if (hasNames) qualityScore += 25;
    
    console.log(`\\n🎯 Overall text quality: ${qualityScore}/100`);
    
    if (qualityScore >= 75) {
      console.log('✅ Excellent - Ready for vectorization');
    } else if (qualityScore >= 50) {
      console.log('⚠️ Good - May need manual review');
    } else {
      console.log('❌ Poor - Requires attention');
    }
  }

  private findAllPDFs(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.findAllPDFs(fullPath));
      } else if (item.name.toLowerCase().endsWith('.pdf')) {
        files.push(fullPath);
      }
    }
    
    return files.slice(0, 5); // Limit to first 5 files for testing
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}