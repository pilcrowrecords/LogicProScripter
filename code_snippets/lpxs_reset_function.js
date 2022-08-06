var PluginParameters = [];

PluginParameters.push({
	name: "Reset",
	type: "momentary",
});

PluginParameters.push({
	name:"Linear Slider", 
	type:"lin"
});

function Reset() {
	SetParameter(1, 0.0);
}

function ParameterChanged( param , value ) {
	switch ( param ) {
		case 0:
			Reset();
			break;
		case 1:
			// do nothing
		break
		default:
			// do nothing
	}
}
