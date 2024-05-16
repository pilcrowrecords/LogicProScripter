/******************************************************************************
Name: Euclid Groove Generator
Author(s): Philip Regan
Purpose: Multiple voice groove generation based on Euclidean rhythms

Sequencer Features:
* Rate: How often the patterns are stepped through.
* Re-Sync: When patterns are reset to step 1.
    * Off: Patterns are never reset. They just play through per their chosen 
    direction
    * Bar: On every new Bar, regardless of cycling, patterns are reset.
    * Cycle: When cycling and a new cycle has begun, patterns are reset.
    * NoteOn: When a NoteOn is detected in the track, patterns are reset. The
    note in the track is NOT played.
* Meter: When patterns are stepped through.
    * Single: All voices are stepped at the Sequencer rate
    * Poly: Each voice is played at their own independent rate.
* Reset Sync: Manual re-sync of all voices.

Voice Features:
* Pitch: MIDI Pitch 0-127. These pitches are not captured in HandleMIDI()
when played.
* Velocity: MIDI Velocity 0-127
* Duration: The rate at which the voice's pattern is stepped through
* Euclidian Parameters
    * Steps: The number of steps in the pattern
    * Density: Percentage of steps which will have notes
    * Offset: The number of steps by which the pattern will be rotated.
    * For Steps, Density, and Offset, the pattern is calculated and displayed in 
    Scripter's Interactive Console.
* Direction: the direction the pattern is stepped through
    * Forward: Stepped in order of 1-n
    * Backward: Stepped in order of n-1
    * Ping-Pong: Stepped in order of 1-n then n-1
    * Random: Played step is randomly selected.
* Probability: The % chance that a note will be played.

To add or remove voices:
* Voices are stored as objects in a global Array called VOICES.
* Voice parameters are hard-coded into the PluginParameters array and the
ParameterChanged() function.

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

const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
const OCTAVE_STRINGS = ["-2", "-1", "0", "1", "2", "3", "4", "5", "6", "7", "8"];
var PITCH_STRINGS = []
// build the pitch strings
var pitch_cursor = -1;
var octave_cursor = -1;
var current_octave = "";
for ( let pitch = 0; pitch < 128; pitch++ ) {

    pitch_cursor += 1;
    if ( pitch_cursor == CHROMATIC_SCALE_STRINGS.length ) {
        pitch_cursor = 0;
    }
    
    if ( pitch_cursor == 0 ) {
        octave_cursor += 1;
        if ( octave_cursor == OCTAVE_STRINGS.length ) {
            octave_cursor = 0;
        }
    }
    
    PITCH_STRINGS.push( CHROMATIC_SCALE_STRINGS[pitch_cursor] + " " + OCTAVE_STRINGS[octave_cursor] + " (" + pitch + ")" );
}

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

const NOTE_LENGTHS_LIB = {
    "1/64"		:	0.063,
	"1/64d"		:	0.094,
	"1/64t"		:	0.021,
	"1/32"		:	0.125,
	"1/32d"		:	0.188,
	"1/32t"		:	0.042,
	"1/16"		:	0.250,
	"1/16d"		:	0.375,
	"1/16t"		:	0.083,
	"1/8"		:	0.500,
	"1/8d"		:	0.750,
	"1/8t"		:	0.167,
	"1/4"		:	1.000,
	"1/4d"		:	1.500,
	"1/4t"		:	0.333,
	"1/2"		:	2.000,
	"1/2d"		:	3.000,
	"1/2t"		:	0.667,
	"1 bar"		:	4.000,
	"1.5 bars"	:	6.000,
	"2 bars"	:	8.000,
	"4 bars"	:	16.000,
	"8 bars"	:	32.000
};
var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

var SEQUENCER_RESYNC_SELECTIONS = ["Off", "Bar", "Cycle", "NoteOn"];
var SEQUENCER_POLY_SELECTIONS = ["Single", "Poly"];
var VOICE_PLAY_SELECTIONS = ["Forward", "Backward", "Ping-Pong", "Random"];

/* PLAY VARIABLES */

var PARAM_SEQUENCER_RATE = NOTE_LENGTHS_LIB["1/16"];
var PARAM_RESYNC = 0;
var PARAM_POLY = 0;
var PARAM_RESET = false;

var LAST_CYCLE = 0;
var CYCLE_COUNT = 0;

// Used by beatToSchedule and TRIGGER to align musically
// determines how many notes are in the time siqnature denominator
// 0.25 = 1/1 note, 1 = 1/4 note, 4 = 1/16, 8 = 1/32
const TIME_SIG_DENOM_DIVISION = 16; // beatToSchedule results in 1/64 notes

// the SYNC_TRIGGER variable is where the next note (or rest) is to be played
// SYNC_TRIGGER is global to track it across process blocks
// the cursor is a simulated location of the transport/playhead in the track
// cursor is handled locally because only the current process block matters while playing
const RESET_VALUE = -1.0;
var SYNC_TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001; // smallest note length = 0.125

// VOICE DEFAULTS
const PARAM_VOICE_DEFAULT_PITCH = 60;
const PARAM_VOICE_DEFAULT_VELOCITY = 100;
const PARAM_VOICE_DEFAULT_DURATION = NOTE_LENGTHS_LIB["1/16"];
const PARAM_VOICE_DEFAULT_STEPS = 16;
const PARAM_VOICE_DEFAULT_DENSITY = 50;
const PARAM_VOICE_DEFAULT_OFFSET = 0;
const PARAM_VOICE_DEFAULT_DIRECTION = 0;
const PARAM_VOICE_DEFAULT_PROBABILITY = 100;
const PARAM_VOICE_DEFAULT_CURR_STEP = 0;
const PARAM_VOICE_DEFAULT_LAST_BEAT_TO_SCHED = RESET_VALUE;
const PARAM_VOICE_DEFAULT_trigger = RESET_VALUE;
const PARAM_VOICE_DEFAULT_PING_PING_DIRECTION = 0;

// private properties are prefixed with `_`
// _pattern is <Boolean>[], length determined by Steps
var VOICES = [{
        "Pitch"                     : PARAM_VOICE_DEFAULT_PITCH,
        "Velocity"                  : PARAM_VOICE_DEFAULT_VELOCITY,
        // PolyMeter = note duration, PolyRhythm = voice rate and note duration
        "Duration"                  : PARAM_VOICE_DEFAULT_DURATION,
        "Steps"                     : PARAM_VOICE_DEFAULT_STEPS,
        "Density"                   : PARAM_VOICE_DEFAULT_DENSITY,
        "Offset"                    : PARAM_VOICE_DEFAULT_OFFSET,
        "Direction"                 : PARAM_VOICE_DEFAULT_DIRECTION,
        "Probability"               : PARAM_VOICE_DEFAULT_PROBABILITY,
        "_pattern"                  : create_euclidean_pattern( PARAM_VOICE_DEFAULT_STEPS, PARAM_VOICE_DEFAULT_DENSITY, PARAM_VOICE_DEFAULT_OFFSET),
        "_current_step"             : PARAM_VOICE_DEFAULT_CURR_STEP,
        "_last_beat_to_schedule"    : PARAM_VOICE_DEFAULT_LAST_BEAT_TO_SCHED,
        "_trigger"             : PARAM_VOICE_DEFAULT_trigger,
        // 0 = forward, 1 = backward
        "_ping_pong_direction"      : PARAM_VOICE_DEFAULT_PING_PING_DIRECTION
    },
    {
        "Pitch"                     : PARAM_VOICE_DEFAULT_PITCH,
        "Velocity"                  : PARAM_VOICE_DEFAULT_VELOCITY,
        "Duration"                  : PARAM_VOICE_DEFAULT_DURATION,
        "Steps"                     : PARAM_VOICE_DEFAULT_STEPS,
        "Density"                   : PARAM_VOICE_DEFAULT_DENSITY,
        "Offset"                    : PARAM_VOICE_DEFAULT_OFFSET,
        "Direction"                 : PARAM_VOICE_DEFAULT_DIRECTION,
        "Probability"               : PARAM_VOICE_DEFAULT_PROBABILITY,
        "_pattern"                  : create_euclidean_pattern( PARAM_VOICE_DEFAULT_STEPS, PARAM_VOICE_DEFAULT_DENSITY, PARAM_VOICE_DEFAULT_OFFSET),
        "_current_step"             : PARAM_VOICE_DEFAULT_CURR_STEP,
        "_last_beat_to_schedule"    : PARAM_VOICE_DEFAULT_LAST_BEAT_TO_SCHED,
        "_trigger"                  : PARAM_VOICE_DEFAULT_trigger,
        "_ping_pong_direction"      : PARAM_VOICE_DEFAULT_PING_PING_DIRECTION
    },
    {
        "Pitch"                     : PARAM_VOICE_DEFAULT_PITCH,
        "Velocity"                  : PARAM_VOICE_DEFAULT_VELOCITY,
        "Duration"                  : PARAM_VOICE_DEFAULT_DURATION,
        "Steps"                     : PARAM_VOICE_DEFAULT_STEPS,
        "Density"                   : PARAM_VOICE_DEFAULT_DENSITY,
        "Offset"                    : PARAM_VOICE_DEFAULT_OFFSET,
        "Direction"                 : PARAM_VOICE_DEFAULT_DIRECTION,
        "Probability"               : PARAM_VOICE_DEFAULT_PROBABILITY,
        "_pattern"                  : create_euclidean_pattern( PARAM_VOICE_DEFAULT_STEPS, PARAM_VOICE_DEFAULT_DENSITY, PARAM_VOICE_DEFAULT_OFFSET),
        "_current_step"             : PARAM_VOICE_DEFAULT_CURR_STEP,
        "_last_beat_to_schedule"    : PARAM_VOICE_DEFAULT_LAST_BEAT_TO_SCHED,
        "_trigger"                  : PARAM_VOICE_DEFAULT_trigger,
        "_ping_pong_direction"      : PARAM_VOICE_DEFAULT_PING_PING_DIRECTION
    },
    {
        "Pitch"                     : PARAM_VOICE_DEFAULT_PITCH,
        "Velocity"                  : PARAM_VOICE_DEFAULT_VELOCITY,
        "Duration"                  : PARAM_VOICE_DEFAULT_DURATION,
        "Steps"                     : PARAM_VOICE_DEFAULT_STEPS,
        "Density"                   : PARAM_VOICE_DEFAULT_DENSITY,
        "Offset"                    : PARAM_VOICE_DEFAULT_OFFSET,
        "Direction"                 : PARAM_VOICE_DEFAULT_DIRECTION,
        "Probability"               : PARAM_VOICE_DEFAULT_PROBABILITY,
        "_pattern"                  : create_euclidean_pattern( PARAM_VOICE_DEFAULT_STEPS, PARAM_VOICE_DEFAULT_DENSITY, PARAM_VOICE_DEFAULT_OFFSET),
        "_current_step"             : PARAM_VOICE_DEFAULT_CURR_STEP,
        "_last_beat_to_schedule"    : PARAM_VOICE_DEFAULT_LAST_BEAT_TO_SCHED,
        "_trigger"                  : PARAM_VOICE_DEFAULT_trigger,
        "_ping_pong_direction"      : PARAM_VOICE_DEFAULT_PING_PING_DIRECTION
}];

function HandleMIDI( event ) {
    if ( event instanceof NoteOn ) {
        if ( PARAM_RESET == 3 ) {
            // resync events are triggered on note on
            VOICES.forEach( function ( voice ) {
                voice._current_step = 0;
            });
        }
    } else {
        event.send();
    }
}

function ProcessMIDI() {

    var timing_info = GetTimingInfo();
    
	if ( timing_info.playing ) {
		
        // init the values to calculate beats
        var beatToSchedule = align_beat_to_bar_division( timing_info.blockStartBeat, TIME_SIG_DENOM_DIVISION );

        if ( SYNC_TRIGGER == RESET_VALUE ) {
            SYNC_TRIGGER = beatToSchedule;
        }

        VOICES.forEach( function( voice ) {
            if ( voice._trigger == RESET_VALUE ) {
                voice._trigger = beatToSchedule;
            }
        });

        // loop through the beats that fall within this buffer
        while ( beats_fall_within_buffer( beatToSchedule, timing_info ) ) {
            // adjust for cycle
            beatToSchedule = handle_beat_wraparound( beatToSchedule, timing_info );
            SYNC_TRIGGER = handle_beat_wraparound( SYNC_TRIGGER, timing_info );
           
            if ( PARAM_RESYNC == 0 ) {
                 // rsync events are off; do nothing
            } else if ( PARAM_RESYNC == 1 ) {
                // resync events are triggered on new Bars
                //  bTS is Bar 1 OR
                //      bTS is a whole number AND
                //      bTS is evenly divisible by 4
                //  then bTS is a new Bar
                if ( beatToSchedule === 1 || ( beatToSchedule % 1 === 0 && beatToSchedule % 4 === 0 ) ) {
                    VOICES.forEach( function ( voice ) {
                        voice._current_step = 0;
                    });
                }
            } else if ( PARAM_RESYNC == 2 ) {
                // resync events are triggered on new cycles
                if ( timing_info.cycling ) {
                    let left_cycle = timing_info.leftCycleBeat;
                    // let right_cycle = timing_info.rightCycleBeat;
                    if ( LAST_CYCLE == 0 ) {
                        LAST_CYCLE = Math.floor(beatToSchedule);
                    }
                    let curr_cycle = Math.floor(beatToSchedule);
                    
                    if ( curr_cycle == left_cycle && curr_cycle != LAST_CYCLE ) {
                        VOICES.forEach( function ( voice ) {
                            voice._current_step = 0;
                        });
                    }
                    if ( curr_cycle != LAST_CYCLE ) {
                        LAST_CYCLE = curr_cycle;
                    }
                } else {
                    LAST_CYCLE == 0;
                }
            }

            // resyncs are set; play the voices
            if ( PARAM_POLY == 0 && beatToSchedule == SYNC_TRIGGER ) {
                play_voices( beatToSchedule, timing_info );
                SYNC_TRIGGER += PARAM_SEQUENCER_RATE;
            } else if ( PARAM_POLY == 1 ) {
                play_voices( beatToSchedule, timing_info );
            }

            // advance to next beat
            beatToSchedule += CURSOR_INCREMENT;
            beatToSchedule = align_beat_to_bar_division( beatToSchedule, TIME_SIG_DENOM_DIVISION );
		}
	} else {
        // .playing == false; continuous loop with no way to stop

        // ensure the SEQUENCER_TRIGGER aligns with the playhead on the next play
        SYNC_TRIGGER = RESET_VALUE;
        VOICES.forEach( function( voice ) {
            voice._trigger = RESET_VALUE;
        });
    }
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

function ParameterChanged( index, value ) {
    switch ( index ) {
        case 0:
            // Sequencer text
            break;
        case 1:
            PARAM_SEQUENCER_RATE = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[value]];
            Trace(JSON.stringify({
                PARAM_SEQUENCER_RATE:PARAM_SEQUENCER_RATE
            }));
            break;
        case 2:
            PARAM_RESYNC = value;
            Trace(JSON.stringify({
                PARAM_RESYNC:PARAM_RESYNC
            }));
            break;
        case 3:
            PARAM_POLY = value;
            Trace(JSON.stringify({
                PARAM_POLY:PARAM_POLY
            }));
            break;
        case 4:
            PARAM_RESET = value;
            Trace(JSON.stringify({
                PARAM_RESET:PARAM_RESET
            }));
            VOICES.forEach( function ( voice ) {
                voice._current_step = 0;
            });
            break;
        case 5:
            // Voice 1 text
            break;
        case 6:
            VOICES[0].Pitch = value;
            Trace(JSON.stringify({
                V0_PITCH:VOICES[0].Pitch
            }));
            break;
        case 7:
            VOICES[0].Velocity = value;
            Trace(JSON.stringify({
                V0_VELOCITY:VOICES[0].Velocity
            }));
            break;
        case 8:
            VOICES[0].Duration = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[value]];
            Trace(JSON.stringify({
                V0_DURATION:VOICES[0].Duration
            }));
            break;
        case 9:
            VOICES[0].Steps = value;
            VOICES[0]._pattern = create_euclidean_pattern( VOICES[0].Steps, VOICES[0].Density, VOICES[0].Offset);
            Trace(JSON.stringify({
                V0_STEPS:VOICES[0].Steps,
                PATTERN:VOICES[0]._pattern
            }));
            break;
        case 10:
            VOICES[0].Density = value;
            VOICES[0]._pattern = create_euclidean_pattern( VOICES[0].Steps, VOICES[0].Density, VOICES[0].Offset);
            Trace(JSON.stringify({
                V0_STEPS:VOICES[0].Steps,
                PATTERN:VOICES[0]._pattern
            }));           
            break;
        case 11:
            VOICES[0].Offset = value;
            VOICES[0]._pattern = create_euclidean_pattern( VOICES[0].Steps, VOICES[0].Density, VOICES[0].Offset);
            Trace(JSON.stringify({
                V0_STEPS:VOICES[0].Steps,
                PATTERN:VOICES[0]._pattern
            }));            
            break;
        case 12:
            VOICES[0].Direction = value;
            Trace(JSON.stringify({
                V0_DIRECTION:VOICES[0].Direction
            }));
            break;
        case 13:
            VOICES[0].Probability = value;
            Trace(JSON.stringify({
                V0_PROBABILITY:VOICES[0].Probability
            }));
            break;
        case 14:
            // Voice 2 text
            break;
        case 15:
            VOICES[1].Pitch = value;
            Trace(JSON.stringify({
                V1_PITCH:VOICES[1].Pitch
            }));
            break;
        case 16:
            VOICES[1].Velocity = value;
            Trace(JSON.stringify({
                V1_VELOCITY:VOICES[1].Velocity
            }));
            break;
        case 17:
            VOICES[1].Duration = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[value]];
            Trace(JSON.stringify({
                V1_DURATION:VOICES[1].Duration
            }));
            break;
        case 18:
            VOICES[1].Steps = value;
            VOICES[1]._pattern = create_euclidean_pattern( VOICES[1].Steps, VOICES[1].Density, VOICES[1].Offset);
            Trace(JSON.stringify({
                V1_STEPS:VOICES[1].Steps,
                PATTERN:VOICES[1]._pattern
            }));
            break;
        case 19:
            VOICES[1].Density = value;
            VOICES[1]._pattern = create_euclidean_pattern( VOICES[1].Steps, VOICES[1].Density, VOICES[1].Offset);
            Trace(JSON.stringify({
                V1_STEPS:VOICES[1].Steps,
                PATTERN:VOICES[1]._pattern
            }));      
            break;
        case 20:
            VOICES[1].Offset = value;
            VOICES[1]._pattern = create_euclidean_pattern( VOICES[1].Steps, VOICES[1].Density, VOICES[1].Offset);
            Trace(JSON.stringify({
                V1_STEPS:VOICES[1].Steps,
                PATTERN:VOICES[1]._pattern
            }));       
            break;
        case 21:
            VOICES[1].Direction = value;
            Trace(JSON.stringify({
                V1_DIRECTION:VOICES[1].Direction
            }));
            break;
        case 22:
            VOICES[1].Probability = value;
            Trace(JSON.stringify({
                V1_PROBABILITY:VOICES[1].Probability
            }));
            break;
        case 23:
            // Voice 3 text
            break;
        case 24:
            VOICES[2].Pitch = value;
            Trace(JSON.stringify({
                V2_PITCH:VOICES[2].Pitch
            }));
            break;
        case 25:
            VOICES[2].Velocity = value;
            Trace(JSON.stringify({
                V2_VELOCITY:VOICES[2].Velocity
            }));
            break;
        case 26:
            VOICES[2].Duration = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[value]];
            Trace(JSON.stringify({
                V2_DURATION:VOICES[2].Duration
            }));
            break;
        case 27:
            VOICES[2].Steps = value;
            VOICES[2]._pattern = create_euclidean_pattern( VOICES[2].Steps, VOICES[2].Density, VOICES[2].Offset);
            Trace(JSON.stringify({
                V2_STEPS:VOICES[2].Steps,
                PATTERN:VOICES[2]._pattern
            }));
            break;
        case 28:
            VOICES[2].Density = value;
            VOICES[2]._pattern = create_euclidean_pattern( VOICES[2].Steps, VOICES[2].Density, VOICES[2].Offset);
            Trace(JSON.stringify({
                V2_STEPS:VOICES[2].Steps,
                PATTERN:VOICES[2]._pattern
            }));
             break;
        case 29:
            VOICES[2].Offset = value;
            VOICES[2]._pattern = create_euclidean_pattern( VOICES[2].Steps, VOICES[2].Density, VOICES[2].Offset);
            Trace(JSON.stringify({
                V2_STEPS:VOICES[2].Steps,
                PATTERN:VOICES[2]._pattern
            }));
             break;
        case 30:
            VOICES[2].Direction = value;
            Trace(JSON.stringify({
                V2_DIRECTION:VOICES[2].Direction
            }));
            break;
        case 31:
            VOICES[2].Probability = value;
            Trace(JSON.stringify({
                V2_PROBABILITY:VOICES[2].Probability
            }));
            break;
        case 32:
            // Voice 2 text
            break;
        case 33:
            VOICES[3].Pitch = value;
            Trace(JSON.stringify({
                V3_PITCH:VOICES[3].Pitch
            }));
            break;
        case 34:
            VOICES[3].Velocity = value;
            Trace(JSON.stringify({
                V3_VELOCITY:VOICES[3].Velocity
            }));
            break;
        case 35:
            VOICES[3].Duration = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[value]];
            Trace(JSON.stringify({
                V3_DURATION:VOICES[3].Duration
            }));
            break;
        case 36:
            VOICES[3].Steps = value;
            VOICES[3]._pattern = create_euclidean_pattern( VOICES[3].Steps, VOICES[3].Density, VOICES[3].Offset);
            Trace(JSON.stringify({
                V3_STEPS:VOICES[3].Steps,
                PATTERN:VOICES[3]._pattern
            }));
            break;
        case 37:
            VOICES[3].Density = value;
            VOICES[3]._pattern = create_euclidean_pattern( VOICES[3].Steps, VOICES[3].Density, VOICES[3].Offset);
            Trace(JSON.stringify({
                V3_STEPS:VOICES[3].Steps,
                PATTERN:VOICES[3]._pattern
            }));
            break;
        case 38:
            VOICES[3].Offset = value;
            VOICES[3]._pattern = create_euclidean_pattern( VOICES[3].Steps, VOICES[3].Density, VOICES[3].Offset);
            Trace(JSON.stringify({
                V3_STEPS:VOICES[3].Steps,
                PATTERN:VOICES[3]._pattern
            }));
            break;
        case 39:
            VOICES[3].Direction = value;
            Trace(JSON.stringify({
                V3_DIRECTION:VOICES[3].Direction
            }));
            break;
        case 40:
            VOICES[3].Probability = value;
            Trace(JSON.stringify({
                V3_PROBABILITY:VOICES[3].Probability
            }));
            break;
        default:
            Trace("ParameterChanged ERROR: " + index + "\t" + value);
            break;
    }
}

// 0
PluginParameters.push({
	name: "Sequencer",
	type: "text"
});

// 1
PluginParameters.push({
	name:"Rate", 
	type:"menu", 
	valueStrings:NOTE_LENGTH_KEYS, 
	defaultValue:6
});

// 2
PluginParameters.push({
	name:"Re-Sync", 
	type:"menu", 
	valueStrings:SEQUENCER_RESYNC_SELECTIONS, 
	defaultValue:6
});

// 3
PluginParameters.push({
	name:"Meter", 
	type:"menu", 
	valueStrings:SEQUENCER_POLY_SELECTIONS, 
	defaultValue:6
});

// 4
PluginParameters.push({
	name: "Reset Sync",
	type: "momentary",
	disableAutomation: false
});

// VOICE 1
// 5
PluginParameters.push({
	name: "Voice 1",
	type: "text"
});

// 6
PluginParameters.push({
	name:"V1 Pitch", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:PARAM_VOICE_DEFAULT_PITCH
});

// 7
PluginParameters.push({
	name:"V1 Velocity", 
	type:"lin", 
	minValue:0, 
	maxValue:127, 
	numberOfSteps:127, 
	defaultValue:PARAM_VOICE_DEFAULT_VELOCITY
});

// 8
PluginParameters.push({
	name:"V1 Duration", 
	type:"menu", 
	valueStrings:NOTE_LENGTH_KEYS, 
	defaultValue:6
});

// 9
PluginParameters.push({
	name:"V1 Steps", 
	type:"lin", 
	minValue:1, 
	maxValue:64, 
	numberOfSteps:63, 
	defaultValue:PARAM_VOICE_DEFAULT_STEPS
});

// 10
PluginParameters.push({
	name:"V1 Density", 
	type:"lin", 
	minValue:1, 
	maxValue:100, 
	numberOfSteps:99, 
	defaultValue:PARAM_VOICE_DEFAULT_DENSITY
});

// 11
PluginParameters.push({
	name:"V1 Offset", 
	type:"lin", 
	minValue:0, 
	maxValue:64, 
	numberOfSteps:64, 
	defaultValue:PARAM_VOICE_DEFAULT_OFFSET
});

// 12
PluginParameters.push({
	name:"VI Direction", 
	type:"menu", 
	valueStrings:VOICE_PLAY_SELECTIONS, 
	defaultValue:PARAM_VOICE_DEFAULT_DIRECTION
});

// 13
PluginParameters.push({
	name:"V1 Probability", 
	type:"lin", 
	minValue:0, 
	maxValue:100, 
	numberOfSteps:100, 
	defaultValue:PARAM_VOICE_DEFAULT_PROBABILITY
});

// VOICE 2
// 14
PluginParameters.push({
	name: "Voice 2",
	type: "text"
});

// 15
PluginParameters.push({
	name:"V2 Pitch", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:PARAM_VOICE_DEFAULT_PITCH
});

// 16
PluginParameters.push({
	name:"V2 Velocity", 
	type:"lin", 
	minValue:0, 
	maxValue:127, 
	numberOfSteps:127, 
	defaultValue:PARAM_VOICE_DEFAULT_VELOCITY
});

// 17
PluginParameters.push({
	name:"V2 Duration", 
	type:"menu", 
	valueStrings:NOTE_LENGTH_KEYS, 
	defaultValue:6
});

// 18
PluginParameters.push({
	name:"V2 Steps", 
	type:"lin", 
	minValue:1, 
	maxValue:64, 
	numberOfSteps:63, 
	defaultValue:PARAM_VOICE_DEFAULT_STEPS
});

// 19
PluginParameters.push({
	name:"V2 Density", 
	type:"lin", 
	minValue:1, 
	maxValue:100, 
	numberOfSteps:99, 
	defaultValue:PARAM_VOICE_DEFAULT_DENSITY
});

// 20
PluginParameters.push({
	name:"V2 Offset", 
	type:"lin", 
	minValue:0, 
	maxValue:64, 
	numberOfSteps:64, 
	defaultValue:PARAM_VOICE_DEFAULT_OFFSET
});

// 21
PluginParameters.push({
	name:"V2 Direction", 
	type:"menu", 
	valueStrings:VOICE_PLAY_SELECTIONS, 
	defaultValue:PARAM_VOICE_DEFAULT_DIRECTION
});

// 22
PluginParameters.push({
	name:"V2 Probability", 
	type:"lin", 
	minValue:0, 
	maxValue:100, 
	numberOfSteps:100, 
	defaultValue:PARAM_VOICE_DEFAULT_PROBABILITY
});

// VOICE 3
// 23
PluginParameters.push({
	name: "Voice 3",
	type: "text"
});

// 24
PluginParameters.push({
	name:"V3 Pitch", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:PARAM_VOICE_DEFAULT_PITCH
});

// 25
PluginParameters.push({
	name:"V3 Velocity", 
	type:"lin", 
	minValue:0, 
	maxValue:127, 
	numberOfSteps:127, 
	defaultValue:PARAM_VOICE_DEFAULT_VELOCITY
});

// 26
PluginParameters.push({
	name:"V3 Duration", 
	type:"menu", 
	valueStrings:NOTE_LENGTH_KEYS, 
	defaultValue:6
});

// 27
PluginParameters.push({
	name:"V3 Steps", 
	type:"lin", 
	minValue:1, 
	maxValue:64, 
	numberOfSteps:63, 
	defaultValue:PARAM_VOICE_DEFAULT_STEPS
});

// 28
PluginParameters.push({
	name:"V3 Density", 
	type:"lin", 
	minValue:1, 
	maxValue:100, 
	numberOfSteps:99, 
	defaultValue:PARAM_VOICE_DEFAULT_DENSITY
});

// 29
PluginParameters.push({
	name:"V3 Offset", 
	type:"lin", 
	minValue:0, 
	maxValue:64, 
	numberOfSteps:64, 
	defaultValue:PARAM_VOICE_DEFAULT_OFFSET
});

// 30
PluginParameters.push({
	name:"V3 Direction", 
	type:"menu", 
	valueStrings:VOICE_PLAY_SELECTIONS, 
	defaultValue:PARAM_VOICE_DEFAULT_DIRECTION
});

// 31
PluginParameters.push({
	name:"V3 Probability", 
	type:"lin", 
	minValue:0, 
	maxValue:100, 
	numberOfSteps:100, 
	defaultValue:PARAM_VOICE_DEFAULT_PROBABILITY
});

// VOICE 4
// 32
PluginParameters.push({
	name: "Voice 4",
	type: "text"
});

// 33
PluginParameters.push({
	name:"V4 Pitch", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:PARAM_VOICE_DEFAULT_PITCH
});

// 34
PluginParameters.push({
	name:"V4 Velocity", 
	type:"lin", 
	minValue:0, 
	maxValue:127, 
	numberOfSteps:127, 
	defaultValue:PARAM_VOICE_DEFAULT_VELOCITY
});

// 35
PluginParameters.push({
	name:"V4 Duration", 
	type:"menu", 
	valueStrings:NOTE_LENGTH_KEYS, 
	defaultValue:6
});

// 36
PluginParameters.push({
	name:"V4 Steps", 
	type:"lin", 
	minValue:1, 
	maxValue:64, 
	numberOfSteps:63, 
	defaultValue:PARAM_VOICE_DEFAULT_STEPS
});

// 37
PluginParameters.push({
	name:"V4 Density", 
	type:"lin", 
	minValue:1, 
	maxValue:100, 
	numberOfSteps:99, 
	defaultValue:PARAM_VOICE_DEFAULT_DENSITY
});

// 38
PluginParameters.push({
	name:"V4 Offset", 
	type:"lin", 
	minValue:0, 
	maxValue:64, 
	numberOfSteps:64, 
	defaultValue:PARAM_VOICE_DEFAULT_OFFSET
});

// 39
PluginParameters.push({
	name:"V4 Direction", 
	type:"menu", 
	valueStrings:VOICE_PLAY_SELECTIONS, 
	defaultValue:PARAM_VOICE_DEFAULT_DIRECTION
});

// 40
PluginParameters.push({
	name:"V4 Probability", 
	type:"lin", 
	minValue:0, 
	maxValue:100, 
	numberOfSteps:100, 
	defaultValue:PARAM_VOICE_DEFAULT_PROBABILITY
});


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

function play_voice( voice, beatToSchedule, timing_info ) {

    if ( PARAM_POLY == 1 && ( voice._trigger != beatToSchedule ) ) {
        return false;
    }

    // in single meter, so just to see if we play a note
    if ( rInt( 0, 100 ) <= voice.Probability && voice._pattern[ voice._current_step ] == 1 ) {
        return true;
    }

    return false;
}

function play_voices( beatToSchedule, timing_info ) {
    VOICES.forEach( function ( voice ) {
        // check for poly meter; assume play on single meter
        // if poly meter and voice trigger == beat to schedule, then play
        // check probability
        // check if the step is active

        let play = play_voice( voice, beatToSchedule, timing_info );

        if ( play ) {
            // play the note
            let note_on = new NoteOn();
            note_on.pitch = voice.Pitch;
            note_on.velocity = voice.Velocity;
            note_on.sendAtBeat( beatToSchedule );
            let note_off = new NoteOff( note_on );
            let note_off_beat = beatToSchedule + voice.Duration;
            note_off_beat = handle_beat_wraparound(note_off_beat, timing_info);
            note_off.sendAtBeat( note_off_beat );
        }
        // iterate the step
        switch ( voice.Direction ) {
            case 0:
                // Forward
                voice._current_step += 1;
                if ( voice._current_step == voice._pattern.length ) {
                    voice._current_step = 0;
                }
                break;
            case 1:
                // backward
                voice._current_step -= 1;
                if ( voice._current_step < 0 ) {
                    voice._current_step = voice._pattern.length - 1;
                }
                break;
            case 2:
                // Ping-Pong
                // check voice direction
                if ( voice._ping_pong_direction == 0 ) {
                    voice._current_step += 1;
                    if ( voice._current_step == voice._pattern.length ) {
                        voice._current_step = voice._pattern.length - 1;
                        voice._ping_pong_direction = 1;
                    }
                } else {
                    voice._current_step -= 1;
                    if ( voice._current_step < 0 ) {
                        voice._current_step = 0;
                        voice._ping_pong_direction = 0;
                    }
                }
                // iterate
                break;
            case 3:
                // Random
                voice._current_step = rInt(0, voice._pattern.length - 1);
                break;
            default:
                break;
        }
        // if poly, iterate the voice's trigger
        if ( PARAM_POLY == 1 && ( voice._trigger == beatToSchedule ) ) {
            let voice_trigger = voice._trigger + voice.Duration;
            voice_trigger = handle_beat_wraparound( voice_trigger, timing_info );
            voice._trigger = voice_trigger;
        }
    });
}

function rInt (x, y) {
    if (x > y) {
      [x, y] = [x, y];
    }
    return Math.floor(Math.random() * (y - x + 1)) + x;
}