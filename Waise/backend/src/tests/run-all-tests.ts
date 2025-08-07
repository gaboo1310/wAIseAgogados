#!/usr/bin/env node
/**
 * Entry point script for running all tests
 * Usage: npm run test:all
 */

import { TestRunner } from './test-runner';

async function main() {
  console.log('🚀 Starting complete test suite...\n');
  
  try {
    await TestRunner.runAllTests();
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

main();