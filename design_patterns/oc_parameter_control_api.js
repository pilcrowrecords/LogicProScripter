/******************************************************************************
Name: PluginParameters API
Author(s): Philip Regan, Pilcrow Records
Purpose: Scalable parameter and control management for Scripter.
Description:
* Define parameters and controls in any order, with optional grouping.
* Reads and writes parameters by NAME in the background (no index hunting).
* Code for a parameter is defined with the control creation.
* Update parameter specs (rename, change range) and refresh UI.

The API is designed to make parameter control management flexible and 
extensible, allowing users to easily add new parameter types and controls as 
needed without needing to be concerned with the PluginParameters array index for 
a given control. It also supports grouping of parameters and controls, making it 
easier to organize and manage them.

This script is intended to be used as a starting point for more complex Scripter 
scripts that require advanced and large scale parameter and control management. 
Users can modify and extend the API as needed to suit their specific 
requirements.

In Scripter's examples, the PluginParameters Array is built in one go,
with all parameters defined in one place. Functions related to parameter 
controls are handled as a `switch` statement in the ParameterChanged() function.
This works fine for simple scripts, but more complex scripts may have many 
parameters, and it can be hard to keep track of parameter indices and names.

This module allows users to define parameters and controls in any order, 
with optional grouping. Changes in control order are handled on the fly by the 
API. Users can read and write parameters by NAME, without needing to know their 
index, can also update parameter specs (e.g., rename, change range), and 
refresh the UI.

Also, any code triggered by the parameter change is defined with the control 
creation. If the control is in a group, then the code is triggered individually 
when that control is changed and also as a group snapshot after any control in 
the group changes.

There are three APIs included in this script:
1. Controls API: Core CRUD[1] operations for parameter controls.
2. ControlGroup class: Bundle arbitrary sets of controls into named groups.
3. Sequencer class: Similar to the ControlGroup class, it specifically creates 
step sequencers with multiple steps and handles step duration, cycling, and 
sequence cursor management.

[1] Create, Read, Update, Delete

There are global variables and functions that this API expects to be present in
the Scripter environment:

* Scripter Globals
  * NeedsTimingInfo = true;
  * PluginParameters = [];
  * function ParameterChanged(paramIndex, value) { ... }
* Controls API Globals
  * __SCHEMA = [];
  * __NAME2INDEX = Object.create(null);
  * __IDX2HANDLER = [];
  * __META = [];
  * __GROUPS = Object.create(null);
  * Controls = {...}
    * This is the core API object which handles all CRUD operations for all 
    paramater controls
* Sequencer API Globals
  * function beatsPerBarFrom(timing_info) { ... }
  * function beatToSeqStepIndex(absBeat, stepsPerSequence, stepLenBeats) {
  ... }
  * function beatToStepIndex(absBeat, STEPS, beatsPerBar) { ... }

With the Controls API in place, users no longer need to handle the 
PluginParameters Array manually or write switch/case statements to handle 
parameter changes in ParameterChanged(). The API handles all of this.

The API acts as a central registry of all parameters and controls, and as a 
dispatcher for parameter change events. The user defines the parameters and
controls using the Controls.add() method, and the API builds the 
PluginParameters array and sets up the dispatching automatically. The actionable 
code for each parameter is defined as an onChange callback function when the 
control is added.

To use multiple sequencers or groups in the same script, create each one with a 
different label. The Controls API will handle the grouping and naming of 
individual controls automagically.

All three APIs share the same syntax for adding controls, making it easy to use 
them together.

Controls API:
Controls.add({options}, function(value, meta){...});

ControlGroup API class:
ControlGroup(label).add({options}, function(value, meta){...}).add({options}, function(value, meta){...}).use(function(snapshot){...});

Sequencer API class:
Sequencer(label, step_count).add({options}, function(value, meta){...}).use(function(snapshot){...});

A couple of things to note:
* `function(value, meta)` is triggered every time the control changes.
* `.use(function(snapshot){...})` is triggered after any control in the group 
changes.
* The `options` object passed at the time of creation must match the exact
Scripter spec for the control type being created.
* The Controls API handles label collisions automagically.

Change History:
	25_10_07_01_00_00:  Public Release
                      Completed documentation.

ROADMAP:
* Internalize state mirroring within the API engine.

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

// Internal state (metadata/dispatch only; NO user state mirroring)
var __SCHEMA = [];                      // [{ spec, name, group, onChange }]
var __NAME2INDEX = Object.create(null); // name -> index in PluginParameters
var __IDX2HANDLER = [];                 // paramIndex -> onChange
var __META = [];                        // paramIndex -> { name, group, type }
var __GROUPS = Object.create(null);     // groupName -> Set(names)

// ------------- API -------------
var Controls = {
  /**
   * Add a control using the exact Scripter spec object.
   * spec = { name, type, ... }   // EXACT fields Scripter supports
   * onChange?: function(value, meta)   // optional
   * group?: string = "main"           // optional
   */
  add: function(spec, onChange, group) {
    if (!spec || !spec.name) throw new Error("Controls.add: spec.name is required and must be unique.");
    var g = (group == null ? "main" : String(group));
    __SCHEMA.push({ spec: Object.assign({}, spec), name: spec.name, group: g, onChange: (typeof onChange === "function" ? onChange : null) });
    if (!__GROUPS[g]) __GROUPS[g] = new Set();
    __GROUPS[g].add(spec.name);
  },

  /** Build PluginParameters from all added specs. Call once at load and on Reset(). */
  build: function() {
    // clear
    PluginParameters.length = 0;
    __IDX2HANDLER.length = 0;
    __META.length = 0;
    for (var k in __NAME2INDEX) delete __NAME2INDEX[k];

    // push in declared order
    for (var i = 0; i < __SCHEMA.length; i++) {
      var entry = __SCHEMA[i];
      var spec  = entry.spec;

      var idx = PluginParameters.length;
      PluginParameters.push(spec);

      __NAME2INDEX[entry.name] = idx;
      __IDX2HANDLER[idx] = entry.onChange || null;
      __META[idx] = { name: entry.name, group: entry.group, type: spec.type };
    }
    UpdatePluginParameters();
  },

  /** Read / write by NAME (no index hunting) */
  get: function(name) {
    var idx = __NAME2INDEX[name];
    if (idx == null) throw new Error("Unknown control: " + name);
    return GetParameter(idx);
  },
  set: function(name, value) {
    var idx = __NAME2INDEX[name];
    if (idx == null) throw new Error("Unknown control: " + name);
    SetParameter(idx, value);
  },

  /** Update the visible spec (e.g., rename, change range) and refresh UI. */
  updateSpec: function(name, patch) {
    var idx = __NAME2INDEX[name];
    if (idx == null) throw new Error("Unknown control: " + name);
    var live = PluginParameters[idx];
    for (var k in patch) live[k] = patch[k];
    UpdatePluginParameters();
  },

  /** Group helpers (default group is "main") */
  groupNames: function(groupName) {
    var g = (groupName == null ? "main" : String(groupName));
    var set = __GROUPS[g];
    return set ? Array.from(set) : [];
  },
  groupSet: function(value, groupName) {
    var names = this.groupNames(groupName);
    for (var i = 0; i < names.length; i++) this.set(names[i], value);
  },
  groupApply: function(fn, groupName) {
    var names = this.groupNames(groupName);
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      var cur = this.get(n);
      var next = fn(n, cur);
      if (next != null) this.set(n, next);
    }
  }
};

// Scripter callback → dispatch to the right handler; no switch/case needed
function ParameterChanged(paramIndex, value) {
  var h = __IDX2HANDLER[paramIndex];
  if (h) h(value, __META[paramIndex]); // meta: { name, group, type }
}

function beatsPerBarFrom(timing_info) {
  var num = timing_info.timeSigNumerator   || 4;
  var den = timing_info.timeSigDenominator || 4;
  return num * (4 / den); // quarter-note beats per bar (can be fractional)
}

// Continuous: use absolute beat since song start (1-based) → global index
function beatToSeqStepIndex(absBeat, stepsPerSequence, stepLenBeats) {
  var eps = 1e-9;
  var posFromStart = (absBeat - 1);                          // 0-based beats
  var globalIdx0   = Math.floor((posFromStart + eps) / stepLenBeats); // 0,1,2,...
  return (globalIdx0 % stepsPerSequence) + 1;                // 1..STEPS
}

// Map an absolute beat (1-based across the track) to a 1..STEPS
// index within the current bar using modulus math.
// beatsPerBar defaults to 4 (i.e., 4/4), but you can derive it from timing_info.
function beatToStepIndex(absBeat, STEPS, beatsPerBar) {
  beatsPerBar = (beatsPerBar == null ? 4 : beatsPerBar|0);
  var eps = 1e-9; // guards against float edge hits
  var posInBar0 = (absBeat - 1) % beatsPerBar;        // 0 .. < beatsPerBar
  var stepLen   = beatsPerBar / STEPS;                // beats per step
  var idx0      = Math.floor((posInBar0 + eps) / stepLen); // 0..STEPS-1
  return (idx0 + 1);                                  // 1..STEPS
}

// Drive it (one RNG draw per step; processors remain pure)
function ProcessMIDI() {
  var pitch = Pitch.advance(1);              // processed pitch at new step
  var p     = Prob.eval(Pitch.cursor);       // numeric probability at same step
    Trace("Step " + Pitch.cursor + ": pitch=" + pitch + " prob=" + p + "%");

  if ((Math.random()*100) < p) {
    // var on = new NoteOn(); on.pitch = pitch; on.velocity = 100; on.send();
    // var off = new NoteOff(on); off.sendAfterBeats(0.5);
  }
}


// aligns any float value to the beats
// ceiling used because all recordable beats are >= 1.000
function align_beat_to_bar_division( value, division ) {
    return Math.ceil( value * division ) / division;
}

// when the intended beat falls outside the cycle, wrap it proportionally 
// from the cycle start
function handle_beat_wraparound( value, timing_info ) {
    if ( timing_info.cycling && value >= timing_info.rightCycleBeat ) {
        value -= ( timing_info.rightCycleBeat - timing_info.leftCycleBeat );
    }
    return value;
}

// loop through the beats that fall within this buffer
// including beats that wrap around the cycle point
// return false by default
function beats_fall_within_buffer ( beatToSchedule, timing_info ) {
    let lookAheadEnd = timing_info.blockEndBeat;
    let cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
    let cycleEnd = lookAheadEnd - cycleBeats;
    if ( beatToSchedule >= timing_info.blockStartBeat && beatToSchedule < lookAheadEnd || (timing_info.cycling && beatToSchedule < cycleEnd)) {
        return true;
    }
    return false;
}


// ============================================================
// Example usage
// The order of the controls doesn't matter; they will be built 
// in the order added but the Controls API will handle lookups.
// ============================================================

Controls.add({
  name: "Linear",
  type: "lin",
  minValue: 0,
  maxValue: 100,
  numberOfSteps: 100,
  defaultValue: 50,
  unit: "%"
}, function(value, meta) {
  Trace(meta.name + " changed to " + value);
});

Controls.add({
  name: "Logarithmic",
  type: "log",
  minValue: 0,
  maxValue: 100,
  numberOfSteps: 100,
  defaultValue: 50,
  unit: "%"
}, function(value, meta) {
  Trace(meta.name + " changed to " + value);
});

Controls.add({
    name:"Pulldown Menu", 
    type:"menu", 
    valueStrings:["Item 0", "Item 1", "Item 2"], 
    defaultValue:2
}, function(value, meta) {
    Trace(meta.name + " selected: " + meta.type + " → " + value);
});

Controls.add({
    name:"Radio Buttons", 
    type:"menu", 
    valueStrings:["On", "Off"], defaultValue:0
}, function(value, meta) {
    Trace(meta.name + " selected: " + meta.type + " → " + value);
});

Controls.add({
  name: "Checkbox",
  type: "checkbox",
  defaultValue: 0
}, function(value, meta) {
  // value is 0 (unchecked) or 1 (checked)
  Trace(meta.name + " is now " + (value ? "On" : "Off"));
});

Controls.add({
    name: "Momentary Button",
    type: "momentary",
    disableAutomation: false
}, function(value, meta) {
    if (value === 1) {
        Trace(meta.name + " pressed");
    }
});

Controls.add({
    name: "Text",
    type: "text",
    defaultValue: "Hello, World!"
}, function(value, meta) {
    // no state changes allowed; value is always the defaultValue
});

/* example control group. See ControlGroup() below.
Core syntax is the same as Sequencer.add(spec, fn).
var group = ControlGroup(label, opts).add(spec, onChange).add(spec, onChange).use(fn);
*/
var ScaleGroup = ControlGroup("Scale")
  .add({
        name:"Target Octave", 
        type:"menu", 
        valueStrings:["8", "7", "6", "5", "4", "3 (Middle C)", "2", "1", "0", "-1", "-2"], 
        defaultValue:5
    },
    function(value, meta) {
      // meta = { index, name, label, group, count, type, reason:"change" }
      Trace("A["+meta.index+"] "+meta.name+" → "+value);
    }
  )
  .add({
        name:"Scale Root", 
        type:"menu", 
        valueStrings: ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"],
        defaultValue:0
    },
    function(value, meta) { Trace("Menu changed to idx "+value+" @ "+meta.name); }
  )
  .add({
        name:"Scale Type", 
        type:"menu", 
        valueStrings: ["Chromatic", "Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"], 
        defaultValue:1
    })
  .use(function(snapshot){
    // Fires after any control change or PanelA.eval()
    Trace("PanelA snapshot: " + JSON.stringify(snapshot.byIndex));
  });

// finalize UI
Controls.build();

function Reset(){ Controls.build(); UpdatePluginParameters(); }


// Example: 16-step probability lane, default step length = 1/16
var Prob = Sequencer("Prob", 16);
// Build the controls AND attach your per-step processor
Prob.add(
  { type:"lin", minValue:0, maxValue:100, numberOfSteps:100, defaultValue:75, unit:"%" },
  function(value, meta) {
    // Custom code for every step
    // `value` = raw control value
    // `meta`  = { index, name, label, group, count, cursor, type, reason }
    // Example: clamp to 0..100 and coerce to integer
    return Math.max(0, Math.min(100, value|0));
  }
);

// ============================================================
// Build once at load; also on Reset
// (Make sure this is AFTER your Controls.add(...) calls.)
// ============================================================
Controls.build();
function Reset() { Controls.build(); UpdatePluginParameters(); }

// ============================================================
// ControlGroup (arbitrary control bundles)
// - Same syntax as Sequencer.add(spec, fn)
// - No mirrored state; reads via Controls.get(name)
// - Per-control handler gets Sequencer-like meta
// ============================================================
function ControlGroup(label, opts) {
  if (!(this instanceof ControlGroup)) return new ControlGroup(label, opts);
  opts = opts || {};

  this.label = String(label || "Group");
  this.group = (opts.group != null) ? String(opts.group) : this.label;
  this.prefixNames = (opts.prefixNames !== false);
  this.pad = Math.max(2, (opts.pad|0) || 2);

  this._names = [];
  this._proc = null;

  this.use = function(fn) { if (typeof fn === "function") this._proc = fn; return this; };

  this._finalName = function(specName, ordinal) {
    if (specName && this.prefixNames) return this.label + " · " + String(specName);
    if (specName && !this.prefixNames) return String(specName);
    var s = String(ordinal); while (s.length < this.pad) s = "0"+s;
    return this.label + " " + s;
  };

  this._meta = function(i, baseMeta, reason) {
    return {
      index: i,
      name: this._names[i-1],
      label: this.label,
      group: this.group,
      count: this._names.length,
      type: baseMeta && baseMeta.type,
      reason: reason || null
    };
  };

  // *** Same shape as Sequencer.add(spec, fn) ***
  this.add = function(spec, onChange) {
    if (!spec || typeof spec !== "object") throw new Error("ControlGroup.add: spec required.");
    var ordinal = this._names.length + 1;
    var specCopy = Object.assign({}, spec);
    var finalName = this._finalName(specCopy.name, ordinal);
    specCopy.name = finalName;

    var self = this;
    Controls.add(
      specCopy,
      function(value, baseMeta) {
        // per-control handler
        if (typeof onChange === "function") {
          try { onChange(value, self._meta(ordinal, baseMeta, "change")); } 
          catch (e) { Trace("ControlGroup control onChange error: " + e); }
        }
        // bundle-wide handler
        if (self._proc) {
          try { self._proc(self.snapshot("change"), baseMeta); }
          catch (e) { Trace("ControlGroup .use() error: " + e); }
        }
      },
      this.group
    );

    this._names.push(finalName);
    return this;
  };

  this.names = function(){ return this._names.slice(); };

  this._resolveName = function(nameOrIndex) {
    if (typeof nameOrIndex === "number") {
      var i = (nameOrIndex|0) - 1;
      if (i < 0 || i >= this._names.length) throw new Error("Index out of range: " + nameOrIndex);
      return this._names[i];
    }
    if (typeof nameOrIndex === "string") {
      if (this.prefixNames) {
        var pref = this.label + " · " + nameOrIndex;
        if (this._names.indexOf(pref) >= 0) return pref;
      }
      var idx = this._names.indexOf(nameOrIndex);
      if (idx >= 0) return this._names[idx];
      throw new Error("Unknown control: " + nameOrIndex);
    }
    throw new Error("Expected control index (1-based) or name string.");
  };

  this.get = function(nameOrIndex) { return Controls.get(this._resolveName(nameOrIndex)); };
  this.set = function(nameOrIndex, value) { Controls.set(this._resolveName(nameOrIndex), value); return this; };
  this.updateSpec = function(nameOrIndex, patch) { Controls.updateSpec(this._resolveName(nameOrIndex), patch); return this; };

  this.snapshot = function(reason) {
    var names = this._names.slice();
    var byIndex = [], byName = Object.create(null);
    for (var i=0;i<names.length;i++){ var n=names[i], v=Controls.get(n); byIndex.push(v); byName[n]=v; }
    return { names:names, byIndex:byIndex, byName:byName, meta:{ label:this.label, group:this.group, reason:reason||"eval" } };
  };

  this.eval = function() {
    var snap = this.snapshot("eval");
    if (this._proc) {
      try { this._proc(snap, null); } catch(e){ Trace("ControlGroup eval error: " + e); }
    }
    return snap;
  };
}

// ============================================================
// Sequencer (drop-in)
// - No mirrored state. Reads via Controls.get(name).
// - Build pattern matches Controls.add: seq.add(spec, onStep)
// - onStep(value, meta) is lane-wide for ALL steps.
//   meta: { index, name, label, group, count, cursor, type?, reason }
// ============================================================
function Sequencer(label, count, opts) {
  if (!(this instanceof Sequencer)) return new Sequencer(label, count, opts);
  opts = opts || {};

  this.label = String(label || "Step");
  this.count = Math.max(1, count|0);
  this.group = opts.group || this.label;
  this.pad   = Math.max(2, (opts.pad|0) || 2);

    // --- Lane-local step duration selector (menu) ---
  // Menu label and options are lane-scoped so multiple sequencers can differ.
  this.stepMenuName = this.label + " Step"; // e.g., "Prob Step"

  // Order matters (indexes used by Scripter menu)
  this._stepMenuStrings = [
    "1/64","1/32","1/16T","1/16","1/16.","1/8T","1/8","1/8.","1/4T","1/4","1/2","1/1"
  ];

  // Quarter-note = 1.0 beat
  this._stepToBeats = {
    "1/64": 0.0625,
    "1/32": 0.125,
    "1/16T": 1/6,
    "1/16": 0.25,
    "1/16.": 0.375,
    "1/8T": 1/3,
    "1/8": 0.5,
    "1/8.": 0.75,
    "1/4T": 2/3,
    "1/4": 1.0,
    "1/2": 2.0,
    "1/1": 4.0
  };

  // Add the menu once per lane (before steps). Caller can override default via opts.stepDefault (string).
  this._menuAdded = false;
  this._ensureStepMenu = function() {
    if (this._menuAdded) return;
    var defLabel = (opts && opts.stepDefault) || "1/16";
    var defIdx   = this._stepMenuStrings.indexOf(defLabel);
    if (defIdx < 0) defIdx = this._stepMenuStrings.indexOf("1/16");

    Controls.add(
      {
        name: this.stepMenuName,
        type: "menu",
        valueStrings: this._stepMenuStrings.slice(),
        defaultValue: defIdx
      },
      null,                  // no lane-wide onChange needed
      this.group             // <- same group as the lane's steps
    );

    this._menuAdded = true;
  };

  // Read the current step length (in beats) for THIS lane
  this.stepLenBeats = function() {
    var idx   = Controls.get(this.stepMenuName)|0;
    var label = this._stepMenuStrings[idx];
    return this._stepToBeats[label] || 0.25;
  };

    // --- Lane-local cycle controls (Start/End) ---
  this.cycleStartName = this.label + " Start"; // e.g., "Prob Start"
  this.cycleEndName   = this.label + " End";   // e.g., "Prob End"

  this._cycleAdded = false;
  this._ensureCycleControls = function () {
    if (this._cycleAdded) return;

    // Both sliders snap to integer steps (1..count)
    // numberOfSteps = count - 1 ensures integer positions
    Controls.add(
      {
        name: this.cycleStartName,
        type: "lin",
        minValue: 1,
        maxValue: this.count,
        numberOfSteps: this.count - 1,
        defaultValue: 1
      },
      null,
      this.group
    );

    Controls.add(
      {
        name: this.cycleEndName,
        type: "lin",
        minValue: 1,
        maxValue: this.count,
        numberOfSteps: this.count - 1,
        defaultValue: this.count
      },
      null,
      this.group
    );

    this._cycleAdded = true;
  };

  // Accessors (clamped to 1..count)
  this.cycleStart = function () {
    var v = Controls.get(this.cycleStartName)|0;
    if (v < 1) v = 1;
    if (v > this.count) v = this.count;
    return v;
  };
  this.cycleEnd = function () {
    var v = Controls.get(this.cycleEndName)|0;
    if (v < 1) v = 1;
    if (v > this.count) v = this.count;
    return v;
  };

  // Cycle length (inclusive), supports wrap (e.g., Start=12, End=4)
  this.cycleLen = function () {
    var s = this.cycleStart(), e = this.cycleEnd();
    return ((e - s + this.count) % this.count) + 1; // 1..count
  };

  // Map a GLOBAL 1..count index into the active cycle range, moving forward only
  this.mapToCycle = function (globalIndex1Based) {
    var s  = this.cycleStart();
    var e  = this.cycleEnd();
    var L  = ((e - s + this.count) % this.count) + 1; // inclusive length

    var g0 = (globalIndex1Based - 1); // 0-based
    var s0 = (s - 1);

    // How far into the cycle we are, modulo cycle length
    var within0 = ((g0 - s0) % L + L) % L; // 0..L-1

    // Offset back to absolute step space and wrap across the lane if needed
    var idx0 = (s0 + within0) % this.count; // 0..count-1
    return idx0 + 1;                         // 1..count
  };

  // 1..count cursor
  this.cursor = 1;

  // Lane-wide processor (set by .add). Defaults to identity.
  this._proc = function(v){ return v; };
  this.use = function(fn){ if (typeof fn === "function") this._proc = fn; return this; };

  // Format: "Pitch 01", "Prob 07", etc.
  this.nameOf = function(i) {
    var s = String(i);
    while (s.length < this.pad) s = "0" + s;
    return this.label + " " + s;
  };

  // Meta passed to the lane-wide processor
  this._meta = function(i, baseMeta, reason) {
    return {
      index:  i,                       // 1-based step index
      name:   this.nameOf(i),
      label:  this.label,
      group:  this.group,
      count:  this.count,
      cursor: this.cursor,
      type:   baseMeta && baseMeta.type,  // Scripter control type if available
      reason: reason || null              // "change" | "eval" | "advance"
    };
  };

  // MATCHES Controls.add(spec, fn):
  // Build all N controls for this lane AND set the lane-wide processor in one call.
  // When building steps:
this.add = function(spec, onStep /* lane-wide processor */) {
  if (!spec || typeof spec !== "object") throw new Error("Sequencer.add: spec required.");
  if (typeof onStep === "function") this._proc = onStep;

  this._ensureStepMenu();
  this._ensureCycleControls();

  var self = this;
  for (var i = 1; i <= self.count; i++) {
    (function(iLocal){
      var stepSpec = Object.assign({}, spec, { name: self.nameOf(iLocal) });
      Controls.add(
        stepSpec,
        function(value, meta) {
          if (self._proc) self._proc(value, self._meta(iLocal, meta, "change"));
        },
        self.group
      );
    })(i);
  }
};


  // --- Raw read/write (default get() → current cursor) ---
  this.get = function(i) {
    i = (i == null ? this.cursor : i|0);
    if (i < 1 || i > this.count) throw new Error("Step out of range: " + i);
    return Controls.get(this.nameOf(i));
  };

  this.set = function(i, value) {
    i = (i|0);
    if (i < 1 || i > this.count) throw new Error("Step out of range: " + i);
    Controls.set(this.nameOf(i), value);
  };

  // --- Cursor helpers ---
  this.setCursor = function(i) {
    i = i|0;
    if (i < 1 || i > this.count) throw new Error("Cursor out of range: " + i);
    this.cursor = i;
    return this.cursor;
  };

  this.resetCursor = function() { this.cursor = 1; };

  // Peek the processed value you'd get after advancing by n (does not move cursor)
  this.peekAdvance = function(n) {
    n = (n == null ? 1 : n|0);
    var m = ((n % this.count) + this.count) % this.count;           // normalize
    var next = ((this.cursor - 1 + m) % this.count) + 1;            // 1..count
    var v = this.get(next);
    return this._proc ? this._proc(v, this._meta(next, null, "eval")) : v;
  };

  // Advance by n steps and return the processed value at the resulting cursor.
  // Supports n = 0, large n, and negative n.
  this.advance = function(n) {
    n = (n == null ? 1 : n|0);
    if (n !== 0) {
      var m = ((n % this.count) + this.count) % this.count;         // 0..count-1
      this.cursor = ((this.cursor - 1 + m) % this.count) + 1;        // 1..count
    }
    var v = this.get(this.cursor);
    return this._proc ? this._proc(v, this._meta(this.cursor, null, "advance")) : v;
  };

  // Evaluate processed value at step i (or current cursor if omitted)
  // When reading/evaluating:
this.eval = function(i) {
  i = (i == null ? this.cursor : i|0);
  var v = this.get(i);
  return this._proc ? this._proc(v, this._meta(i, null, "eval")) : v;
};
}