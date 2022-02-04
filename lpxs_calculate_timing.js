var NeedsTimingInfo = true;

function ProcessMIDI() {

	var timingInfo = GetTimingInfo();

	// convert beat position to ms
	var ms = Math.round(timingInfo.blockStartBeat * (60000. / timingInfo.tempo));

	// get the current Beat
	var Beat = Math.floor(timingInfo.blockStartBeat);
	
	// know when in a new Bar
	var Bar = timingInfo.currBlockStart % timingInfo.meterNumerator
}
