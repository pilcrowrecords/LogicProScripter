/******************************************************************************
Name: Wind Chime Simulator
Author(s): Philip Regan, Claude by OpenAI
Purpose:
* Duplicates whatever notes are currently active (fed in live or held by a
  track) in a way that mimics a wind chime: a "striker" moves across the
  active set and re-triggers notes on its own clock. This script is not
  concerned with pitch, scale, or harmony in any way -- it only manages
  *which already-active note* gets struck next and *how hard*.

How It Works
* HandleMIDI intercepts NoteOn/NoteOff and does NOT pass them through.
  Instead it maintains a live set of "active" pitches (heldPitches) along
  with the velocity each one arrived at. All audible output is generated
  independently by the chime engine in ProcessMIDI.
* ProcessMIDI runs a clock whose interval is set by Rate and reshaped by
  Chaos and, on each tick, picks the next pitch to strike and plays it for
  a short duration derived from that same interval.
* Direction control sets which way the striker is expected to move through
  the active set: Up = ascending pitch order, Down = descending.
* Rate control sets the strike interval at rest (Chaos = 0), using the usual
  note-division list (whole note down to 1/32, each with plain/dotted/
  triplet variants).
* Duration control gives each "gust" a beginning and an end, the way a real
  breeze doesn't blow forever. A gust starts the moment the active set goes
  from empty to non-empty, runs for the chosen length, then goes quiet even
  if notes are still held -- a new gust only starts the next time notes go
  from none to some. The list extends the Rate-style interval lengths with
  bar-length options (1/4 up to 32 Bars) so a gust can span across measures,
  plus an Infinite option that reproduces the old always-on behavior.
* Chaos control (0-100) is the target/"intended" level for three behaviors
  at once, reached via the ADSR envelope described below rather than
  applied instantly:
    1. Order variation: how far the actual struck note may land from the
       "expected next" note in the Direction sequence. At 0 the striker
       follows strict order (gentle breeze). At 100 the offset range covers
       the entire active set, which is indistinguishable from picking a
       pitch completely at random (Nor'easter).
    2. Velocity variation: how far a strike's velocity may deviate from the
       source note's original velocity. At 0 velocity is untouched. At 100
       the deviation range covers the full 1-127 span, so it too becomes
       effectively random.
    3. Timing: at 0 strikes land exactly on the Rate grid. As effective
       Chaos climbs, strikes speed up AND their spacing gets jittery around
       that faster pace. At 100, spacing is fast and effectively random --
       a gust hitting the chimes rather than a hand plucking them in turn.
* All three behaviors are driven off the same effective-Chaos value
  deliberately -- the goal is one intuitive "how calm / how violent"
  reading at any instant, not several things to tune separately.
* Chaos ADSR envelope: neither wind nor inertia is binary, so the Chaos
  slider is treated as a target the script arrives at over time rather than
  a value it snaps to. The envelope is gated by the same "gust" concept as
  Duration -- gate opens the moment the active set goes from empty to
  non-empty, and closes the moment the set empties OR a finite gust's
  Duration runs out:
    - Attack: beats to ramp from wherever the envelope currently sits up to
      full (1.0x, i.e. the Chaos slider's exact value -- "intended
      performance," reached at the end of Attack).
    - Decay: beats to ease back down from that peak to the Sustain level --
      momentum settling even while the gust is still blowing.
    - Sustain: the level (0-100%, of the Chaos slider value) held for as
      long as the gate stays open.
    - Release: beats to fade from wherever the envelope sits down to 0 once
      the gate closes -- the gust dying down rather than cutting off.
  A gate re-opening mid-release resumes Attack from the envelope's current
  value rather than restarting from zero, so back-to-back gusts feel
  continuous rather than snapping.
* Cycle / transport safety: ProcessMIDI detects any discontinuity between
  blocks (cycle wraparound, rewind, manual relocate, transport start) and
  resyncs the strike clock, any in-progress gust, and the Chaos envelope to
  the new position. Without this, a cycle jump would leave the strike clock
  scheduled in the past forever, silencing the chime even with notes still
  active. The only condition that should legitimately silence the chime is
  an empty active note set (or, by design, a finite gust running out).

Roadmap
* Consider weighting struck-note selection by how recently a pitch was
  struck, so a large active set doesn't repeat-strike the same neighbor
  twice in a row even at low chaos.
* Consider an optional "rest" length between gusts (currently a new gust
  only begins on the next empty-to-non-empty transition of the active set,
  so back-to-back gusts require notes to actually release and re-arrive).
* The ADSR envelope stages are linear ramps. A curve/shape option (e.g.
  exponential decay) could read more naturally if linear feels mechanical.

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

******************************************************************************/

NeedsTimingInfo = true;

// ---------------------------------------------------------------------------
// Tuning constants (not exposed as controls -- edit here to taste)
// ---------------------------------------------------------------------------
var MIN_SPEED_FACTOR = 0.2;      // at max chaos, interval shrinks to this
                                  // fraction of the Rate-set interval (0.2 = 5x faster)
var MAX_JITTER_FRACTION = 0.85;  // at max chaos, timing jitter can swing the
                                  // interval by up to this fraction of itself
var MIN_INTERVAL_BEATS = 0.02;   // safety floor so interval never hits zero
var STRIKE_DURATION_FRACTION = 0.6; // strike length as a fraction of its interval
var MAX_STRIKE_DURATION_BEATS = 0.5;
var MIN_STRIKE_DURATION_BEATS = 0.02;

// Standard note-division list, slowest to fastest. "beats" assumes a
// quarter note = 1 beat (Scripter's convention), so a whole note = 4.
var NOTE_DIVISIONS = [
    { name: "1/1",   beats: 4.0 },
    { name: "1/2D",  beats: 3.0 },
    { name: "1/2",   beats: 2.0 },
    { name: "1/2T",  beats: 4 / 3 },
    { name: "1/4D",  beats: 1.5 },
    { name: "1/4",   beats: 1.0 },
    { name: "1/4T",  beats: 2 / 3 },
    { name: "1/8D",  beats: 0.75 },
    { name: "1/8",   beats: 0.5 },
    { name: "1/8T",  beats: 1 / 3 },
    { name: "1/16D", beats: 0.375 },
    { name: "1/16",  beats: 0.25 },
    { name: "1/16T", beats: 1 / 6 },
    { name: "1/32D", beats: 0.1875 },
    { name: "1/32",  beats: 0.125 },
    { name: "1/32T", beats: 1 / 12 }
];

// Duration list: reuses a couple of short note-length options, then extends
// upward into bar-length spans so a gust can cover multiple measures.
// Entries with "beats" are fixed-length (quarter note = 1 beat, independent
// of meter). Entries with "bars" are resolved against the live time
// signature at the moment the gust starts. "Infinite" has neither, and is
// treated as "never ends on its own."
var DURATION_DIVISIONS = [
    { name: "1/4",     beats: 1.0 },
    { name: "1/2",     beats: 2.0 },
    { name: "1 Bar",   bars: 1 },
    { name: "2 Bars",  bars: 2 },
    { name: "4 Bars",  bars: 4 },
    { name: "8 Bars",  bars: 8 },
    { name: "16 Bars", bars: 16 },
    { name: "32 Bars", bars: 32 },
    { name: "Infinite" }
];

function durationDivisionNames() {
    var names = [];
    for (var i = 0; i < DURATION_DIVISIONS.length; i++) {
        names.push(DURATION_DIVISIONS[i].name);
    }
    return names;
}

function durationDivisionIndex(name) {
    for (var i = 0; i < DURATION_DIVISIONS.length; i++) {
        if (DURATION_DIVISIONS[i].name === name) return i;
    }
    return DURATION_DIVISIONS.length - 1; // fall back to Infinite
}

// Resolves a DURATION_DIVISIONS entry to a beat length using the meter in
// effect right now. Returns null for "Infinite" (no end).
function resolveDurationBeats(entry, ti) {
    if (entry.bars != null) {
        var beatsPerBar = ti.meterNumerator * (4 / ti.meterDenominator);
        return entry.bars * beatsPerBar;
    }
    if (entry.beats != null) {
        return entry.beats;
    }
    return null;
}



// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
var P = {
    DIRECTION: 0,
    RATE: 1,
    DURATION: 2,
    CHAOS: 3,
    ATTACK: 4,
    DECAY: 5,
    SUSTAIN: 6,
    RELEASE: 7
};

var PluginParameters = [
    {
        name: "Direction",
        type: "menu",
        valueStrings: ["Up", "Down"],
        defaultValue: 0
    },
    {
        name: "Rate",
        type: "menu",
        valueStrings: noteDivisionNames(),
        defaultValue: noteDivisionIndex("1/8")
    },
    {
        name: "Duration",
        type: "menu",
        valueStrings: durationDivisionNames(),
        defaultValue: durationDivisionIndex("Infinite")
    },
    {
        name: "Chaos",
        type: "linear",
        minValue: 0,
        maxValue: 100,
        numberOfSteps: 100,
        defaultValue: 15,
        unit: "%"
    },
    {
        name: "Attack",
        type: "linear",
        minValue: 0,
        maxValue: 16,
        numberOfSteps: 64,
        defaultValue: 1,
        unit: "beats"
    },
    {
        name: "Decay",
        type: "linear",
        minValue: 0,
        maxValue: 16,
        numberOfSteps: 64,
        defaultValue: 2,
        unit: "beats"
    },
    {
        name: "Sustain",
        type: "linear",
        minValue: 0,
        maxValue: 100,
        numberOfSteps: 100,
        defaultValue: 70,
        unit: "%"
    },
    {
        name: "Release",
        type: "linear",
        minValue: 0,
        maxValue: 16,
        numberOfSteps: 64,
        defaultValue: 4,
        unit: "beats"
    }
];

function noteDivisionNames() {
    var names = [];
    for (var i = 0; i < NOTE_DIVISIONS.length; i++) {
        names.push(NOTE_DIVISIONS[i].name);
    }
    return names;
}

function noteDivisionIndex(name) {
    for (var i = 0; i < NOTE_DIVISIONS.length; i++) {
        if (NOTE_DIVISIONS[i].name === name) return i;
    }
    return 0;
}

// ---------------------------------------------------------------------------
// Active note tracking
// ---------------------------------------------------------------------------
var heldCounts = {};      // pitch -> number of overlapping NoteOns received
var heldVelocities = {};  // pitch -> most recent NoteOn velocity
var heldPitches = [];     // sorted ascending array of currently active pitches
var cursorIndex = 0;      // index into heldPitches of the last struck note
var previousHeldCount = 0; // used to detect empty-to-non-empty transitions

function registerNoteOn(event) {
    var pitch = event.pitch;
    heldCounts[pitch] = (heldCounts[pitch] || 0) + 1;
    heldVelocities[pitch] = event.velocity;
    rebuildHeldPitches();
}

function registerNoteOff(event) {
    var pitch = event.pitch;
    if (heldCounts[pitch]) {
        heldCounts[pitch]--;
        if (heldCounts[pitch] <= 0) {
            delete heldCounts[pitch];
            delete heldVelocities[pitch];
        }
    }
    rebuildHeldPitches();
}

function rebuildHeldPitches() {
    heldPitches = [];
    for (var pitch in heldCounts) {
        if (heldCounts.hasOwnProperty(pitch)) {
            heldPitches.push(parseInt(pitch, 10));
        }
    }
    heldPitches.sort(function (a, b) { return a - b; });
    if (cursorIndex >= heldPitches.length) {
        cursorIndex = 0;
    }

    if (previousHeldCount === 0 && heldPitches.length > 0) {
        beginGust(GetTimingInfo());
    }
    previousHeldCount = heldPitches.length;
}

// ---------------------------------------------------------------------------
// MIDI handling -- capture only, generate nothing here
// ---------------------------------------------------------------------------
function HandleMIDI(event) {
    if (event instanceof NoteOn) {
        registerNoteOn(event);
        return;
    }
    if (event instanceof NoteOff) {
        registerNoteOff(event);
        return;
    }
    // Anything else (sustain, mod wheel, etc.) passes straight through.
    event.send();
}

// ---------------------------------------------------------------------------
// Chime engine
// ---------------------------------------------------------------------------
var nextStrikeBeat = null;
var wasPlaying = false;
var lastBlockEndBeat = null; // used to detect cycle wrap / rewind / relocate
var gustEndBeat = null;      // beat at which the current gust goes quiet;
                              // null = no active finite gust (Infinite, or
                              // no notes have started one yet)

// Starts (or restarts) a gust from the given beat position, using whatever
// Duration is currently selected. Called both when notes newly arrive and
// when the transport jumps (cycle wrap, rewind, relocate) while notes are
// already held, so a gust doesn't silently expire and never come back.
function beginGust(ti) {
    var durationEntry = DURATION_DIVISIONS[GetParameter("Duration")];
    var durationBeats = resolveDurationBeats(durationEntry, ti);
    var startBeat = (ti && ti.blockStartBeat != null) ? ti.blockStartBeat : 0;
    gustEndBeat = (durationBeats == null) ? null : (startBeat + durationBeats);
}

// ---------------------------------------------------------------------------
// Chaos ADSR envelope
// ---------------------------------------------------------------------------
// The envelope multiplies the Chaos slider (0-1 of it) based on how long
// the "gate" (gust) has been open or closed. See header comment for the
// stage-by-stage meaning of Attack/Decay/Sustain/Release.
var envStage = "idle";        // "attack" | "decay" | "sustain" | "release" | "idle"
var envValue = 0;             // current multiplier, 0..1
var envStageStartBeat = 0;
var envStageStartValue = 0;
var prevGateActive = false;

// Hard-resets the envelope to a fresh stage at a known beat, bypassing
// normal continuity. Used after a transport jump, where the old stage
// timing no longer means anything relative to the new position.
function resetEnvelope(beat, gateActive) {
    if (gateActive) {
        envStage = "attack";
        envStageStartBeat = beat;
        envStageStartValue = 0;
        envValue = 0;
    } else {
        envStage = "idle";
        envStageStartBeat = beat;
        envStageStartValue = 0;
        envValue = 0;
    }
    prevGateActive = gateActive;
}

// Advances the envelope state machine to the given beat and returns the
// current multiplier (0..1). Safe to call more than once per block with an
// increasing beat argument for per-strike precision.
function updateEnvelope(beat, gateActive) {
    if (gateActive && !prevGateActive) {
        // Gate just opened: begin (or resume, if mid-release) Attack.
        envStage = "attack";
        envStageStartBeat = beat;
        envStageStartValue = envValue;
    } else if (!gateActive && prevGateActive) {
        // Gate just closed: begin Release from wherever we are.
        envStage = "release";
        envStageStartBeat = beat;
        envStageStartValue = envValue;
    }
    prevGateActive = gateActive;

    var attackBeats = GetParameter("Attack");
    var decayBeats = GetParameter("Decay");
    var sustainLevel = clamp(GetParameter("Sustain") / 100, 0, 1);
    var releaseBeats = GetParameter("Release");

    // Walk through any stages fully completed since we last checked. Bounded
    // to a handful of iterations (attack -> decay -> sustain, or
    // release -> idle), so this can't loop indefinitely even at 0-beat times.
    var guard = 0;
    while (guard++ < 8) {
        var elapsed = beat - envStageStartBeat;
        if (envStage === "attack" && elapsed >= attackBeats) {
            envStageStartBeat += attackBeats;
            envStageStartValue = 1.0;
            envStage = "decay";
            continue;
        }
        if (envStage === "decay" && elapsed >= decayBeats) {
            envStageStartBeat += decayBeats;
            envStageStartValue = sustainLevel;
            envStage = "sustain";
            continue;
        }
        if (envStage === "release" && elapsed >= releaseBeats) {
            envStage = "idle";
            envStageStartBeat = beat;
            envStageStartValue = 0;
            envValue = 0;
            return 0;
        }
        break;
    }

    var elapsedNow = beat - envStageStartBeat;
    if (envStage === "attack") {
        var tA = attackBeats > 0 ? clamp(elapsedNow / attackBeats, 0, 1) : 1;
        envValue = envStageStartValue + (1.0 - envStageStartValue) * tA;
    } else if (envStage === "decay") {
        var tD = decayBeats > 0 ? clamp(elapsedNow / decayBeats, 0, 1) : 1;
        envValue = 1.0 + (sustainLevel - 1.0) * tD;
    } else if (envStage === "sustain") {
        envValue = sustainLevel;
    } else if (envStage === "release") {
        var tR = releaseBeats > 0 ? clamp(elapsedNow / releaseBeats, 0, 1) : 1;
        envValue = envStageStartValue * (1 - tR);
    } else {
        envValue = 0;
    }

    return envValue;
}

function ProcessMIDI() {
    var ti = GetTimingInfo();

    if (!ti.playing) {
        wasPlaying = false;
        nextStrikeBeat = null;
        lastBlockEndBeat = null;
        return;
    }

    // Detect any discontinuity between this block and the last one: the
    // transport just started, or the playhead jumped (cycle wraparound,
    // rewind, manual relocate). Without this check the strike clock, a
    // finite gust's end point, and the Chaos envelope can all be left
    // scheduled relative to a beat position the transport will never reach
    // again, which silences the chime permanently even though notes are
    // still active.
    var jumped = !wasPlaying || lastBlockEndBeat == null ||
        Math.abs(ti.blockStartBeat - lastBlockEndBeat) > 0.001;

    if (jumped) {
        nextStrikeBeat = ti.blockStartBeat;
        var activeNow = heldPitches.length > 0;
        if (activeNow) {
            beginGust(ti);
        }
        resetEnvelope(ti.blockStartBeat, activeNow);
    }

    wasPlaying = true;
    lastBlockEndBeat = ti.blockEndBeat;

    var direction = GetParameter("Direction");
    var targetChaos = GetParameter("Chaos");
    var baseIntervalBeats = NOTE_DIVISIONS[GetParameter("Rate")].beats;
    var gustOver = (gustEndBeat != null && ti.blockStartBeat >= gustEndBeat);
    var gateActive = heldPitches.length > 0 && !gustOver;

    if (!heldPitches.length || gustOver) {
        // Nothing to strike right now (no notes, or this gust has run its
        // course) -- still advance the envelope (it may be releasing) and
        // keep the clock aligned so we don't get a burst of stale strikes
        // once notes/a new gust arrive.
        updateEnvelope(ti.blockStartBeat, gateActive);
        while (nextStrikeBeat < ti.blockEndBeat) {
            nextStrikeBeat += computeStrikeInterval(baseIntervalBeats, targetChaos);
        }
        return;
    }

    var safety = 0;
    while (nextStrikeBeat < ti.blockEndBeat &&
           (gustEndBeat == null || nextStrikeBeat < gustEndBeat) &&
           safety++ < 256) {
        var envMultiplier = updateEnvelope(nextStrikeBeat, gateActive);
        var effectiveChaos = targetChaos * envMultiplier;
        var interval = computeStrikeInterval(baseIntervalBeats, effectiveChaos);
        if (nextStrikeBeat >= ti.blockStartBeat) {
            strike(nextStrikeBeat, direction, effectiveChaos, interval);
        }
        nextStrikeBeat += interval;
    }
}

function strike(atBeat, direction, chaosPct, intervalBeats) {
    var n = heldPitches.length;
    cursorIndex = pickNextIndex(n, cursorIndex, direction, chaosPct);

    var pitch = heldPitches[cursorIndex];
    var baseVelocity = heldVelocities[pitch] != null ? heldVelocities[pitch] : 100;
    var velocity = chimeVelocity(baseVelocity, chaosPct);

    var on = new NoteOn();
    on.pitch = pitch;
    on.velocity = velocity;
    on.sendAtBeat(atBeat);

    var off = new NoteOff(on);
    off.sendAtBeat(atBeat + computeStrikeDuration(intervalBeats));
}


// Computes the beat-length gap before the NEXT strike. At chaosPct = 0 this
// always returns baseBeats exactly (strict grid). As chaosPct rises, the
// grid speeds up (down to MIN_SPEED_FACTOR of baseBeats) and gains jitter
// (up to MAX_JITTER_FRACTION of the sped-up interval).
function computeStrikeInterval(baseBeats, chaosPct) {
    var speedFactor = 1 - (chaosPct / 100) * (1 - MIN_SPEED_FACTOR);
    var scaledBase = baseBeats * speedFactor;

    var jitterFraction = (chaosPct / 100) * MAX_JITTER_FRACTION;
    var jitterRange = scaledBase * jitterFraction;
    var jitter = randomFloat(-jitterRange, jitterRange);

    return Math.max(MIN_INTERVAL_BEATS, scaledBase + jitter);
}

// Strike (note) duration is a fraction of whatever interval preceded it,
// clamped to a sane range so fast/chaotic strikes don't overlap badly and
// slow/calm strikes don't ring on forever.
function computeStrikeDuration(intervalBeats) {
    var duration = intervalBeats * STRIKE_DURATION_FRACTION;
    return clamp(duration, MIN_STRIKE_DURATION_BEATS, MAX_STRIKE_DURATION_BEATS);
}

// Picks the next index to strike.
// direction: 0 = Up (ascending), 1 = Down (descending)
// chaosPct: 0-100, widens how far the actual pick may land from "expected"
function pickNextIndex(n, currentIndex, direction, chaosPct) {
    if (n <= 1) {
        return 0;
    }

    var step = (direction === 1) ? -1 : 1;
    var expected = wrapIndex(currentIndex + step, n);

    var maxOffset = Math.round((chaosPct / 100) * (n - 1));
    if (maxOffset <= 0) {
        return expected;
    }

    var offset = randomInt(-maxOffset, maxOffset);
    return wrapIndex(expected + offset, n);
}

// Applies chaos-scaled velocity deviation around a base velocity.
function chimeVelocity(baseVelocity, chaosPct) {
    var maxDeviation = Math.round((chaosPct / 100) * 126); // up to full MIDI span
    if (maxDeviation <= 0) {
        return clamp(baseVelocity, 1, 127);
    }
    var delta = randomInt(-maxDeviation, maxDeviation);
    return clamp(baseVelocity + delta, 1, 127);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function wrapIndex(index, n) {
    return ((index % n) + n) % n;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function ParameterChanged(param, value) {
    // No cached/derived state depends on parameters right now -- Direction,
    // Rate, Duration, and Chaos are all read live in ProcessMIDI each tick.
    // (Duration is also read at the moment a gust begins, in beginGust.)
}