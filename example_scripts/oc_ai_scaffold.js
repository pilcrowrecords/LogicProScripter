/*
Name: API Skeleton Template
Author(s): 
Purpose:
* This template is provided to show 
	* how Scripter's monolithic scripts can be best organized for easy 
	maintenance.
	* how a script template can be used to quickly create new scripts, especially 
  with AI. This file can be added as an attachment to a prompt to provide the 
  style, structure, and reusable functions for a new script.
    * When using with AI, do not delete the comments in this file, as they provide important information about the structure and use of the script.

  Information:
Scripter Key Words: ChannelPressure, ControlChange, Event, GetParameter, 
GetTimingInfo, HandleMIDI, MIDI, NeedsTimingInfo, NoteOff, NoteOn, 
ParameterChanged, PitchBend, PluginParameters, PolyPressure, ProcessMIDI, 
ProgramChange, Reset, SetParameter, TargetEvent, TargetEvent, Trace

JavaScript Key Words: class, export, boolean, throw, implements, import, this, 
break, case, catch, class, const, continue, debugger, default, delete, do, else, 
export, extends, finally, for, function, if, import, in, instanceof, new, 
return, super, switch, this, throw, try, typeof, var, void, while, with, yield

Change History:
	26_02_15_V_01_00_00: Started script

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

/*
SCRIPTER GLOBAL VARIABLES
*/

var NeedsTimingInfo = true;
var PluginParameters = [];

/* 
CUSTOM GLOBAL VARIABLES 
*/

const CYCLE_LENGTH_LIB = {
    "1/128"		:	32.00000000,
    "1/128d"	:	24.00000000,
    "1/128t"	:	41.60000000,
    "1/64"		:	16.00000000,
    "1/64d"		:	12.00000000,
    "1/64t"		:	20.80000000,
    "1/32"		:	8.00000000,
    "1/32d"		:	6.00000000,
    "1/32t"		:	10.40000000,
    "1/16"		:	4.00000000,
    "1/16d"		:	3.00000000,
    "1/16t"		:	5.20000000,
    "1/8"		:	2.00000000,
    "1/8d"		:	1.50000000,
    "1/8t"		:	2.60000000,
    "1/4"		:	1.00000000,
    "1/4d"		:	0.75000000,
    "1/4t"		:	1.30000000,
    "1/2"		:	0.50000000,
    "1/2d"		:	0.37500000,
    "1/2t"		:	0.65000000,
    "1 bar"		:	0.02500000,
    "1.5 bars"	:	0.01875000,
    "2 bars"	:	0.01250000,
    "3 bars"	:	0.00833333,
    "4 bars"	:	0.00625000,
    "6 bars"	:	0.00416667,
    "8 bars"	:	0.00312500,
    "10 bars"	:	0.00250000,
    "12 bars"	:	0.00208333,
    "16 bars"	:	0.00156250,
    "20 bars"	:	0.00125000,
    "24 bars"	:	0.00104167,
    "28 bars"	:	0.00089286,
    "32 bars"	:	0.00078125,
    "36 bars"	:	0.00069444,
    "40 bars"	:	0.00062500
};
const CYCLE_LENGTH_KEYS = Object.keys( CYCLE_LENGTH_LIB );

const PARAM_LIST_WAVEFORMS = [
    "Triangle (⋀)",
    "Sine (∿)",
    "Square (⊓)",
];
const PARAM_NAME_WAVEFORMS = "Waveform";
const PARAM_NAME_FREQUENCY = "Cycle Length";
const PARAM_NAME_STEPS = "Steps per Cycle";
const PARAM_NAME_OFFSET = "Offset";
const PARAM_NAME_OUTPUT_LEVEL = "Output Level";
const PARAM_NAME_SYMMETRY = "Symmetry (⋀,⊓ only)";

const AMPLITUDE_MIN = -1.0;
const AMPLITUDE_MID = 0.0;
const AMPLITUDE_MAX = 1.0;

var SETTING_AMP = AMPLITUDE_MAX;
var SETTING_FREQUENCY = CYCLE_LENGTH_LIB["1 bar"];
var SETTING_TIME = 1.0;
var SETTING_PHASE = 0.0;
var SETTING_STEPS = CYCLE_LENGTH_LIB["1/4"];
var SETTING_SYMMETRY = 0.0;
var SETTING_OFFSET = 0.0;
var SETTING_OUTPUT_LEVEL = 1.0;

var CURRENT_WAVEFORM_OUTPUT = AMPLITUDE_MID;

// PARAMETER CONTROL API
// Internal state (metadata/dispatch only; NO user state mirroring)
var __SCHEMA = [];                      // [{ spec, name, group, onChange }]
var __NAME2INDEX = Object.create(null); // name -> index in PluginParameters
var __IDX2HANDLER = [];                 // paramIndex -> onChange
var __META = [];                        // paramIndex -> { name, group, type }
var __GROUPS = Object.create(null);     // groupName -> Set(names)

const TARGET_OCTAVE_LIB = {
    "8"             :   10, 
    "7"             :   9, 
    "6"             :   8, 
    "5"             :   7, 
    "4"             :   6, 
    "3 (Middle C)"  :   5, 
    "2"             :   4, 
    "1"             :   3, 
    "0"             :   2, 
    "-1"            :   1, 
    "-2"            :   0
};
const TARGET_OCTAVE_KEYS = ["8", "7", "6", "5", "4", "3 (Middle C)", "2", "1", "0", "-1", "-2"];
var TARGET_OCTAVE = TARGET_OCTAVE_LIB[TARGET_OCTAVE_KEYS[5]];

const CHROMATIC_HALF_STEPS = 12;

const OCTAVE_PITCH_INDEX = [-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8];
const SCALE_DEGREE_NAMES = ["I tonic", "II supertonic", "III mediant", "IV subdominant", "V dominant", "VI submediant", "VII leading tone"];
var KEYBOARD_STRINGS = [];
for (let index = 0; index < 12; index++) {
	CHROMATIC_SCALE_STRINGS.forEach( function ( s ) {
		KEYBOARD_STRINGS.push(s);
	});
}

const CHORD_VOICE_ROOT = 0;
const CHORD_VOICE_3RD = 1;
const CHORD_VOICE_5TH = 2;
const CHORD_VOICE_7TH = 3;
const CHORD_VOICE_9TH = 4;
const CHORD_VOICE_11TH = 5;
const CHORD_VOICE_13TH = 6;
const CHORD_VOICE_OPTIONS = {
    "Triad (1, 3, 5)" : [1, 1, 1, 0, 0, 0, 0],
    "7th (1, 3, 5, 7)" : [1, 1, 1, 1, 0, 0, 0],
    "Exc. 5th (1, 3, 7)" : [1, 1, 0, 1, 0, 0, 0],
    "Extensions (9, 11, 13)" : [0, 0, 0, 0, 1, 1, 1],
    "Pentatonic (1, 3, 5, 9, 11)" : [1, 1, 1, 0, 1, 1, 0],
    "Exclude Minor 9ths" : [1, 1, 1, 1, 1, 1, 1],
    "Pop VII/I" : [0, 0, 0, 1, 1, 1, 0],
    "Pop II/I" : [0, 0, 0, 0, 1, 1, 1],
	"Drop 2 (1342)" : [1, 1, 1, 1, 0, 0, 0],
	"Drop 3 (1243)" : [1, 1, 1, 1, 0, 0, 0],
	"Drop 2+3 (1423)" : [1, 1, 1, 1, 0, 0, 0],
	"Drop 2+4 (1324)" : [1, 1, 1, 1, 0, 0, 0],
	"Rootless (3, 5, 7, 9)" :  [0, 1, 1, 1, 1, 0, 0],
	"Rootless V7 (3, 7, 9, 13)" :  [0, 1, 0, 1, 1, 0, 1],
	"Shell (1, 3, 7)" :  [1, 1, 0, 1, 0, 0, 0]
};

const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
const SCALE_TEMPLATES = {
	"Chromatic" : [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	"Ionian" : [2, 2, 1, 2, 2, 2, 1],
	"Dorian" : [2, 1, 2, 2, 2, 1, 2],
	"Phrygian" : [1, 2, 2, 2, 1, 2, 2],
	"Lydian" : [2, 2, 2, 1, 2, 2, 1],
	"Mixolydian" : [2, 2, 1, 2, 2, 1, 2],
	"Aeolian" : [2, 1, 2, 2, 1, 2, 2],
	"Locrian" : [1, 2, 2, 1, 2, 2, 2]
}
const SCALE_KEYS = Object.keys(SCALE_TEMPLATES);

/* used for calculating new scales and parameter control updates */
var CHROMATIC_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
var TRANSPOSE_MAP = CHROMATIC_MAP;

/* used for live transposition */
var PITCH_SHIFT_TEMPLATE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var PITCH_SHIFT_MAP = PITCH_SHIFT_TEMPLATE;
// 128-item array with pitch's base pitch in the map and the original octave
const PITCH_INFO = [{ "basePitch" : 0 , "octave" : 0 }, { "basePitch" : 1 , "octave" : 0 }, { "basePitch" : 2 , "octave" : 0 }, { "basePitch" : 3 , "octave" : 0 }, { "basePitch" : 4 , "octave" : 0 }, { "basePitch" : 5 , "octave" : 0 }, { "basePitch" : 6 , "octave" : 0 }, { "basePitch" : 7 , "octave" : 0 }, { "basePitch" : 8 , "octave" : 0 }, { "basePitch" : 9 , "octave" : 0 }, { "basePitch" : 10 , "octave" : 0 }, { "basePitch" : 11 , "octave" : 0 }, { "basePitch" : 0 , "octave" : 1 }, { "basePitch" : 1 , "octave" : 1 }, { "basePitch" : 2 , "octave" : 1 }, { "basePitch" : 3 , "octave" : 1 }, { "basePitch" : 4 , "octave" : 1 }, { "basePitch" : 5 , "octave" : 1 }, { "basePitch" : 6 , "octave" : 1 }, { "basePitch" : 7 , "octave" : 1 }, { "basePitch" : 8 , "octave" : 1 }, { "basePitch" : 9 , "octave" : 1 }, { "basePitch" : 10 , "octave" : 1 }, { "basePitch" : 11 , "octave" : 1 }, { "basePitch" : 0 , "octave" : 2 }, { "basePitch" : 1 , "octave" : 2 }, { "basePitch" : 2 , "octave" : 2 }, { "basePitch" : 3 , "octave" : 2 }, { "basePitch" : 4 , "octave" : 2 }, { "basePitch" : 5 , "octave" : 2 }, { "basePitch" : 6 , "octave" : 2 }, { "basePitch" : 7 , "octave" : 2 }, { "basePitch" : 8 , "octave" : 2 }, { "basePitch" : 9 , "octave" : 2 }, { "basePitch" : 10 , "octave" : 2 }, { "basePitch" : 11 , "octave" : 2 }, { "basePitch" : 0 , "octave" : 3 }, { "basePitch" : 1 , "octave" : 3 }, { "basePitch" : 2 , "octave" : 3 }, { "basePitch" : 3 , "octave" : 3 }, { "basePitch" : 4 , "octave" : 3 }, { "basePitch" : 5 , "octave" : 3 }, { "basePitch" : 6 , "octave" : 3 }, { "basePitch" : 7 , "octave" : 3 }, { "basePitch" : 8 , "octave" : 3 }, { "basePitch" : 9 , "octave" : 3 }, { "basePitch" : 10 , "octave" : 3 }, { "basePitch" : 11 , "octave" : 3 }, { "basePitch" : 0 , "octave" : 4 }, { "basePitch" : 1 , "octave" : 4 }, { "basePitch" : 2 , "octave" : 4 }, { "basePitch" : 3 , "octave" : 4 }, { "basePitch" : 4 , "octave" : 4 }, { "basePitch" : 5 , "octave" : 4 }, { "basePitch" : 6 , "octave" : 4 }, { "basePitch" : 7 , "octave" : 4 }, { "basePitch" : 8 , "octave" : 4 }, { "basePitch" : 9 , "octave" : 4 }, { "basePitch" : 10 , "octave" : 4 }, { "basePitch" : 11 , "octave" : 4 }, { "basePitch" : 0 , "octave" : 5 }, { "basePitch" : 1 , "octave" : 5 }, { "basePitch" : 2 , "octave" : 5 }, { "basePitch" : 3 , "octave" : 5 }, { "basePitch" : 4 , "octave" : 5 }, { "basePitch" : 5 , "octave" : 5 }, { "basePitch" : 6 , "octave" : 5 }, { "basePitch" : 7 , "octave" : 5 }, { "basePitch" : 8 , "octave" : 5 }, { "basePitch" : 9 , "octave" : 5 }, { "basePitch" : 10 , "octave" : 5 }, { "basePitch" : 11 , "octave" : 5 }, { "basePitch" : 0 , "octave" : 6 }, { "basePitch" : 1 , "octave" : 6 }, { "basePitch" : 2 , "octave" : 6 }, { "basePitch" : 3 , "octave" : 6 }, { "basePitch" : 4 , "octave" : 6 }, { "basePitch" : 5 , "octave" : 6 }, { "basePitch" : 6 , "octave" : 6 }, { "basePitch" : 7 , "octave" : 6 }, { "basePitch" : 8 , "octave" : 6 }, { "basePitch" : 9 , "octave" : 6 }, { "basePitch" : 10 , "octave" : 6 }, { "basePitch" : 11 , "octave" : 6 }, { "basePitch" : 0 , "octave" : 7 }, { "basePitch" : 1 , "octave" : 7 }, { "basePitch" : 2 , "octave" : 7 }, { "basePitch" : 3 , "octave" : 7 }, { "basePitch" : 4 , "octave" : 7 }, { "basePitch" : 5 , "octave" : 7 }, { "basePitch" : 6 , "octave" : 7 }, { "basePitch" : 7 , "octave" : 7 }, { "basePitch" : 8 , "octave" : 7 }, { "basePitch" : 9 , "octave" : 7 }, { "basePitch" : 10 , "octave" : 7 }, { "basePitch" : 11 , "octave" : 7 }, { "basePitch" : 0 , "octave" : 8 }, { "basePitch" : 1 , "octave" : 8 }, { "basePitch" : 2 , "octave" : 8 }, { "basePitch" : 3 , "octave" : 8 }, { "basePitch" : 4 , "octave" : 8 }, { "basePitch" : 5 , "octave" : 8 }, { "basePitch" : 6 , "octave" : 8 }, { "basePitch" : 7 , "octave" : 8 }, { "basePitch" : 8 , "octave" : 8 }, { "basePitch" : 9 , "octave" : 8 }, { "basePitch" : 10 , "octave" : 8 }, { "basePitch" : 11 , "octave" : 8 }, { "basePitch" : 0 , "octave" : 9 }, { "basePitch" : 1 , "octave" : 9 }, { "basePitch" : 2 , "octave" : 9 }, { "basePitch" : 3 , "octave" : 9 }, { "basePitch" : 4 , "octave" : 9 }, { "basePitch" : 5 , "octave" : 9 }, { "basePitch" : 6 , "octave" : 9 }, { "basePitch" : 7 , "octave" : 9 }, { "basePitch" : 8 , "octave" : 9 }, { "basePitch" : 9 , "octave" : 9 }, { "basePitch" : 10 , "octave" : 9 }, { "basePitch" : 11 , "octave" : 9 }, { "basePitch" : 0 , "octave" : 10 }, { "basePitch" : 1 , "octave" : 10 }, { "basePitch" : 2 , "octave" : 10 }, { "basePitch" : 3 , "octave" : 10 }, { "basePitch" : 4 , "octave" : 10 }, { "basePitch" : 5 , "octave" : 10 }, { "basePitch" : 6 , "octave" : 10 }, { "basePitch" : 7 , "octave" : 10 }];
const BASE_PITCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];

// Used by beatToSchedule and TRIGGER to align musically
// determines how many notes are in the time siqnature denominator
// 0.25 = 1/1 note, 1 = 1/4 note, 4 = 1/16, 8 = 1/32
const TIME_SIG_DENOM_DIVISION = 16; // beatToSchedule results in 1/64 notes
const CURSOR_INCREMENT = 0.0001;

const NOTE_LENGTHS_LIB = {
    "No length"         :   0.000,
    "1/64"  :   0.063,
    "1/64d" :   0.094,
    "1/64t" :   0.021,
    "1/32"	:	0.125,
    "1/32d"	:	0.188,
    "1/32t"	:	0.041,
    "1/16"	:	0.250,
    "1/16d"	:	0.375,
    "1/16t"	:	0.333,
    "1/8" 	:	0.500,
    "1/8d"	:	0.750,
    "1/8t"	:	0.167,
    "1/4" 	:	1.000,
    "1/4d"	:	1.500,
    "1/4t"	:	0.300,
    "1/2" 	:	2.000,
    "1/2d"	:	3.000,
    "1/2t"	:	0.667,
    "1 bar"		:	4.000,
    "1.5 bars"	:	6.000,
    "2 bars"	:	8.000,
    "3 bars"	:	12.000,
    "4 bars"	:	16.000,
    "6 bars"	:	24.000,
    "8 bars"	:	32.000,
    "10 bars"	:	40.000,
    "12 bars"	:	48.000,
    "16 bars"	:	64.000,
    "20 bars"	:	80.000,
    "24 bars"	:	96.000,
    "28 bars"	:	112.000,
    "32 bars"	:	128.000,
    "36 bars"	:	144.000,
    "40 bars"	:	160.000
};
var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );
// quick UI fix for pulldown menu control
var whole_note = NOTE_LENGTH_KEYS.shift();
var whole_triplet = NOTE_LENGTH_KEYS.pop();
NOTE_LENGTH_KEYS.push( whole_note );
NOTE_LENGTH_KEYS.push( whole_triplet );

var music_lib = new MUSIC_LIB();

/*
SCRIPTER FUNCTIONS
*/

// Called by Scripter every time a new MIDI event is encountered by the playhead 
// while the track is playing.
function HandleMIDI(event) {
	event.send();
}

// PROCESS MIDI API
// Called by Scripter to provide timing information for the current processing 
// block. the timing info for the current process block is captured through 
// Scripter's `GetTimingInfo()` function.
function ProcessMIDI() {
	var timing_info = GetTimingInfo();
    
	if ( timing_info.playing ) {
		
        // init the values to calculate beats
        var beatToSchedule = align_beat_to_bar_division( timing_info.blockStartBeat, TIME_SIG_DENOM_DIVISION );

        if ( TRIGGER == RESET_VALUE ) {
            TRIGGER = beatToSchedule;
        }
				
        // loop through the beats that fall within this buffer
        while ( beats_fall_within_buffer( beatToSchedule, timing_info ) ) {
            // adjust for cycle
            beatToSchedule = handle_beat_wraparound( beatToSchedule, timing_info );
            TRIGGER = handle_beat_wraparound( TRIGGER, timing_info );

            if ( beatToSchedule == TRIGGER ) {

                // DO SOMETHING
                // var on = new NoteOn;
                // on.pitch = 60 + beatToSchedule;
                // on.velocity = 100;
                // on.sendAtBeat(beatToSchedule);
                // var off = new NoteOff(on);
                // off.sendAtBeat(beatToSchedule + NOTE_LENGTH);

                // advance the trigger
                TRIGGER += NOTE_LENGTH;
            }


            // advance to next beat
            beatToSchedule += CURSOR_INCREMENT;
            beatToSchedule = align_beat_to_bar_division( beatToSchedule, TIME_SIG_DENOM_DIVISION );
		}
	} else {
        // .playing == false; continuous loop with no way to stop

        // ensure the trigger aligns with the playhead on the next play
        TRIGGER = RESET_VALUE;
    }
}

// PROCESS MIDI API
// aligns any float value to the beats
// ceiling used because all recordable beats are >= 1.000
function align_beat_to_bar_division( value, division ) {
    return Math.ceil( value * division ) / division;
}

// PROCESS MIDI API
// when the intended beat falls outside the cycle, wrap it proportionally 
// from the cycle start
function handle_beat_wraparound( value, timing_info ) {
    if ( timing_info.cycling && value >= timing_info.rightCycleBeat ) {
        value -= ( timing_info.rightCycleBeat - timing_info.leftCycleBeat );
    }
    return value;
}

// PROCESS MIDI API
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

// PARAMETER CONTROL API
// Scripter callback → dispatch to the right handler; no switch/case needed
function ParameterChanged(paramIndex, value) {
  var h = __IDX2HANDLER[paramIndex];
  if (h) h(value, __META[paramIndex]); // meta: { name, group, type }
}

function Reset() {
	/*
	Convenience function which can help with maintaining settings in a script.
	Called at these events:
		- When the transport is started.
		- When the plug-in is bypassed in the MIDI Effects chain.
		- When called directly elsewhere in the code.
	*/
}

function Idle() {
	/*
	Primarily used to handle Parameter Control changes during playing so that
	the changes do not interrupt performance.
	Called every few seconds regardless of tempo or time signature
	*/
}

// Trace
// Trace outputs strings to the Console in the Scripter editor. It can be used as
// standalone function, as in `Trace("Hello, World!")`, or as a method of an 
// event, as in `event.Trace()`.

/*
CUSTOM FUNCTIONS
*/

// PARAMETER CONTROL API
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

/* TESTING: comment out before running in Scripter */
test();
function test() {

}

/*
PARAMETER CONTROL MANAGEMENT
*/

// PARAMETER CONTROL API ======================================
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

/*
	HELPER FUNCTIONS
*/

var r = rInt(1, 100);
function rInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function create_euclidean_pattern ( steps, density, offset ) {
    let notes = Math.round( steps * ( density * 0.01 ) );
    let cache = [];
    let prev = -1;
    for (let step = 1; step <= steps; step++) {
        // round down ( beat * ( slope ) )
        let curr = Math.floor( step * ( notes / steps ) );
        cache.push( curr != prev ? 1 : 0 );
        prev = curr;
    }
    if ( offset > 0 ) {
        cache = [...cache.slice(offset), ...cache.slice(0, offset)];
    }
    return cache;
}

// converts the half- and whole-step jumps into the transposition and pitch shift maps
function updateTranspositionMap( root , templateIndex ) {
	
	var map = [];
	// root index maps directly to MIDI pitches 0-11
	var template = SCALE_TEMPLATES[SCALE_KEYS[templateIndex]];
	var lastPitch = root;
	// init
	map.push(lastPitch);
	
	// build; length - 2 because we ignore the last value
	for ( var index = 0 ; index <= template.length - 2 ; index++ ) {
		var steps = template[index];
		var pitch = lastPitch + steps;
		// add substitions for non-diatonic pitches
		if ( steps > 1 ) {
			for ( j = 0 ; j < steps - 1 ; j++ ) {
				// non-diatonics
				// sharp = pitch
				// flat = lastPitch
				map.push(pitch);
			}
		}
		map.push(pitch);
		lastPitch = pitch;
	}
	
	// normalize to octave C-2 (MIDI pitches 0-11)
	for ( var index = 0 ; index <= map.length - 1 ; index++ ) {
		var pitch = map[index];
		if ( pitch >= 12 ) {
			map[index] = pitch - 12;
		}
	}
	
	map.sort(compareNumbers);
	
	TRANSPOSE_MAP = map;
	// update pitch shift map
	applyTransposeMapToPitchShiftMap();
}

function updateToChromaticMap() {
	TRANSPOSE_MAP = CHROMATIC_MAP;
	PITCH_SHIFT_MAP = PITCH_SHIFT_TEMPLATE;
}

// updates the pitch shift map with individual changes
function updatePitchShiftMap( param , value ) {
	// update the pitch shift map with the difference between the param index and the base pitch
	var index = param - 2;
	TRANSPOSE_MAP[ index ] = value;
	applyTransposeMapToPitchShiftMap();
}

function applyTransposeMapToPitchShiftMap() {
for ( var index = 0 ; index < TRANSPOSE_MAP.length ; index++ ) {
		var chromaticPitch = CHROMATIC_MAP[index];
		var transposePitch = TRANSPOSE_MAP[index];
		PITCH_SHIFT_MAP[ index ] = transposePitch - chromaticPitch;
	}
}

// required for sort() to view numbers as numbers
function compareNumbers(a, b) {
  return a - b;
}

function applyMapToControls( map ) {
	UPDATING_CONTROLS = true;
	// apply the map to the controls
	for ( var index = 0 ; index < map.length ; index++ ) {
		var controlIndex = index + 2;
		SetParameter( controlIndex , map[index] );
	}
	UPDATING_CONTROLS = false;
}

// transposes a pitch to its mapped value within its octave
function transpose( pitch ) {
	var pitchInfo = PITCH_INFO[pitch];
	var transposition = TRANSPOSE_MAP[ pitchInfo.basePitch ];
	var transposedPitch = transposition + ( pitchInfo.octave * 12 );
	//Trace( JSON.stringify(pitchInfo) + " " + transposition + " " + transposedPitch );
	return transposedPitch;
}

/*
	Examples showing how to effect note velocity with waveforms

	Older ProcessMIDI example showing how to use waveforms
function ProcessMIDI() {
	var timing_info = GetTimingInfo();

	// when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
	if ( !timing_info.playing ){

		SETTING_AMP = AMPLITUDE_MAX;
        SETTING_FREQUENCY = CYCLE_LENGTH_LIB[CYCLE_LENGTH_KEYS[GetParameter(PARAM_NAME_FREQUENCY)]];
        SETTING_TIME = timing_info.blockStartBeat;
        SETTING_STEPS = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_STEPS)]];
        SETTING_OFFSET = GetParameter(PARAM_NAME_OFFSET);
        SETTING_OUTPUT_LEVEL = GetParameter(PARAM_NAME_OUTPUT_LEVEL);
        SETTING_SYMMETRY = GetParameter(PARAM_NAME_SYMMETRY);

		TRIGGER = RESET_VALUE;
		return;
	}
	
	// calculate beat to schedule
	var lookAheadEnd = timing_info.blockEndBeat;
	var cursor = timing_info.blockStartBeat;
	if ( TRIGGER == RESET_VALUE ) {
		TRIGGER = timing_info.blockStartBeat;
	}

	// trigger can get stuck outside of cycle causing whole cycle loss of music
	if ( timing_info.cycling && ( !TRIGGER || TRIGGER > timing_info.rightCycleBeat ) ) {
		TRIGGER = ( timing_info.rightCycleBeat > timing_info.blockEndBeat ? timing_info.rightCycleBeat : timing_info.blockEndBeat ); 
		// Assumes the cycle is on a whole number (quarter beat/bottom denominator in time sig);
		if ( TRIGGER == timing_info.rightCycleBeat && Math.trunc(cursor) == timing_info.leftCycleBeat ) {
			TRIGGER = timing_info.blockStartBeat;
		}
			
	}

    // cycling the playhead cretes buffers which need to be managed
    // the buffers are the edges of the cycle
    // process blocks do not line up with cycle bounds
	// when cycling, find the beats that wrap around the last buffer
	if ( timing_info.cycling && lookAheadEnd >= timing_info.rightCycleBeat ) {
        // is the end of the process block past the end of the cycle?
		if ( lookAheadEnd >= timing_info.rightCycleBeat ) {
            // get the length of the process block
			var cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
            // get the difference between the end of the process block and the cycle length
            // this will be the relative shift back to the beginning of the cycle
			var cycleEnd = lookAheadEnd - cycleBeats;
		}
	}

	// increment the cursor through the beats that fall within this cycle's buffers
	while ((cursor >= timing_info.blockStartBeat && cursor < lookAheadEnd)
	// including beats that wrap around the cycle point
	|| (timing_info.cycling && cursor < cycleEnd)) {
		// adjust the cursor and the trigger for the cycle
		if (timing_info.cycling && cursor >= timing_info.rightCycleBeat) {
			cursor -= (timing_info.rightCycleBeat - timing_info.leftCycleBeat);
			TRIGGER = cursor;
		}
        
            // the cursor has come to the trigger
            if ( cursor == TRIGGER ) {

                SETTING_AMP = AMPLITUDE_MAX;
                SETTING_FREQUENCY = CYCLE_LENGTH_LIB[CYCLE_LENGTH_KEYS[GetParameter(PARAM_NAME_FREQUENCY)]];
                SETTING_TIME = timing_info.blockStartBeat;
                SETTING_STEPS = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_STEPS)]];
                SETTING_OFFSET = GetParameter(PARAM_NAME_OFFSET);
                SETTING_OUTPUT_LEVEL = GetParameter(PARAM_NAME_OUTPUT_LEVEL);  
                SETTING_SYMMETRY = GetParameter(PARAM_NAME_SYMMETRY);
                let waveform_selection = GetParameter( PARAM_NAME_WAVEFORMS );      
                switch ( waveform_selection ) {

                    case 0:
                        // "Triangle (⋀)"
                        CURRENT_WAVEFORM_OUTPUT = calc_triangle(
                            SETTING_AMP, 
                            SETTING_FREQUENCY, 
                            cursor, 
                            SETTING_PHASE, 
                            SETTING_OFFSET, 
                            SETTING_OUTPUT_LEVEL,
                            SETTING_SYMMETRY
                        )
                        break;
                    case 1:
                        // "Sine (∿)"
                        CURRENT_WAVEFORM_OUTPUT = calc_sine(
                            SETTING_AMP, 
                            SETTING_FREQUENCY, 
                            cursor, 
                            SETTING_PHASE, 
                            SETTING_OFFSET, 
                            SETTING_OUTPUT_LEVEL
                        )
                        break;
                    case 2:
                        // "Square (⊓)"
                        CURRENT_WAVEFORM_OUTPUT = calc_square(
                            SETTING_AMP, 
                            SETTING_FREQUENCY, 
                            cursor, 
                            SETTING_PHASE, 
                            SETTING_OFFSET, 
                            SETTING_OUTPUT_LEVEL,
                            SETTING_SYMMETRY
                        )
                        break;
                    default:
                        Trace( "ERROR: Waveforms Parameter: " + waveform_selection );
                        break;
                }

                // do something with CURRENT_WAVEFORM_OUTPUT

                var trigger_cache = TRIGGER + GetParameter(PARAM_NAME_STEPS);

                // adjust for the cycle buffers
				if ( timing_info.cycling && trigger_cache >= timing_info.rightCycleBeat ) {
					while ( trigger_cache >= timing_info.rightCycleBeat ) {
						trigger_cache -= cycleBeats;
					}
				}

				TRIGGER = trigger_cache;

            }

		// advance the cursor and trigger to the next beat
		cursor += CURSOR_INCREMENT;
		if ( TRIGGER < cursor ) {
			TRIGGER = cursor;
		}
	}
}

*/

function calc_triangle( amp, freq, time, phase, offset, output_level, symmetry ) {
    let period = 1.0 / freq;
    let r_len = symmetry * period;
    let f_len = period - r_len;
    let r_inc = ( ( r_len != 0 ) ? ( 2.0 * amp / r_len ) : 0 );
    let f_dec = ( ( f_len != 0 ) ? ( 2.0 * amp / f_len ) : 0 );
    let t = ( time % period ) ;
    let result = 0.0;
    if ( t < r_len ) {
        result = -amp + t * r_inc;
    } else {
        result = amp - ( t - r_len ) * f_dec;
    }
    result = (( result + offset ) * output_level).toFixed(3);
    return result;
}

function calc_sine( amp, freq, time, phase, offset, output_level ) {
    return limit_to_amp(( ( amp * Math.sin( 2 * PI * freq * time + phase ) ) + offset ) * output_level).toFixed(3);
}

function calc_square( amp, freq, time, phase, offset, output_level, symmetry ) {
    let tri = calc_triangle( amp, freq, time, phase, offset, output_level, symmetry );
    if ( tri >= 0 ) {
        return amp;
    } else {
        return 0.0;
    }
}

function  limit_to_amp( n ) {
    if ( n > AMPLITUDE_MAX ) {
        return AMPLITUDE_MAX;
    }

    if ( n < AMPLITUDE_MIN ) {
        return AMPLITUDE_MIN;
    }

    return n;
}

function triangle_wave_example( event ) {
	
	SetParameter( PARAM_NAME_WAVEFORMS, 0 );
    SetParameter( PARAM_NAME_OFFSET, 0.6 );
    	SetParameter( PARAM_NAME_OUTPUT_LEVEL, 0.5 );
    	// symmetry 0 = sawtooth falling
    	// symmetry 0.5 = triangle
    	// symmetry 1 = sawtooth rising
    	SetParameter( PARAM_NAME_SYMMETRY, 0.5 );
    		
	let vel = event.velocity;
    let factor = Math.abs( CURRENT_WAVEFORM_OUTPUT );
	let velf = vel * factor;
	velf = Math.trunc( velf );
	velf = MIDI.normalizeData(velf);
	event.velocity = velf;
	return event;
}

function sine_wave_example ( event ) {
    		
    SetParameter( PARAM_NAME_WAVEFORMS, 1 );
    SetParameter( PARAM_NAME_OFFSET, 0.8 );
    SetParameter( PARAM_NAME_OUTPUT_LEVEL, 0.75 );
        
    let vel = event.velocity;
    let factor = Math.abs( CURRENT_WAVEFORM_OUTPUT );
    let velf = vel * factor;
    velf = Math.trunc( velf );
    velf = MIDI.normalizeData(velf);
    event.velocity = velf;
    return event;
}

function square_wave_example( event ) {
    SetParameter( PARAM_NAME_WAVEFORMS, 2 );
    SetParameter( PARAM_NAME_OFFSET, 0.8 );
    SetParameter( PARAM_NAME_OUTPUT_LEVEL, 0.75 );
        
    let vel = event.velocity;
    let factor = Math.abs( CURRENT_WAVEFORM_OUTPUT );
    let velf = vel * factor;
    velf = Math.trunc( velf );
    velf = MIDI.normalizeData(velf);
    event.velocity = velf;
    return event;
} 

function ADSR () {

    this.states = {
        idle      :   0,
        init      :   1,
        attack    :   2,
        decay     :   3,
        sustain   :   4,
        release   :   5   
    };
    this.state = this.states.idle;

    this.note_obj = null;

    this.max_value = 1.0;
    this.min_value = 0.0;
    this.output_value = this.min_value;

    this.increment = 0.001;
    this.env_cursor = 1.0 - this.increment;

    this.attack_length = 0.0;
    this.attack_start = 0.0;
    this.attack_end = 0.0;
    this.attack_slope = 0.0;

    this.decay_length = 0.0;
    this.decay_start = 0.0;
    this.decay_end = 0.0;
    this.decay_slope = 0.0;

    this.sustain_length = 0.0;
    this.sustain_start = 0.0;
    this.sustain_end = 0.0;
    this.sustain_value = 0.0;

    this.release_length = 0.0;
    this.release_start = 0.0;
    this.release_end = 0.0;
    this.release_slope = 0.0;

    this.env_length = 0.0;

    // initialize prepares all of the values for calculating the envelope
    this.initialize = function ( note_obj ) {
        this.note_obj = note_obj;
        this.state = this.states.init;
    }

    this.calc_envelope = function ( cursor, a_len, d_len, s_len, s_val, r_len ) {
        // set the phase dimensions for the envelope
        this.attack_length = a_len;
        this.attack_start = cursor;
        this.attack_end = this.attack_start + this.attack_length;

        this.decay_length = d_len;
        this.decay_start = this.attack_end;
        this.decay_end = this.decay_start + this.decay_length;

        this.sustain_length = s_len;
        this.sustain_start = this.decay_end;
        this.sustain_end = this.sustain_start + this.sustain_length;

        this.release_length = r_len;
        this.release_start = this.sustain_end;
        this.release_end = this.release_start + this.release_length;

        this.env_length = this.release_end;

        this.sustain_value = s_val;

        this.attack_slope = this.calc_slope( this.attack_start, this.attack_end, this.min_value, this.max_value );
        this.decay_slope = this.calc_slope( this.decay_start, this.decay_end, this.max_value, ( this.sustain_length > 0 ? this.sustain_value : this.min_value ) );
        this.release_slope = this.calc_slope( this.release_start, this.release_end, ( this.sustain_length > 0 ? this.sustain_value : this.min_value ), this.min_value );
    
        this.env_cursor = cursor - this.increment;

        this.state = this.states.attack;

        this.env_trigger = this.attack_start;
    }

    this.calc_slope = function ( x1, x2, y1, y2 ) {
        let rise = y2 - y1;
        let run = x2 - x1;
        let slope = rise / run;

        return slope;
    }

    // process moves through the envelope if the gate is open
    this.process = function () {
        // if the envelope is not being progressed for whatever reason
        // set the envelope to idle, reset the output value, and return
        if ( this.state == this.states.idle ) {
            return this.output_value;
        }

        if ( this.state == this.states.init ) {
            this.state = this.states.attack;
        }

        // calcuate the current value based on the position of the cursor
        switch ( this.state ) {
            case this.states.attack:

                this.output_value = this.attack_slope * ( this.env_cursor - this.attack_start );  
                this.output_value = this.truncate(this.output_value); 

                // ensure the output is within the bounds of the envelope
                if ( this.output_value >= this.max_value ) {
                    this.output_value = this.max_value;
                    this.state = this.states.decay;
                }

                this.env_cursor += this.increment;
                return this.output_value;

            case this.states.decay:

                this.output_value = this.decay_slope * ( this.env_cursor - this.decay_start );
                this.output_value += this.max_value;
                this.output_value = this.truncate(this.output_value);

                // ensure the output is within the bounds of the envelope
                // check where the cursor is in the envelope
                if ( this.sustain_length > 0 ) {
                    if ( this.output_value <= this.sustain_value ) {
                        this.output_value = this.sustain_value;
                        this.state = this.states.sustain;
                    }
                    if ( this.output_value <= this.sustain_value ) {
                    }
                } else {
                    if ( this.output_value <= this.min_value ) {
                        this.output_value = this.min_value;
                        this.state = this.states.idle;
                    }
                }
                
                this.env_cursor += this.increment;
                return this.output_value;

            case this.states.sustain:

                if ( this.env_cursor >= this.sustain_end - this.attack_start ) {
                    this.state = this.states.release;
                }

                this.env_cursor += this.increment;
                return this.output_value;

            case this.states.release:
                
                this.output_value = this.release_slope * ( this.env_cursor - this.release_start ); 
                this.output_value += this.sustain_value;
                this.output_value = this.truncate(this.output_value); 

                // ensure the output is within the bounds of the envelope
                // check where the cursor is in the envelope
                if ( this.sustain_length > 0 ) {
                    if ( this.output_value >= this.sustain_value ) {
                        this.output_value = this.sustain_value;
                    }
                }

                if ( this.output_value <= this.min_value ) {
                    this.output_value = this.min_value;
                    this.state = this.states.idle;
                }

                this.env_cursor += this.increment;
                return this.output_value;
                
            default:
                Trace("ADSR ERROR: process()");
                // prevent endless processing
                break;
        }

        this.env_cursor += this.increment;

    }

    this.truncate = function ( n ) {
        // return Number.parseFloat(n).toFixed(3);
        let t = n.toFixed(3);
        let f = Number.parseFloat(t);
        return f;
    }
}

function calc_percent_delta( min, max, multiplier ) {
    return ( ( max - min ) * multiplier ) + min;
}

function MUSIC_LIB () {

	/* GENERAL MUSIC */

	// index aligns to lowest MIDI octave
	this.CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
	this.CHROMATIC_HALF_STEPS = 12;
	this.OCTAVE_PITCH_INDEX = [-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8];

	/* SCALES */

    this.SCALE_DEGREE_NAMES = ["I tonic", "II supertonic", "III mediant", "IV subdominant", "V dominant", "VI submediant", "VII leading tone"];
	this.KEYBOARD_STRINGS = [];
	this.SCALE_TEMPLATES = {
		"Ionian" : [2, 2, 1, 2, 2, 2, 1],
		"Dorian" : [2, 1, 2, 2, 2, 1, 2],
		"Phrygian" : [1, 2, 2, 2, 1, 2, 2],
		"Lydian" : [2, 2, 2, 1, 2, 2, 1],
		"Mixolydian" : [2, 2, 1, 2, 2, 1, 2],
		"Aeolian" : [2, 1, 2, 2, 1, 2, 2],
		"Locrian" : [1, 2, 2, 1, 2, 2, 2]
	}
	this.SCALE_KEYS = Object.keys(this.SCALE_TEMPLATES);
	
	this._PITCH_TYPE_ROOT = 'rt';
	this._PITCH_TYPE_DIATONIC = 'dt';
	this._PITCH_TYPE_NONDIATONIC = 'nd';
	this._PITCH_RECORD_KEY_TYPE = "t";
	this._PITCH_RECORD_KEY_DEGREE = "d";
	this._PITCH_RECORD_KEY_NAME = "n";

	/* CHORDS */

	this.CHORD_VOICE_ROOT = 0;
	this.CHORD_VOICE_3RD = 1;
	this.CHORD_VOICE_5TH = 2;
	this.CHORD_VOICE_7TH = 3;
	this.CHORD_VOICE_9TH = 4;
	this.CHORD_VOICE_11TH = 5;
	this.CHORD_VOICE_13TH = 6;
	this.CHORD_VOICE_OPTIONS = {
		"Triad (1, 3, 5)" : [1, 1, 1, 0, 0, 0, 0],
		"7th (1, 3, 5, 7)" : [1, 1, 1, 1, 0, 0, 0],
		"Exc. 5th (1, 3, 7)" : [1, 1, 0, 1, 0, 0, 0],
		"Extensions (9, 11, 13)" : [0, 0, 0, 0, 1, 1, 1],
		"Pentatonic (1, 3, 5, 9, 11)" : [1, 1, 1, 0, 1, 1, 0],
		"Exclude Minor 9ths" : [1, 1, 1, 1, 1, 1, 1],
		"Pop VII/I" : [0, 0, 0, 1, 1, 1, 0],
		"Pop II/I" : [0, 0, 0, 0, 1, 1, 1]
	};
	this.CHORD_VOICE_OPTIONS_KEYS = Object.keys( this.CHORD_VOICE_OPTIONS );
	this.CHORD_OPTIONS = [1, 1, 1, 1, 1, 1, 1];

	/*

	MUSIC_LIB provides fundamental calculations for scales and chords. It
	is intended to provide a single source of truth for Scripter by being 
	accurate, fast, and lightweight. MUSIC_LIB is designed to input and 
	output a number of formats needed for Scripter (and some personal uses)
	but it does not actually store anything aside what's needed to provided
	desired data.

	Example: C Major chord in C Major scale
	let music_lib = new MUSIC_LIB();
	music_lib.initialize();
	let root = 0; // C
	let type = 0; // Major
	// build the basic scale object with full metadata
	let scale = music_lib.calculate_scale_pitches( root , type );
	// expand to MIDI range
	scale = music_lib.expand_scale_to_midi_range( scale );
	// remove non-diatonic pitches
	scale = music_lib.collapse_scale_to_diatonic( scale );
	// remove all metadata except MIDI pitch numbers
	scale = music_lib.collapse_scale_to_integers( scale );
	// build the C Major chord
	let chord = calculate_chord_pitches( root , scale );
	let parameter_index = 0; // Parameter Control Number
	let options_value = 0 // "Triad (1, 3, 5)"
	music_lib.update_chord_options( index, value );
	chord = music_lib.get_voices_from_chord( options, chord );
	*/

    // initialize prepares values for base calculations
    this.initialize = function () {
		// build the keyboard strings
		let keyboard_strings_cache = [];
        for (let index = 0; index < 12; index++) {
			this.CHROMATIC_SCALE_STRINGS.forEach( function ( s ) {
				keyboard_strings_cache.push( s );
			});
		}
		this.KEYBOARD_STRINGS = keyboard_strings_cache;
		// populate object key caches
		this.SCALE_KEYS = Object.keys(this.SCALE_TEMPLATES);
    }

	/* SCALE CALCULATIONS */

	// returns the chromatic scale, noting root, diatonic, and non-diatonic pitches
	this.calculate_scale_pitches = function ( root, templateIndex ) {

		// root index maps directly to MIDI pitches 0-11
		let template = this.SCALE_TEMPLATES[this.SCALE_KEYS[templateIndex]];
		let lastPitch = root;
		let diatonic_count = 0;
		// init
		let pitch_weight_map = {};
		pitch_weight_map[lastPitch] = this._create_pitch_record( this._PITCH_TYPE_ROOT, diatonic_count, lastPitch );

		// build; length - 2 because we ignore the last value
		for ( let index = 0 ; index <= template.length - 2 ; index++ ) {
			let steps = template[index];
			let pitch = lastPitch + steps;
			// non-diatonic pitches
			if ( steps > 1 ) {
				let non_diatonic_pitch = pitch;
				while ( steps > 0 ) {
					non_diatonic_pitch--;
					if ( !pitch_weight_map[non_diatonic_pitch] ) {
						pitch_weight_map[non_diatonic_pitch] = this._create_pitch_record( this._PITCH_TYPE_NONDIATONIC, -1, non_diatonic_pitch );
					}
					steps--;
				}
			}
			diatonic_count++;
			pitch_weight_map[pitch] = this._create_pitch_record( this._PITCH_TYPE_DIATONIC, diatonic_count, pitch );
			lastPitch = pitch;
		}
			
		// normalize to octave C-2 (MIDI pitches 0-11)
		let cache = {};
		let keys = Object.keys(pitch_weight_map);
		keys.forEach( function ( key ) {
			let pitch = parseInt(key);
			let pitchRecord = pitch_weight_map[key]
			if ( pitch >= 12 ) { 
				pitch = pitch - 12;
			}
				cache[pitch] = pitchRecord;
		});

		return cache;
			
	}

	this._create_pitch_record = function ( type, degree, pitch ) {
		let cache = {};
		cache[this._PITCH_RECORD_KEY_TYPE] = type;
		cache[this._PITCH_RECORD_KEY_DEGREE] = this.SCALE_DEGREE_NAMES[degree];
		cache[this._PITCH_RECORD_KEY_NAME] = this.KEYBOARD_STRINGS[pitch];
		return cache;
	}

	/* SCALE MANIPULATION */

	// takes a single C-2 scale and returns a scale object containing all octaves
	// creates an object with length 144; does not limit to 0-127
	this.expand_scale_to_midi_range = function ( scale ) {
		let cache = {};
		let scale_keys = Object.keys( scale );
		for (let index = 0; index < 12; index++) {
			scale_keys.forEach( function ( key ) {
				let pitch = parseInt(key);
				let pitch_record = scale[key];
				let new_pitch = pitch + ( index * 12 )
				cache[new_pitch] = JSON.parse(JSON.stringify(pitch_record));
			});
		}
		return cache;
	}

	// takes a scale object of any length and return a scale object with only diatonic notes
	this.collapse_scale_to_diatonic = function ( scale ) {
		let cache = {};
		let scale_keys = Object.keys(scale);
		scale_keys.forEach( function ( key ) {
			let pitch_record = scale[key];
			if ( pitch_record[ 't' ] === 'dt' || pitch_record[ 't' ] === 'rt' ) {
				cache[key] = JSON.parse(JSON.stringify(pitch_record));
			} else {
				// exclude silently
			}
		});
		return cache;
	}

	// takes a scale object of any length and type and returns an integer array
	this.collapse_scale_to_integers = function ( scale ) {
		let cache = [];
		let scale_keys = Object.keys(scale);
		scale_keys.forEach( function ( key ) {
			cache.push(parseInt(key));
		});
		return cache;
	}

	// takes a scale object of any length and type and returns an integer array
	this.collapse_scale_to_spelling = function ( scale ) {
		let cache = [];
		let scale_keys = Object.keys(scale);
		scale_keys.forEach( function ( key ) {
			cache.push(parseInt(key));
		});
		return cache;
	}

	/* CHORD CALCULATIONS */

	// root = integer
	// scale = <integer>array
	this.calculate_chord_pitches = function ( root, scale ) {

		var full_keyboard = music_lib.expand_scale_to_midi_range(scale);

		// update the scale object to only include diatonic notes
		let diatonic_scale = this.collapse_scale_to_diatonic( full_keyboard );
		// update the scale to an array of integers of diatonic pitches
		let chord_scale = this.collapse_scale_to_spelling( diatonic_scale );

		let voices = [];
		let root_index = chord_scale.indexOf( root );
		// root
		voices.push( chord_scale[ root_index ] );
		// 3rd
		voices.push( chord_scale[ root_index + 2 ] );
		// 5th
		voices.push( chord_scale[ root_index + 4 ] );
		// 7th
		voices.push( chord_scale[ root_index + 6 ] );
		// 9th
		voices.push( chord_scale[ root_index + 8 ] );
		// 11th
		voices.push( chord_scale[ root_index + 10 ] );
		// 13th
		voices.push( chord_scale[ root_index + 12 ] );
		return voices;
	}

	this.update_chord_options = function ( index, value ) {
		this.CHORD_VOICE_OPTION_SELECTION = value;
		this.CHORD_VOICE_OPTION_SELECTION_KEY = this.CHORD_VOICE_OPTIONS_KEYS[this.CHORD_VOICE_OPTION_SELECTION];
		if ( index == 4 ) {
			UPDATING_CONTROLS = true;
			let options = this.CHORD_VOICE_OPTIONS[this.CHORD_VOICE_OPTION_SELECTION_KEY];
			SetParameter( 5, options[ 0 ] );
			SetParameter( 6, options[ 1 ] );
			SetParameter( 7, options[ 2 ] );
			SetParameter( 8, options[ 3 ] );
			SetParameter( 9, options[ 4 ] );
			SetParameter( 10, options[ 5 ] );
			SetParameter( 11, options[ 6 ] );
			UPDATING_CONTROLS = false;
		}
		this.CHORD_OPTIONS[ 0 ] = GetParameter( 5 );
		this.CHORD_OPTIONS[ 1 ] = GetParameter( 6 );
		this.CHORD_OPTIONS[ 2 ] = GetParameter( 7 );
		this.CHORD_OPTIONS[ 3 ] = GetParameter( 8 );
		this.CHORD_OPTIONS[ 4 ] = GetParameter( 9 );
		this.CHORD_OPTIONS[ 5 ] = GetParameter( 10 );
		this.CHORD_OPTIONS[ 6 ] = GetParameter( 11 );
	}

	this.get_voices_from_chord = function ( options, chord ) {
		let voices = [];
		if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Exclude Minor 9ths" ) {
			voices = remove_minor_9ths( chord );
		} else {
			for ( let index = 0; index < options.length; index++ ) {
				if ( this.CHORD_OPTIONS[index] == 1 ) {
					let voice = chord[ index ];
					// shift the extensions down to behave like a chord so the rest of the data stream can handle accordingly
					if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Pop VII/I" || this.CHORD_VOICE_OPTION_SELECTION_KEY == "Pop II/I" ) {
						v -= this.CHROMATIC_HALF_STEPS;
					}
					voices.push( voice );
				} 
				// Drop Chords 7ths { [3]1:B, [2]2:G, [1]3:E, [0]4:C }
				if ( index == 2 ) {
					if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Drop 2 (1342)" || this.CHORD_VOICE_OPTION_SELECTION_KEY == "Drop 2+3 (1423)" || this.CHORD_VOICE_OPTION_SELECTION_KEY == "Drop 2+4 (1324)" ) {
						v -= this.CHROMATIC_HALF_STEPS;
						voices.push( voice );
					}
				} 
				if ( index == 1 ) {
					if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Drop 3 (1243)" || this.CHORD_VOICE_OPTION_SELECTION_KEY == "Drop 2+3 (1423)" ) {
						v -= this.CHROMATIC_HALF_STEPS;
						voices.push( voice );
					}
				} 
				if ( index == 0 ) {
					if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Drop 2+4 (1324)" ) {
						v -= this.CHROMATIC_HALF_STEPS;
						voices.push( voice );
					}
				}
			}
		}
		return voices;
	}

	this.remove_minor_9ths = function ( chord ) {
		if ( chord.length != 7 ) {
			return chord;
		}
		const vmin = 0;
		const vmax = 3;
		const emin = 4;
		const emax = 6;
		for (let e = emin; e <= emax; e++) {
			for (let v = vmin; v <= vmax; v++) {
				const extension = chord[e];
				const voice = chord[v];
				const interval = extension - voice;
				if ( interval == 13 ) {
					chord[e] = null;
				}
			}
		}
	
		let cache = [];
		chord.forEach( function ( voice ) {
			if ( voice != null ) {
				cache.push(voice);
			}
		});
	
		return cache;
	}

	this.transpose_pitch_to_lowest_octave = function ( pitch ) {
		let tp_pitch = pitch;
		while ( tp_pitch > 11 ) {
			tp_pitch -= this.CHROMATIC_HALF_STEPS;
		}
		return tp_pitch;
	}
}

// PARAMETER CONTROL API : ControlGroup =======================
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

// PARAMETER CONTROL API : Sequencer ==========================
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

// PARAMETER CONTROL API ======================================
// Build once at load; also on Reset
// (Make sure this is AFTER your Controls.add(...) calls.)
// ============================================================
Controls.build();
function Reset() { Controls.build(); UpdatePluginParameters(); }