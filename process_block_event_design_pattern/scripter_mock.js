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

const PROCESS_BLOCKS = [];
var CURRENT_BLOCK = {};

/*
	SCRIPTER MOCK ENVIRONMENT
	Scripter code to be used in Logic Pro goes here
*/

function HandleMIDI( event ) {
	Trace( "event" );
}

function ProcessMIDI() {
	var timingInfo = GetTimingInfo();
	Trace( "timingInfo" );
}

/*
	SCRIPTER MOCK INFRASTRUCTURE
	Scripter code to be used in Logic Pro does not go here. 
*/

// runs through a typical sequence of events
// callback functions are called by type
play();
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
