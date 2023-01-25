/******************************************************************************
Name: Sending Custom Messages Across Scripts
Author(s): Philip Regan
Purpose: 
* This script documents how to take advantage of the undefined control bytes in 
the MIDI Spec with the ControlChange object.
* Using these control changes assumes nothing else in the signal chain is using 
them as well. Check the documentation which came with MIDI controllers or 
synths to ensure there are no collisions. The most common functions are 
already defined in the specification, but accounting for every possible 
feature is not possible.

Undefined control bytes --> ControlChange.number
Source: https://www.midi.org/specifications-old/item/table-3-control-change-messages-data-bytes-2

85	01010101	55	Undefined	---	---
86	01010110	56	Undefined	---	---
87	01010111	57	Undefined	---	---

89	01011001	59	Undefined	---	---
90	01011010	5A	Undefined	---	---

102	01100110	66	Undefined	---	---
103	01100111	67	Undefined	---	---
104	01101000	68	Undefined	---	---
105	01101001	69	Undefined	---	---
106	01101010	6A	Undefined	---	---
107	01101011	6B	Undefined	---	---
108	01101100	6C	Undefined	---	---
109	01101101	6D	Undefined	---	---
110	01101110	6E	Undefined	---	---
111	01101111	6F	Undefined	---	---
112	01110000	70	Undefined	---	---
113	01110001	71	Undefined	---	---
114	01110010	72	Undefined	---	---
115	01110011	73	Undefined	---	---
116	01110100	74	Undefined	---	---
117	01110101	75	Undefined	---	---
118	01110110	76	Undefined	---	---
119	01110111	77	Undefined	---	---

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
Core Transmitter and Receiver Scripts
*/

// transmitter script
let cc_event = new ControlChange();
cc_event.number = 85;
cc_event.value = 42;
Trace(cc_event);
cc_event.send();

// Receiver Script
function HandleMIDI(event) {
    if ( event instanceof ControlChange && event.number == 85 ) {
        // do something with the event.
    }
}

/******************************************************************************
Transmitting and receiving events are the easy part of the script. It's a 
simple send and capture of a MIDI event. The hard part is determing how best to 
manage custom data. For single data points, this is fully illustrated in the 
above example. For multiple data points, these need to be handled in a way that 
is reliably consistent.

The following should be considered for transmitting multiple custom data 
points:
* Sending multiple data points as an atomic task wherever possible. In other 
words, when sending two or more data points, do them in the same block of code, 
and not across multiple iterations or functions.
* Sending messages for when types of data have begun being sent and when it has
stopped. This is to ensure data is being captured as expected. This is 
particulary useful in situations where a set of data cannot be set atomically.
* Establish JSON object libraries for numbers and values as necessary. Similar
to the music theory libraries, a custom library which can be easily included 
in a script ensures data is implemented consistently across the signal chain.

Essentially, the MIDI spec is representing musical data as pure numbers, and
the same is true here. Custom data can be represented with a little planning.
With 23 undefined fields and each field accepting a value o 0-127, there is 
the potential of 2,944 data points. There are two fundamental ways to approach 
this:
* Sending data on a specific ControlChange number for each data point. 
* Sending data in a specific ControlChange for all data points and the value 
is broken into specific blocks.

In either approach, economy of data management is critical because of the 
potential of limited ControlChanges numbers, the limited memory of the Scripter
plug-in, and the need for fast calculations during playing.

An example of multiple data points would be transmitting all of the information
needed to re-build a chord.
* scale root
* scale type 
* chord root
* chord type
* chord voice modifiers
* chord voicings/inversions
* chord alternate bass
* target octave

Sending information within a single ControlChange number:

Within a given field, the 0-127 value does not have to be treated as a single
value within the range of 0-127. The 0-127 can be broken into blocks:
* 0-11: status messages
    * 0: custom data start
    * 11: custom data end
* 12-23: scale root, represented in the chromatic scale
* 24-35: scale type
    * 24: Major/Ionian
    * 25: Dorian
    * 26: Phrygian
    * 27: Lydian
    * 28: Mixolydian
    * 29: Minor/Aeolian
    * 30: Locrian
    * 31-35: ...
* 36-47: chord root, represented in the chromatic scale
* 48-59: chord type
    * 48: major
    * 49: minor
    * 50: augmented
    * 51: diminished
    * 52-59: ...
* 60-71 : chord voice modifiers
    * 60: 2nd flat
    * 61: 2nd sharp
    * 62: 3rd flat
    * 63: 3rd sharp
    * 64: 4th flat
    * 65: 4th sharp
    * 66: 5th flat
    * 67: 5th sharp
    * 68: 6th flat
    * 69: 6th sharp
    * 70: 7th flat
    * 71: 7th sharp
* 72-83: chord voicings and inversions
    * 72: no inversion (included a previous version needs to be undone)
    * 73: 1st inversion
    * 74: 2nd inversion
    * 75-83: undefined, but more inversions can be noted for chords with more 
    than four voices
* 84-95: chord alternate bass, represented in chromatic scale
* 96-107: target octave
    * -2
    * -1
    * 0
    * 1
    * 2
    * 3 (Middle C)
    * 4
    * 5
    * 6
    * 7
    * 8
108-127: undefined

To define the root chord of C Major as a minor chord, the following numbers 
would be sent given the above values:

* 0: custom data start
* 12: Scale root: C
* 24: Scale type: Major/Ionian
* 36: Chord root: C
* 48: Chord type: Major
* 62: Chord voice modifier: 3rd flat
* 11: custom data end

The following example puts the scale and chord data into an object for easy
reuse and shows how the data is sent as an atomic task.
******************************************************************************/

const CHORD_DATA_SEND_LIB = {
    'custom_data_start' : 0, // Status messages
    'undefined' : 1, // Status messages
    'undefined' : 2, // Status messages
    'undefined' : 3, // Status messages
    'undefined' : 4, // Status messages
    'undefined' : 5, // Status messages
    'undefined' : 6, // Status messages
    'undefined' : 7, // Status messages
    'undefined' : 8, // Status messages
    'undefined' : 9, // Status messages
    'undefined' : 10, // Status messages
    'custom_data_end' : 11, // Status messages
    'scale_root_c' : 12, // Scale root
    'scale_root_c#_db' : 13, // Scale root
    'scale_root_d' : 14, // Scale root
    'scale_root_d#_eb' : 15, // Scale root
    'scale_root_e' : 16, // Scale root
    'scale_root_f' : 17, // Scale root
    'scale_root_f#_gb' : 18, // Scale root
    'scale_root_g' : 19, // Scale root
    'scale_root_g#_ab' : 20, // Scale root
    'scale_root_a' : 21, // Scale root
    'scale_root_a#_bb' : 22, // Scale root
    'scale_root_b' : 23, // Scale root
    'major_ionian' : 24, // Scale type
    'dorian' : 25, // Scale type
    'phrygian' : 26, // Scale type
    'lydian' : 27, // Scale type
    'mixolydian' : 28, // Scale type
    'minor_aeolian' : 29, // Scale type
    'locrian' : 30, // Scale type
    'undefined' : 31, // Scale type
    'undefined' : 32, // Scale type
    'undefined' : 33, // Scale type
    'undefined' : 34, // Scale type
    'undefined' : 35, // Scale type
    'chord_root_c' : 36, // Chord root
    'chord_root_c#_db' : 37, // Chord root
    'chord_root_d' : 38, // Chord root
    'chord_root_d#_eb' : 39, // Chord root
    'chord_root_e' : 40, // Chord root
    'chord_root_f' : 41, // Chord root
    'chord_root_f#_gb' : 42, // Chord root
    'chord_root_g' : 43, // Chord root
    'chord_root_g#_ab' : 44, // Chord root
    'chord_root_a' : 45, // Chord root
    'chord_root_a#_bb' : 46, // Chord root
    'chord_root_b' : 47, // Chord root
    'major' : 48, // Chord type
    'minor' : 49, // Chord type
    'augmented' : 50, // Chord type
    'diminished' : 51, // Chord type
    'undefined' : 52, // Chord type
    'undefined' : 53, // Chord type
    'undefined' : 54, // Chord type
    'undefined' : 55, // Chord type
    'undefined' : 56, // Chord type
    'undefined' : 57, // Chord type
    'undefined' : 58, // Chord type
    'undefined' : 59, // Chord type
    '2nd_flat' : 60, // Chord voice modifier
    '2nd_sharp' : 61, // Chord voice modifier
    '3rd_flat' : 62, // Chord voice modifier
    '3rd_sharp' : 63, // Chord voice modifier
    '4th_flat' : 64, // Chord voice modifier
    '4th_sharp' : 65, // Chord voice modifier
    '5th_flat' : 66, // Chord voice modifier
    '5th_sharp' : 67, // Chord voice modifier
    '6th_flat' : 68, // Chord voice modifier
    '6th_sharp' : 69, // Chord voice modifier
    '7th_flat' : 70, // Chord voice modifier
    '7th_sharp' : 71, // Chord voice modifier
    'no_inversion' : 72, // Chord voicing and inversions
    '1st_inversion' : 73, // Chord voicing and inversions
    '2nd_inversion' : 74, // Chord voicing and inversions
    '3rd_inversion' : 75, // Chord voicing and inversions
    'undefined' : 76, // Chord voicing and inversions
    'undefined' : 77, // Chord voicing and inversions
    'undefined' : 78, // Chord voicing and inversions
    'undefined' : 79, // Chord voicing and inversions
    'undefined' : 80, // Chord voicing and inversions
    'undefined' : 81, // Chord voicing and inversions
    'undefined' : 82, // Chord voicing and inversions
    'undefined' : 83, // Chord voicing and inversions
    'chord_bass_c' : 84, // Chord alternate bass
    'chord_bass_c#_db' : 85, // Chord alternate bass
    'chord_bass_d' : 86, // Chord alternate bass
    'chord_bass_d#_eb' : 87, // Chord alternate bass
    'chord_bass_e' : 88, // Chord alternate bass
    'chord_bass_f' : 89, // Chord alternate bass
    'chord_bass_f#_gb' : 90, // Chord alternate bass
    'chord_bass_g' : 91, // Chord alternate bass
    'chord_bass_g#_ab' : 92, // Chord alternate bass
    'chord_bass_a' : 93, // Chord alternate bass
    'chord_bass_a#_bb' : 94, // Chord alternate bass
    'chord_bass_b' : 95, // Chord alternate bass
    'octave_-2' : 96, // Chord target octave
    'octave_-1' : 97, // Chord target octave
    'octave_0' : 98, // Chord target octave
    'octave_1' : 99, // Chord target octave
    'octave_2' : 100, // Chord target octave
    'octave_3_(middle_c)' : 101, // Chord target octave
    'octave_4' : 102, // Chord target octave
    'octave_5' : 103, // Chord target octave
    'octave_6' : 104, // Chord target octave
    'octave_7' : 105, // Chord target octave
    'octave_8' : 106, // Chord target octave
    'undefined' : 107, // Undefined
    'undefined' : 108, // Undefined
    'undefined' : 109, // Undefined
    'undefined' : 110, // Undefined
    'undefined' : 111, // Undefined
    'undefined' : 112, // Undefined
    'undefined' : 113, // Undefined
    'undefined' : 114, // Undefined
    'undefined' : 115, // Undefined
    'undefined' : 116, // Undefined
    'undefined' : 117, // Undefined
    'undefined' : 118, // Undefined
    'undefined' : 119, // Undefined
    'undefined' : 120, // Undefined
    'undefined' : 121, // Undefined
    'undefined' : 122, // Undefined
    'undefined' : 123, // Undefined
    'undefined' : 124, // Undefined
    'undefined' : 125, // Undefined
    'undefined' : 126, // Undefined
    'undefined' : 127  // Undefined
}

const CHORD_DATA_RECEIVE_LIB = {
    0 : 'custom_data_start', //  Status messages
    1 : 'undefined', //  Status messages
    2 : 'undefined', //  Status messages
    3 : 'undefined', //  Status messages
    4 : 'undefined', //  Status messages
    5 : 'undefined', //  Status messages
    6 : 'undefined', //  Status messages
    7 : 'undefined', //  Status messages
    8 : 'undefined', //  Status messages
    9 : 'undefined', //  Status messages
    10 : 'undefined', //  Status messages
    11 : 'custom_data_end', //  Status messages
    12 : 'scale_root_c', //  Scale root
    13 : 'scale_root_c#_db', //  Scale root
    14 : 'scale_root_d', //  Scale root
    15 : 'scale_root_d#_eb', //  Scale root
    16 : 'scale_root_e', //  Scale root
    17 : 'scale_root_f', //  Scale root
    18 : 'scale_root_f#_gb', //  Scale root
    19 : 'scale_root_g', //  Scale root
    20 : 'scale_root_g#_ab', //  Scale root
    21 : 'scale_root_a', //  Scale root
    22 : 'scale_root_a#_bb', //  Scale root
    23 : 'scale_root_b', //  Scale root
    24 : 'major_ionian', //  Scale type
    25 : 'dorian', //  Scale type
    26 : 'phrygian', //  Scale type
    27 : 'lydian', //  Scale type
    28 : 'mixolydian', //  Scale type
    29 : 'minor_aeolian', //  Scale type
    30 : 'locrian', //  Scale type
    31 : 'undefined', //  Scale type
    32 : 'undefined', //  Scale type
    33 : 'undefined', //  Scale type
    34 : 'undefined', //  Scale type
    35 : 'undefined', //  Scale type
    36 : 'chord_root_c', //  Chord root
    37 : 'chord_root_c#_db', //  Chord root
    38 : 'chord_root_d', //  Chord root
    39 : 'chord_root_d#_eb', //  Chord root
    40 : 'chord_root_e', //  Chord root
    41 : 'chord_root_f', //  Chord root
    42 : 'chord_root_f#_gb', //  Chord root
    43 : 'chord_root_g', //  Chord root
    44 : 'chord_root_g#_ab', //  Chord root
    45 : 'chord_root_a', //  Chord root
    46 : 'chord_root_a#_bb', //  Chord root
    47 : 'chord_root_b', //  Chord root
    48 : 'major', //  Chord type
    49 : 'minor', //  Chord type
    50 : 'augmented', //  Chord type
    51 : 'diminished', //  Chord type
    52 : 'undefined', //  Chord type
    53 : 'undefined', //  Chord type
    54 : 'undefined', //  Chord type
    55 : 'undefined', //  Chord type
    56 : 'undefined', //  Chord type
    57 : 'undefined', //  Chord type
    58 : 'undefined', //  Chord type
    59 : 'undefined', //  Chord type
    60 : '2nd_flat', //  Chord voice modifier
    61 : '2nd_sharp', //  Chord voice modifier
    62 : '3rd_flat', //  Chord voice modifier
    63 : '3rd_sharp', //  Chord voice modifier
    64 : '4th_flat', //  Chord voice modifier
    65 : '4th_sharp', //  Chord voice modifier
    66 : '5th_flat', //  Chord voice modifier
    67 : '5th_sharp', //  Chord voice modifier
    68 : '6th_flat', //  Chord voice modifier
    69 : '6th_sharp', //  Chord voice modifier
    70 : '7th_flat', //  Chord voice modifier
    71 : '7th_sharp', //  Chord voice modifier
    72 : 'no_inversion', //  Chord voicing and inversions
    73 : '1st_inversion', //  Chord voicing and inversions
    74 : '2nd_inversion', //  Chord voicing and inversions
    75 : '3rd_inversion', //  Chord voicing and inversions
    76 : 'undefined', //  Chord voicing and inversions
    77 : 'undefined', //  Chord voicing and inversions
    78 : 'undefined', //  Chord voicing and inversions
    79 : 'undefined', //  Chord voicing and inversions
    80 : 'undefined', //  Chord voicing and inversions
    81 : 'undefined', //  Chord voicing and inversions
    82 : 'undefined', //  Chord voicing and inversions
    83 : 'undefined', //  Chord voicing and inversions
    84 : 'chord_bass_c', //  Chord alternate bass
    85 : 'chord_bass_c#_db', //  Chord alternate bass
    86 : 'chord_bass_d', //  Chord alternate bass
    87 : 'chord_bass_d#_eb', //  Chord alternate bass
    88 : 'chord_bass_e', //  Chord alternate bass
    89 : 'chord_bass_f', //  Chord alternate bass
    90 : 'chord_bass_f#_gb', //  Chord alternate bass
    91 : 'chord_bass_g', //  Chord alternate bass
    92 : 'chord_bass_g#_ab', //  Chord alternate bass
    93 : 'chord_bass_a', //  Chord alternate bass
    94 : 'chord_bass_a#_bb', //  Chord alternate bass
    95 : 'chord_bass_b', //  Chord alternate bass
    96 : 'octave_-2', //  Chord target octave
    97 : 'octave_-1', //  Chord target octave
    98 : 'octave_0', //  Chord target octave
    99 : 'octave_1', //  Chord target octave
    100 : 'octave_2', //  Chord target octave
    101 : 'octave_3_(middle_c)', //  Chord target octave
    102 : 'octave_4', //  Chord target octave
    103 : 'octave_5', //  Chord target octave
    104 : 'octave_6', //  Chord target octave
    105 : 'octave_7', //  Chord target octave
    106 : 'octave_8', //  Chord target octave
    107 : 'undefined', //  Undefined
    108 : 'undefined', //  Undefined
    109 : 'undefined', //  Undefined
    110 : 'undefined', //  Undefined
    111 : 'undefined', //  Undefined
    112 : 'undefined', //  Undefined
    113 : 'undefined', //  Undefined
    114 : 'undefined', //  Undefined
    115 : 'undefined', //  Undefined
    116 : 'undefined', //  Undefined
    117 : 'undefined', //  Undefined
    118 : 'undefined', //  Undefined
    119 : 'undefined', //  Undefined
    120 : 'undefined', //  Undefined
    121 : 'undefined', //  Undefined
    122 : 'undefined', //  Undefined
    123 : 'undefined', //  Undefined
    124 : 'undefined', //  Undefined
    125 : 'undefined', //  Undefined
    126 : 'undefined', //  Undefined
    127 : 'undefined'  //  Undefined
}

const CHORD_CC_NUMBER = 55;

// Sending the data

// create and send a ControlChange object
function send_control_change( number, value ) {
    let chord_cc_event = new ControlChange();
    chord_cc_event.number = number;
    chord_cc_event.value = value;
    chord_cc_event.send();
}

// sending everything atomically; no other tasks will happen until this block
// of code has completed.
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB.custom_data_start );
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB.scale_root_c );
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB.major_ionian );
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB.chord_root_c );
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB.major );
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB["3rd_flat"] );
send_control_change( CHORD_CC_NUMBER , CHORD_DATA_SEND_LIB.custom_data_end );

// receiving the data

const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

var CHORD_DATA_CACHE = {};
var CHORD_DATA_RECEIVING = false;

function HandleMIDI( event ) {
    if ( event instanceof ControlChange && event.number == CHORD_CC_NUMBER ) {
        handle_chord_control_change( event );
    }
}

function handle_chord_control_change( chord_cc_event ) {
    switch ( chord_cc_event.value ) {
        case 0:
            CHORD_DATA_RECEIVING = true;
            break;
        case 11:
            CHORD_DATA_RECEIVING = false;
        default:
            break;
    }
    if ( !CHORD_DATA_RECEIVING ) {
        return;
    }

    /*
        collect all of the chord data in the cache
    */
    switch ( chord_cc_event.value ) {
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 21:
        case 22:
        case 23:
            CHORD_DATA_CACHE["scale_root"] = CHROMATIC_SCALE_STRINGS[ chord_cc_event.value - 12 ];
            break;
        default:
            break;
    }

    /*
        build the chord
    */ 

}