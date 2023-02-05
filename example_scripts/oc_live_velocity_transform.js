/******************************************************************************
Name: Velocity Limiter
Author(s): Philip Regan
Purpose:
* Live versions of the `Fixed Velocity' and `Velocity Limiter' MIDI Transforms

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
const PARAM_NAME_FIXED_VELOCITY_SWITCH = "Fixed Velocity Switch";
const PARAM_NAME_FIXED_VELOCITY_VALUE = "Fixed Velocity Value";
const PARAM_NAME_VELOCITY_LIMITER_SWITCH = "Velocity Limiter Switch";
const PARAM_NAME_VELOCITY_LIMITER_MIN = "Velocity Limiter Minimum";
const PARAM_NAME_VELOCITY_LIMITER_MAX = "Velocity Limiter Maximum";

function HandleMIDI(event)
{
	if ( event instanceof NoteOn ) {
        if ( GetParameter( PARAM_NAME_FIXED_VELOCITY_SWITCH )) {
            event.velocity = GetParameter( PARAM_NAME_FIXED_VELOCITY_VALUE );
        }

        if ( GetParameter( PARAM_NAME_VELOCITY_LIMITER_SWITCH )) {
            if ( event.velocity < GetParameter( PARAM_NAME_VELOCITY_LIMITER_MIN ) ) {
                event.velocity = GetParameter( PARAM_NAME_VELOCITY_LIMITER_MIN );
            }
            if ( event.velocity > GetParameter( PARAM_NAME_VELOCITY_LIMITER_MAX ) ) {
                event.velocity = GetParameter( PARAM_NAME_VELOCITY_LIMITER_MAX );
            }
        }
    }

    event.send();
}

PluginParameters.push({
	name:PARAM_NAME_FIXED_VELOCITY_SWITCH, 
	type:"checkbox", 
	defaultValue:0
});

PluginParameters.push({
	name:PARAM_NAME_FIXED_VELOCITY_VALUE, 
	type:"lin", 
	minValue:0, 
	maxValue:128, 
	numberOfSteps:128, 
	defaultValue:90
});

PluginParameters.push({
	name:PARAM_NAME_VELOCITY_LIMITER_SWITCH, 
	type:"checkbox", 
	defaultValue:0
});

PluginParameters.push({
	name:PARAM_NAME_VELOCITY_LIMITER_MIN, 
	type:"lin", 
	minValue:0, 
	maxValue:128, 
	numberOfSteps:128, 
	defaultValue:30
});

PluginParameters.push({
	name:PARAM_NAME_VELOCITY_LIMITER_MAX, 
	type:"lin", 
	minValue:0, 
	maxValue:128, 
	numberOfSteps:128, 
	defaultValue:90
});