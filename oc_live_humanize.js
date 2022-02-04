/****************************************************************************
Name: Live Humanize
Author(s): Philip Regan
Purpose: Randomize pitch beatPos, detune, and tempo during play
Information:
	* Less is more. Go for subtlety first.
	* Detune 
		* Only works with Apple-sourced synths, except Hammond B3
		* Detune is in cents by default. Cents in Scripter can go beyond 
		bounds of synth controls, typ. >50; 100 cents = 1 semitone
		* Adding any detune enriches the sound; almost like another oscilator 
		is created on top the one in the synth
		* In Alchemy, only works on Oscillator 1
		* In RetroSynth, another oscillator is added to the synth and is 
		manipulated even if there is no detune for the particular mode. This 
		is separate from the global RetroSynth settings
	* Studio Strings and Horns
		* Gets a heavy chorus effect when played as chords 
	even with single-digit detune shifts.
		* Break chords into individual tracks to reduce chorus and improve 
		richness of sound.
		* Studio Strings and Brass do not get the same added voice when activated

Bugs:
	* None

Change History:
	21_10_24_01_00_00:	Started script
	21_10_24_01_01_00:	Added beatPos shift
	21_10_24_01_02_00:	Added velocity shift
	21_10_25_01_03_00:	Added negative values to shifts
						Added probability to beatPos shift 
	21_10_25_01_04_00: 	Added probability to velocity
	21_10_25_01_04_01:	Updated variable names to be more consistent
						Updated label names to be more consistent
	21_10_25_01_05_00:	Fixed bug where events were being sent twice
	21_10_25_01_06_00:	Added detune shift
	21_11_09_01_06_01:	Fixed a couple bugs
						Updated probability sliders to align to same values
						Updated rInt() to include negative numbers
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
const DETUNE_SHIFT_STEPS = 400;

const DETUNE_SHIFT_MIN = -200;
const DETUNE_SHIFT_MIN_PCNAME = "Detune Shift Min";
var detuneShiftMin = DETUNE_SHIFT_DEF;

const DETUNE_SHIFT_MAX = 200;
const DETUNE_SHIFT_MAX_PCNAME = "Detune Shift Max";
var detuneShiftMax = DETUNE_SHIFT_DEF;

const DETUNE_PROB_PCNAME = "Detune Shift % Chance";
var detuneProb = PROBABILITY_SLIDER_DEF;

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
	
	event.send();

	
}

function ProcessMIDI() {
	var timingInfo = GetTimingInfo();
	if ( timingInfo.playing ) {
		// do nothing
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
		default:
			Trace("ERROR: ParameterChanged");
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

PluginParameters.push({
	name: BEATSHIFT_PROB_PCNAME,
	type: "lin",
	minValue: PROBABILITY_SLIDER_MIN,
	maxValue: PROBABILITY_SLIDER_MAX,
	defaultValue: PROBABILITY_SLIDER_DEF,
	numberOfSteps: PROBABILITY_SLIDER_STEPS,
	unit:"%"
});

PluginParameters.push({
	name: BEATSHIFT_MIN_PCNAME,
	type: "lin",
	minValue: BEATSHIFT_MIN,
	maxValue: BEATSHIFT_MAX,
	defaultValue: BEATSHIFT_MIN_DEF,
	numberOfSteps: BEATSHIFT_STEPS,
	unit:"Integer"
});

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