
/*
TODO:
* Update to handle scales <7 pitches; pentatonic
X add to pitch records
	X scale degree -> SCALE_DEGREE_NAMES
	X pitch name -> CHROMATIC_SCALE_STRINGS
*/
var scales = [];

test();
function test() {

	let music_lib = new MUSIC_LIB();
	music_lib.initialize();

	let root = 0;
	
	for (let type = 0; type < 7; type++) {
		let scale = music_lib.calculate_scale_pitches( root , type );
		scale = music_lib.collapse_scale_to_diatonic( scale );
		scale = music_lib.collapse_scale_to_spelling( scale );
		let root_spelling = music_lib.CHROMATIC_SCALE_STRINGS[ root ];
		let type_label = music_lib.SCALE_KEYS[ type ];
		scales.push( JSON.stringify( [ root_spelling, type_label, scale ] ) );
	}
	console.log(scales);
}

function MUSIC_LIB () {

	/* public variables */

	// index of chromatic scale strings
	this.scale_root = 0;
	this.scale_type = 0;

	/* public constants */

	// index aligns to lowest MIDI octave
	this.CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

	/* private constants */

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
	this.SCALE_KEYS = [];
	
	this._PITCH_TYPE_ROOT = 'rt';
	this._PITCH_TYPE_DIATONIC = 'dt';
	this._PITCH_TYPE_NONDIATONIC = 'nd';
	this._PITCH_RECORD_KEY_TYPE = "t";
	this._PITCH_RECORD_KEY_DEGREE = "d";
	this._PITCH_RECORD_KEY_NAME = "n";

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
			let record = scale[key];
			let spelling = record[ 'n' ];
			cache.push(spelling);
		});
		return cache;
	}
}