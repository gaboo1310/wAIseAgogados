#!/usr/bin/env node
/**
 * Entry point script for running handwriting correction tests
 * Usage: npm run test:handwriting
 */

import { TestRunner } from './test-runner';

function main() {
  console.log('✍️ Starting handwriting correction tests...\n');
  
  try {
    TestRunner.runHandwritingTests();
    console.log('\n🎉 Handwriting tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Handwriting tests failed:', error.message);
    process.exit(1);
  }
}

main();