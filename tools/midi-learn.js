#!/usr/bin/env node

import { MidiHandler } from '../src/midi/MidiHandler.js';

/**
 * MIDI Learn Tool
 * Helps you discover MIDI mappings by listening to your controller
 */

console.log('═══════════════════════════════════════');
console.log('  MIDI Learn Tool');
console.log('═══════════════════════════════════════\n');

console.log('This tool will help you discover the MIDI messages');
console.log('your controller sends when you press buttons or turn knobs.\n');

// List available MIDI devices
console.log('Available MIDI devices:');
const devices = MidiHandler.listDevices();
if (devices.length === 0) {
  console.log('  No MIDI devices found!');
  process.exit(1);
}
devices.forEach((device, i) => {
  console.log(`  ${i + 1}. ${device}`);
});
console.log('');

// Connect to MIDI device
const midiHandler = new MidiHandler({
  onMessage: (msg) => {
    // Format and display the message
    console.log('─────────────────────────────────────');
    console.log(`Type: ${msg.type}`);
    console.log(`Channel: ${msg.channel}`);
    
    if (msg.type === 'noteon' || msg.type === 'noteoff') {
      console.log(`Note: ${msg.note}`);
      console.log(`Velocity: ${msg.velocity}`);
      console.log('\nJSON mapping:');
      console.log(JSON.stringify({
        midi: {
          type: msg.type,
          channel: msg.channel,
          note: msg.note
        },
        action: {
          type: "command",
          command: "YOUR_COMMAND_HERE"
        }
      }, null, 2));
    } else if (msg.type === 'cc') {
      console.log(`Controller: ${msg.controller}`);
      console.log(`Value: ${msg.value}`);
      console.log('\nJSON mapping (for continuous control):');
      console.log(JSON.stringify({
        midi: {
          type: msg.type,
          channel: msg.channel,
          controller: msg.controller
        },
        action: {
          type: "setValue",
          parameter: "PARAMETER_NAME",
          tracking: true,
          scale: {
            midiMin: 0,
            midiMax: 127,
            lrMin: -100,
            lrMax: 100
          }
        }
      }, null, 2));
    } else if (msg.type === 'program') {
      console.log(`Program: ${msg.number}`);
    }
  }
});

try {
  midiHandler.connect();
  console.log('✓ MIDI device connected\n');
  console.log('Now press buttons, turn knobs, or move faders on your controller...');
  console.log('Press Ctrl+C to exit.\n');
} catch (err) {
  console.error('Failed to connect to MIDI device:', err.message);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nGoodbye!\n');
  midiHandler.disconnect();
  process.exit(0);
});

