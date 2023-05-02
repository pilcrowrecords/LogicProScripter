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

var TEST_CHORD_STRINGS = [
  "IVm7", 
  "viim7b5", 
  "#Idim7", 
  "#Idim7", 
  "#IIdim7", 
  "#iv°7", 
  "#IVm7b5", 
  "#IVm7b5", 
  "#IVm7b5", 
  "#iv˚7", 
  "#Vdim7", 
  "#Vm7h5", 
  "bVI", 
  "bVI9", 
  "V7", 
  "I", 
  "Idim/b3", 
  "iim", 
  "i°", 
  "Im7b5", 
  "im", 
  "Im", 
  "im/5", 
  "im/b3", 
  "Imb", 
  "IMI", 
  "IV", 
  "ivm/1", 
  "ivm7", 
  "im", 
  "V", 
  "V/1", 
  "V/2", 
  "VI", 
  "vii", 
  "VI", 
  "VIm7b5", 
  "vim", 
  "vim7b5", 
  "vim7b5", 
  "VIm7b5", 
  "Vm", 
  "Vm7b5"
];

test();

function test() {
    music_lib.initialize();
    TEST_CHORD_STRINGS.forEach( function ( s ) {
        console.log(music_lib.parseChord( s, [ true, false, true, false, true, true, false, true, false, true, false, true ], 0 ));
    } );
}

function MUSIC_LIB () {
    /* GENERAL MUSIC */

	// index aligns to lowest MIDI octave
	this.CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
	this.CHROMATIC_HALF_STEPS = 12;
	this.OCTAVE_PITCH_INDEX = [-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8];
  this.KEYBOARD_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B", "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
	/* SCALES */

  this.SCALE_DEGREE_NAMES = ["I tonic", "II supertonic", "III mediant", "IV subdominant", "V dominant", "VI submediant", "VII leading tone"];
	this.KEYBOARD_STRINGS = [];
	this.SCALE_TEMPLATES = {
        "ionian": [0, 2, 4, 5, 7, 9, 11],
        "dorian": [0, 2, 3, 5, 7, 9, 10],
        "phrygian": [0, 1, 3, 5, 7, 8, 10],
        "lydian": [0, 2, 4, 6, 7, 9, 11],
        "mixolydian": [0, 2, 4, 5, 7, 9, 10],
        "aeolian": [0, 2, 3, 5, 7, 8, 10],
        "locrian": [0, 1, 3, 5, 6, 8, 10]
	}
	this.SCALE_KEYS = Object.keys(this.SCALE_TEMPLATES);
	
	this._PITCH_TYPE_ROOT = 'rt';
	this._PITCH_TYPE_DIATONIC = 'dt';
	this._PITCH_TYPE_NONDIATONIC = 'nd';
	this._PITCH_RECORD_KEY_TYPE = "t";
	this._PITCH_RECORD_KEY_DEGREE = "d";
	this._PITCH_RECORD_KEY_NAME = "n";

    // CHORDS

    this.INTERVALS_STN_LIB = {
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

    this.INTERVALS_NTS_LIB = {
        0	:	"P1 d2",
        1	:	"m2 A1 ST",
        2	:	"M2 d3 WT",
        3	:	"m3 A2",
        4	:	"M3 d4",
        5	:	"P4 A3",
        6	:	"d5 A4 TT",
        7	:	"P5 d6",
        8	:	"m6 A5",
        9	:	"M6 d7",
        10	:	"m7 A6",
        11	:	"M7 d8",
        12	:	"P8 A7 d9",
        13	:	"m9 A8",
        14	:	"M9 d1 0",
        15	:	"m1 0 A 9",
        16	:	"M1 0 d 11",
        17	:	"P1 1 A 10",
        18	:	"d1 2 A 11",
        19	:	"P1 2 d 13",
        20	:	"m1 3 A 12",
        21	:	"M1 3 d 14",
        22	:	"m1 4 A 13",
        23	:	"M1 4 d 15",
        24	:	"P1 5 A 14",
        25	:	"A1 5"
    };

    // initialize prepares values for base calculations
    this.initialize = function () {
      // do nothing
    }

    this.calculateScale = function (pitch, scaleType) {
          
        const isDiatonic = new Array(128).fill(false);
        const result = [];
      
        for (let i = pitch; i < 128; i += 12) {
          for (let j = 0; j < this.SCALE_TEMPLATES[scaleType].length; j++) {
            if ((i + this.SCALE_TEMPLATES[scaleType][j]) < 128) {
              isDiatonic[i + this.SCALE_TEMPLATES[scaleType][j]] = true;
              result.push({ pitch: i + this.SCALE_TEMPLATES[scaleType][j], degree: this.INTERVALS_NTS_LIB[this.SCALE_TEMPLATES[scaleType][j]] });
            }
          }
        }
      
        for (let i = 0; i < 128; i++) {
          if (!isDiatonic[i]) {
            result.push({ pitch: i, degree: 'non-diatonic' });
          }
        }
      
        return result;
      }

      this.parseChord = function (chordString, diatonicNotes, tonic) {
        const chordRegex = /^([IViXx]+)([+\-]?)(\d{0,2})(?:\/([A-G][#b]?))?$/;
        const [, numeral, modifier, extension, bass] = chordString.match(chordRegex) || [];
        if ( !numeral) {
          return ["error"];
        }
      
        const romanNumerals = {
          I: 0,
          II: 1,
          III: 2,
          IV: 3,
          V: 4,
          VI: 5,
          VII: 6,
        };
      
        const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
        const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
        const chordIntervals = modifier === '-' ? minorIntervals : majorIntervals;
        const diatonicChordNotes = [];
        for (let i = 0; i < 7; i++) {
          if (diatonicNotes[(tonic + i) % 12]) {
            diatonicChordNotes.push((tonic + i) % 12);
          }
        }
        const chord = chordIntervals.map(interval => {
          const note = (diatonicChordNotes[romanNumerals[numeral.toUpperCase()]] + interval) % 12;
          return note;
        });
        const midiChord = chord.map(note => {
          return note + 12 * Math.floor((tonic + chord[0]) / 12) + (extension ? parseInt(extension, 10) : 0);
        });
      
        return midiChord;
      }
      
}