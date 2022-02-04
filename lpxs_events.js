// creating NoteOn and NoteOff
var noteOn = new NoteOn;
noteOn.pitch = 60;
noteOn.velocity = 100;
noteOn.sendAfterMilliseconds(100);
var noteOff = new NoteOff(noteOn);
noteOff.sendAfterMilliseconds(200);

// creating sustain pedal events
var sustainPedal = new ControlChange;
sustainPedal.number=64;
sustainPedal.value=0; // release the sustain pedal
sustainPedal.send();					
sustainPedal.value= 64; // press the sustain pedal
sustainPedal.sendAfterMilliseconds(5);
