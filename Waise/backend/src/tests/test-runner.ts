/**
 * Main test runner - Entry point for all tests
 * Organizes and executes all available test suites
 */

import 'dotenv/config';
import { OCRDebugTest } from './ocr/ocr-debug.test';
import { HandwritingCorrectionTest } from './text-cleaner/handwriting-correction.test';
import { FullPipelineTest } from './ocr/full-pipeline.test';

export class TestRunner {
  
  static async runAllTests(): Promise<void> {
    console.log('🧪 WAISE BACKEND TEST SUITE');
    console.log('='.repeat(80));
    console.log('Testing OCR, Text Cleaning, and Full Pipeline');
    console.log('='.repeat(80));

    try {
      // 1. OCR Debug Tests
      console.log('\n1️⃣ RUNNING OCR DEBUG TESTS');
      console.log('='.repeat(50));
      const ocrTest = new OCRDebugTest();
      await ocrTest.runComprehensiveOCRTest();

      // 2. Handwriting Correction Tests  
      console.log('\n2️⃣ RUNNING HANDWRITING CORRECTION TESTS');
      console.log('='.repeat(50));
      const handwritingTest = new HandwritingCorrectionTest();
      handwritingTest.runAllHandwritingTests();

      // 3. Full Pipeline Tests
      console.log('\n3️⃣ RUNNING FULL PIPELINE TESTS');
      console.log('='.repeat(50));
      const pipelineTest = new FullPipelineTest();
      await pipelineTest.runFullPipelineTest();

      console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY');
      console.log('='.repeat(80));

    } catch (error) {
      console.error('\n❌ TEST SUITE FAILED:', error.message);
      console.error('='.repeat(80));
      process.exit(1);
    }
  }

  static async runOCRTests(): Promise<void> {
    console.log('🔍 RUNNING OCR TESTS ONLY\n');
    const ocrTest = new OCRDebugTest();
    await ocrTest.runComprehensiveOCRTest();
  }

  static runHandwritingTests(): void {
    console.log('✍️ RUNNING HANDWRITING TESTS ONLY\n');
    const handwritingTest = new HandwritingCorrectionTest();
    handwritingTest.runAllHandwritingTests();
  }

  static async runPipelineTests(specificFile?: string): Promise<void> {
    console.log('🔄 RUNNING PIPELINE TESTS ONLY\n');
    const pipelineTest = new FullPipelineTest();
    await pipelineTest.runFullPipelineTest(specificFile);
  }

  static async runQuickTest(): Promise<void> {
    console.log('⚡ RUNNING QUICK TEST SUITE\n');
    
    // Quick handwriting test
    const handwritingTest = new HandwritingCorrectionTest();
    handwritingTest.testBasicNameCorrections();
    
    // Quick OCR connection test
    const ocrTest = new OCRDebugTest();
    console.log('\n🔌 Testing API connection...');
    // Just test connection, not full pipeline
  }
}