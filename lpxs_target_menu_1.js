var PluginParameters = [];

PluginParameters.push({
	name:"Modwheel", 
	type:"target"
});

function HandleMIDI(event) {
	if ((event instanceof ControlChange) && (event.number == 1)) {
		var targetEvent = new TargetEvent();
		targetEvent.target = "Modwheel"; 
		targetEvent.value = event.value / 127;
		targetEvent.send();
	} else {	
		event.send();
	};
}
