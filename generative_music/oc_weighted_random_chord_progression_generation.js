/******************************************************************************
Name: Weighted Random Chord Progression Generation
Author(s): Philip Regan

Purpose: 
* improves upon the original guided rand generation script:
	* Builds chords based upon roman numeral notation which allows for complex
	progression maps
	* includes key transformations to chords reducing the number of scripter
	instances
		* modified chords like forcing to triads, pop chords, drop chords, 
		shell chords, etc.
		* Inversions to within a range of pitches
		* Transposition by semitones which goes beyond Logic Pro's default
* Documentation about the data structures needed to do the calculations is 
included in the comments below.

Markov Chains
* Uses a Markov Chain to better guide random music generation.
    * While the weighted random music generation would select a note based upon 
    the weights at a particular point in time, the Markov Chain will make a 
    selection based on the previous selection, weighted or otherwise.
    * For example, the following chord progression with variations can be made 
    into a Markov Chain:
 
    I → vi → {IV, ii} → {V, vii˚} → iii → I

    In the above example, the progression would be determined at each iteration 
        * Starts with the I
        * Moves to the vi because the I preceeded it.
        * Selects either IV or ii randomly because the vi was the last one 
        selected
        * Selects either V or vii˚ randomluy because either IV or ii was 
        selected
        * Moves to the iii because other V or vii˚ was the last one selected
        * Moves back to the I because was selected last.
    * At each iteration, if there is more than one value to be selected, then 
    those values can also be weighted (weight the V greater than the vii˚).

    To encode this for Scripter, the following Object (JSON) could be used:
    var CHAIN = {
        I   :   [ vi ],
        ii  :   [ V, vii˚ ],
        iii :   [ I ],
        IV  :   [ V, vii˚ ],
        V   :   [ iii ],
        vi  :   [ IV, ii ],
        vii˚:   [ iii ]
    }

    To take this a step further, weighted random selection can be used to add
    nuance to the progression. Using the format in the oc_weighted_random_selection 
    script

    var CHAIN = {
        I   :   { 100:vi },
        ii  :   { 60:V, 40:vii˚ },
        iii :   { 100:I },
        IV  :   { 80:V, 20:vii˚ },
        V   :   { 100:iii },
        vi  :   { 60:IV, 40:ii },
        vii˚:   { 100:iii }
    }

    A couple things to note:
    * Even though { ii, IV } is followed by { V, vii˚ } in the first version, 
    different weights can be added to each of the subsequent chord selections 
    to provide more direction to the progression, like ensuring there is better 
    voice leading between the chords.
    * In this example, if the intended starter value is the I, then the first
    key to be used needs to be iii.
    * In this script, the chain is used to create single notes, but the values
    in the chain can represent and be applied to any event, parameter, or 
    behavior.

* Markov Chain: a sequence of possible events in which the probability of each 
event depends only on the state attained in the previous event. See
https://en.wikipedia.org/wiki/Markov_chain

Formats necessary to calculations:

Scale template: 
* 12-element integer array representing bottom chromatic scale.
* Values >0 is the scale degree; 0 is a non-diatonic pitch.
* Example:
	"Ionian" : [1, 0, 2, 0, 3, 4, 0, 5, 0, 6, 0, 7]

Scale Object:
* 128- or greater element array containing Pitch Objects
* array indices correspond to MIDI pitch values
* Example (C Ionian):
/usr/local/bin/node ./scripter_dev/oc_guided_random_generation_2.js
[
	{"pitch":0,"degree":1,"spelling":"C"},
	{"pitch":1,"degree":0,"spelling":"C♯/D♭"},
	{"pitch":2,"degree":2,"spelling":"D"},
	{"pitch":3,"degree":0,"spelling":"D♯/E♭"},
	{"pitch":4,"degree":3,"spelling":"E"},
	{"pitch":5,"degree":4,"spelling":"F"},
	{"pitch":6,"degree":0,"spelling":"F♯/G♭"},
	{"pitch":7,"degree":5,"spelling":"G"},
	{"pitch":8,"degree":0,"spelling":"G♯/A♭"},
	{"pitch":9,"degree":6,"spelling":"A"},
	{"pitch":10,"degree":0,"spelling":"A♯/B♭"},
	{"pitch":11,"degree":7,"spelling":"B"},
	{"pitch":12,"degree":1,"spelling":"C"},
	{"pitch":13,"degree":0,"spelling":"C♯/D♭"},
	. . . 
]

Pitch Object:
* object with the following properties:
	* pitch: integer, represented as MIDI note pitch
	* degree: integer pulled from scale template
	* spelling: string representation of pitch from chromatic scale
* Example
	{"pitch":7,"degree":5,"spelling":"G"}

Chord Template:
* n-element array containing integers representing intervals from the root
* Example:
	"maj"    :   [   
      INTERVALS_STN_LIB["0 P1 d2"], 
      INTERVALS_STN_LIB["4 M3 d4"], 
      INTERVALS_STN_LIB["7 P5 d6"],
  ]

Chord Settings:
* Object containing various data types which caches defining characteristics as 
the chord string is processed
* Potential key-values pairs include the following:
  	* chord_accidental: String 
	* chord_degree: Integer
	* chord_quality: String
	* alt_bass_modifier: String
	* alt_bass_pitch: Integer
	* seventh_pitch: Boolean
* Example:
	{
		chord_accidental: "♮",
		chord_degree: 1,
		chord_quality: "maj",
		alt_bass_modifier:  "♮",
		alt_bass_pitch: 7,
		seventh_pitch: false
	}

Chord Object:
* object holding Pitch Objects with chord voice as key
	* 1: root
	* other possible keys include 3, 5, 7, 9, 11, 13, and alt_bass
* Example (I/5 chord): 
	{
		"1":{"pitch":0,"degree":1,"spelling":"C"},
		"3":{"pitch":4,"degree":3,"spelling":"E"},
		"5":{"pitch":7,"degree":5,"spelling":"G"}
		"alt_bass":{"pitch":-5,"degree":5,"spelling":"G"}
	}

Chord Modification Options:
* Object holding integers with chord voice as key. Keys match Chord Object
	* 1 denotes keeping a voice
	* 0 denotes deleting a voice
* Any futher modications are handled in code
* Example:
	"No modification" : { 
		"1" : 1, 
		"3" : 1, 
		"5" : 1, 
		"7" : 1, 
		"9" : 1, 
		"11" : 1, 
		"13" : 1, 
		"alt_bass" : 1 
	}

Progression Map:
* Object containing the following types of key-value pairs
	* "START": the first chord to be created and the weight pool the next chord
	should be pulled from.
	* Chord String: Weight pool for the given chord
* Example
{
	"START" : "I",
	"I" : {					// 4
		"1" : "bII7",		// from
		"5" : "iii",		// from
		"6" : "iv7",		// from
		"10" : "V",			// from
		"14" : "V/1",		// from
		"15" : "v",			// from
		"16" : "bVII",		// from
		"total" : 16
	},
	"bII7" : {
		"4" : "I",			// to
		"8" : "ii",			// from
		"total" : 8
	},
	"iii" : {				// 4
		"4" : "I",			// to
		"8" : "ii",			// from
		"10" : "#ii˚7",		// from
		"14" : "IV",		// to
		"18" : "V",			// from
		"22" : "vi",		// to
		"24" : "VII",		// from
		"total" : 24
	},

Weight Pool:
* Object containing the following key-value pairs:
	* Weight as Integer
	* Chord as String
	* "total" as Integer being the highest value of the weight pool.
		* The "total" value is provided to reduce the overall number of 
		operations during runtime
* values are selected by getting a random number between 1 and "total" 
value. The value is the chord string to be parsed next and is the key 
to the next weight pool.
* Example:
	"I" : {
		"1" : "bII7",
		"5" : "iii",
		"6" : "iv7",
		"10" : "V",
		"14" : "V/1",
		"15" : "v",
		"16" : "bVII",
		"total" : 16
	}

Chord String Format and Syntax:
Items in brackets [] are optional
"
	[ accidental ]
	Degree
	[ Major | Minor | Diminished | Half-Diminished | Augmented ]
	[ Suspended ]
	[ [ "add" ] extension [ Accidental ] ]
	[ "/" , alt bass ] 
"
* Degree: roman numerals I-VII, i-vii
* Major: uppercase roman numerals, `maj', `M', `Δ'
* Minor: lowercase roman numerals, `min', `m', `-'
* Diminished: `dim', `˚'
* Half Diminished: `0'
* Augmented: `aug', `+'
* suspended: `sus'
    * voice: arabic numbers 2 or 4
* Accidentals
    * sharp: `#', `♯'
    * double sharp: `♯♯', `X'
    * flat: `b', `♭'
    * double flat: `bb', `𝄫'
    * natural: `♮', no accidental assumes natural
* extensions
    * voice: arabic numbers 9-13
    * `add'
    * Accidentals
	* Omit specific voices with `o' (lowercase `o' for `omit`)
* alt bass: arabic numbers 1-7
	* number represents the scale degree, not the chord voice
    * accidentals supported

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

var PluginParameters = [];
var NeedsTimingInfo = true;

/* GLOBAL PARAMS */

/* pitch params */

const OCTAVE_CONTROL_NAME = "Octave";

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
const CHROMATIC_HALF_STEPS = 12;

/* SCALE MANAGEMENT */

/* scales */
const CHROMATIC_SCALE_STRINGS = [ "C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B" ];
const TARGET_OCTAVE_STRINGS = ["-2", "-1", "0", "1", "2", "3*", "4", "5", "6", "7", "8"];
var PITCH_STRINGS = []
// build the pitch strings
var pitch_cursor = -1;
var octave_cursor = -1;
var current_octave = "";
for ( let pitch = 0; pitch < 128; pitch++ ) {

    pitch_cursor += 1;
    if ( pitch_cursor == CHROMATIC_SCALE_STRINGS.length ) {
        pitch_cursor = 0;
    }
    
    if ( pitch_cursor == 0 ) {
        octave_cursor += 1;
        if ( octave_cursor == TARGET_OCTAVE_STRINGS.length ) {
            octave_cursor = 0;
        }
    }
    
    PITCH_STRINGS.push( CHROMATIC_SCALE_STRINGS[pitch_cursor] + " " + TARGET_OCTAVE_STRINGS[octave_cursor] + " (" + pitch + ")" );
}

// non-zero values denote diatonic values
const SCALE_TEMPLATES = {
//	"_NAME_"				: [1, 0, 2, 0, 3, 4, 0, 5, 0, 6, 0, 7],
	"Ionian"     			: [1, 0, 2, 0, 3, 4, 0, 5, 0, 6, 0, 7],
	"Dorian"    			: [1, 0, 2, 3, 0, 4, 0, 5, 0, 6, 7, 0],
	"Phyrgian"   			: [1, 2, 0, 3, 0, 4, 0, 5, 6, 0, 7, 0],
	"Lydian"     			: [1, 0, 2, 0, 3, 0, 4, 5, 0, 6, 0, 7],
	"Mixolydian" 			: [1, 0, 2, 0, 3, 4, 0, 5, 0, 6, 7, 0],
	"Aeolian"    			: [1, 0, 2, 3, 0, 4, 0, 5, 6, 0, 7, 0],
	"Locrian"    			: [1, 2, 0, 3, 0, 4, 5, 0, 6, 0, 7, 0],
	"Dorian (♯4)"    		: [1, 0, 2, 3, 0, 0, 4, 5, 0, 6, 7, 0],
	"Locrian (♯2)"    		: [1, 0, 2, 3, 0, 4, 5, 0, 6, 0, 7, 0],
	"Harmonic Minor"    	: [1, 0, 2, 3, 0, 4, 0, 5, 6, 0, 0, 7],
	"Harmonic Major"    	: [1, 0, 2, 0, 3, 0, 4, 0, 5, 6, 0, 7],
	"Hungarian Minor"   	: [1, 0, 2, 3, 0, 0, 4, 5, 6, 0, 0, 7],
	"Jazz Minor"    		: [1, 0, 2, 3, 0, 4, 0, 5, 0, 6, 0, 7],
	"Major Blues (♯2/♭3)"  	: [1, 0, 2, 3, 4, 0, 0, 5, 0, 6, 0, 0],
	"Major Blues (♯4/♭3)"  	: [1, 0, 0, 2, 0, 3, 4, 5, 0, 0, 6, 0],
	"Prometheus"			: [1, 0, 2, 0, 3, 0, 4, 0, 0, 5, 6, 0],
	"Augmented"				: [1, 0, 0, 2, 3, 0, 0, 4, 5, 0, 0, 6],
	"Diminshed"				: [1, 0, 2, 3, 0, 4, 5, 0, 6, 7, 0, 8],
	"Aeolian Dominant"		: [1, 0, 2, 0, 3, 4, 0, 5, 6, 0, 7, 0],
	"Phrygian Dominant"		: [1, 2, 0, 0, 3, 4, 0, 5, 6, 0, 7, 0],
	"Neapolitan Major"    	: [1, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7],
	"Neapolitan Minor"    	: [1, 2, 0, 3, 0, 4, 0, 5, 6, 0, 0, 7],
	"Persian"    			: [1, 2, 0, 0, 3, 4, 5, 0, 6, 0, 0, 7],
	"Double Harmonic Major"	: [1, 2, 0, 0, 3, 4, 0, 5, 6, 0, 0, 7],
	"Altered Dominant"		: [1, 2, 0, 3, 4, 0, 5, 0, 6, 0, 7, 0],
	"Major Pentatonic"		: [1, 0, 2, 0, 3, 0, 0, 4, 0, 5, 0, 0],
	"Minor Pentatonic"		: [1, 0, 0, 2, 0, 3, 0, 4, 0, 0, 5, 0],
	"Neutral Pentatonic"	: [1, 0, 2, 0, 0, 3, 0, 4, 0, 5, 0, 0]

}
const SCALE_KEYS = Object.keys(SCALE_TEMPLATES);

/* CHORD PARSING */

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
const TOKEN_QUALITY_SECOND = "2";
const TOKEN_QUALITY_FOURTH = "4";
const TOKEN_QUALITY_FIFTH = "5";
const TOKEN_QUALITY_SIXTH = "6";
const TOKEN_QUALITY_SEVENTH = "7";
const TOKEN_QUALITY_EIGHTH = "8";
const TOKEN_QUALITY_NINTH = "9";
const TOKEN_QUALITY_TENTH = "10";
const TOKEN_QUALITY_ELEVENTH = "11";
const TOKEN_QUALITY_TWELVTH = "12";
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
const TOKEN_QUALITY_OMIT = "o" // `o` for omit

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

/* CHORD PROGRESSION MAPS */

// stores the scale as calculated
var SCALE_MAP = {}
// the store from which pitches are selected
var NOTE_PITCH_POOL = [];

// maps
const MAP_MAJOR_FULL 			= {"START":"I","I":{"1":"bII7","5":"iii","6":"iv7","10":"V","14":"V/1","15":"v","16":"bVII","total":16},"I/3":{"4":"I","8":"ii","12":"IV","total":12},"I/5":{"4":"I","8":"ii","12":"IV","13":"#iv7b5","17":"V","18":"bVI7","19":"bVII9","total":19},"i6":{"4":"I","6":"II","8":"V/2","total":8},"#i˚7":{"4":"I","8":"ii","total":8},"II":{"4":"I","8":"V","9":"vi7b5/3","total":9},"bII7":{"4":"I","8":"ii","total":8},"ii":{"4":"I","5":"I/3","9":"I/5","10":"#i˚7","11":"bII7","15":"iii","19":"IV","20":"iv7","24":"V","26":"V/2","28":"VI","29":"vi7b5/3","total":29},"#ii˚7":{"4":"I","8":"iii","total":8},"III":{"4":"I","5":"#v˚7","9":"vi","10":"vii7b5","total":10},"iii7b5":{"4":"I","8":"IV","10":"VI","total":10},"iii":{"4":"I","8":"ii","10":"#ii˚7","14":"IV","18":"V","22":"vi","24":"VII","total":24},"IV":{"4":"I","5":"I/3","9":"I/5","13":"ii","17":"iii","18":"iii7b5","22":"V","26":"vi","total":26},"bIV":{"4":"I","5":"bVII","6":"bVII","total":6},"IV/1":{"4":"I","total":4},"iv7":{"4":"I","8":"I","12":"ii","total":12},"#iv7b5":{"4":"I","8":"I/5","12":"V","14":"VII","total":14},"V":{"4":"I","8":"I","12":"I/5","14":"ii","16":"II","20":"iii","24":"IV","25":"#iv7b5","29":"vi","33":"vi","total":33},"V/1":{"4":"I","total":4},"V/2":{"4":"I","5":"i6","9":"ii","total":9},"v":{"4":"I","total":4},"#v˚7":{"4":"I","6":"III","total":6},"VI":{"4":"I","8":"ii","9":"iii7b5","total":9},"bVI7":{"4":"I","8":"I/5","10":"bVI7","total":10},"vi":{"4":"I","6":"II","8":"III","12":"iii","16":"IV","20":"IV","24":"V","28":"V","total":28},"vi7b5/3":{"4":"I","6":"II","10":"ii","14":"ii","total":14},"VII":{"4":"I","8":"iii","9":"#iv7b5","total":9},"bVII":{"4":"I","8":"I","9":"bIV","10":"bIV","total":10},"bVII9":{"4":"I","8":"I/5","total":8},"vii7b5":{"4":"I","6":"III","8":"III","total":8}}
const MAP_IONIAN_TRIAD 			= {"START":"I","I":{"1":"I","4":"iii","13":"V","total":13,"weight":4},"ii":{"1":"ii","3":"IV","5":"vi","total":5,"weight":2},"iii":{"1":"iii","4":"V","6":"vii˚","total":6,"weight":3},"IV":{"1":"IV","3":"vi","13":"I","total":13,"weight":2},"V":{"1":"V","3":"vii˚","5":"ii","total":5,"weight":3},"vi":{"1":"vi","5":"I","8":"iii","total":8,"weight":2},"vii˚":{"1":"vii˚","3":"ii","5":"IV","total":5,"weight":2}}
const MAP_DORIAN_TRIAD 			= {"START":"i","i":{"1":"i","3":"III","5":"v","total":5,"weight":3},"ii":{"1":"ii","4":"IV","13":"vi˚","total":13,"weight":3},"III":{"1":"III","3":"v","5":"VII","total":5,"weight":2},"IV":{"1":"IV","4":"vi˚","13":"i","total":13,"weight":3},"v":{"1":"v","3":"VII","6":"ii","total":6,"weight":2},"vi˚":{"1":"vi˚","4":"i","6":"III","total":6,"weight":3},"VII":{"1":"VII","4":"ii","13":"IV","total":13,"weight":2}}
const MAP_PHRYGIAN_TRIAD 		= {"START":"i","i":{"1":"i","3":"III","6":"v˚","total":6,"weight":3},"II":{"1":"II","3":"iv","5":"VI","total":5,"weight":3},"III":{"1":"III","4":"v˚","13":"vii","total":13,"weight":2},"iv":{"1":"iv","3":"VI","6":"i","total":6,"weight":2},"v˚":{"1":"v˚","4":"vii","13":"II","total":13,"weight":3},"VI":{"1":"VI","4":"i","6":"III","total":6,"weight":2},"vii":{"1":"vii","4":"II","6":"iv","total":6,"weight":3}}
const MAP_LYDIAN_TRIAD 			= {"START":"I","I":{"1":"I","3":"iii","5":"V","total":5,"weight":3},"II":{"1":"II","4":"iv˚","6":"vi","total":6,"weight":3},"iii":{"1":"iii","3":"V","6":"vii","total":6,"weight":2},"iv˚":{"1":"iv˚","3":"vi","6":"I","total":6,"weight":3},"V":{"1":"V","4":"vii","13":"II","total":13,"weight":2},"vi":{"1":"vi","4":"I","6":"iii","total":6,"weight":2},"vii":{"1":"vii","4":"II","13":"iv˚","total":13,"weight":3}}
const MAP_MIXOLYDIAN_TRIAD 		= {"START":"I","I":{"1":"I","4":"iii˚","13":"v","total":13,"weight":3},"ii":{"1":"ii","3":"IV","5":"vi","total":5,"weight":2},"iii˚":{"1":"iii˚","4":"v","13":"VII","total":13,"weight":3},"IV":{"1":"IV","3":"vi","6":"I","total":6,"weight":2},"v":{"1":"v","4":"VII","6":"ii","total":6,"weight":3},"vi":{"1":"vi","4":"I","13":"iii˚","total":13,"weight":2},"VII":{"1":"VII","3":"ii","5":"IV","total":5,"weight":3}}
const MAP_AEOLIAN_TRIAD 		= {"START":"i","i":{"1":"i","4":"III","13":"v","total":13,"weight":4},"ii˚":{"1":"ii˚","3":"iv","5":"VI","total":5,"weight":2},"III":{"1":"III","4":"v","6":"VII","total":6,"weight":3},"iv":{"1":"iv","3":"VI","13":"i","total":13,"weight":2},"v":{"1":"v","3":"VII","5":"ii˚","total":5,"weight":3},"VI":{"1":"VI","5":"i","8":"III","total":8,"weight":2},"VII":{"1":"VII","3":"ii˚","5":"iv","total":5,"weight":2}}
const MAP_LOCRIAN_TRIAD 		= {"START":"i˚","i˚":{"1":"i˚","4":"iii","13":"V","total":13,"weight":4},"II":{"1":"II","3":"iv","5":"VI","total":5,"weight":2},"iii":{"1":"iii","4":"V","6":"vii","total":6,"weight":3},"iv":{"1":"iv","3":"VI","13":"i˚","total":13,"weight":2},"V":{"1":"V","3":"vii","5":"II","total":5,"weight":3},"VI":{"1":"VI","5":"i˚","8":"iii","total":8,"weight":2},"vii":{"1":"vii","3":"II","5":"iv","total":5,"weight":2}}
const MAP_IONIAN_7 				= {"START":"I7","I7":{"1":"I7","4":"iii7","7":"V7","9":"vii˚7","total":9,"weight":4},"ii7":{"1":"ii7","3":"IV7","6":"vi7","10":"I7","total":10,"weight":2},"iii7":{"1":"iii7","4":"V7","6":"vii˚7","8":"ii7","total":8,"weight":3},"IV7":{"1":"IV7","4":"vi7","8":"I7","11":"iii7","total":11,"weight":2},"V7":{"1":"V7","3":"vii˚7","5":"ii7","7":"IV7","total":7,"weight":3},"vi7":{"1":"vi7","5":"I7","8":"iii7","11":"V7","total":11,"weight":3},"vii˚7":{"1":"vii˚7","3":"ii7","5":"IV7","8":"vi7","total":8,"weight":2}}
const MAP_DORIAN_7 				= {"START":"i7","i7":{"1":"i7","3":"III7","5":"v7","8":"VII7","total":8,"weight":3},"ii7":{"1":"ii7","4":"IV7","7":"vi˚7","10":"i7","total":10,"weight":3},"III7":{"1":"III7","3":"v7","6":"VII7","9":"ii7","total":9,"weight":2},"IV7":{"1":"IV7","4":"vi˚7","7":"i7","9":"III7","total":9,"weight":3},"v7":{"1":"v7","4":"VII7","7":"ii7","10":"IV7","total":10,"weight":2},"vi˚7":{"1":"vi˚7","4":"i7","6":"III7","8":"v7","total":8,"weight":3},"VII7":{"1":"VII7","4":"ii7","7":"IV7","10":"vi˚7","total":10,"weight":3}}
const MAP_PHRYGIAN_7 			= {"START":"i7","i7":{"1":"i7","4":"III7","7":"v˚7","10":"vii7","total":10,"weight":3},"II7":{"1":"II7","3":"iv7","5":"VI7","8":"i7","total":8,"weight":3},"III7":{"1":"III7","4":"v˚7","7":"vii7","10":"II7","total":10,"weight":3},"iv7":{"1":"iv7","3":"VI7","6":"i7","9":"III7","total":9,"weight":2},"v˚7":{"1":"v˚7","4":"vii7","7":"II7","9":"iv7","total":9,"weight":3},"VI7":{"1":"VI7","4":"i7","7":"III7","10":"v˚7","total":10,"weight":2},"vii7":{"1":"vii7","4":"II7","6":"iv7","8":"VI7","total":8,"weight":3}}
const MAP_LYDIAN_7 				= {"START":"I7","I7":{"1":"I7","3":"iii7","6":"V7","9":"vii7","total":9,"weight":3},"II7":{"1":"II7","4":"iv˚7","6":"vi7","9":"I7","total":9,"weight":3},"iii7":{"1":"iii7","4":"V7","7":"vii7","10":"II7","total":10,"weight":2},"iv˚7":{"1":"iv˚7","3":"vi7","6":"I7","8":"iii7","total":8,"weight":3},"V7":{"1":"V7","4":"vii7","7":"II7","10":"iv˚7","total":10,"weight":3},"vi7":{"1":"vi7","4":"I7","6":"iii7","9":"V7","total":9,"weight":2},"vii7":{"1":"vii7","4":"II7","7":"iv˚7","9":"vi7","total":9,"weight":3}}
const MAP_MIXOLYDIAN_7 			= {"START":"I7","I7":{"1":"I7","4":"iii˚7","7":"v7","10":"VII7","total":10,"weight":4},"ii7":{"1":"ii7","3":"IV7","5":"vi7","9":"I7","total":9,"weight":2},"iii˚7":{"1":"iii˚7","4":"v7","7":"VII7","9":"ii7","total":9,"weight":3},"IV7":{"1":"IV7","3":"vi7","7":"I7","10":"iii˚7","total":10,"weight":2},"v7":{"1":"v7","4":"VII7","6":"ii7","8":"IV7","total":8,"weight":3},"vi7":{"1":"vi7","5":"I7","8":"iii˚7","11":"v7","total":11,"weight":2},"VII7":{"1":"VII7","3":"ii7","5":"IV7","7":"vi7","total":7,"weight":3}}
const MAP_AEOLIAN_7 			= {"START":"i7","i7":{"1":"i7","4":"III7","7":"v7","9":"VII7","total":9,"weight":4},"ii˚7":{"1":"ii˚7","3":"iv7","6":"VI7","10":"i7","total":10,"weight":2},"III7":{"1":"III7","4":"v7","6":"VII7","8":"ii˚7","total":8,"weight":3},"iv7":{"1":"iv7","4":"VI7","8":"i7","11":"III7","total":11,"weight":2},"v7":{"1":"v7","3":"VII7","5":"ii˚7","7":"iv7","total":7,"weight":3},"VI7":{"1":"VI7","5":"i7","8":"III7","11":"v7","total":11,"weight":3},"VII7":{"1":"VII7","3":"ii˚7","5":"iv7","8":"VI7","total":8,"weight":2}}
const MAP_LOCRIAN_7 			= {"START":"i˚7","i˚7":{"1":"i˚7","4":"iii7","7":"V7","9":"vii7","total":9,"weight":4},"II7":{"1":"II7","3":"iv7","6":"VI7","10":"i˚7","total":10,"weight":2},"iii7":{"1":"iii7","4":"V7","6":"vii7","8":"II7","total":8,"weight":3},"iv7":{"1":"iv7","4":"VI7","8":"i˚7","11":"iii7","total":11,"weight":2},"V7":{"1":"V7","3":"vii7","5":"II7","7":"iv7","total":7,"weight":3},"VI7":{"1":"VI7","5":"i˚7","8":"iii7","11":"V7","total":11,"weight":3},"vii7":{"1":"vii7","3":"II7","5":"iv7","8":"VI7","total":8,"weight":2}}
const MAP_RO8_MAJOR				= {"START":"I/1","I/1":{"3":"IVadd6/4","7":"V/5","8":"vii˚add6/7","total":8,"weight":4},"iiadd4o5add6/2":{"4":"V/5","total":4,"weight":2},"iiio5add6/3":{"3":"IVadd6/4","5":"viadd6/6","total":5,"weight":3},"IVadd6/4":{"2":"iiadd4o5add6/2","total":2,"weight":3},"V/5":{"4":"I/1","7":"iiio5add6/3","9":"viadd6/6","10":"vii˚add6/7","total":10,"weight":4},"viadd6/6":{"2":"iiadd4o5add6/2","5":"IVadd6/4","total":5,"weight":2},"vii˚add6/7":{"3":"iiio5add6/3","total":3,"weight":1}}
const MAP_RO8_MINOR				= {"START":"i/1","i/1":{"3":"ivadd6","7":"v/5","8":"VIIadd6/7","total":8,"weight":4},"ii˚add4o5add6/2":{"4":"v/5","total":4,"weight":2},"IIIo5add6/3":{"3":"ivadd6","5":"VIo5add6/6","total":5,"weight":3},"ivadd6":{"2":"ii˚add4o5add6/2","total":2,"weight":3},"v/5":{"4":"i/1","7":"IIIo5add6/3","9":"VIo5add6/6","10":"VIIadd6/7","total":10,"weight":4},"VIo5add6/6":{"2":"ii˚add4o5add6/2","5":"ivadd6","total":5,"weight":2},"VIIadd6/7":{"3":"IIIo5add6/3","total":3,"weight":1}}

const PROGRESSION_MAPS = {
  "Major Full" : MAP_MAJOR_FULL,
  "Ionian [ I, ii, iii, IV, V, vi, vii˚ ]" : MAP_IONIAN_TRIAD,
  "Dorian [ i, ii, III, IV, v, vi˚, VII ]" : MAP_DORIAN_TRIAD,
  "Phrygian [ i, II, III, iv, v˚, VI, vii ]" : MAP_PHRYGIAN_TRIAD,
  "Lydian [ I, II, iii, iv˚, V, vi, vii ]" : MAP_LYDIAN_TRIAD,
  "Mixolydian [ I, ii, iii˚, IV, v, vi, VII ]" : MAP_MIXOLYDIAN_TRIAD,
  "Aeolian [ i, ii˚,III, iv, v, VI, VII ]" : MAP_AEOLIAN_TRIAD,
  "Locrian [ i˚, II, iii, iv, V, VI, vii ]" : MAP_LOCRIAN_TRIAD,
  "Ionian 7 [ I7, ii7, iii7, IV7, V7, vi7, vii˚7 ]" : MAP_IONIAN_7,
  "Dorian 7 [ i7, ii7, III7, IV7, v7, vi˚7, VII7 ]" : MAP_DORIAN_7,
  "Phrygian 7 [ i7, II7, III7, iv7, v˚7, VI7, vii7 ]" : MAP_PHRYGIAN_7,
  "Lydian 7 [ I7, II7, iii7, iv˚7, V7, vi7, vii7 ]" : MAP_LYDIAN_7,
  "Mixolydian 7 [ I7, ii7, iii˚7, IV7, v7, vi7, VII7 ]" : MAP_MIXOLYDIAN_7,
  "Aeolian 7 [ i7, ii˚7,III7, iv7, v7, VI7, VII7 ]" : MAP_AEOLIAN_7,
  "Locrian 7 [ i˚7, II7, iii7, iv7, V7, VI7, vii7 ]" : MAP_LOCRIAN_7,
  "Rule of Octave Major" : MAP_RO8_MAJOR,
  "Rule of Octave Minor" : MAP_RO8_MINOR
};

const PROGRESSION_MAP_KEYS = Object.keys( PROGRESSION_MAPS );

/* CHORD BUILD */

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
  "aug"    :   [   
	INTERVALS_STN_LIB["0 P1 d2"], 
	INTERVALS_STN_LIB["4 M3 d4"], 
	INTERVALS_STN_LIB["8 m6 A5"],
  ]
};

const CHORD_VOICE_KEYS = ["1", "3", "5", "7"];
const CHORD_VOICE_KEY_ALT_BASS = "alt_bass"

/* CHORD MODIFICATION */
const CHORD_VOICE_OPTIONS = {
	"No modification"						: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 1, "alt_bass" : 1 },
	"Triad (1, 3, 5, alt bass)"				: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 0, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 1 },
	"7th (1, 3, 5, 7, alt bass)"			: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 1 },
	"Exc. 5th (1, 3, 7, alt bass)"			: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 0, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 1 },
	"Extensions (9, 11, 13)"				: { "1" : 0, "2" : 0, "3" : 0, "4" : 0, "5" : 0, "6" : 0, "7" : 0, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 1, "alt_bass" : 0 },
	"Pentatonic (1, 3, 5, 9, 11)"			: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 0, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Exclude Minor 9ths"					: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 1, "alt_bass" : 1 },
	"Pop VII/I (11 chord req.)"				: { "1" : 0, "2" : 0, "3" : 0, "4" : 0, "5" : 0, "6" : 0, "7" : 1, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Pop II/I (13 chord req.)"				: { "1" : 0, "2" : 0, "3" : 0, "4" : 0, "5" : 0, "6" : 0, "7" : 0, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 1, "alt_bass" : 0 },
	"Drop 2 (1342)"							: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Drop 3 (1243)"							: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Drop 2+3 (1423)"						: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Drop 2+4 (1324)"						: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Rootless (3, 5, 7, 9, alt bass)"		: { "1" : 0, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 0, "7" : 1, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 1, "alt_bass" : 0 },
	"Rootless V7 (3, 7, 9, 13, alt bass)"	: { "1" : 0, "2" : 0, "3" : 1, "4" : 0, "5" : 0, "6" : 0, "7" : 1, "8" : 0, "9" : 1, "10" : 0, "11" : 1, "12" : 0, "13" : 1, "alt_bass" : 0 },
	"Shell (1, 3, 7, alt bass)"				: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 0, "6" : 0, "7" : 1, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Rule of Octave II chord (1, 3, 4, 6)"	: { "1" : 1, "2" : 0, "3" : 1, "4" : 1, "5" : 0, "6" : 1, "7" : 0, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Rule of Octave IV chord (1, 3, 5, 6)"	: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 1, "7" : 0, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Rule of Octave VI chord (1, 3, 6)"		: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 0, "6" : 1, "7" : 0, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 },
	"Rule of Octave VII chord (1, 3, 5, 6)"	: { "1" : 1, "2" : 0, "3" : 1, "4" : 0, "5" : 1, "6" : 1, "7" : 0, "8" : 0, "9" : 0, "10" : 0, "11" : 0, "12" : 0, "13" : 0, "alt_bass" : 0 }
};

const CHORD_VOICE_OPTIONS_KEYS = Object.keys( CHORD_VOICE_OPTIONS );
const CHORD_VOICE_MODIFIER_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "alt_bass"];

const CHORD_VOICE_OPTION_KEY_NO_MOD = "No modification";				
const CHORD_VOICE_OPTION_KEY_TRIAD = "Triad (1, 3, 5, alt bass)"		
const CHORD_VOICE_OPTION_KEY_SEVENTH = "7th (1, 3, 5, 7, alt bass)";		
const CHORD_VOICE_OPTION_KEY_EXC_FIFTH = "Exc. 5th (1, 3, 7, alt bass)";		
const CHORD_VOICE_OPTION_KEY_EXTENSIONS = "Extensions (9, 11, 13)";			
const CHORD_VOICE_OPTION_KEY_PENTATONIC = "Pentatonic (1, 3, 5, 9, 11)";		
const CHORD_VOICE_OPTION_KEY_EXCLUDE_MINOR_NINTHS = "Exclude Minor 9ths";				
const CHORD_VOICE_OPTION_KEY_POP_SEVEN_OVER_ONE= "Pop VII/I";							
const CHORD_VOICE_OPTION_KEY_POP_TWO_OVER_ONE = "Pop II/I";							
const CHORD_VOICE_OPTION_KEY_DROP_TWO = "Drop 2 (1342)";						
const CHORD_VOICE_OPTION_KEY_DROP_THREE = "Drop 3 (1243)";						
const CHORD_VOICE_OPTION_KEY_DROP_TWO_THREE = "Drop 2+3 (1423)";					
const CHORD_VOICE_OPTION_KEY_DROP_TWO_FOUR = "Drop 2+4 (1324)";					
const CHORD_VOICE_OPTION_KEY_ROOTLESS = "Rootless (3, 5, 7, 9, alt bass)";	
const CHORD_VOICE_OPTION_KEY_ROOTLESS_SEVENTH = "Rootless V7 (3, 7, 9, 13, alt bass)";
const CHORD_VOICE_OPTION_KEY_SHELL = "Shell (3, 7, alt bass)";	
const CHORD_VOICE_OPTION_KEY_RO8_II = "Rule of Octave II chord (1, 3, 4, 6)";
const CHORD_VOICE_OPTION_KEY_RO8_IV = "Rule of Octave IV chord (1, 3, 5, 6)";	
const CHORD_VOICE_OPTION_KEY_RO8_VI = "Rule of Octave VI chord (1, 3, 6)";
const CHORD_VOICE_OPTION_KEY_RO8_VII = "Rule of Octave VII chord (1, 3, 5, 6)";

const NOTE_LENGTHS_LIB = {
    "1/64"		:	0.063,
	"1/64d"		:	0.094,
	"1/64t"		:	0.021,
	"1/32"		:	0.125,
	"1/32d"		:	0.188,
	"1/32t"		:	0.042,
	"1/16"		:	0.250,
	"1/16d"		:	0.375,
	"1/16t"		:	0.083,
	"1/8"		:	0.500,
	"1/8d"		:	0.750,
	"1/8t"		:	0.167,
	"1/4"		:	1.000,
	"1/4d"		:	1.500,
	"1/4t"		:	0.333,
	"1/2"		:	2.000,
	"1/2d"		:	3.000,
	"1/2t"		:	0.667,
	"1 bar"		:	4.000,
	"1.5 bars"	:	6.000,
	"2 bars"	:	8.000,
	"4 bars"	:	16.000,
	"8 bars"	:	32.000
};
var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

/* PARAMETER CONTROLS */

// control order models full calculation and modification sequence

// 0
PluginParameters.push({
	name: "Chord Generation",
	type: "text"
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
	defaultValue:0
});

// 3
PluginParameters.push({
	name:"Progression Map", 
	type:"menu", 
	valueStrings:PROGRESSION_MAP_KEYS, 
	defaultValue:0
});

// 4
PluginParameters.push({
	name: "Chord Types",
	type: "text"
});

// 5
PluginParameters.push({
	name:"Voice Modification", 
	type:"menu", 
	valueStrings:CHORD_VOICE_OPTIONS_KEYS, 
	defaultValue:0
});

// 6-19
CHORD_VOICE_MODIFIER_KEYS.forEach( function( voice_key ) {
	PluginParameters.push({
		name:"Play/Mute " + voice_key, 
		type:"checkbox", 
		valueStrings:voice_key, 
		defaultValue:1
	});
});

// 20
PluginParameters.push({
	name: "Transpositions",
	type: "text"
});

// 21
PluginParameters.push({
	name:"Target Octave", 
	type:"menu", 
	valueStrings:TARGET_OCTAVE_KEYS, 
	defaultValue:5
});

// 22
PluginParameters.push({
	name:"Transpose High Fulcrum", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:71
});

// 23
PluginParameters.push({
	name:"Transpose Low Fulcrum", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:60
});

// 24
PluginParameters.push({
	name:"Semitones", 
	type:"lin", 
	minValue:-36, 
	maxValue:36, 
	numberOfSteps:72, 
	defaultValue:0
});

// 25
PluginParameters.push({
	name:"Chord Play Length", 
	type:"menu", 
	valueStrings: NOTE_LENGTH_KEYS,
	defaultValue: 18
});

/* RUNTIME */

var PARAM_SCALE_ROOT = GetParameter( 1 );
var PARAM_SCALE_TYPE = GetParameter( 2 );
var PARAM_MAP = PROGRESSION_MAPS[PROGRESSION_MAP_KEYS[GetParameter( 3 )]];
var CHORD_VOICE_SETTINGS = CHORD_VOICE_OPTIONS[CHORD_VOICE_OPTIONS_KEYS[GetParameter( 5 )]];
var PARAM_TARGET_OCTAVE = GetParameter( 21 );
var PARAM_TRANSPOSE_HIGH_FULCRUM = GetParameter( 22 );
var PARAM_TRANSPOSE_LOW_FULCRUM = GetParameter( 23 );
var PARAM_SEMITONES = GetParameter( 24 );
var PARAM_CHORD_PLAY_LENGTH = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter( 25 )]];

var MAP_LAST_SELECTION = "";
var MAP_STARTED = false;

var SCALE = calculate_scale_pitches( GetParameter( 1), GetParameter( 2 ) );

// Used by beatToSchedule and TRIGGER to align musically
// determines how many notes are in the time siqnature denominator
// 0.25 = 1/1 note, 1 = 1/4 note, 4 = 1/16, 8 = 1/32
const TIME_SIG_DENOM_DIVISION = 16; // beatToSchedule results in 1/64 notes

// the trigger variable is where the next note (or rest) is to be played
// trigger is global to track it across process blocks
// the cursor is a simulated location of the transport/playhead in the track
// cursor is handled locally because only the current process block matters while playing
const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001; // smallest note length = 0.125

// currently set up to only track one played note at a time.
var ACTIVE_RGEN_NOTES = [];

var ACTIVE_LIVE_NOTES = {};

var UPDATING_CONTROLS = false;

/* TESTING */

// test();

// function test() {
// 	// assumes map selected and scale built in global defaults
// 	// output the Start Chord
// 	// let string = MAP.START;

// 	let tonic = 0;
// 	// let chord_strings = ['I', 'i', 'i˚', 'I0', 'I+', 'I7', 'I9', 'I11', 'I13', 'I/3', 'I/5', 'i6', '#i˚7', 'II', 'bII7', 'ii', '#ii˚7', 'III', 'iii7b5', 'iii', 'IV', 'bIV', 'IV/1', 'iv7', '#iv7b5', 'V', 'V/1', 'V/2', 'v', '#v˚7', 'VI', 'bVI7', 'vi', 'vi7b5/3', 'VII', 'bVII', 'bVII9', 'vii7b5'];	;
// 	let chord_strings = ['I13'];
// 	// chord_strings.splice(0, 1);
// 	console.log(chord_strings);
// 	chord_strings.forEach( function ( chord_string ) {
// 		console.log( chord_string );
// 		let chord = create_chord_from_spelling( chord_string, SCALE, tonic );
// 		console.log( JSON.stringify( chord ) );
// 		CHORD_VOICE_OPTIONS_KEYS.forEach( function ( key ) {
// 			let options = CHORD_VOICE_OPTIONS[key];
// 			let chord_modified = modify_chord( key, options, copy_object( chord ) );
// 			console.log( chord_string + " --> " + key );
// 			console.log( JSON.stringify( chord_modified ) );
// 		});
// 	});
// }

/* SCRIPTER FUNCTIONS */

function HandleMIDI( event ) {
	event.send();
}

function ProcessMIDI() {
	var timing_info = GetTimingInfo();

	// PARAM_SCALE_ROOT = 0;
	// PARAM_SCALE_TYPE = 0;
	// PARAM_MAP = PROGRESSION_MAPS[PROGRESSION_MAP_KEYS[GetParameter( 3 )]];
	// CHORD_VOICE_SETTINGS = CHORD_VOICE_OPTIONS[CHORD_VOICE_OPTIONS_KEYS[GetParameter( 5 )]];
	// PARAM_TARGET_OCTAVE = TARGET_OCTAVE_LIB["3 (Middle C)"];
	// PARAM_TRANSPOSE_HIGH_FULCRUM = 71;
	// PARAM_TRANSPOSE_LOW_FULCRUM = 60;
	// PARAM_SEMITONES = 0;

	// when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
	if ( timing_info.playing ){
		// init the values to calculate beats
		var beatToSchedule = align_beat_to_bar_division( timing_info.blockStartBeat, TIME_SIG_DENOM_DIVISION );
		if ( TRIGGER == RESET_VALUE ) {
			TRIGGER = beatToSchedule;
		}

		// loop through the beats that fall within this buffer
		while ( beats_fall_within_buffer( beatToSchedule, timing_info ) ) {
			// adjust for cycle
			beatToSchedule = handle_beat_wraparound( beatToSchedule, timing_info );
			TRIGGER = handle_beat_wraparound( TRIGGER, timing_info );

			// the cursor has come to the trigger
			if ( beatToSchedule == TRIGGER ) {
				
				//  select a pitch from the selected markov chain
				let iteration_key = "";
				let pool = {};
				let iteration_selection = "";

				if ( !MAP_STARTED ) {
					iteration_selection = PARAM_MAP["START"];
					MAP_STARTED = true;
					MAP_LAST_SELECTION = iteration_selection;
				} else {
					iteration_key = MAP_LAST_SELECTION;
					pool = PARAM_MAP[ iteration_key ];
					if ( !pool ) {
						iteration_key = PARAM_MAP["START"];
						pool = PARAM_MAP[ iteration_key ];
					}
					iteration_selection = getRandomValueFromWeightPool( pool );
					MAP_LAST_SELECTION = iteration_selection;
				}
				
				// build the chord from the iteration selection
				let chord = create_chord_from_spelling( iteration_selection, SCALE, PARAM_SCALE_ROOT );

				// modify the chord
				// transpose the notes in the chord
				// to target octave
				// to below high fulcrum
				// to push up above low fulfcrum
				// adjust by semitones
				// play the notes

				var note_off_beat = beatToSchedule + PARAM_CHORD_PLAY_LENGTH;
				note_off_beat = handle_beat_wraparound(note_off_beat, timing_info);

				// advance the trigger
				TRIGGER += PARAM_CHORD_PLAY_LENGTH;

				CHORD_VOICE_MODIFIER_KEYS.forEach( function ( key ) {
					let pitch_obj = chord[ key ];
					if ( pitch_obj ) {
						let note_on = new NoteOn();
						let pitch = pitch_obj.pitch;
						// to target octave
						pitch = pitch + ( PARAM_TARGET_OCTAVE * CHROMATIC_HALF_STEPS );
						if ( pitch < 0 ) {
							pitch = Math.abs( pitch );
						}
						// alt_bass needs to remain a bass note
						if ( key != "alt_bass" ) {
							// to below high fulcrum
							if ( pitch > PARAM_TRANSPOSE_HIGH_FULCRUM ) {
								while ( pitch > PARAM_TRANSPOSE_HIGH_FULCRUM ) {
									pitch -= CHROMATIC_HALF_STEPS;
								}
							}

							// to above low fulcrum
							if ( pitch < PARAM_TRANSPOSE_LOW_FULCRUM ) {
								while ( pitch <= PARAM_TRANSPOSE_LOW_FULCRUM ) {
									pitch += CHROMATIC_HALF_STEPS;
								}
							}
						}
						// semitones
						if ( PARAM_SEMITONES != 0 ) {
							pitch += PARAM_SEMITONES;
						}
						note_on.pitch = pitch;
						note_on.velocity = 100;

						note_on.sendAtBeat( beatToSchedule ); 
						ACTIVE_RGEN_NOTES.push( note_on );

						let note_off = new NoteOff( note_on );

						note_off.sendAtBeat( note_off_beat );
					}
							
				});

			}

			// advance to next beat
			beatToSchedule += CURSOR_INCREMENT;
			beatToSchedule = align_beat_to_bar_division( beatToSchedule, TIME_SIG_DENOM_DIVISION );
		}
	} else {
		ACTIVE_RGEN_NOTES.forEach( function ( note_on ) {
			var note_off = new NoteOff( note_on );
			note_off.send();
		});
		cursor = timing_info.blockStartBeat;
		TRIGGER = RESET_VALUE;
		MAP_STARTED = false;	
	}
}

// aligns any float value to the beats
// ceiling used because all recordable beats are >= 1.000
function align_beat_to_bar_division( value, division ) {
    return Math.ceil( value * division ) / division;
}

// when the intended beat falls outside the cycle, wrap it proportionally 
// from the cycle start
function handle_beat_wraparound( value, timing_info ) {
    if ( timing_info.cycling && value >= timing_info.rightCycleBeat ) {
        value -= ( timing_info.rightCycleBeat - timing_info.leftCycleBeat );
    }
    return value;
}

// loop through the beats that fall within this buffer
// including beats that wrap around the cycle point
// return false by default
function beats_fall_within_buffer ( beatToSchedule, timing_info ) {
    let lookAheadEnd = timing_info.blockEndBeat;
    let cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
    let cycleEnd = lookAheadEnd - cycleBeats;
    if ( beatToSchedule >= timing_info.blockStartBeat && beatToSchedule < lookAheadEnd || (timing_info.cycling && beatToSchedule < cycleEnd)) {
        return true;
    }
    return false;
}

function ParameterChanged( param , value ) {
	if ( UPDATING_CONTROLS ) {
		return;
	}
	switch (param) {
		case 0:
			// Chord Generation; text only
		break;
		case 1:
			// Scale Root; menu --> MIDI Pitch value
			PARAM_SCALE_ROOT = value;
			SCALE = calculate_scale_pitches( PARAM_SCALE_ROOT , PARAM_SCALE_TYPE );
		break;
		case 2:
			// Scale Type; menu --> key
			PARAM_SCALE_TYPE = value;
			SCALE = calculate_scale_pitches( PARAM_SCALE_ROOT , PARAM_SCALE_TYPE );
		break;
		case 3:
			// Progression Map; menu
			PARAM_MAP = PROGRESSION_MAPS[ PROGRESSION_MAP_KEYS[ value ] ];
			Trace( PROGRESSION_MAP_KEYS[ value ] );
			MAP_STARTED = false;
		break;
		case 4:
			// Chord Types; text only
		break;
		case 5:
			// Voice Modification; menu
			CHORD_VOICE_SETTINGS = CHORD_VOICE_OPTIONS[CHORD_VOICE_OPTIONS_KEYS[value]];
			// changes will happen on next chord calc
			Trace(CHORD_VOICE_OPTIONS_KEYS[value]);
			UPDATING_CONTROLS = true;
			let cursor = 6;
			CHORD_VOICE_MODIFIER_KEYS.forEach( function ( voice_key ) {
				SetParameter( cursor, CHORD_VOICE_SETTINGS[ voice_key ] );
				cursor++;
			});
			UPDATING_CONTROLS = false;
		break;

		case 6:
			CHORD_VOICE_SETTINGS["1"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 7:
			CHORD_VOICE_SETTINGS["2"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 8:
			CHORD_VOICE_SETTINGS["3"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 9:
			CHORD_VOICE_SETTINGS["4"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 10:
			CHORD_VOICE_SETTINGS["5"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 11:
			CHORD_VOICE_SETTINGS["6"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 12:
			CHORD_VOICE_SETTINGS["7"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 13:
			CHORD_VOICE_SETTINGS["8"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 14:
			CHORD_VOICE_SETTINGS["9"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 15:
			CHORD_VOICE_SETTINGS["10"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 16:
			CHORD_VOICE_SETTINGS["11"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 17:
			CHORD_VOICE_SETTINGS["12"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 18:
			CHORD_VOICE_SETTINGS["13"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 19:
			CHORD_VOICE_SETTINGS["alt_bass"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 20:
			// Transpositions; text only
			break;
		case 21:
			// Target Octave; menu
			PARAM_TARGET_OCTAVE = TARGET_OCTAVE_LIB[TARGET_OCTAVE_KEYS[value]];
			break;
		case 22:
			// Transpose High Fulcrum; menu
			PARAM_TRANSPOSE_HIGH_FULCRUM = value;
			Trace(PARAM_TRANSPOSE_HIGH_FULCRUM);
			break;
		case 23:
			// Transpose Low Fulcrum; menu
			PARAM_TRANSPOSE_LOW_FULCRUM = value;
			Trace(PARAM_TRANSPOSE_LOW_FULCRUM);
			break;
		case 24:
			// Semitones; linear slider
			PARAM_SEMITONES = value;
			Trace(PARAM_SEMITONES);
			break;
		case 25:
			// Chord Play Length; menu
			PARAM_CHORD_PLAY_LENGTH = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[ value ]];
			Trace(PARAM_CHORD_PLAY_LENGTH);
			break;
		default:
			Trace("ERROR: ParameterChanged( " + param + " , " + value + " )" );
	}
}

/* SCALE MANAGEMENT */

function calculate_scale_pitches( root, templateIndex ) {
	// root index maps directly to MIDI pitches 0-11
	var template = SCALE_TEMPLATES[SCALE_KEYS[templateIndex]];
	// init
	let cache = [];
	for ( let index = 0 ; index < template.length ; index++ ) {
    	const degree = template[index];
    	let pitch = root + index;
		cache[pitch] = {
			"pitch" : pitch,
			"degree" : degree
		};
  }
		
	// normalize to octave C-2 (MIDI pitches 0-11)
  let normalized = [];
  cache.forEach( function ( pitch_object ) {
    if ( pitch_object.pitch >= 12 ) {
      // transpose the pitch down a chromatic octave
      pitch_object.pitch = pitch_object.pitch - 12;
    }
    pitch_object.spelling = CHROMATIC_SCALE_STRINGS[ pitch_object.pitch ];
    normalized[ pitch_object.pitch ] = pitch_object;
  });

  // expand pitches to full 128 (plus a little more just in case we need a bit more room to calculate)
  let scale_object = [];
  for (let octave = 0; octave < 12; octave++) {
    normalized.forEach( function ( pitch_object ) {
        scale_object.push( {
          "pitch" : pitch_object.pitch + ( octave * 12 ),
          "degree" : pitch_object.degree,
          "spelling" : pitch_object.spelling
        });
    });
  }
//   console.log(JSON.stringify(scale_object));
  return scale_object;
}

/* CHORD PARSING */

function get_chord_voice_from_scale( degree, scale, tonic ) {
  let degrees = 1; // tonic to degree = interval
  let scale_index = tonic - 1; // start 1 back to ensure correct output
  while ( degrees <= degree ) {
      scale_index++;
      let pitch = scale[scale_index];

      if ( !pitch ) {
        console.log( "ERROR: get_chord_voice_from_scale: " + pitch );
        return null;
      }

      if ( pitch.degree != 0 ) {
          degrees++;
      }
  };
  	// duplicate the pitch object so that the original instances don't get modified
	let result = scale[scale_index];
	if ( result ) {
		return copy_object( result );
	} else {
		console.log( "ERROR: get_chord_voice_from_scale: scale[ scale_index = " + scale_index + " ]" );
		return undefined;
	}
}

function create_chord_from_spelling( str, scale, tonic ) {

  let pitches = {};
  // capture the spelling for destructive editing to capture alternate bass
  let chord_spelling = str;
  // cache for parsing
  let chord_settings = {};
  let cursor = 0;

  Trace(chord_spelling);

  // does the chord have an accidental?
  if ( chord_spelling.charAt(0) != undefined && chord_spelling.charAt(0) == TOKEN_FLAT_ALPHA ) {
      chord_settings.chord_accidental = TOKEN_FLAT_ALPHA;
      cursor += 1;
  } else if ( chord_spelling.charAt(0)!= undefined && chord_spelling.charAt(0) == TOKEN_SHARP_ALPHA ) {
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
      console.log("ERROR: create_chord_from_spelling: chord spelling has no roman numeral.");
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

  let chord_root_midi_pitch = chord_root.pitch;
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
    console.log( "ERROR: create_chord_from_spelling: " + JSON.stringify( chord_settings ) );
    return pitches;
  }

  // add pitches based on the core template
  // CHORD_VOICE_KEYS

  for (let index = 0; index < chord_template.length; index++) {
	const interval = chord_template[index];
	let key = chord_root_midi_pitch + interval
	let scale_pitch_object = scale[ key ];
	if ( scale_pitch_object ) {
		let pitch = copy_object( scale_pitch_object );
    	pitches[CHORD_VOICE_KEYS[index]] = pitch;
	} else {
		console.log( "ERROR: create_chord_from_spelling: scale[ key = " + key + " ]");
	}
    
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

      // Add the bass below the tonic
  // get the bass pitch
    let bass_pitch = get_chord_voice_from_scale( chord_settings.alt_bass_pitch, scale, tonic );
    // transpose to below the chord root (pitches[0]);
    bass_pitch.pitch = ( bass_pitch.pitch -= 12 );
    pitches[CHORD_VOICE_KEY_ALT_BASS] = bass_pitch;

      // trim alt bass notation and qualities off of chord spelling to prep for extensions
      chord_spelling = chord_spelling.slice(0, chord_spelling.length - ( alt_bass.length + 1 ) );
  }
  // does the chord have a 7th extension?
  if ( chord_spelling.indexOf("7", cursor) >= 0 ) {
      // get 7th pitch
      chord_settings.seventh_pitch = true;
      let seventh_pitch = get_chord_voice_from_scale ( 7, scale, chord_root_midi_pitch );
      pitches["7"] = seventh_pitch;
      cursor += 1;
  }

  let extensions = [ TOKEN_QUALITY_THIRTEENTH, TOKEN_QUALITY_TWELVTH, TOKEN_QUALITY_ELEVENTH, TOKEN_QUALITY_TENTH, TOKEN_QUALITY_NINTH, TOKEN_QUALITY_EIGHTH, TOKEN_QUALITY_SEVENTH, TOKEN_QUALITY_SIXTH, TOKEN_QUALITY_FIFTH, TOKEN_QUALITY_FOURTH, TOKEN_QUALITY_SECOND ];

  // check the count. If more than 1 extension, then make all extensions `add' extensions
  let add_extensions = [ TOKEN_QUALITY_THIRTEENTH, TOKEN_QUALITY_TWELVTH, TOKEN_QUALITY_ELEVENTH, TOKEN_QUALITY_TENTH, TOKEN_QUALITY_NINTH, TOKEN_QUALITY_EIGHTH, TOKEN_QUALITY_SEVENTH, TOKEN_QUALITY_SIXTH, TOKEN_QUALITY_FIFTH, TOKEN_QUALITY_FOURTH, TOKEN_QUALITY_SECOND ];
  let extension_count = 0;
  let handle_all_as_add = false;
  add_extensions.forEach( function ( ext ) {
	if ( chord_spelling.indexOf( ext ) >= 0 ) {
		extension_count++;
	}
  });
  if ( extension_count > 1 ) {
	handle_all_as_add = true;
  }

  let omissions = [];

  extensions.forEach( function ( extension ) {
      let cursor = chord_spelling.indexOf( extension );
      let mod = "";
	  // extension is found in the chord string
      if ( cursor >= 0 ) {
          switch ( extension ) {
              case TOKEN_QUALITY_THIRTEENTH:
                  // check the value in the position just before the cursor
                  let add13 = false;
				  // capture the mod, in position just before the cursor
                  mod = chord_spelling.charAt( cursor - 1 );
				  if ( mod == TOKEN_QUALITY_OMIT ) {
					omissions.push(TOKEN_QUALITY_THIRTEENTH);
				  }
				  let pitch_13 = get_chord_voice_from_scale( 13, scale, chord_root.pitch );
                  switch ( mod ) {
                      case TOKEN_SHARP_MUSIC:
                      case TOKEN_SHARP_ALPHA:
                          pitch_13 = copy_object( scale[ pitch_13.pitch + 1 ] );
                          break;
                      case TOKEN_FLAT_MUSIC:
                      case TOKEN_FLAT_ALPHA:
						  pitch_13 = copy_object( scale[ pitch_13.pitch - 1 ] );
                          break;
                      case TOKEN_CHORD_EXT_ADD_FRAGMENT:
                          add13 = true;
                          break;
                      default:
						// do nothing
                        break;
                  }
				  
				  pitches["13"] = pitch_13;
				  if ( !add13 && !handle_all_as_add ) {
					console.log( " add13 11, 9, 7 ");
					let pitch_11 = get_chord_voice_from_scale( 11, scale, chord_root.pitch );
					pitches["11"] = pitch_11;
					let pitch_9 = get_chord_voice_from_scale( 9, scale, chord_root.pitch );
					pitches["9"] = pitch_9;
					if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
						let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
						pitches["7"] = pitch_7;
					}
				  }
                  break;
				
				  case TOKEN_QUALITY_TWELVTH:
					// check the value in the position just before the cursor
					let add12 = false;
					// capture the mod, in position just before the cursor
					mod = chord_spelling.charAt( cursor - 1 );
					if ( mod == TOKEN_QUALITY_OMIT ) {
						omissions.push(TOKEN_QUALITY_TWELVTH);
					  }
					let pitch_12 = get_chord_voice_from_scale( 12, scale, chord_root.pitch );
					switch ( mod ) {
						case TOKEN_SHARP_MUSIC:
						case TOKEN_SHARP_ALPHA:
							pitch_12 = copy_object( scale[ pitch_12.pitch + 1 ] );
							break;
						case TOKEN_FLAT_MUSIC:
						case TOKEN_FLAT_ALPHA:
							pitch_12 = copy_object( scale[ pitch_12.pitch - 1 ] );
							break;
						case TOKEN_CHORD_EXT_ADD_FRAGMENT:
							add12 = true;
							break;
						default:
						  // do nothing
						  break;
					}
					pitches["12"] = pitch_12;
					if ( !add12 && !handle_all_as_add ) {
					  console.log( " add12 11, 9, 7 ");
					  let pitch_11 = get_chord_voice_from_scale( 11, scale, chord_root.pitch );
					  pitches["11"] = pitch_11;
					  let pitch_9 = get_chord_voice_from_scale( 9, scale, chord_root.pitch );
					  pitches["9"] = pitch_9;
					  if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
						  let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
						  pitches["7"] = pitch_7;
					  }
					}
					break;

				case TOKEN_QUALITY_ELEVENTH:
					// check the value in the position just before the cursor
					let add11 = false;
					// capture the mod, in position just before the cursor
					mod = chord_spelling.charAt( cursor - 1 );
					if ( mod == TOKEN_QUALITY_OMIT ) {
						omissions.push(TOKEN_QUALITY_ELEVENTH);
					  }
					let pitch_11 = get_chord_voice_from_scale( 11, scale, chord_root.pitch );
					switch ( mod ) {
						case TOKEN_SHARP_MUSIC:
						case TOKEN_SHARP_ALPHA:
							pitch_11 = copy_object( scale[ pitch_11.pitch + 1 ] );
							break;
						case TOKEN_FLAT_MUSIC:
						case TOKEN_FLAT_ALPHA:
							pitch_11 = copy_object( scale[ pitch_11.pitch - 1 ] );
							break;
						case TOKEN_CHORD_EXT_ADD_FRAGMENT:
							add11 = true;
							break;
						default:
							// do nothing
							break;
					}
					pitches["11"] = pitch_11;
					if ( !add11 && !handle_all_as_add ) {
						console.log( " add11 9, 7 ");
						let pitch_9 = get_chord_voice_from_scale( 9, scale, chord_root.pitch );
						pitches["9"] = pitch_9;
						if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
							let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
							pitches["7"] = pitch_7;
						}
					}
					break;
					case TOKEN_QUALITY_TENTH:
					// check the value in the position just before the cursor
					let add10 = false;
					// capture the mod, in position just before the cursor
					mod = chord_spelling.charAt( cursor - 1 );
					if ( mod == TOKEN_QUALITY_OMIT ) {
						omissions.push(TOKEN_QUALITY_TENTH);
					  }
					let pitch_10 = get_chord_voice_from_scale( 10, scale, chord_root.pitch );
					switch ( mod ) {
						case TOKEN_SHARP_MUSIC:
						case TOKEN_SHARP_ALPHA:
							pitch_10 = copy_object( scale[ pitch_10.pitch + 1 ] );
							break;
						case TOKEN_FLAT_MUSIC:
						case TOKEN_FLAT_ALPHA:
							pitch_10 = copy_object( scale[ pitch_10.pitch - 1 ] );
							break;
						case TOKEN_CHORD_EXT_ADD_FRAGMENT:
							add10 = true;
							break;
						default:
							// do nothing
							break;
					}
					pitches["10"] = pitch_10;
					if ( !add10 && !handle_all_as_add ) {
						console.log( " add10 9, 7 ");
						let pitch_9 = get_chord_voice_from_scale( 9, scale, chord_root.pitch );
						pitches["9"] = pitch_9;
						if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
							let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
							pitches["7"] = pitch_7;
						}
					}
					break;
					case TOKEN_QUALITY_NINTH:
						// check the value in the position just before the cursor
						let add9 = false;
						// capture the mod, in position just before the cursor
						mod = chord_spelling.charAt( cursor - 1 );
						if ( mod == TOKEN_QUALITY_OMIT ) {
							omissions.push(TOKEN_QUALITY_NINTH);
						  }
						let pitch_9 = get_chord_voice_from_scale( 9, scale, chord_root.pitch );
						switch ( mod ) {
							case TOKEN_SHARP_MUSIC:
							case TOKEN_SHARP_ALPHA:
								pitch_9 = copy_object( scale[ pitch_9.pitch + 1 ] );
								break;
							case TOKEN_FLAT_MUSIC:
							case TOKEN_FLAT_ALPHA:
								pitch_9 = copy_object( scale[ pitch_9.pitch - 1 ] );
								break;
							case TOKEN_CHORD_EXT_ADD_FRAGMENT:
								add9 = true;
								break;
							default:
								// do nothing
								break;
						}
						pitches["9"] = pitch_9;
						if ( !add9 && !handle_all_as_add ) {
							console.log( " add9 7 ");
							if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
								let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
								pitches["7"] = pitch_7;
							}
						}
					break;
					case TOKEN_QUALITY_EIGHTH:
						// check the value in the position just before the cursor
						let add8 = false;
						// capture the mod, in position just before the cursor
						mod = chord_spelling.charAt( cursor - 1 );
						if ( mod == TOKEN_QUALITY_OMIT ) {
							omissions.push(TOKEN_QUALITY_EIGHTH);
						  }
						let pitch_8 = get_chord_voice_from_scale( 8, scale, chord_root.pitch );
						switch ( mod ) {
							case TOKEN_SHARP_MUSIC:
							case TOKEN_SHARP_ALPHA:
								pitch_8 = copy_object( scale[ pitch_8.pitch + 1 ] );
								break;
							case TOKEN_FLAT_MUSIC:
							case TOKEN_FLAT_ALPHA:
								pitch_8 = copy_object( scale[ pitch_8.pitch - 1 ] );
								break;
							case TOKEN_CHORD_EXT_ADD_FRAGMENT:
								add8 = true;
								break;
							default:
								// do nothing
								break;
						}
						pitches["8"] = pitch_8;
						if ( !add8 && !handle_all_as_add ) {
							console.log( " add8 7 ");
							if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
								let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
								pitches["7"] = pitch_7;
							}
						}
					break;
					case TOKEN_QUALITY_SEVENTH:
						// capture the mod, in position just before the cursor
						mod = chord_spelling.charAt( cursor - 1 );
						if ( mod == TOKEN_QUALITY_OMIT ) {
							omissions.push(TOKEN_QUALITY_SEVENTH);
						  }
						let pitch_7 = get_chord_voice_from_scale( 7, scale, chord_root.pitch );
						switch ( mod ) {
							case TOKEN_SHARP_MUSIC:
							case TOKEN_SHARP_ALPHA:
								pitch_7 = copy_object( scale[ pitch_7.pitch + 1 ] );
								break;
							case TOKEN_FLAT_MUSIC:
							case TOKEN_FLAT_ALPHA:
								pitch_7 = copy_object( scale[ pitch_7.pitch - 1 ] );
								break;
							default:
								// do nothing; fail silently
								break;
						}
						if ( chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED && chord_settings.chord_quality != TOKEN_QUALITY_AUGMENTED_MUSIC ) {
							pitches["7"] = pitch_7;
						}
				  break;
				  case TOKEN_QUALITY_SIXTH:
						// capture the mod, in position just before the cursor
						mod = chord_spelling.charAt( cursor - 1 );
						if ( mod == TOKEN_QUALITY_OMIT ) {
							omissions.push(TOKEN_QUALITY_SIXTH);
						  }
						let pitch_6 = get_chord_voice_from_scale( 6, scale, chord_root.pitch );
						switch ( mod ) {
							case TOKEN_SHARP_MUSIC:
							case TOKEN_SHARP_ALPHA:
								pitch_6 = copy_object( scale[ pitch_6.pitch + 1 ] );
								break;
							case TOKEN_FLAT_MUSIC:
							case TOKEN_FLAT_ALPHA:
								pitch_6 = copy_object( scale[ pitch_6.pitch - 1 ] );
								break;
							default:
								// do nothing; fail silently
								break;
						}
					pitches["6"] = pitch_6;
				  break;
				  case TOKEN_QUALITY_FIFTH:
					mod = chord_spelling.charAt( cursor - 1 );
					if ( mod == TOKEN_QUALITY_OMIT ) {
						omissions.push(TOKEN_QUALITY_FIFTH);
					  }
					let pitch_5 = pitches["5"];
					switch ( mod ) {
						case TOKEN_SHARP_MUSIC:
						case TOKEN_SHARP_ALPHA:
							pitch_5 = copy_object( scale[ pitch_5.pitch + 1 ] );
							break;
						case TOKEN_FLAT_MUSIC:
						case TOKEN_FLAT_ALPHA:
							pitch_5 = copy_object( scale[ pitch_5.pitch - 1 ] );
							break;
						default:
							// do nothing
							break;
					}
					pitches["5"] = pitch_5;
					break;
				case TOKEN_QUALITY_FOURTH:
					mod = chord_spelling.charAt( cursor - 1 );
					if ( mod == TOKEN_QUALITY_OMIT ) {
						omissions.push(TOKEN_QUALITY_FOURTH);
					  }
					let pitch_4 = pitches["4"];
					switch ( mod ) {
						case TOKEN_SHARP_MUSIC:
						case TOKEN_SHARP_ALPHA:
							pitch_4 = copy_object( scale[ pitch_4.pitch + 1 ] );
							break;
						case TOKEN_FLAT_MUSIC:
						case TOKEN_FLAT_ALPHA:
							pitch_4 = copy_object( scale[ pitch_4.pitch - 1 ] );
							break;
						default:
							// do nothing
							break;
					}
					pitches["4"] = pitch_4;
					break;
				case TOKEN_QUALITY_SECOND:
					mod = chord_spelling.charAt( cursor - 1 );
					if ( mod == TOKEN_QUALITY_OMIT ) {
						omissions.push(TOKEN_QUALITY_SECOND);
					  }
					let pitch_2 = pitches["2"];
					switch ( mod ) {
						case TOKEN_SHARP_MUSIC:
						case TOKEN_SHARP_ALPHA:
							pitch_2 = copy_object( scale[ pitch_2.pitch + 1 ] );
							break;
						case TOKEN_FLAT_MUSIC:
						case TOKEN_FLAT_ALPHA:
							pitch_2 = copy_object( scale[ pitch_2.pitch - 1 ] );
							break;
						default:
							// do nothing
							break;
					}
					pitches["2"] = pitch_2;
					break;
              default:
                  console.log( "ERROR: create_chord_from_spelling: extension: " + extension );
                  break;
          }
      }
  });

  if ( omissions.length > 0 ) {
	omissions.forEach( function( quality ) {
		delete pitches[quality];
	});
  }

  return pitches;
}

/* CHORD MODIFICATION */

// returns the modified chord according to the options provided
function modify_chord ( options_key, options, chord ) {
	if ( options_key == CHORD_VOICE_OPTION_KEY_NO_MOD ) {
		return chord;
	}

	if ( options_key == CHORD_VOICE_OPTION_KEY_EXCLUDE_MINOR_NINTHS ) {
		return remove_minor_9ths ( chord );
	} 

	CHORD_VOICE_MODIFIER_KEYS.forEach( function ( key ) {
		let voice = chord[ key ];
		if ( voice ) {
			switch ( key ) {
				case "1":
					if ( options[key] == 0 ) {
						delete chord[key];
					}
					break;
				case "3":
					switch ( options_key ) {
						case CHORD_VOICE_OPTION_KEY_DROP_TWO_THREE:
						case CHORD_VOICE_OPTION_KEY_DROP_THREE:
							voice.pitch -= CHROMATIC_HALF_STEPS;
							break;
						default:
							if ( options[key] == 0 ) {
								delete chord[key];
							}
							break;
					}
					break;
				case "5":
					switch ( options_key ) {
						case CHORD_VOICE_OPTION_KEY_DROP_TWO_FOUR:
						case CHORD_VOICE_OPTION_KEY_DROP_TWO_THREE:
						case CHORD_VOICE_OPTION_KEY_DROP_TWO:
							voice.pitch -= CHROMATIC_HALF_STEPS;
							break;
						default:
							if ( options[key] == 0 ) {
								delete chord[key];
							}
							break;
					}
					break;
				case "7":
					switch ( options_key ) {
						case CHORD_VOICE_OPTION_KEY_DROP_TWO_FOUR:
							voice.pitch -= CHROMATIC_HALF_STEPS;
							break;
						case CHORD_VOICE_OPTION_KEY_POP_TWO_OVER_ONE:
							voice.pitch += CHROMATIC_HALF_STEPS;
							break;
						default:
							if ( options[key] == 0 ) {
								delete chord[key];
							}
							break;
					}
					break;
				case "9":
					switch ( options_key ) {
						case CHORD_VOICE_OPTION_KEY_POP_SEVEN_OVER_ONE:
						case CHORD_VOICE_OPTION_KEY_POP_TWO_OVER_ONE:
							voice.pitch += CHROMATIC_HALF_STEPS;
							break;
						default:
							if ( options[key] == 0 ) {
								delete chord[key];
							}
							break;
					}
					break;
				case "11":
					switch ( options_key ) {
						case CHORD_VOICE_OPTION_KEY_POP_SEVEN_OVER_ONE:
						case CHORD_VOICE_OPTION_KEY_POP_TWO_OVER_ONE:
							voice.pitch += CHROMATIC_HALF_STEPS;
							break;
						default:
							if ( options[key] == 0 ) {
								delete chord[key];
							}
							break;
					}
					break;
				case "13":
					switch ( options_key ) {
						case CHORD_VOICE_OPTION_KEY_POP_TWO_OVER_ONE:
							voice.pitch += CHROMATIC_HALF_STEPS;
							break;
						default:
							if ( options[key] == 0 ) {
								delete chord[key];
							}
							break;
					}
					break;
				case "alt_bass":
					if ( options[key] == 0 ) {
						delete chord[key];
					}
					break;
				default:
					// do nothing; fail silently
					break;
			}
		}
	});

	return chord;
}

function remove_minor_9ths ( chord ) {
	let keys = Object.keys( chord );
	if ( keys.length <= 7 ) {
		return chord;
	}
	let vkeys = ["1", "3", "5", "7"];
	let ekeys = ["9", "11", "13", "alt_bass"];
	vkeys.forEach( function ( vkey ) {
		ekeys.forEach( function ( ekey ) {
			const extension = chord[ekey];
			const voice = chord[vkey];
			if ( extension && voice ) {
				const interval = extension.pitch - voice.pitch;
				if ( interval == 13 ) {
					delete chord[ekey];
				}
			}
		});
	});
}

/* MAP TRAVERSAL */

function getRandomValueFromWeightPool ( weightPool ) {

    /*
    "I" : {					// 4
		"1" : "bII7",		// from
		"5" : "iii",		// from
		"6" : "iv7",		// from
		"10" : "V",			// from
		"14" : "V/1",		// from
		"15" : "v",			// from
		"16" : "bVII",		// from
		"total" : 16
	}
    */

    var total = weightPool.total;

    var r = rInt( 1, total );
    var weights = Object.keys(weightPool);

    if ( weights.length == 2 ) {
        return weightPool[weights[0]];
    }

    weights.pop();
    var last_weight = total;
    for ( let index = weights.length - 1 ; index > -1 ; index-- ) {
        const weight = parseInt(weights[index]);
        if ( r > weight ) {
            return weightPool[last_weight];
        }
        last_weight = weight;
    }

    return weightPool[weights[0]];
    
}

/* HELPER FUNCTIONS */

function rInt (x, y) {
    if (x > y) {
      [x, y] = [x, y];
    }
    return Math.floor(Math.random() * (y - x + 1)) + x;
}

function copy_object ( obj ) {
	// if ( !obj ) {
	// 	console.log("copy_object");
	// }
	return JSON.parse( JSON.stringify( obj ) );
}

// transposes a pitch to the target octave
function transposePitchToTargetOctave( pitch, targetOctave ) {
	let transposedPitch = pitch + ( targetOctave * 12 );
	return transposedPitch;
}