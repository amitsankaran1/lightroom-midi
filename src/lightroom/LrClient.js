import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lightroom WebSocket Client
 * Handles connection and communication with Lightroom's Controller API
 */
export class LrClient {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 7682;
    this.appName = options.appName || 'LR MIDI Controller';
    this.appVersion = options.appVersion || '0.1.0';
    
    this.ws = null;
    this.connected = false;
    this.pendingRequests = new Map();
    this.observers = new Map();
    this.clientGUID = this.loadClientGUID();
    
    this.onConnectionChange = options.onConnectionChange || (() => {});
  }

  /**
   * Load or generate client GUID for persistent authorization
   */
  loadClientGUID() {
    const guidPath = path.join(process.cwd(), '.lr-controller-client-id');
    try {
      if (fs.existsSync(guidPath)) {
        return fs.readFileSync(guidPath, 'utf8').trim();
      }
    } catch (err) {
      console.warn('Could not load client GUID:', err.message);
    }
    return null;
  }

  /**
   * Save client GUID for future connections
   */
  saveClientGUID(guid) {
    const guidPath = path.join(process.cwd(), '.lr-controller-client-id');
    try {
      fs.writeFileSync(guidPath, guid, 'utf8');
      this.clientGUID = guid;
    } catch (err) {
      console.error('Could not save client GUID:', err.message);
    }
  }

  /**
   * Connect to Lightroom WebSocket server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.host}:${this.port}`;
      console.log(`Connecting to Lightroom at ${url}...`);
      
      this.ws = new WebSocket(url);

      this.ws.on('open', async () => {
        console.log('WebSocket connected, registering...');
        this.connected = true; // Set connected before registering
        try {
          const response = await this.register();
          this.onConnectionChange(true);
          console.log('✓ Connected to Lightroom', response);
          resolve(response);
        } catch (err) {
          this.connected = false; // Reset on failure
          reject(err);
        }
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from Lightroom');
        this.connected = false;
        this.onConnectionChange(false);
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect().catch(() => {});
        }, 5000);
      });
    });
  }

  /**
   * Handle incoming messages from Lightroom
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle responses to our requests
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const { resolve, reject } = this.pendingRequests.get(message.requestId);
        this.pendingRequests.delete(message.requestId);
        
        if (message.success) {
          resolve(message.response);
        } else {
          reject(new Error(message.error || 'Request failed'));
        }
      }
      
      // Handle observer notifications
      if (message.observerId && this.observers.has(message.observerId)) {
        const callback = this.observers.get(message.observerId);
        callback(message.data);
      }
    } catch (err) {
      console.error('Error parsing message:', err.message);
    }
  }

  /**
   * Send a message to Lightroom
   */
  async sendMessage(message, params = [], objectHandle = null) {
    if (!this.connected) {
      throw new Error('Not connected to Lightroom');
    }

    const requestId = uuidv4();
    const request = {
      requestId,
      object: objectHandle,
      message,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.ws.send(JSON.stringify(request));
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Register with Lightroom
   */
  async register() {
    const params = [this.appName, this.appVersion];
    if (this.clientGUID) {
      params.push(this.clientGUID);
    }
    
    const response = await this.sendMessage('register', params);
    
    // Save the client GUID for future connections
    if (response && response.clientGUID) {
      this.saveClientGUID(response.clientGUID);
    }
    
    return response;
  }

  /**
   * API Methods - adjust a parameter value
   */
  async setValue(parameter, value) {
    return this.sendMessage('setValue', [parameter, value]);
  }

  async getValue(parameter) {
    return this.sendMessage('getValue', [parameter]);
  }

  async increment(parameter, amount) {
    return this.sendMessage('increment', [parameter, amount]);
  }

  async decrement(parameter, amount) {
    return this.sendMessage('decrement', [parameter, amount]);
  }

  async startTracking(parameter) {
    return this.sendMessage('startTracking', [parameter]);
  }

  async stopTracking() {
    return this.sendMessage('stopTracking');
  }

  /**
   * View and navigation
   */
  async showView(viewName) {
    return this.sendMessage('showView', [viewName]);
  }

  async nextPhoto() {
    return this.sendMessage('nextPhoto');
  }

  async previousPhoto() {
    return this.sendMessage('previousPhoto');
  }

  async zoomIn() {
    return this.sendMessage('zoomIn');
  }

  async zoomOut() {
    return this.sendMessage('zoomOut');
  }

  async toggleZoom() {
    return this.sendMessage('toggleZoom');
  }

  /**
   * Ratings and flags
   */
  async setRating(rating) {
    return this.sendMessage(`rating${rating}`);
  }

  async flagPick() {
    return this.sendMessage('flagPick');
  }

  async flagReject() {
    return this.sendMessage('flagReject');
  }

  async flagUnflag() {
    return this.sendMessage('flagUnflag');
  }

  /**
   * Color labels
   */
  async setColorLabel(color) {
    return this.sendMessage(`colorLabel${color.charAt(0).toUpperCase() + color.slice(1)}`);
  }

  /**
   * Edit operations
   */
  async setAutoTone() {
    return this.sendMessage('setAutoTone');
  }

  async toggleBlackAndWhite() {
    return this.sendMessage('toggleBlackAndWhite');
  }

  async resetToDefault(parameter) {
    return this.sendMessage('resetToDefault', [parameter]);
  }

  async resetAllDevelopAdjustments() {
    return this.sendMessage('resetAllDevelopAdjustments');
  }

  /**
   * Presets and profiles
   */
  async applyPreset(presetId) {
    return this.sendMessage('applyPreset', [presetId]);
  }

  async getPresetIDs() {
    return this.sendMessage('getPresetIDs');
  }

  /**
   * Get parameter information
   */
  async getParameterNames() {
    return this.sendMessage('getParameterNames');
  }

  async getRange(parameter) {
    return this.sendMessage('getRange', [parameter]);
  }

  /**
   * Disconnect from Lightroom
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }
}

