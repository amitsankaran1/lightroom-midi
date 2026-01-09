# Quick Start Guide

Get up and running with your Lightroom MIDI controller in minutes!

## Prerequisites

- Node.js 18+ installed
- Adobe Lightroom Classic or Lightroom CC
- A MIDI controller (DDJ-FLX2 or any other)

## Step 1: Enable Lightroom API

1. Open Lightroom
2. Go to **Preferences** (or **Settings**)
3. Click the **Interface** tab
4. Check **"Enable external controllers"**
5. **Restart Lightroom**

## Step 2: Install Dependencies

```bash
cd lr-controller
npm install
```

## Step 3: Test Your Setup

### Option A: Use Pre-configured Profiles

If you have a DDJ-FLX2, you can start immediately:

```bash
npm start
```

The app will:
- ✓ Detect your MIDI controller
- ✓ Connect to Lightroom
- ✓ Load the DDJ-FLX2 profiles
- ✓ Start listening for MIDI messages

### Option B: Discover Your Controller's MIDI Mappings

If you have a different controller, use the MIDI Learn tool:

```bash
npm run midi-learn
```

This will show you the exact MIDI messages your controller sends when you press buttons or turn knobs.

## Step 4: Customize Your Mappings

1. Copy one of the example profiles:
   ```bash
   cd config/profiles
   cp ddj-flx2-edit.json my-controller-edit.json
   ```

2. Edit the JSON file with your controller's MIDI values

3. Restart the app to load your new profile

## Available Profiles

The DDJ-FLX2 comes with three pre-configured profiles:

### 1. Edit Mode (`ddj-flx2-edit.json`)
- **Pads 1-6**: Star ratings (1-5 stars, pad 6 = no rating)
- **Pad 7**: Auto Tone
- **Pad 8**: Black & White toggle
- **Pad 9**: Reset all adjustments
- **Shifted Pads**: Color labels (red, yellow, green, blue, purple, none)
- **CC 1-10**: Basic adjustments (Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Vibrance, Saturation, Temperature, Tint)

### 2. Navigation Mode (`ddj-flx2-navigate.json`)
- **Pad 1**: Previous photo
- **Pad 2**: Next photo
- **Pad 3**: Toggle zoom
- **Pad 4**: Zoom to fit
- **Pad 5**: Zoom to fill
- **Pad 6**: Zoom 100%
- **Pad 7**: Grid view
- **Pad 8**: Loupe view
- **Pads 9-11**: Pick/Reject/Unflag
- **Pad 16**: Switch to Edit profile

### 3. Color Grading Mode (`ddj-flx2-color.json`)
- **CC 1-8**: HSL Hue adjustments (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta)
- **CC 9**: Clarity
- **CC 10**: Dehaze
- **Pad 16**: Switch to Edit profile

## Common Tasks

### Switch Between Profiles

Map a button to switch profiles:

```json
{
  "midi": { "type": "noteon", "channel": 0, "note": 15 },
  "action": { "type": "switchProfile", "profile": "ddj-flx2-navigate" }
}
```

### Map a Knob to a Parameter

```json
{
  "midi": { "type": "cc", "channel": 0, "controller": 1 },
  "action": { 
    "type": "setValue", 
    "parameter": "Exposure2012",
    "tracking": true,
    "scale": {
      "midiMin": 0,
      "midiMax": 127,
      "lrMin": -5,
      "lrMax": 5
    }
  }
}
```

### Map a Button to a Rating

```json
{
  "midi": { "type": "noteon", "channel": 0, "note": 5 },
  "action": { "type": "rating", "rating": 5 }
}
```

### Map a Button to a Command

```json
{
  "midi": { "type": "noteon", "channel": 0, "note": 10 },
  "action": { "type": "command", "command": "setAutoTone" }
}
```

## Debugging

### See All MIDI Messages

```bash
DEBUG_MIDI=1 npm start
```

### See Everything

```bash
DEBUG=1 npm start
```

### Explore Lightroom Parameters

```bash
npm run lr-params
```

This will list all available Lightroom parameters with their ranges and default values.

## Troubleshooting

### "No MIDI devices found"
- Make sure your controller is plugged in
- Check that it's powered on
- Try unplugging and replugging the USB cable

### "Failed to connect to Lightroom"
- Make sure Lightroom is running
- Check that "Enable external controllers" is enabled in preferences
- Try restarting Lightroom

### "Mappings not working"
- Use `npm run midi-learn` to verify your MIDI messages
- Check that your profile JSON is valid
- Look at the console output for errors

### Controller Disconnects
- The app will automatically attempt to reconnect
- Check your USB cable connection
- Some controllers enter sleep mode - press a button to wake them

## Next Steps

- Read [MIDI_MAPPING.md](docs/MIDI_MAPPING.md) for detailed mapping instructions
- Check [LIGHTROOM_PARAMETERS.md](docs/LIGHTROOM_PARAMETERS.md) for all available parameters
- Create custom profiles for different workflows
- Consider adding an Electron GUI (future enhancement)

## Tips for Best Performance

1. **Use tracking**: Set `"tracking": true` on continuous controls (knobs/faders) for smoother performance

2. **Group related controls**: Create separate profiles for different tasks

3. **Start simple**: Map a few controls first, test them, then expand

4. **Use appropriate ranges**: Match your MIDI controller's range to Lightroom's parameter range using the `scale` object

5. **Add comments**: Use `"comment"` fields in your mappings to document what each control does

## Need Help?

- Check the [README.md](README.md) for project overview
- Read the detailed [MIDI Mapping Guide](docs/MIDI_MAPPING.md)
- Browse the [Lightroom Parameters Reference](docs/LIGHTROOM_PARAMETERS.md)

Enjoy controlling Lightroom with your MIDI controller! 🎛️📸

