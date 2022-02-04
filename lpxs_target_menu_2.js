var PluginParameters = [];

PluginParameters.push({
	name:"Linear Slider", 
	type:"lin",
	minValue:0,
	maxValue:100,
	defaultValue:50,
	numberOfSteps:100
});

function HandleMIDI(event) {
	if ( event instanceof NoteOn ) {
		event.detune += GetParameter("Linear Slider");
	}
	event.send(); 
}
