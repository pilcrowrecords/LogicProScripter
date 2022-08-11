/*
Reverse Pitches

A simple tool/trick to globally reverse all pitches during play. No practical value, but 
it does show there can be multiple ways to solve a problem.

Option 1: Fast lookup. An array with all of the intended values, which are then looked up
by using the pitch as an index. This is akin to looking up values in an Object.

Option 2: Simply subtract the pitch from 127.
*/

var NeedsTimingInfo = true;
var PluginParameters = [];

var REVERSE_PITCHES = false;
const REVERSE_MAP = [127,126,125,124,123,122,121,120,119,118,117,116,115,114,113,112,111,110,109,108,107,106,105,104,103,102,101,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0];

function HandleMIDI(event) {
	// Option 1
	if ( REVERSE_PITCHES && ( event instanceof NoteOn || event instanceof NoteOff ) ) {
		event.pitch = REVERSE_MAP[ event.pitch ];
	}
	// Option 2 
	// event.pitch = 127 - event.pitch;
	event.send();
}

function ProcessMIDI() {
	var timingInfo = GetTimingInfo();
}

function ParameterChanged(param, value) {
	switch ( param ) {
		case 0:
			REVERSE_PITCHES = value;
		default:
			// do nothing
	}
}

PluginParameters.push({
	name:"Reverse Pitches", 
	type:"checkbox", 
	defaultValue:0
});
