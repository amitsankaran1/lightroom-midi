const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // MIDI Device Management
  getMidiDevices: () => ipcRenderer.invoke('get-midi-devices'),
  connectMidiDevice: (deviceName) => ipcRenderer.invoke('connect-midi-device', deviceName),
  disconnectMidiDevice: () => ipcRenderer.invoke('disconnect-midi-device'),

  // Profile Management
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  switchProfile: (profileName) => ipcRenderer.invoke('switch-profile', profileName),
  getCurrentProfile: () => ipcRenderer.invoke('get-current-profile'),

  // Connection Status
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
  reconnectLightroom: () => ipcRenderer.invoke('reconnect-lightroom'),

  // Event Listeners
  onMidiMessage: (callback) => ipcRenderer.on('midi-message', (event, message) => callback(message)),
  onParameterChanged: (callback) => ipcRenderer.on('parameter-changed', (event, data) => callback(data)),
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, status) => callback(status)),
  onProfileSwitched: (callback) => ipcRenderer.on('profile-switched', (event, data) => callback(data)),
  onMidiDevices: (callback) => ipcRenderer.on('midi-devices', (event, devices) => callback(devices)),
  onProfilesLoaded: (callback) => ipcRenderer.on('profiles-loaded', (event, profiles) => callback(profiles)),
  onError: (callback) => ipcRenderer.on('error', (event, error) => callback(error))
});
