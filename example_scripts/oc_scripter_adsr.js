/******************************************************************************
Name: Scripter ADSR
Author(s): Philip Regan
Purpose: 
* Recreates the ADSR envelope in the Modulator MIDI Effect Plug-In. The 
envelope outputs a number between 0.0-1.0, which can be used as a multiplier
for any kind parameter or property. This script affects the velocity, length, 
and detune of NoteOn events. 
* Leverages the following design patterns
    * Tracking events across process blocks
    * Managing music theory
    * Managing active notes (in this case ADSR envelopes)
* Contains the use of Objects to manage discrete envelopes for every NoteOn event.
* BUG TO FIX: When looping, ensure any cycle is longer than the overall length of 
potentially running envelopes because one of two things is happening:
    * either the synth will become overwhelmed with NoteOn events.
    * Or the timing info isn't be calculated properly at it related to the 
    envelope objects.

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

const NOTE_LENGTHS_LIB = {
    "No length"         :   0.000,
    "1/64"  :   0.063,
    "1/64d" :   0.094,
    "1/64t" :   0.021,
    "1/32"	:	0.125,
    "1/32d"	:	0.188,
    "1/32t"	:	0.041,
    "1/16"	:	0.250,
    "1/16d"	:	0.375,
    "1/16t"	:	0.333,
    "1/8" 	:	0.500,
    "1/8d"	:	0.750,
    "1/8t"	:	0.167,
    "1/4" 	:	1.000,
    "1/4d"	:	1.500,
    "1/4t"	:	0.300,
    "1/2" 	:	2.000,
    "1/2d"	:	3.000,
    "1/2t"	:	0.667,
    "1 bar"		:	4.000,
    "1.5 bars"	:	6.000,
    "2 bars"	:	8.000,
    "3 bars"	:	12.000,
    "4 bars"	:	16.000,
    "6 bars"	:	24.000,
    "8 bars"	:	32.000,
    "10 bars"	:	40.000,
    "12 bars"	:	48.000,
    "16 bars"	:	64.000,
    "20 bars"	:	80.000,
    "24 bars"	:	96.000,
    "28 bars"	:	112.000,
    "32 bars"	:	128.000,
    "36 bars"	:	144.000,
    "40 bars"	:	160.000
};
var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

/* adsr params */

const PARAM_NAME_ATTACK_LENGTH = "Attack Length";
const PARAM_NAME_DECAY_LENGTH = "Decay Length";
const PARAM_NAME_SUSTAIN_LENGTH = "Sustain Length";
const PARAM_NAME_SUSTAIN_LEVEL = "Sustain Level";
const PARAM_NAME_RELEASE_LENGTH = "Release Length";

/* adsr effect params */
/* velocity */
const PARAM_NAME_VELOCITY_SWITCH = "Velocity";
const PARAM_NAME_VELOCITY_MIN = "Velocity Min";
const PARAM_NAME_VELOCITY_MAX = "Velocity Max";
const PARAM_VELOCITY_MIN = 0;
const PARAM_VELOCITY_MAX = 127;

/* length */
const PARAM_NAME_LENGTH_SWITCH = "Length";
const PARAM_NAME_LENGTH_CONSTANT = "Length (Constant)";
const PARAM_NAME_LENGTH_ENV_MIN = "Length (Env) Min";
const PARAM_NAME_LENGTH_ENV_MAX = "Length (Env) Max";

/* detune */
const PARAM_NAME_DETUNE_SWITCH = "Detune";
const PARAM_NAME_DETUNE_MIN = "Detune Min";
const PARAM_NAME_DETUNE_MAX = "Detune Max";
const PARAM_DETUNE_MIN = -127;
const PARAM_DETUNE_MAX = 127; 

/* managing played notes */

var ACTIVE_ADSRS = [];

const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001; // smallest note length = 0.125

/*
SCRIPTER FUNCTIONS
*/

function HandleMIDI( event ) {
    
    if ( event instanceof NoteOn ) {
        var adsr = new ADSR();
        adsr.initialize( event );
        ACTIVE_ADSRS.push( adsr );
    } else if ( event instanceof NoteOff ) {
        // do nothing
    } else {
        event.send();
    }
}

function ProcessMIDI() {
    var timing_info = GetTimingInfo();

    // when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
    if ( !timing_info.playing ){
        cursor = timing_info.blockStartBeat;
        TRIGGER = RESET_VALUE;
        ACTIVE_ADSRS = [];
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

        /*
            PROCESS ADSRs here
        */

        // we need to manage the length of the active adsrs so we don't run out of memory
        var adsrs_to_remove = [];
        var i = 0;
        ACTIVE_ADSRS.forEach( function ( adsr ) {
            // assume the adsr is made active when created with the NoteOn event
            if ( adsr.state != adsr.states.idle ) {
                
                if ( adsr.state == adsr.states.init ) {
                    adsr.calc_envelope(
                        cursor,
                        NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_ATTACK_LENGTH)]],
                        NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_DECAY_LENGTH)]],
                        NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_SUSTAIN_LENGTH)]],
                        GetParameter(PARAM_NAME_SUSTAIN_LEVEL),
                        NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_RELEASE_LENGTH)]]
                    );
                    // TODO: Recalc based on cycling
                }

                adsr.process();
                if ( adsr.env_trigger < adsr.env_cursor ) {
                    adsr.env_trigger = adsr.env_cursor;
                }
                if ( adsr.env_trigger == adsr.env_cursor ) {

                    // create a NoteOn with the adsr's note
                    var note_on = new NoteOn();
                    note_on.pitch = adsr.note_obj.pitch;

                    if ( GetParameter( PARAM_NAME_DETUNE_SWITCH )) {
                        note_on.detune = calc_percent_delta(
                            GetParameter( PARAM_NAME_DETUNE_MIN ),
                            GetParameter( PARAM_NAME_DETUNE_MAX ),
                            adsr.output_value
                        );
                    }
                    
                    if ( GetParameter( PARAM_NAME_VELOCITY_SWITCH ) ) {
                        note_on.velocity = calc_percent_delta( 
                            GetParameter(PARAM_NAME_VELOCITY_MIN), 
                            GetParameter(PARAM_NAME_VELOCITY_MAX), 
                            adsr.output_value 
                        );
                    }
                    
                    if ( GetParameter( PARAM_NAME_LENGTH_SWITCH ) ) {
                        var note_length = calc_percent_delta( 
                            NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_LENGTH_ENV_MIN)]],
                            NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_LENGTH_ENV_MAX)]],
                            adsr.output_value
                         );
                    } else {
                        var note_length = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_LENGTH_CONSTANT)]];
                    }

                    var note_off = new NoteOff( note_on );
                    var note_off_beat = cursor + note_length;

                    // adjust for the cycle buffers
                    if ( timing_info.cycling && note_off_beat >= timing_info.rightCycleBeat ) {
                        while ( note_off_beat >= timing_info.rightCycleBeat ) {
                            note_off_beat -= cycleBeats;
                            // ERROR: note_off_beat = null
                            // ATTEMPT: chaning cycleBeats to actual calc crams events at the end of the cycle
                        }
                    }
                    note_on.sendAtBeat( cursor );
                    note_off.sendAtBeat( note_off_beat );

                    // move the trigger a length from the cursor
                    adsr.env_cursor = cursor;
                    adsr.env_trigger = note_off_beat;
                    
                }
            } else {
                adsrs_to_remove[i] = adsr;
            }
            i++;
        });
        // remove the expended adsrs
        for ( let index = 0; index < adsrs_to_remove.length; index++    ) {
            const a = adsrs_to_remove[index];
            if ( a ) {
                ACTIVE_ADSRS.splice(index, 1);
            }
        }

        // advance the cursor and trigger to the next beat
        cursor += CURSOR_INCREMENT;
        if ( TRIGGER < cursor ) {
            TRIGGER = cursor;
        }
    }
}

function ADSR () {

    this.states = {
        idle      :   0,
        init      :   1,
        attack    :   2,
        decay     :   3,
        sustain   :   4,
        release   :   5   
    };
    this.state = this.states.idle;

    this.note_obj = null;

    this.max_value = 1.0;
    this.min_value = 0.0;
    this.output_value = this.min_value;

    this.increment = 0.001;
    this.env_cursor = 1.0 - this.increment;

    this.attack_length = 0.0;
    this.attack_start = 0.0;
    this.attack_end = 0.0;
    this.attack_slope = 0.0;

    this.decay_length = 0.0;
    this.decay_start = 0.0;
    this.decay_end = 0.0;
    this.decay_slope = 0.0;

    this.sustain_length = 0.0;
    this.sustain_start = 0.0;
    this.sustain_end = 0.0;
    this.sustain_value = 0.0;

    this.release_length = 0.0;
    this.release_start = 0.0;
    this.release_end = 0.0;
    this.release_slope = 0.0;

    this.env_length = 0.0;

    // initialize prepares all of the values for calculating the envelope
    this.initialize = function ( note_obj ) {
        this.note_obj = note_obj;
        this.state = this.states.init;
    }

    this.calc_envelope = function ( cursor, a_len, d_len, s_len, s_val, r_len ) {
        // set the phase dimensions for the envelope
        this.attack_length = a_len;
        this.attack_start = cursor;
        this.attack_end = this.attack_start + this.attack_length;

        this.decay_length = d_len;
        this.decay_start = this.attack_end;
        this.decay_end = this.decay_start + this.decay_length;

        this.sustain_length = s_len;
        this.sustain_start = this.decay_end;
        this.sustain_end = this.sustain_start + this.sustain_length;

        this.release_length = r_len;
        this.release_start = this.sustain_end;
        this.release_end = this.release_start + this.release_length;

        this.env_length = this.release_end;

        this.sustain_value = s_val;

        this.attack_slope = this.calc_slope( this.attack_start, this.attack_end, this.min_value, this.max_value );
        this.decay_slope = this.calc_slope( this.decay_start, this.decay_end, this.max_value, ( this.sustain_length > 0 ? this.sustain_value : this.min_value ) );
        this.release_slope = this.calc_slope( this.release_start, this.release_end, ( this.sustain_length > 0 ? this.sustain_value : this.min_value ), this.min_value );
    
        this.env_cursor = cursor - this.increment;

        this.state = this.states.attack;

        this.env_trigger = this.attack_start;
    }

    this.calc_slope = function ( x1, x2, y1, y2 ) {
        let rise = y2 - y1;
        let run = x2 - x1;
        let slope = rise / run;

        return slope;
    }

    // process moves through the envelope if the gate is open
    this.process = function () {
        // if the envelope is not being progressed for whatever reason
        // set the envelope to idle, reset the output value, and return
        if ( this.state == this.states.idle ) {
            return this.output_value;
        }

        if ( this.state == this.states.init ) {
            this.state = this.states.attack;
        }

        // calcuate the current value based on the position of the cursor
        switch ( this.state ) {
            case this.states.attack:

                this.output_value = this.attack_slope * ( this.env_cursor - this.attack_start );  
                this.output_value = this.truncate(this.output_value); 

                // ensure the output is within the bounds of the envelope
                if ( this.output_value >= this.max_value ) {
                    this.output_value = this.max_value;
                    this.state = this.states.decay;
                }

                this.env_cursor += this.increment;
                return this.output_value;

            case this.states.decay:

                this.output_value = this.decay_slope * ( this.env_cursor - this.decay_start );
                this.output_value += this.max_value;
                this.output_value = this.truncate(this.output_value);

                // ensure the output is within the bounds of the envelope
                // check where the cursor is in the envelope
                if ( this.sustain_length > 0 ) {
                    if ( this.output_value <= this.sustain_value ) {
                        this.output_value = this.sustain_value;
                        this.state = this.states.sustain;
                    }
                    if ( this.output_value <= this.sustain_value ) {
                    }
                } else {
                    if ( this.output_value <= this.min_value ) {
                        this.output_value = this.min_value;
                        this.state = this.states.idle;
                    }
                }
                
                this.env_cursor += this.increment;
                return this.output_value;

            case this.states.sustain:

                if ( this.env_cursor >= this.sustain_end - this.attack_start ) {
                    this.state = this.states.release;
                }

                this.env_cursor += this.increment;
                return this.output_value;

            case this.states.release:
                
                this.output_value = this.release_slope * ( this.env_cursor - this.release_start ); 
                this.output_value += this.sustain_value;
                this.output_value = this.truncate(this.output_value); 

                // ensure the output is within the bounds of the envelope
                // check where the cursor is in the envelope
                if ( this.sustain_length > 0 ) {
                    if ( this.output_value >= this.sustain_value ) {
                        this.output_value = this.sustain_value;
                    }
                }

                if ( this.output_value <= this.min_value ) {
                    this.output_value = this.min_value;
                    this.state = this.states.idle;
                }

                this.env_cursor += this.increment;
                return this.output_value;
                
            default:
                Trace("ADSR ERROR: process()");
                // prevent endless processing
                break;
        }

        this.env_cursor += this.increment;

    }

    this.truncate = function ( n ) {
        // return Number.parseFloat(n).toFixed(3);
        let t = n.toFixed(3);
        let f = Number.parseFloat(t);
        return f;
    }
}

function calc_percent_delta( min, max, multiplier ) {
    return ( ( max - min ) * multiplier ) + min;
}

/*
PARAMETER CONTROL MANAGEMENT

-> Remember to update ParameterChanged()	
*/

// 0
PluginParameters.push({
    name:PARAM_NAME_ATTACK_LENGTH, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:10
});

// 1
PluginParameters.push({
    name:PARAM_NAME_DECAY_LENGTH, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:10
});

// 2
PluginParameters.push({
    name:PARAM_NAME_SUSTAIN_LENGTH, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:10
});

// 3
PluginParameters.push({
    name:PARAM_NAME_RELEASE_LENGTH, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:10
});

// 4
PluginParameters.push({
    name:PARAM_NAME_SUSTAIN_LEVEL, 
    type:"lin", 
    minValue:0.0, 
    maxValue:1.0, 
    numberOfSteps:1000, 
    defaultValue:0.5
});

// 5
PluginParameters.push({
    name:PARAM_NAME_VELOCITY_SWITCH, 
    type:"checkbox", 
    defaultValue:1
});

// 6
PluginParameters.push({
    name:PARAM_NAME_VELOCITY_MIN, 
    type:"lin", 
    minValue:PARAM_VELOCITY_MIN, 
    maxValue:PARAM_VELOCITY_MAX, 
    numberOfSteps:127, 
    defaultValue:PARAM_VELOCITY_MIN
});

// 7
PluginParameters.push({
    name:PARAM_NAME_VELOCITY_MAX, 
    type:"lin", 
    minValue:PARAM_VELOCITY_MIN, 
    maxValue:PARAM_VELOCITY_MAX, 
    numberOfSteps:127, 
    defaultValue:PARAM_VELOCITY_MAX
});

// 8
PluginParameters.push({
    name:PARAM_NAME_LENGTH_SWITCH, 
    type:"checkbox", 
    defaultValue:0
});

// 9
PluginParameters.push({
    name:PARAM_NAME_LENGTH_CONSTANT, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:10
});

// 9
PluginParameters.push({
    name:PARAM_NAME_LENGTH_ENV_MIN, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:4
});

// 10
PluginParameters.push({
    name:PARAM_NAME_LENGTH_ENV_MAX, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:10
});

// 11
PluginParameters.push({
    name:PARAM_NAME_DETUNE_SWITCH, 
    type:"checkbox", 
    defaultValue:1
});

// 12
PluginParameters.push({
    name:PARAM_NAME_DETUNE_MIN, 
    type:"lin", 
    minValue:PARAM_DETUNE_MIN, 
    maxValue:PARAM_DETUNE_MAX, 
    numberOfSteps:256, 
    defaultValue:PARAM_DETUNE_MIN
});

// 13
PluginParameters.push({
    name:PARAM_NAME_DETUNE_MAX, 
    type:"lin", 
    minValue:PARAM_DETUNE_MIN, 
    maxValue:PARAM_DETUNE_MAX, 
    numberOfSteps:256, 
    defaultValue:PARAM_DETUNE_MAX
});