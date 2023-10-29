/*
This design pattern is based on the pattern found in the demo 
Drum Probability Sequencer script. This accomplishes two things:
* accurately tracks the next beat to be scheduled based on the current
process block
* Manages a trigger value so that events can be created as needed
*/

//needed to call GetTimingInfo()
var NeedsTimingInfo = true;
ResetParameterDefaults = true;

// Used by beatToSchedule and TRIGGER to align musically
// determines how many notes are in the time siqnature denominator
// 0.25 = 1/1 note, 1 = 1/4 note, 4 = 1/16, 8 = 1/32
const TIME_SIG_DENOM_DIVISION = 16; // beatToSchedule results in 1/64 notes
const CURSOR_INCREMENT = 0.0001;

var NOTE_LENGTHS = {
	"1/64" : 0.0625,
    "1/32" : 0.125,
    "1/16" : 0.250,
    "1/8"  : 0.500,
    "1/4"  : 1.000, // in beatToSchedule
    "1/2"  : 2.000,
    "1/1"  : 4.000
};
var NOTE_LENGTH = NOTE_LENGTHS["1/4"];

const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;

function ProcessMIDI() {

    var timing_info = GetTimingInfo();
    
	if ( timing_info.playing ) {
		
        // init the values to calculate beats
        var beatToSchedule = align_beat_to_bar_division( timing_info.blockStartBeat, TIME_SIG_DENOM_DIVISION );

        if ( TRIGGER == RESET_VALUE ) {
            TRIGGER = beatToSchedule;
        }
				
        // loop through the beats that fall within this buffer
        while ( beats_fall_within_buffer( beatToSchedule, timing_info ) ) {
            // adjust for cycle
            beatToSchedule = handle_beat_wraparound( beatToSchedule, timing_info );
            TRIGGER = handle_beat_wraparound( TRIGGER, timing_info );

            if ( beatToSchedule == TRIGGER ) {

                // DO SOMETHING
                var on = new NoteOn;
                on.pitch = 60 + beatToSchedule;
                on.velocity = 100;
                on.sendAtBeat(beatToSchedule);
                var off = new NoteOff(on);
                off.sendAtBeat(beatToSchedule + NOTE_LENGTH);

                // advance the trigger
                TRIGGER += NOTE_LENGTH;
            }


            // advance to next beat
            beatToSchedule += CURSOR_INCREMENT;
            beatToSchedule = align_beat_to_bar_division( beatToSchedule, TIME_SIG_DENOM_DIVISION );
		}
	} else {
        // .playing == false; continuous loop with no way to stop

        // ensure the trigger aligns with the playhead on the next play
        TRIGGER = RESET_VALUE;
    }
}


// aligns any float value to the beats
// ceiling used because all recordable beats are >= 1.000
function align_beat_to_bar_division( value, division ) {
    return Math.ceil( value * division ) / division;
}

// when the intended beat falls outside the cycle, wrap it proportionally 
// from the cycle start
function handle_beat_wraparound( value, timing_info ) {
    if ( timing_info.cycling && value >= timing_info.rightCycleBeat ) {
        value -= ( timing_info.rightCycleBeat - timing_info.leftCycleBeat );
    }
    return value;
}

// loop through the beats that fall within this buffer
// including beats that wrap around the cycle point
// return false by default
function beats_fall_within_buffer ( beatToSchedule, timing_info ) {
    let lookAheadEnd = timing_info.blockEndBeat;
    let cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
    let cycleEnd = lookAheadEnd - cycleBeats;
    if ( beatToSchedule >= timing_info.blockStartBeat && beatToSchedule < lookAheadEnd || (timing_info.cycling && beatToSchedule < cycleEnd)) {
        return true;
    }
    return false;
}