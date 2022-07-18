/******************************************************************************
Name: Random Melody Generator 
Author(s): Philip Regan
Purpose: 
* Creates random melodies based on weighted selections of pitches, note and 
rest lengths
* Contains examples of the following:
    * Modeling scales
    * Random selection of weighted values (useful for music generation without 
	using pre-existing notes in the track)
    * Tracking playhead and beats locations across process blocks and loops
    * Handling recursive changes across controls so that settings don't change 
	endlessly

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

/* GLOBAL PARAMS */

const PROBABILITY_SLIDER_MIN = 0;
const PROBABILITY_SLIDER_MAX = 100;
const PROBABILITY_SLIDER_DEF = PROBABILITY_SLIDER_MIN;
const PROBABILITY_SLIDER_STEPS = PROBABILITY_SLIDER_MAX;
const PROBABILITY_MIN = 1;
const PROBABILITY_MAX = 100; 

/* pitch params */

const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
// stores and identifies root and diatonic pitches with their weights
var PITCH_WEIGHT_MAP = {};
const PITCH_RECORD_KEY_WEIGHT = "w";
const PITCH_RECORD_KEY_TYPE = "t";
// stores the scale as calculated
var SCALE_MAP = {}
const PITCH_CONTROL_OFFSET = 4;
// the store from which pitches are selected
var NOTE_PITCH_POOL = [];

const OCTAVE_STRINGS = ["8", "7", "6", "5"," 4", "3 (Middle C)", "2", "1", "0", "-1", "-2"];
const OCTAVE_CONTROL_NAME = "Octave";
var TARGET_OCTAVE = 5;

/* scales */

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
const NONDIATONIC_PITCH_VALUE = -1;
const NOTE_PROB_ROOT = 75;
const NOTE_PROB_DIATONIC = 25;
const NOTE_PROB_DEFAULT = 0;
const NOTE_PROB_NONDIATONIC = 10;
const NOTE_PROB_CHROMATIC = 50;
const PITCH_TYPE_ROOT = 'root';
const PITCH_TYPE_DIATONIC = 'diatonic';
const PITCH_TYPE_NONDIATONIC = 'non-diatonic';

/* length params */

const NOTE_LENGTH_MAX = 24.0;
const NOTE_DIVISION_MIN = 32.0;
const NOTE_INCREMENT_MIN = 0.125;
 
const NOTE_LENGTHS_LIB = {
    "1/32" : (NOTE_LENGTH_MAX / 32.0), 
    "1/32d" : (NOTE_LENGTH_MAX / 32.0) + (NOTE_LENGTH_MAX / 32.0) / 2.0, 
    "1/32t" : (NOTE_LENGTH_MAX / 32.0) / 3.0, 
    "1/16" : (NOTE_LENGTH_MAX / 16.0) , 
    "1/16d" : (NOTE_LENGTH_MAX / 16.0) + (NOTE_LENGTH_MAX / 16.0) / 2.0, 
    "1/16t" : (NOTE_LENGTH_MAX / 16.0) / 3.0, 
    "1/8" : (NOTE_LENGTH_MAX / 8.0), 
    "1/8d" : (NOTE_LENGTH_MAX / 8.0) + (NOTE_LENGTH_MAX / 8.0) / 2.0,   
    "1/8t" : (NOTE_LENGTH_MAX / 8.0) / 3.0, 
    "1/4" : (NOTE_LENGTH_MAX / 4.0), 
    "1/4d" : (NOTE_LENGTH_MAX / 4.0) + (NOTE_LENGTH_MAX / 4.0) / 2.0, 
    "1/4t" : (NOTE_LENGTH_MAX / 4.0) / 3.0, 
    "1/2" : (NOTE_LENGTH_MAX / 2.0), 
    "1/2d" : (NOTE_LENGTH_MAX / 2.0) + (NOTE_LENGTH_MAX / 2.0) / 2.0, 
    "1/2t" : (NOTE_LENGTH_MAX / 2.0) / 3.0 , 
    "1" : (NOTE_LENGTH_MAX), 
    "1t" : (NOTE_LENGTH_MAX / 3.0)
};

var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

// the keys get sorted into an incorrect order, so this fixes them
var whole_note = NOTE_LENGTH_KEYS.shift();
var whole_triplet = NOTE_LENGTH_KEYS.pop();
NOTE_LENGTH_KEYS.push( whole_note );
NOTE_LENGTH_KEYS.push( whole_triplet );

// Manage note length selections and pool
var NOTE_LENGTH_SELECTIONS = [];
var lengths = Object.keys(NOTE_LENGTHS_LIB);
lengths.forEach( function ( l ) {
    NOTE_LENGTH_SELECTIONS.push(NOTE_PROB_CHROMATIC);
});
const LENGTH_CONTROL_OFFSET = 17;
// weighted selection store,  built from values in store
var NOTE_LENGTH_POOL = [];

// Manage rest length selections and pool
var REST_LENGTH_SELECTIONS = [];
var lengths = Object.keys(NOTE_LENGTHS_LIB);
lengths.forEach( function ( l ) {
    REST_LENGTH_SELECTIONS.push(NOTE_PROB_CHROMATIC);
});
const REST_CONTROL_OFFSET = 35;
// weighted selection store,  built from values in store
var REST_LENGTH_POOL = [];

// index 0 = length count
// index 1 = rest count
// to select: total both numbers, select random within total, and see where it lands in the array
var NOTE_REST_RATIO_POOL = [];
const EVENT_IS_REST = "r";
const EVENT_IS_NOTE = "n";

const POOL_TOTAL_KEY = "total";

// prevents endless loop of control and map changes
var UPDATING_CONTROLS = false;

// the trigger variable is where the next note (or rest) is to be played
// trigger is global to track it across process blocks
// the cursor is a simulated location of the transport/playhead in the track
// cursor is handled locally because only the current process block matters while playing
const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001; // smallest note length = 0.125

// currently set up to only track one played note at a time.
var ACTIVE_NOTES = [];

var OUTPUT_NOTES_TO_CONSOLE = false;
var VERBOSE = false;

var LAST_TIMING_INFO = {};

/*
SCRIPTER FUNCTIONS
*/

function HandleMIDI( event ) {
	event.send();
}

function ProcessMIDI() {
	var timing_info = GetTimingInfo();

	// when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
	if ( !timing_info.playing ){
		ACTIVE_NOTES.forEach( function ( note_on ) {
			var note_off = new NoteOff( note_on );
			note_off.send();
		});
		cursor = timing_info.blockStartBeat;
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

            // get some basic note information
			var event_pitch = ( TARGET_OCTAVE * 12 ) + parseInt(getRandomValueFromWeightPool( NOTE_PITCH_POOL ));
            note_length_index = getRandomValueFromWeightPool( NOTE_LENGTH_POOL );
            event_length = getLengthByIndexFromEventLengthLib( note_length_index );

            // is this going to be a played note or a rest?
			var note_rest_result = getRandomValueFromWeightPool( NOTE_REST_RATIO_POOL );

			if ( note_rest_result == EVENT_IS_REST ) { 

                // if it's a rest, then simpply push the trigger out to the next playable beat
				var new_trigger_beat = TRIGGER + event_length;
                // adjust for the cycle buffers
				if ( timing_info.cycling && new_trigger_beat >= timing_info.rightCycleBeat ) {
					while ( new_trigger_beat >= timing_info.rightCycleBeat ) {
						new_trigger_beat -= (timing_info.rightCycleBeat - timing_info.leftCycleBeat);
					}
				}

				TRIGGER = new_trigger_beat;

				if ( OUTPUT_NOTES_TO_CONSOLE ) {
					Trace( "Rest    " + "---" + "    " + event_length );
				}
			
			} else {
                // if it's a played note, build and send the NoteOn and NoteOff events
				var note_on = new NoteOn();
				note_on.pitch = event_pitch;
				note_on.velocity = 100;

				note_on.sendAtBeat( TRIGGER ); 
				ACTIVE_NOTES.push( note_on );

                var note_off = new NoteOff( note_on );
				var note_off_beat = TRIGGER + event_length;
                
                // adjust for the cycle buffers
				if ( timing_info.cycling && note_off_beat >= timing_info.rightCycleBeat ) {
					while ( note_off_beat >= timing_info.rightCycleBeat ) {
						note_off_beat -= cycleBeats;
						// ERROR: note_off_beat = null
						// ATTEMPT: chaning cycleBeats to actual calc crams events at the end of the cycle
					}
				}

				note_off.sendAtBeat( note_off_beat );

				TRIGGER = note_off_beat;

				if ( OUTPUT_NOTES_TO_CONSOLE ) {
					Trace( "Note    " + event_pitch + "    " + event_length );
				}

		}

		}

		// advance the cursor and trigger to the next beat
		cursor += CURSOR_INCREMENT;
		if ( TRIGGER < cursor ) {
			TRIGGER = cursor;
		}
	}
	
	LAST_TIMING_INFO = timing_info;

}

function ParameterChanged( param, value ) {
	if ( UPDATING_CONTROLS == true ) {
		return;
	}
	switch( param ) {
		case 0:
			// pitches text
			break;
		case 1:
			TARGET_OCTAVE = value;
			break;
		case 2:
			// root pulldown
			updateNotePitchPool( GetParameter("Root") , GetParameter("Scale") );
			break;
		case 3:
			// scale pulldown
			if ( value == 0 ) {
				updateNotePitchPoolToChromatic();
			} else {			
				updateNotePitchPool( GetParameter("Root") , GetParameter("Scale") );				
			}
			break;
		case 4:
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
			updatePitchWeight( param , value );
			break;
		case 16:
			// lengths text; do nothing
			break;
		case 17:
		case 18:
		case 19:
		case 20:
		case 21:
		case 22:
		case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 28:
        case 29:
        case 30:
        case 31:
        case 32:
        case 33:
            updateNoteLengthPool( param , value );
			break;
        case 34:
            // rests text; do nothing
            break;
        case 35:
        case 36:
        case 37:
        case 38:
        case 39:
        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
        case 48:
        case 49:
        case 50:
        case 51:
			updateRestLengthPool( param , value );
            break;
		case 52:
			OUTPUT_NOTES_TO_CONSOLE = value;
			Trace( "Output notes to console is " + ( value == 1 ? "true" : "false" ) );
			break;
		case 53:
			VERBOSE = value;
			Trace( "Verbosity is " + ( value == 1 ? "true" : "false" ) );
			break;
		default:
			Trace("ERROR: ParameterChanged("+ param + "," + value + ")");
	}
}

/*
CUSTOM FUNCTIONS
*/

/* TRANSPOSITION */

// converts the half- and whole-step jumps into the transposition and pitch shift maps
function updateNotePitchPool( root, templateIndex ) {
	
	/*
		* build the map as normal for transposition
		* translate map into weights
			* build a weight map object
			* for each value in the pitch map
				* weight map <array>
					* if pitch == root then push root weight 
					* if pitch != last pitch then push diatonic weight
					* if pitch == last pitch then push non-diatonic weight
			* update controls with weight map
		* build selection pool based on weights
	*/
	
	// root index maps directly to MIDI pitches 0-11
	var template = SCALE_TEMPLATES[SCALE_KEYS[templateIndex]];
	var lastPitch = root;
	// init
	PITCH_WEIGHT_MAP = {};
	PITCH_WEIGHT_MAP[lastPitch] = createPitchRecord( NOTE_PROB_ROOT, PITCH_TYPE_ROOT );
	// build; length - 2 because we ignore the last value
	for ( var index = 0 ; index <= template.length - 2 ; index++ ) {
		var steps = template[index];
		var pitch = lastPitch + steps;
		// non-diatonic pitches
		if ( steps > 1 ) {
			while ( steps > 0 ) {
				PITCH_WEIGHT_MAP[pitch] = createPitchRecord( NOTE_PROB_DEFAULT, PITCH_TYPE_NONDIATONIC );
				steps--;
			}
		}
		PITCH_WEIGHT_MAP[pitch] = createPitchRecord( NOTE_PROB_DIATONIC, PITCH_TYPE_DIATONIC );
		lastPitch = pitch;
	}
	var origPitchKeys = Object.keys( PITCH_WEIGHT_MAP );
		
	// normalize to octave C-2 (MIDI pitches 0-11)
    var cache = {};
	for ( var index = 0 ; index < origPitchKeys.length ; index++ ) {
        var key = origPitchKeys[index];
		var pitch = parseInt(key);
        var pitchRecord = PITCH_WEIGHT_MAP[key]
		if ( pitch >= 12 ) {
			pitch = pitch - 12;
		}
			cache[pitch] = pitchRecord;
	}
	PITCH_WEIGHT_MAP = cache;
	
	NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );
	
	updateControlsToScaleWeights( PITCH_WEIGHT_MAP );
		
}

// special function for chromatic because it doesn't need special calculations
function updateNotePitchPoolToChromatic() {

	for ( index = 0 ; index < 12 ; index++ ) {
		var pitchRecord = createPitchRecord( NOTE_PROB_CHROMATIC, PITCH_TYPE_DIATONIC );
		PITCH_WEIGHT_MAP[index] = pitchRecord;
	}
	NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );
	updateControlsToChromaticWeights();
}

// update to apply chromatic weights
function updateControlsToChromaticWeights() {
	UPDATING_CONTROLS = true;
	var controlOffset = 4;
	
	// reset controls to chromatic value
	for ( var index = controlOffset ; index < 12 + controlOffset ; index++ ) {
		SetParameter(index, NOTE_PROB_CHROMATIC);
	}
	UPDATING_CONTROLS = false;
}

function updateControlsToScaleWeights( weights ) {
	UPDATING_CONTROLS = true;
	
	// reset controls to 0
	for ( var index = PITCH_CONTROL_OFFSET ; index < 12 + PITCH_CONTROL_OFFSET ; index++ ) {
		SetParameter(index, NOTE_PROB_DEFAULT);
	}
	
	// set controls to the weights
	var keys = Object.keys(weights);
	for ( var index = 0 ; index < keys.length ; index++ ) {
		var key = keys[index];
		var k = parseInt(key);
		var pitchRecord = weights[key];
		var weight = pitchRecord[PITCH_RECORD_KEY_WEIGHT];
		var controlIndex = k + PITCH_CONTROL_OFFSET;
		SetParameter(controlIndex, weight);
	}

	UPDATING_CONTROLS = false;
}

// transposes a pitch to the target octave
function transposePitchToTargetOctave( pitch, targetOctave ) {
	var transposedPitch = pitch + ( targetOctave * 12 );
	return transposedPitch;
}

// update weights and pool based on change in a control
function updatePitchWeight( param, value ) {
	
	// adjust for control index
	var pitch = param - PITCH_CONTROL_OFFSET;
	var pitchRecord = PITCH_WEIGHT_MAP[pitch];
	if ( pitchRecord == undefined ) {
		pitchRecord = createPitchRecord( NOTE_PROB_NONDIATONIC , PITCH_TYPE_NONDIATONIC );
	}
	pitchRecord[PITCH_RECORD_KEY_WEIGHT] = value;
	PITCH_WEIGHT_MAP[pitch] = pitchRecord;

	// calculate the updated weight pool
	NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );

}

/* NOTE and REST LENGTH */

function updateNoteLengthPool( param , value ) {

	var index = param - LENGTH_CONTROL_OFFSET;
	NOTE_LENGTH_SELECTIONS[index] = value;
	NOTE_LENGTH_POOL = buildEventLengthPoolWithSelections( NOTE_LENGTH_SELECTIONS );
	updateNoteRestRatioPool();

}

function updateRestLengthPool( param , value ) {

	var index = param - REST_CONTROL_OFFSET;
	REST_LENGTH_SELECTIONS[index] = value;
	REST_LENGTH_POOL = buildEventLengthPoolWithSelections( REST_LENGTH_SELECTIONS );
	updateNoteRestRatioPool();

}

function updateNoteRestRatioPool() {

	NOTE_REST_RATIO_POOL = {};
    var rest_total = REST_LENGTH_POOL[POOL_TOTAL_KEY];
    var note_total = NOTE_LENGTH_POOL[POOL_TOTAL_KEY];
    NOTE_REST_RATIO_POOL[rest_total] = EVENT_IS_REST;
    NOTE_REST_RATIO_POOL[rest_total + note_total] = EVENT_IS_NOTE;
    NOTE_REST_RATIO_POOL[POOL_TOTAL_KEY] = rest_total + note_total;

}

/* HELPER FUNCTIONS */

function buildNotePitchWeightPoolWithPitchWeightMap( map ) {

    /*
    PITCH_WEIGHT_MAP
        pitch { 0-11 }
            weight/prob { % }
            type { String }

    PITCH_RECORD_KEY_WEIGHT
    */

    var pool = {};
    var total = 0;

    var pitches = Object.keys( map );
    pitches.forEach( function ( pitch ) {
        const record = map[pitch];
        const weight = record[PITCH_RECORD_KEY_WEIGHT];
        var value = parseInt( weight );
        if ( value > 0 ) {
            total += value; 
            pool[total] = pitch;
        }
    });

    /*
        {
            <int>total% : selection index
            <str>total  : total
        }

    */
    pool[POOL_TOTAL_KEY] = total;
    return pool;

}

function buildEventLengthPoolWithSelections( selections ) {

    var pool = {};
    var total = 0;

    for ( let index = 0; index < selections.length; index++ ) {
        const value = selections[index];
        if ( value > 0 ) {
            total += value;
            pool[total] = index;
        }
    }

    /*
        {
            <int>total% : pitch
            <str>total  : total
        }
    */

    pool[POOL_TOTAL_KEY] = total;
    return pool;

}

function getRandomValueFromWeightPool( weightPool ) {

    /*
    NOTE_LENGTH_POOL
    REST_LENGTH_POOL{"50":10,"total":50}
    NOTE_REST_RATIO_POOL{"50":"r","100":,"total":100}
    NOTE_PITCH_POOL{"75":"0","100":"2","125":"4","150":"5","175":"7","200":"9","225":"11","total":225}
    */

    var total = weightPool[POOL_TOTAL_KEY];

    var r = rInt( 1, total );
    var weights = Object.keys(weightPool);

    if ( weights.length == 2 ) {
        return weightPool[weights[0]];
    }

    weights.pop();
    var last_weight = total;
    for ( let index = weights.length - 1 ; index > -1 ; index-- ) {
        const weight = parseInt(weights[index]);
        if ( r > weight ) {
            return weightPool[last_weight];
        }
        last_weight = weight;
    }

    return weightPool[weights[0]];
    
}

function getLengthByIndexFromEventLengthLib( index ) {
    const keys = Object.keys( NOTE_LENGTHS_LIB );
    const key = keys[index];
    return NOTE_LENGTHS_LIB[key]; 
}

function quantizeToMinimumDivision( pos ) {
    return Math.ceil( timing_info.blockStartBeat * NOTE_DIVISION_MIN ) / NOTE_DIVISION_MIN;
}

function createPitchRecord ( weight, type ) {
	var cache = {};
	cache[PITCH_RECORD_KEY_WEIGHT] = weight;
	cache[PITCH_RECORD_KEY_TYPE] = type;
	return cache;
}

function rInt( min, max ) {
	if (min == max ) {return min;}
    return Math.floor(min + Math.random()*(max + 1 - min));
}

function getRandomValueFromArray( arr ) {
	var r = rInt( 0 , arr.length );
	return arr[r];
}

/*
PARAMETER CONTROL MANAGEMENT

-> Remember to update ParameterChanged() 
*/

// index 0
PluginParameters.push({
    	name:"Pitches", 
    	type:"text"
    	});
    	
// index 1
PluginParameters.push({
	name:"Target Octave", 
	type:"menu", 
	valueStrings:OCTAVE_STRINGS, 
	defaultValue:5
	});

// index 2
PluginParameters.push({
	name:"Root", 
	type:"menu", 
	valueStrings: CHROMATIC_SCALE_STRINGS,
	defaultValue:0
});

// index 3
PluginParameters.push({
	name:"Scale", 
	type:"menu", 
	valueStrings: SCALE_KEYS, 
	defaultValue:1
});

// index 4-15
var index = 0;
CHROMATIC_SCALE_STRINGS.forEach(element => {
    PluginParameters.push({
    	name:CHROMATIC_SCALE_STRINGS[index], 
    	type:"lin", 
    	unit:"\%", 
    	minValue:PROBABILITY_SLIDER_MIN, 
    	maxValue:PROBABILITY_SLIDER_MAX, 
    	numberOfSteps:PROBABILITY_SLIDER_MAX, 
    	defaultValue:PROBABILITY_SLIDER_MIN}
    );
    index++;
});

// index 16
PluginParameters.push({
    	name:"Note Lengths", 
    	type:"text"
    	});

index = 0;

// index 17-33
NOTE_LENGTH_KEYS.forEach( element => {
    var default_length = 0;
    if ( element == "1/4") {
        default_length = NOTE_PROB_CHROMATIC;
    }

	PluginParameters.push({
    	name:"Note " + element, 
    	type:"lin", 
    	// unit:"\%", 
    	minValue:PROBABILITY_SLIDER_MIN, 
    	maxValue:PROBABILITY_SLIDER_MAX, 
    	numberOfSteps:PROBABILITY_SLIDER_MAX, 
    	defaultValue:default_length}
    );
    index++;
});

// index 34
PluginParameters.push({
    name:"Rest Lengths", 
    type:"text" 
    });

// index 35-51
index = 0;
NOTE_LENGTH_KEYS.forEach( element => {

    var default_length = 0;

	PluginParameters.push({
		name:"Rest " + element, 
		type:"lin", 
		// unit:"\%", 
		minValue:PROBABILITY_SLIDER_MIN, 
		maxValue:PROBABILITY_SLIDER_MAX, 
		numberOfSteps:PROBABILITY_SLIDER_MAX, 
		defaultValue:default_length}
	);
	index++;
});

PluginParameters.push({
	name:"Output Notes to Console", 
	type:"checkbox", 
	defaultValue:0
});

PluginParameters.push({
	name:"Verbose for Troubleshooting", 
	type:"checkbox", 
	defaultValue:0
});
