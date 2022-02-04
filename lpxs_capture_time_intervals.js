var NeedsTimingInfo = true;
var lastBlockStart = -1;

function ProcessMIDI() {

	var timingInfo = GetTimingInfo();
	if ( timingInfo.playing ) {
		var currBlockStart = Math.floor(timingInfo.blockStartBeat);
	  	if ( currBlockStart != lastBlockStart && ( currBlockStart <= 1 || currBlockStart % timingInfo.meterNumerator == 0 ) ) {  	
			// do something		
			lastBlockStart = currBlockStart;
		}
	}
}
