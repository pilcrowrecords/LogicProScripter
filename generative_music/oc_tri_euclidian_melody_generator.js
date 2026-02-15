/******************************************************************************
Name: Tri-Euclidean Melody Generator
Author(s): Philip Regan
Purpose: 
* Generates up to 13 simultaneous lines of melody, each with its own Euclidean 
rhythm and pitch variation parameters.
* This is based on the Reason Studio Quad Note Generator, but with a more 
flexible parameter set and greater control over scale and rhythm generation.

This script is released under the MIT License.

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

****************************************************************************/

var NeedsTimingInfo = true;
var PluginParameters = [];

/* ------------------------------ EDIT ME ------------------------------ */
var ACTIVE_LINES_DEFAULT = 3; // default active voices at startup (1..13)
var MAX_LINES_UI = 3;        // how many line blocks exist in the UI (1..13)
/* -------------------------------------------------------------------- */

/* ------------------------------ Utilities (early) ------------------------------ */

function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function clampInt(x, a, b) { return clamp(Math.floor(x), a, b); }
function mod(n, m) { return ((n % m) + m) % m; }
function chance01(p01) { return Math.random() < clamp(p01, 0, 1); }
function lerp(a, b, t) { return a + (b - a) * t; }

// Master overlay:
// master=0 => unchanged; master=1 => pushes probability toward 1, never down.
function overlayProb(line01, master01) {
  line01 = clamp(line01, 0, 1);
  master01 = clamp(master01, 0, 1);
  return clamp(line01 + master01 * (1 - line01), 0, 1);
}

// Master overlay for variation "amount":
// master=0 => unchanged; master=1 => doubles.
function overlayAmt(base, master01) {
  return base * (1 + clamp(master01, 0, 1));
}

ACTIVE_LINES_DEFAULT = clampInt(ACTIVE_LINES_DEFAULT, 1, 13);
MAX_LINES_UI = clampInt(MAX_LINES_UI, 1, 13);

/* ----------------------------- Controls API ----------------------------- */

var __SCHEMA = [];
var __NAME2INDEX = Object.create(null);
var __IDX2HANDLER = [];

var Controls = {
  add: function (spec, onChange) {
    if (!spec || !spec.name) throw new Error("Controls.add: spec.name required.");
    __SCHEMA.push({
      spec: Object.assign({}, spec),
      name: spec.name,
      onChange: (typeof onChange === "function" ? onChange : null),
    });
  },

  build: function () {
    PluginParameters.length = 0;
    __IDX2HANDLER.length = 0;
    for (var k in __NAME2INDEX) delete __NAME2INDEX[k];

    for (var i = 0; i < __SCHEMA.length; i++) {
      var entry = __SCHEMA[i];
      var idx = PluginParameters.length;
      PluginParameters.push(entry.spec);
      __NAME2INDEX[entry.name] = idx;
      __IDX2HANDLER[idx] = entry.onChange || null;
    }
    UpdatePluginParameters();
  },

  get: function (name) {
    var idx = __NAME2INDEX[name];
    if (idx == null) throw new Error("Unknown control: " + name);
    return GetParameter(idx);
  },
};

/* ------------------------------ Constants ------------------------------ */

var STEP_BEATS = 0.25; // 1/16 in beats (1 beat = quarter)

var CHROMATIC = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

var SCALE_TEMPLATES = {
  "Chromatic": [0,1,2,3,4,5,6,7,8,9,10,11],
  "Ionian (Major)": [0,2,4,5,7,9,11],
  "Dorian": [0,2,3,5,7,9,10],
  "Phrygian": [0,1,3,5,7,8,10],
  "Lydian": [0,2,4,6,7,9,11],
  "Mixolydian": [0,2,4,5,7,9,10],
  "Aeolian (Minor)": [0,2,3,5,7,8,10],
  "Locrian": [0,1,3,5,6,8,10],
};
var SCALE_KEYS = Object.keys(SCALE_TEMPLATES);

var TARGET_OCTAVE_KEYS = ["8", "7", "6", "5", "4", "3 (Middle C)", "2", "1", "0", "-1", "-2"];
var TARGET_OCTAVE_VALS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

var RATE_KEYS = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2", "1 bar"];
var RATE_BEATS = [0.0625, 0.125, 0.25, 0.5, 1.0, 2.0, 4.0];

function buildNoteNames127() {
  var names = [];
  for (var p = 0; p < 128; p++) {
    var pc = p % 12;
    var oct = Math.floor(p / 12) - 2;
    names.push(CHROMATIC[pc] + " " + oct);
  }
  return names;
}
var NOTE_NAMES_127 = buildNoteNames127();

var LINE_COUNT_STRINGS = (function () {
  var a = [];
  for (var i = 1; i <= MAX_LINES_UI; i++) a.push(String(i));
  return a;
})();

/* ------------------------------ Spread helpers ------------------------------ */

// Spread is a DIRECTION bias, not a magnitude bias.
// bias in [-1..+1]
// -1 => always down, 0 => 50/50, +1 => always up
function spreadDelta(range, bias) {
  range = Math.max(0, Math.floor(range));
  if (range === 0) return 0;

  var b = clamp(bias, -1, 1);
  var pUp = (b + 1) * 0.5; // -1=>0, 0=>0.5, +1=>1

  // Guaranteed extremes
  var up = (pUp >= 1) ? true : (pUp <= 0) ? false : (Math.random() < pUp);

  // Magnitude 1..range (if a “randomized note” happens, it actually moves)
  var mag = 1 + Math.floor(Math.random() * range);

  return up ? mag : -mag;
}

/* ------------------------------ Misc utilities ------------------------------ */

function rotateArray(arr, rot) {
  var n = arr.length;
  if (n === 0) return arr;
  var r = mod(rot, n);
  if (r === 0) return arr.slice(0);
  var out = new Array(n);
  for (var i = 0; i < n; i++) out[i] = arr[mod(i - r, n)];
  return out;
}

/* -------------------------- Euclidean Rhythm -------------------------- */

function euclidPattern(steps, pulses) {
  steps = Math.max(1, Math.floor(steps));
  pulses = clamp(Math.floor(pulses), 0, steps);

  var out = new Array(steps);
  if (pulses === 0) { for (var i = 0; i < steps; i++) out[i] = 0; return out; }
  if (pulses === steps) { for (var j = 0; j < steps; j++) out[j] = 1; return out; }

  var acc = 0;
  for (var k = 0; k < steps; k++) {
    acc += pulses;
    if (acc >= steps) { acc -= steps; out[k] = 1; }
    else out[k] = 0;
  }
  return out;
}

/* ------------------------------ Scale Snap ------------------------------ */

function buildScaleSet(keyPc, scaleName) {
  var tmpl = SCALE_TEMPLATES[scaleName] || SCALE_TEMPLATES["Chromatic"];
  var set = Object.create(null);
  for (var i = 0; i < tmpl.length; i++) set[mod(keyPc + tmpl[i], 12)] = true;
  return set;
}

// Nearest semitone snap (preserves octave; does NOT collapse).
// tieBias01: <0 prefers down on ties, >0 prefers up on ties.
function snapToScale(pitch, scaleSet, tieBias01) {
  var pc = mod(pitch, 12);
  if (scaleSet[pc]) return pitch;

  for (var d = 1; d <= 11; d++) {
    var downPc = mod(pc - d, 12);
    var upPc = mod(pc + d, 12);
    var downOk = !!scaleSet[downPc];
    var upOk = !!scaleSet[upPc];

    if (downOk && upOk) return (tieBias01 < 0) ? (pitch - d) : (pitch + d);
    if (downOk) return pitch - d;
    if (upOk) return pitch + d;
  }
  return pitch;
}

// Anchor any pitch class into the selected target octave (used for CENTER only).
function anchorToTargetOctave(pitch, targetOctIdx) {
  var oct = TARGET_OCTAVE_VALS[targetOctIdx] || 5;
  var base = oct * 12;
  return clampInt(base + mod(pitch, 12), 0, 127);
}

// For extreme Spread, enforce "strictly below/above center" after quantize.
// Searches outward from center in the requested direction for an in-scale pitch.
function findInScaleStrictFromCenter(center, scaleSet, dir, maxSemis) {
  dir = (dir < 0) ? -1 : 1;
  maxSemis = Math.max(1, Math.floor(maxSemis));

  for (var d = 1; d <= maxSemis; d++) {
    var cand = center + (dir * d);
    if (scaleSet[mod(cand, 12)]) return cand;
  }
  // Fallback: if somehow none found (shouldn’t happen unless scaleSet is empty)
  return center + dir;
}

/* ------------------------------ Parameters ------------------------------ */

function addLineParams(lineIndex) {
  var L = "L" + (lineIndex + 1) + " ";

  // Pitch
  Controls.add({ name: L + "Vary", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 40 }, null);
  Controls.add({ name: L + "Spread", type: "lin", minValue: -100, maxValue: 100, numberOfSteps: 200, defaultValue: 0 }, null);
  Controls.add({ name: L + "Offset", type: "lin", minValue: -24, maxValue: 24, numberOfSteps: 48, defaultValue: 0 }, null);
  Controls.add({ name: L + "Range", type: "lin", minValue: 0, maxValue: 24, numberOfSteps: 24, defaultValue: 7 }, null);

  // Rhythm
  Controls.add({ name: L + "Rhythm Steps", type: "lin", minValue: 1, maxValue: 32, numberOfSteps: 31, defaultValue: 16 }, null);
  Controls.add({ name: L + "Density", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 60 }, null);
  Controls.add({ name: L + "Rate", type: "menu", valueStrings: RATE_KEYS, defaultValue: 2 }, null);
  Controls.add({ name: L + "Shift", type: "lin", minValue: -16, maxValue: 16, numberOfSteps: 32, defaultValue: 0 }, null);

  // Pattern
  Controls.add({ name: L + "Pattern", type: "lin", minValue: 1, maxValue: 32, numberOfSteps: 31, defaultValue: 8 }, null);
  Controls.add({ name: L + "Pattern Vary", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 30 }, null);
  Controls.add({ name: L + "Pattern Bias", type: "lin", minValue: -100, maxValue: 100, numberOfSteps: 200, defaultValue: 0 }, null);

  // Note Length
  Controls.add({ name: L + "Note Length %", type: "lin", minValue: 10, maxValue: 200, numberOfSteps: 190, defaultValue: 100 }, null);
  Controls.add({ name: L + "Note Length Vary", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 20 }, null);

  // Velocity
  Controls.add({ name: L + "Velocity", type: "lin", minValue: 0, maxValue: 127, numberOfSteps: 127, defaultValue: 95 }, null);
  Controls.add({ name: L + "Velocity Vary", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 15 }, null);
}

// Master + Output
Controls.add({ name: "Base Pitch", type: "menu", valueStrings: NOTE_NAMES_127, defaultValue: 60 }, null);
Controls.add({ name: "Number of Steps", type: "lin", minValue: 1, maxValue: 80, numberOfSteps: 79, defaultValue: 16 }, null);

// Stable menu, default = ACTIVE_LINES_DEFAULT
Controls.add({
  name: "Number of Lines",
  type: "menu",
  valueStrings: LINE_COUNT_STRINGS,
  defaultValue: (ACTIVE_LINES_DEFAULT - 1),
}, function () {
  ensureActiveLineState(getNumLinesFromControl());
});

Controls.add({ name: "Master Vary", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 0 }, null);

Controls.add({ name: "To Scale", type: "checkbox", defaultValue: 1 }, null);
Controls.add({ name: "Key", type: "menu", valueStrings: CHROMATIC, defaultValue: 0 }, null);
Controls.add({ name: "Scale", type: "menu", valueStrings: SCALE_KEYS, defaultValue: 1 }, null);
Controls.add({ name: "Target Octave", type: "menu", valueStrings: TARGET_OCTAVE_KEYS, defaultValue: 5 }, null);

// Build line blocks (1..MAX_LINES_UI)
for (var li = 0; li < MAX_LINES_UI; li++) addLineParams(li);

Controls.build();

/* ------------------------------ Runtime State ------------------------------ */

var __nextBeat = -1;
var __stepCount = 0;
var __lastPlaying = false;

// Track last pitch per possible line (fixed-size, safe)
var __activePitchByLine = new Array(13);
for (var iL = 0; iL < 13; iL++) __activePitchByLine[iL] = -1;

/* ------------------------------ Core Logic ------------------------------ */

function getNumLinesFromControl() {
  var idx = clampInt(Controls.get("Number of Lines"), 0, MAX_LINES_UI - 1);
  return idx + 1;
}

function ensureActiveLineState(numLines) {
  numLines = clampInt(numLines, 1, 13);
  for (var l = numLines; l < 13; l++) {
    var p = __activePitchByLine[l];
    if (p >= 0) {
      var off = new NoteOff();
      off.pitch = p;
      off.velocity = 0;
      off.send();
      __activePitchByLine[l] = -1;
    }
  }
}

function allNotesOffNow() {
  for (var l = 0; l < 13; l++) {
    var p = __activePitchByLine[l];
    if (p >= 0) {
      var off = new NoteOff();
      off.pitch = p;
      off.velocity = 0;
      off.send();
      __activePitchByLine[l] = -1;
    }
  }
}

// Build a per-line rhythm mask of length rhythmSteps.
// Note: Rate is NOT baked in here. Rate acts as the line's clock divider elsewhere.
function buildRhythmMask(rhythmSteps, densityPct, shiftSteps, patternType) {
  rhythmSteps = clampInt(rhythmSteps, 1, 32);
  var density01 = clamp(densityPct / 100, 0, 1);

  var mask = new Array(rhythmSteps);
  for (var i = 0; i < rhythmSteps; i++) mask[i] = 0;
  if (density01 <= 0) return mask;

  if (patternType === 1) {
    mask[0] = 1;
    return rotateArray(mask, shiftSteps);
  }

  if (patternType === 32) {
    for (var s = 0; s < rhythmSteps; s++) mask[s] = chance01(density01) ? 1 : 0;
    return rotateArray(mask, shiftSteps);
  }

  var pulses = clampInt(Math.round(density01 * rhythmSteps), 0, rhythmSteps);
  var base = euclidPattern(rhythmSteps, pulses);

  var rot = clampInt(patternType - 1, 0, 31);
  return rotateArray(rotateArray(base, rot), shiftSteps);
}

function computePitchForLine(lineIdx, baseMidi, scaleSet, toScale, targetOctIdx) {
  var mv = clamp(Controls.get("Master Vary") / 100, 0, 1);

  var L = "L" + (lineIdx + 1) + " ";
  var lineVary01 = clamp(Controls.get(L + "Vary") / 100, 0, 1);
  var spreadPct = Controls.get(L + "Spread");
  var offset = Controls.get(L + "Offset");
  var range = Controls.get(L + "Range");

  var spreadBias = clamp(spreadPct / 100, -1, 1);

  // Master overlay ENHANCES, never gates.
  var vary01 = overlayProb(lineVary01, mv);
  var effRange = clampInt(Math.round(overlayAmt(range, mv)), 0, 24);

  // CENTER is anchored into the Target Octave *before* applying Offset.
  // Offset is intended to be a true semitone shift (±24) from the Master Base Pitch,
  // so it must NOT be collapsed to pitch-class via modulo-12 anchoring.
  var baseCentered = anchorToTargetOctave(baseMidi, targetOctIdx);
  var center = clampInt(baseCentered + Math.round(offset), 0, 127);

  // If scaling, center should live on-scale too (so “above/below center” is consistent musically).
  if (toScale) {
    center = snapToScale(center, scaleSet, spreadBias);
  }

  // Start at center; optionally randomize around it
  var pitch = center;

  if (effRange > 0 && chance01(vary01)) {
    var delta = spreadDelta(effRange, spreadBias);
    pitch = center + delta;

    if (toScale) {
      // Normal snap (does NOT collapse octave)
      pitch = snapToScale(pitch, scaleSet, spreadBias);

      // STRICT enforcement at extremes:
      // +100 => strictly above center
      // -100 => strictly below center
      if (spreadBias >= 0.999 && pitch <= center) {
        pitch = findInScaleStrictFromCenter(center, scaleSet, +1, Math.max(12, effRange + 12));
      } else if (spreadBias <= -0.999 && pitch >= center) {
        pitch = findInScaleStrictFromCenter(center, scaleSet, -1, Math.max(12, effRange + 12));
      }
    } else {
      // Non-scale strict enforcement at extremes (pure semitone space)
      if (spreadBias >= 0.999 && pitch <= center) pitch = center + Math.max(1, Math.abs(delta));
      if (spreadBias <= -0.999 && pitch >= center) pitch = center - Math.max(1, Math.abs(delta));
    }
  }

  return clampInt(pitch, 0, 127);
}

function computeVelocity(lineIdx) {
  var mv = clamp(Controls.get("Master Vary") / 100, 0, 1);

  var L = "L" + (lineIdx + 1) + " ";
  var baseV = Controls.get(L + "Velocity");
  var lineProb = clamp(Controls.get(L + "Velocity Vary") / 100, 0, 1);

  var vel = Math.round(baseV);

  var effProb = overlayProb(lineProb, mv);
  if (chance01(effProb) && (lineProb > 0 || mv > 0)) {
    var amtBase = 12;
    var amt = clampInt(Math.round(overlayAmt(amtBase, mv)), 1, 48);
    vel += Math.floor((Math.random() * (amt * 2 + 1)) - amt);
  }

  return clampInt(vel, 0, 127);
}

function computeDurationBeats(lineIdx, rateBeats) {
  var mv = clamp(Controls.get("Master Vary") / 100, 0, 1);

  var L = "L" + (lineIdx + 1) + " ";
  var pct = Controls.get(L + "Note Length %") / 100;
  var lineProb = clamp(Controls.get(L + "Note Length Vary") / 100, 0, 1);

  var mult = clamp(pct, 0.10, 2.00);

  var effProb = overlayProb(lineProb, mv);
  if (chance01(effProb) && (lineProb > 0 || mv > 0)) {
    var spreadBase = 0.20;
    var spread = clamp(overlayAmt(spreadBase, mv), 0.05, 0.80);
    mult = clamp(mult + ((Math.random() * 2 - 1) * spread), 0.10, 2.00);
  }

  return clamp(rateBeats * mult, 0.01, 16.0);
}

function shouldVaryThisNote(lineIdx) {
  var mv = clamp(Controls.get("Master Vary") / 100, 0, 1);
  var L = "L" + (lineIdx + 1) + " ";
  var pv = clamp(Controls.get(L + "Pattern Vary") / 100, 0, 1);
  return chance01(overlayProb(pv, mv));
}

function noteBiasForLine(lineIdx) {
  var L = "L" + (lineIdx + 1) + " ";
  var spread = Controls.get(L + "Spread");
  var pb = Controls.get(L + "Pattern Bias");
  return clamp((spread + pb) / 200, -1, 1);
}

function emitNote(lineIdx, beat, pitch, vel, durBeats) {
  var prev = __activePitchByLine[lineIdx];
  if (prev >= 0) {
    var offNow = new NoteOff();
    offNow.pitch = prev;
    offNow.velocity = 0;
    offNow.sendAtBeat(beat);
    __activePitchByLine[lineIdx] = -1;
  }

  var on = new NoteOn();
  on.pitch = pitch;
  on.velocity = vel;
  on.sendAtBeat(beat);

  var off = new NoteOff(on);
  off.velocity = 0;
  off.sendAtBeat(beat + durBeats);

  __activePitchByLine[lineIdx] = pitch;
}

function generateAtStep(beat, stepIdx) {
  var baseMidi = Controls.get("Base Pitch");
  var numLines = clampInt(getNumLinesFromControl(), 1, MAX_LINES_UI);

  var toScale = Controls.get("To Scale") === 1;
  var keyPc = clampInt(Controls.get("Key"), 0, 11);
  var scaleName = SCALE_KEYS[clampInt(Controls.get("Scale"), 0, SCALE_KEYS.length - 1)] || "Chromatic";
  var targetOctIdx = clampInt(Controls.get("Target Octave"), 0, TARGET_OCTAVE_KEYS.length - 1);

  var scaleSet = toScale ? buildScaleSet(keyPc, scaleName) : null;

  for (var l = 0; l < numLines; l++) {
    var L = "L" + (l + 1) + " ";

    var rhythmSteps = clampInt(Controls.get(L + "Rhythm Steps"), 1, 32);
    var density = Controls.get(L + "Density");
    var rateIdx = clampInt(Controls.get(L + "Rate"), 0, RATE_BEATS.length - 1);
    var rateBeats = RATE_BEATS[rateIdx];

    // RATE FIX: rateSteps becomes the line's clock divider
    var rateSteps = Math.max(1, Math.round(rateBeats / STEP_BEATS));

    // only evaluate this line on its rate boundary
    if ((stepIdx % rateSteps) !== 0) continue;

    var rateStepIdx = Math.floor(stepIdx / rateSteps);

    var shift = clampInt(Controls.get(L + "Shift"), -16, 16);
    var patternType = clampInt(Controls.get(L + "Pattern"), 1, 32);

    var mask = buildRhythmMask(rhythmSteps, density, shift, patternType);

    var localStep = mod(rateStepIdx, rhythmSteps);
    if (mask[localStep] !== 1) continue;

    var pitch = computePitchForLine(l, baseMidi, scaleSet, toScale, targetOctIdx);

    // Pattern vary: ONLY influences tie-break direction when snapping (no octave collapse).
    if (toScale && shouldVaryThisNote(l)) {
      pitch = snapToScale(pitch, scaleSet, noteBiasForLine(l));
    }

    emitNote(l, beat, pitch, computeVelocity(l), computeDurationBeats(l, rateBeats));
  }
}

/* ------------------------------ Scripter API ------------------------------ */

function HandleMIDI(event) {
  event.send();
}

function Reset() {
  __nextBeat = -1;
  __stepCount = 0;
  __lastPlaying = false;
  allNotesOffNow();
}

function ParameterChanged(param, value) {
  var handler = __IDX2HANDLER[param];
  if (handler) handler(value);
}

function ProcessMIDI() {
  var t = GetTimingInfo();

  if (!t.playing) {
    if (__lastPlaying) allNotesOffNow();
    __lastPlaying = false;
    __nextBeat = -1;
    __stepCount = 0;
    return;
  }
  __lastPlaying = true;

  var masterSteps = clampInt(Controls.get("Number of Steps"), 1, 80);

  if (__nextBeat < 0) {
    var start = t.blockStartBeat;
    __nextBeat = Math.ceil(start / STEP_BEATS) * STEP_BEATS;
    __stepCount = 0;
  }

  var lookAheadEnd = t.blockEndBeat;
  var cursor = __nextBeat;

  var cycleEnd = null;
  if (t.cycling && lookAheadEnd >= t.rightCycleBeat) {
    cycleEnd = lookAheadEnd - (t.rightCycleBeat - t.leftCycleBeat);
  }

  while (
    (cursor >= t.blockStartBeat && cursor < lookAheadEnd) ||
    (t.cycling && cycleEnd != null && cursor < cycleEnd)
  ) {
    if (t.cycling && cursor >= t.rightCycleBeat) {
      cursor -= (t.rightCycleBeat - t.leftCycleBeat);
      __nextBeat = cursor;
    }

    generateAtStep(cursor, mod(__stepCount, masterSteps));

    __stepCount++;
    __nextBeat = cursor + STEP_BEATS;
    cursor = __nextBeat;
  }
}

/* ------------------------------ Boot Defaults ------------------------------ */

ensureActiveLineState(ACTIVE_LINES_DEFAULT);
