#!/usr/bin/env node
/**
 * Entry point script for running OCR tests only
 * Usage: npm run test:ocr
 */

import { TestRunner } from './test-runner';

async function main() {
  console.log('🔍 Starting OCR test suite...\n');
  
  try {
    await TestRunner.runOCRTests();
    console.log('\n🎉 OCR tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 OCR tests failed:', error.message);
    process.exit(1);
  }
}

main();