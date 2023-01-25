/******************************************************************************
Name: Runtime Chord Generator
Author(s): Philip Regan
Purpose: 
* Creates diatonic chords based on a single root note within a particular scale 
and modifies them based on specific musical needs
* Intended to assist in improvisation and sketching new musical ideas

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
const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
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
var KEYBOARD_SCALE = [];

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
    "Extensions (9, 11, 13)" : [0, 0, 0, 0, 1, 1, 1],
    "Pentatonic (1, 3, 5, 9, 11)" : [1, 1, 1, 0, 1, 1, 0],
    "Exclude Minor 9ths" : [1, 1, 1, 1, 1, 1, 1]
};
const CHORD_VOICE_OPTIONS_KEYS = Object.keys( CHORD_VOICE_OPTIONS );
var CHORD_VOICE_OPTION_SELECTION = 4;
var UPDATING_CONTROLS = false;

var SCALE_ROOT = 0;
var SCALE_TEMPLATE_INDEX = 0;
var CHORD_ROOT = 0;
var CHORD_ORIGINAL  = [];
var CHORD_VOICES = [];
// Parameter Changed -> update chord options -> get voices from chord -> CHORD_OPTIONS
var CHORD_OPTIONS = [1, 1, 1, 1, 1, 1, 1];

var ACTIVE_NOTES = [];

// test();
// function test() {
//     calculate_scale_pitches(0, 0);
//     let chord = calculate_chord_pitches(0, KEYBOARD_SCALE);
//     let options = [1, 1, 0, 1, 0, 0, 0];
//     let voices = get_voices_from_chord( options, chord );
//     console.log(voices);
// }

function HandleMIDI( event ) {

    // note on and note off assumes a single event is going to equate to a chord
    if ( event instanceof NoteOn ) {
        Trace( event );
        calculate_scale_pitches( SCALE_ROOT, SCALE_TEMPLATE_INDEX );
        // Trace( JSON.stringify( KEYBOARD_SCALE ) );
        CHORD_ROOT = transpose_pitch_to_lowest_octave( event.pitch );
        // Trace( CHORD_ROOT );
        CHORD_ORIGINAL = calculate_chord_pitches( CHORD_ROOT, KEYBOARD_SCALE );
        CHORD_VOICES = get_voices_from_chord( CHORD_OPTIONS, CHORD_ORIGINAL );
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

function remove_minor_9ths( chord ) {
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

function transpose_pitch_to_lowest_octave( pitch ) {
    let tp_pitch = pitch;
    while ( tp_pitch > 11 ) {
        tp_pitch -= CHROMATIC_HALF_STEPS;
    }
    return tp_pitch;
}

function update_chord_options( index, value ) {

    if ( index == 4 ) {
        UPDATING_CONTROLS = true;
        let options = CHORD_VOICE_OPTIONS[CHORD_VOICE_OPTIONS_KEYS[value]];
        SetParameter( 5, options[ 0 ] );
        SetParameter( 6, options[ 1 ] );
        SetParameter( 7, options[ 2 ] );
        SetParameter( 8, options[ 3 ] );
        SetParameter( 9, options[ 4 ] );
        SetParameter( 10, options[ 5 ] );
        SetParameter( 11, options[ 6 ] );
        UPDATING_CONTROLS = false;
    }
    CHORD_OPTIONS[ 0 ] = GetParameter( 5 );
    CHORD_OPTIONS[ 1 ] = GetParameter( 6 );
    CHORD_OPTIONS[ 2 ] = GetParameter( 7 );
    CHORD_OPTIONS[ 3 ] = GetParameter( 8 );
    CHORD_OPTIONS[ 4 ] = GetParameter( 9 );
    CHORD_OPTIONS[ 5 ] = GetParameter( 10 );
    CHORD_OPTIONS[ 6 ] = GetParameter( 11 );
}

function get_voices_from_chord( options, chord ) {
    let voices = [];
    if ( CHORD_VOICE_OPTION_SELECTION == CHORD_VOICE_OPTIONS_KEYS.length - 1 ) {
        voices = remove_minor_9ths( chord );
    } else {
        for ( let index = 0; index < options.length; index++ ) {
            if ( options[index] == 1 ) {
                voices.push( chord[ index ] );
            } 
        }
    }
    return voices;
}

function calculate_chord_pitches( root, scale ) {
    let voices = [];
    let root_index = scale.indexOf( root );
    // root
    voices.push( scale[ root_index ] );
    // 3rd
    voices.push( scale[ root_index + 2 ] );
    // 5th
    voices.push( scale[ root_index + 4 ] );
    // 7th
    voices.push( scale[ root_index + 6 ] );
    // 9th
    voices.push( scale[ root_index + 8 ] );
    // 11th
    voices.push( scale[ root_index + 10 ] );
    // 13th
    voices.push( scale[ root_index + 12 ] );
    return voices;
}

// converts the half- and whole-step jumps into the transposition and pitch shift maps
function calculate_scale_pitches( root, templateIndex ) {

	// root index maps directly to MIDI pitches 0-11
	let template = SCALE_TEMPLATES[SCALE_KEYS[templateIndex]];
	let lastPitch = root;
	// init
	let map = [];
	map.push( root );

	// build; length - 2 because we ignore the last value
	for ( let index = 0 ; index <= template.length - 2 ; index++ ) {
		let steps = template[index];
		let pitch = lastPitch + steps;
		if ( steps > 1 ) {
			while ( steps > 1 ) {
				map.push( null );
				steps--;
			}
		}
		map.push( pitch );
		lastPitch = pitch;
	}
		
	// normalize to octave C-2 (MIDI pitches 0-11)
    var normalized_map = map;
    // map.forEach( function ( pitch ) {
	// 	if ( pitch != null && pitch >= 12 ) { 
	// 		pitch = pitch - 12;
	// 	}
    //     normalized_map[pitch] = pitch;
    // });
    // fill blank elements with null to ensure mapping is correct
	for (let index = 0; index < normalized_map.length; index++) {
        const element = normalized_map[index];
        if ( !element && element !== 0 ) {
            normalized_map[index] = null;
        }
    }

    // expand normalized cache to entire MIDI keyboard
	for (let index = 0; index < 12; index++) {
        normalized_map.forEach( function ( pitch ) {
            if ( pitch != null ) {
                KEYBOARD_SCALE.push( pitch + ( index * 12 ) );
            } else {
                // KEYBOARD_SCALE.push(null);
            }
        });
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
            calculate_scale_pitches( SCALE_ROOT, SCALE_TEMPLATE_INDEX );
            break;
        case 2:
            // scale type
            SCALE_TEMPLATE_INDEX = value;
            calculate_scale_pitches( SCALE_ROOT, SCALE_TEMPLATE_INDEX );
            break;
        case 3:
            // chord root
            CHORD_ROOT = value;
            calculate_chord_pitches(CHORD_ROOT, KEYBOARD_SCALE);
            break;
        case 4:
            CHORD_VOICE_OPTION_SELECTION = value;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
            update_chord_options(index, value);
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