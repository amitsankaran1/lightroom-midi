import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import MidiHandler from '../midi/MidiHandler.js';
import LrClient from '../lightroom/LrClient.js';
import ProfileManager from '../profiles/ProfileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let midiHandler;
let lrClient;
let profileManager;

// State
let currentProfile = null;
let midiDevices = [];
let connectedDevice = null;
let connectionStatus = {
  midi: false,
  lightroom: false
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a',
    title: 'Lightroom MIDI Controller - DDJ-FLX2'
  });

  mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

async function initializeBackend() {
  try {
    // Initialize components
    midiHandler = new MidiHandler();
    lrClient = new LrClient();
    profileManager = new ProfileManager(lrClient);

    // Load profiles
    const profilesPath = path.join(__dirname, '../../config/profiles');
    await profileManager.loadProfiles(profilesPath);

    // Get available profiles
    const profiles = profileManager.listProfiles();
    mainWindow.webContents.send('profiles-loaded', profiles);

    // List MIDI devices
    midiDevices = midiHandler.listDevices();
    mainWindow.webContents.send('midi-devices', midiDevices);

    // Connect to Lightroom
    await connectToLightroom();

    // Set up MIDI event handling
    midiHandler.on('message', (message) => {
      // Send MIDI message to renderer for visual feedback
      mainWindow.webContents.send('midi-message', message);

      // Process through ProfileManager
      if (profileManager.currentProfile) {
        profileManager.processMidiMessage(message);
      }
    });

    // Set up Lightroom parameter change tracking
    lrClient.on('parameterChanged', (data) => {
      mainWindow.webContents.send('parameter-changed', data);
    });

    lrClient.on('connected', () => {
      connectionStatus.lightroom = true;
      mainWindow.webContents.send('connection-status', connectionStatus);
    });

    lrClient.on('disconnected', () => {
      connectionStatus.lightroom = false;
      mainWindow.webContents.send('connection-status', connectionStatus);
    });

  } catch (error) {
    console.error('Failed to initialize backend:', error);
    mainWindow.webContents.send('error', {
      message: 'Failed to initialize',
      error: error.message
    });
  }
}

async function connectToLightroom() {
  try {
    await lrClient.connect();
    connectionStatus.lightroom = true;
    mainWindow.webContents.send('connection-status', connectionStatus);
  } catch (error) {
    console.error('Failed to connect to Lightroom:', error);
    connectionStatus.lightroom = false;
    mainWindow.webContents.send('connection-status', connectionStatus);
  }
}

// IPC Handlers
ipcMain.handle('get-midi-devices', async () => {
  return midiDevices;
});

ipcMain.handle('connect-midi-device', async (event, deviceName) => {
  try {
    await midiHandler.connect(deviceName);
    connectedDevice = deviceName;
    connectionStatus.midi = true;
    mainWindow.webContents.send('connection-status', connectionStatus);
    return { success: true, device: deviceName };
  } catch (error) {
    console.error('Failed to connect to MIDI device:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-midi-device', async () => {
  try {
    midiHandler.disconnect();
    connectedDevice = null;
    connectionStatus.midi = false;
    mainWindow.webContents.send('connection-status', connectionStatus);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-profiles', async () => {
  return profileManager.listProfiles();
});

ipcMain.handle('switch-profile', async (event, profileName) => {
  try {
    profileManager.switchProfile(profileName);
    currentProfile = profileName;

    // Send current profile mappings to renderer
    const profileData = profileManager.getCurrentProfile();
    mainWindow.webContents.send('profile-switched', {
      name: profileName,
      mappings: profileData.profile ? profileData.profile.mappings : []
    });

    return { success: true, profile: profileName };
  } catch (error) {
    console.error('Failed to switch profile:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-connection-status', async () => {
  return connectionStatus;
});

ipcMain.handle('get-current-profile', async () => {
  return currentProfile;
});

ipcMain.handle('reconnect-lightroom', async () => {
  await connectToLightroom();
  return connectionStatus;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Initialize backend after window is created
  initializeBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Clean up
  if (midiHandler) {
    midiHandler.disconnect();
  }
  if (lrClient) {
    lrClient.disconnect();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
