#!/usr/bin/env node

import { LrClient } from './lightroom/LrClient.js';
import { MidiHandler } from './midi/MidiHandler.js';
import { ProfileManager } from './profiles/ProfileManager.js';

/**
 * Main Application
 */
class LrController {
  constructor() {
    this.lrClient = null;
    this.midiHandler = null;
    this.profileManager = null;
    this.isRunning = false;
  }

  async start() {
    console.log('═══════════════════════════════════════');
    console.log('  Lightroom MIDI Controller');
    console.log('═══════════════════════════════════════\n');

    // List available MIDI devices
    console.log('Available MIDI devices:');
    const devices = MidiHandler.listDevices();
    if (devices.length === 0) {
      console.log('  No MIDI devices found!');
      console.log('  Please connect your controller and try again.');
      process.exit(1);
    }
    devices.forEach((device, i) => {
      console.log(`  ${i + 1}. ${device}`);
    });
    console.log('');

    // Initialize Lightroom client
    this.lrClient = new LrClient({
      onConnectionChange: (connected) => {
        if (connected) {
          console.log('Status: ✓ Lightroom connected');
        } else {
          console.log('Status: ✗ Lightroom disconnected');
        }
      }
    });

    // Initialize profile manager
    this.profileManager = new ProfileManager(this.lrClient);
    this.profileManager.loadProfiles();

    if (this.profileManager.listProfiles().length === 0) {
      console.log('⚠️  No profiles found! Creating example profiles...');
      await this.createExampleProfiles();
      this.profileManager.loadProfiles();
    }

    console.log('\nActive profiles:');
    this.profileManager.listProfiles().forEach(name => {
      const current = name === this.profileManager.currentProfileName ? ' ←' : '';
      console.log(`  • ${name}${current}`);
    });
    console.log('');

    // Initialize MIDI handler
    this.midiHandler = new MidiHandler({
      onMessage: (msg) => this.handleMidiMessage(msg),
      onConnectionChange: (connected, deviceName) => {
        if (connected) {
          console.log(`Status: ✓ MIDI connected to ${deviceName}`);
        } else {
          console.log('Status: ✗ MIDI disconnected');
        }
      }
    });

    // Connect to Lightroom
    try {
      await this.lrClient.connect();
    } catch (err) {
      console.error('Failed to connect to Lightroom:', err.message);
      console.error('\nMake sure:');
      console.error('  1. Lightroom is running');
      console.error('  2. "Enable external controllers" is checked in preferences');
      console.error('  3. Lightroom has been restarted after enabling the feature');
      process.exit(1);
    }

    // Connect to MIDI device
    try {
      this.midiHandler.connect();
    } catch (err) {
      console.error('Failed to connect to MIDI device:', err.message);
      process.exit(1);
    }

    this.isRunning = true;
    console.log('\n✓ Controller active! Use your MIDI device to control Lightroom.\n');
    console.log('Press Ctrl+C to exit.\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Handle incoming MIDI messages
   */
  async handleMidiMessage(message) {
    // Log in debug mode
    if (process.env.DEBUG) {
      console.log('MIDI:', message);
    }

    // Process through profile manager
    await this.profileManager.processMidiMessage(message);
  }

  /**
   * Create example profile configurations
   */
  async createExampleProfiles() {
    const fs = await import('fs');
    const path = await import('path');
    const profilesDir = path.join(process.cwd(), 'config', 'profiles');
    
    fs.mkdirSync(profilesDir, { recursive: true });

    // Basic editing profile
    const editProfile = {
      name: "Edit Mode",
      description: "Basic photo editing controls",
      mappings: [
        {
          midi: { type: "noteon", note: 0 },
          action: { type: "rating", rating: 1 }
        },
        {
          midi: { type: "noteon", note: 1 },
          action: { type: "rating", rating: 2 }
        },
        {
          midi: { type: "noteon", note: 2 },
          action: { type: "rating", rating: 3 }
        },
        {
          midi: { type: "noteon", note: 3 },
          action: { type: "rating", rating: 4 }
        },
        {
          midi: { type: "noteon", note: 4 },
          action: { type: "rating", rating: 5 }
        },
        {
          midi: { type: "noteon", note: 5 },
          action: { type: "flag", flag: "pick" }
        },
        {
          midi: { type: "noteon", note: 6 },
          action: { type: "flag", flag: "reject" }
        },
        {
          midi: { type: "noteon", note: 7 },
          action: { type: "command", command: "setAutoTone" }
        }
      ]
    };

    // Navigation profile
    const navProfile = {
      name: "Navigation Mode",
      description: "Photo browsing and selection",
      mappings: [
        {
          midi: { type: "noteon", note: 0 },
          action: { type: "command", command: "previousPhoto" }
        },
        {
          midi: { type: "noteon", note: 1 },
          action: { type: "command", command: "nextPhoto" }
        },
        {
          midi: { type: "noteon", note: 2 },
          action: { type: "command", command: "toggleZoom" }
        },
        {
          midi: { type: "noteon", note: 3 },
          action: { type: "command", command: "showView", params: ["grid"] }
        }
      ]
    };

    fs.writeFileSync(
      path.join(profilesDir, 'edit.json'),
      JSON.stringify(editProfile, null, 2)
    );

    fs.writeFileSync(
      path.join(profilesDir, 'navigation.json'),
      JSON.stringify(navProfile, null, 2)
    );

    console.log('  ✓ Created edit.json');
    console.log('  ✓ Created navigation.json');
  }

  /**
   * Stop the controller
   */
  stop() {
    if (!this.isRunning) return;

    console.log('\n\nShutting down...');
    
    if (this.midiHandler) {
      this.midiHandler.disconnect();
    }
    
    if (this.lrClient) {
      this.lrClient.disconnect();
    }

    this.isRunning = false;
    console.log('Goodbye!\n');
    process.exit(0);
  }
}

// Start the application
const controller = new LrController();
controller.start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

