var PluginParameters = [];

PluginParameters.push({
	name:"Add Slider", 
	type:"checkbox",
	defaultValue:0
	});

var newSlider = {
	name:"Linear Slider", 
	type:"lin",
    minValue:0, 
    maxValue:100, 
    numberOfSteps:100, 
    defaultValue:50
};

function HandleMIDI(event) {
	var value = GetParameter("Linear Slider"); // returns 0
  SetParameter(1, 0.5);
}

function ParameterChanged( param , value ) {
	switch (param) {
		case 0:
			if ( value == true && PluginParameters.length < 2 ) {
				PluginParameters.push(newSlider);
			} else if ( value == false && PluginParameters.length > 1 ) {
				PluginParameters.pop();
			}
			UpdatePluginParameters();
		break;
		case 1:
			Trace(value);
		break;
		default:
		Trace("ParameterChanged Error");
	}
}


