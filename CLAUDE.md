# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MIDI-to-Lightroom bridge that allows DJ controllers (specifically the DDJ-FLX2) to control Adobe Lightroom Classic photo editing operations. The application receives MIDI messages from hardware controllers and translates them into Lightroom API commands via WebSocket.

## Architecture

The system consists of three main components that communicate via events:

1. **MidiHandler** (`src/midi/MidiHandler.js`) - Manages MIDI device connections and normalizes incoming MIDI messages
2. **ProfileManager** (`src/profiles/ProfileManager.js`) - Maps MIDI messages to Lightroom actions based on JSON configuration files
3. **LrClient** (`src/lightroom/LrClient.js`) - Manages WebSocket connection to Lightroom's API and handles request/response lifecycle

**Data flow**: Physical MIDI Controller → MidiHandler → ProfileManager → LrClient → Lightroom WebSocket API

The application has two modes:
- **CLI mode** (`src/index.js`) - Headless Node.js application
- **Electron GUI** (`src/electron/main.js`) - Visual interface with DDJ-FLX2 turntable layout

See `ARCHITECTURE.md` for detailed diagrams and component interactions.

## Development Commands

### Running the Application
```bash
# CLI mode - headless operation
npm start

# CLI with auto-reload on file changes
npm run dev

# Electron GUI
npm run electron

# Electron GUI with DevTools open
npm run electron:dev
```

### Debugging Tools
```bash
# MIDI learn mode - discover MIDI values from your controller
npm run midi-learn

# List all available Lightroom parameters and ranges
npm run lr-params

# Enable full debug logging
DEBUG=1 npm start

# MIDI-only debug logging
DEBUG_MIDI=1 npm start
```

## Key Technical Details

### ES6 Modules
This project uses ES6 modules (`"type": "module"` in package.json). All imports must use `.js` extensions:
```javascript
import LrClient from './lightroom/LrClient.js';  // Correct
import LrClient from './lightroom/LrClient';     // Wrong
```

### Lightroom WebSocket Protocol
- Lightroom listens on `ws://127.0.0.1:7682` (local only)
- Uses JSON-RPC style messages with unique `requestId` for each request
- Client must register with a persistent GUID (stored in `.lr-controller-client-id`)
- User must approve the connection once in Lightroom preferences

Request format:
```javascript
{
  requestId: "uuid-here",
  object: null,
  message: "setValue",
  params: ["Exposure2012", 1.5]
}
```

### Profile Configuration System
Profiles are JSON files in `config/profiles/` that define MIDI-to-action mappings. Each mapping has:
- **midi**: Pattern to match (type, channel, note/controller)
- **action**: What to do (rating, flag, setValue, command, switchProfile, etc.)

Three pre-configured profiles exist:
- `ddj-flx2-edit.json` - Photo editing (ratings, basic adjustments, auto tone)
- `ddj-flx2-navigate.json` - Photo navigation (prev/next, zoom, views)
- `ddj-flx2-color.json` - HSL color grading

### Performance Optimization: Tracking Mode
When adjusting sliders continuously (like Exposure), use tracking mode:
```javascript
await lrClient.startTracking("Exposure2012");  // Lower quality preview
await lrClient.setValue("Exposure2012", 0.5);  // Fast updates
// ... more adjustments ...
// Auto-stops after delay, creates single history entry
```

Set `"tracking": true` in profile action configs for CC messages mapped to continuous controls.

### Value Scaling
MIDI values (0-127) must be scaled to Lightroom parameter ranges. Profiles use scale objects:
```json
{
  "scale": {
    "midiMin": 0,
    "midiMax": 127,
    "lrMin": -5,      // Exposure range
    "lrMax": 5
  }
}
```

## Adding New Features

### Adding a New Lightroom Command
1. Add method to `LrClient` class (src/lightroom/LrClient.js)
2. Use `sendMessage(messageName, params)` to call Lightroom API
3. Add action handler in `ProfileManager.executeMapping()` switch statement
4. Document the new action type in `docs/MIDI_MAPPING.md`

### Adding a New Profile
1. Copy existing profile from `config/profiles/` as template
2. Use `npm run midi-learn` to discover MIDI values from your controller
3. Consult `docs/LIGHTROOM_PARAMETERS.md` for available Lightroom parameters
4. Test incrementally (app auto-loads profiles on startup)

### Extending the Electron GUI
- **Main process**: `src/electron/main.js` - Backend logic, IPC handlers
- **Renderer**: `renderer/index.html`, `renderer/styles.css`, `renderer/app.js`
- **Security bridge**: `src/electron/preload.js` - Exposes only necessary APIs

## Important Implementation Notes

### MIDI Message Normalization
MidiHandler emits normalized messages with this structure:
```javascript
{
  type: "noteon" | "noteoff" | "cc" | "program",
  channel: 0-15,
  note: 0-127,        // for note messages
  velocity: 0-127,    // for note messages
  controller: 0-127,  // for CC messages
  value: 0-127,       // for CC messages
  timestamp: number,
  raw: {}             // original message
}
```

### Profile Matching
ProfileManager matches MIDI messages to mappings by checking:
1. Message type must match
2. Channel must match (if specified in mapping)
3. Note/controller number must match

If `channel` is omitted from mapping, it matches any channel.

### Connection Resilience
- LrClient automatically attempts reconnection on disconnect
- Client GUID persists across sessions for seamless re-authorization
- Both MIDI and WebSocket connections handle graceful degradation

### Electron IPC Pattern
Main process maintains backend state and sends updates to renderer via:
- `connectionStatus` - MIDI/Lightroom connection state
- `midiActivity` - Real-time MIDI message feed
- `parameterUpdate` - Lightroom parameter changes
- `profileList` / `profileChanged` - Available and active profiles

## Common Tasks

### Testing MIDI Mappings
1. Start with `DEBUG_MIDI=1 npm start` to see incoming messages
2. Press buttons/turn knobs and note the MIDI values
3. Create or modify profile JSON with those values
4. Restart app (or use `npm run dev` for auto-reload)

### Debugging WebSocket Issues
- Check Lightroom Preferences → Interface → "Enable external controllers"
- Verify Lightroom was restarted after enabling
- Check for `.lr-controller-client-id` file in project root
- Look for WebSocket connection errors in console

### Creating Multi-Action Sequences
Not currently supported. Each MIDI message maps to a single action. For complex workflows, consider:
- Using profile switching to change context
- Implementing macro support in ProfileManager (future enhancement)

## File Organization

- `src/` - Core application code
  - `index.js` - CLI entry point
  - `electron/` - Electron app (main, preload)
  - `midi/` - MIDI device handling
  - `lightroom/` - Lightroom API client
  - `profiles/` - Profile management
- `config/profiles/` - MIDI mapping configurations
- `renderer/` - Electron GUI frontend
- `tools/` - Development utilities
- `docs/` - Reference documentation

## Dependencies

- `easymidi` - Cross-platform MIDI device access (wraps platform-specific backends)
- `ws` - WebSocket client for Lightroom connection
- `uuid` - Generates unique request IDs
- `electron` - GUI framework (dev dependency)

All dependencies are stable, well-maintained libraries with minimal transitive dependencies.

## Setup Requirements

**Lightroom Configuration**:
1. Lightroom Classic must be running
2. Preferences → Interface → Enable "Enable external controllers"
3. Restart Lightroom after enabling
4. Approve connection when prompted on first run

**MIDI Controller**:
- Must be recognized by OS (check System Settings/Device Manager)
- Should not be exclusively claimed by other software
- DDJ-FLX2 works out-of-box; other controllers need custom profiles
