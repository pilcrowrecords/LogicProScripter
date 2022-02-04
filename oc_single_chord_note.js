/*
Assumes a chord length = 1 Bar
*/

/* LPX Vars */
var NeedsTimingInfo = true;

/* Local Vars */
var activeNotes = [];
var selectedNote = {};
var lastBlockStart = -1;

function resetLocalVariables() {
	var activeNotes = [];
	var selectedNote = {};
	var lastBlockStart = -1;
}

function HandleMIDI( event ) {
	
	/* if a note on is received, add the note in activeNotes[] */
  	if ( event instanceof NoteOn ) { 
        activeNotes.push( event );
        
    } else if ( event instanceof NoteOff ) { 
        // if a note off is received, remove the note in active notes
		for ( i = 0; i < activeNotes.length; i++ ) {
			if ( activeNotes[i].pitch == event.pitch ) {
				activeNotes.splice( i, 1 );
				break;
			}
		}
		   
  	} else {
  		// send all other events
  		event.send();
	}
}

function ProcessMIDI() {

	var timingInfo = GetTimingInfo();
  
  	if ( timingInfo.playing ) {
  
  		var currBlockStart = Math.floor(timingInfo.blockStartBeat);
  		
  		if (  currBlockStart != lastBlockStart && ( currBlockStart <= 1 || currBlockStart % timingInfo.meterNumerator == 0 ) ) {  			
  			Trace(lastBlockStart + " - " + currBlockStart)
  			
  			if ( timingInfo.cycling ) { 				
  				MIDI.allNotesOff();
  			} else {
  				var noteOff = new NoteOff(selectedNote);
  				noteOff.send();
  			}
  			
  			selectedNote = activeNotes[ rInt( 0, activeNotes.length - 1 ) ];
  			selectedNote.send();
  			
  			// capture the block we're in now
  			lastBlockStart = currBlockStart;
  	
  		}
  	} else {
  		// nothing is playing so stop and clear the notes cache
  		MIDI.allNotesOff();
  		activeNotes = [];
  	}
}

function rInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
