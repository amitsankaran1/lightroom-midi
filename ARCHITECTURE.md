# Architecture Overview

## System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │  MIDI   │                 │  JSON   │                 │
│  MIDI           │ ──────> │  Node.js        │ <────── │  Profile        │
│  Controller     │Messages │  Application    │Mappings │  Configs        │
│  (DDJ-FLX2)     │         │                 │         │  (*.json)       │
│                 │         │                 │         │                 │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                     │
                                     │ WebSocket
                                     │ (JSON-RPC)
                                     ▼
                            ┌─────────────────┐
                            │                 │
                            │  Adobe          │
                            │  Lightroom      │
                            │  (API Server)   │
                            │                 │
                            └─────────────────┘
```

## Component Architecture

```
lr-controller/
│
├── src/index.js                    # Main application entry point
│   └── Orchestrates all components
│
├── src/midi/MidiHandler.js         # MIDI Input Layer
│   ├── Connects to MIDI devices
│   ├── Listens for MIDI messages
│   └── Emits normalized message events
│
├── src/lightroom/LrClient.js       # Lightroom API Layer
│   ├── WebSocket connection management
│   ├── Request/response handling
│   ├── Client GUID persistence
│   └── High-level API methods
│
├── src/profiles/ProfileManager.js  # Mapping Engine
│   ├── Profile loading and switching
│   ├── MIDI message → Action mapping
│   ├── Value scaling and transformation
│   └── Tracking state management
│
└── config/profiles/*.json          # Configuration Layer
    └── Declarative MIDI → LR mappings
```

## Data Flow

### 1. MIDI Input Flow
```
Physical Button Press
    ↓
MIDI Hardware Driver
    ↓
easymidi Library
    ↓
MidiHandler.handleMessage()
    ↓
ProfileManager.processMidiMessage()
    ↓
ProfileManager.findMapping()
    ↓
ProfileManager.executeMapping()
    ↓
LrClient.[method]()
    ↓
WebSocket → Lightroom
```

### 2. Profile Mapping Flow
```
MIDI Message: { type: "noteon", channel: 0, note: 5 }
    ↓
Profile Lookup: Find matching pattern in active profile
    ↓
Match Found: { midi: {...}, action: { type: "rating", rating: 5 } }
    ↓
Action Execution: lrClient.setRating(5)
    ↓
LR API Call: sendMessage('rating5', [])
    ↓
WebSocket → Lightroom sets rating to 5 stars
```

### 3. Value Scaling Flow (for continuous controls)
```
MIDI CC Value: 64 (range 0-127)
    ↓
Scale Config: { midiMin: 0, midiMax: 127, lrMin: -5, lrMax: 5 }
    ↓
Normalize: (64 - 0) / (127 - 0) = 0.504
    ↓
Scale: -5 + (0.504 × (5 - (-5))) = 0.04
    ↓
LR API: setValue("Exposure2012", 0.04)
```

## Class Responsibilities

### LrClient
**Purpose**: Abstracts Lightroom's WebSocket API

**Responsibilities**:
- Maintain WebSocket connection
- Handle registration and authorization
- Send requests with unique IDs
- Match responses to requests
- Provide high-level API methods
- Handle reconnection

**Key Methods**:
- `connect()`: Establish connection and register
- `sendMessage(message, params)`: Low-level API call
- `setValue(parameter, value)`: Set parameter value
- `increment/decrement()`: Adjust parameters
- `startTracking/stopTracking()`: Performance optimization

### MidiHandler
**Purpose**: Normalize MIDI input from any controller

**Responsibilities**:
- Detect and list MIDI devices
- Connect to selected device
- Listen for all MIDI message types
- Normalize message format
- Emit events to application

**Key Methods**:
- `static listDevices()`: Enumerate MIDI devices
- `connect(deviceName)`: Connect to device
- `handleMessage(message)`: Process and emit MIDI events

### ProfileManager
**Purpose**: Map MIDI messages to Lightroom actions

**Responsibilities**:
- Load profile configurations from JSON
- Switch between profiles
- Match MIDI messages to mappings
- Execute mapped actions
- Manage tracking state
- Apply value transformations

**Key Methods**:
- `loadProfiles(directory)`: Load all profiles
- `switchProfile(name)`: Change active profile
- `processMidiMessage(msg)`: Main routing logic
- `findMapping(msg)`: Pattern matching
- `executeMapping(mapping, msg)`: Action execution

## Message Protocol

### Lightroom WebSocket Protocol

**Request Format**:
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "object": null,
  "message": "setValue",
  "params": ["Exposure2012", 1.5]
}
```

**Response Format**:
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "success": true,
  "response": {}
}
```

### Internal MIDI Message Format

Normalized across all MIDI message types:

```javascript
{
  type: "noteon" | "noteoff" | "cc" | "program" | "pitch",
  channel: 0-15,
  
  // For note messages
  note: 0-127,
  velocity: 0-127,
  
  // For CC messages
  controller: 0-127,
  value: 0-127,
  
  // For program messages
  number: 0-127,
  
  timestamp: 1234567890,
  raw: { /* original message */ }
}
```

## Profile Configuration Schema

```json
{
  "name": "string",
  "description": "string",
  "mappings": [
    {
      "comment": "optional description",
      "midi": {
        "type": "noteon|noteoff|cc|program",
        "channel": 0-15,        // optional
        "note": 0-127,          // for note messages
        "controller": 0-127     // for CC messages
      },
      "action": {
        "type": "rating|flag|colorLabel|setValue|increment|decrement|command|switchProfile",
        
        // Type-specific fields
        "rating": 0-5,
        "flag": "pick|reject|unflag",
        "color": "red|yellow|green|blue|purple|none",
        
        "parameter": "string",
        "tracking": true|false,
        "scale": {
          "midiMin": 0,
          "midiMax": 127,
          "lrMin": -100,
          "lrMax": 100
        },
        
        "command": "string",
        "params": [],
        
        "profile": "string"
      }
    }
  ]
}
```

## Performance Optimizations

### Tracking Mode
When a user adjusts a slider continuously, Lightroom enters "tracking mode" for better performance:

- Lower quality preview (faster)
- No history states created per adjustment
- Single history state created when done

**Implementation**:
```javascript
// Start tracking when first CC message received
await lrClient.startTracking("Exposure2012");

// Send multiple setValue calls
await lrClient.setValue("Exposure2012", 0.5);
await lrClient.setValue("Exposure2012", 0.7);
// ... more adjustments ...

// Stop tracking after delay (automatic)
// → Creates single history entry
```

### Request Batching
Multiple adjustments in quick succession are grouped into a single "Multiple Settings" history state if they occur within 0.5 seconds (configurable).

### Connection Resilience
- Automatic reconnection on disconnect
- Client GUID persistence for authorization
- Graceful degradation on errors

## Extension Points

### Adding New Action Types
1. Add action type to ProfileManager.executeMapping()
2. Implement logic in switch statement
3. Document in MIDI_MAPPING.md

### Adding New Commands
1. Add method to LrClient class
2. Export in action handler
3. Document in MIDI_MAPPING.md

### Custom Value Transformations
Current: Linear scaling

Possible enhancements:
- Logarithmic curves
- S-curves
- Stepped values
- Deadzone handling
- Acceleration

## Future Enhancements

### Phase 2: Electron GUI
```
┌─────────────────────────────────────────┐
│  Electron Main Process                  │
│  ├── Node.js Core (current app)         │
│  └── IPC Bridge                          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Renderer Process (Web UI)              │
│  ├── Profile Editor                     │
│  ├── MIDI Learn Interface               │
│  ├── Visual Mapping Designer            │
│  └── Live MIDI Monitor                  │
└─────────────────────────────────────────┘
```

### Planned Features
- [ ] Visual profile editor
- [ ] Drag-and-drop MIDI learning
- [ ] Multi-controller support
- [ ] Conditional mappings (context-aware)
- [ ] Macro support (sequence of actions)
- [ ] MIDI output (LED feedback)
- [ ] Profile sharing/import
- [ ] Preset management
- [ ] Keyboard shortcuts alongside MIDI
- [ ] Plugin system for custom actions

## Development Guidelines

### Adding a New Profile
1. Copy existing profile as template
2. Use `npm run midi-learn` to discover MIDI values
3. Map to Lightroom parameters (see LIGHTROOM_PARAMETERS.md)
4. Test incrementally
5. Document in comments

### Debugging
1. Use `DEBUG=1 npm start` for full logging
2. Use `DEBUG_MIDI=1 npm start` for MIDI-only logging
3. Use `npm run lr-params` to explore parameters
4. Check WebSocket connection in Lightroom preferences

### Code Style
- ES6 modules
- Async/await for async operations
- Descriptive variable names
- Comments for complex logic
- Error handling with try/catch

## Security Considerations

- WebSocket connection is local only (127.0.0.1)
- No external network access required
- Client GUID stored locally in `.lr-controller-client-id`
- User must approve initial connection in Lightroom
- No sensitive data transmitted

## Dependencies

- `easymidi`: MIDI device access
- `ws`: WebSocket client
- `uuid`: Unique ID generation

All dependencies are well-maintained and have minimal sub-dependencies.

