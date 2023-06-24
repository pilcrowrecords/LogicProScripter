/*
Name: 
Author(s): 
Purpose:
* This template is provided to show how Scripter's monolithic scripts can be
best organized for easy maintenance.
Information:
Change History:
	YY_MM_DD_V_##_##_##: Started script
*/

/*
SCRIPTER GLOBAL VARIABLES
*/

var NeedsTimingInfo = true;
var PluginParameters = [];

/* 
CUSTOM GLOBAL VARIABLES 
*/

/*
SCRIPTER FUNCTIONS
*/

function HandleMIDI(event) {
	event.send();
}

function ProcessMIDI() {
	var timingInfo = GetTimingInfo();
}

function ParameterChanged(param, value) {
    switch ( param ) {
        case value:
            
            break;
    
        default:
            break;
    }
}

function Reset() {
	/*
	Convenience function which can help with maintaining settings in a script.
	Cwalled at these events:
		- When the transport is started.
		- When the plug-in is bypassed in the MIDI Effects chain.
		- When called directly elsewhere in the code.
	*/
}

function Idle() {
	/*
	Primarily used to handle Parameter Control changes during playing so that
	the changes do not interrupt performance.
	Called every few seconds regardless of tempo or time signature
	*/
}

/*
CUSTOM FUNCTIONS
*/

/* TESTING: comment out before running in Scripter */
test();
function test() {

}

/*
PARAMETER CONTROL MANAGEMENT

-> Remember to update ParameterChanged()	
*/