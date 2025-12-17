# MIDI Mapping Guide

## Understanding MIDI Messages

Your DDJ-FLX2 (or any MIDI controller) sends three main types of messages:

### 1. Note On/Off Messages
- Triggered by: Pads, keyboard keys
- Parameters:
  - `channel`: MIDI channel (0-15)
  - `note`: Note number (0-127)
  - `velocity`: How hard the pad was hit (0-127)

### 2. Control Change (CC) Messages
- Triggered by: Knobs, faders, buttons
- Parameters:
  - `channel`: MIDI channel (0-15)
  - `controller`: CC number (0-127)
  - `value`: Current value (0-127)

### 3. Program Change Messages
- Triggered by: Preset buttons
- Parameters:
  - `channel`: MIDI channel (0-15)
  - `number`: Program number (0-127)

## Creating Custom Mappings

### Profile Structure

Each profile is a JSON file in `config/profiles/` with this structure:

```json
{
  "name": "Profile Name",
  "description": "What this profile does",
  "mappings": [
    {
      "comment": "Optional description",
      "midi": {
        "type": "noteon",
        "channel": 0,
        "note": 5
      },
      "action": {
        "type": "rating",
        "rating": 5
      }
    }
  ]
}
```

### MIDI Pattern Matching

The `midi` object defines what MIDI message to match:

```json
{
  "type": "noteon",      // Required: "noteon", "noteoff", "cc", "program"
  "channel": 0,          // Optional: 0-15 (omit to match any channel)
  "note": 5,             // For note messages: 0-127
  "controller": 7        // For CC messages: 0-127
}
```

### Action Types

#### 1. Set Rating
```json
{
  "type": "rating",
  "rating": 5           // 0-5 stars
}
```

#### 2. Set Flag
```json
{
  "type": "flag",
  "flag": "pick"        // "pick", "reject", or "unflag"
}
```

#### 3. Set Color Label
```json
{
  "type": "colorLabel",
  "color": "red"        // "red", "yellow", "green", "blue", "purple", "none"
}
```

#### 4. Set Parameter Value (with scaling)
```json
{
  "type": "setValue",
  "parameter": "Exposure2012",
  "tracking": true,     // Enable tracking for smoother performance
  "scale": {
    "midiMin": 0,       // MIDI input range
    "midiMax": 127,
    "lrMin": -5,        // Lightroom output range
    "lrMax": 5
  }
}
```

#### 5. Increment/Decrement
```json
{
  "type": "increment",
  "parameter": "Exposure2012",
  "amount": 0.5         // Optional, uses default if omitted
}
```

#### 6. Generic Command
```json
{
  "type": "command",
  "command": "setAutoTone",
  "params": []          // Optional parameters for the command
}
```

#### 7. Switch Profile
```json
{
  "type": "switchProfile",
  "profile": "ddj-flx2-navigate"
}
```

## Common Lightroom Parameters

### Basic Adjustments
- `Exposure2012`: -5 to 5
- `Contrast2012`: -100 to 100
- `Highlights2012`: -100 to 100
- `Shadows2012`: -100 to 100
- `Whites2012`: -100 to 100
- `Blacks2012`: -100 to 100

### Color
- `Temperature`: 2000 to 50000
- `Tint`: -150 to 150
- `Vibrance`: -100 to 100
- `Saturation`: -100 to 100

### Tone Curve
- `ParametricDarks`: -100 to 100
- `ParametricLights`: -100 to 100
- `ParametricShadows`: -100 to 100
- `ParametricHighlights`: -100 to 100

### Detail
- `Sharpness`: 0 to 150
- `LuminanceSmoothing`: 0 to 100
- `ColorNoiseReduction`: 0 to 100

### Effects
- `Clarity2012`: -100 to 100
- `Dehaze`: -100 to 100
- `PostCropVignetteAmount`: -100 to 100
- `GrainAmount`: 0 to 100

### HSL
- `HueAdjustmentRed`: -100 to 100
- `HueAdjustmentOrange`: -100 to 100
- `HueAdjustmentYellow`: -100 to 100
- `HueAdjustmentGreen`: -100 to 100
- `HueAdjustmentAqua`: -100 to 100
- `HueAdjustmentBlue`: -100 to 100
- `HueAdjustmentPurple`: -100 to 100
- `HueAdjustmentMagenta`: -100 to 100

(Substitute `Saturation` or `Luminance` for `Hue` to adjust those properties)

## Available Commands

Navigation:
- `previousPhoto()`
- `nextPhoto()`
- `showView(viewName)` - "loupe", "square_grid", "compare", "dynamic_grid"
- `zoomIn()`, `zoomOut()`, `toggleZoom()`
- `zoomToFit()`, `zoomToFill()`, `zoomToOneToOne()`

Edit Operations:
- `setAutoTone()`
- `toggleBlackAndWhite()`
- `toggleHDR()`
- `resetToDefault(parameter)`
- `resetAllDevelopAdjustments()`
- `resetCrop()`

## Debugging Your Mappings

### Enable Debug Mode
```bash
DEBUG=1 npm start
```

This will log all MIDI messages to the console, showing you the exact values to use in your mappings.

### Enable MIDI-Only Debug
```bash
DEBUG_MIDI=1 npm start
```

### Test Your Controller

1. Start the app with debug mode
2. Press/turn each control on your controller
3. Note the values in the console output
4. Use those exact values in your profile JSON

Example output:
```
MIDI: {
  type: 'noteon',
  channel: 0,
  note: 7,
  velocity: 127,
  timestamp: 1234567890
}
```

Use in profile:
```json
{
  "midi": { "type": "noteon", "channel": 0, "note": 7 },
  "action": { ... }
}
```

## Tips for Good Mappings

1. **Use tracking for continuous controls**: Set `"tracking": true` on CC mappings for smooth parameter changes

2. **Group related controls**: Create separate profiles for different workflows (Edit, Navigate, Color)

3. **Add profile switching**: Include a button mapping to switch between profiles

4. **Start simple**: Map just a few controls first, test them, then expand

5. **Use appropriate ranges**: Match MIDI ranges to Lightroom ranges using the `scale` object

6. **Comment your mappings**: Use the `"comment"` field to document what each mapping does

## Example Workflow

1. Start in Edit mode (basic adjustments)
2. Press pad 15 to switch to Color mode
3. Adjust HSL sliders
4. Press pad 15 again to return to Edit mode
5. Press pad 14 to switch to Navigation mode
6. Browse photos and rate them

