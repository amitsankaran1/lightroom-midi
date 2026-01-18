// State
let activePads = new Set();
let currentProfile = null;
let midiLog = [];
const MAX_LOG_ENTRIES = 50;

// DOM Elements
const elements = {
    profileSelect: document.getElementById('profile-select'),
    deviceSelect: document.getElementById('device-select'),
    connectBtn: document.getElementById('connect-btn'),
    midiStatus: document.getElementById('midi-status'),
    lrStatus: document.getElementById('lr-status'),
    midiDeviceName: document.getElementById('midi-device-name'),
    lrStatusText: document.getElementById('lr-status-text'),
    midiLogContent: document.getElementById('midi-log-content'),
    pads: document.querySelectorAll('.pad'),
    knobs: document.querySelectorAll('.knob'),
    paramValues: document.querySelectorAll('[data-param]')
};

// Initialize
async function init() {
    // Set up event listeners
    elements.connectBtn.addEventListener('click', handleConnectDevice);
    elements.profileSelect.addEventListener('change', handleProfileChange);

    // Load initial data
    await loadMidiDevices();
    await loadProfiles();
    await updateConnectionStatus();
    await loadCurrentProfile();

    // Set up IPC listeners
    setupIPCListeners();
}

// Load MIDI devices
async function loadMidiDevices() {
    try {
        const devices = await window.electronAPI.getMidiDevices();
        console.log('Loaded MIDI devices:', devices);
        populateDeviceSelect(devices);
    } catch (error) {
        console.error('Failed to load MIDI devices:', error);
    }
}

function populateDeviceSelect(devices) {
    console.log('Populating device select with:', devices);
    elements.deviceSelect.innerHTML = '<option value="">Select Device...</option>';
    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device;
        option.textContent = device;
        elements.deviceSelect.appendChild(option);
    });
    console.log('Device select populated, options count:', elements.deviceSelect.options.length);
}

// Load profiles
async function loadProfiles() {
    try {
        const profiles = await window.electronAPI.getProfiles();
        populateProfileSelect(profiles);
    } catch (error) {
        console.error('Failed to load profiles:', error);
    }
}

function populateProfileSelect(profiles) {
    elements.profileSelect.innerHTML = '<option value="">Select Profile...</option>';
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile;
        option.textContent = formatProfileName(profile);
        elements.profileSelect.appendChild(option);
    });
}

function formatProfileName(profileName) {
    // Convert "ddj-flx2-edit" to "Edit Mode"
    return profileName
        .replace('ddj-flx2-', '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') + ' Mode';
}

// Load current profile
async function loadCurrentProfile() {
    try {
        const profile = await window.electronAPI.getCurrentProfile();
        if (profile) {
            currentProfile = profile;
            elements.profileSelect.value = profile;
            updatePadLabels(profile);
        }
    } catch (error) {
        console.error('Failed to load current profile:', error);
    }
}

// Handle device connection
async function handleConnectDevice() {
    const deviceName = elements.deviceSelect.value;
    if (!deviceName) {
        alert('Please select a MIDI device');
        return;
    }

    elements.connectBtn.disabled = true;
    elements.connectBtn.textContent = 'Connecting...';

    try {
        const result = await window.electronAPI.connectMidiDevice(deviceName);
        if (result.success) {
            elements.midiDeviceName.textContent = deviceName;
            logMessage('success', `Connected to ${deviceName}`);
        } else {
            alert(`Failed to connect: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        elements.connectBtn.disabled = false;
        elements.connectBtn.textContent = 'Connect';
    }
}

// Handle profile change
async function handleProfileChange() {
    const profileName = elements.profileSelect.value;
    if (!profileName) return;

    try {
        const result = await window.electronAPI.switchProfile(profileName);
        if (result.success) {
            currentProfile = profileName;
            logMessage('info', `Switched to ${formatProfileName(profileName)}`);
            updatePadLabels(profileName);
        } else {
            alert(`Failed to switch profile: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Update pad labels based on profile
function updatePadLabels(profileName) {
    const padMappings = {
        'ddj-flx2-edit': [
            '★', '★★', '★★★', '★★★★',
            '★★★★★', 'No Rating', 'Auto Tone', 'B&W'
        ],
        'ddj-flx2-navigate': [
            'Prev', 'Next', 'Zoom', 'Fit',
            'Fill', '100%', 'Grid', 'Loupe'
        ],
        'ddj-flx2-color': [
            'Red Hue', 'Orange Hue', 'Yellow Hue', 'Green Hue',
            'Aqua Hue', 'Blue Hue', 'Purple Hue', 'Magenta Hue'
        ]
    };

    const labels = padMappings[profileName];
    if (labels) {
        const pads = document.querySelectorAll('.deck-left .pad');
        pads.forEach((pad, index) => {
            const label = pad.querySelector('.pad-label');
            if (label && labels[index]) {
                label.textContent = labels[index];
            }
        });
    }
}

// Update connection status
async function updateConnectionStatus() {
    try {
        const status = await window.electronAPI.getConnectionStatus();
        updateStatusIndicators(status);
    } catch (error) {
        console.error('Failed to get connection status:', error);
    }
}

function updateStatusIndicators(status) {
    // MIDI status
    if (status.midi) {
        elements.midiStatus.classList.add('connected');
        elements.midiStatus.classList.remove('disconnected');
    } else {
        elements.midiStatus.classList.add('disconnected');
        elements.midiStatus.classList.remove('connected');
        elements.midiDeviceName.textContent = 'Not Connected';
    }

    // Lightroom status
    if (status.lightroom) {
        elements.lrStatus.classList.add('connected');
        elements.lrStatus.classList.remove('disconnected');
        elements.lrStatusText.textContent = 'Connected';
    } else {
        elements.lrStatus.classList.add('disconnected');
        elements.lrStatus.classList.remove('connected');
        elements.lrStatusText.textContent = 'Not Connected';
    }
}

// Set up IPC listeners
function setupIPCListeners() {
    // MIDI messages
    window.electronAPI.onMidiMessage((message) => {
        handleMidiMessage(message);
        logMidiMessage(message);
    });

    // Parameter changes
    window.electronAPI.onParameterChanged((data) => {
        updateParameterDisplay(data);
    });

    // Connection status changes
    window.electronAPI.onConnectionStatus((status) => {
        console.log('Received connection-status event:', status);
        updateStatusIndicators(status);
    });

    // Profile switched
    window.electronAPI.onProfileSwitched((data) => {
        currentProfile = data.name;
        logMessage('info', `Profile switched to ${formatProfileName(data.name)}`);
    });

    // MIDI devices updated
    window.electronAPI.onMidiDevices((devices) => {
        console.log('Received midi-devices event:', devices);
        populateDeviceSelect(devices);
    });

    // Profiles loaded
    window.electronAPI.onProfilesLoaded((profiles) => {
        populateProfileSelect(profiles);
    });

    // Errors
    window.electronAPI.onError((error) => {
        logMessage('error', error.message);
        console.error('Error from main process:', error);
    });
}

// Handle MIDI message
function handleMidiMessage(message) {
    // Handle pad presses
    if (message.type === 'noteon') {
        activatePad(message.note, message.velocity > 0);
    } else if (message.type === 'noteoff') {
        deactivatePad(message.note);
    }

    // Handle CC (knobs/faders)
    if (message.type === 'cc') {
        updateKnobPosition(message.controller, message.value);
    }
}

// Activate pad
function activatePad(note, active) {
    const pad = document.querySelector(`.pad[data-note="${note}"]`);
    if (pad) {
        if (active) {
            pad.classList.add('active');
            activePads.add(note);

            // Auto-deactivate after 200ms for visual feedback
            setTimeout(() => {
                deactivatePad(note);
            }, 200);
        }
    }
}

// Deactivate pad
function deactivatePad(note) {
    const pad = document.querySelector(`.pad[data-note="${note}"]`);
    if (pad) {
        pad.classList.remove('active');
        activePads.delete(note);
    }
}

// Update knob position (visual rotation)
function updateKnobPosition(controller, value) {
    const knob = document.querySelector(`.knob[data-control="cc-${controller}"]`);
    if (knob) {
        const indicator = knob.querySelector('.knob-indicator');
        if (indicator) {
            // Map MIDI value (0-127) to rotation (-135° to +135°)
            const rotation = ((value / 127) * 270) - 135;
            indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
    }
}

// Update parameter display
function updateParameterDisplay(data) {
    const { parameter, value } = data;
    const paramElement = document.querySelector(`[data-param="${parameter}"]`);

    if (paramElement) {
        // Format value based on parameter type
        let formattedValue = value;

        if (parameter.includes('Exposure')) {
            formattedValue = value.toFixed(2);
        } else if (parameter.includes('Temperature')) {
            formattedValue = Math.round(value) + 'K';
        } else if (typeof value === 'number') {
            formattedValue = Math.round(value);
        }

        paramElement.textContent = formattedValue;

        // Flash animation
        paramElement.style.transition = 'none';
        paramElement.style.backgroundColor = 'rgba(255, 107, 0, 0.3)';
        setTimeout(() => {
            paramElement.style.transition = 'background-color 0.5s';
            paramElement.style.backgroundColor = '';
        }, 50);
    }
}

// Log MIDI message
function logMidiMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    let messageText = '';

    if (message.type === 'noteon' || message.type === 'noteoff') {
        messageText = `${message.type.toUpperCase()} - Note: ${message.note}, Velocity: ${message.velocity}`;
    } else if (message.type === 'cc') {
        messageText = `CC - Controller: ${message.controller}, Value: ${message.value}`;
    } else {
        messageText = `${message.type.toUpperCase()} - ${JSON.stringify(message)}`;
    }

    addLogEntry(timestamp, messageText, 'midi');
}

// Log general message
function logMessage(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    addLogEntry(timestamp, message, type);
}

// Add log entry
function addLogEntry(timestamp, message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'midi-log-entry';
    entry.innerHTML = `
        <div class="timestamp">${timestamp}</div>
        <div class="message">${message}</div>
    `;

    // Add to beginning of log
    elements.midiLogContent.insertBefore(entry, elements.midiLogContent.firstChild);

    // Limit log entries
    while (elements.midiLogContent.children.length > MAX_LOG_ENTRIES) {
        elements.midiLogContent.removeChild(elements.midiLogContent.lastChild);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
