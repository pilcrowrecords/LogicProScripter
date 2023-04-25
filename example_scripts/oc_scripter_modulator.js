/******************************************************************************

Name: Scripter Modulator 
Author(s): Philip Regan
Purpose: 
* Recreates the basic functionality of the Modulator MIDI Effect in Scripter. 
This makes available the possibility of customizing the functionality beyond 
what Modulator can do today (i.e. Shorter cycles than 1/128, longer cycles than 
40 bars), and gives a sense of what it takes to program something like modulator.
* This script along with the ADSR script handles almost all of the functionality
of the Scripter plug-in. 
* Contains examples of the following:
   * Modeling note lengths and frequencies
   * Tracking playhead and beats locations across process blocks and loops
   * How to change output across multiple process blocks or within a cycle.

Instructions for use:
* All waveforms calculate a number between -1.000 to 1.000. This can be used as
a multiplier for many uses.
* There are example functions included for each of the different wave forms. All
of them work basically the same. 
    * "Waveform" selects the waveform to be used
    * "Cycle Length" is the note length of one full period of the waveform (peak
    to peak)
    * "Steps per Cycle" is used in HandleMIDI to limit the number of 
    recalculations.
    * "Offset" moves the waveform higher or lower than the 0.000 amplitude.
    * "Output Level" compresses the waveform to conform to a smaller peak and 
    trough distance than -1.000 to 1.000. This is also a multplier like the
    output.
    * "Symmetry" is best used with the Triangle waveform. This is a multiplier
    between 0.0 to 1.0. 
        * A value of 0.0 creates a falling sawtooth wavefore. 
        * A value of 0.5 creates a triangle waveform. 
        * A value of 1.0 creates a rising sawtooth waveform. 

* Points of customization and known issues
    * The sine waveform does not have the symmetry value calculated like the 
    Modulator MIDI Effect plug in.
    * Because in most cases the "resolution" of the waveform is limited to the
    NoteOn events or 1/128 notes, its effect is not as apparent as seeing the 
    numbers in a bar chart.
    * The note lengths and cycle lengths could be extended further to more 
    extreme values.

This script is intended to automated by making scale and chord selection 
streamlined to two automation lanes, while still offering the ability to 
fine tune those selections as needed for blues, jazz, or any scale or
chord variants.

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

The sawtooth code was adapted from the Aquila open source project, Copyright (c) 2007-2014 Zbigniew 
Siciarz. Used per the MIT License included in the project. That project can be
found at https://github.com/zsiciarz/aquila

******************************************************************************/

/*
SCRIPTER GLOBAL VARIABLES
*/

var NeedsTimingInfo = true;
var PluginParameters = [];

/* 
CUSTOM GLOBAL VARIABLES 
*/
// the trigger variable is where the next note (or rest) is to be played
// trigger is global to track it across process blocks
// the cursor is a simulated location of the transport/playhead in the track
// cursor is handled locally because only the current process block matters while playing
const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001; // smallest note length = 0.125


const PI = 3.142;

const NOTE_LENGTHS_LIB = {
    "∞"         :   CURSOR_INCREMENT,
    "1/128"		:	0.0105,
    "1/128d"	:	0.04725,
    "1/128t"	:	41.600,
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
    "1/2t"	    :	0.667,
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

const CYCLE_LENGTH_LIB = {
    "1/128"		:	32.00000000,
    "1/128d"	:	24.00000000,
    "1/128t"	:	41.60000000,
    "1/64"		:	16.00000000,
    "1/64d"		:	12.00000000,
    "1/64t"		:	20.80000000,
    "1/32"		:	8.00000000,
    "1/32d"		:	6.00000000,
    "1/32t"		:	10.40000000,
    "1/16"		:	4.00000000,
    "1/16d"		:	3.00000000,
    "1/16t"		:	5.20000000,
    "1/8"		:	2.00000000,
    "1/8d"		:	1.50000000,
    "1/8t"		:	2.60000000,
    "1/4"		:	1.00000000,
    "1/4d"		:	0.75000000,
    "1/4t"		:	1.30000000,
    "1/2"		:	0.50000000,
    "1/2d"		:	0.37500000,
    "1/2t"		:	0.65000000,
    "1 bar"		:	0.02500000,
    "1.5 bars"	:	0.01875000,
    "2 bars"	:	0.01250000,
    "3 bars"	:	0.00833333,
    "4 bars"	:	0.00625000,
    "6 bars"	:	0.00416667,
    "8 bars"	:	0.00312500,
    "10 bars"	:	0.00250000,
    "12 bars"	:	0.00208333,
    "16 bars"	:	0.00156250,
    "20 bars"	:	0.00125000,
    "24 bars"	:	0.00104167,
    "28 bars"	:	0.00089286,
    "32 bars"	:	0.00078125,
    "36 bars"	:	0.00069444,
    "40 bars"	:	0.00062500
};
const CYCLE_LENGTH_KEYS = Object.keys( CYCLE_LENGTH_LIB );

const PARAM_LIST_WAVEFORMS = [
    "Triangle (⋀)",
    "Sine (∿)",
    "Square (⊓)",
];
const PARAM_NAME_WAVEFORMS = "Waveform";
const PARAM_NAME_FREQUENCY = "Cycle Length";
const PARAM_NAME_STEPS = "Steps per Cycle";
const PARAM_NAME_OFFSET = "Offset";
const PARAM_NAME_OUTPUT_LEVEL = "Output Level";
const PARAM_NAME_SYMMETRY = "Symmetry (⋀,⊓ only)";

const AMPLITUDE_MIN = -1.0;
const AMPLITUDE_MID = 0.0;
const AMPLITUDE_MAX = 1.0;

var SETTING_AMP = AMPLITUDE_MAX;
var SETTING_FREQUENCY = CYCLE_LENGTH_LIB["1 bar"];
var SETTING_TIME = 1.0;
var SETTING_PHASE = 0.0;
var SETTING_STEPS = CYCLE_LENGTH_LIB["1/4"];
var SETTING_SYMMETRY = 0.0;
var SETTING_OFFSET = 0.0;
var SETTING_OUTPUT_LEVEL = 1.0;

var CURRENT_WAVEFORM_OUTPUT = AMPLITUDE_MID;

/*
SCRIPTER FUNCTIONS
*/

function HandleMIDI(event) {


    if ( event instanceof NoteOn ) {

            // do something with CURRENT_WAVEFORM_OUTPUT

    	// event = triangle_wave_example( event );
        // event = sine_wave_example( event );
        // event = square_wave_example( event );
    }
	event.send();
}

/*
	Examples showing how to effect note velocity with waveforms
*/

function triangle_wave_example( event ) {
	
	SetParameter( PARAM_NAME_WAVEFORMS, 0 );
    SetParameter( PARAM_NAME_OFFSET, 0.6 );
    	SetParameter( PARAM_NAME_OUTPUT_LEVEL, 0.5 );
    	// symmetry 0 = sawtooth falling
    	// symmetry 0.5 = triangle
    	// symmetry 1 = sawtooth rising
    	SetParameter( PARAM_NAME_SYMMETRY, 0.5 );
    		
	let vel = event.velocity;
    let factor = Math.abs( CURRENT_WAVEFORM_OUTPUT );
	let velf = vel * factor;
	velf = Math.trunc( velf );
	velf = MIDI.normalizeData(velf);
	event.velocity = velf;
	return event;
}

function sine_wave_example ( event ) {
    		
    SetParameter( PARAM_NAME_WAVEFORMS, 1 );
    SetParameter( PARAM_NAME_OFFSET, 0.8 );
    SetParameter( PARAM_NAME_OUTPUT_LEVEL, 0.75 );
        
    let vel = event.velocity;
    let factor = Math.abs( CURRENT_WAVEFORM_OUTPUT );
    let velf = vel * factor;
    velf = Math.trunc( velf );
    velf = MIDI.normalizeData(velf);
    event.velocity = velf;
    return event;
}

function square_wave_example( event ) {
    SetParameter( PARAM_NAME_WAVEFORMS, 2 );
    SetParameter( PARAM_NAME_OFFSET, 0.8 );
    SetParameter( PARAM_NAME_OUTPUT_LEVEL, 0.75 );
        
    let vel = event.velocity;
    let factor = Math.abs( CURRENT_WAVEFORM_OUTPUT );
    let velf = vel * factor;
    velf = Math.trunc( velf );
    velf = MIDI.normalizeData(velf);
    event.velocity = velf;
    return event;
} 

function ProcessMIDI() {
	var timing_info = GetTimingInfo();

	// when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
	if ( !timing_info.playing ){

		SETTING_AMP = AMPLITUDE_MAX;
        SETTING_FREQUENCY = CYCLE_LENGTH_LIB[CYCLE_LENGTH_KEYS[GetParameter(PARAM_NAME_FREQUENCY)]];
        SETTING_TIME = timing_info.blockStartBeat;
        SETTING_STEPS = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_STEPS)]];
        SETTING_OFFSET = GetParameter(PARAM_NAME_OFFSET);
        SETTING_OUTPUT_LEVEL = GetParameter(PARAM_NAME_OUTPUT_LEVEL);
        SETTING_SYMMETRY = GetParameter(PARAM_NAME_SYMMETRY);

		TRIGGER = RESET_VALUE;
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

                SETTING_AMP = AMPLITUDE_MAX;
                SETTING_FREQUENCY = CYCLE_LENGTH_LIB[CYCLE_LENGTH_KEYS[GetParameter(PARAM_NAME_FREQUENCY)]];
                SETTING_TIME = timing_info.blockStartBeat;
                SETTING_STEPS = NOTE_LENGTHS_LIB[NOTE_LENGTH_KEYS[GetParameter(PARAM_NAME_STEPS)]];
                SETTING_OFFSET = GetParameter(PARAM_NAME_OFFSET);
                SETTING_OUTPUT_LEVEL = GetParameter(PARAM_NAME_OUTPUT_LEVEL);  
                SETTING_SYMMETRY = GetParameter(PARAM_NAME_SYMMETRY);
                let waveform_selection = GetParameter( PARAM_NAME_WAVEFORMS );      
                switch ( waveform_selection ) {

                    case 0:
                        // "Triangle (⋀)"
                        CURRENT_WAVEFORM_OUTPUT = calc_triangle(
                            SETTING_AMP, 
                            SETTING_FREQUENCY, 
                            cursor, 
                            SETTING_PHASE, 
                            SETTING_OFFSET, 
                            SETTING_OUTPUT_LEVEL,
                            SETTING_SYMMETRY
                        )
                        break;
                    case 1:
                        // "Sine (∿)"
                        CURRENT_WAVEFORM_OUTPUT = calc_sine(
                            SETTING_AMP, 
                            SETTING_FREQUENCY, 
                            cursor, 
                            SETTING_PHASE, 
                            SETTING_OFFSET, 
                            SETTING_OUTPUT_LEVEL
                        )
                        break;
                    case 2:
                        // "Square (⊓)"
                        CURRENT_WAVEFORM_OUTPUT = calc_square(
                            SETTING_AMP, 
                            SETTING_FREQUENCY, 
                            cursor, 
                            SETTING_PHASE, 
                            SETTING_OFFSET, 
                            SETTING_OUTPUT_LEVEL,
                            SETTING_SYMMETRY
                        )
                        break;
                    default:
                        Trace( "ERROR: Waveforms Parameter: " + waveform_selection );
                        break;
                }

                // do something with CURRENT_WAVEFORM_OUTPUT

                var trigger_cache = TRIGGER + GetParameter(PARAM_NAME_STEPS);

                // adjust for the cycle buffers
				if ( timing_info.cycling && trigger_cache >= timing_info.rightCycleBeat ) {
					while ( trigger_cache >= timing_info.rightCycleBeat ) {
						trigger_cache -= cycleBeats;
					}
				}

				TRIGGER = trigger_cache;

            }

		// advance the cursor and trigger to the next beat
		cursor += CURSOR_INCREMENT;
		if ( TRIGGER < cursor ) {
			TRIGGER = cursor;
		}
	}
}

/*
CUSTOM FUNCTIONS
*/


function calc_triangle( amp, freq, time, phase, offset, output_level, symmetry ) {
    let period = 1.0 / freq;
    let r_len = symmetry * period;
    let f_len = period - r_len;
    let r_inc = ( ( r_len != 0 ) ? ( 2.0 * amp / r_len ) : 0 );
    let f_dec = ( ( f_len != 0 ) ? ( 2.0 * amp / f_len ) : 0 );
    let t = ( time % period ) ;
    let result = 0.0;
    if ( t < r_len ) {
        result = -amp + t * r_inc;
    } else {
        result = amp - ( t - r_len ) * f_dec;
    }
    result = (( result + offset ) * output_level).toFixed(3);
    return result;
}

function calc_sine( amp, freq, time, phase, offset, output_level ) {
    return limit_to_amp(( ( amp * Math.sin( 2 * PI * freq * time + phase ) ) + offset ) * output_level).toFixed(3);
}

function calc_square( amp, freq, time, phase, offset, output_level, symmetry ) {
    let tri = calc_triangle( amp, freq, time, phase, offset, output_level, symmetry );
    if ( tri >= 0 ) {
        return amp;
    } else {
        return 0.0;
    }
}

function  limit_to_amp( n ) {
    if ( n > AMPLITUDE_MAX ) {
        return AMPLITUDE_MAX;
    }

    if ( n < AMPLITUDE_MIN ) {
        return AMPLITUDE_MIN;
    }

    return n;
}

/*
PARAMETER CONTROL MANAGEMENT

-> Remember to update ParameterChanged()	
*/

// 0
PluginParameters.push({
    name:PARAM_NAME_WAVEFORMS, 
    type:"menu", 
    valueStrings:PARAM_LIST_WAVEFORMS, 
    defaultValue:10
});

// 1
PluginParameters.push({
    name:PARAM_NAME_FREQUENCY, 
    type:"menu", 
    valueStrings:CYCLE_LENGTH_KEYS, 
    defaultValue:0
});

// 2
PluginParameters.push({
    name:PARAM_NAME_STEPS, 
    type:"menu", 
    valueStrings:NOTE_LENGTH_KEYS, 
    defaultValue:0
});

// 3
PluginParameters.push({
    name:PARAM_NAME_OFFSET, 
    type:"lin", 
    minValue:AMPLITUDE_MIN, 
    maxValue:AMPLITUDE_MAX,
    unit:"+",
    numberOfSteps:200, 
    defaultValue:AMPLITUDE_MID
});

// 4
PluginParameters.push({
    name:PARAM_NAME_OUTPUT_LEVEL, 
    type:"lin", 
    minValue:AMPLITUDE_MID, 
    maxValue:AMPLITUDE_MAX,
    unit:"×",
    numberOfSteps:100, 
    defaultValue:AMPLITUDE_MAX
});

// 5
PluginParameters.push({
    name:PARAM_NAME_SYMMETRY, 
    type:"lin", 
    minValue:0.0, 
    maxValue:1.0,
    numberOfSteps:100, 
    defaultValue:0.0
});