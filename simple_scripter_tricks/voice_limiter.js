var PluginParameters = [];

var VOICE_COUNT = 0;
var VOICE_MAX = 0;

function HandleMIDI( event ) {

    if ( event instanceof NoteOn ) {
        VOICE_COUNT += 1;
        if ( VOICE_COUNT <= VOICE_MAX && VOICE_MAX != 0 ) {
            event.send();   
        }
    } else if ( event instanceof NoteOff ) {
        VOICE_COUNT -= 1;
        event.send();
    } else {
        event.send();
    }

}

function ParameterChanged( param , value ) {
    switch ( param ) {
        case 0:
            VOICE_MAX = value;
            break;
        default:
            break;
    }
}

PluginParameters.push({
    name:"Max Voices", 
    type:"lin", 
    // unit:"\%", 
    minValue:0, 
    maxValue:128, 
    numberOfSteps:128, 
    defaultValue:16}
);