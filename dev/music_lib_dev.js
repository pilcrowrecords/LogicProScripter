/******************************************************************************
Name: MusicLib DEV
Author(s): Philip Regan
Purpose: 
* Test bed for improving the MUSIC_LIB object found in other scripts

Roadmap:
* Build complete scale with diatonic and non-diatonic notes
* Build chords based on intervals from root, not voice counts


********************************************************************************/

var music_lib = new MUSIC_LIB();

test();

function test() {
    music_lib.initialize();
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

    // CHORDS

    this.INTERVALS_LIB = {
        "0 P1 d2" 		: 0,
        "1 m2 A1 ST" 	: 1,
        "2 M2 d3 WT" 	: 2,
        "3 m3 A2" 		: 3,
        "4 M3 d4" 		: 4,
        "5 P4 A3" 		: 5,
        "6 d5 A4 TT" 	: 6 ,
        "7 P5 d6" 		: 7,
        "8 m6 A5" 		: 8,
        "9 M6 d7" 		: 9,
        "10 m7 A6"   	: 10,
        "11 M7 d8" 	    : 11,
        "12 P8 A7 d9" 	: 12,
        "13 m9 A8" 		: 13,
        "14 M9 d10" 	: 14,
        "15 m10 A9" 	: 15,
        "16 M10 d11" 	: 16,
        "17 P11 A10" 	: 17,
        "18 d12 A11" 	: 18,
        "19 P12 d13" 	: 19,
        "20 m13 A12" 	: 20,
        "21 M13 d14" 	: 21,
        "22 m14 A13" 	: 22,
        "23 M14 d15" 	: 23,
        "24 P15 A14" 	: 24,
        "25 A15" 		: 25
    };
    
    // each element in the TEMPLATE is subtracted by 1 for the actual calc
    this.CHORD_TEMPLATES_LIB = {
        "M"    :   [   
            this.INTERVALS_LIB["0 P1 d2"], 
            this.INTERVALS_LIB["4 M3 d4"], 
            this.INTERVALS_LIB["7 P5 d6"],
            null,
            null,
            null,
            null
                                    ],
        "m"    :   [   
            this.INTERVALS_LIB["0 P1 d2"], 
            this.INTERVALS_LIB["3 m3 A2"], 
            this.INTERVALS_LIB["7 P5 d6"],
            null,
            null,
            null,
            null
                                    ],
        "+"      :   [   
            this.INTERVALS_LIB["0 P1 d2"], 
            this.INTERVALS_LIB["4 M3 d4"], 
            this.INTERVALS_LIB["8 m6 A5"],
            null,
            null,
            null,
            null
                                    ],
        "˚"      :   [   
            this.INTERVALS_LIB["0 P1 d2"], 
            this.INTERVALS_LIB["3 m3 A2"], 
            this.INTERVALS_LIB["6 d5 A4 TT"],
            null,
            null,
            null,
            null
                                    ]
    };
    
    this.CHORD_EXT_7TH_LIB = {
        "♭♭7"   : INTERVALS_LIB["9 M6 d7"],
        "♭7"    : INTERVALS_LIB["10 m7 A6"], 
        "7"     : INTERVALS_LIB["11 M7 d8"],
        "♯7"    : INTERVALS_LIB["12 P8 A7 d9"]
    };
    
    this.CHORD_EXT_9TH_LIB = {
        "♭♭9"   : INTERVALS_LIB["12 P8 A7 d9"], 		
        "♭9"    : INTERVALS_LIB["13 m9 A8"], 
        "9"     : INTERVALS_LIB["14 M9 d10"], 
        "♯9"    : INTERVALS_LIB["15 m10 A9"], 
    };
    
    this.CHORD_EXT_11TH_LIB = {
        "♭11"   : INTERVALS_LIB["16 M10 d11"],
        "11"    : INTERVALS_LIB["17 P11 A10"],
        "♯11"   : INTERVALS_LIB["18 d12 A11"]
    };
    
    this.CHORD_EXT_13TH_LIB = {
        "♭♭13" 	: INTERVALS_LIB["19 P12 d13"],
        "♭13"   : INTERVALS_LIB["20 m13 A12"],
        "13"    : INTERVALS_LIB["21 M13 d14"],
        "♯13"   : INTERVALS_LIB["22 m14 A13"]
    };
    

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

}