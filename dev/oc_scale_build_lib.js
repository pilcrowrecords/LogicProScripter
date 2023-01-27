
/*
TODO:
* Update to handle scales <7 pitches; pentatonic
X add to pitch records
	X scale degree -> SCALE_DEGREE_NAMES
	X pitch name -> CHROMATIC_SCALE_STRINGS
*/

const SCALE_DEGREE_NAMES = ["I tonic", "II supertonic", "III mediant", "IV subdominant", "V dominant", "VI submediant", "VII leading tone"];
const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
var KEYBOARD_STRINGS = [];
for (let index = 0; index < 12; index++) {
	CHROMATIC_SCALE_STRINGS.forEach( function ( s ) {
		KEYBOARD_STRINGS.push(s);
	});
}

const SCALE_TEMPLATES = {
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
const PITCH_RECORD_KEY_WEIGHT = "w";
const PITCH_RECORD_KEY_TYPE = "t";
const PITCH_RECORD_KEY_DEGREE = "d";
const PITCH_RECORD_KEY_NAME = "n";


test();
function test() {
	// index as int
	// index as int
	let root = 5;
	let type = 3;
	let scale = calculate_scale_pitches( root , type );
	// console.log(SCALE_KEYS[type]);
	// console.log(CHROMATIC_SCALE_STRINGS[root]);
	scale = expand_scale_to_midi_range( scale );
	scale = collapse_scale_to_diatonic( scale );
	scale = collapse_scale_to_integers( scale );
	console.log(JSON.stringify(scale));
}

// returns the chromatic scale, noting root, diatonic, and non-diatonic pitches
function calculate_scale_pitches( root, templateIndex ) {

	// root index maps directly to MIDI pitches 0-11
	var template = SCALE_TEMPLATES[SCALE_KEYS[templateIndex]];
	var lastPitch = root;
	let diatonic_count = 0;
	// init
	let PITCH_WEIGHT_MAP = {};
	PITCH_WEIGHT_MAP[lastPitch] = createPitchRecord( NOTE_PROB_ROOT, PITCH_TYPE_ROOT, diatonic_count, lastPitch );

	// build; length - 2 because we ignore the last value
	for ( var index = 0 ; index <= template.length - 2 ; index++ ) {
		var steps = template[index];
		var pitch = lastPitch + steps;
		// non-diatonic pitches
		if ( steps > 1 ) {
			let non_diatonic_pitch = pitch;
			while ( steps > 0 ) {
				non_diatonic_pitch--;
				if ( !PITCH_WEIGHT_MAP[non_diatonic_pitch] ) {
					PITCH_WEIGHT_MAP[non_diatonic_pitch] = createPitchRecord( NOTE_PROB_DEFAULT, PITCH_TYPE_NONDIATONIC, -1, non_diatonic_pitch );
				}
				steps--;
			}
		}
		diatonic_count++;
		PITCH_WEIGHT_MAP[pitch] = createPitchRecord( NOTE_PROB_DIATONIC, PITCH_TYPE_DIATONIC, diatonic_count, pitch );
		lastPitch = pitch;
	}
		
	// normalize to octave C-2 (MIDI pitches 0-11)
    var cache = {};
    var keys = Object.keys(PITCH_WEIGHT_MAP);
    keys.forEach( function ( key ) {
		var pitch = parseInt(key);
        var pitchRecord = PITCH_WEIGHT_MAP[key]
		if ( pitch >= 12 ) { 
			pitch = pitch - 12;
		}
			cache[pitch] = pitchRecord;
    });

	return cache;
		
}

function createPitchRecord ( weight, type, degree, pitch ) {
	var cache = {};
	cache[PITCH_RECORD_KEY_WEIGHT] = weight;
	cache[PITCH_RECORD_KEY_TYPE] = type;
	cache[PITCH_RECORD_KEY_DEGREE] = SCALE_DEGREE_NAMES[degree];
	cache[PITCH_RECORD_KEY_NAME] = KEYBOARD_STRINGS[pitch];
	return cache;
}

// takes a single C-2 scale and returns a scale object containing all octaves
// creates an object with length 144; does not limit to 0-127
function expand_scale_to_midi_range( scale ) {
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
function collapse_scale_to_diatonic( scale ) {
	let cache = {};
	let scale_keys = Object.keys(scale);
	scale_keys.forEach( function ( key ) {
		let pitch_record = scale[key];
		if ( pitch_record[ PITCH_RECORD_KEY_TYPE ] == PITCH_TYPE_DIATONIC ) {
			cache[key] = JSON.parse(JSON.stringify(pitch_record));
		}
	});
	return cache;
}

// takes a scale object of any length and type and returns an integer array
function collapse_scale_to_integers( scale ) {
	let cache = [];
	let scale_keys = Object.keys(scale);
	scale_keys.forEach( function ( key ) {
		cache.push(parseInt(key));
	});
	return cache;
}