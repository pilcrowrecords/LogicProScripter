/******************************************************************************

Name: Transposer JS
Author(s): Philip Regan
Purpose: Recreation of the Transposer MIDI Effects Plug-In
Information:
* Demonstrates
	* How to modify events in real time, particularly how to handle potential differences in NoteOn and NoteOff
	* How to model scales
		* parameter control indexes for pitches aligns with MIDI pitch values 0-11

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
var NOTE_TRACKING = {};

// prevents endless loop of control and map changes
var UPDATING_CONTROLS = false;

/*
SCRIPTER FUNCTIONS
*/

function HandleMIDI(event) {

	if ( event instanceof NoteOn ) {
		var originalPitch = event.pitch;
	
		// root and scale transposition
		var basePitch = BASE_PITCHES[ event.pitch ];
		event.pitch += PITCH_SHIFT_MAP[ basePitch ];
		
		// semitone transposition
		var semitones = GetParameter("Semitones");
		event.pitch += semitones;
		
		NOTE_TRACKING[originalPitch] = event.pitch;
		
	}

	if ( event instanceof NoteOff ) {
		if ( event.pitch in NOTE_TRACKING ) {
			var temp = event.pitch;
			event.pitch = NOTE_TRACKING[event.pitch];							
			delete NOTE_TRACKING[temp];
		}
	}

	event.send();
}

function ProcessMIDI() {
	var timingInfo = GetTimingInfo();
}

function ParameterChanged( param, value ) {
	if ( UPDATING_CONTROLS == true ) {
		return;
	}
	//Trace("ParameterChanged( " + param + " , " + value + " )");
	switch( param ) {
		case 0:
			// root
			updateTranspositionMap(GetParameter("Root"), GetParameter("Scale"));
			break;
		case 1:
			// scale
			if ( value == 0 ) {
				updateToChromaticMap();
			} else {			
				updateTranspositionMap(GetParameter("Root"), GetParameter("Scale"));				
			}
			break;
		case 2:
		case 3:
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
			updatePitchShiftMap( param , value );
			break;
		case 14:
			// semitones, do nothing
			break;
		default:
			Trace("ERROR: ParameterChanged( " + param + " , " + value + " )");
	}
	applyMapToControls( TRANSPOSE_MAP );
	//Trace(TRANSPOSE_MAP);
	//Trace(PITCH_SHIFT_MAP);
}

/*
CUSTOM FUNCTIONS
*/

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

PluginParameters.push({
	name:"Root", 
	type:"menu", 
	valueStrings: CHROMATIC_SCALE_STRINGS,
	defaultValue:0
});

PluginParameters.push({
	name:"Scale", 
	type:"menu", 
	valueStrings: SCALE_KEYS, 
	defaultValue:0
});

var index = 0;
CHROMATIC_SCALE_STRINGS.forEach(element => {
    PluginParameters.push({
    		name:CHROMATIC_SCALE_STRINGS[index], 
    		type:"menu", 
    		valueStrings:CHROMATIC_SCALE_STRINGS, 
    		defaultValue:index}
    );
    index++;
});

PluginParameters.push({
    		name:"Semitones", 
    		type:"lin", 
    		minValue:-24, 
    		maxValue:24, 
    		numberOfSteps:48, 
    		defaultValue:0
    	});