var activeNotes = [];

function HandleMIDI( event ) {
	if ( event instanceof NoteOn ) {
		activeNotes.push( event );
	} 	
	else if ( event instanceof NoteOff ) {
		for ( i = 0; i < activeNotes.length ; i++ ) {
			if ( activeNotes[i].pitch == event.pitch ) {
				activeNotes.splice(i, 1);
				break;
			}
		}
	}
	event.send();
}
