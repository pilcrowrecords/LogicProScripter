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

// 


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
    "dim"    :   [   
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

const PITCH_TYPE_ROOT = 'root';
const PITCH_TYPE_DIATONIC = 'diat';
const PITCH_TYPE_NONDIATONIC = 'nond';
const PITCH_RECORD_KEY_TYPE = "type";
const PITCH_RECORD_KEY_DEGREE = "key_degree";
const PITCH_RECORD_KEY_NAME = "key_name";
const PITCH_RECORD_MIDI_PITCH = "midi_pitch";

const SCALE = {
    "0": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 0,
    },
    "1": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 1,
    },
    "2": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 2,
    },
    "3": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 3,
    },
    "4": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 4,
    },
    "5": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 5,
    },
    "6": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 6,
    },
    "7": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 7,
    },
    "8": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 8,
    },
    "9": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 9,
    },
    "10": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 10,
    },
    "11": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 11,
    },
    "12": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 12,
    },
    "13": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 13,
    },
    "14": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 14,
    },
    "15": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 15,
    },
    "16": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 16,
    },
    "17": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 17,
    },
    "18": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 18,
    },
    "19": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 19,
    },
    "20": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 20,
    },
    "21": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 21,
    },
    "22": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 22,
    },
    "23": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 23,
    },
    "24": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 24,
    },
    "25": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 25,
    },
    "26": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 26,
    },
    "27": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 27,
    },
    "28": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 28,
    },
    "29": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 29,
    },
    "30": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 30,
    },
    "31": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 31,
    },
    "32": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 32,
    },
    "33": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 33,
    },
    "34": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 34,
    },
    "35": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 35,
    },
    "36": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 36,
    },
    "37": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 37,
    },
    "38": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 38,
    },
    "39": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 39,
    },
    "40": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 40,
    },
    "41": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 41,
    },
    "42": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 42,
    },
    "43": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 43,
    },
    "44": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 44,
    },
    "45": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 45,
    },
    "46": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 46,
    },
    "47": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 47,
    },
    "48": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 48,
    },
    "49": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 49,
    },
    "50": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 50,
    },
    "51": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 51,
    },
    "52": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 52,
    },
    "53": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 53,
    },
    "54": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 54,
    },
    "55": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 55,
    },
    "56": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 56,
    },
    "57": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 57,
    },
    "58": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 58,
    },
    "59": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 59,
    },
    "60": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 60,
    },
    "61": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 61,
    },
    "62": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 62,
    },
    "63": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 63,
    },
    "64": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 64,
    },
    "65": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 65,
    },
    "66": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 66,
    },
    "67": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 67,
    },
    "68": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 68,
    },
    "69": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 69,
    },
    "70": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 70,
    },
    "71": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 71,
    },
    "72": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 72,
    },
    "73": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 73,
    },
    "74": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 74,
    },
    "75": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 75,
    },
    "76": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 76,
    },
    "77": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 77,
    },
    "78": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 78,
    },
    "79": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 79,
    },
    "80": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 80,
    },
    "81": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 81,
    },
    "82": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 82,
    },
    "83": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 83,
    },
    "84": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 84,
    },
    "85": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 85,
    },
    "86": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 86,
    },
    "87": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 87,
    },
    "88": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 88,
    },
    "89": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 89,
    },
    "90": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 90,
    },
    "91": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 91,
    },
    "92": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 92,
    },
    "93": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 93,
    },
    "94": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 94,
    },
    "95": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 95,
    },
    "96": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 96,
    },
    "97": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 97,
    },
    "98": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 98,
    },
    "99": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 99,
    },
    "100": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 100,
    },
    "101": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 101,
    },
    "102": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 102,
    },
    "103": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 103,
    },
    "104": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 104,
    },
    "105": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 105,
    },
    "106": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 106,
    },
    "107": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 107,
    },
    "108": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 108,
    },
    "109": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 109,
    },
    "110": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 110,
    },
    "111": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 111,
    },
    "112": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 112,
    },
    "113": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 113,
    },
    "114": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 114,
    },
    "115": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 115,
    },
    "116": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 116,
    },
    "117": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 117,
    },
    "118": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 118,
    },
    "119": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 119,
    },
    "120": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 120,
    },
    "121": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 121,
    },
    "122": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 122,
    },
    "123": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 123,
    },
    "124": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 124,
    },
    "125": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 125,
    },
    "126": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 126,
    },
    "127": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 127,
    },
    "128": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 128,
    },
    "129": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 129,
    },
    "130": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 130,
    },
    "131": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 131,
    },
    "132": {
      type: "root",
      key_degree: "I tonic",
      key_name: "C",
      midi_pitch: 132,
    },
    "133": {
      type: "nond",
      key_name: "C♯/D♭",
      midi_pitch: 133,
    },
    "134": {
      type: "diat",
      key_degree: "II supertonic",
      key_name: "D",
      midi_pitch: 134,
    },
    "135": {
      type: "nond",
      key_name: "D♯/E♭",
      midi_pitch: 135,
    },
    "136": {
      type: "diat",
      key_degree: "III mediant",
      key_name: "E",
      midi_pitch: 136,
    },
    "137": {
      type: "diat",
      key_degree: "IV subdominant",
      key_name: "F",
      midi_pitch: 137,
    },
    "138": {
      type: "nond",
      key_name: "F♯/G♭",
      midi_pitch: 138,
    },
    "139": {
      type: "diat",
      key_degree: "V dominant",
      key_name: "G",
      midi_pitch: 139,
    },
    "140": {
      type: "nond",
      key_name: "G♯/A♭",
      midi_pitch: 140,
    },
    "141": {
      type: "diat",
      key_degree: "VI submediant",
      key_name: "A",
      midi_pitch: 141,
    },
    "142": {
      type: "nond",
      key_name: "A♯/B♭",
      midi_pitch: 142,
    },
    "143": {
      type: "diat",
      key_degree: "VII leading tone",
      key_name: "B",
      midi_pitch: 143,
    },
  }
 
 
 // const TONICS = [0, 2, 4, 5, 7, 9, 11];


const TEST_CHORD_STRINGS = [
  "I",
  "ii",
  "iii",
  "IV",
  "V",
  "vi",
  "vii˚",
  "I7",
  "ii9",
  "iiiadd9",
  "IV11",
  "Vadd11",
  "vi13",
  "vii˚add13",
  "Isus2",
  "iisus4",
  "iiib9",
  "IV#11",
  "Vb13",
  "vi#9b11#13",
  "vii˚/5"
];

test();

function test() {
    TEST_CHORD_STRINGS.forEach( function ( str ) {
        let chord_pitches = create_chord_from_spelling( str, SCALE, 0 );
        console.log( str + "\t" + JSON.stringify( chord_pitches ) );
    });
}

function get_chord_voice_from_scale( degree, scale, tonic ) {
    let degrees = 1; // tonic to degree = interval
    let scale_index = tonic - 1; // start 1 back to ensure correct output
    while ( degrees <= degree ) {
        scale_index++;
        let pitch = scale[scale_index];

        if ( !pitch ) {
          console.log( pitch );
          return null;
        }

        if ( pitch[PITCH_RECORD_KEY_TYPE] != PITCH_TYPE_NONDIATONIC ) {
            degrees++;
        }
    };
    return scale[scale_index];
}

function create_chord_from_spelling( str, scale, tonic ) {
    let pitches = [];
    // capture the spelling for destructive editing to capture alternate bass
    let chord_spelling = str;
    // cache for parsing
    let chord_settings = {};
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

    // build the basic triad
    // determine the root

    let chord_root = get_chord_voice_from_scale( chord_settings.chord_degree, scale, tonic );
    let chord_root_midi_pitch = chord_root.midi_pitch;
    switch ( chord_settings.chord_accidental ) {
      case TOKEN_SHARP_MUSIC:
        chord_root_midi_pitch += 1;
        break;
      case TOKEN_FLAT_MUSIC:
        chord_root_midi_pitch -= 1;
      default:
        // do nothing
        break;
    }

    let chord_template = CHORD_TEMPLATES_LIB[chord_settings.chord_quality];

    if ( !chord_template ) {
      console.log( JSON.stringify( chord_settings ) );
      return pitches;
    }

    chord_template.forEach( function ( interval ) {
        let key = chord_root_midi_pitch + interval
        let pitch = scale[ key ];
        pitches.push( pitch ); 
    });

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

        // Add the bass below the tonic
    // get the bass pitch
      let bass_pitch = get_chord_voice_from_scale( chord_settings.alt_bass_pitch, scale, tonic );
      // transpose to below the chord root (pitches[0]);
      bass_pitch.midi_pitch = ( bass_pitch.midi_pitch -= 12 );
      pitches.push( bass_pitch );

        // trim alt bass notation and qualities off of chord spelling to prep for extensions
        chord_spelling = chord_spelling.slice(0, chord_spelling.length - ( alt_bass.length + 1 ) );
    }
    // does the chord have a 7th extension?
    if ( chord_spelling.indexOf("7", cursor) >= 0 ) {
        // get 7th pitch
        chord_settings.seventh_pitch = true;
        let seventh_pitch = get_chord_voice_from_scale ( 7, scale, chord_root_midi_pitch );
        pitches.push( seventh_pitch );
        cursor += 1;
    }

    let extensions = [ TOKEN_QUALITY_THIRTEENTH, TOKEN_QUALITY_ELEVENTH, TOKEN_QUALITY_NINTH, TOKEN_QUALITY_FIFTH ];

    extensions.forEach( function ( extension ) {
        let cursor = chord_spelling.indexOf( extension );
        let mod = "";
        if ( cursor >= 0 ) {
            switch ( extension ) {
                case TOKEN_QUALITY_THIRTEENTH:
                    // // capture the extension
                    // chord_settings["extension_" + extension] = extension; 
                    // // check the value in the position just before the cursor
                    let add13 = false;
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            let thirteenth_pitch_sharp = get_chord_voice_from_scale( 13, scale, chord_root.midi_pitch );
                            let interval_sharp = thirteenth_pitch_sharp.midi_pitch + 1;
                            thirteenth_pitch_sharp = scale[ chord_root.midi_pitch + interval_sharp ];
                            pitches.push( thirteenth_pitch_sharp );
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            let thirteenth_pitch_flat = get_chord_voice_from_scale( 13, scale, chord_root.midi_pitch );
                            let interval_flat = thirteenth_pitch_flat.midi_pitch - 1;
                            thirteenth_pitch_flat = scale[ chord_root.midi_pitch + interval_flat ];
                            pitches.push( thirteenth_pitch_flat );
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            add13 = true;
                            break;
                        default:
                            let thirteenth_pitch_natural = get_chord_voice_from_scale( 13, scale, chord_root.midi_pitch );
                            pitches.push( thirteenth_pitch_natural );
                            break;
                    }

                    //add the 13th
                    
                    if ( add13 ) {
                       let eleventh_pitch = get_chord_voice_from_scale( 11, scale, chord_root.midi_pitch );
                       pitches.push( eleventh_pitch );
                       let ninth_pitch = get_chord_voice_from_scale( 9, scale, chord_root.midi_pitch );
                       pitches.push( ninth_pitch );
                       if ( chord_settings.seventh_pitch == false ) {
                        let seventh_pitch = get_chord_voice_from_scale( 7, scale, chord_root.midi_pitch );
                        pitches.push( seventh_pitch );
                       }
                    }

                    break;

                case TOKEN_QUALITY_ELEVENTH:
                    // capture the extension
                    // chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    let eleventh = 11;
                    let add11 = false;
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            let eleventh_pitch_sharp = get_chord_voice_from_scale( 11, scale, chord_root.midi_pitch );
                            let interval_sharp = eleventh_pitch_sharp.midi_pitch + 1;
                            eleventh_pitch_sharp = scale[ chord_root.midi_pitch + interval_sharp ];
                            pitches.push( eleventh_pitch_sharp );
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            let eleventh_pitch_flat = get_chord_voice_from_scale( 11, scale, chord_root.midi_pitch );
                            let interval_flat = eleventh_pitch_flat.midi_pitch - 1;
                            eleventh_pitch_flat = scale[ chord_root.midi_pitch + interval_flat ];
                            pitches.push( eleventh_pitch_flat );
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_CHORD_EXT_ADD;
                            add11 = true;
                            break;
                        default:
                            let eleventh_pitch_natural = get_chord_voice_from_scale( 11, scale, chord_root.midi_pitch );
                            pitches.push( eleventh_pitch_natural );
                            break;
                    }

                    if ( add11 ) {
                      let ninth_pitch = get_chord_voice_from_scale( 9, scale, chord_root.midi_pitch );
                      pitches.push( ninth_pitch );
                      if ( chord_settings.seventh_pitch == false ) {
                       let seventh_pitch = get_chord_voice_from_scale( 7, scale, chord_root.midi_pitch );
                       pitches.push( seventh_pitch );
                      }
                   }

                    break;
                case TOKEN_QUALITY_NINTH:
                    // capture the extension
                    // chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    let add9 = false;
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            let ninth_pitch_sharp = get_chord_voice_from_scale( 9, scale, chord_root.midi_pitch );
                            let interval_sharp = ninth_pitch_sharp.midi_pitch + 1;
                            ninth_pitch_sharp = scale[ chord_root.midi_pitch + interval_sharp ];
                            pitches.push( ninth_pitch_sharp );
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            let ninth_pitch_flat = get_chord_voice_from_scale( 9, scale, chord_root.midi_pitch );
                            let interval_flat = ninth_pitch_flat.midi_pitch - 1;
                            ninth_pitch_flat = scale[ chord_root.midi_pitch + interval_flat ];
                            pitches.push( ninth_pitch_flat );
                            break;
                        case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_CHORD_EXT_ADD;
                            add9 = true;
                        default:
                            let ninth_pitch_natural = get_chord_voice_from_scale( 9, scale, chord_root.midi_pitch );
                            pitches.push( ninth_pitch_natural );
                            break;
                    }

                    if ( add9 ) {
                      if ( chord_settings.seventh_pitch == false ) {
                       let seventh_pitch = get_chord_voice_from_scale( 7, scale, chord_root.midi_pitch );
                       pitches.push( seventh_pitch );
                      }
                   }

                    break;
                case TOKEN_QUALITY_FIFTH :
                    // capture the extension
                    // chord_settings["extension_" + extension] = extension; 
                    // check the value in the position just before the cursor
                    mod = chord_spelling.charAt( cursor - 1 );
                    switch ( mod ) {
                        case TOKEN_SHARP_MUSIC:
                        case TOKEN_SHARP_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_SHARP_MUSIC;
                            // get the current 5th
                            let fifth_pitch_sharp_curr = ( pitches.splice( 2, 1 ) )[0];
                            // recalculate the pitch
                            let fifth_pitch_sharp_midi = fifth_pitch_sharp_curr.midi_pitch;
                            fifth_pitch_sharp_midi += 1;
                            // get the new 5th
                            let fifth_pitch_sharp_new = scale[ fifth_pitch_sharp_midi ];
                            // swap out the current 5th with the new 5th
                            pitches.splice( 2, 1, fifth_pitch_sharp_new );
                            break;
                        case TOKEN_FLAT_MUSIC:
                        case TOKEN_FLAT_ALPHA:
                            // chord_settings["extension_" + extension + "_modifier"] = TOKEN_FLAT_MUSIC;
                            // get the current 5th
                            // get the current 5th
                            let fifth_pitch_flat_curr = ( pitches.splice( 2, 1 ) )[0];
                            // recalculate the pitch
                            let fifth_pitch_flat_midi = fifth_pitch_flat_curr.midi_pitch;
                            fifth_pitch_flat_midi += 1;
                            // get the new 5th
                            let fifth_pitch_flat_new = scale[ fifth_pitch_flat_midi ];
                            // swap out the current 5th with the new 5th
                            pitches.splice( 2, 1, fifth_pitch_flat_new );
                            break;
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

    return pitches;
}