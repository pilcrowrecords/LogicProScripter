/****************************************************************************
 * Pitch to Pan
 * 
 * 
 * 
 * Maps incoming NoteOn pitch to the Direction Mixer's Direction dial,
 * creating a stereo spread that mirrors the physical layout of a keyboard
 * instrument heard from the player's perspective.
 *
 * MIDI pitch 0   → -Spread° (left)
 * MIDI pitch 64  →       0° (center)
 * MIDI pitch 127 → +Spread° (right)
 *
 * The Direction dial range is -180° to +180°. The Spread control sets how
 * far left and right the extremes reach, from 0° (no movement) to 180°
 * (full range). Default is 45°.
 *
 * TargetEvent expects a normalized value of 0.0–1.0, where 0.0 = -180°
 * and 1.0 = +180°.
 *
 * Place this Scripter instance before Direction Mixer in the channel strip,
 * then learn the Direction dial to the CC Target control.
 *
 * Controls:
 *   CC Target  — native MIDI target selector; learn to the Direction dial
 *   Spread     — maximum pan angle in degrees, 0°–180° (default: 45°)
 *   Invert     — reverses direction (high notes left, low notes right)
 * 
 *   This script is released under the MIT License.

Permissions
* Commercial use
* Modification
* Distribution
* Private use

Limitations
x Liability
x Warranty

Conditions
! License and copyright notice

Copyright Philip Regan and Pilcrow Records

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 ****************************************************************************/

var PluginParameters = [];

var SPREAD = 45;
var INVERT = false;

function pitchToNormalized(pitch) {
    var p = INVERT ? 127 - pitch : pitch;
    // Map pitch 0-127 to degrees -Spread°–+Spread°
    var degrees = (p / 127) * (SPREAD * 2) - SPREAD;
    // Normalize degrees from -180°–+180° range to 0.0–1.0
    return (degrees + 180) / 360;
}

function HandleMIDI(event) {
    if (event instanceof NoteOn) {
        var direction = new TargetEvent();
        direction.target = "CC Target";
        direction.value = pitchToNormalized(event.pitch);
        direction.send();
    }
    event.send();
}

function ParameterChanged(param, value) {
    switch (param) {
        case 0:
            // CC Target — handled by Logic
            break;
        case 1:
            SPREAD = value;
            break;
        case 2:
            INVERT = (value === 1);
            break;
        default:
            Trace("ERROR: ParameterChanged(" + param + ", " + value + ")");
    }
}

// param 0
PluginParameters.push({
    name: "CC Target",
    type: "target"
});

// param 1
PluginParameters.push({
    name: "Spread",
    type: "lin",
    minValue: 0,
    maxValue: 180,
    numberOfSteps: 180,
    unit: "°",
    defaultValue: 45
});

// param 2
PluginParameters.push({
    name: "Invert",
    type: "checkbox",
    defaultValue: 0
});