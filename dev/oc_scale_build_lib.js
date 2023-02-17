
/*
TODO:
X Update chord calculations to work in the MUSIC_LIB object
X Update chord calculations to accept the scale object with metadata.
X Update MUSIC_LIB to not need external values (GetParameter) to calculate
* Update chord options to include suspended chords 
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
	let type = 0;
	
	// create a complete scale object with metadata
	let scale = music_lib.calculate_scale_pitches( root , type );
	// build a chord with that scale
	let chord = music_lib.calculate_chord_pitches( 0, scale );
	let parameter_index = 0; // Parameter Control Number
	let options_value = 0 // "Triad (1, 3, 5)"
	music_lib.update_chord_options( parameter_index, options_value );
	chord = music_lib.get_voices_from_chord( options, chord );
	console.log(chord);
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
	this.SCALE_KEYS = [];
	
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
			let record = scale[key];
			let spelling = record[ 'n' ];
			cache.push(spelling);
		});
		return cache;
	}

	/* CHORD CALCULATIONS */

	// root = integer
	// scale = <integer>array
	this.calculate_chord_pitches = function ( root, scale ) {
		// update the scale object to only include diatonic notes
		let chord_scale = this.collapse_scale_to_diatonic( scale );
		// update the scale to an array of integers of diatonic pitches
		chord_scale = this.collapse_scale_to_spelling( scale );

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
		// "Pop VII/I" : [1, 1, 1, 1, 1, 1, 1],
		// "Pop II/I" : [1, 1, 1, 1, 1, 1, 1]
		if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Exclude Minor 9ths" ) {
			voices = remove_minor_9ths( chord );
		} else {
			for ( let index = 0; index < options.length; index++ ) {
				if ( options[index] == 1 ) {
					let voice = chord[ index ];
					if ( this.CHORD_VOICE_OPTION_SELECTION_KEY == "Pop VII/I" || this.CHORD_VOICE_OPTION_SELECTION_KEY == "Pop II/I" ) {
						v -= this.CHROMATIC_HALF_STEPS;
					}
					voices.push( voice );
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