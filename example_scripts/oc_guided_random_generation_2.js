/******************************************************************************
Name: Guided Random Generation 2
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
* alt bass: arabic numbers 1-7
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
	"Ionian"     : [1, 0, 2, 0, 3, 4, 0, 5, 0, 6, 0, 7],
	"Dorian"     : [1, 0, 2, 3, 0, 4, 0, 5, 0, 6, 7, 0],
	"Phyrgian"   : [1, 2, 0, 3, 0, 4, 0, 5, 6, 0, 7, 0],
	"Lydian"     : [1, 0, 2, 0, 3, 0, 4, 5, 0, 6, 0, 7],
	"Mixolydian" : [1, 0, 2, 0, 3, 4, 0, 5, 0, 6, 7, 0],
	"Aeolian"    : [1, 0, 2, 3, 0, 4, 0, 5, 6, 0, 7, 0],
	"Locrian"    : [1, 2, 0, 3, 0, 4, 5, 0, 6, 0, 7, 0]
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

/* CHORD PROGRESSION MAPS */

// stores the scale as calculated
var SCALE_MAP = {}
// the store from which pitches are selected
var NOTE_PITCH_POOL = [];

// I chord jumps to any other chord based on weight
const MAP_MAJOR_FULL = {
	"START" : "I",
	"I" : {					// 4
		"4" : "I",
		"5" : "I/3",
		"6" : "I/5",
		"10" : "i6",
		"11" : "#i˚7",
		"13" : "II",
		"14" : "bII7",		// from
		"18" : "ii",
		"19" : "#ii˚7",
		"21" : "III",
		"22" : "iii7b5",
		"26" : "iii",		// from
		"30" : "IV",
		"31" : "bIV",
		"35" : "IV/1",
		"36" : "iv7",		// from
		"37" : "#iv7b5",
		"41" : "V",			// from
		"45" : "V/1",		// from
		"47" : "V/2",
		"48" : "v",			// from
		"49" : "#v˚7",
		"51" : "VI",
		"53" : "bVI7",
		"57" : "vi",
		"58" : "vi7b5/3",
		"60" : "VII",
		"61" : "bVII",		// from
		"62" : "bVII9",
		"63" : "vii7b5",
		"total" : 63
	},
	"I/3" : {
		"4" : "I",			// from
		"8" : "ii",			// to
		"12" : "IV",		// from
		"total" : 12
	},
	"I/5" : {				// 4
		"4" : "I",			// from
		"8" : "ii",			// from
		"12" : "IV",		// from
		"13" : "#iv7b5",	// from	
		"17" : "V",			// from
		"18" : "bVI7",		// from
		"19" : "bVII9",		// from
		"total" : 19
	},
	"i6" : {
		"4" : "I",			// from
		"6" : "II",			// to
		"8" : "V/2",		// to
		"total" : 8
	},
	"#i˚7" : {
		"4" : "I",			// from
		"8" : "ii",			// to
		"total" : 8
	},
	"II" : {				// 2
		"4" : "I",			// from
		"8" : "V",			// to
		"9" : "vi7b5/3",	// from
		"total" : 9
	},
	"bII7" : {
		"4" : "I",			// to
		"8" : "ii",			// from
		"total" : 8
	},
	"ii" : {				// 4
		"4" : "I",			// from
		"5" : "I/3",			// from
		"9" : "I/5",		// to
		"10" : "#i˚7",		// from
		"11" : "bII7",		// to
		"15" : "iii",		// to
		"19" : "IV",		// from
		"20" : "iv7",		// to
		"24" : "V",			// to
		"26" : "V/2",		// from
		"28" : "VI",		// from
		"29" : "vi7b5/3",	// from
		"total" : 29
	},
	"#ii˚7" : {
		"4" : "I",			// from
		"8" : "iii",		// to
		"total" : 8
	},
	"III" : {				// 2
		"4" : "I",			// from
		"5" : "#v˚7",		// from
		"9" : "vi",			// to
		"10" : "vii7b5",	// from
		"total" : 10
	},
	"iii7b5" : {
		"4" : "I",			// from
		"8" : "IV",			// to
		"10" : "VI",		// to
		"total" : 10
	},
	"iii" : {				// 4
		"4" : "I",			// to
		"8" : "ii",			// from
		"10" : "#ii˚7",		// from
		"14" : "IV",			// to
		"18" : "V",			// from
		"22" : "vi",			// to
		"24" : "VII",		// from
		"total" : 24
	},
	
	"IV" : {				// 4
		"4" : "I",			// from
		"5" : "I/3",		// to
		"9" : "I/5",		// to
		"13" : "ii",			// to
		"17" : "iii",		// from
		"18" : "iii7b5",		// from
		"22" : "V",			// to
		"26" : "vi",		// from
		"total" : 26
	},
	"bIV" : {
		"4" : "I",			// from
		"5" : "bVII",		// to
		"6" : "bVII",		// from
		"total" : 6
	},
	"IV/1" : {				// 4
		"4" : "I",			// to+from
		"total" : 4
	},
	"iv7" : {
		"4" : "I",			// to
		"8" : "I",			// from
		"12" : "ii",		// from
		"total" : 12
	},
	"#iv7b5" : {
		"4" : "I",			// from
		"8" : "I/5",		// to
		"12" : "V",			// to
		"14" : "VII",		// to
		"total" : 14
	},
	"V" : {					// 4
		"4" : "I",			// to
		"8" : "I",			// from
		"12" : "I/5",		// from
		"14" : "ii",		// from
		"16" : "II",		// from
		"20" : "iii",		// from
		"24" : "IV",		// from
		"25" : "#iv7b5",	// from
		"29" : "vi",		// to
		"33" : "vi",		// from
		"total" : 33
	},
	"V/1" : {				// 4
		"4" : "I",			// to+from
		"total" : 4
	},
	"V/2" : {				// 2
		"4" : "I",			// from
		"5" : "i6",			// from
		"9" : "ii",			// to
		"total" : 9
	},
	"v" : {
		"4":"I",			// to+from
		"total" : 4
	},
	"#v˚7" : {
		"4" : "I",			// from
		"6" : "III",		// to
		"total" : 6
	},
	"VI" : {				// 2
		"4" : "I",			// from
		"8"  : "ii",		// to
		"9" : "iii7b5",		// from
		"total" : 9
	},
	"bVI7" : {				// 2
		"4" : "I",			// from
		"8" : "I/5",		// to
		"10" : "bVI7",		// from
		"total" : 10
	},
	"vi" : {				// 4
		"4" : "I",			// from
		"6" : "II",			// to
		"8" : "III",		// from
		"12" : "iii",		// from
		"16" : "IV",		// to
		"20" : "IV",		// from
		"24" : "V",			// to
		"28" : "V",			// from
		"total" : 28
	},
	"vi7b5/3" : {
		"4" : "I",			// from
		"6" : "II",			// from
		"10" : "ii",		// to
		"14" : "ii",		// from
		"total" : 14
	},
	"VII" : {				// 2
		"4" : "I",			// from
		"8" : "iii",		// to
		"9" : "#iv7b5",		// from
		"total" : 9
	},
	"bVII" : {
		"4" : "I",			// to
		"8" : "I",			// from
		"9" : "bIV",		// to
		"10" : "bIV",		// from
		"total" : 10
	},
	"bVII9" : {
		"4" : "I",			// from
		"8" : "I/5",		// to
		"total" : 8
	},
	"vii7b5" : {
		"4" : "I",			// from
		"6" : "III",		// to
		"8" : "III",		// from
		"total" : 8
	}
};

// connects I to only those chords directly connected
const MAP_MAJOR_LEAN_I = {
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
	"I/3" : {
		"4" : "I",			// from
		"8" : "ii",			// to
		"12" : "IV",		// from
		"total" : 12
	},
	"I/5" : {				// 4
		"4" : "I",			// from
		"8" : "ii",			// from
		"12" : "IV",		// from
		"13" : "#iv7b5",	// from	
		"17" : "V",			// from
		"18" : "bVI7",		// from
		"19" : "bVII9",		// from
		"total" : 19
	},
	"i6" : {
		"4" : "I",			// from
		"6" : "II",			// to
		"8" : "V/2",		// to
		"total" : 8
	},
	"#i˚7" : {
		"4" : "I",			// from
		"8" : "ii",			// to
		"total" : 8
	},
	"II" : {				// 2
		"4" : "I",			// from
		"8" : "V",			// to
		"9" : "vi7b5/3",	// from
		"total" : 9
	},
	"bII7" : {
		"4" : "I",			// to
		"8" : "ii",			// from
		"total" : 8
	},
	"ii" : {				// 4
		"4" : "I",			// from
		"5" : "I/3",			// from
		"9" : "I/5",		// to
		"10" : "#i˚7",		// from
		"11" : "bII7",		// to
		"15" : "iii",		// to
		"19" : "IV",		// from
		"20" : "iv7",		// to
		"24" : "V",			// to
		"26" : "V/2",		// from
		"28" : "VI",		// from
		"29" : "vi7b5/3",	// from
		"total" : 29
	},
	"#ii˚7" : {
		"4" : "I",			// from
		"8" : "iii",		// to
		"total" : 8
	},
	"III" : {				// 2
		"4" : "I",			// from
		"5" : "#v˚7",		// from
		"9" : "vi",			// to
		"10" : "vii7b5",	// from
		"total" : 10
	},
	"iii7b5" : {
		"4" : "I",			// from
		"8" : "IV",			// to
		"10" : "VI",		// to
		"total" : 10
	},
	"iii" : {				// 4
		"4" : "I",			// to
		"8" : "ii",			// from
		"10" : "#ii˚7",		// from
		"14" : "IV",			// to
		"18" : "V",			// from
		"22" : "vi",			// to
		"24" : "VII",		// from
		"total" : 24
	},
	
	"IV" : {				// 4
		"4" : "I",			// from
		"5" : "I/3",		// to
		"9" : "I/5",		// to
		"13" : "ii",			// to
		"17" : "iii",		// from
		"18" : "iii7b5",		// from
		"22" : "V",			// to
		"26" : "vi",		// from
		"total" : 26
	},
	"bIV" : {
		"4" : "I",			// from
		"5" : "bVII",		// to
		"6" : "bVII",		// from
		"total" : 6
	},
	"IV/1" : {				// 4
		"4" : "I",			// to+from
		"total" : 4
	},
	"iv7" : {
		"4" : "I",			// to
		"8" : "I",			// from
		"12" : "ii",		// from
		"total" : 12
	},
	"#iv7b5" : {
		"4" : "I",			// from
		"8" : "I/5",		// to
		"12" : "V",			// to
		"14" : "VII",		// to
		"total" : 14
	},
	"V" : {					// 4
		"4" : "I",			// to
		"8" : "I",			// from
		"12" : "I/5",		// from
		"14" : "ii",		// from
		"16" : "II",		// from
		"20" : "iii",		// from
		"24" : "IV",		// from
		"25" : "#iv7b5",	// from
		"29" : "vi",		// to
		"33" : "vi",		// from
		"total" : 33
	},
	"V/1" : {				// 4
		"4" : "I",			// to+from
		"total" : 4
	},
	"V/2" : {				// 2
		"4" : "I",			// from
		"5" : "i6",			// from
		"9" : "ii",			// to
		"total" : 9
	},
	"v" : {
		"4":"I",			// to+from
		"total" : 4
	},
	"#v˚7" : {
		"4" : "I",			// from
		"6" : "III",		// to
		"total" : 6
	},
	"VI" : {				// 2
		"4" : "I",			// from
		"8"  : "ii",		// to
		"9" : "iii7b5",		// from
		"total" : 9
	},
	"bVI7" : {				// 2
		"4" : "I",			// from
		"8" : "I/5",		// to
		"10" : "bVI7",		// from
		"total" : 10
	},
	"vi" : {				// 4
		"4" : "I",			// from
		"6" : "II",			// to
		"8" : "III",		// from
		"12" : "iii",		// from
		"16" : "IV",		// to
		"20" : "IV",		// from
		"24" : "V",			// to
		"28" : "V",			// from
		"total" : 28
	},
	"vi7b5/3" : {
		"4" : "I",			// from
		"6" : "II",			// from
		"10" : "ii",		// to
		"14" : "ii",		// from
		"total" : 14
	},
	"VII" : {				// 2
		"4" : "I",			// from
		"8" : "iii",		// to
		"9" : "#iv7b5",		// from
		"total" : 9
	},
	"bVII" : {
		"4" : "I",			// to
		"8" : "I",			// from
		"9" : "bIV",		// to
		"10" : "bIV",		// from
		"total" : 10
	},
	"bVII9" : {
		"4" : "I",			// from
		"8" : "I/5",		// to
		"total" : 8
	},
	"vii7b5" : {
		"4" : "I",			// from
		"6" : "III",		// to
		"8" : "III",		// from
		"total" : 8
	}
}

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
const MAP_IONIAN_7_13			= {"START":"I13","I13":{"1":"I13","4":"iii13","7":"V13","9":"vii˚13","total":9,"weight":4},"ii13":{"1":"ii13","3":"IV13","6":"vi13","10":"I13","total":10,"weight":2},"iii13":{"1":"iii13","4":"V13","6":"vii˚13","8":"ii13","total":8,"weight":3},"IV13":{"1":"IV13","4":"vi13","8":"I13","11":"iii13","total":11,"weight":2},"V13":{"1":"V13","3":"vii˚13","5":"ii13","7":"IV13","total":7,"weight":3},"vi13":{"1":"vi13","5":"I13","8":"iii13","11":"V13","total":11,"weight":3},"vii˚13":{"1":"vii˚13","3":"ii13","5":"IV13","8":"vi13","total":8,"weight":2}}
const MAP_DORIAN_7_13			= {"START":"i13","i13":{"1":"i13","3":"III13","5":"v13","8":"VII13","total":8,"weight":3},"ii13":{"1":"ii13","4":"IV13","7":"vi˚13","10":"i13","total":10,"weight":3},"III13":{"1":"III13","3":"v13","6":"VII13","9":"ii13","total":9,"weight":2},"IV13":{"1":"IV13","4":"vi˚13","7":"i13","9":"III13","total":9,"weight":3},"v13":{"1":"v13","4":"VII13","7":"ii13","10":"IV13","total":10,"weight":2},"vi˚13":{"1":"vi˚13","4":"i13","6":"III13","8":"v13","total":8,"weight":3},"VII13":{"1":"VII13","4":"ii13","7":"IV13","10":"vi˚13","total":10,"weight":3}}
const MAP_PHRYGIAN_7_13			= {"START":"i13","i13":{"1":"i13","4":"III13","7":"v˚13","10":"vii13","total":10,"weight":3},"II13":{"1":"II13","3":"iv13","5":"VI13","8":"i13","total":8,"weight":3},"III13":{"1":"III13","4":"v˚13","7":"vii13","10":"II13","total":10,"weight":3},"iv13":{"1":"iv13","3":"VI13","6":"i13","9":"III13","total":9,"weight":2},"v˚13":{"1":"v˚13","4":"vii13","7":"II13","9":"iv13","total":9,"weight":3},"VI13":{"1":"VI13","4":"i13","7":"III13","10":"v˚13","total":10,"weight":2},"vii13":{"1":"vii13","4":"II13","6":"iv13","8":"VI13","total":8,"weight":3}}
const MAP_LYDIAN_7_13			= {"START":"I13","I13":{"1":"I13","3":"iii13","6":"V13","9":"vii13","total":9,"weight":3},"II13":{"1":"II13","4":"iv˚13","6":"vi13","9":"I13","total":9,"weight":3},"iii13":{"1":"iii13","4":"V13","7":"vii13","10":"II13","total":10,"weight":2},"iv˚13":{"1":"iv˚13","3":"vi13","6":"I13","8":"iii13","total":8,"weight":3},"V13":{"1":"V13","4":"vii13","7":"II13","10":"iv˚13","total":10,"weight":3},"vi13":{"1":"vi13","4":"I13","6":"iii13","9":"V13","total":9,"weight":2},"vii13":{"1":"vii13","4":"II13","7":"iv˚13","9":"vi13","total":9,"weight":3}}
const MAP_MIXOLYDIAN_7_13 		= {"START":"I13","I13":{"1":"I13","4":"iii˚13","7":"v13","10":"VII13","total":10,"weight":4},"ii13":{"1":"ii13","3":"IV13","5":"vi13","9":"I13","total":9,"weight":2},"iii˚13":{"1":"iii˚13","4":"v13","7":"VII13","9":"ii13","total":9,"weight":3},"IV13":{"1":"IV13","3":"vi13","7":"I13","10":"iii˚13","total":10,"weight":2},"v13":{"1":"v13","4":"VII13","6":"ii13","8":"IV13","total":8,"weight":3},"vi13":{"1":"vi13","5":"I13","8":"iii˚13","11":"v13","total":11,"weight":2},"VII13":{"1":"VII13","3":"ii13","5":"IV13","7":"vi13","total":7,"weight":3}}
const MAP_AEOLIAN_7_13			= {"START":"i13","i13":{"1":"i13","4":"III13","7":"v13","9":"VII13","total":9,"weight":4},"ii˚13":{"1":"ii˚13","3":"iv13","6":"VI13","10":"i13","total":10,"weight":2},"III13":{"1":"III13","4":"v13","6":"VII13","8":"ii˚13","total":8,"weight":3},"iv13":{"1":"iv13","4":"VI13","8":"i13","11":"III13","total":11,"weight":2},"v13":{"1":"v13","3":"VII13","5":"ii˚13","7":"iv13","total":7,"weight":3},"VI13":{"1":"VI13","5":"i13","8":"III13","11":"v13","total":11,"weight":3},"VII13":{"1":"VII13","3":"ii˚13","5":"iv13","8":"VI13","total":8,"weight":2}}
const MAP_LOCRIAN_7_13			= {"START":"i˚13","i˚13":{"1":"i˚13","4":"iii13","7":"V13","9":"vii13","total":9,"weight":4},"II13":{"1":"II13","3":"iv13","6":"VI13","10":"i˚13","total":10,"weight":2},"iii13":{"1":"iii13","4":"V13","6":"vii13","8":"II13","total":8,"weight":3},"iv13":{"1":"iv13","4":"VI13","8":"i˚13","11":"iii13","total":11,"weight":2},"V13":{"1":"V13","3":"vii13","5":"II13","7":"iv13","total":7,"weight":3},"VI13":{"1":"VI13","5":"i˚13","8":"iii13","11":"V13","total":11,"weight":3},"vii13":{"1":"vii13","3":"II13","5":"iv13","8":"VI13","total":8,"weight":2}}

const PROGRESSION_MAPS = {
  "Major Full" : MAP_MAJOR_FULL,
  "Major Lean I" : MAP_MAJOR_LEAN_I,
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
  "Ionian 7x13 [ I13, ii13, iii13, IV13, V13, vi13, vii˚13 ]" : MAP_IONIAN_7_13,
  "Dorian 7x13 [ i13, ii13, III13, IV13, v13, vi˚13, VII13 ]" : MAP_DORIAN_7_13,
  "Phrygian 7x13 [ i13, II13, III13, iv13, v˚13, VI13, vii13 ]" : MAP_PHRYGIAN_7_13,
  "Lydian 7x13 [ I13, II13, iii13, iv˚13, V13, vi13, vii13 ]" : MAP_LYDIAN_7_13,
  "Mixolydian 7x13 [ I13, ii13, iii˚13, IV13, v13, vi13, VII13 ]" : MAP_MIXOLYDIAN_7_13,
  "Aeolian 7x13 [ i13, ii˚13,III13, iv13, v13, VI13, VII13 ]" : MAP_AEOLIAN_7_13,
  "Locrian 7x13 [ i˚13, II13, iii13, iv13, V13, VI13, vii13 ]" : MAP_LOCRIAN_7_13
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

// const CHORD_VOICE_ROOT = 0;
// const CHORD_VOICE_3RD = 1;
// const CHORD_VOICE_5TH = 2;
// const CHORD_VOICE_7TH = 3;
// const CHORD_VOICE_9TH = 4;
// const CHORD_VOICE_11TH = 5;
// const CHORD_VOICE_13TH = 6;
const CHORD_VOICE_OPTIONS = {
	"No modification"						: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 1, "11" : 1, "13" : 1, "alt_bass" : 1 },
	"Triad (1, 3, 5, alt bass)"				: { "1" : 1, "3" : 1, "5" : 1, "7" : 0, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 1 },
	"7th (1, 3, 5, 7, alt bass)"			: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 1 },
	"Exc. 5th (1, 3, 7, alt bass)"			: { "1" : 1, "3" : 1, "5" : 0, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 1 },
	"Extensions (9, 11, 13)"				: { "1" : 0, "3" : 0, "5" : 0, "7" : 0, "9" : 1, "11" : 1, "13" : 1, "alt_bass" : 0 },
	"Pentatonic (1, 3, 5, 9, 11)"			: { "1" : 1, "3" : 1, "5" : 1, "7" : 0, "9" : 1, "11" : 1, "13" : 0, "alt_bass" : 0 },
	"Exclude Minor 9ths"					: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 1, "11" : 1, "13" : 1, "alt_bass" : 1 },
	"Pop VII/I (11 chord req.)"				: { "1" : 0, "3" : 0, "5" : 0, "7" : 1, "9" : 1, "11" : 1, "13" : 0, "alt_bass" : 0 },
	"Pop II/I (13 chord req.)"				: { "1" : 0, "3" : 0, "5" : 0, "7" : 0, "9" : 1, "11" : 1, "13" : 1, "alt_bass" : 0 },
	"Drop 2 (1342)"							: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 0 },
	"Drop 3 (1243)"							: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 0 },
	"Drop 2+3 (1423)"						: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 0 },
	"Drop 2+4 (1324)"						: { "1" : 1, "3" : 1, "5" : 1, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 0 },
	"Rootless (3, 5, 7, 9, alt bass)"		: { "1" : 0, "3" : 1, "5" : 1, "7" : 1, "9" : 1, "11" : 1, "13" : 1, "alt_bass" : 1 },
	"Rootless V7 (3, 7, 9, 13, alt bass)"	: { "1" : 0, "3" : 1, "5" : 0, "7" : 1, "9" : 1, "11" : 1, "13" : 1, "alt_bass" : 1 },
	"Shell (3, 7, alt bass)"				: { "1" : 0, "3" : 1, "5" : 0, "7" : 1, "9" : 0, "11" : 0, "13" : 0, "alt_bass" : 1 },
};

const CHORD_VOICE_OPTIONS_KEYS = Object.keys( CHORD_VOICE_OPTIONS );
const CHORD_VOICE_MODIFIER_KEYS = ["1", "3", "5", "7", "9", "11", "13", "alt_bass"];

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

const NOTE_LENGTHS_LIB = {
    "1/128t"	:	0.0416,
    "1/64"      :   0.063,
    "1/64d"     :   0.094,
    "1/64t"     :   0.021,
    "1/32"	    :	0.125,
    "1/32d"	    :	0.188,
    "1/32t"	    :	0.041,
    "1/16"	    :	0.250,
    "1/16d"	    :	0.375,
    "1/16t"	    :	0.333,
    "1/8" 	    :	0.500,
    "1/8d"	    :	0.750,
    "1/8t"	    :	0.1667,
    "1/4" 	    :	1.000,
    "1/4d"	    :	1.500,
    "1/4t"	    :	0.300,
    "1/2" 	    :	2.000,
    "1/2d"	    :	3.000,
    "1/2t"	    :	1.667,
    "1 bar"		:	4.000,
	"1.5 bars"  :   6.000,
	"2 bars"	:	8.000,
	"3 bars"	:	12.000,
	"4 bars"	:	16.000,
	"8 bars" 	:	32.000,
	"12 bars"	:	48.000,
	"16 bars"	:	64.000
};
var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

/* RUNTIME */

var PARAM_SCALE_ROOT = 0;
var PARAM_SCALE_TYPE = 0;
var PARAM_MAP = PROGRESSION_MAPS[PROGRESSION_MAP_KEYS[0]];
var CHORD_VOICE_SETTINGS = CHORD_VOICE_OPTIONS[CHORD_VOICE_OPTIONS_KEYS[0]];
var PARAM_TARGET_OCTAVE = TARGET_OCTAVE_LIB["3 (Middle C)"];
var PARAM_TRANSPOSE_HIGH_FULCRUM = 71;
var PARAM_TRANSPOSE_LOW_FULCRUM = 60;
var PARAM_SEMITONES = 0;
var PARAM_CHORD_PLAY_LENGTH = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[21]];

var MAP_LAST_SELECTION = "";
var MAP_STARTED = false;

// var MAP = MAP_MAJOR_LEAN_I;
var SCALE = calculate_scale_pitches( PARAM_SCALE_ROOT , 0 );

// the trigger variable is where the next note (or rest) is to be played
// trigger is global to track it across process blocks
// the cursor is a simulated location of the transport/playhead in the track
// cursor is handled locally because only the current process block matters while playing
const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.00001; // smallest note length = 0.125

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

	// when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
	if ( !timing_info.playing ){
		ACTIVE_RGEN_NOTES.forEach( function ( note_on ) {
			var note_off = new NoteOff( note_on );
			note_off.send();
		});
		cursor = timing_info.blockStartBeat;
		TRIGGER = RESET_VALUE;
		MAP_STARTED = false;
		return;
	}
	
	
	// calculate beat to schedule
	var lookAheadEnd = timing_info.blockEndBeat;
	var cursor = timing_info.blockStartBeat;
	if ( TRIGGER == RESET_VALUE ) {
		TRIGGER = timing_info.blockStartBeat;
	}

	// trigger can get stuck outside of cycle causing whole cycle loss of music
	if ( timing_info.cycling && ( !TRIGGER || TRIGGER > timing_info.rightCycleBeat ) ) {
		TRIGGER = ( timing_info.rightCycleBeat > timing_info.blockEndBeat ? timing_info.rightCycleBeat : timing_info.blockEndBeat ); 
		// Assumes the cycle is on a whole number (quarter beat/bottom denominator in time sig);
		if ( TRIGGER == timing_info.rightCycleBeat && Math.trunc(cursor) == timing_info.leftCycleBeat ) {
			TRIGGER = timing_info.blockStartBeat;
		}
			
	}

    // cycling the playhead cretes buffers which need to be managed
    // the buffers are the edges of the cycle
    // process blocks do not line up with cycle bounds
	// when cycling, find the beats that wrap around the last buffer
	if ( timing_info.cycling && lookAheadEnd >= timing_info.rightCycleBeat ) {
        // is the end of the process block past the end of the cycle?
		if ( lookAheadEnd >= timing_info.rightCycleBeat ) {
            // get the length of the process block
			var cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
            // get the difference between the end of the process block and the cycle length
            // this will be the relative shift back to the beginning of the cycle
			var cycleEnd = lookAheadEnd - cycleBeats;
		}
	}

	// increment the cursor through the beats that fall within this cycle's buffers
	while ((cursor >= timing_info.blockStartBeat && cursor < lookAheadEnd)
	// including beats that wrap around the cycle point
	|| (timing_info.cycling && cursor < cycleEnd)) {
		// adjust the cursor and the trigger for the cycle
		if (timing_info.cycling && cursor >= timing_info.rightCycleBeat) {
			cursor -= (timing_info.rightCycleBeat - timing_info.leftCycleBeat);
			TRIGGER = cursor;
		}
        
        // the cursor has come to the trigger
		if ( cursor == TRIGGER ) {

			//  select a pitch from the selected markov chain
            let iteration_key = "";
            let pool = {};
            let iteration_selection = "";

			if ( !MAP_STARTED ) {
				iteration_key = PARAM_MAP["START"];
                pool = PARAM_MAP[ iteration_key ];
                // select a pitch from the pool
				if ( !pool ) {
                    iteration_key = PARAM_MAP["START"];
                    pool = PARAM_MAP[ iteration_key ];
                }
                iteration_selection = getRandomValueFromWeightPool( pool );
                MAP_LAST_SELECTION = iteration_selection;
                MAP_STARTED = true;
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
			Trace( iteration_selection + " --> " + JSON.stringify(chord) );
			// modify the chord
			// transpose the notes in the chord
			// to target octave
			// to below high fulcrum
			// to push up above low fulfcrum
			// adjust by semitones
			// play the notes

			var note_off_beat = TRIGGER + PARAM_CHORD_PLAY_LENGTH;

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
							while ( pitch <= PARAM_TRANSPOSE_HIGH_FULCRUM ) {
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

            		note_on.sendAtBeat( cursor ); 
            		ACTIVE_RGEN_NOTES.push( note_on );

            		let note_off = new NoteOff( note_on );

					// stop the notes the length ahead
					// adjust for the cycle buffers
					if ( timing_info.cycling && note_off_beat >= timing_info.rightCycleBeat ) {
						while ( note_off_beat >= timing_info.rightCycleBeat ) {
							note_off_beat -= cycleBeats;
							// ERROR: note_off_beat = null
							// ATTEMPT: chaning cycleBeats to actual calc crams events at the end of the cycle
						}
					}

					note_off.sendAtBeat( note_off_beat );

					// Trace( note_on );
					// Trace( note_off );
				}
						
			});

			TRIGGER = note_off_beat;

		}

		// advance the cursor and trigger to the next beat
		cursor += CURSOR_INCREMENT;
		if ( TRIGGER < cursor ) {
			TRIGGER = cursor;
		}
	}
}

function ParameterChanged( param , value ) {
	if ( UPDATING_CONTROLS ) {
		Trace("Updating controls");
		return;
	}
	switch (param) {
		case 0:
			// Chord Generation; text only
		break;
		case 1:
			// Scale Root; menu --> MIDI Pitch value
			PARAM_SCALE_ROOT = value;
			// TODO: trigger scale calc
			SCALE = calculate_scale_pitches( PARAM_SCALE_ROOT , PARAM_SCALE_TYPE );
		break;
		case 2:
			// Scale Type; menu --> key
			PARAM_SCALE_TYPE = value;
			// TODO: trigger scale recalc
			SCALE = calculate_scale_pitches( PARAM_SCALE_ROOT , PARAM_SCALE_TYPE );
		break;
		case 3:
			// Progression Map; menu
			PARAM_MAP = PROGRESSION_MAPS[PROGRESSION_MAP_KEYS[value]];
			Trace(PROGRESSION_MAP_KEYS[value]);
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
			// UPDATING_CONTROLS = true;
			let cursor = 6;
			CHORD_VOICE_MODIFIER_KEYS.forEach( function ( voice_key ) {
				SetParameter( cursor, CHORD_VOICE_SETTINGS[ voice_key ] );
				cursor++;
			});
			// UPDATING_CONTROLS = false;
		break;

		case 6:
			CHORD_VOICE_SETTINGS["1"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 7:
			CHORD_VOICE_SETTINGS["3"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 8:
			CHORD_VOICE_SETTINGS["5"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 9:
			CHORD_VOICE_SETTINGS["7"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 10:
			CHORD_VOICE_SETTINGS["9"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 11:
			CHORD_VOICE_SETTINGS["11"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 12:
			CHORD_VOICE_SETTINGS["13"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 13:
			CHORD_VOICE_SETTINGS["alt_bass"] = ( value == true ? 1 : 0 );
			// changes will happen on next chord calc
			Trace(JSON.stringify(CHORD_VOICE_SETTINGS));
			break;
		case 14:
			// Transpositions; text only
			break;
		case 15:
			// Target Octave; menu
			PARAM_TARGET_OCTAVE = TARGET_OCTAVE_LIB[TARGET_OCTAVE_KEYS[value]];
			break;
		case 16:
			// Transpose High Fulcrum; menu
			PARAM_TRANSPOSE_HIGH_FULCRUM = value;
			Trace(PARAM_TRANSPOSE_HIGH_FULCRUM);
			break;
		case 17:
			// Transpose Low Fulcrum; menu
			PARAM_TRANSPOSE_LOW_FULCRUM = value;
			Trace(PARAM_TRANSPOSE_LOW_FULCRUM);
			break;
		case 18:
			// Semitones; linear slider
			PARAM_SEMITONES = value;
			Trace(PARAM_SEMITONES);
			break;
		case 19:
			// Chord Play Length; menu
			PARAM_CHORD_PLAY_LENGTH = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[ value ]];
			Trace(NOTE_LENGTH_KEYS[ value ]);
			break;
		default:
			Trace("ERROR: ParameterChanged( " + param + " , " + value + " )" );
	}
}

/* SCALE MANAGEMENT */

// converts the half- and whole-step jumps into the transposition and pitch shift maps
function calculate_scale_pitches( root, templateIndex ) {
	Trace( "calculate_scale_pitches( " + root + " , " + templateIndex + " )" );
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

  let extensions = [ TOKEN_QUALITY_THIRTEENTH, TOKEN_QUALITY_ELEVENTH, TOKEN_QUALITY_NINTH, TOKEN_QUALITY_SEVENTH, TOKEN_QUALITY_FIFTH ];

  // check the count. If more than 1 extension, then make all extensions `add' extensions
  let add_extensions = [ TOKEN_QUALITY_THIRTEENTH, TOKEN_QUALITY_ELEVENTH, TOKEN_QUALITY_NINTH ];
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

				case TOKEN_QUALITY_ELEVENTH:
					// check the value in the position just before the cursor
					let add11 = false;
					// capture the mod, in position just before the cursor
					mod = chord_spelling.charAt( cursor - 1 );
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
					case TOKEN_QUALITY_NINTH:
						// check the value in the position just before the cursor
						let add9 = false;
						// capture the mod, in position just before the cursor
						mod = chord_spelling.charAt( cursor - 1 );
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
					case TOKEN_QUALITY_SEVENTH:
						// capture the mod, in position just before the cursor
						mod = chord_spelling.charAt( cursor - 1 );
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
				  case TOKEN_QUALITY_FIFTH:
					mod = chord_spelling.charAt( cursor - 1 );
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
              default:
                  console.log( "ERROR: create_chord_from_spelling: extension: " + extension );
                  break;
          }
      }
  });

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

// 6-13
CHORD_VOICE_MODIFIER_KEYS.forEach( function( voice_key ) {
	PluginParameters.push({
		name:"Play/Mute " + voice_key, 
		type:"checkbox", 
		valueStrings:voice_key, 
		defaultValue:1
	});
});

// 14
PluginParameters.push({
	name: "Transpositions",
	type: "text"
});

// 15
PluginParameters.push({
	name:"Target Octave", 
	type:"menu", 
	valueStrings:TARGET_OCTAVE_KEYS, 
	defaultValue:5
});

// 16
PluginParameters.push({
	name:"Transpose High Fulcrum", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:71
});

// 17
PluginParameters.push({
	name:"Transpose Low Fulcrum", 
	type:"menu", 
	valueStrings:PITCH_STRINGS, 
	defaultValue:60
});

// 18
PluginParameters.push({
	name:"Semitones", 
	type:"lin", 
	minValue:-36, 
	maxValue:36, 
	numberOfSteps:72, 
	defaultValue:0
});

// 19
PluginParameters.push({
	name:"Chord Play Length", 
	type:"menu", 
	valueStrings: NOTE_LENGTH_KEYS,
	defaultValue: 21
});