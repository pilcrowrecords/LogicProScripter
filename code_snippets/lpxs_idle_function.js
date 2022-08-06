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
    
function Idle() {
	if ( GetParameter("Add Slider") == true && PluginParameters.length < 2 ) {
		PluginParameters.push(newSlider);
		UpdatePluginParameters();
	} else if ( GetParameter("Add Slider") == false && PluginParameters.length > 1 ) {
		PluginParameters.pop();
		UpdatePluginParameters();
	}
}
