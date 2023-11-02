/******************************************************************************
Name: Transposition to Range
Author(s): Philip Regan
Purpose:
* A simple convenience plug-in which transposes all notes based on a 
pair of fulcrum pitches. This can be accomplished with the Simple Transposition
but that takes two plug-in slots while this only takes in one.
* There is no bounds checking on whether the selected fulcrum pitches are 
inverted from each other.

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

var HIGH_FULCRUM_PITCH = 72;
var LOW_FULCRUM_PITCH = 60;

function HandleMIDI( event ) {
    if ( event instanceof NoteOn || event instanceof NoteOff ) {
        let new_pitch = calculate_transposition( event.pitch );
        new_pitch = MIDI.normalizeData( new_pitch );
        Trace(event.pitch + "\t" + new_pitch);
        event.pitch = new_pitch;
    }
    event.send();
}

function calculate_transposition( orig_pitch ) {
    let cache_pitch = orig_pitch;

    if ( orig_pitch <= HIGH_FULCRUM_PITCH && orig_pitch >= LOW_FULCRUM_PITCH ) {
        return orig_pitch;
    }

    if ( orig_pitch > HIGH_FULCRUM_PITCH ) {
        while ( cache_pitch > HIGH_FULCRUM_PITCH && orig_pitch >= LOW_FULCRUM_PITCH ) {
            cache_pitch -= 12;
        }   
    } 

    if ( orig_pitch < LOW_FULCRUM_PITCH ) {
        while ( cache_pitch <= HIGH_FULCRUM_PITCH && orig_pitch < LOW_FULCRUM_PITCH ) {
            cache_pitch += 12;
        }   
    }

    return cache_pitch;
}

function ParameterChanged( param , value ) {
    switch ( param ) {
        case 0:
            HIGH_FULCRUM_PITCH = value;
            break;
        case 1:
            // Direction
            LOW_FULCRUM_PITCH = value;
            break;
        default:
            Trace("ERROR: ParameterChanged(" + param + ", " + value + ")");
    }
}

PluginParameters.push({
    name:"High Fulcrum Pitch", 
    type:"menu", 
    valueStrings:PITCH_STRINGS, 
    defaultValue:71
});

PluginParameters.push({
    name:"Low Fulcrum Pitch",
    type:"menu",
    valueStrings:PITCH_STRINGS,
    defaultValue:60
});