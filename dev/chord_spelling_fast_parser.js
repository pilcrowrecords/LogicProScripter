/******************************************************************************
Name: Chord Spelling Fast Parser
Author(s): Philip Regan
Purpose: 
* Library for reading chord spellings in the form of 
[modifier]{roman numeral}[quality][extensions][/alt bass as number]
* Compatible with MuseScore: https://musescore.org/en/handbook/4/chord-symbols#rna
    * Support standard notation, but not actual note names. All pitches are 
    handled as roman or arabic numerals

Chord symbol syntax
* Degree: roman numerals I-VII, i-vii
* Major: uppercase roman numerals, `maj', `M', `Δ'
* Minor: lowercase roman numerals, `min', `m', `-'
* Diminished
* Half Diminished
* Augmented
* suspended: `sus'
    * voice: arabic numbers 2 or 4
* Accidentals
    * sharp
    * double sharp
    * flat
    * double flat
    * natural
* extensions
    * voice: arabic numbers 1-7
    * TODO: add: `add'
    * Accidentals
        * TODO: doubles
* alt bass: arabic numbers 1-7
    * accidentals supported


Roadmap:
* update extensions to accomodate modified `add' extensions, like `add#9'
* consolidate repeated calculations into functions
* add conversion of settings into chord based on 12-note boolean array and tonic

********************************************************************************/

var TEST_CHORD_STRINGS = [
    "I",
    "ii",
    "iii",
    "IV",
    "V",
    "vi",
    "vii",
    "#I",
    "#iv",
    "#II",
    "#V",
    "bVI",
    "bVII",
    "bii",
    "bv",
    "biv",
    "bVI7",
    "vi7",
    "#Idim7",
    "#IVmin7",
    "#IIdim7",
    "IIIm7",
    "Vm",
    "IVm7",
    "Im",
    "iim",
    "iiim",
    "vim",
    "iim",
    "#Vdim7",
    "#Idim7",
    "VIm7",
    "VIIm7",
    "IIIm7",
    "Idim",
    "#IVm7",
    "ii˚",
    "ii˚7",
    "bIII+",
    "V/2",
    "IV/1",
    "V/1",
    "vii˚/2",
    "im/b3",
    "bII/4",
    "ivm/b6",
    "ivm/1",
    "IIIm7b5",
    "#IVmin7b5",
    "Im6",
    "IIIm7b5",
    "#IVm7b5",
    "VIm7b5/b3",
    "vim7b5",
    "Vm7b5",
    "bviim7b5",
    "Iadd9",
    "ii,11",
    "iiiadd13",
    "IVb9,13",
    "Vadd9",
    "vi",
    "vii"
 ];

const TOKEN_QUALITY_MAJOR = "maj";
const TOKEN_QUALITY_MAJOR_ALPHA = "M";
const TOKEN_QUALITY_MAJOR_MUSIC = "Δ";
const TOKEN_QUALITY_MINOR = "min";
const TOKEN_QUALITY_MINOR_ALPHA = "m";
const TOKEN_QUALITY_MINOR_MUSIC = "-";
const TOKEN_QUALITY_DIMINISHED = "dim";
const TOKEN_QUALITY_DIMINISHED_MUSIC = "˚";
const TOKEN_QUALITY_DIMINISHED_HALF = "0";
const TOKEN_QUALITY_AUGMENTED = "aug";
const TOKEN_QUALITY_AUGMENTED_MUSIC = "+";
const TOKEN_QUALITY_FIFTH = "5";
const TOKEN_QUALITY_SIXTH = "6";
const TOKEN_QUALITY_SEVENTH = "7";
const TOKEN_QUALITY_NINTH = "9";
const TOKEN_QUALITY_ELEVENTH = "11";
const TOKEN_QUALITY_THIRTEENTH = "13";
const TOKEN_NATURAL_MUSIC = "♮";
const TOKEN_FLAT_ALPHA = "b";
const TOKEN_FLAT_MUSIC = "♭";
const TOKEN_FLAT_DOUBLE_ALPHA = "bb";
const TOKEN_FLAT_DOUBLE_MUSIC = "𝄫";
const TOKEN_SHARP_ALPHA = "#";
const TOKEN_SHARP_MUSIC = "♯";
const TOKEN_SHARP_DOUBLE_ALPHA = "X";
const TOKEN_SHARP_DOUBLE_MUSIC = "♯♯";
const TOKEN_CHORD_SUS = "sus";
const TOKEN_CHORD_EXT_ADD = "add";
const TOKEN_CHORD_EXT_ADD_FRAGMENT = "d";
const TOKEN_CHORD_ALT_BASS = "/";

const TOKEN_SCALE_DEGREE_MAJOR_1 = "I";
const TOKEN_SCALE_DEGREE_MAJOR_2 = "II";
const TOKEN_SCALE_DEGREE_MAJOR_3 = "III";
const TOKEN_SCALE_DEGREE_MAJOR_4 = "IV";
const TOKEN_SCALE_DEGREE_MAJOR_5 = "V";
const TOKEN_SCALE_DEGREE_MAJOR_6 = "VI";
const TOKEN_SCALE_DEGREE_MAJOR_7 = "VII";

const TOKEN_SCALE_DEGREE_MINOR_1 = "i";
const TOKEN_SCALE_DEGREE_MINOR_2 = "ii";
const TOKEN_SCALE_DEGREE_MINOR_3 = "iii";
const TOKEN_SCALE_DEGREE_MINOR_4 = "iv";
const TOKEN_SCALE_DEGREE_MINOR_5 = "v";
const TOKEN_SCALE_DEGREE_MINOR_6 = "vi";
const TOKEN_SCALE_DEGREE_MINOR_7 = "vii";

const INTERVALS_STN_LIB = {
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

const CHORD_TEMPLATES_LIB = {
    "maj"    :   [   
        INTERVALS_STN_LIB["0 P1 d2"], 
        INTERVALS_STN_LIB["4 M3 d4"], 
        INTERVALS_STN_LIB["7 P5 d6"],
    ],
    "min"    :   [   
        INTERVALS_STN_LIB["0 P1 d2"], 
        INTERVALS_STN_LIB["3 m3 A2"], 
        INTERVALS_STN_LIB["7 P5 d6"],
    ],
    "min"    :   [   
        INTERVALS_STN_LIB["0 P1 d2"], 
        INTERVALS_STN_LIB["4 M3 d4"], 
        INTERVALS_STN_LIB["8 m6 A5"],
    ],
    "˚"    :   [   
        INTERVALS_STN_LIB["0 P1 d2"], 
        INTERVALS_STN_LIB["3 m3 A2"], 
        INTERVALS_STN_LIB["6 d5 A4 TT"],
    ],
    "0"    :   [   
        INTERVALS_STN_LIB["0 P1 d2"], 
        INTERVALS_STN_LIB["3 m3 A2"], 
        INTERVALS_STN_LIB["7 P5 d6"],
        INTERVALS_STN_LIB["10 m7 A6"]
    ],
};

 const SCALE = [1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1 ];
 const TONICS = [0, 2, 4, 5, 7, 9, 11];

test();

function test() {
    TEST_CHORD_STRINGS.forEach( function ( str ) {
        let chord_settings = parse_chord_spelling( str );
        TONICS.forEach( function ( tonic ) {
            let chord_pitches = create_chord( chord_settings, SCALE, tonic );
        });
    });
}

// (Object, <boolean>[], integer ) returns <integer>[]
function create_chord( chord_settings, scale, tonic ) {
    let pitches = [];
    // get the tonic from the scale
    // get the chord accidental
    // push the chord root
    // get the chord quality
    // push the chord voices from the root
    // get the 7th extension
    // get the extensions
    // get the sus2 or sus4
    // update the 2nd voice to sus
    // get the alt bass
    // push alt bass to index 0

    return pitches;
}

function parse_chord_spelling( str ) {
    let chord_spelling = str;
    let chord_settings = {};
    chord_settings.chord_spelling = str;
    let cursor = 0;

    // does the chord have an accidental?

    if ( chord_spelling.charAt(0) == TOKEN_FLAT_ALPHA ) {
        chord_settings.chord_accidental = TOKEN_FLAT_ALPHA;
        cursor += 1;
    } else if ( chord_spelling.charAt(0) == TOKEN_SHARP_ALPHA ) {
        chord_settings.chord_accidental = TOKEN_SHARP_ALPHA;
        cursor += 1;
    } else {
        chord_settings.chord_accidental = TOKEN_NATURAL_MUSIC;
    }

    // capture the scale degree
    // vii, vi, iv, v, , iii, ii, i
    if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_7, cursor) >= 0 ) {
        chord_settings.chord_degree = 7;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_6, cursor) >= 0 ) {
        chord_settings.chord_degree = 6;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 2;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_4, cursor) >= 0 ) {
        chord_settings.chord_degree = 4;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 2;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_5, cursor) >= 0 ) {
        chord_settings.chord_degree = 5;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_3, cursor) >= 0 ) {
        chord_settings.chord_degree = 3;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_2, cursor) >= 0 ) {
        chord_settings.chord_degree = 2;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 2;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MINOR_1, cursor) >= 0 ) {
        chord_settings.chord_degree = 1;
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_7, cursor) >= 0 ) {
        chord_settings.chord_degree = 7;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_6, cursor) >= 0 ) {
        chord_settings.chord_degree = 6;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 2;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_4, cursor) >= 0 ) {
        chord_settings.chord_degree = 4;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 2;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_5, cursor) >= 0 ) {
        chord_settings.chord_degree = 5;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_3, cursor) >= 0 ) {
        chord_settings.chord_degree = 3;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_2, cursor) >= 0 ) {
        chord_settings.chord_degree = 2;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 2;
    } else if ( chord_spelling.indexOf(TOKEN_SCALE_DEGREE_MAJOR_1, cursor) >= 0 ) {
        chord_settings.chord_degree = 1;
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 1;
    } else {
        console.log("ERROR: chord spelling has no roman numeral.");
        return chord_spelling;
    }

    // does the chord have any other chord quality after?

    if ( chord_spelling.indexOf(TOKEN_QUALITY_MAJOR, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_MINOR, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_DIMINISHED, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_DIMINISHED;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_AUGMENTED, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_AUGMENTED;
        cursor += 3;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_MAJOR_ALPHA, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_MAJOR_MUSIC, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_MAJOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_MINOR_ALPHA, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_MINOR_MUSIC, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_MINOR;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_DIMINISHED_MUSIC, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_DIMINISHED;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_DIMINISHED_HALF, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_DIMINISHED;
        cursor += 1;
    } else if ( chord_spelling.indexOf(TOKEN_QUALITY_AUGMENTED_MUSIC, cursor) >= 0 ) {
        chord_settings.chord_quality = TOKEN_QUALITY_AUGMENTED;
        cursor += 1;
    } else {
        // no chord quality
    }

    // does the chord have an alternate bass?
    // if so capture it and trim it off the spelling to get the extensions without interference
    if ( chord_spelling.indexOf(TOKEN_CHORD_ALT_BASS) >= 0 ) {
        // split
        let arr = chord_spelling.split(TOKEN_CHORD_ALT_BASS);
        let alt_bass = arr[1];
        // capture modifier, if any
        // capture degree (as number)
        if ( alt_bass.length == 2 ) {

            let mod = alt_bass.charAt(0);
            let deg = alt_bass.charAt(1);

            if ( mod == TOKEN_FLAT_ALPHA || mod == TOKEN_FLAT_MUSIC ) {
                chord_settings.alt_bass_modifier = TOKEN_FLAT_MUSIC;
            } else if ( mod == TOKEN_SHARP_ALPHA || mod == TOKEN_SHARP_MUSIC ) {
                chord_settings.alt_bass_modifier = TOKEN_SHARP_MUSIC;
            } else {
                chord_settings.alt_bass_modifier = TOKEN_NATURAL_MUSIC;
            }

            chord_settings.alt_bass_pitch = parseInt( deg );

        } else {

            let deg = alt_bass.charAt(0);
            chord_settings.alt_bass_pitch = parseInt( deg );
        }

        // trim alt bass notation and qualities off of chord spelling to prep for extensions
        chord_spelling = chord_spelling.slice(0, chord_spelling.length - ( alt_bass.length + 1 ) );
    }

    // does the chord have a 7th extension?
    if ( chord_spelling.indexOf("7", cursor) >= 0 ) {
        chord_settings.chord_7 = 0;
        cursor += 1;
    }

    let extensions = [ TOKEN_QUALITY_THIRTEENTH, TOKEN_QUALITY_ELEVENTH, TOKEN_QUALITY_NINTH, TOKEN_QUALITY_FIFTH ];

    extensions.forEach( function ( extension ) {
        let cursor = chord_spelling.indexOf( extension );
        let mod = "";
        if ( cursor >= 0 ) {
            switch ( extension ) {
                case TOKEN_QUALITY_THIRTEENTH:
                    // capture the extension
                    chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_CHORD_EXT_ADD;
                            break;
                        default:
                            break;
                    }
                    break;
                
                case TOKEN_QUALITY_ELEVENTH:
                    // capture the extension
                    chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_CHORD_EXT_ADD;
                            break;
                        default:
                            break;
                    }
                    break;
                case TOKEN_QUALITY_NINTH:
                    // capture the extension
                    chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_CHORD_EXT_ADD;
                        default:
                            break;
                    }
                    break;
                case TOKEN_QUALITY_FIFTH :
                    // capture the extension
                    chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            chord_settings["extension_" + extension + "_modifier"] = TOKEN_CHORD_EXT_ADD;
                        default:
                            break;
                    }
                    break;
                default:
                    console.log( "ERROR: extension: " + extension );
                    break;
            }
        }
    });

    return chord_settings;
}