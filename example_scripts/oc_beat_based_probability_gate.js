/******************************************************************************
Name: Beat Based Probability Gate
Author(s): Philip Regan
Purpose: 
* Changes probability of an event being sent based on the beat, like whether 
the note should play on a strong or weak beat.
* Useful for finding new rhythms or phrases for any MIDI track

Instructions:
* The beat probabilities are represented in the 16 probability sliders. The 
other controls are used to control characteristics of the probability
* Probabilities are contained in 16-element arrays. Several options are 
provided to show how presets can be managed as well as creative possibilities
* The frequency of probability changes can be changed with the "Division" 
control
* The number of beats to be used can be changed with the Start and Length 
controls.
    * Setting this to a small odd number leads to some interesting possibilities
* Increasing or decreasing the overall probability can be changed with the 
"Skew" control.

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

const TIME_SIG_DENOM_DIVISION = 16; // beatToSchedule results in 1/64 notes

const PROBS_LIB = {
    "Original"		:	[96, 90, 84, 78, 72, 66, 60, 54, 48, 42, 36, 30, 24, 18, 12, 6],
    "Reverse"		:	[6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96],
    "Straight"		:	[96, 48, 72, 24, 84, 36, 60, 12, 90, 42, 66, 30, 78, 18, 54, 6],
    "Lead In on 4"	:	[96, 24, 48, 72, 84, 12, 36, 60, 90, 30, 42, 66, 78, 6, 18, 54],
    "Synco1"		:	[48, 96, 24, 72, 36, 84, 12, 60, 42, 90, 30, 66, 18, 78, 6, 54]
}
const PROBS_LIB_KEYS = Object.keys( PROBS_LIB );
// track where we are in the probability  
var PROBS_INDEX = 0;
var CURRENT_PROB = 100;

const NOTE_LENGTHS_LIB = {
	"1/32"	:	0.125,
	"1/16"	:	0.25,
	"1/8" 	:	0.5,
	"1/4" 	:	1.0,
	"1/2" 	:	2.0,
	"1"		:   4.0,
};
const NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

/* event tracking params */

const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001;

var ACTIVE_NOTES = {};

// user settings
var PROBS_ARR = PROBS_LIB["Original"];
var PATTERN_START = 1;
var PATTERN_LENGTH = 15;
var PROB_SKEW = 0;
var DIVISION = NOTE_LENGTHS_LIB["1/16"];

// controls
const BEAT_PARAM_OFFSET = 5;
const BEAT_PARAM_LENGTH = 16;
var UPDATING_CONTROLS = false;

function HandleMIDI( event ) {
    if ( PATTERN_LENGTH == 0 ) {
        event.send();
        return;
    }

    const pitch = event.pitch;
	if ( event instanceof NoteOn ) {

        // do we play the note?
        let r = rInt( 1, 100 );
        let gate = CURRENT_PROB + PROB_SKEW;
        if ( r <= gate ) {
            var notes = ACTIVE_NOTES[ pitch ];
            if ( !notes ) {
                notes = [];
            }
            notes.push( event );
            ACTIVE_NOTES[ pitch ] = notes;

            event.send();
        }
        
	} else if ( event instanceof NoteOff ) {
        // handle all note off regardless of note on
		var notes = ACTIVE_NOTES[ pitch ];
		if ( notes ) {
			var note = notes.pop();
        	ACTIVE_NOTES[ pitch ] = notes;
		}
        event.send();
	} else {
        // pass through
        event.send();
    }

}

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
            // TRIGGER = handle_beat_wraparound( TRIGGER, timing_info );

            // if ( beatToSchedule == TRIGGER ) {
                // update the probability for this beat
                // used in HandleMIDI
                PROBS_INDEX = ( beatToSchedule * TIME_SIG_DENOM_DIVISION ) % PROBS_ARR.length;
                Trace(JSON.stringify({beatToSchedule:beatToSchedule,PROBS_INDEX:PROBS_INDEX}));
                CURRENT_PROB = PROBS_ARR[ PROBS_INDEX ];
                 // advance the trigger
                //  TRIGGER += DIVISION;
		    // }

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

function ParameterChanged( param , value ) {
    if ( UPDATING_CONTROLS == true ) {
		return;
	}
    switch ( param ) {
        case 0:
            // pattern
            update_to_preset( value );
            break;
        case 1:
            // start
            PATTERN_START = value + BEAT_PARAM_OFFSET;
            break;
        case 2:
            // length
            PATTERN_LENGTH = value - 1;
            break;
        case 3:
            // skew
            PROB_SKEW = value;
            break;
        case 4:
            // division
            DIVISION = NOTE_LENGTHS_LIB[ NOTE_LENGTH_KEYS[ value ] ];
            break;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 21:
            update_probs_arr( param, value );
        default:
            Trace("Error: ParameterChanged: " + param + " , " + value);
            break;
    }
}

function update_to_preset( value ) {
    UPDATING_CONTROLS = true;

    PROBS_ARR = PROBS_LIB[ PROBS_LIB_KEYS[ value ]];

    for (let index = 0; index < BEAT_PARAM_LENGTH; index++) {
        SetParameter( index + BEAT_PARAM_OFFSET , PROBS_ARR[index] );
    }

    UPDATING_CONTROLS = false;
}

function update_probs_arr( param, value ) {
    UPDATING_CONTROLS = true;

    PROBS_ARR[ param - BEAT_PARAM_OFFSET ] = value;

    for (let index = 0; index < BEAT_PARAM_LENGTH; index++) {
        SetParameter( index + BEAT_PARAM_OFFSET , PROBS_ARR[index] );
    }

    UPDATING_CONTROLS = false;
}

function rInt( min, max ) {
	if (min == max ) {return min;}
    return Math.floor(min + Math.random()*(max + 1 - min));
}

// 0
PluginParameters.push({
    name:"Pattern", 
    type:"menu", 
    valueStrings:PROBS_LIB_KEYS, 
    defaultValue:2
});

// 1
PluginParameters.push({
    name:"Start", 
    type:"lin", 
    minValue:1,
    maxValue:16,
    numberOfSteps:15,
    defaultValue:1
});

// 2
PluginParameters.push({
    name:"Length", 
    type:"lin", 
    minValue:0,
    maxValue:16,
    numberOfSteps:16,
    defaultValue:16
});

// 3
PluginParameters.push({
    name:"Skew", 
    type:"lin", 
    minValue:-100,
    maxValue:100,
    numberOfSteps:200,
    defaultValue:0
});

// 4
PluginParameters.push({
    name:"Division", 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:4
});

// 5 - 21
for (let index = 0; index < 16 ; index++) {
    PluginParameters.push({
        name: "Beat " + (index + 1),
        type:"lin",
        minValue:0,
        maxValue:100,
        numberOfSteps:100,
        defaultValue:50
    });
}