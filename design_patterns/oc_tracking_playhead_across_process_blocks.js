const RESET_VALUE = -1.0;
var TRIGGER = RESET_VALUE;
const CURSOR_INCREMENT = 0.001;

function ProcessMIDI() {
	var timing_info = GetTimingInfo();

	if ( !timing_info.playing ){
		cursor = timing_info.blockStartBeat;
		TRIGGER = RESET_VALUE;
		return;
	}
	
	var lookAheadEnd = timing_info.blockEndBeat;
	var cursor = timing_info.blockStartBeat;
	if ( TRIGGER == RESET_VALUE ) {
		TRIGGER = cursor;
	}
	
	if ( timing_info.cycling && ( !TRIGGER || TRIGGER > timing_info.rightCycleBeat ) ) {
		TRIGGER = ( timing_info.rightCycleBeat > timing_info.blockEndBeat ? timing_info.rightCycleBeat : timing_info.blockEndBeat ); 
		if ( TRIGGER == timing_info.rightCycleBeat && Math.trunc(cursor) == timing_info.leftCycleBeat ) {
			TRIGGER = timing_info.blockStartBeat;
		}
	}

	if ( timing_info.cycling && lookAheadEnd >= timing_info.rightCycleBeat ) {
			var cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
			var cycleEnd = lookAheadEnd - cycleBeats;
	}

	while ((cursor >= timing_info.blockStartBeat && cursor < lookAheadEnd)
	|| (timing_info.cycling && cursor < cycleEnd)) {
		if (timing_info.cycling && cursor >= timing_info.rightCycleBeat) {
			cursor -= (timing_info.rightCycleBeat - timing_info.leftCycleBeat);
			TRIGGER = cursor;
		}

		if ( cursor == TRIGGER ) {
			// do something; create and manage events here
		}
		
		cursor += CURSOR_INCREMENT;
		if ( TRIGGER < cursor ) {
			TRIGGER = cursor;
		}	
	}
}
