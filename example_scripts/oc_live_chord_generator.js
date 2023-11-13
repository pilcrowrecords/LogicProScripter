/******************************************************************************
Name: Live Chord Generator
Author(s): Philip Regan
Purpose: 
* Creates diatonic chords based on a single root note within a particular scale 
and modifies them based on specific musical needs
* Intended to assist in improvisation and sketching new musical ideas
* A Scripter-based implementation of the Chord Trigger MIDI Effects Plug-In

Roadmap
* Update to handle suspended chords
	* Dependency: MUSIC_LIB needs to be updated to create suspended chords

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
	"Shell (3, 7)" :  [0, 1, 0, 1, 0, 0, 0]
};

const CHORD_VOICE_OPTIONS_KEYS = Object.keys( CHORD_VOICE_OPTIONS );
var CHORD_VOICE_OPTION_SELECTION = 1;
var CHORD_VOICE_OPTION_SELECTION_KEY = "7th (1, 3, 5, 7)";
var UPDATING_CONTROLS = false;

var SCALE_ROOT = 0;
var SCALE_TEMPLATE_INDEX = 0;
var CHORD_ROOT = 0;
var CHORD_ORIGINAL  = [];
var CHORD_VOICES = [];
// Parameter Changed -> update chord options -> get voices from chord -> CHORD_OPTIONS
var CHORD_OPTIONS = [1, 1, 1, 1, 1, 1, 1];
var KEYBOARD_SCALE = [];

var ACTIVE_NOTES = [];

var music_lib = new MUSIC_LIB();

// test();
// function test() {
//     // ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"]
//     // ["Ionian","Dorian","Phrygian","Lydian","Mixolydian","Aeolian","Locrian"]
//     var scale_object = music_lib.calculate_scale_pitches(0, 0);
//     // var full_keyboard = music_lib.expand_scale_to_midi_range(scale_object);
//     // var diatonic_scale = music_lib.collapse_scale_to_diatonic(full_keyboard);
//     // KEYBOARD_SCALE = music_lib.collapse_scale_to_integers(diatonic_scale);
//     // CHROMATIC_SCALE_STRINGS
//     let chord = music_lib.calculate_chord_pitches(0, scale_object);
//     let voices = music_lib.get_voices_from_chord( CHORD_VOICE_OPTIONS[CHORD_VOICE_OPTIONS_KEYS[CHORD_VOICE_OPTION_SELECTION]], chord );
//     console.log(KEYBOARD_SCALE);
//     console.log(voices);
// }

function Trace( s ) {
	console.log( s );
}

function HandleMIDI( event ) {

    // note on and note off assumes a single event is going to equate to a chord
    if ( event instanceof NoteOn ) {
        let scale_object = music_lib.calculate_scale_pitches( SCALE_ROOT, SCALE_TEMPLATE_INDEX );
        // Trace( JSON.stringify( KEYBOARD_SCALE ) );
        CHORD_ROOT = music_lib.transpose_pitch_to_lowest_octave( event.pitch );
        // Trace( CHORD_ROOT );
        CHORD_ORIGINAL = music_lib.calculate_chord_pitches( CHORD_ROOT, scale_object );
        CHORD_VOICES = music_lib.get_voices_from_chord( CHORD_OPTIONS, CHORD_ORIGINAL );
        Trace( event );
        Trace( JSON.stringify( CHORD_ORIGINAL ) );
        Trace( JSON.stringify( CHORD_OPTIONS ) );
        Trace( JSON.stringify( CHORD_VOICES ) );
        // play the notes in the chord voices
        CHORD_VOICES.forEach( function ( pitch ) {
            let tp_pitch = ( TARGET_OCTAVE * 12 ) + pitch;
        	Trace( [ tp_pitch, TARGET_OCTAVE, 12, pitch] );
            let note_on = new NoteOn();
            note_on.pitch = tp_pitch;
            note_on.send();
            ACTIVE_NOTES.push( note_on );
            Trace( note_on );
        });
    } else if ( event instanceof NoteOff ) {
        // stop the notes in the chord voices
        ACTIVE_NOTES.forEach( function ( note_on ) {
            let note_off = new NoteOff( note_on );
            note_off.send();
        });
        ACTIVE_NOTES = [];
    } else {
        event.send();
    }
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

function ParameterChanged( index, value ) {
    if ( UPDATING_CONTROLS == true ) {
		return;
	}
    switch ( index) {
        case 0:
            // target octave
            TARGET_OCTAVE = TARGET_OCTAVE_LIB[ TARGET_OCTAVE_KEYS[ value ] ];
            break;
        case 1:
            // scale root
            SCALE_ROOT = value;
            music_lib.calculate_scale_pitches( SCALE_ROOT, SCALE_TEMPLATE_INDEX );
            break;
        case 2:
            // scale type
            SCALE_TEMPLATE_INDEX = value;
            music_lib.calculate_scale_pitches( SCALE_ROOT, SCALE_TEMPLATE_INDEX );
            break;
        case 3:
            // chord root
            CHORD_ROOT = value;
            music_lib.calculate_chord_pitches(CHORD_ROOT, KEYBOARD_SCALE);
            break;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
            music_lib.update_chord_options(index, value);
            break;
        default:

            break;
    }
}

// 0
PluginParameters.push({
	name:"Target Octave", 
	type:"menu", 
	valueStrings:TARGET_OCTAVE_KEYS, 
	defaultValue:5
});

// 1
PluginParameters.push({
	name:"Scale Root", 
	type:"menu", 
	valueStrings: CHROMATIC_SCALE_STRINGS,
	defaultValue:0
});
// 2
PluginParameters.push({
	name:"Scale Type", 
	type:"menu", 
	valueStrings: SCALE_KEYS, 
	defaultValue:1
});
// 3
PluginParameters.push({
	name:"Chord Root", 
	type:"menu", 
	valueStrings: CHROMATIC_SCALE_STRINGS,
	defaultValue:0
});
// 4
PluginParameters.push({
	name:"Chord Voice Options", 
	type:"menu", 
	valueStrings: CHORD_VOICE_OPTIONS_KEYS,
	defaultValue:0
});
// 5
PluginParameters.push({
    name:"Root", 
    type:"checkbox", 
    defaultValue:1
});
// 6
PluginParameters.push({
    name:"3rd", 
    type:"checkbox", 
    defaultValue:1
});
// 7
PluginParameters.push({
    name:"5th", 
    type:"checkbox", 
    defaultValue:1
});
// 8
PluginParameters.push({
    name:"7th", 
    type:"checkbox", 
    defaultValue:1
});
// 9
PluginParameters.push({
    name:"9th", 
    type:"checkbox", 
    defaultValue:1
});
// 10
PluginParameters.push({
    name:"11th", 
    type:"checkbox", 
    defaultValue:1
});
// 11
PluginParameters.push({
    name:"13th", 
    type:"checkbox", 
    defaultValue:1
});