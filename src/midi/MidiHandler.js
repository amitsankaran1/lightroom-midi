import easymidi from 'easymidi';

/**
 * MIDI Input Handler
 * Manages MIDI device connections and message processing
 */
export class MidiHandler {
  constructor(options = {}) {
    this.deviceName = options.deviceName;
    this.input = null;
    this.onMessage = options.onMessage || (() => {});
    this.onConnectionChange = options.onConnectionChange || (() => {});
  }

  /**
   * List all available MIDI input devices
   */
  static listDevices() {
    return easymidi.getInputs();
  }

  /**
   * Connect to a MIDI device
   */
  connect(deviceName) {
    if (!deviceName) {
      const devices = MidiHandler.listDevices();
      if (devices.length === 0) {
        throw new Error('No MIDI devices found');
      }
      // Try to find DDJ-FLX2 first, otherwise use first device
      deviceName = devices.find(d => d.includes('DDJ-FLX2')) || devices[0];
    }

    try {
      console.log(`Connecting to MIDI device: ${deviceName}`);
      this.input = new easymidi.Input(deviceName);
      this.deviceName = deviceName;
      this.setupListeners();
      this.onConnectionChange(true, deviceName);
      console.log('✓ MIDI device connected');
      return true;
    } catch (err) {
      console.error('Failed to connect to MIDI device:', err.message);
      throw err;
    }
  }

  /**
   * Set up MIDI message listeners
   */
  setupListeners() {
    // Note On (pads pressed)
    this.input.on('noteon', (msg) => {
      this.handleMessage({
        type: 'noteon',
        channel: msg.channel,
        note: msg.note,
        velocity: msg.velocity,
        raw: msg
      });
    });

    // Note Off (pads released)
    this.input.on('noteoff', (msg) => {
      this.handleMessage({
        type: 'noteoff',
        channel: msg.channel,
        note: msg.note,
        velocity: msg.velocity,
        raw: msg
      });
    });

    // Control Change (knobs, faders, buttons)
    this.input.on('cc', (msg) => {
      this.handleMessage({
        type: 'cc',
        channel: msg.channel,
        controller: msg.controller,
        value: msg.value,
        raw: msg
      });
    });

    // Program Change
    this.input.on('program', (msg) => {
      this.handleMessage({
        type: 'program',
        channel: msg.channel,
        number: msg.number,
        raw: msg
      });
    });

    // Pitch Bend
    this.input.on('pitch', (msg) => {
      this.handleMessage({
        type: 'pitch',
        channel: msg.channel,
        value: msg.value,
        raw: msg
      });
    });
  }

  /**
   * Handle incoming MIDI messages
   */
  handleMessage(message) {
    // Add timestamp
    message.timestamp = Date.now();
    
    // Log for debugging
    if (process.env.DEBUG_MIDI) {
      console.log('MIDI:', message);
    }
    
    // Pass to callback
    this.onMessage(message);
  }

  /**
   * Disconnect from MIDI device
   */
  disconnect() {
    if (this.input) {
      this.input.close();
      this.input = null;
      this.onConnectionChange(false, this.deviceName);
      console.log('MIDI device disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.input !== null;
  }
}

