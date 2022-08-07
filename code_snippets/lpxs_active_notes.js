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

var ACTIVE_NOTES = {};

function HandleMIDI( event ) {
const pitch = event.pitch;
	if ( event instanceof NoteOn ) {
		var notes = ACTIVE_NOTES[ pitch ];
		if ( !notes ) {
			notes = [];
		}
		notes.push( event );
		ACTIVE_NOTES[ pitch ] = notes;
	} else if ( event instanceof NoteOff ) {
		var notes = ACTIVE_NOTES[ pitch ];
		if ( notes ) {
			var note = notes.pop();
			ACTIVE_NOTES[ pitch ] = notes;
		}
	}
}
