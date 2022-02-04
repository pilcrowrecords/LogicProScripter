// Percent slider set to 50%

PluginParameters.push({
	name:"Linear Slider", 
	type:"lin", unit:"\%", 
	minValue:0, 
	maxValue:100, 
	numberOfSteps:100, 
	defaultValue:50
});

// Slider which selects between a range of -12–12, set to 0

PluginParameters.push({
	name:"Linear Slider", 
	type:"lin", 
	minValue:-12, 
	maxValue:12, 
	numberOfSteps:24, 
	defaultValue:0
});

// Logarithmic slider with a similar range to a track fader

PluginParameters.push({
	name:"Logarithmic Slider", 
	type:"log", 
	minValue:0, 
	maxValue:95, 
	numberOfSteps:950, 
	defaultValue:6.0
});

// Pulldown menu with 3 items, and the last item set as the default

PluginParameters.push({
	name:"Pulldown Menu", 
	type:"menu", 
	valueStrings:["Item 0", "Item 1", "Item 2"], 
	defaultValue:2
});

// Radio button with ``On'' and ``Off'' labels

PluginParameters.push({
	name:"Radio Buttons", 
	type:"menu", 
	valueStrings:["On", "Off"]
});

// Checkbox with the box set to be checked

PluginParameters.push({
	name:"Checkbox", 
	type:"checkbox", 
	defaultValue:1
});

// Momentary Button

PluginParameters.push({
	name: "Momentary Button",
	type: "momentary",
	disableAutomation: false
});

// Text Control

PluginParameters.push({
	name: "A Label for Control Group",
	type: "text"
});

// Target Menu

PluginParameters.push({
	name: "ModWheel Target Menu",
	type: "target"
});
