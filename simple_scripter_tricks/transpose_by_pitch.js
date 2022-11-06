/******************************************************************************
Name: transpose by pitch
Author(s): Philip Regan
Purpose:
* The Reverse Pitch MIDI transformation will transpose a pitch based on the 
number of half-steps from a fulcrum pitch. This can lead to non-diatonic pitches
in the outcome: For example if working in C Ionian:
    Target pitch = 62 = D = diatonic
    Fulcrum Pitch = 60 = C = diatonic
    Reversed pitch = 58 = A♯/B♭ = non-diatonic
* This script will do both the half-step calculation, and will also transpose
the target pitch by an octave, much like inverting a chord. For example, if 
working in C Ionian:
    Target pitch = 62 = D-3 = diatonic
    Fulcrum Pitch = 60 = C-3 = diatonic
    Reversed pitch = 50 = D-2 = diatonic

* 

Roadmap:
* v1: pitch reversal by half-step or octave
    X Select fulcrum pitch
    X Select half-step or octave (inversion)
    X Select direction
        X bi-direction (default)
        X Up (if pitch below fulcrum, then push up)
        X Down (if pitch above fulcrum, then push down)
    X calc reversal
        X half-step
        X octave
* v2: transpose into pitch range
    * select high pitch
    * select low pitch
    * calc above high pitch to below
    * calc below low pitch to above
* v3: reversal within diatonic set
    * add scale management
    * calc scale degrees to fulcrum
    * calc reversal by scale degrees 

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

const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
const OCTAVE_STRINGS = ["-2", "-1", "0", "1", "2", "3", "4", "5", "6", "7", "8"];
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
        if ( octave_cursor == OCTAVE_STRINGS.length ) {
            octave_cursor = 0;
        }
    }
    
    PITCH_STRINGS.push( CHROMATIC_SCALE_STRINGS[pitch_cursor] + " " + OCTAVE_STRINGS[octave_cursor] + " (" + pitch + ")" );
}

var FULCRUM_PITCH = 60;
const CALC_METHODS = ["Half-step", "Octave"];
var CALC_METHOD = CALC_METHODS[0];
const CALC_DIRS = ["Bi-directional", "Up only", "Down only"];
var CALC_DIR = CALC_DIRS[0];

function HandleMIDI( event ) {
    if ( event instanceof NoteOn || event instanceof NoteOff ) {
        let new_pitch = calculate_reversal( event.pitch );
        new_pitch = MIDI.normalizeData( new_pitch );
        event.pitch = new_pitch;
    }
    event.send();
}

function calculate_reversal( orig_pitch ) {
    // handle the cases where nothing needs to change
    if ( CALC_DIR == 0 && orig_pitch == FULCRUM_PITCH ) {
        return orig_pitch;
    }
    if ( CALC_DIR == 1 && orig_pitch >= FULCRUM_PITCH ) {
        return orig_pitch;
    }
    if ( CALC_DIR == 2 && orig_pitch <= FULCRUM_PITCH ) {
        return orig_pitch;
    }
    // handle each combination individually; no need to get clever here
    // repeated calcs are placed into functions for clarity and maintenance
    // bi-directional
    if ( CALC_DIR == 0 ) {
        // half-step
        if ( CALC_METHOD == 0 ) {
            if ( orig_pitch > FULCRUM_PITCH ) {
                return calc_halfstep_down( orig_pitch );
            } else {
                return calc_halfstep_up( orig_pitch );
            }
        }
        // octave
        if ( CALC_METHOD == 1 ) {
            if ( orig_pitch > FULCRUM_PITCH ) {
                return calc_octave_down( orig_pitch );
            } else {
                return calc_octave_up( orig_pitch );
            }
        }
    }
    // up only
    if ( CALC_DIR == 1 ) {
        // half-step
        if ( CALC_METHOD == 0 ) {
            if ( orig_pitch < FULCRUM_PITCH ) {
                return calc_halfstep_up( orig_pitch );
            }
        }
        // octave
        if ( CALC_METHOD == 1 ) {
            if ( orig_pitch < FULCRUM_PITCH ) {
                return calc_octave_up( orig_pitch );
            }
        }
    }

     // down only
     if ( CALC_DIR == 2 ) {
        // half-step
        if ( CALC_METHOD == 0 ) {
            if ( orig_pitch > FULCRUM_PITCH ) {
                return calc_halfstep_down( orig_pitch );
            }
        }
        // octave
        if ( CALC_METHOD == 1 ) {
            if ( orig_pitch > FULCRUM_PITCH ) {
                return calc_octave_down( orig_pitch );
            }
        }
    }
    // we've not accounted for all of the possible combinations
    // so we don't change anything and post an error
    Trace("ERROR: calculate_reversal(): missing settings combination: " + JSON.stringify({CALC_DIR:CALC_DIR, CALC_METHOD:CALC_METHOD}));
    return orig_pitch;
}

function calc_halfstep_up( orig_pitch ) {
    let diff = FULCRUM_PITCH - orig_pitch;
    let new_pitch = orig_pitch + ( diff * 2 );
    return new_pitch;
}

function calc_halfstep_down( orig_pitch ) {
    let diff = orig_pitch - FULCRUM_PITCH;
    let new_pitch = orig_pitch - ( diff * 2 );
    return new_pitch;
}

function calc_octave_up( orig_pitch ) {
    // we need to calculate the diff by octave
    // get fulcrum octave
    let fulcrum_octave = get_octave_for_pitch( FULCRUM_PITCH );
    // get orig octave
    let orig_octave = get_octave_for_pitch( orig_pitch );
    // diff the octaves
    let octave_diff = ( fulcrum_octave - orig_octave );
    // update the original pitch by octave diff * 12 
    let new_pitch = orig_pitch + ( octave_diff * 12 );
    return new_pitch;
}

function calc_octave_down( orig_pitch ) {
    // we need to calculate the diff by octave
    // get fulcrum octave
    let fulcrum_octave = get_octave_for_pitch( FULCRUM_PITCH );
    // get orig octave
    let orig_octave = get_octave_for_pitch( orig_pitch );
    // diff the octaves
    let octave_diff = ( orig_octave - fulcrum_octave );
    // update the original pitch by octave diff * 12 
    let new_pitch = orig_pitch - ( octave_diff * 12 );
    return new_pitch;
}

function get_octave_for_pitch( pitch ) {
    // array for fast lookup
    const octaves = [1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,9,9,9,9,9,9,10,10,10,10,10,10,10,10,10,10,10,10,11,11,11,11,11,11,11,11];
    return octaves[ pitch ];
    /*
        if ( pitch >= 0 && pitch <= 11 ) {
            return 1;
        } else if ( pitch >= 12 && pitch <= 23 ) {
            return 2;
        } else if ( pitch >= 24 && pitch <= 35 ) {
            return 3;
        } else if ( pitch >= 36 && pitch <= 47 ) {
            return 4;
        } else if ( pitch >= 48 && pitch <= 59 ) {
            return 5;
        } else if ( pitch >= 60 && pitch <= 71 ) {
            return 6;
        } else if ( pitch >= 72 && pitch <= 83 ) {
            return 7;
        } else if ( pitch >= 84 && pitch <= 95 ) {
            return 8;
        } else if ( pitch >= 96 && pitch <= 107 ) {
            return 9;
        } else if ( pitch >= 108 && pitch <= 119 ) {
            return 10;
        } else if ( pitch >= 120 && pitch <= 127 ) {
            return 11;
        }
    */

}

function ParameterChanged( param , value ) {
    switch ( param ) {
        case 0:
            FULCRUM_PITCH = value;
            break;
        case 1:
            CALC_METHOD = CALC_METHODS[value];
            break;
        case 2:
            CALC_DIR = CALC_DIRS[value];
            break;
        default:
            Trace("ERROR: ParameterChanged(" + param + ", " + value + ")");
    }
}

PluginParameters.push({
    name:"Fulcrum Pitch", 
    type:"menu", 
    valueStrings:PITCH_STRINGS, 
    defaultValue:60
});

PluginParameters.push({
    name:"Reversal Method",
    type:"menu",
    valueStrings:CALC_METHODS,
    defaultValue:0
});

PluginParameters.push({
    name:"Direction",
    type:"menu",
    valueStrings:CALC_DIRS,
    defaultValue:0
});