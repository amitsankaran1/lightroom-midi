import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Profile Manager
 * Handles loading, switching, and executing profile mappings
 */
export class ProfileManager {
  constructor(lrClient) {
    this.lrClient = lrClient;
    this.profiles = new Map();
    this.currentProfile = null;
    this.currentProfileName = null;
    this.trackingParameter = null;
  }

  /**
   * Load all profiles from config directory
   */
  loadProfiles(profilesDir) {
    if (!profilesDir) {
      profilesDir = path.join(process.cwd(), 'config', 'profiles');
    }

    console.log(`Loading profiles from: ${profilesDir}`);

    if (!fs.existsSync(profilesDir)) {
      console.warn('Profiles directory not found, creating...');
      fs.mkdirSync(profilesDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(profilesDir);
    const profileFiles = files.filter(f => f.endsWith('.json'));

    for (const file of profileFiles) {
      try {
        const filePath = path.join(profilesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const profile = JSON.parse(content);
        const profileName = path.basename(file, '.json');
        
        this.profiles.set(profileName, profile);
        console.log(`  ✓ Loaded profile: ${profileName}`);
      } catch (err) {
        console.error(`  ✗ Failed to load ${file}:`, err.message);
      }
    }

    // Load first profile as default
    if (this.profiles.size > 0 && !this.currentProfile) {
      const firstProfile = this.profiles.keys().next().value;
      this.switchProfile(firstProfile);
    }
  }

  /**
   * Switch to a different profile
   */
  switchProfile(profileName) {
    if (!this.profiles.has(profileName)) {
      console.error(`Profile not found: ${profileName}`);
      return false;
    }

    this.currentProfile = this.profiles.get(profileName);
    this.currentProfileName = profileName;
    console.log(`→ Switched to profile: ${profileName}`);
    
    // Stop any active tracking
    if (this.trackingParameter) {
      this.lrClient.stopTracking().catch(() => {});
      this.trackingParameter = null;
    }

    return true;
  }

  /**
   * List available profiles
   */
  listProfiles() {
    return Array.from(this.profiles.keys());
  }

  /**
   * Get current profile info
   */
  getCurrentProfile() {
    return {
      name: this.currentProfileName,
      profile: this.currentProfile
    };
  }

  /**
   * Process a MIDI message using current profile
   */
  async processMidiMessage(midiMessage) {
    if (!this.currentProfile) {
      return;
    }

    // Find matching mapping
    const mapping = this.findMapping(midiMessage);
    if (!mapping) {
      return;
    }

    try {
      await this.executeMapping(mapping, midiMessage);
    } catch (err) {
      console.error('Error executing mapping:', err.message);
    }
  }

  /**
   * Find a mapping that matches the MIDI message
   */
  findMapping(midiMessage) {
    const mappings = this.currentProfile.mappings || [];
    
    for (const mapping of mappings) {
      if (this.matchesMidiMessage(mapping.midi, midiMessage)) {
        return mapping;
      }
    }
    
    return null;
  }

  /**
   * Check if a mapping matches a MIDI message
   */
  matchesMidiMessage(midiPattern, midiMessage) {
    if (midiPattern.type !== midiMessage.type) {
      return false;
    }

    // Match channel (if specified)
    if (midiPattern.channel !== undefined && 
        midiPattern.channel !== midiMessage.channel) {
      return false;
    }

    // For note on/off messages
    if ((midiPattern.type === 'noteon' || midiPattern.type === 'noteoff') &&
        midiPattern.note !== undefined &&
        midiPattern.note !== midiMessage.note) {
      return false;
    }

    // For CC messages
    if (midiPattern.type === 'cc' &&
        midiPattern.controller !== undefined &&
        midiPattern.controller !== midiMessage.controller) {
      return false;
    }

    return true;
  }

  /**
   * Execute a mapping action
   */
  async executeMapping(mapping, midiMessage) {
    const action = mapping.action;

    // Profile switching
    if (action.type === 'switchProfile') {
      this.switchProfile(action.profile);
      return;
    }

    // Lightroom actions
    switch (action.type) {
      case 'setValue':
        await this.executeSetValue(action, midiMessage);
        break;
      
      case 'increment':
        await this.lrClient.increment(action.parameter, action.amount);
        break;
      
      case 'decrement':
        await this.lrClient.decrement(action.parameter, action.amount);
        break;
      
      case 'command':
        await this.executeCommand(action.command, action.params);
        break;
      
      case 'rating':
        await this.lrClient.setRating(action.rating);
        break;
      
      case 'flag':
        await this.executeFlag(action.flag);
        break;
      
      case 'colorLabel':
        await this.lrClient.setColorLabel(action.color);
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  /**
   * Execute a setValue action with value transformation
   */
  async executeSetValue(action, midiMessage) {
    let value = midiMessage.value || midiMessage.velocity || 0;

    // Apply value transformation
    if (action.scale) {
      const { midiMin = 0, midiMax = 127, lrMin, lrMax } = action.scale;
      // Normalize to 0-1
      const normalized = (value - midiMin) / (midiMax - midiMin);
      // Scale to Lightroom range
      value = lrMin + (normalized * (lrMax - lrMin));
    }

    // Start tracking for smoother performance
    if (action.tracking && this.trackingParameter !== action.parameter) {
      await this.lrClient.startTracking(action.parameter);
      this.trackingParameter = action.parameter;
    }

    await this.lrClient.setValue(action.parameter, value);
  }

  /**
   * Execute a generic Lightroom command
   */
  async executeCommand(command, params = []) {
    if (typeof this.lrClient[command] === 'function') {
      await this.lrClient[command](...params);
    } else {
      console.warn('Unknown Lightroom command:', command);
    }
  }

  /**
   * Execute a flag action
   */
  async executeFlag(flagType) {
    switch (flagType) {
      case 'pick':
        await this.lrClient.flagPick();
        break;
      case 'reject':
        await this.lrClient.flagReject();
        break;
      case 'unflag':
        await this.lrClient.flagUnflag();
        break;
    }
  }
}

