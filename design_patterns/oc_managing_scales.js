const CHROMATIC_SCALE_STRINGS = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A	#/Bb", "B"];
const PITCH_RECORD_KEY_TYPE = "t";
const PITCH_TYPE_ROOT = "root";
const PITCH_TYPE_DIATONIC = "diatonic";
const PITCH_TYPE_NONDIATONIC = "non-diatonic";

const SCALE_TEMPLATES = {
	"Ionian" : [2, 2, 1, 2, 2, 2, 1],
	"Dorian" : [2, 1, 2, 2, 2, 1, 2],
	"Phrygian" : [1, 2, 2, 2, 1, 2, 2],
	"Lydian" : [2, 2, 2, 1, 2, 2, 1],
	"Mixolydian" : [2, 2, 1, 2, 2, 1, 2],
	"Aeolian" : [2, 1, 2, 2, 1, 2, 2],
	"Locrian" : [1, 2, 2, 1, 2, 2, 2]
}
const SCALE_KEYS = Object.keys( SCALE_TEMPLATES );

function updateNotePitchPool( root, templateIndex ) {

	var template = SCALE_TEMPLATES[ SCALE_KEYS[ templateIndex ] ];
	var lastPitch = root;
	var pitch_map = {};
	pitch_map[ lastPitch ] = { PITCH_RECORD_KEY_TYPE:PITCH_TYPE_ROOT };
	
	for ( var index = 0 ; index <= template.length - 1 ; index++ ) {
		var steps = template[ index ];
		var pitch = lastPitch + steps;
		if ( steps > 1 ) {
			while ( steps > 0 ) {
				pitch_map[ pitch ] = { PITCH_RECORD_KEY_TYPE:PITCH_TYPE_NONDIATONIC };
				steps--;
			}
		}
		pitch_map[ pitch ] = { PITCH_RECORD_KEY_TYPE:PITCH_TYPE_DIATONIC };
		lastPitch = pitch;
	}
	
	var origPitchKeys = Object.keys( pitch_map );
	var cache = {};
	for ( var index = 0 ; index < origPitchKeys.length ; index++ ) {
		var key = origPitchKeys[ index ];
		var pitch = parseInt( key );
		var pitchRecord = pitch_map[ key ]
		if ( pitch >= 12 ) {
			pitch = pitch - 12;
		}
		cache[ pitch ] = pitchRecord;
	}
	
    // cache is the completed scale within a single octave
	// do something with cache		
}
