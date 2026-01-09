# Lightroom MIDI Controller

A flexible MIDI-to-Lightroom bridge that maps your DJ controller (DDJ-FLX2) to Adobe Lightroom operations.

## Features

- 🎛️ **MIDI Input**: Connects to any MIDI controller
- 🔌 **Lightroom Integration**: Uses Lightroom's WebSocket API
- 📋 **Profile System**: Multiple mappings for different workflows
- 🔄 **Easy Remapping**: JSON-based configuration files
- 🎯 **Mode-Aware**: Different profiles for Edit, Grid, Compare modes

## Setup

1. **Enable Lightroom API**:
   - Open Lightroom preferences → Interface tab
   - Check "Enable external controllers"
   - Restart Lightroom

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Connect Your Controller**:
   - Plug in your DDJ-FLX2 (or other MIDI controller)
   - Run `npm start` to see available MIDI devices

4. **Configure Mappings**:
   - Edit profiles in `config/profiles/`
   - Create custom profiles for different workflows

## Project Structure

```
lr-controller/
├── src/
│   ├── index.js              # Main entry point
│   ├── midi/
│   │   └── MidiHandler.js    # MIDI input processing
│   ├── lightroom/
│   │   └── LrClient.js       # WebSocket client
│   └── profiles/
│       └── ProfileManager.js  # Profile loading & switching
├── config/
│   └── profiles/             # JSON mapping configurations
└── package.json
```

## Usage

```bash
# Start the controller
npm start

# Development mode with auto-reload
npm run dev
```

## Configuration

See `config/profiles/` for example mappings. Each profile defines:
- MIDI message → Lightroom command mappings
- Value scaling and transformations
- Conditional logic based on Lightroom state

## Future Plans

- [ ] Electron GUI for visual mapping
- [ ] Profile editor interface
- [ ] MIDI learn mode
- [ ] Multi-controller support

