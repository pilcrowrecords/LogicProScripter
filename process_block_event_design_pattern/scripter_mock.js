/******************************************************************************
Name: Scripter Mock Up
Author(s): Philip Regan
Purpose: Simple mock Scripter environment for improved development in an IDE like VSC or Atom
Information:
* This is NOT a decompilation of the Scripter plug-in, so this is not an exact match to how Scripter actually works. But it does capture some of the most commonly-used functionality.
* There are no dependencies or packages to this mock up. It intended to be part of a template to develop Scripter JS in development environments with more features than Scripter's editor.
* There are three sections to this mock:
	* INIT MOCK
		* Source event data is provided as a global const.
		* Other behaviors are set, like if the track is cycling.
	* SCRIPTER MOCK ENVIRONMENT
		* This is the user's code. This space should behave in the same way as any script in the Scripter environment
	* SCRIPTER MOCK INFRASTRUCTURE
		* This is the logic written to mimic Scripter's behaviors. 

License: The MIT License (MIT)
Copyright © 2022 Philip Regan

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

****************************************************************************/

/*
	INIT MOCK
*/

var src_pb = require('./process_blocks_1_5_cycling.js');
var note_lib = require('./note_lengths.js');

const PROCESS_BLOCKS = src_pb.pb_1_5_cy;
var CURRENT_BLOCK = {};

var NOTE_VALUE = 0;
const NOTE_LENGTH_KEYS = Object.keys(note_lib.NOTE_LENGTHS_LIB);
//const KEYS_LENGTH = NOTE_LENGTH_KEYS.length;

const RESET_VALUE = -1;
var CURSOR = RESET_VALUE;
var CURSOR_STEP = 0.01; // smallest note length = 0.25
// applied when the track stops playing
var TRIGGER = RESET_VALUE;

NOTE_LENGTH_KEYS.forEach( function( key ) {
	NOTE_VALUE = note_lib.NOTE_LENGTHS_LIB[key];
	Trace("\n**** " + key + " ****\n");
	play();
	CURSOR = RESET_VALUE;
	TRIGGER = RESET_VALUE
});

/*
	SCRIPTER MOCK ENVIRONMENT
	Scripter code to be used in Logic Pro goes here
*/

function HandleMIDI( event ) {
	Trace( "event" );
}

function ProcessMIDI() {
	var timing_info = GetTimingInfo();
	if ( timing_info.playing ) {
		// get the cursor to within the bounds of the track or the cycle
		if ( timing_info.cycling ) {
			CURSOR = ( timing_info.blockStartBeat < timing_info.leftCycleBeat ? timing_info.leftCycleBeat : timing_info.blockStartBeat );
		} else {
			CURSOR = timing_info.blockStartBeat;
		}

		CURSOR = Math.ceil( CURSOR * note_lib.NOTE_LENGTH_MAX ) / note_lib.NOTE_LENGTH_MAX;

		// lay down the trigger on the cursor if the track is starting up again
		if ( TRIGGER == RESET_VALUE ) {
			TRIGGER = CURSOR;
		}
		// move the cursor along the process block while keeping within the bounds of the cycle
		var END_BEAT = ( timing_info.blockEndBeat > timing_info.rightCycleBeat ? timing_info.rightCycleBeat : timing_info.blockEndBeat );

		while ( CURSOR <= END_BEAT ) {
			// Trace( CURSOR + "\t" + TRIGGER );
			if ( TRIGGER < timing_info.leftCycleBeat ) {
				Trace( "lcb:" + timing_info.leftCycleBeat + "\t" + "t:" + TRIGGER );
			} else if ( TRIGGER > timing_info.rightCycleBeat ) {
				Trace( "t:" + TRIGGER + "\trcb:" + timing_info.leftCycleBeat );
			} else {
				// do nothing
			}

			if ( CURSOR == TRIGGER ) {
				// create and send the NoteOn event on the cursor beat
				
				var note_off_beat = CURSOR + NOTE_VALUE;
				// if the note off lands outside the bounds of the cycle, then shift the beat to relative to the beginning of the cycle
				/* 
				TODO: The trigger can still land outside the bounds of the cycle if
					* the note value is the greater than or equal to the cycle length
					* the math is not double checked for certain note values
				*/
				if ( timing_info.cycling && note_off_beat > timing_info.rightCycleBeat ) {
					/* FIRST ATTEMPT; works in most cases
					// get the difference between the right cycle beat and the note off beat
					var overage = note_off_beat - timing_info.rightCycleBeat;
					// add the difference to the left cycle beat
					var offset = overage + timing_info.leftCycleBeat;
					// drop the note off event at that shifted beat
					note_off_beat = offset;
					*/

					/* SECOND ATTEMPT
						Would modulus work here?
					*/
				}
				// set the trigger on the NoteOff beat
				TRIGGER = note_off_beat;
			}
			CURSOR += CURSOR_STEP;
		}
	} else {
		// the track stopped playing.
		// reset the trigger so we don't get any events in unwanted beats
		TRIGGER = RESET_VALUE;
		CURSOR = RESET_VALUE;
		// TODO: turn off any notes which may be playing
	}
}

function rInt( min, max ) {
	if (min == max ) {return min;}
    return Math.floor(min + Math.random()*(max + 1 - min));
}

/*
	SCRIPTER MOCK INFRASTRUCTURE
	Scripter code to be used in Logic Pro does not go here. 
*/

// runs through a typical sequence of events
// callback functions are called by type
function play() {

	PROCESS_BLOCKS.forEach( function ( process_block ) {
		CURRENT_BLOCK = process_block;
		ProcessMIDI();
	});

}

function GetTimingInfo() {
	return CURRENT_BLOCK;
}

function Trace( str ) {
	console.log( str );
}
