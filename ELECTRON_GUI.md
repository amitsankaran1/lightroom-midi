# Electron GUI for DDJ-FLX2 Lightroom Controller

This Electron app provides a visual interface that matches your DDJ-FLX2 turntable layout, showing real-time MIDI activity and Lightroom parameter values.

## Features

- **Visual Controller Layout**: GUI that mirrors the DDJ-FLX2 turntable design
  - 8 Performance pads per deck with visual feedback
  - Jog wheels representation
  - Mixer section with EQ knobs and faders
  - Deck controls (Play/Pause, Cue, Sync)

- **Real-time MIDI Feedback**: See which pads are pressed and knobs are turned
- **Lightroom Parameter Display**: Live parameter values update as you edit
- **Profile Switching**: Change between Edit, Navigation, and Color Grading modes
- **Connection Status**: Visual indicators for MIDI and Lightroom connections
- **MIDI Activity Log**: See all incoming MIDI messages in real-time

## Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure Adobe Lightroom is running with the Controller API enabled

3. Connect your DDJ-FLX2 or MIDI controller

## Running the App

### Start the Electron GUI:
```bash
npm run electron
```

### Development mode (with DevTools):
```bash
npm run electron:dev
```

### CLI mode (original):
```bash
npm start
```

## Usage

1. **Launch the app**: `npm run electron`

2. **Connect MIDI Device**:
   - Select your controller from the "MIDI Device" dropdown
   - Click "Connect"
   - The status indicator will turn green when connected

3. **Select Profile**:
   - Choose a profile from the "Profile" dropdown
   - Edit Mode: Photo editing controls (exposure, contrast, ratings)
   - Navigate Mode: Photo navigation and view controls
   - Color Mode: HSL color grading controls

4. **Use Your Controller**:
   - Press pads to trigger actions (ratings, navigation, etc.)
   - Turn knobs to adjust Lightroom parameters
   - Watch the GUI update in real-time as you interact

## GUI Layout

### DDJ-FLX2 Visual Representation

```
┌─────────────────────────────────────────────────────────┐
│  Header: Connection Status | Profile Selector          │
├──────┬──────────────────┬──────────────────┬───────────┤
│ Deck 1                  │ Mixer Section    │ Deck 2    │
│ ┌──────────┐            │                  │           │
│ │ Jog Wheel│            │  EQ   CrossFader │           │
│ └──────────┘            │  CH1     CH2     │           │
│ [▶][CUE][SYNC]         │  Faders          │           │
│ ┌─┬─┬─┬─┐              │                  │           │
│ │1│2│3│4│ Pads         │                  │           │
│ ├─┼─┼─┼─┤              │                  │           │
│ │5│6│7│8│              │                  │           │
│ └─┴─┴─┴─┘              │                  │           │
├────────────────────────────────────────────────────────┤
│ Lightroom Parameters                                   │
│ Exposure: 0.00 | Contrast: 0 | Highlights: 0 | ...    │
├────────────────────────────────────────────────────────┤
│ MIDI Activity Log                                      │
│ 12:34:56 - NOTEON Note: 5, Velocity: 127              │
└────────────────────────────────────────────────────────┘
```

## Profile Mappings

### Edit Mode (ddj-flx2-edit)
**Pads:**
- Pad 1-5: Star ratings (1-5 stars)
- Pad 6: Clear rating
- Pad 7: Auto Tone
- Pad 8: Black & White toggle

**Knobs/Faders:**
- CC 1: Exposure
- CC 2: Contrast
- CC 3: Highlights
- CC 4: Shadows
- CC 5: Whites
- CC 6: Blacks
- CC 7: Vibrance
- CC 8: Saturation
- CC 9: Temperature
- CC 10: Tint

### Navigate Mode (ddj-flx2-navigate)
**Pads:**
- Pad 1: Previous Photo
- Pad 2: Next Photo
- Pad 3: Toggle Zoom
- Pad 4: Zoom to Fit
- Pad 5: Zoom to Fill
- Pad 6: Zoom 100%
- Pad 7: Grid View
- Pad 8: Loupe View

### Color Mode (ddj-flx2-color)
**Knobs:**
- CC 1-8: HSL Hue adjustments (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta)
- CC 9: Clarity
- CC 10: Dehaze

## Architecture

### Main Process (`src/electron/main.js`)
- Integrates existing backend code (MidiHandler, LrClient, ProfileManager)
- Handles IPC communication with renderer
- Manages MIDI and Lightroom connections

### Renderer Process (`renderer/`)
- `index.html`: GUI layout matching DDJ-FLX2 design
- `styles.css`: Turntable-inspired styling with visual feedback
- `app.js`: UI logic and IPC communication

### Preload Script (`src/electron/preload.js`)
- Secure bridge between main and renderer processes
- Exposes only necessary APIs

## Customization

### Adding Custom Profiles
1. Create a new JSON file in `config/profiles/`
2. Define MIDI mappings and Lightroom actions
3. Reload the app - the new profile will appear in the selector

### Modifying the GUI
- Edit `renderer/styles.css` to change colors, sizes, layout
- Edit `renderer/index.html` to add/remove controls
- Edit `renderer/app.js` to change behavior

## Troubleshooting

### MIDI Device Not Connecting
- Make sure the device is plugged in and recognized by your OS
- Try unplugging and reconnecting
- Check that no other software is using the device

### Lightroom Not Connecting
- Ensure Lightroom is running
- Enable the Controller API in Lightroom:
  - File > Plug-in Manager > Controller API > Enable
- Check that Lightroom is listening on port 7682

### GUI Not Updating
- Check the MIDI Activity Log for incoming messages
- Verify you've selected the correct profile
- Try switching profiles to refresh

## Development

### Project Structure
```
lightroom-midi/
├── src/
│   ├── electron/
│   │   ├── main.js          # Electron main process
│   │   └── preload.js       # IPC bridge
│   ├── midi/
│   │   └── MidiHandler.js   # MIDI input handler
│   ├── lightroom/
│   │   └── LrClient.js      # Lightroom WebSocket client
│   └── profiles/
│       └── ProfileManager.js # Profile management
├── renderer/
│   ├── index.html           # GUI markup
│   ├── styles.css           # Styling
│   └── app.js               # UI logic
└── config/
    └── profiles/            # MIDI mapping profiles
```

### Building for Distribution
To package the app for distribution:
```bash
# Install electron-builder
npm install --save-dev electron-builder

# Build for current platform
npm run build
```

## License

MIT
