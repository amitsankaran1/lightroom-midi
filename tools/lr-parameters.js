#!/usr/bin/env node

import { LrClient } from '../src/lightroom/LrClient.js';

/**
 * Lightroom Parameters Explorer
 * Lists all available parameters with their ranges and defaults
 */

console.log('═══════════════════════════════════════');
console.log('  Lightroom Parameters Explorer');
console.log('═══════════════════════════════════════\n');

const lrClient = new LrClient();

try {
  console.log('Connecting to Lightroom...');
  await lrClient.connect();
  console.log('✓ Connected\n');

  console.log('Fetching parameter list...');
  const params = await lrClient.getParameterNames();
  console.log(`Found ${params.length} parameters\n`);

  console.log('═══════════════════════════════════════\n');

  // Get details for each parameter
  for (const param of params) {
    try {
      const [min, max, precision, smallInc, largeInc] = await lrClient.getRange(param);
      const defaultValue = await lrClient.getDefault(param);
      const label = await lrClient.getLabel(param);
      const type = await lrClient.sendMessage('getParameterType', [param]);

      console.log(`Parameter: ${param}`);
      console.log(`  Label: ${label}`);
      console.log(`  Type: ${type}`);
      console.log(`  Range: ${min} to ${max}`);
      console.log(`  Precision: ${precision} decimal places`);
      console.log(`  Default: ${defaultValue}`);
      console.log(`  Increments: ${smallInc} (small), ${largeInc} (large)`);
      console.log('');
      
      // Add a small delay to avoid overwhelming Lightroom
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      console.log(`Parameter: ${param}`);
      console.log(`  Error: ${err.message}\n`);
    }
  }

  console.log('═══════════════════════════════════════\n');
  console.log('Done!\n');
  
  lrClient.disconnect();
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  console.error('\nMake sure:');
  console.error('  1. Lightroom is running');
  console.error('  2. "Enable external controllers" is checked in preferences');
  process.exit(1);
}

