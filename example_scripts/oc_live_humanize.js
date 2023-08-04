/******************************************************************************
Name: Live Humanize
Author(s): Philip Regan
Purpose: Recreates the Humanize MIDI transformation found in the piano roll. By
having this functionality in Scripter, that means it can be used during live 
play.

Transforms the following for any MIDI event which has these properties:
* Shift the played beat. Limited to within the bounds of a process block, 
approximately 1/64th note.
* Velocity
* Detune (for Apple-supplied synths ONLY)
* Pitch bend (PR: this may not actually be complete)

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

/* 
CUSTOM GLOBAL VARIABLES 
*/

const TICKS_IN_BLOCK = 66;
const TIMING_LENGTH = 0.03289494514465319; // assumes I/O Buffer 1024
const BEATS_IN_TICK = TIMING_LENGTH / TICKS_IN_BLOCK; // 0.0004984082597674725

const PROBABILITY_SLIDER_MIN = 0;
const PROBABILITY_SLIDER_MAX = 100;
const PROBABILITY_SLIDER_DEF = PROBABILITY_SLIDER_MIN;
const PROBABILITY_SLIDER_STEPS = PROBABILITY_SLIDER_MAX;
const PROBABILITY_MIN = 1;
const PROBABILITY_MAX = 100;

/* Note.beatPos */

// probability

const BEATSHIFT_PROB_PCNAME = "beatPos Shift % Chance";
var beatShiftProb = PROBABILITY_SLIDER_DEF;

// shift

const BEATSHIFT_DEF = 0;
const BEATSHIFT_STEPS = 240;

const BEATSHIFT_MIN = 0;
const BEATSHIFT_MIN_DEF = 0;
const BEATSHIFT_MIN_PCNAME = "beatPos Shift Min";
var beatShiftMin = BEATSHIFT_MIN;

const BEATSHIFT_MAX = 240;
const BEATSHIFT_MAX_DEF = 0;
const BEATSHIFT_MAX_PCNAME = "beatPos Shift Max";
var beatShiftMax = BEATSHIFT_MAX;

/* Note.velocity */

// probability

const VELOCITY_PROB_PCNAME = "Velocity Shift % Chance";
var velocityProb = PROBABILITY_SLIDER_DEF;

// shift

const VELOCITY_SHIFT_DEF = 0;
const VELOCITY_SHIFT_STEPS = 254;

const VELOCITY_SHIFT_MIN = -127;
const VELOCITY_SHIFT_MIN_PCNAME = "Velocity Shift Min";
var velocityShiftMin = VELOCITY_SHIFT_MIN;

const VELOCITY_SHIFT_MAX = 127;
const VELOCITY_SHIFT_MAX_PCNAME = "Velocity Shift Max";
var velocityShiftMax = VELOCITY_SHIFT_MAX;

// detune

const DETUNE_SHIFT_DEF = 0;
const DETUNE_SHIFT_STEPS = 25400;

const DETUNE_SHIFT_MIN = -12700;
const DETUNE_SHIFT_MIN_PCNAME = "Detune Shift Min";
var detuneShiftMin = DETUNE_SHIFT_DEF;

const DETUNE_SHIFT_MAX = 12700;
const DETUNE_SHIFT_MAX_PCNAME = "Detune Shift Max";
var detuneShiftMax = DETUNE_SHIFT_DEF;

const DETUNE_PROB_PCNAME = "Detune Shift % Chance";
var detuneProb = PROBABILITY_SLIDER_DEF;

// pitch bend

const PITCHBEND_SHIFT_DEF = 0;
const PITCHBEND_SHIFT_STEPS = 16383;

const PITCHBEND_SHIFT_MIN = -8192;
const PITCHBEND_SHIFT_MIN_PCNAME = "PitchBend Min";
var pitchBendMin = PITCHBEND_SHIFT_DEF;

const PITCHBEND_SHIFT_MAX = 8191;
const PITCHBEND_SHIFT_MAX_PCNAME = "PitchBend Max";
var pitchBendMax = PITCHBEND_SHIFT_DEF;

const PITCHBEND_EVENT_TRIGGER_VALUES = ["One New NoteOn", "On New Process Block", "On Both New NoteOn and ProcessBlock"];
const PITCHBEND_EVENT_TRIGGER_PCNAME = "PitchBend Event Triggers";
var pitchBendEventValue = 0;

const PITCHBEND_PROB_PCNAME = "PitchBend % Chance";
var pitchBendProb = PROBABILITY_SLIDER_DEF;

/*
SCRIPTER FUNCTIONS
*/

function HandleMIDI( event ) {

	if ( event instanceof NoteOn ) {
				
		// all probabilities are handled in the functions
		event.velocity = getRandomVelocityShift( event.velocity );
		var beatShift = getRandomBeatShift();
		event.sendAtBeat( event.beatPos + beatShift );
		event.detune = getRandomDetuneShift( event.detune );
		
	}
	
	if ( pitchBendEventValue == 0 || pitchBendEventValue == 2 ) {
		var pitchBendValue = getRandomPitchBend();
		if ( pitchBendValue != 0 ) {
			var pitchBend = new PitchBend();
			pitchBend.value = pitchBendValue;
			pitchBend.send();
		}
	}
	
	event.send();

	
}

function ProcessMIDI() {
	var timingInfo = GetTimingInfo();
	if ( timingInfo.playing ) {
	
		if ( pitchBendEventValue == 1 || pitchBendEventValue == 2 ) {
		var pitchBendValue = getRandomPitchBend();
		if ( pitchBendValue != 0 ) {
			var pitchBend = new PitchBend();
			pitchBend.value = pitchBendValue;
			pitchBend.send();
		}
	}
	} else {
		MIDI.allNotesOff();
	}
}

function ParameterChanged( param, value ) {
	switch( param ) {
		case 0:
			beatShiftProb = value;
			break;
		case 1:
			beatShiftMin = value;
			break;
		case 2:
			beatShiftMax = value;
			break;
		case 3:
			velocityProb = value;
			break;
		case 4:
			velocityShiftMin = value;
			break;
		case 5:
			velocityShiftMax = value;
			break;
		case 6:
			detuneProb = value;
			break;
		case 7:
			detuneShiftMin = value;
			break;
		case 8:
			detuneShiftMax = value;
			break;
		case 9:
			detuneProb = value;
			break;
		case 10:
			detuneShiftMin = value;
			break;
		case 11:
			detuneShiftMax = value;
			break;
		case 12:
			pitchBendEventValue = value;
		default:
			Trace("ERROR: ParameterChanged: (" + param + ", " + value + ")");
	}
}

/*
CUSTOM FUNCTIONS
*/

function getRandomBeatShift() {
	var prob = rInt( PROBABILITY_MIN, PROBABILITY_MAX );
	if ( prob <= beatShiftProb ) {
		var beatPosShift = rInt( beatShiftMin, beatShiftMax );
		return beatPosShift * BEATS_IN_TICK;
	}
	return 0;
}

function getRandomVelocityShift( originalVelocity ) {
	var prob = rInt( PROBABILITY_MIN, PROBABILITY_MAX );
	if ( prob <= velocityProb ) {
		var r = rInt( velocityShiftMin, velocityShiftMax );
		return MIDI.normalizeData( originalVelocity + r );
	}
	return originalVelocity;
}

function getRandomDetuneShift( originalDetune ) {
	var prob = rInt( PROBABILITY_MIN, PROBABILITY_MAX );
	if ( prob <= detuneProb ) {
		var detuneShift = rInt( detuneShiftMin, detuneShiftMax );
		var newDetune = originalDetune += detuneShift;
		var normalizedDetune = normalizeDetune( newDetune );
		return normalizedDetune;
	}
	return originalDetune;
}

// pitch bend is a simple value application
function getRandomPitchBend() {
	var prob = rInt( PROBABILITY_MIN, PROBABILITY_MAX );
	if ( prob <= pitchBendProb ) {
		var r = rInt( pitchBendMin, pitchBendMax );
		return r;
	}
	return 0;
}


function normalizeDetune( detune ) {
	if ( detune > DETUNE_SHIFT_MAX ) {
		return DETUNE_SHIFT_MAX;
	} else if ( detune < DETUNE_SHIFT_MIN ) {
		return DETUNE_SHIFT_MIN;
	} else {
		return detune;
	} 
}

function rInt( min, max ) {
	if (min == max ) {return min;}
    return Math.floor(min + Math.random()*(max + 1 - min));
    
}

/*
PARAMETER CONTROL MANAGEMENT

-> Remember to update ParameterChanged() 
*/
// 0
PluginParameters.push({
	name: BEATSHIFT_PROB_PCNAME,
	type: "lin",
	minValue: PROBABILITY_SLIDER_MIN,
	maxValue: PROBABILITY_SLIDER_MAX,
	defaultValue: PROBABILITY_SLIDER_DEF,
	numberOfSteps: PROBABILITY_SLIDER_STEPS,
	unit:"%"
});
// 1
PluginParameters.push({
	name: BEATSHIFT_MIN_PCNAME,
	type: "lin",
	minValue: BEATSHIFT_MIN,
	maxValue: BEATSHIFT_MAX,
	defaultValue: BEATSHIFT_MIN_DEF,
	numberOfSteps: BEATSHIFT_STEPS,
	unit:"Integer"
});
// 2
PluginParameters.push({
	name: BEATSHIFT_MAX_PCNAME,
	type: "lin",
	minValue: BEATSHIFT_MIN,
	maxValue: BEATSHIFT_MAX,
	defaultValue: BEATSHIFT_MAX_DEF,
	numberOfSteps: BEATSHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: VELOCITY_PROB_PCNAME,
	type: "lin",
	minValue: PROBABILITY_SLIDER_MIN,
	maxValue: PROBABILITY_SLIDER_MAX,
	defaultValue: PROBABILITY_SLIDER_DEF,
	numberOfSteps: PROBABILITY_SLIDER_STEPS,
	unit:"%"
});

PluginParameters.push({
	name: VELOCITY_SHIFT_MIN_PCNAME,
	type: "lin",
	minValue: VELOCITY_SHIFT_MIN,
	maxValue: VELOCITY_SHIFT_MAX,
	defaultValue: VELOCITY_SHIFT_DEF,
	numberOfSteps: VELOCITY_SHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: VELOCITY_SHIFT_MAX_PCNAME,
	type: "lin",
	minValue: VELOCITY_SHIFT_MIN,
	maxValue: VELOCITY_SHIFT_MAX,
	defaultValue: VELOCITY_SHIFT_DEF,
	numberOfSteps: VELOCITY_SHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: DETUNE_PROB_PCNAME,
	type: "lin",
	minValue: PROBABILITY_SLIDER_MIN,
	maxValue: PROBABILITY_SLIDER_MAX,
	defaultValue: PROBABILITY_SLIDER_DEF,
	numberOfSteps: PROBABILITY_SLIDER_STEPS,
	unit:"%"
});

PluginParameters.push({
	name: DETUNE_SHIFT_MIN_PCNAME,
	type: "lin",
	minValue: DETUNE_SHIFT_MIN,
	maxValue: DETUNE_SHIFT_MAX,
	defaultValue: DETUNE_SHIFT_DEF,
	numberOfSteps: DETUNE_SHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: DETUNE_SHIFT_MAX_PCNAME,
	type: "lin",
	minValue: DETUNE_SHIFT_MIN,
	maxValue: DETUNE_SHIFT_MAX,
	defaultValue: DETUNE_SHIFT_DEF,
	numberOfSteps: DETUNE_SHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: PITCHBEND_PROB_PCNAME,
	type: "lin",
	minValue: PROBABILITY_SLIDER_MIN,
	maxValue: PROBABILITY_SLIDER_MAX,
	defaultValue: PROBABILITY_SLIDER_DEF,
	numberOfSteps: PROBABILITY_SLIDER_STEPS,
	unit:"%"
});

PluginParameters.push({
	name: PITCHBEND_SHIFT_MIN_PCNAME,
	type: "lin",
	minValue: PITCHBEND_SHIFT_MIN,
	maxValue: PITCHBEND_SHIFT_MAX,
	defaultValue: PITCHBEND_SHIFT_DEF,
	numberOfSteps: PITCHBEND_SHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: PITCHBEND_SHIFT_MAX_PCNAME,
	type: "lin",
	minValue: PITCHBEND_SHIFT_MIN,
	maxValue: PITCHBEND_SHIFT_MAX,
	defaultValue: PITCHBEND_SHIFT_DEF,
	numberOfSteps: PITCHBEND_SHIFT_STEPS,
	unit:"Integer"
});

PluginParameters.push({
	name: PITCHBEND_EVENT_TRIGGER_PCNAME,
	type: "menu",
	valueStrings: PITCHBEND_EVENT_TRIGGER_VALUES,
	defaultValue: 1
});
