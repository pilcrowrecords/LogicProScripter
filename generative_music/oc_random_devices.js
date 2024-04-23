/******************************************************************************
Name: Randomize Note and Chodify
Author(s): Philip Regan
Purpose: Recreate devices in Ableton to generate random notes and chords and 
melodies. Works best with a transposition plug-in.

Roadmap:
* Add default chord selections
* Add re-lengthen functionality

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

******************************************************************************/

/*
SCRIPTER GLOBAL VARIABLES
*/

var NeedsTimingInfo = true;
var PluginParameters = [];

/* 
CUSTOM GLOBAL VARIABLES 
*/

const CHANCE_MIN = 0;
const CHANCE_DEF = 50;
const CHANCE_MAX = 100;
const CHOICES_MIN = 1;
const CHOICES_MAX = 24;
const CHOICES_DEF = 3;
const DISTANCE_MIN = 1;
const DISTANCE_MAX = 12;
const DISTANCE_DEF = 3;
const SIGN_DOWN = -1;
const SIGN_BI = 0;
const SIGN_UP = 1;
const SIGN_DOWN_TEXT = "Down";
const SIGN_BI_TEXT = "Bi-directional";
const SIGN_UP_TEXT = "Up";
const SIGN_DEF = 0;
const HALFSTEPS_MIN = -36;
const HALFSTEPS_MAX = 36;
const HALFSTEPS_ITERATIONS = 72;
const HALFSTEPS_DEF = 0;
const ROUTING = [ "Randomize > Chordify", "Chordify > Randomize" ];
const NOTE_LENGTH_TRIGGERS = ["NoteOn", "NoteOff"];
const NOTE_LENGTH_TRIGGER_DEF = 0;
const NOTE_LENGTH_MODES = ["sync", "ms"];
const NOTE_LENGTH_MODES_DEF = 0;

// 0
let RANDOMIZE_VAL = 0; // 1
let CHORDIFY_VAL = 1; // 2
let RELENGTH_VAL = 0; // 3
let ROUTING_VAL = 2; // 4
// 5
let CHANCE_VAL = CHANCE_DEF; // 6
let CHOICES_VAL = CHOICES_DEF; // 7
let DISTANCE_VAL = DISTANCE_DEF; // 8
let DIRECTION_VAL = SIGN_DEF; // 9
// 10
let VOICE_1_VAL = 0; // 11
let VOICE_2_VAL = 0; // 12
let VOICE_3_VAL = 0; // 13
let VOICE_4_VAL = 0; // 14
let VOICE_5_VAL = 0; // 15
let VOICE_6_VAL = 0; // 16

let NOTE_TRACKING = [];

function HandleMIDI( event ) {
    if ( event instanceof NoteOn ) {
        if ( RANDOMIZE_VAL || CHORDIFY_VAL || RELENGTH_VAL ) {
            let cache = [];
            if ( ROUTING_VAL == 0 ) {
                // Trace("HandleMIDI: " + ROUTING[ROUTING_VAL]);
                if ( RANDOMIZE_VAL ) {
                    let randomized_pitch = randomize( event.pitch, CHANCE_VAL, CHOICES_VAL, DISTANCE_VAL, DIRECTION_VAL );
                    cache.push(randomized_pitch);
                } else {
                    cache.push( event.pitch );
                }
                if ( CHORDIFY_VAL ) {
                    cache = chordify( cache[0], VOICE_1_VAL, VOICE_2_VAL, VOICE_3_VAL, VOICE_4_VAL, VOICE_5_VAL, VOICE_6_VAL );
                }
            } else {
                if ( CHORDIFY_VAL ) {
                    cache = chordify( event.pitch, VOICE_1_VAL, VOICE_2_VAL, VOICE_3_VAL, VOICE_4_VAL, VOICE_5_VAL, VOICE_6_VAL );
                }
                if ( RANDOMIZE_VAL ) {
                    for (let index = 0; index < cache.length; index++) {
                        const pitch = cache[index];
                        let randomized_pitch = randomize( pitch, CHANCE_VAL, CHOICES_VAL, DISTANCE_VAL, DIRECTION_VAL );
                        cache[index] = randomized_pitch;
                    }
                }
            }
            add_events_to_active_notes( event, cache );
            cache.forEach( function ( pitch ) {
                let note_on = new NoteOn();
                note_on.pitch = pitch;
                note_on.velocity = event.velocity;
                note_on.send();
            });
        } else {
            event.send();    
        }
    } else if ( event instanceof NoteOff ) {
        let cache = remove_events_from_active_notes( event );
        cache.forEach( function( pitch ) {
            let note_off = new NoteOff;
            note_off.pitch = pitch;
            note_off.send();
        });
    } else {
        event.send()
    }
}

function ParameterChanged( param, value ) {
	
	switch( param ) {
        // 0
        case 0:
        case 1:
            RANDOMIZE_VAL = value; // 1
            Trace(JSON.stringify({RANDOMIZE_VAL:RANDOMIZE_VAL}));
            break;
        case 2:
            CHORDIFY_VAL = value; // 2
            Trace(JSON.stringify({RANDOMIZE_VAL:CHORDIFY_VAL}));
            break;
        case 3:
            ROUTING_VAL = value; // 4
            Trace(JSON.stringify({ROUTING_VAL:ROUTING[ROUTING_VAL]}));
            break;
        case 4:
        case 5:
            CHANCE_VAL = value; // 6
            break;
        case 6:
            CHOICES_VAL = value; // 7
            break;
        case 7:
            DISTANCE_VAL = value; // 8
            break;
        case 8:
            DIRECTION_VAL = value; // 9
            break;
        case 9:
        case 10:
            VOICE_1_VAL = value; // 11
            break;
        case 11:
            VOICE_2_VAL = value; // 12
            break;
        case 12:
            VOICE_3_VAL = value; // 13
            break;
        case 13:
            VOICE_4_VAL = value; // 14
            break;
        case 14:
            VOICE_5_VAL = value; // 15
            break;
        case 15:
            VOICE_6_VAL = value; // 16
            break;
        default:
            // ERROR
    }
}

/*
src_pitch: integer 0-127; MIDI pitch
chance: integer 0-100; percentage
choices: integer 1-24; half-steps
scale: integer 1-12; half steps
sign: integer {-1, 0, 1}; direction: down, bi, up
returns integer 0-127; MIDI pitch
*/
function randomize( src_pitch, chance, choices, distance, direction ) {
    // console.log([src_pitch, chance, choices, distance, direction]);
    // are we randomizing this pitch?
    if ( rInt(0, 100) > chance ) {
        return src_pitch;
    }
    let pool = [];
    // add src to pool
    pool.push( src_pitch );
    let last_pitch = src_pitch
    switch ( direction ) {
        // determine direction
        case -1:
            // add pitches to pool by adding from src or last pitch by distance
            for (let index = 0; index < choices; index++) {
                let new_pitch = last_pitch - distance;
                if ( new_pitch < 0 ) {
                    new_pitch = 0;
                }
                pool.push( new_pitch );
                last_pitch = new_pitch;
            }
            break;
        case 0:
            for (let index = 0; index < choices; index++) {
                let new_pitch = last_pitch - distance;
                if ( new_pitch < 0 ) {
                    new_pitch = 0;
                }
                pool.push( new_pitch );
                last_pitch = new_pitch;
            }
            last_pitch = src_pitch;
            for (let index = 0; index < choices; index++) {
                let new_pitch = last_pitch + distance;
                if ( new_pitch > 127 ) {
                    new_pitch = 127;
                }
                pool.push( new_pitch );
                last_pitch = new_pitch;
            }
            break;
        case 1:
            for (let index = 0; index < choices; index++) {
                let new_pitch = last_pitch + distance;
                if ( new_pitch > 127 ) {
                    new_pitch = 127;
                }
                pool.push( new_pitch );
                last_pitch = new_pitch;
            }
            break;
        default:
            // error
            break;
    }
    // select a random pitch
    pool = [...new Set(pool)];
    // Trace(pool);
    console.log( JSON.stringify( pool ) );
    let r = rInt( 0, pool.length - 1 );
    return pool[ r ];
}

/*
root: Integer 0-127; MIDI
first, third . . . thirteenth: Integer 0-36; half-steps, 0 = don't calculate
    first = root so it can be turned off in the resulting chord
transpose: Integer -36...0...36: half-steps
returns array of Integers
*/
function chordify( root, first, third, fifth, seventh, ninth, eleventh, thirteenth ) {
    let chord = [];
    let intervals = [ first, third, fifth, seventh, ninth, eleventh, thirteenth ];
    for (let index = 0; index < intervals.length; index++) {
        const interval = intervals[index];
        if ( index == 0 ) {
            // root is always needed in the output
            let new_root = root + interval;
            if ( new_root > 127 ) {
                new_root = 127;
            }
            if ( new_root < 0 ) {
                new_root = 0;
            }
            chord.push( new_root );
        } else {
            if ( interval > 0 ) {
                let voice = root + interval;
                if ( voice > 127 ) {
                    voice = 127;
                }
                if ( voice < 0 ) {
                    voice = 0;
                }
                chord.push( voice );
            } else {
                let voice = root + Math.abs(interval);
                if ( voice > 127 ) {
                    voice = 127;
                }
                if ( voice < 0 ) {
                    voice = 0;
                }
                chord.push( voice );
            }
        }
    }
    return chord;
};

/*
    ACTIVE NOTE TRACKING STACK
*/

// tracks active notes based on original pitch in case of modification
// stores pitch caches at the index of the original pitch
// assumes source pitches do not overlap
function add_events_to_active_notes( src_event, cache ) {
    /*
    NOTE_TRACKING[src_event] = mod_event.pitch;
    */
    NOTE_TRACKING[src_event.pitch] = cache;
    Trace("ADD " + JSON.stringify(NOTE_TRACKING));
}

// returns the modified event based on the source event
function remove_events_from_active_notes( src_event ) {
    // if ( event.pitch in NOTE_TRACKING ) {
    //     var temp = event.pitch;
    //     event.pitch = NOTE_TRACKING[event.pitch];							
    //     delete NOTE_TRACKING[temp];
    // }
    let cache = NOTE_TRACKING[ src_event.pitch ];
    if ( cache ) {
        NOTE_TRACKING[ src_event.pitch ] = null;
        return cache;
    }
    // no cache was found, so we return the 
    // pitch itself to be handled as is
    return [src_event.pitch];
}

function rInt (x, y) {
    if (x > y) {
      [x, y] = [x, y];
    }
    return Math.floor(Math.random() * (y - x + 1)) + x;
}

// 0
PluginParameters.push({
	name: "Routing",
	type: "text"
});

// 1
PluginParameters.push({
	name:"Randomize", 
	type:"checkbox",
	defaultValue:RANDOMIZE_VAL
	});

// 2
PluginParameters.push({
    name:"Chordify", 
    type:"checkbox",
    defaultValue:CHORDIFY_VAL
    });

// 3
PluginParameters.push({
	name:"Routing", 
	type:"menu", 
	valueStrings:ROUTING, 
	defaultValue:2
});

// 4
PluginParameters.push({
	name: "Randomize",
	type: "text"
});

// 5
PluginParameters.push({
	name:"Chance", 
	type:"lin", unit:"\%", 
	minValue:CHANCE_MIN, 
	maxValue:CHANCE_MAX, 
	numberOfSteps:CHANCE_MAX, 
	defaultValue:CHANCE_DEF
});

// 6
PluginParameters.push({
	name:"Choices", 
	type:"lin", unit:"pitches",
	minValue:CHOICES_MIN, 
	maxValue:CHOICES_MAX, 
    numberOfSteps:CHOICES_MAX - CHOICES_MIN,
	defaultValue:CHOICES_DEF
});

// 7
PluginParameters.push({
	name:"Distance", 
	type:"lin", unit:"st",
	minValue:DISTANCE_MIN, 
	maxValue:DISTANCE_MAX, 
	numberOfSteps:DISTANCE_MAX - DISTANCE_MIN, 
	defaultValue:DISTANCE_DEF
});

// 8
PluginParameters.push({
	name:"Direction", 
	type:"menu", 
	valueStrings:[SIGN_UP_TEXT, SIGN_BI_TEXT, SIGN_DOWN_TEXT], 
	defaultValue:SIGN_DEF
});

// 9
PluginParameters.push({
	name: "Chordify",
	type: "text"
});

// 10
PluginParameters.push({
	name:"Voice 1 (Root)", 
	type:"lin", unit:"st",
	minValue:HALFSTEPS_MIN, 
	maxValue:HALFSTEPS_MAX, 
	numberOfSteps:HALFSTEPS_MAX - HALFSTEPS_MIN, 
	defaultValue:HALFSTEPS_DEF
});

// 11
PluginParameters.push({
	name:"Voice 2", 
	type:"lin", unit:"st",
	minValue:HALFSTEPS_MIN, 
	maxValue:HALFSTEPS_MAX, 
	numberOfSteps:HALFSTEPS_MAX - HALFSTEPS_MIN, 
	defaultValue:4
});

// 12
PluginParameters.push({
	name:"Voice 3", 
	type:"lin", unit:"st",
	minValue:HALFSTEPS_MIN, 
	maxValue:HALFSTEPS_MAX, 
	numberOfSteps:HALFSTEPS_MAX - HALFSTEPS_MIN, 
	defaultValue:7
});

// 13
PluginParameters.push({
	name:"Voice 4", 
	type:"lin", unit:"st",
	minValue:HALFSTEPS_MIN, 
	maxValue:HALFSTEPS_MAX, 
	numberOfSteps:HALFSTEPS_MAX - HALFSTEPS_MIN, 
	defaultValue:10
});

// 14
PluginParameters.push({
	name:"Voice 5", 
	type:"lin", unit:"st",
	minValue:HALFSTEPS_MIN, 
	maxValue:HALFSTEPS_MAX, 
	numberOfSteps:HALFSTEPS_MAX - HALFSTEPS_MIN, 
	defaultValue:-8
});

// 15
PluginParameters.push({
	name:"Voice 6", 
	type:"lin", unit:"st",
	minValue:HALFSTEPS_MIN, 
	maxValue:HALFSTEPS_MAX, 
	numberOfSteps:HALFSTEPS_MAX - HALFSTEPS_MIN, 
	defaultValue:-5
});