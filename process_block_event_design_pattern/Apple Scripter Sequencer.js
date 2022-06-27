/*
		Sequencer.pst

		This PST creates a user customizable MIDI sequencer that can sequence either
		MIDI notes, or MIDI Control Change messages (or both!). For more information
		on how to customize the sequencer, scroll to the end of the Script, and read
		the comments that begin after the "Global Variables" box (line 4276)
*/
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//******************************************************************************
//                                                                             *
//                                  Functions                                  *
//                                                                             *
//******************************************************************************

//^^^^^^^^^^^^^^^^^^^^^^^^^^^ Step Object & Functions ^^^^^^^^^^^^^^^^^^^^^^^^^^

//____________________________________ Step() __________________________________
/*
		Step is an object that represents a single step in a track. A track is made
		up of 1 or more step objects.

		The Step object can contain properties for both a 'note' step (triggers a
		MIDI Note event), or a 'cc' step (triggers a MIDI CC event). The Track
		object determines the mode of the track, and accesses the relevant variables
		from the Step object.

		value = the pitch or CC value to initialize with
*/
function Step (value) {
		//note variables ...........................................................
    this.pitch = MIDI.normalizeData(value); //base pitch
    this.octave = 3;												//octave range
    this.velocity = 96;    									//velocity (if the track option:
    																				//velocityByStep = false,
    																				//this value will be ignored, and a
    																				//track level velocity will be used
    																				//instead.)
    this.gateLength = 100;                  //length of the current step, as a
    																				//percentage of the current division
    																				//(if the track option
    																				//gateLengthByStep = false, this
    																				//value will be ignored, and a track
    																				//level length will be used instead.
		this.isActive = true;										//if the step is active or not
    //optional note variables ..................................................
    this.probability = 100;									//chance of step being triggered
    																				//(only used if the track option:
    																				//usesProbability = true)
    this.retrigger = 1;											//number of times a step will be
    																				//retriggers per beat (only used if
    																				//the track option:
    																				//usesRetrigger = true)							
		this.retriggerTransposition = 0;				//amount of semitones to add to each
																						//successive retrigger
		this.retriggerEndVelocity = 96;         //if != velocity each retrigger will
    																				//ramp to this final value, in equal
    																				//increments (only used if track
    																				//option: usesRetrigger = true)
    this.articulationID = 0;								//the articulationID of the current
    																				//step (only used if track option:
    																				//usesArticulationID = true;
		//cc variables .............................................................
    this.value = MIDI.normalizeData(value); //cc value
    this.shouldGlide = false;               //if this cc step should glide
    this.glideCurve = 0 ; 								  //range -1 to 1. 0 is no curve,
    																				//< 0 is logarithmic, > 0 is
    																				//exponential (if the track option:
    																				//glideCurveByStep = false, this
    																				//value will be ignored and a track
    																				//level glide curve will be used
    																				//instead
		//optional cc variables ....................................................
    this.endGlide = 0;											//the ending value of a glide (only
    																				//used if track option: usesEndGlide
    																				// = true. Otherwise, the ending
    																				//value of a glide will be the
    																				//value of the next step in the
    																				//sequence
}

//--------------------------------- shouldPlay() -------------------------------
/*
		This function is called only when the track mode is "note" and the option:
		usesProbability = true

		If the steps probability is greater than a random number, the step should be
		triggered.

		return true or false, if a step should play
*/
Step.prototype.shouldPlay = function () {
		var shouldPlay = true;

		//if probability is less than 100%, calculate if the step should play
		if (this.probability < 100) {
				shouldPlay = (Math.ceil(Math.random() * 100) <= this.probability);
		}

		return shouldPlay;
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^ Track Object & Functions ^^^^^^^^^^^^^^^^^^^^^^^^^^

//___________________________________ Track() __________________________________
/*
		Track is an object that contains information for how a track should be
		played back, and holds all of the Step objects that make up a track. The
		Track object also has many variables and methods for the calculation of
		playing back the sequences. The majority of the sequencing work is doing
		in Track functions. By having the Track object make these calculations, as
		opposed to the Sequencer object, each track can have completely independent
		controls: division, swing, direction etc.

		numSteps = max number of steps for the track
		mode = 'cc' or 'note'
		id = track number
		seq = the Sequencer object that holds this track
*/
function Track (numSteps, mode, id, seq) {
		//track variables ..........................................................
		this.steps = [];                       //array of all step objects
		for (var i = 0; i < numSteps; i++) {   //instantiate the max number of steps
				this.steps.push(new Step(0));			 //for this track
		}

		this.sequencer = seq;                  //pointer to the sequencer object
																				 //that holds this track
		this.mode = mode.toLowerCase();        //'note' or 'cc' mode
		this.currentLength = this.steps.length;//current Cycle Length
		this.isActive = true; 		          		 //current bypass state
		this.ccNumber = 1;                     //CC number to sequence
		this.currentOffset = 1; 							 //amount of offset (the value = step,
																				 //so a value of 1 means no offset)
		this.division = 4;										 //track Rate (division) 4 = 1/16th
		this.swing = 50;                       //swing amount
		this.trackID = id;                     //the index of this track in the
																				 //Sequencer objects array of tracks
		//0 forward, 1 backwards, 2 forwards <-> backward, 3 backwards <-> forwards
		//4 random, 5 switch, 6 envelope: forwards, 7 envelope: backwards
		this.direction = 0;
		this.retriggerType = 0;          		   //0 = On New Note
																				 //1 = On New Phrase
																				 //2 = Follow Global Position
		this.sustainType = 0;               	 //0 = While Notes Are Active
																				 //1 = Always
		this.switchProbability = 0;            //when direction = 5 (switch) this
																				 //track level variable controls the
																				 //probability of the direction
																				 //switching
		//note mode track variables ................................................
		this.gateLengthByStep = false;        //if true, set step length per step,
																				//if false, use the track level value
																				//trackGateLength
		this.trackGateLength = 100;           //track level step length value
		this.velocityByStep = false;          //if true, set step velocity per step
																				//if false, use the track level value
																				//trackVelocity
		this.trackVelocity = 96;              //track level velocity value
		this.usesRetrigger = false;						//if true all steps have get a control
																				//for setting the number of retriggers
																				//to perform, as well as a control
																				//to set the end value of a velocity
																				//ramp
		this.retriggerActive = true;          //track level retrigger bypass, to
																				//to enable/disable retriggers in
																				//real time
		this.usesProbability = false;				  //if true uses step probability slider
		this.usesArticulationID = false;      //if true, uses Articulation ID slider
		this.minArticulation = 0;							//min articulation ID range
		this.maxArticulation = 255;						//max articulation ID range
		this.pitchByTrack = false;						//if true, a pitch is set per track,
																				//if false, a pitch is set per step
		this.trackPitch = 0;									//track level pitch
		this.trackOctave = 3;									//track level octave

		//cc mode track variables ..................................................
		this.scaleLowAmount = 1; 						//min CC value to scale within
		this.scaleHighAmount = 127;         //max CC value to scale within
		this.curveArray = []; 							//array to store values of the
																			//current glide curve
		this.glideCurveByStep = false;      //if true, set cc glide curve per step
																			//if false, use the track level value
																			//trackGlideCurve
		this.trackGlideCurve = 1;						//track level glide curve value
		this.usesEndGlide = false;          //if true, show per step sliders for
																			//setting the ending value of a CC glide
																			//if false, no controls are provided and
																			//glides end on the value of the next
																			//step in the sequence
		//playback variables .......................................................
		this.currentStep = 0;               //the currently active step
		this.previousStep = 0;              //to store the previously active step
																			//and be able to know about what the
																			//previous step was doing
		this.isPlaying = false;             //true, if the user is enabling playback
																			//by holding down a note or if
																			//sustainType = always
		this.activeNotes = [];              //array to track which notes the user
																			//is holding down/playing
		this.isSustaining = false;					//tracks if the sustain pedal is
																			//currently pressed
		this.currentDirection = 0;          //used to track the current direction of
																			//playback, when in modes that allow for
																			//switching directions(switch,f<>b,b<>f)
																			//0 = forwards 1 = backwards
		this.hasFinished = false;           //used to track if the envelope playback
																			//modes have reached the end of their
																			//sequence, and have finished playing
		this.playbackMode = 0;							//sets how note sequences should be
																			//be played back, either:
																			//0 = as is or 1 = transposed which
																			//transposes the sequence at an interval
																			//relative to C3 (MIDI note 60)
		this.transpositionSliderIndex = 0;																	
		this.currentPitchOffset = 0;        //the amount of transposition being
																			//applied to the note sequence, when
																			//playbackMode = 1
		//UI variables .............................................................
		//these variables assist in calculating which parameters are being modified
		//when UI controls are touched, as well as pairing the correct functions to
		//the parameters. There are handled in the Sequencer function: createUI()
		this.numberOfControls = 0;         //total number of controls for this track
		this.numberOfGlobalControls = 0;   //total number of global(track) controls
		this.numberOfStepControls = 0;     //total number of step controls
		this.numberOfRandomControls = 0;   //total number of random controls
		this.numberOfEditingControls = 0;  //total number of editing controls
		this.usesLED = true;							 //if true, display LEDs in the UI for
																		 //visualizing current step position
		//variables for controlling random values ..................................
		this.enableRandom = true;					 //if random controls should be used
		this.randomAmount = 100;					 //amount of randomization to apply
		//if the related parameter(s) should be randomized
		//global
		this.enableRandomRate = 0;
		this.enableRandomDirection = 0;
		this.enableRandomStartStep = 0;
		this.enableRandomCycleLength = 0;
		this.enableRandomSwing = 0;
		//notes
		this.enableRandomPitch = 0;
		this.enableRandomOctave = 0;
		this.enableRandomArticulationID = 0;
		this.enableRandomGateLength = 0;
		this.enableRandomProbability = 0;
		this.enableRandomVelocity = 0;
		this.enableRandomRetrigger = 0;
		this.enableRandomRetrigTrans = 0;
		this.enableRandomRetriggerVelocity = 0;
		this.enableRandomGate = 0;
		//cc
		this.enableRandomValues = 0;
		this.enableRandomScaling = 0;
		this.enableRandomGlide = 0;
		this.enableRandomGlideCurve = 0;
		this.enableRandomGlideTo = 0;
		//editing tools variables ..................................................
		this.editingTools = false;				//if true, controls will be added that
																		//allow you to set all steps controls
																		//to the same values
		//variables for setting all steps
		//note ----
		this.editPitch = 0;
		this.editOctave = 3;
		this.editArtID = 0;
		this.editGateLength = 100;
		this.editProbability = 100;
		this.editVelocity = 96;
		this.editRetrigger = 1;
		this.editRetrigTrans = 0;
		this.editRetrigEndVel = 96;
		this.editGate = 0;
		//cc ----
		this.editValue = 0;
		this.editGlideTo = 0;
		this.editGlideCurve = 0;
		this.editGlide = 0;
		//variables to track the indexes of the various parameters, to be accessed
		//when randomizing values. these are initialized in the createUI Sequencer
		//function
		//global ------------
		this.rateIndex;
		this.directionIndex;
		this.switchProbabilityIndex;
		this.startStepIndex;
		this.cycleLengthIndex;
		this.swingIndex;
		//notes ---------------
		this.pitchIndexes = [];
		this.octaveIndexes = [];
		this.articulationIndexes = [];
		this.gateLengthIndexes = [];       //if is by track, just store single value
																	   //if by step, add all values
		this.probabilityIndexes = [];
		this.velocityIndexes = [];         //if is by track, just store single value
																	   //if by step, add all values
		this.retriggerIndexes = [];
		this.retrigTransIndexes = [];
		this.retriggerVelocityIndexes = [];
		this.gateIndexes = [];
		//cc-------------------
		this.scaleLowIndex;
		this.scaleHighIndex;
		this.valueIndexes = [];
		this.glideIndexes = [];
		this.glideCurveIndexes = [];       //if is by track, just store single value
																	   //if by step, add all values
		this.glideToIndexes = [];
}

//--------------------------- getRandomParameterValue() ------------------------
/*
		This function generates a random value for a parameter. The index argument
		is the index of the PluginParameter. The Plug-in Parameter is accessed,
		and the min and max ranges are found. A random number is calculated in that
		range, based on the Randomize Amount percentage slider for this track.

		index = the index of the parameter to create a random value for

		returns a random value within the min and max range of the parameter, based
						on the Randomize Amount value for the track.
*/
Track.prototype.getRandomParameterValue = function (index) {
		var plugParam = this.sequencer.paramArray[index];
		var currentValue = GetParameter(index);
		var randomValue;
		var min;
		var max;
		var lowLimit;
		var highLimit;

		if (plugParam.type.toLowerCase() === "menu") {
				min = 0;
				max = plugParam.valueStrings.length - 1;
		} else if (plugParam.type.toLowerCase() === "linear") {
				min = plugParam.minValue;
				max = plugParam.maxValue;
		} else if (plugParam.type.toLowerCase() === "checkbox") {
				min = 0;
				max = 1;
		}

		var fullRange = max - min;
		var lowerRange = Math.abs(currentValue - min);
		var upperRange = Math.abs(max - currentValue);

		if (lowerRange > upperRange) {
				var percentOfRange = lowerRange * (this.randomAmount / 100);
				lowLimit =  currentValue - percentOfRange;
				highLimit = currentValue + (currentValue - lowLimit);
				if (highLimit > max) {
						highLimit = max;
				}
		} else if (upperRange > lowerRange) {
				var percentOfRange = upperRange * (this.randomAmount / 100);
				highLimit = currentValue + percentOfRange;
				lowLimit = currentValue - (highLimit - currentValue);
				if (lowLimit < min) {
						lowLimit = min;
				}
		} else {
				var offset = (fullRange / 2) * (this.randomAmount / 100);
				lowLimit = currentValue - offset ;
				highLimit = currentValue + offset;
		}
		
		var rand;
		var num;

		//if the UI element is on/off get a random value based on probability, 
		//instead of by range
		if (plugParam.type.toLowerCase() === "checkbox") {
				if (Math.ceil(Math.random() * 100) <= this.randomAmount) {
						num = Math.round(Math.random());
				} else {
						num = currentValue;
				}
		} else {
				rand = Math.random() * 100;
				num = this.scaleValue(rand, 0, 100, lowLimit, highLimit);
		}

		return num;
}

//---------------------------------- randomize() -------------------------------
/*
		This function is called when the "RANDOMIZE!" button is pressed. It checks
		the available option check-boxes, and randomizes any elements that are 
		enabled to be randomized.
*/
Track.prototype.randomize = function () {
		//randomize globals ........................................................
		if (this.enableRandomRate === 1) {
				SetParameter(this.rateIndex,
										this.getRandomParameterValue(this.rateIndex));
		}

		if (this.enableRandomDirection === 1) {
				SetParameter(this.directionIndex,
										this.getRandomParameterValue(this.directionIndex));
				SetParameter(this.switchProbabilityIndex,
										this.getRandomParameterValue(this.switchProbabilityIndex));
		}

		if (this.enableRandomStartStep === 1) {
				SetParameter(this.startStepIndex,
										this.getRandomParameterValue(this.startStepIndex));
		}

		if (this.enableRandomCycleLength === 1){
				SetParameter(this.cycleLengthIndex,
										this.getRandomParameterValue(this.cycleLengthIndex));
		}

		if (this.enableRandomSwing === 1) {
				SetParameter(this.swingIndex,
										this.getRandomParameterValue(this.swingIndex));
		}

		//randomize notes controls .................................................
		if (this.mode === "note") {
				if (this.enableRandomPitch === 1) {
						for (index in this.pitchIndexes) {
								var paramIndex = this.pitchIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.enableRandomOctave === 1) {
						for (index in this.octaveIndexes) {
								var paramIndex = this.octaveIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.usesArticulationID && this.enableRandomArticulationID === 1) {
						for (index in this.articulationIndexes) {
								var paramIndex = this.articulationIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.enableRandomGateLength === 1) {
						for (index in this.gateLengthIndexes) {
								var paramIndex = this.gateLengthIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.usesProbability && this.enableRandomProbability === 1) {
						for (index in this.probabilityIndexes) {
								var paramIndex = this.probabilityIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.enableRandomVelocity === 1) {
						for (index in this.velocityIndexes) {
								var paramIndex = this.velocityIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.usesRetrigger) {
						if (this.enableRandomRetrigger === 1) {
								for (index in this.retriggerIndexes) {
										var paramIndex = this.retriggerIndexes[index];
										SetParameter(paramIndex,
																this.getRandomParameterValue(paramIndex));
								}
						}
						
						if (this.enableRandomRetrigTrans === 1) {
								for (index in this.retrigTransIndexes) {
										var paramIndex = this.retrigTransIndexes[index];
										SetParameter(paramIndex, 
																this.getRandomParameterValue(paramIndex));
								}
						}

						if (this.enableRandomRetriggerVelocity === 1) {
								for (index in this.retriggerVelocityIndexes) {
										var paramIndex = this.retriggerVelocityIndexes[index];
										SetParameter(paramIndex,
																this.getRandomParameterValue(paramIndex));
								}
						}
				}

				if (this.enableRandomGate === 1) {
						for (index in this.gateIndexes) {
								var paramIndex = this.gateIndexes[index];								
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}
		}
 		//randomize CC controls ....................................................
		else if (this.mode === "cc") {
				if (this.enableRandomScaling === 1) {
						SetParameter(this.scaleLowIndex,
												this.getRandomParameterValue(this.scaleLowIndex));
						SetParameter(this.scaleHighIndex,
												this.getRandomParameterValue(this.scaleHighIndex));
				}

				if (this.enableRandomValues === 1) {
						for (index in this.valueIndexes) {
								var paramIndex = this.valueIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.enableRandomGlide === 1) {
						for (index in this.glideIndexes) {
								var paramIndex = this.glideIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.enableRandomGlideCurve === 1) {
						for (index in this.glideCurveIndexes) {
								var paramIndex = this.glideCurveIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}

				if (this.usesEndGlide && this.enableRandomGlideTo === 1) {
						for (index in this.glideToIndexes) {
								var paramIndex = this.glideToIndexes[index];
								SetParameter(paramIndex,
														this.getRandomParameterValue(paramIndex));
						}
				}
		}
}

//---------------------------------- getCurve() --------------------------------
/*
		This function calculates the curve of a CC glide, in MIDI CC values.

		startValue = the starting value
		endValue = the ending value
		curve = the shape of the curve that should be applied to the values between
						startValue and endValue

		return an array of scaled values from startValue to endValue
*/
Track.prototype.getCurve = function (startValue, endValue, curve) {
		var tempArray = [];              //array to hold the calculated curve values
		var inverted = false;						 //if startValue > endValue

		if (startValue > endValue) {
				//swap start and end values
				var temp = startValue;
				startValue = endValue;
				endValue = temp;
				inverted = true;
		}

		//create initial values with specified curve (results will be out of the
		//standard MIDI CC range
		for (var i = startValue; i < endValue; i++) {
				tempArray.push(Math.pow(i, curve));
		}

		//calculate scaling amount
		var scaleAmount = endValue/tempArray[tempArray.length - 1];

		//scale values to be in range of standard MIDI CC range
		for (var i = 0; i < tempArray.length; i++) {
				tempArray[i] = MIDI.normalizeData(tempArray[i] * scaleAmount);
		}

		//if inverted, flip the inverted array so that the values decrease instead
		//of increase
		if (inverted) {
				tempArray.reverse();
		}

		//return the array of calculated MIDI CC values
		return tempArray;
}

//--------------------------------- scaleValue() -------------------------------
/*
		This function scales a value from one range, into another range.

		value = the value to scale
		oldMin = the min value of the old range
		oldMax = the max value of the old range
		newMin = the min value of the new range
		newMax = the max value of the new range

		return the scaled value
*/
Track.prototype.scaleValue = function (value, oldMin, oldMax, newMin, newMax) {
		return (value / ((oldMax - oldMin) / (newMax - newMin))) + newMin;
}

//-------------------------------- scaleCCValue() ------------------------------
/*
		This function calls scaleValue() to scale a value from a standard MIDI range
		of 0-127, into the range defined in a CC track's Scale Low and Scale High
		controls. If Scale Low > Scale High, the result is an inverted value,
		relative to the position in the range.

		value = the value to scale

		return the scaled value with normalized data
*/
Track.prototype.scaleCCValue = function (value) {
		var scaledValue = this.scaleValue(value,
																		0,
																		127,
																		this.scaleLowAmount,
																		this.scaleHighAmount);
		return MIDI.normalizeData(scaledValue);
}

//------------------------------ scaleGlideCurve() -----------------------------
/*
		This function interprets the glide curve range of -1 to 1 into the actual
		values for calculating the glide curve.

		Glide curve of 0 is actually 1
		Glide curve range of -1 to 0 is actually .1 to 1
		Glide curve range of 0 to 1 is actually 1 to 10

		value = the value to scale

		return the scaled value
*/
Track.prototype.scaleGlideCurve = function (value) {
		var result;

		//for negative values, offset to be in .1 to 1 range up to 3 decimals
		if (value < 0) {
				result = (1.1 - Math.abs(value)).toFixed(3);
		}
		//for positive values, scale the value to the 1 to 10 range up to 3 decimals
		else if (value >= 0) {
				result = this.scaleValue(value, 0, 1, 1, 10).toFixed(3);
		}

		return result;
}

//----------------------------- convertOctave() --------------------------------
/*
		This function converts an octave value (-2 through 8) into a base offset
		amount, which will be added to the base pitch value.

		octave = the octave number to convert

		return basePitch which is the converted offset
 */
Track.prototype.convertOctave = function (octave) {
		var basePitch;

		switch (octave) {
				case -2:
						basePitch = 0;
						break;
				case -1:
						basePitch = 12;
						break;
				case 0:
						basePitch = 24;
						break;
				case 1:
						basePitch = 36;
						break;
				case 2:
						basePitch = 48;
						break;
				case 3:
						basePitch = 60;
						break;
				case 4:
						basePitch = 72;
						break;
				case 5:
						basePitch = 84;
						break;
				case 6:
						basePitch = 96;
						break;
				case 7: 
						basePitch = 108;
						break;
				case 8:
						basePitch = 120;
						break;
				default:
						basePitch = 60
		}

		return basePitch;
}

//------------------------------- calculatePitch() -----------------------------
/*
		This function applies transposition to an incoming pitch, based on the
		currently played note on the keyboard, so that a sequence can be transposed
		relative to middle C (C3/60)

		pitch = the pitch to transpose

		return transposed pitch
*/
Track.prototype.calculatePitch = function (pitch) {
		var transposedPitch = pitch;

		if (this.playbackMode === 1) {
	 			//if notes above C3 are triggering the sequence
	 			if (this.currentPitchOffset > 60) {
	 					//transpose the note up
	 					transposedPitch += (this.currentPitchOffset - 60);
	 			}
	 			//if notes below C3 are triggering the sequence
	 			else if (this.currentPitchOffset < 60) {
	 					//transpose the note down
	 					transposedPitch -= (60 - this.currentPitchOffset);
	 			}
	 	} 
	 	//if follow slider
	 	else if (this.playbackMode === 2) {
	 			transposedPitch += this.currentPitchOffset;
	 	}

	 	return transposedPitch;
}

//--------------------------- convertToMSDuration() ----------------------------
/*
		This function converts a beat duration into a length in milliseconds. 

		beatLength = the length in beats (i.e. 1, 1.5, etc) to convert

		return the converted value as milliseconds
*/
Track.prototype.convertToMSDuration = function (beatLength) {
		return beatLength * (60000 / GetTimingInfo().tempo);
}

//------------------------- convertToBeatDuration() ----------------------------
/*
		This function converts a millisecond length into a beat duration

		ms = the millisecond value to convert

		return the converted value as a beat length (i.e. 1, 1.5, etc)
*/
Track.prototype.convertToBeatDuration = function (ms) {
		 return ms / (60000 / GetTimingInfo().tempo);
}
//------------------------------- pushTimingInfo() -----------------------------
/*
		This function handles the triggering of all events, based on the track's
		mode type (note or cc). The block is only executed if the track is not
		bypassed, and if in envelope mode, it has not reached the end of the
		sequence.

		Beats are scheduled to play, only if the beat falls within the current
		process buffer. This function is called once every process buffer. The
		function is called from the Sequencer function of the same name, which is
		called each ProcessMIDI() call.

		Any special actions, such as step retriggers, or CC glides, are calculated
		in this function as well.

		At the end of the function, resolveNextStep() is called, to determine
		which step should be played next.

		musicInfo = the host timing into object
		beatToSchedule = the beat that should be scheduled, based on the tracks rate
		division = the number of divisions per beat
		divLength = the length in ms of a division
*/
Track.prototype.pushTimingInfo = function (musicInfo, beatToSchedule, division,
																										divLength) {
	 	//if the track is bypassed, or envelope mode has reached it's end, do not
	 	//proceed
	 	if (this.hasFinished) {
  			return;
	 	}

		var lookAheadEnd = musicInfo.blockEndBeat;

		// when cycling, find the beats that wrap around the last buffer
		if (musicInfo.isPlaying && musicInfo.cycling 
		&& lookAheadEnd >= musicInfo.rightCycleBeat) {
				if (lookAheadEnd >= musicInfo.rightCycleBeat) {
						var cycleBeats = musicInfo.rightCycleBeat - musicInfo.leftCycleBeat;
				    var cycleEnd = lookAheadEnd - cycleBeats;
			  }
		}

		//calculate swing ..........................................................
		var swingOffset = 0;      //amount of offset to apply to the Note events
		var isSwinging = false;   //flag to check if the current step is swinging
		var divisionPercent = 0;
		var swingPercent = 0;

		//only calculate swing if it is active
		if (this.swing > 50) {
				divisionPercent = 1 / division;
				swingPercent = (this.swing * 2) / 100;
				//calculate swing offset
				swingOffset = (divisionPercent * swingPercent) - divisionPercent;

				//calculate if the current step is swinging
				//1/4 note
				if (division === 1 ) {
						if ((beatToSchedule / divisionPercent) % 2 === 1) {
								isSwinging = false;
						} else {
								isSwinging = true;
						}
				}
				//1/8, 1/16, 1/32
				else if (division === 2 || division === 4 || division === 8) {
						if ((beatToSchedule / divisionPercent) % 2 === 0) {
								isSwinging = false;
						} else {
								isSwinging = true;
						}
				}
				//1/12
				else if (division === 3) {
						var mod = Math.round(beatToSchedule / divisionPercent) % 6;
						if (mod === 1 || mod === 3 || mod === 5) {
								isSwinging = false
						} else {
								isSwinging = true;
						}
				}
				//1/24
				else if (division === 6) {
						var mod = Math.round(beatToSchedule / divisionPercent) % 6;
						if (mod === 1 || mod === 3 || mod === 5) {
								isSwinging = true
						} else {
								isSwinging = false;
						}
				}
		}

		// loop through the beats that fall within this buffer .....................
    while ((beatToSchedule >= musicInfo.blockStartBeat
    && beatToSchedule < lookAheadEnd)
    // including beats that wrap around the cycle point
    || (musicInfo.isPlaying && musicInfo.cycling && beatToSchedule < cycleEnd)){
    			// adjust for cycle
				if (musicInfo.isPlaying && musicInfo.cycling 
				&& beatToSchedule >= musicInfo.rightCycleBeat) {
						beatToSchedule -= cycleBeats;
				}

				var stepIndex;

				//if retrigger is "Follow Global Position"	 and direction is Forwards
				//calculate beat based on timeline position
				if (this.retriggerType === 2 && this.direction === 0) {
						this.currentStep = ((beatToSchedule * division) - division) 
																												% this.currentLength;
						//added to compensate for trigger beat
						if (this.currentStep < 0) {
								this.currentStep = this.currentLength - this.currentStep;
						}

						//calculate step index
						stepIndex = (this.currentStep ) % this.currentLength;
						stepIndex = (stepIndex + this.currentOffset - 1)%this.steps.length;
				}
				//all other modes: use current step
				else {
						stepIndex = this.currentStep;
				}

				//get next step so you know where you are going
	 			var nextStepIndex = stepIndex + 1;

	 			//keep in range
	 			if (nextStepIndex >= this.steps.length) {
	 					nextStepIndex = 0;
	 			}

	 			//if LEDs are shown in the UI, update the current LED position
	 			if (this.usesLED && this.isActive ) {
	 					this.updateLED(stepIndex, this.trackID);
	 			}

	 			//store this step and next step
	 			var thisStep = this.steps[stepIndex];
	 			var nextStep = this.steps[nextStepIndex];
				var currentNote;

				//if pitchByTrack, do not apply transpose value to pitch
				if (this.pitchByTrack) {
						currentNote = this.convertOctave(this.trackOctave)+this.trackPitch;
				} 
				//pitch by step; apply transpose value to pitch
				else {
						var octave = this.convertOctave(thisStep.octave);
					 	currentNote = this.calculatePitch(octave + thisStep.pitch);
				}

	 			//check if the current note is valid MIDI note, if it is out of range
	 			//do not play
	 			var isValidNote = true;
	 			if (this.mode === "note") {
	 					if (currentNote > 127 || currentNote < 0) {
	 					  		isValidNote = false;
	 					}
	 			}

	 			//check probability of note playing, and if the note is in range, play
	 			//the step. (CC steps will always have probability and valid note by
	 			//default, and will always play)
	 			if (this.isActive 
	 			&& thisStep.shouldPlay() 
	 			&& isValidNote 
	 			&& thisStep.isActive) {
	 					//note mode ........................................................
	 					switch (this.mode) {
	 					case "note":
	 							var gateLength;
	 							//get length of step either from the step or from the global
	 							//step length control
	 							if(this.gateLengthByStep) {
	 									gateLength = thisStep.gateLength;
	 							} else {
	 									gateLength = this.trackGateLength;
	 							}
	 							gateLength /= 100;

	 							//get retrigger amount. if step should be retriggered, calculate
	 							//the retrigger timing .........................................
	 							var retrigNum = thisStep.retrigger;
	 							if (this.usesRetrigger
	 							&& this.retriggerActive
	 							&& retrigNum > 1) {
	 									//calculate the start beat
	 									var startBeat = beatToSchedule;
	 									var end = beatToSchedule + (1 / division);

	 									if (isSwinging) {
	 											startBeat += swingOffset;
	 									}

	 									var beatLength = end - startBeat;
	 									var endVelocity = thisStep.retriggerEndVelocity;
	 									var retrigLength = beatLength / retrigNum;
	 									var currentVelocity;

	 									if (this.velocityByStep) {
	 											currentVelocity = thisStep.velocity;
	 									} else {
	 											currentVelocity = this.trackVelocity;
	 									}

	 									//calculate the velocity ramp for retriggers
	 									var high;
	 									var low;
	 									var direction;  //0 = down 1 = up
	 									if (currentVelocity > endVelocity) {
	 											high = currentVelocity;
	 											low = endVelocity;
	 											direction = 0;
	 									} else {
	 											high = endVelocity;
	 											low = currentVelocity;
	 											direction = 1;
	 									}
	 									velocityIncrement = (high - low) / (retrigNum - 1);

										//schedule all of the retriggers ...........................
	 									for (var i = 0; i < retrigNum; i++) {
	 											//create note event and assign all needed values
	 											var note = new NoteOn();
	 											note.pitch = currentNote 
	 																		+ (thisStep.retriggerTransposition  * i);

	 											if (note.pitch > 127 || note.pitch < 0) {
	 													continue;
	 											}
	 											
	 											note.articulationID = thisStep.articulationID;
	 											note.velocity = currentVelocity;

	 											//apply velocity ramp depending on direction
	 											if (direction === 0) {
	 													note.velocity -= (velocityIncrement * i);
	 											} else {
	 													note.velocity += (velocityIncrement * i);
	 											}
	 											note.velocity = MIDI.normalizeData(note.velocity);

	 											//schedule the beat
	 											var retrigStart = startBeat + (i * retrigLength);

	 											//calculate when the noteOff should occur
	 											var endBeat = startBeat +  (((retrigLength * (i)))
	 											                  + (retrigLength * gateLength));

												if (i === retrigNum - 1 && !isSwinging) {
														endBeat += swingOffset * gateLength;
												}

												var lengthInMS =
															 this.convertToMSDuration(endBeat - retrigStart);
												if (lengthInMS < 4) {
														endBeat = retrigStart +
																								this.convertToBeatDuration(4);
												}

	 											//in case the end beat is outside of the cycling area,
	 											//do not send the note, to prevent hung notes
	 											if (musicInfo.isPlaying && musicInfo.cycling
	 											&& endBeat > musicInfo.rightCycleBeat) {
														continue;
	 											}

												//send NoteOn
	 											note.sendAtBeat(retrigStart);

	 											//create noteOff event and assign all needed values
					 							var noteOff = new NoteOff();
	 											noteOff.pitch = note.pitch;
	 											noteOff.articulationID = thisStep.articulationID;
			 									noteOff.sendAtBeat(endBeat);
	 									}
	 							}
	 							//non-retriggered notes ........................................
	 							else {
	 									//create the noteOn event and assign all needed values
	 									var note = new NoteOn();
	 									note.pitch = currentNote;
	 									note.articulationID = thisStep.articulationID;

	 									if (this.velocityByStep) {
	 											note.velocity = thisStep.velocity;
	 									} else {
	 											note.velocity = this.trackVelocity;
	 									}

	 									//calculate the start beat
	 									var startBeat = beatToSchedule;

	 									if (isSwinging) {
	 											startBeat += swingOffset;
	 									}

										//calculate end beat
										var endBeat = beatToSchedule + (1 / division);

										if (!isSwinging) {
												endBeat += swingOffset;
										}

										//calculate length of beat and scale it by gate length
										var leng = endBeat - startBeat;
										leng *= gateLength;
										//store actual ending beat
										endBeat = startBeat + leng;

										var lengthInMS =
															   this.convertToMSDuration(endBeat - startBeat);
										if (lengthInMS < 4) {
												endBeat = startBeat + this.convertToBeatDuration(4);
										}

										//in case the end beat is outside of the cycling area,
										//don't send the note, to avoid a hung note
	 									if (musicInfo.isPlaying && musicInfo.cycling
	 									&& endBeat > musicInfo.rightCycleBeat) {
	 											break;
	 									}

	 									//send noteOn
	 									note.sendAtBeat(startBeat);

										//create noteOff event and assign all needed values
			 							var noteOff = new NoteOff();
	 									noteOff.pitch = note.pitch;
	 									noteOff.articulationID = thisStep.articulationID;
	 									noteOff.sendAtBeat(endBeat);
	 							}

	 							break;
	 					//CC mode ..........................................................
			 			case "cc":
								var startBeat = beatToSchedule;

								if (isSwinging) {
	 									startBeat += swingOffset;
	 							}
	 							
	 							//aftertouch
	 							if (this.ccNumber === 128) {
	 									if(this.previousStep && !this.previousStep.shouldGlide) {
	 											var cp = new ChannelPressure();
	 											cp.value = this.scaleCCValue(this.previousStep.value);
	 											cp.sendAtBeat(startBeat - .005);
	 									}
	 									
	 									var cp = new ChannelPressure();
	 									cp.value = this.scaleCCValue(thisStep.value);
	 									cp.sendAtBeat(startBeat);
	 							}
	 							//pitchbend
	 							else if (this.ccNumber === 129) {
	 									if (this.previousStep && !this.previousStep.shouldGlide) {
	 											var pb = new PitchBend();
	 											pb.value = this.scaleCCValue(this.previousStep.value);
	 											pb.value = this.scaleValue(pb.value, 
	 																								0, 
	 																								127, 
	 																								-8192, 
	 																								8191);
	 											pb.sendAtBeat(startBeat - .005);
	 									}
	 									
	 									var pb = new PitchBend();
	 									pb.value = this.scaleCCValue(thisStep.value);
	 									pb.value = this.scaleValue(pb.value, 0, 127, -8192, 8191);
	 									pb.sendAtBeat(startBeat);
	 							} 
	 							//regular CC
	 							else {
	 									//to preserve stepped modulation when recording to MIDI 
	 									//track, resend the previous value right before the new 
	 									//value so that there is no interpolated line connecting 
	 									//the 2 values
			 							if (this.previousStep && !this.previousStep.shouldGlide) {
			 									var cc = new ControlChange();
			 									cc.number = this.ccNumber;
			 									cc.value = this.scaleCCValue(this.previousStep.value);
			 									cc.sendAtBeat(startBeat - .005);
			 							}

	 									//create CC event and assign all values
	 									var cc = new ControlChange();
	 									cc.number = this.ccNumber;
			 							//scale the current value to the range that is defined by
	 									//scale low and scale high controls
	 									cc.value = this.scaleCCValue(thisStep.value);
	 									//send initial value
	 									cc.sendAtBeat(startBeat);
	 							}

	 				 			//if the current step is set to glide
	 							if (thisStep.shouldGlide) {
	 									var curve;

	 									//get glide curve either from step or track slider
	 									if (this.glideCurveByStep) {
	 											curve = this.scaleGlideCurve(thisStep.glideCurve);
	 									} else {
	 											curve = this.scaleGlideCurve(this.trackGlideCurve);
	 									}

	 									//get start and end values
	 									var startValue = this.scaleCCValue(thisStep.value);
	 									var endValue;

	 									//if endGlide slider is active, use the value from the end
	 									//glide slider, otherwise, use the value from the next
	 									//step in the sequence
	 									if (this.usesEndGlide) {
	 											endValue = this.scaleCCValue(thisStep.endGlide);
	 									} else {
	 											endValue = this.scaleCCValue(nextStep.value);
	 									}

	 									//create an array of CC values, which are scaled to
	 									//increment in a curve, set by glideCurve
	 									this.curveArray = this.getCurve(startValue,
	 																								endValue,
	 																								curve);

	 									//if the array is filled
	 									if (this.curveArray.length > 0) {
												//calculate end beat
												var endBeat = beatToSchedule + (1 / division);

												if (!isSwinging) {
														endBeat += swingOffset;
												}

												//calculate the timing intervals between CC sends
	 										 	var interval = (endBeat - startBeat)
	 										 															/ this.curveArray.length;
												var counter = 0;

	 											//schedule all CC events
	 											for (var i = 0 ; i < this.curveArray.length; i++) {
	 													//aftertouch
	 													if (this.ccNumber === 128) {
	 															var cp = new ChannelPressure();
	 															cp.value = this.curveArray[i];
	 															cp.sendAtBeat(startBeat + counter);
	 															counter += interval;
	 													}
	 													//pitchbend
	 													else if (this.ccNumber === 129) {
	 															var pb = new PitchBend();
	 															pb.value = this.scaleValue(this.curveArray[i], 
	 																												0, 
	 																												127, 
	 																												-8192, 
	 																												8191);
	 															pb.sendAtBeat(startBeat + counter);
	 															counter += interval;
	 													}
	 													else {
																var cc = new ControlChange();
																cc.number = this.ccNumber;
																cc.value = this.curveArray[i];
																cc.sendAtBeat(startBeat + counter);
																counter += interval;
														}
												}
	 									}
	 							}

	 							break;

	 					default:
								Trace("error in Track.pushTimingInfo()");
	 					}

	 					//store the previous step
	 					this.previousStep = thisStep;

	 			} else {
	 					//not a valid note, do nothing
	 			}

	 			//for all modes, except "Follow Global Position" calculate the next
	 			//step in the sequence
	 			this.resolveNextStep();

				// advance to next beat
			  beatToSchedule += 0.001;
			  beatToSchedule = Math.ceil(beatToSchedule * division) / division;
		}
}

//--------------------------------- advanceStep() ------------------------------
/*
		This function advances the currentStep either forwards of backwards by one,
		and performs checks to keep the step within the valid range that is defined
		by Start Step and Cycle Length

		startStep = the first step in the cycle
		endStep = the last step in the cycle
		direction = 0 (forwards) or 1 (backwards)
*/
Track.prototype.advanceStep = function (startStep, endStep, direction) {
	 	if (direction === 0) {
	 		 	//move forward in the sequence
	 			this.currentStep++;

	 			//if the step is beyond the max step, wrap around to 0
	 			if (this.currentStep > this.steps.length - 1) {
	 					this.currentStep = 0;
	 			}
	 	} else {
	 			//move backwards in the sequence
	 			this.currentStep--;

				//if the step is below the min range, wrap to max step
				if (this.currentStep < 0) {
						this.currentStep = this.steps.length - 1;
				}
	 	}

	 	//if the step is outside of the range of active steps, adjust the
	 	//step to fall within the range
	 	if (startStep < endStep) {
	 			//forwards
	 			if (direction === 0) {
	 					if (this.currentStep < startStep || this.currentStep > endStep) {
	 							this.currentStep = startStep;
	 					}
	 			}
	 			//backwards
	 			else {
	 					if (this.currentStep < startStep || this.currentStep > endStep) {
	 							this.currentStep = endStep;
	 					}
	 			}
	 	} else if (startStep > endStep) {
	 			//forwards
	 			if (direction === 0) {
	 				 	if (this.currentStep > endStep && this.currentStep < startStep) {
	 							this.currentStep = startStep;
	 					}
	 			}
	 			//backwards
	 			else {
	 				 	if (this.currentStep > endStep && this.currentStep < startStep) {
	 							this.currentStep = endStep;
	 					}
	 			}
	 	} else if (startStep === endStep) {
	 			//forwards
	 			if (direction === 0) {
	 					this.currentStep = startStep;
	 			}
	 			//backwards
	 			else {
	 				 	this.currentStep = endStep;
	 			}
		}
}

//------------------------------- resolveNextStep() ----------------------------
/*
		This function determines the next step that should be played in the sequence
		based on the track Direction control.
*/
Track.prototype.resolveNextStep = function () {
		//get the range of active steps
		var startStep = this.currentOffset - 1;
		var endStep = ((this.currentOffset - 1) + (this.currentLength - 1))
																													% this.steps.length;

		//calculate the next step, based on the current direction
	 	switch (this.direction) {
	 	//forwards .................................................................
	 	case 0:
				this.advanceStep(startStep, endStep, 0);
	 			break;
	 	//backwards ................................................................
	 	case 1:
				this.advanceStep(startStep, endStep, 1);
	 			break;
	 	//forwards <-> backwards ...................................................
	 	case 2:
	 			//fall through to case 3, as f <-> b and b <-> f use the same logic
	 	//backwards <-> forwards ...................................................
	 	case 3:
	 			//when reaching the start or end step of the range, switch directions
				//switch from forward to backward
				if (this.currentDirection === 0 && this.currentStep ===  endStep) {
						this.currentDirection = 1;
						this.currentStep = endStep + 1;
				}
				//switch from backwards to forwards
				else if (this.currentDirection === 1 && this.currentStep === startStep){
						this.currentDirection = 0;
				   	this.currentStep = startStep - 1;
				}

				//advance step depending on direction
				if (this.currentDirection === 0) {
						this.advanceStep(startStep, endStep, 0);
	 			} else {
						this.advanceStep(startStep, endStep, 1);
	 			}

	 			break;
	 	//random ...................................................................
	 	case 4:
	 			//randomly pick a step in the range of active steps
	 			var randomStep = Math.floor(Math.random() * this.currentLength);
				this.currentStep = (randomStep + this.currentOffset - 1)
																												% this.steps.length;
	 			break;
	 	//switch ...................................................................
	 	case 5:
				//see if the direction should change, depending on the switch
				//probability percentage
				if (Math.ceil(Math.random() * 100) <= this.switchProbability) {
						if (this.currentDirection === 0) {
								this.currentDirection = 1;
						} else {
								this.currentDirection = 0;
						}
				}

				if (this.currentDirection === 0) {
						this.advanceStep(startStep, endStep, 0);
				} else {
						this.advanceStep(startStep, endStep, 1);
				}

	 			break;
	 	//envelope forwards ........................................................
	 	case 6:
	 			this.currentStep++;

	 			if (this.currentStep >= this.steps.length) {
	 					this.currentStep = 0;
	 			}

	 			var end = ((this.currentOffset - 1) + (this.currentLength))
	 																												% this.steps.length

	 			if (this.currentStep === end ) {
	 					this.hasFinished = true;
	 			}

	 			break;
	 	//envelope backwards .......................................................
	 	case 7:
	 			this.currentStep--;

	 			var end = (this.currentOffset-2)%this.steps.length;

	 			if(this.currentStep === end) {
	 					this.hasFinished = true;
	 			}

	 			if(this.currentStep < 0) {
	 					this.currentStep = this.steps.length-1;
	 			}

	 			break;
	 	default:
	 			break;
	 	}
}

//-------------------------- updateTranspositionSlider() -----------------------
/*
		This function sets the value of the "Semitone Offset From C3" slider, if 
		the Transposition mode is set to "Follow Keyboard". 
		
		pitch is the incoming pitch, from which the offset is calculated 
*/
Track.prototype.updateTranspositionSlider = function (pitch) {
		if (this.playbackMode === 1) {
				var offsetValue = pitch - 60;
				SetParameter(this.transpositionSliderIndex, offsetValue);
		}
}

//----------------------------------- pushMIDI() -------------------------------
/*
		 This function receives incoming MIDI events and updates the state of the
		 track playback accordingly.

		 When NoteOn messages are received the sequence will be restarted (according
		 to the Retrigger type), and the beat at which the NoteOn event was received
		 will be stored. The current pitch is stored, so that the sequence can be
		 transposed.

		 When NoteOff messages are received remove the Note from the list of active
		 notes.

		 When sustain pedal message is received, track the state of the sustain
		 pedal.

		 Set the sequence to play if notes are active, or if sustain pedal is
		 pressed.

		 event = the incoming MIDI event
		 hostInfo = the timing info from the host
*/
Track.prototype.pushMIDI = function (event, hostInfo) {
		//Handle NoteOn events .....................................................
		if (event instanceof NoteOn) {
				//Retrigger === "On New Note")
				if (this.retriggerType === 0) {
						this.resetStep();
				}
				//Retrigger === "One New Phrase" and a new phrase is starting
				else if (this.retriggerType === 1
				&& this.activeNotes.length === 0
				&& !this.isSustaining) {
						this.resetStep();
				}
				//Retrigger === "Follow Global Position"
				else if (this.retriggerType === 2) {
						//forward or switch
						if (this.direction === 0 || this.direction === 5) {
								//do nothing
						}
						//always retrigger envelope modes
						else if (this.direction === 6 || this.direction === 7) {
								this.resetStep();
						}
				}

				//track the pitch for transposing the sequence
				if (this.playbackMode === 1) {
						this.currentPitchOffset = event.pitch;
				}
				
				//set playing to true
				this.isPlaying = true;

				//add to list of active notes
				this.activeNotes.push(event.pitch);			
				
				//set the transposition slider to the current offset
				this.updateTranspositionSlider(event.pitch);	
		}
		//Handle NoteOff events ....................................................
		else if (event instanceof NoteOff) {
				//remove the note from list of active notes
				for (var i = 0; i < this.activeNotes.length; i++) {
						if (event.pitch === this.activeNotes[i]) {
								this.activeNotes.splice(i,1);

								//set current pitch offset to the last note that was triggered
								if (this.playbackMode === 1 && this.activeNotes.length > 0) {
										this.currentPitchOffset =
																this.activeNotes[this.activeNotes.length - 1];
								}
								break;
						}
				}
		}
		//Handle Sustain Pedal .....................................................
		else if (event instanceof ControlChange && event.number === 64) {
				this.isSustaining = (event.value > 0) ? true : false;
		}

		//if sustain type is "always"
		if (this.sustainType === 1) {
				//set to playing
				this.isPlaying = true;
		}
		//if sustain type is "while notes are active" check if there are held notes
		//or if the sustain pedal is pressed. if neither are true, stop playing
		else if (this.activeNotes.length < 1 && !this.isSustaining) {
				this.isPlaying = false;
		}
}

//---------------------------------- updateLED() -------------------------------
/*
		This function updates the step LEDs for a track, to show the currently
		active step. It also sets all other steps to be inactive.

		currentStep = the current step (0 through steps.length-1)
		track = the trackID of the track to update the LEDs for
*/
Track.prototype.updateLED = function (currentStep, track) {
		var controlsOffset = this.numberOfControls - this.numberOfRandomControls 
															- this.numberOfEditingControls;

		for (var i = 0; i < track; i++) {
				if (i < this.sequencer.tracks.length - 1) {
						controlsOffset += this.sequencer.tracks[i].numberOfControls;
				}
		}

		var step = (controlsOffset - this.steps.length + currentStep);
		var startIndex = controlsOffset - this.steps.length ;

		for (var i = startIndex; i < controlsOffset; i++) {
				if(step === i) {
	    				SetParameter(i, 1);
				} else {
						SetParameter(i, 0);
		 		}
		}
}

//---------------------------------- resetStep() -------------------------------
/*
		This function resets the currentStep to either the first or last step in the
		sequence.

		If the mode supports changing direction, reset the direction

		If the mode is envelope mode, reset the hasFinished flag, for tracking if
		the sequence has played through
*/
Track.prototype.resetStep = function () {
		switch (this.direction){
		//forwards
		case 0:
				this.currentStep = this.currentOffset - 1;
				break;
		//backwards
		case 1:
				this.currentStep = (this.currentOffset - 1 + this.currentLength - 1)
																											 % (this.steps.length);
				break;
		//forwards <-> backwards
		case 2:
				this.currentStep = this.currentOffset - 1;
				this.currentDirection = 0;
				break;
		//backwards <-> forwards
		case 3:
				this.currentStep = (this.currentOffset - 1 + this.currentLength - 1)
																											 % (this.steps.length);
				this.currentDirection = 1;
				break;
		//random
		case 4:
				//do nothing, as there is no reset for random
				break;
		//switch
		case 5:
				this.currentStep = this.currentOffset - 1;
				break;
		//envelope : forwards
		case 6:
				this.currentStep = this.currentOffset - 1;
				this.hasFinished = false;
				break;
		//envelope : backwards
		case 7:
				this.currentStep = (this.currentOffset - 1 + this.currentLength - 1)
																											 % (this.steps.length);
				this.hasFinished = false;
				break;
		default:
				break;
		}
}

//^^^^^^^^^^^^^^^^^^^^^^^^^ Sequencer Object & Functions ^^^^^^^^^^^^^^^^^^^^^^^

//_________________________________ Sequencer() ________________________________
/*
		Constructor for the Sequencer object. The constructor does input error
		handling, which supplies default values, if the user does not enter valid
		values.

		If the arguments are valid the object will be initialized with the specified
		number of tracks, with the specified number of steps, and the specified
		mode. The user can modify tracks individually, using the various optional
		functions that are supplied.

		numTracks = the number of tracks to instantiate
		numSteps = the max number of steps in all tracks
		mode = the mode for all tracks : "note" or "cc"
*/
function Sequencer (numTracks, numSteps, mode) {
		var trackCount;             //private variable for initializing track count
		var stepCount; 							//private variable for initializing step count
		var initialMode;						//private variable for initializing mode type
		this.paramArray;            //stores a reference to the PluginParameters
																//array

		//handle invalid input .....................................................
		if (arguments.length !== 3) {
				Trace("Error creating Sequencer object. Please specify the number of "
				+ "tracks, the number of steps, and the sequencer mode. Defaulting to "
				+ "1 track, 16 steps, in \"note\" mode.");
				trackCount = 1;
				stepCount = 16;
				initialMode = "note";
		} else {
				if (numTracks < 1) {
						Trace("Error creating Sequencer object. The number of tracks must "
						+ "be at least 1. Defaulting to 1 track.");
						trackCount = 1;
				} else {
						trackCount = numTracks;
				}

				if (numSteps < 1) {
						Trace("Error creating Sequencer object. The number of steps must "
						+ "be at least 1. Defaulting to 16 steps.");
						stepCount = 16;
				} else {
						stepCount = numSteps;
				}

				var lowerCaseMode = mode.toLowerCase();
				if (lowerCaseMode !== "note" && lowerCaseMode !== "cc") {
						Trace("Error creating Sequencer object. The sequencer mode must be "
						+ "either \"note\" or \"cc\". Defaulting to \"note\" mode.");
						initialMode = "note";
				} else {
						initialMode = lowerCaseMode;
				}
		}

		this.tracks = [];               //array of track objects
		this.wasPlaying = false;        //flag to track if the sequencer changed
																	//from playing to note playing
		this.hostInfo;									//the timing info from the host (updated
																	//every ProcessMIDI() block
		this.active = false;	           //if the sequencer is running or not
		this.isSustaining = false;			//if the sustain pedal is currently pressed
		this.activeNotes = [];					//array of active notes that the user is
																	//holding down
		this.updateFunctions = [];      //array of all functions used in updating
																	//values, when changing UI controls
		//instantiate the specified number of tracks, with specified number of
		//steps, and mode type
		for (var i = 0; i < trackCount; i++) {
				this.tracks.push(new Track(stepCount, initialMode, i, this));
		}
}

//---------------------------- pushParameterChanged() --------------------------
/*
		This function gets called whenever a Scripter UI element is changed. The
		data from ParameterChanged() gets passed to this function, which calculates
		which function to call, to update the corresponding Step or Track parameter
		values.

		The functions are defined in the createUI function, and are stored in an
		array. The param index will access the function at that index.

		All functions are called with the (value, track, step) configuration so that
		any function can be called with a single, generic function call. If the
		function does not require step data, the value will simply be ignored.

		The track object is sent, and the step index is sent.

		param = the index of the scripter parameter that has changes
		value = the value of the parameter
*/
Sequencer.prototype.pushParameterChanged = function (param, value) {
		var previousControl = 0;      //number of controls the previous track has
		var trackIndex = 0;						//index of the track that is being updated
		var stepIndex = 0;						//index of the step that is being updated

		//get the index for the related track
		for (var i = 0; i < this.tracks.length; i++) {
				var numControls = this.tracks[i].numberOfControls;
				var total = (numControls + previousControl);
				
				//if the param index falls within this range of controls, this is the
				//index of the track
				if (param < total) {
						trackIndex = i;
						break;
				}

				//update the amount of controls that have already been examined
				previousControl += numControls;
		}

		//number of track level controls for this track
		var numGlobalControls = this.tracks[trackIndex].numberOfGlobalControls;
		//number of step level controls (total) for this track
		var numStepControls = this.tracks[trackIndex].numberOfStepControls;
		//the number of controls per step
		var numPerStep = numStepControls/this.tracks[trackIndex].steps.length;

		//if the parameter falls outside the track count, it is a step control
		if (param > numGlobalControls) {
				//get the step index
				stepIndex = (param - numGlobalControls) - previousControl;

				//calculate the step index, based on number of step controls
				if (stepIndex % numPerStep > 0 ) {
						stepIndex = (stepIndex - stepIndex % numPerStep) / numPerStep
				} else {
						stepIndex /= numPerStep;
				}
		}
		
		//if the param index falls within the range of the array of functions
		if (param < this.updateFunctions.length) {
				//every UI control has a function for updating it, stored in an array
				//of functions: updateFunctions. Send the calculated track object and
				//step index info to the function, with the new value
				this.updateFunctions[param](value,
																	this.tracks[trackIndex],
																	stepIndex,
																	param);
		}
}

//----------------------------------- createUI() -------------------------------
/*
		This function creates the UI for the sequencer, based on the user's
		configuration (which must be set, prior to calling this method). All
		functions for updating values are defined as variables in this method,
		and stored in an array that has a 1:1 relationship with the parameter index.

		paramArray = the PluginParameters array variable. This array must be passed
								into this function for the UI to be created.
*/
Sequencer.prototype.createUI = function (paramArray) {
		//keep a reference to the paramArray, so that it can be accessed elsewhere
		this.paramArray = paramArray;

		//note names
		var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", 
									"B"];

		//generic track functions ..................................................
		//update state (bypassed/active)
		var trackStateUpdate = function (value, track, step) {
				track.isActive = (value === 0) ? false : true;
		}

		//update Rate
		var trackRateUpdate = function (value, track, step) {
				//if 1/24
				if (value === 4) {
						track.division = 6;
				}
				//if 1/32
				else if (value === 5) {
						track.division = 8;
				}
				//all other rates
				else {
						track.division = value + 1;
				}
		}

		//update Direction
		var trackDirectionUpdate = function (value, track, step) {
				//set direction
				track.direction = value;
				//reset hasFinished flag so that envelope modes are reset when switching
				//modes
				track.hasFinished = false;
		}

		//update Switch Probability
		var trackSwitchUpdate = function (value, track, step) {
				track.switchProbability = value;
		}

		//update Retrigger mode
		var trackRetriggerUpdate = function (value, track, step) {
				track.retriggerType = value;
		}

		//update Sustain mode
		var trackSustainUpdate = function (value, track, step) {
				track.sustainType = value;
				//if going from "always" to "while notes are active" and there are
				//no active notes and sustain is not being pressed, then
				//stop the playback
				if (value === 0
				&& track.activeNotes.length === 0
				&& track.isSustaining === false) {
						track.isPlaying = false;
				}
		}

		//update Swing
		var trackSwingUpdate = function (value, track, step) {
				track.swing = value;
		}

		//update Start Step
		var trackStartStepUpdate = function (value, track, step) {
				track.currentOffset = value;
		}

		//update Cycle Length
		var trackCycleLengthUpdate = function(value, track, step) {
				track.currentLength = value;
		}

		//note track functions .....................................................
		var trackPlaybackUpdate = function (value, track, step) {
				track.playbackMode = value;
				if (value === 0) {
						SetParameter(track.transpositionSliderIndex, 0);
				} else if (value === 1) {
						//do nothing
				} else {
						track.currentPitchOffset = 
																	GetParameter(track.transpositionSliderIndex);
				}
		}
		
		var trackSemiOffsetUpdate = function (value, track, step) {
				if (track.playbackMode === 2) {
						track.currentPitchOffset = value; 
				}
		}

		var trackVelocityUpdate = function (value, track, step) {
				track.trackVelocity = value;
		}

		var trackRetriggerBypassUpdate = function (value, track, step) {
				track.retriggerActive = value;
		}

		var trackGateLengthUpdate = function (value, track, step) {
				track.trackGateLength = value;
		}

		var trackPitchUpdate = function (value, track, step) {
				track.trackPitch = value;
		}

		var trackOctaveUpdate = function (value, track, step) {
				track.trackOctave = value;
		}

		//CC track functions .......................................................
		//update CC target
		var trackCCUpdate = function (value, track, step) {
				track.ccNumber = value;
		}

		//update Scale High
		var trackScaleHighUpdate = function (value, track, step) {
				track.scaleHighAmount = value;
		}

		//update Scale Low
		var trackScaleLowUpdate = function (value, track, step) {
				track.scaleLowAmount = value;
		}

		//update track Glide Curve
		var trackGlideCurveUpdate = function (value, track, step) {
				track.trackGlideCurve = value;
		}

		//note step functions ......................................................
		//These functions are for updating step variables, for note mode.
		//the new value, track index, and step index are passed to these functions
		//update pitch
		var pitchUpdate = function (value, track, step) {
				track.steps[step].pitch = value;
		}

		var octaveUpdate = function (value, track, step) {
				track.steps[step].octave = value;
		}

		//update articulation ID
		var articulationUpdate = function (value, track, step) {
				track.steps[step].articulationID = value;
		}

		//update step length per step
		var lengthUpdate = function (value, track, step) {
				track.steps[step].gateLength = value;
		}

		//update velocity per step
		var velocityUpdate = function (value, track, step) {
				track.steps[step].velocity = value;
		}

		//update probability
		var probabilityUpdate = function (value, track, step) {
				track.steps[step].probability = value;
		}

		//update retrigger
		var retriggerUpdate = function (value, track, step) {
				track.steps[step].retrigger = value;
		}
		
		var retriggerTransUpdate = function (value, track, step) {
				track.steps[step].retriggerTransposition = value;
		}

		//update retrigger end velocity
		var retriggerEndVelocityUpdate = function (value, track, step) {
				track.steps[step].retriggerEndVelocity = value;
		}

		var gateUpdate = function (value, track, step) {
				track.steps[step].isActive = value;
		}

		//CC  step functions .......................................................
		//these functions update step variables, for CC mode
		//update CC value
		var valueUpdate = function (value, track, step) {
				track.steps[step].value = value;
		}

		//update glide button
		var glideUpdate = function (value, track, step) {
				track.steps[step].shouldGlide = value;
		}

		//update glide curve per step
		var glideCurveUpdate = function (value, track, step) {
				track.steps[step].glideCurve = value;
		}

		//update end glide
		var endGlideUpdate = function (value, track, step) {
				track.steps[step].endGlide = value;
		}

		var emptyLED = function (value, track, step) {
				//do nothing
		}

		//random functions  ........................................................
		//triggers randomization of selected parameters
		var trackRandomize = function (value, track, step, index) {
				if (value === 1) {
						track.randomize();
						SetParameter(index, 0); //set random button to off
				}
		}

		//set randomization amount
		var trackRandomAmount = function (value, track, step) {
				track.randomAmount = value;
		}

		//enable randomization for global elements ------------------
		var trackRandomRate = function (value, track, step) {
				track.enableRandomRate = value;
		}

		var trackRandomDirection = function (value, track, step) {
				track.enableRandomDirection = value;
		}

		var trackRandomStartStep = function (value, track, step) {
				track.enableRandomStartStep = value;
		}

		var trackRandomCycleLength = function (value, track, step) {
				track.enableRandomCycleLength = value;
		}

		var trackRandomSwing = function (value, track, step) {
				track.enableRandomSwing = value;
		}

		//enable randomization for CC elements ----------------------
		var trackRandomScaling = function (value, track, step) {
				track.enableRandomScaling = value;
		}

		var stepRandomValues = function (value, track, step) {
				track.enableRandomValues = value;
		}

		var stepRandomGlides = function (value, track, step) {
				track.enableRandomGlide = value;
		}

		var stepRandomGlideCurves = function (value, track, step) {
				track.enableRandomGlideCurve = value;
		}

		var stepRandomGlideTo = function (value, track, step) {
				track.enableRandomGlideTo = value;
		}

		//enable randomization for note elements --------------------
		var stepRandomPitch = function (value, track, step) {
				track.enableRandomPitch = value;
		}

		var stepRandomOctave = function (value, track, step) {
				track.enableRandomOctave = value;
		}

		var stepRandomArticulation = function (value, track, step) {
				track.enableRandomArticulationID = value;
		}

		var stepRandomGateLength = function (value, track, step) {
				track.enableRandomGateLength = value;
		}

		var stepRandomProbability = function (value, track, step) {
				track.enableRandomProbability = value;
		}

		var stepRandomVelocity = function (value, track, step) {
				track.enableRandomVelocity = value;
		}

		var stepRandomRetrigger = function (value, track, step) {
				track.enableRandomRetrigger = value;
		}
		
		var stepRandomRetrigTrans = function (value, track, step) {
				track.enableRandomRetrigTrans = value;
		}

		var stepRandomRetriggerVelocity = function (value, track, step) {
				track.enableRandomRetriggerVelocity = value;
		}

		var stepRandomGate = function (value, track, step) {
				track.enableRandomGate = value;
		}
		
		//track editing tools functions ............................................
		// (set all steps to specified value)
		//note ---------------------
		var editPitch = function (value, track, step) {
				track.editPitch = value;
		}
		
		var setPitch = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.pitchIndexes.length; i++) {
								SetParameter(track.pitchIndexes[i], track.editPitch);
						}
						SetParameter(index, 0);
				}
		}

		var editOctave = function (value, track, step) {
				track.editOctave = value;
		}

		var setOctave = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.octaveIndexes.length; i++) {
								SetParameter(track.octaveIndexes[i], track.editOctave);
						}
						SetParameter(index, 0);
				}
		}
		
		var editArtID = function (value, track, step) {
				track.editArtID = value;
		}
		
		var setArtID = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.articulationIndexes.length; i++) {
								SetParameter(track.articulationIndexes[i], track.editArtID);
						} 
						SetParameter(index, 0);
				}
		}
		
		var editProbability = function (value, track, step) {
				track.editProbability = value;
		}
		
		var setProbability = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.probabilityIndexes.length; i++) {
								SetParameter(track.probabilityIndexes[i], 
														 track.editProbability);
						} 
						SetParameter(index, 0);
				}
		}

		var editVelocity = function (value, track, step) {
				track.editVelocity = value;
		}
		
		var setVelocity = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.velocityIndexes.length; i++) {
								SetParameter(track.velocityIndexes[i], track.editVelocity);
						} 
						SetParameter(index, 0);
				}
		}

		var editRetrigger = function (value, track, step) {
				track.editRetrigger = value;
		}

		var setRetrigger = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.retriggerIndexes.length; i++) {
								SetParameter(track.retriggerIndexes[i], track.editRetrigger);
						} 
						SetParameter(index, 0);
				}
		}

		var editRetrigTrans = function (value, track, step) {
				track.editRetrigTrans = value;
		}
		
		var setRetrigTrans = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.retrigTransIndexes.length; i++) {
								SetParameter(track.retrigTransIndexes[i], 
															track.editRetrigTrans);
						} 
						SetParameter(index, 0);
				}
		}

		var editRetrigEndVel = function (value, track, step) {
				track.editRetrigEndVel = value;
		}
		
		var setRetrigEndVel = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.retrigTransIndexes.length; i++) {
								SetParameter(track.retriggerVelocityIndexes[i], 
																											track.editRetrigEndVel);
						} 
						SetParameter(index, 0);
				}
		}

		var editGate = function (value, track, step) {
				track.editGate = value;
		}

		var setGate = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.gateIndexes.length; i++) {
								SetParameter(track.gateIndexes[i], track.editGate);
						} 
						SetParameter(index, 0);
				}
		}

		//cc ----------------------
		var editValue = function (value, track, step) {
				track.editValue = value;
		}
		
		var setValue = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.valueIndexes.length; i++) {
								SetParameter(track.valueIndexes[i], track.editValue);
						}
						SetParameter(index, 0);
				}
		}

		var editGlideTo = function  (value, track, step) {
				track.editGlideTo = value;
		}
		
		var setGlideTo = function (value, track, step, index) {
				if (value === 1) {
						for (var i = 0; i < track.glideToIndexes.length; i++) {
								SetParameter(track.glideToIndexes[i], track.editGlideTo);
						}	
						SetParameter(index, 0);
				}
		}
		
		var editGlideCurve = function (value, track, step) {
				track.editGlideCurve = value;
		}
		
		var setGlideCurve = function (value, track, step, index) {
				if(value === 1) {
						for (var i = 0; i < track.glideCurveIndexes.length; i++) {
								SetParameter(track.glideCurveIndexes[i], track.editGlideCurve);
						}
						SetParameter(index, 0);
				}
		}
		
		var editGlide = function (value, track, step) {
				track.editGlide = value;
		}
		
		var setGlide = function (value, track, step, index) {
				if(value === 1) {
						for (var i = 0; i < track.glideIndexes.length; i++) {
								SetParameter(track.glideIndexes[i], track.editGlide);
						}
						SetParameter(index, 0);
				}
		}
		
		var editGateLength = function (value, track, step) {
				track.editGateLength = value;
		}
		
		var setGateLength = function (value, track, step, index) {
				if(value === 1) {
						for (var i = 0; i < track.gateLengthIndexes.length; i++) {
								SetParameter(track.gateLengthIndexes[i], track.editGateLength);
						}
						SetParameter(index, 0);
				}
		}
		
		//Create UI ................................................................
		//add controls for each track, depending on the user defined optional
		//configurations. Add all related functions to the updateFunctions array,
		//while adding the UI control to the PluginParameters array
		for (var i = 0; i < this.tracks.length; i++) {
				var trackNumber = i + 1           //the user facing track number
				var mode = this.tracks[i].mode;   //the mode of this track

				var namePrefix = "";              //used to prefix both track and step
																				//numbers to the controls. if only
																				//one track is instantiated, no
																				//track numbers will be prefixed

				//if multiple tracks are being created, append the track # to all names
				if (this.tracks.length > 1) {
						namePrefix += "T"
						namePrefix += trackNumber + " : ";
				}

				//create track controls ________________________________________________
				//max # of steps for this track
				var maxLength = this.tracks[i].steps.length;

				//State ................................................................
				paramArray.push({
						name:namePrefix + "State",
						type:"menu",
						valueStrings:["Bypassed", "Active"],
						defaultValue:1,
						numberOfSteps:2
				});
				//function for updating track state
				this.updateFunctions.push(trackStateUpdate);

				//Rate .................................................................
				paramArray.push({
						name:namePrefix + "Rate",
						type:"menu",
						valueStrings:this.getDivisionLengths(),
						defaultValue:3,
						numberOfSteps:this.getDivisionLengths().length - 1
				});
				this.updateFunctions.push(trackRateUpdate);
				this.tracks[i].rateIndex = paramArray.length - 1;

				paramArray.push({
						name:namePrefix + "Direction",
						type:"menu",
						valueStrings:["Forwards", "Backwards", "Forwards <-> Backwards",
												"Backwards <-> Forwards", "Random", "Switch",
												"Envelope : Forwards", "Envelope : Backwards",],
						defaultValue:0,
						numberOfSteps:3
				});
				this.updateFunctions.push(trackDirectionUpdate);
				this.tracks[i].directionIndex = paramArray.length - 1;

				//Switch Probability ...................................................
				paramArray.push({
						name:namePrefix + "Switch Probability",
						type:"linear",
						minValue:0,
						maxValue:100,
						unit:"%",
						numberOfSteps:100,
						defaultValue:0
				});
				this.updateFunctions.push(trackSwitchUpdate);
				this.tracks[i].switchProbabilityIndex = paramArray.length - 1;

				//Retrigger ............................................................
				paramArray.push({
						name:namePrefix + "Retrigger",
						type:"menu",
						valueStrings:["On New Note",
												 "On New Phrase",
												 "Follow Global Position"],
						defaultValue:0,
						numberOfSteps:2
				});
				this.updateFunctions.push(trackRetriggerUpdate);

				//Sustain ..............................................................
				paramArray.push({
						name:namePrefix + "Sustain",
						type:"menu",
						valueStrings:["While Notes Are Active", "Always"],
						numberOfSteps:1,
						defaultValue:0
				});
				this.updateFunctions.push(trackSustainUpdate);

				//Swing ................................................................
				paramArray.push({
						name:namePrefix + "Swing",
						type:"linear",
						minValue:50,
						maxValue:99,
						numberOfSteps:49,
						defaultValue:50,
						unit:"%"
				});
				this.updateFunctions.push(trackSwingUpdate);
				this.tracks[i].swingIndex = paramArray.length - 1;

				//Start Step ...........................................................
				paramArray.push({
						name: namePrefix + "Start Step",
						type:"linear",
						minValue:1,
						maxValue: maxLength,
						defaultValue:1,
						numberOfSteps:maxLength - 1,
				});
				this.updateFunctions.push(trackStartStepUpdate);
				this.tracks[i].startStepIndex = paramArray.length - 1;

				//Cycle Length .........................................................
				paramArray.push({
						name: namePrefix + "Cycle Length",
						type:"linear",
						minValue:1,
						maxValue: maxLength,
						defaultValue:maxLength,
						numberOfSteps:maxLength - 1,
				});
				this.updateFunctions.push(trackCycleLengthUpdate);
				this.tracks[i].cycleLengthIndex = paramArray.length - 1;
				//keep count of how many global (track) controls there are
				this.tracks[i].numberOfGlobalControls += 9;

				//if track is CC _______________________________________________________
				if (mode === "cc") {
						var ccOptions = [];
						for (cc in MIDI._ccNames) {
								ccOptions.push(cc + " - " + MIDI._ccNames[cc]);
						}
						ccOptions.push("Aftertouch");
						ccOptions.push("Pitch Bend");

						//CC Select ........................................................
						paramArray.push({
								name:namePrefix + "CC",
								type:"menu",
								valueStrings:ccOptions,
								defaultValue:1	,
								numberOfSteps:ccOptions.length - 1
						});
						this.updateFunctions.push(trackCCUpdate);

						//Scale High .......................................................
						paramArray.push({
								name:namePrefix + "Scale High",
								type:"linear",
								minValue:0,
								maxValue:127,
								numberOfSteps:127,
								defaultValue:127
						});
						this.updateFunctions.push(trackScaleHighUpdate);
						this.tracks[i].scaleHighIndex = paramArray.length - 1;

						//Scale Low ........................................................
						paramArray.push({
								name:namePrefix + "Scale Low",
								type:"linear",
								minValue:0,
								maxValue:127,
								numberOfSteps:127,
								defaultValue:0
						});
						this.updateFunctions.push(trackScaleLowUpdate);
						this.tracks[i].scaleLowIndex = paramArray.length - 1;
						//keep track of how many global (track) controls there are
						this.tracks[i].numberOfGlobalControls += 3;

						//Track Glide ......................................................
						if (this.tracks[i].glideCurveByStep === false) {
								paramArray.push({
										name:namePrefix + "Track Glide Curve",
										type:"linear",
										minValue:-1,
										maxValue:1,
										numberOfSteps:400,
										defaultValue:0
								});
								this.updateFunctions.push(trackGlideCurveUpdate);
								this.tracks[i].numberOfGlobalControls++;
								this.tracks[i].glideCurveIndexes.push(paramArray.length - 1);
						}
				}
				//if track is note _____________________________________________________
				else {
						//Playback Mode ....................................................
						if (this.tracks[i].pitchByTrack) {
								paramArray.push({
										name:namePrefix + "Pitch",
										type:"menu",
										valueStrings:notes,
										defaultValue:0,
										numberOfSteps:notes.length - 1
								});
								this.updateFunctions.push(trackPitchUpdate);
								this.tracks[i].numberOfGlobalControls++;

								paramArray.push({
										name:namePrefix + "Octave",
										type:"linear",
										minValue:-2,
										maxValue:8,
										numberOfSteps:10,
										defaultValue:3
								});
								this.updateFunctions.push(trackOctaveUpdate);
								this.tracks[i].numberOfGlobalControls++;

						} else {
								paramArray.push({
										name:namePrefix + "Transposition",
										type:"menu",
										valueStrings:["Off", "Follow Keyboard", "Follow Slider"],
										numberOfSteps:1,
										defaultValue:1
								});
								this.updateFunctions.push(trackPlaybackUpdate);
								this.tracks[i].numberOfGlobalControls++;
								
								paramArray.push({
										name:namePrefix + "Semitone Offset From C3",
										type:"linear",
										minValue:-60,
										maxValue:67,
										numberOfSteps:127,
										defaultValue:0,
										disableAutomation:true,
										readOnly:true
								});
								this.updateFunctions.push(trackSemiOffsetUpdate);
								this.tracks[i].numberOfGlobalControls++;
								this.tracks[i].transpositionSliderIndex = paramArray.length - 1;
						}

						//Track Velocity ...................................................
						if (this.tracks[i].velocityByStep === false) {
								paramArray.push({
										name:namePrefix + "Track Velocity",
										type:"linear",
										minValue:1,
										maxValue:127,
										numberOfSteps:126,
										defaultValue:96
								});
								this.updateFunctions.push(trackVelocityUpdate);
								this.tracks[i].velocityIndexes.push(paramArray.length - 1);
								this.tracks[i].numberOfGlobalControls++;
						}

						//Step Retriggers On/Off ...........................................
						if (this.tracks[i].usesRetrigger) {
								paramArray.push({
										name:namePrefix + "Step Retriggers",
										type:"menu",
										valueStrings:["Bypassed","Enabled"],
										defaultValue:1,
										numberOfSteps:1
								});
								this.updateFunctions.push(trackRetriggerBypassUpdate);
								this.tracks[i].numberOfGlobalControls++;
						}

						//Track Step Length ................................................
						if(this.tracks[i].gateLengthByStep === false) {
								paramArray.push({
										name:namePrefix + "Gate Length",
										type:"linear",
										minValue:1,
										maxValue:100,
										numberOfSteps:99,
										defaultValue:100,
										unit:"%"
								});
								this.updateFunctions.push(trackGateLengthUpdate);
								this.tracks[i].numberOfGlobalControls++;
								this.tracks[i].gateLengthIndexes.push(paramArray.length - 1);
						}
				}

				//Create Step Controls__________________________________________________
				for (var j = 0; j < this.tracks[i].steps.length; j++) {
						var stepNumber = j + 1;
						var stepPrefix = "S" + stepNumber + " : "

						//NOTE -------------------------------------------------------------
						if (mode === "note") {
								//pitch ........................................................
								if (!this.tracks[i].pitchByTrack) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Pitch",
												type:"menu",
												valueStrings:notes,
												defaultValue:0,
												numberOfSteps:notes.length-1
										});
										this.updateFunctions.push(pitchUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].pitchIndexes.push(paramArray.length - 1);

										paramArray.push({
												name:namePrefix + stepPrefix + "Octave",
												type:"linear",
												minValue:-2,
												maxValue:8,
												numberOfSteps:10,
												defaultValue:3
										});
										this.updateFunctions.push(octaveUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].octaveIndexes.push(paramArray.length - 1);
								}

								//articulation ID ..............................................
								if (this.tracks[i].usesArticulationID) {
										var minArt = this.tracks[i].minArticulation;
										var maxArt = this.tracks[i].maxArticulation;
										paramArray.push({
												name:namePrefix + stepPrefix + "Articulation ID",
												type:"linear",
												minValue:minArt,
												maxValue:maxArt,
												numberOfSteps:maxArt - minArt,
												defaultValue:minArt,
										});
										this.updateFunctions.push(articulationUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].articulationIndexes.push(
																											paramArray.length - 1);
								}

								//step length by step ..........................................
								if (this.tracks[i].gateLengthByStep) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Gate Length",
												type:"linear",
												minValue:1,
												maxValue:100,
												numberOfSteps:99,
												defaultValue:100,
												unit:"%"
										});
										this.updateFunctions.push(lengthUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].gateLengthIndexes.push(paramArray.length-1);
								}

								//probability ..................................................
								if (this.tracks[i].usesProbability) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Probability",
												type:"linear",
												minValue:0,
												maxValue:100,
												numberOfSteps:100,
												unit:"%",
												defaultValue:100
										});
										this.updateFunctions.push(probabilityUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].probabilityIndexes.push(
																											paramArray.length - 1);
								}

								//velocity by step .............................................
								if(this.tracks[i].velocityByStep) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Velocity",
												type:"linear",
												minValue:1,
												maxValue:127,
												numberOfSteps:126,
												defaultValue:96
										});

										this.updateFunctions.push(velocityUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].velocityIndexes.push(paramArray.length - 1);
								}

								//retrigger and retrigger end velocity .........................
								if (this.tracks[i].usesRetrigger) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Retrigger",
												type:"linear",
												minValue:1,
												maxValue:4,
												numberOfSteps:3,
												defaultValue:1
										});
										this.tracks[i].retriggerIndexes.push(paramArray.length - 1);

										paramArray.push({
												name:namePrefix+stepPrefix + "Retrigger Transposition",
												type:"linear",
												minValue:-12,
												maxValue:12,
												numberOfSteps:24,
												defaultValue:0,
												unit:"semi",
										});
										this.tracks[i].retrigTransIndexes.push(paramArray.length-1);

										paramArray.push({
												name:namePrefix + stepPrefix + "Retrigger End Velocity",
												type:"linear",
												minValue:1,
												maxValue:127,
												numberOfSteps:126,
												defaultValue:96
										});
										this.tracks[i].retriggerVelocityIndexes.push(
																											paramArray.length - 1);

										this.updateFunctions.push(retriggerUpdate);
										this.updateFunctions.push(retriggerTransUpdate);
										this.updateFunctions.push(retriggerEndVelocityUpdate);
										this.tracks[i].numberOfStepControls += 3;
								}

							  paramArray.push({
							  			name:namePrefix + stepPrefix + "Gate",
							  			type:"checkbox",
							  			defaultValue:1
							  });
							  this.updateFunctions.push(gateUpdate);
							  this.tracks[i].numberOfStepControls++;
							  this.tracks[i].gateIndexes.push(paramArray.length - 1);

						} 
						//CC ---------------------------------------------------------------
						else {
								//CC value .....................................................
								paramArray.push({
										name:namePrefix + stepPrefix + "Value",
										type:"linear",
										minValue:0,
										maxValue:127,
										numberOfSteps:127,
										defaultValue:0
								});
								this.updateFunctions.push(valueUpdate);
								this.tracks[i].numberOfStepControls += 1;
								this.tracks[i].valueIndexes.push(paramArray.length - 1);

								//glide per step ...............................................
								if (this.tracks[i].usesEndGlide) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Glide To",
												type:"linear",
												minValue:0,
												maxValue:127,
												numberOfSteps:127,
												defaultValue:0
										});
										this.updateFunctions.push(endGlideUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].glideToIndexes.push(paramArray.length - 1);
								}

								//glide curve by step ..........................................
								if (this.tracks[i].glideCurveByStep) {
										paramArray.push({
												name:namePrefix + stepPrefix + "Glide Curve",
												type:"linear",
												minValue:-1,
												maxValue:1,
												numberOfSteps:400,
												defaultValue:0
										});
										this.updateFunctions.push(glideCurveUpdate);
										this.tracks[i].numberOfStepControls++;
										this.tracks[i].glideCurveIndexes.push(paramArray.length-1);
								}

								//glide ........................................................
								paramArray.push({
										name:namePrefix + stepPrefix + "Glide",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(glideUpdate);
								this.tracks[i].numberOfStepControls += 1;
								this.tracks[i].glideIndexes.push(paramArray.length - 1);
						}
				}
				//keep track of number of controls
				this.tracks[i].numberOfControls = this.tracks[i].numberOfGlobalControls
																				+ this.tracks[i].numberOfStepControls;

				//if optional mode to view step position by LED ------------------------
				if (this.tracks[i].usesLED) {
						//create an LED for each step
						for (var j = 0; j < this.tracks[i].steps.length; j++) {
								var stepName = "";
								stepName += "S" + (j + 1) + " LED";

								paramArray.push({
										name:namePrefix + stepName,
										type:"checkbox",
										defaultValue:0,
										disableAutomation:true,
								});

								this.tracks[i].numberOfControls++;
								//push an empty function, so that there is always a 1:1 relation
								//between UI params, and the function array
								this.updateFunctions.push(emptyLED);
						}
				}

				//create controls for randomizing --------------------------------------
				if (this.tracks[i].enableRandom) {
						//global options ...................................................
						paramArray.push({
								name:namePrefix + "Randomize Rate",
								type:"checkbox",
								defaultValue:0,
						});
						this.updateFunctions.push(trackRandomRate);

						paramArray.push({
								name:namePrefix + "Randomize Direction",
								type:"checkbox",
								defaultValue:0,
						});
						this.updateFunctions.push(trackRandomDirection);

						paramArray.push({
								name:namePrefix + "Randomize Start Step",
								type:"checkbox",
								defaultValue:0,
						});
						this.updateFunctions.push(trackRandomStartStep);

						paramArray.push({
								name:namePrefix + "Randomize Cycle Length",
								type:"checkbox",
								defaultValue:0,
						});
						this.updateFunctions.push(trackRandomCycleLength);

						paramArray.push({
								name:namePrefix + "Randomize Swing",
								type:"checkbox",
								defaultValue:0,
						});
						this.updateFunctions.push(trackRandomSwing);

						this.tracks[i].numberOfControls += 7;
						this.tracks[i].numberOfRandomControls += 7;

						//mode specific parameters -----------------------------------------
						//CC ...............................................................
						if (mode === "cc") {
								paramArray.push({
										name:namePrefix + "Randomize Scaling Values",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(trackRandomScaling);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;

								paramArray.push({
										name:namePrefix + "Randomize CC Values",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(stepRandomValues);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;

								if (this.tracks[i].usesEndGlide) {
										paramArray.push({
												name:namePrefix + "Randomize Glide To",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomGlideTo);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;
								}
								
								paramArray.push({
										name:namePrefix + "Randomize Glide Curve",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(stepRandomGlideCurves);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;								
								
								paramArray.push({
										name:namePrefix + "Randomize Glide Enabled",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(stepRandomGlides);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;
						}
						//note .............................................................
						else if (mode === "note") {

								if (! this.tracks[i].pitchByTrack) {
										paramArray.push({
												name:namePrefix + "Randomize Pitch",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomPitch);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;

										paramArray.push({
												name:namePrefix + "Randomize Octave",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomOctave);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;
								}

								if (this.tracks[i].usesArticulationID) {
										paramArray.push({
												name:namePrefix + "Randomize Articulation ID",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomArticulation);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;
								}

								paramArray.push({
										name:namePrefix + "Randomize Gate Length",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(stepRandomGateLength);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;

								if (this.tracks[i].usesProbability) {
										paramArray.push({
												name:namePrefix + "Randomize Probability",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomProbability);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;
								}

								paramArray.push({
										name:namePrefix + "Randomize Velocity",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(stepRandomVelocity);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;

								if (this.tracks[i].usesRetrigger) {
										paramArray.push({
												name:namePrefix + "Randomize Retrigger",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomRetrigger);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;

										paramArray.push({
												name:namePrefix + "Randomize Retrigger Transposition",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomRetrigTrans);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;

										paramArray.push({
												name:namePrefix + "Randomize Retrigger End Velocity",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(stepRandomRetriggerVelocity);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;
								}

								paramArray.push({
										name:namePrefix + "Randomize Gate",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(stepRandomGate);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfRandomControls++;
						}
						
						//for setting amount of randomization ------------------------------
						paramArray.push({
								name:namePrefix + "Randomize Amount",
								type:"linear",
								minValue:1,
								maxValue:100,
								unit:"%",
								defaultValue:100,
								numberOfSteps:99
						});
						this.updateFunctions.push(trackRandomAmount);
						
						//for triggering the randomization
						paramArray.push({
								name:namePrefix + "RANDOMIZE!",
								type:"checkbox",
								defaultValue:0,
						});
						this.updateFunctions.push(trackRandomize);
				}
				//create controls for editing tools ____________________________________
				//These controls allow you to set all steps to the same value.
				if (this.tracks[i].editingTools) {
						//mode specific parameters 
						//CC ---------------------------------------------------------------
						if (mode === "cc") {
								//values .......................................................
								paramArray.push({
										name:namePrefix + "Value (all)",
										type:"linear",
										minValue:0,
										maxValue:127,
										numberOfSteps:127,
										defaultValue:0
								});
								this.updateFunctions.push(editValue);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfEditingControls++;

								paramArray.push({
										name:namePrefix + "Set All : Value",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(setValue);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfEditingControls++;

								//glide to .....................................................
								if (this.tracks[i].usesEndGlide) {
										paramArray.push({
												name:namePrefix + "Glide To (all)",
												type:"linear",
												minValue:0,
												maxValue:127,
												numberOfSteps:127,
												defaultValue:0
										});
										this.updateFunctions.push(editGlideTo);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
										
										paramArray.push({
												name:namePrefix + "Set All : Glide To",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setGlideTo);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfRandomControls++;
								}

								//glide curve ..................................................
								if (this.tracks[i].glideCurveByStep) {
										paramArray.push({
												name:namePrefix + "Glide Curve (all)",
												type:"linear",
												minValue:-1,
												maxValue:1,
												numberOfSteps:400,
												defaultValue:0
										});								
										this.updateFunctions.push(editGlideCurve);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								
										paramArray.push({
												name:namePrefix + "Set All : Glide Curve",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setGlideCurve);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								}

								//glide on/off .................................................
								paramArray.push({
										name:namePrefix + "Glide (all)",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(editGlide);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfEditingControls++;

								paramArray.push({
										name:namePrefix + "Set All : Glide",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(setGlide);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfEditingControls++;
						}
						//note -------------------------------------------------------------
						else if (mode === "note") {
								//pitch by step ................................................
								if (!this.tracks[i].pitchByTrack) {
										paramArray.push({
												name:namePrefix + "Pitch (all)",
												type:"menu",
												valueStrings:notes,
												defaultValue:0,
												numberOfSteps:notes.length-1
										});
										this.updateFunctions.push(editPitch);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
										
										paramArray.push({
												name:namePrefix + "Set All : Pitch",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setPitch);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;

										paramArray.push({
												name:namePrefix + "Octave (all)",
												type:"linear",
												minValue:-2,
												maxValue:8,
												numberOfSteps:10,
												defaultValue:3,
										});
										this.updateFunctions.push(editOctave);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;

										paramArray.push({
												name:namePrefix + "Set All : Octave",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setOctave);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								}

								//articulation id ..............................................
								if (this.tracks[i].usesArticulationID) {
										var minArt = this.tracks[i].minArticulation;
										var maxArt = this.tracks[i].maxArticulation;

										paramArray.push({
												name:namePrefix + "Articulation ID (all)",
												type:"linear",
												minValue:minArt,
												maxValue:maxArt,
												numberOfSteps:maxArt - minArt,
												defaultValue:minArt,
										});
										this.updateFunctions.push(editArtID);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;

										paramArray.push({
												name:namePrefix + "Set All : Articulation ID",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setArtID);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								}

								//gate length by step ..........................................
								if (this.tracks[i].gateLengthByStep) {
										paramArray.push({
												name:namePrefix + "Gate Length (all)",
												type:"linear",
												minValue:1,
												maxValue:100,
												numberOfSteps:99,
												defaultValue:100,
												unit:"%"
										});
										this.updateFunctions.push(editGateLength);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
										
										paramArray.push({
												name:namePrefix + "Set All : Gate Length",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setGateLength);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								}

								//probability ..................................................
								if (this.tracks[i].usesProbability) {
										paramArray.push({
												name:namePrefix + "Probability (all)",
												type:"linear",
												minValue:0,
												maxValue:100,
												numberOfSteps:100,
												unit:"%",
												defaultValue:100
										});
										this.updateFunctions.push(editProbability);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;

										paramArray.push({
												name:namePrefix + "Set All : Probability",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setProbability);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								}						

								//velocity by step .............................................
								if (this.tracks[i].velocityByStep) {
										paramArray.push({
												name:namePrefix + "Velocity (all)",
												type:"linear",
												minValue:1,
												maxValue:127,
												numberOfSteps:126,
												defaultValue:96
										});			
										this.updateFunctions.push(editVelocity);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;					
								
										paramArray.push({
												name:namePrefix + "Set All : Velocity",
												type:"checkbox",
												defaultValue:0,
										});		
										this.updateFunctions.push(setVelocity);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;								
								}
								
								//retrigger ....................................................
								if (this.tracks[i].usesRetrigger) {
										paramArray.push({
												name:namePrefix + "Retrigger (all)",
												type:"linear",
												minValue:1,
												maxValue:4,
												numberOfSteps:3,
												defaultValue:1
										});										
										this.updateFunctions.push(editRetrigger);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;		

										paramArray.push({
												name:namePrefix + "Set All : Retrigger",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setRetrigger);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;		

										paramArray.push({
												name:namePrefix + "Retrigger Transposition (all)",
												type:"linear",
												minValue:-12,
												maxValue:12,
												numberOfSteps:24,
												defaultValue:0,
												unit:"semi",
										});
										this.updateFunctions.push(editRetrigTrans);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;		
										
										paramArray.push({
												name:namePrefix + "Set All : Retrigger Transposition",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setRetrigTrans);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;		

										paramArray.push({
												name:namePrefix + "Retrigger End Velocity (all)",
												type:"linear",
												minValue:1,
												maxValue:127,
												numberOfSteps:126,
												defaultValue:96
										});
										this.updateFunctions.push(editRetrigEndVel);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;		
										
										paramArray.push({
												name:namePrefix + "Set All : Retrigger End Velocity",
												type:"checkbox",
												defaultValue:0,
										});
										this.updateFunctions.push(setRetrigEndVel);
										this.tracks[i].numberOfControls++;
										this.tracks[i].numberOfEditingControls++;
								}
								
								//gate on/off ..................................................
								paramArray.push({
							  			name:namePrefix + "Gate (all)",
							  			type:"checkbox",
							  			numberOfSteps:1,
							  			defaultValue:1
							  });
							  
								this.updateFunctions.push(editGate);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfEditingControls++;	
								
								paramArray.push({
										name:namePrefix + "Set All : Gate",
										type:"checkbox",
										defaultValue:0,
								});
								this.updateFunctions.push(setGate);
								this.tracks[i].numberOfControls++;
								this.tracks[i].numberOfEditingControls++;	
						}
				}
		}
}

//---------------------------------- addTrack() --------------------------------
/*
		This function adds a new track to the Sequencer object, with the specified
		max number of steps, and mode. This function includes input error handling.

		This function must be called prior to creating the UI controls for the
		sequencer.

		numSteps = the desired max number of steps. must be >= 1
		mode = the desired mode of the track: 'note' or 'cc'
*/
Sequencer.prototype.addTrack = function (numSteps, mode) {
		var lowerCaseMode = mode.toLowerCase();

		if (numSteps < 1) {
				Trace("Error in addTrack(): " + numSteps + " is not a valid "
				+ "number of steps. Please enter a number of 1 or greater");
		} else if (lowerCaseMode !== "note" && lowerCaseMode !== "cc") {
				Trace("Error in mode(): " + mode + " is not a valid mode. Please input "
				+ "'note' or 'cc'");
		} else {
				//number of steps, mode, ID for this track, reference to sequencer obj
				this.tracks.push(new Track(numSteps, mode, this.tracks.length, this));
		}
}

//------------------------------ maxNumberOfSteps() ----------------------------
/*
		Overloaded function for setting the max number of steps for a track(s). If a
		single track is not specified, all instantiated tracks will have their max
		number of steps updated. This function includes input error detection.

		This function must be called prior to creating the UI controls for the
		sequencer.

		numSteps = the desired max number of steps. must be >= 1
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, numSteps is applied to all tracks.
*/
Sequencer.prototype.maxNumberOfSteps = function (numSteps, track) {
		//error check numSteps
		if (numSteps < 1) {
				Trace("Error in maxNumberOfSteps(): " + numSteps + " is not a valid "
				+ "number of steps. Please enter a number of 1 or greater");
		}
		//if track parameter is supplied (only update the specified track)
		else if (track !== undefined) {
				var trackIndex = track - 1;

				//error check track
				if (trackIndex >= 0 && trackIndex <= this.tracks.length - 1) {
						//add more steps
						if (this.tracks[trackIndex].steps.length < numSteps) {
								while (this.tracks[trackIndex].steps.length < numSteps) {
										this.tracks[trackIndex].steps.push(new Step(0));
								}
						}
						//remove excess steps
						else if (this.tracks[trackIndex].steps.length > numSteps) {
								var numToRemove =
															this.tracks[trackIndex].steps.length - numSteps;
								this.tracks[trackIndex].steps.splice(numSteps, numToRemove);
						}

						//update currentLength to match new max number of steps
						this.tracks[trackIndex].currentLength =
																				this.tracks[trackIndex].steps.length;

				} else {
						Trace("Error in maxNumberOfSteps(): track " + track + " is not a "
						+ "valid track. Please input a number between 1 and "
						+ this.tracks.length);
				}
		}
		//update all tracks
		else {
				for (var i = 0; i < this.tracks.length; i++) {
						//add more steps
						if (this.tracks[i].steps.length < numSteps) {
								while (this.tracks[i].steps.length < numSteps) {
										this.tracks[i].steps.push(new Step(0));
								}
						}
						//remove excess steps
						else if (this.tracks[i].steps.length > numSteps) {
								var numToRemove = this.tracks[i].steps.length - numSteps;
								this.tracks[i].steps.splice(numSteps, numToRemove);
						}

						//update currentLength to match new max number of steps
						this.tracks[i].currentLength = this.tracks[i].steps.length;
				}
		}
}

//------------------------------------ mode() ----------------------------------
/*
		Overloaded function for setting the mode of a sequencer track(s).If a single
		track is not specified, all instantiated tracks will receive the specified
		mode ('note'/'cc'). This function includes input error detection.

		This function must be called prior to creating the UI controls for the
		sequencer.

		mode = the desired sequencer mode: 'note' or 'cc'
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, mode is applied to all tracks.
*/
Sequencer.prototype.mode = function (mode, track) {
		var lowerCaseMode = mode.toLowerCase();

		//error check mode
		if (lowerCaseMode !== "note" && lowerCaseMode !== "cc") {
				Trace("Error in mode(): " + mode + " is not a valid mode. Please input "
				+ "'note' or 'cc'");
		}
		//if track parameter is supplied (only update the specified track)
		else if (track !== undefined) {
				//error check track
				if (track - 1 >= 0 && track - 1 <= this.tracks.length - 1) {
						this.tracks[track - 1].mode = lowerCaseMode;
				} else {
						Trace("Error in mode(): track " + track + " is not a valid track. "
						+ "Please input a number between 1 and " + this.tracks.length);
				}
		}
		//apply to all tracks
		else {
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].mode = lowerCaseMode;
				}
		}
}

//---------------------------- displayTrackError() -----------------------------
/*
		This function displays an error message in the console. It specifies the
		name of the function in which the error occurred, and the track that is
		invalid. The valid track options will be displayed.

		functionName = the name of the function displaying an error
		track = the invalid track parameter
*/
Sequencer.prototype.displayTrackError = function (functionName, track) {
		if (this.tracks.length === 1) {
				Trace("Error in " + functionName + ": track " + track
				+ " is not a valid track. There is only 1 track instantiated.");
		} else {
				Trace("Error in " + functionName + ": track " + track
				+ " is not a valid track. Please input a number between 1 and "
				+ this.tracks.length);
		}
}

//---------------------------- displayStateError() -----------------------------
/*
		This function displays an error message in the console. It specifies the
		name of the function in which the error occurred, and the state that is
		invalid. The valid state options will be displayed.

		functionName = the name of the function displaying an error
		state = the invalid state parameter
*/
Sequencer.prototype.displayStateError = function (functionName, state) {
		Trace("Error in " + functionName + ": the argument: " + state
		+ " must be either true or false");
}

//--------------------------- displayUnknownError() ----------------------------
/*
		This function displays an error message in the console. It specifies the
		name of the function in which the unknown error occurred.

		functionName = the name of the function with the unknown error
*/
Sequencer.prototype.displayUnknownError = function (functionName) {
		Trace("An unknown error has occurred in " + functionName);
}

//-------------------------------- getAction() ---------------------------------
/*
		This function analyzes the state and track values that are passed into the
		optional sequencer state functions and returns an action to perform:
		all = update all tracks
		single = update only the specified track
		stateError = state argument is invalid: display error
		trackError = track argument is invalid: display error

		state = true or false
		track = the number of a specific track

		return = the action to perform
*/
Sequencer.prototype.getAction = function (state, track) {
		var action;

		if (state !== true && state !== false) {
				action = "stateError";
		} else if (track !== undefined) {
				if (track - 1 >= 0 && track - 1 <= this.tracks.length - 1) {
						action = "single";
				} else {
						action = "trackError";
				}
		} else {
				action = "all";
		}

		return action;
}

//--------------------------- setArticulationRange() ---------------------------
/*
		Overloaded function for setting the range of articulation IDs, when
		articulation IDs are enabled. Instead of displaying the full range of 0-255,
		define the range of active IDs (for example, 1-6). This function includes
		input error handling. The maxID must always be greater than the minID

		This function must be called prior to creating the UI controls for the
		sequencer.

		minID = the minimum artID value
		maxID = the maximum artID value
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.setArticulationRange = function (minID, maxID, track) {
		var inRange = function (value) {
				if (value >= 0 && value <= 255) {
						return true;
				} else {
						return false;
				}
		}
		var minRange = 0;
		var maxRange = 255;

		if (arguments.length < 2) {
				Trace("error in setArticulationRange: you must enter a min and max "
				      + "value. Defaulting to a range of 0 - 255.");
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].minArticulation = minRange;
						this.tracks[i].maxArticulation = maxRange;
				}
		} else if (arguments.length === 2 || arguments.length === 3) {
				if (inRange(minID)) {
						minRange = minID;
				} else {
						Trace("error in setArticulationRange: min value must be 0 - 255. "
						+ "Defaulting to 0");
				}

				if (inRange(maxID)){
						if (maxID > minID) {
								maxRange = maxID;
						} else {
								Trace("error in setArticulationRange: max value must be greater"
								+ " than the min value. Defaulting to 255.");
						}
				} else {
						Trace("error in setArticulationRange: max value must be 0 - 255. "
						+ "Defaulting to 255");
				}
		}

		if (arguments.length === 3) {
				if (track-1 >= 0 && track - 1 <= this.tracks.length - 1){
						this.tracks[track-1].minArticulation = minRange;
						this.tracks[track-1].maxArticulation = maxRange;
				} else {
						this.displayTrackError("setArticulationRange()", track);

						for (var i = 0; i < this.tracks.length; i++) {
								this.tracks[i].minArticulation = minRange;
								this.tracks[i].maxArticulation = maxRange;
						}
				}
		} else {
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].minArticulation = minRange;
						this.tracks[i].maxArticulation = maxRange;
				}
		}
}

//-------------------------------- pitchByTrack() ------------------------------
/*
		Overloaded function for setting the optional sequencer state of defining
		the note value to sequence by track, instead of by step.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if pitch should be set by track instead of step: true or false
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.pitchByTrack = function (state, track) {
		var functionName = "pitchByTrack()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].pitchByTrack = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].pitchByTrack = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//-------------------------------- enableRandom() ------------------------------
/*
		Overloaded function for setting the optional sequencer state of displaying
		controls for randomizing the various sequencer values.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if random controls should be displayed: true or false
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.enableRandom = function (state, track) {
		var functionName = "enableRandom()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].enableRandom = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].enableRandom = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//------------------------------ velocityByStep() ------------------------------
/*
		Overloaded function for setting the optional sequencer state of controlling
		note velocities by step, instead of by track. If a single track is not
		specified, all instantiated tracks will receive the specified state
		(true/false). The getAction() function does input error detection, and
		determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if note velocities should be controlled per step: true or false
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.velocityByStep = function (state, track) {
		var functionName = "velocityByStep()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].velocityByStep = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].velocityByStep = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//----------------------------- glideCurveByStep() -----------------------------
/*
		Overloaded function for setting the optional sequencer state of controlling
		CC glide curves by step, instead of by track. If a single track is not
		specified, all instantiated tracks will receive the specified state
		(true/false). The getAction() function does input error detection, and
		determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if CC glide curves should be controlled per step: true or false
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.glideCurveByStep = function (state, track) {
		var functionName = "glideCurveByStep()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].glideCurveByStep = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].glideCurveByStep = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//------------------------------- usesRetrigger() ------------------------------
/*
		Overloaded function for setting the optional sequencer state of allowing
		for note steps to be retriggered. If a single track is not specified, all
		instantiated tracks will receive the specified state (true/false).
		The getAction() function does input error detection, and determines what
		action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if note steps should have retrigger controls: true or false
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.usesRetrigger = function (state, track) {
		var functionName = "usesRetrigger()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].usesRetrigger = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].usesRetrigger = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//----------------------------- gateLengthByStep() -----------------------------
/*
		Overloaded function for setting the optional sequencer state of controlling
		note step lengths per step, instead of by track. If a single track is not
		specified, all instantiated tracks will receive the specified state
		(true/false). The getAction() function does input error detection, and
		determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if note step lengths should be controlled per step: true or false
		track = optional value: the number of the individual track to modify. If no
						track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.gateLengthByStep = function (state, track) {
		var functionName = "gateLengthByStep()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].gateLengthByStep = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].gateLengthByStep = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//------------------------------ usesProbability() -----------------------------
/*
		Overloaded function for setting the optional sequencer state of controlling
		the probability of a note step being triggered. If a single track is not
		specified, all instantiated tracks will receive the specified state
		(true/false). The getAction() function does input error detection, and
		determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if probability controls for note steps should be used: true or
		        false
		track = optional value: the number of the individual track to modify. If no
					  track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.usesProbability = function (state, track) {
		var functionName = "usesProbability()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].usesProbability = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].usesProbability = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//---------------------------- usesArticulationID() ---------------------------
/*
		Overloaded function for setting the optional sequencer state of controlling
		the articulation ID of a note, per step. If a single track is not
		specified, all instantiated tracks will receive the specified state
		(true/false). The getAction() function does input error detection, and
		determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if articulation ID controls for note steps should be used: true or
		        false
		track = optional value: the number of the individual track to modify. If no
					  track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.usesArticulationID = function (state, track) {
		var functionName = "usesArticulationID()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].usesArticulationID = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].usesArticulationID = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//-------------------------------- usesEndGlide() ------------------------------
/*
		Overloaded function for setting the optional sequencer state of controlling
		the end value of a CC glide, instead of gliding to the value of the next
		step. If a single track is not specified, all instantiated tracks will
		receive the specified state (true/false). The getAction() function does
		input error detection, and determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if an end value control should be used on CC steps: true or
		        false
		track = optional value: the number of the individual track to modify. If no
					  track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.usesEndGlide = function (state, track) {
		var functionName = "usesEndGlide()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].usesEndGlide = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].usesEndGlide = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//----------------------------------- usesLED() --------------------------------
/*
		Overloaded function for setting the optional sequencer state of displaying
		LEDs to visualize the current step of the track sequence. If a single track
		is not specified, all instantiated tracks will receive the specified state
		(true/false). The getAction() function does input error detection, and
		determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if LEDs should be displayed: true or false
		track = optional value: the number of the individual track to modify. If no
					  track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.usesLED = function (state, track) {
		var functionName = "usesLED()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].usesLED = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].usesLED = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//-------------------------------- editingTools() ------------------------------
/*
		Overloaded function for setting the optional sequencer state of displaying
		controls that allow you to set all steps to the same value, at once. This is
		useful to clear out values, if randomizing does not provide useful results.
		If a single track is not specified, all instantiated tracks will receive the
		specified state (true/false). The getAction() function does input error 
		detection, and determines what action should be performed.

		This function must be called prior to creating the UI controls for the
		sequencer.

		state = if editing tools should be displayed: true or false
		track = optional value: the number of the individual track to modify. If no
					  track value is supplied, state is applied to all tracks.
*/
Sequencer.prototype.editingTools = function (state, track) {
		var functionName = "editingTools()";
		var action = this.getAction(state, track);

		switch (action) {
		case "single":
				this.tracks[track - 1].editingTools = state;
				break;
		case "all":
				for (var i = 0; i < this.tracks.length; i++) {
						this.tracks[i].editingTools = state;
				}
				break;
		case "trackError":
				this.displayTrackError(functionName, track);
				break;
		case "stateError":
				this.displayStateError(functionName, state);
				break;
		default:
				this.displayUnknownError(functionName);
				break;
		}
}

//------------------------------------ reset() ---------------------------------
/*
		This function sends NoteOff events for every pitch in the sequence. This
		function is called in the Scripter function: reset()
*/
Sequencer.prototype.reset = function () {
		for (var i = 0; i < this.tracks.length; i++) {
				this.tracks[i].activeNotes = [];
				this.tracks[i].isPlaying = false;
				MIDI.allNotesOff();		
		}
}

//------------------------------ getDivisionLengths() --------------------------
/*
		This function returns an array of strings, which are the names of the
		divisions to be used in the "Rate" menu.
*/
Sequencer.prototype.getDivisionLengths = function () {
		return [ "1/4",
						"1/8",
						"1/12",
						"1/16",
						"1/24",
						"1/32"];
}

//----------------------------------- pushMIDI() -------------------------------
/*
		This function receives MIDI events from the Scripter function HandleMIDI()
		and passes the events to the various sequencer tracks.

		The function also decides what types of MIDI events will be passed through
		to the software instrument:
			- if any track is in 'note' mode, incoming note events will not be passed
				through
			- if any track is in 'note' mode, incoming sustain pedal events will not
				be passed through
			- if all tracks are in 'CC' mode, all event types will be passed through
*/
Sequencer.prototype.pushMIDI = function (event) {
		var usesNoteMode = false;

		for (var i = 0; i < this.tracks.length; i++) {
				//push events to tracks for individual handling
				this.tracks[i].pushMIDI(event, this.hostInfo);

				if (this.tracks[i].mode === "note") {
						usesNoteMode = true;
				}
		}

		//if any track uses Note mode
		if (usesNoteMode) {
				//only send non-note and non-sustain pedal events
				if ( ! (event instanceof Note
			  || (event instanceof ControlChange && event.number === 64))) {
						event.send();
				}
		}
		//if only CC modes are used, send all event types
		else {
				event.send();
		}
}

//-------------------------------- pushTimingInfo() ----------------------------
/*
		This function receives timing info from the Scripter function ProcessMIDI()
		and passes the timing info to each track, to calculate playback.

		To avoid recalculating the same data for each track, if tracks share the
		same division, certain data is calculated before sending the timing info
		to the tracks, such as the division in beats, the division number, the
		length of a division in ms, and the beat that the track was triggered on.
		If these values are shared across tracks, the values are stored in arrays,
		instead of recalculating the data for each track.
*/
Sequencer.prototype.pushTimingInfo = function (info) {
		//if the transport goes from playing to stopped
		if ((!info.playing) && this.wasPlaying) {

				this.wasPlaying = false;
				this.reset(); //send NoteOff events for all active notes

		} else if (info.playing) {
				this.wasPlaying = true;
		}

		this.hostInfo = info; //update this.hostInfo with current info

		var beatToSchedule;

		//arrays to store values that have already been calculated for the
		//same variable, across tracks
		var divisionBeats = [];
		var divLengths = [];

		for (var i = 0; i < this.tracks.length; i++) {
				if (this.tracks[i].isPlaying) {
						var currentDiv = this.tracks[i].division;

						//if any value has not been calculated for a previous
						//track division, calculate the values
						if ( ! (divisionBeats[currentDiv]
						&& divLengths[currentDiv])) {
								//calculate all values
								var beat =
									  Math.ceil(info.blockStartBeat * currentDiv)
									  		/ currentDiv;

								var quarterNote = 60000 / info.tempo;
								var divisionLength = quarterNote / currentDiv;

								//store values to be used by other tracks
								divLengths[currentDiv] = divisionLength;
								divisionBeats[currentDiv] = beat;
						}

						//send values to the track, to calculate playback
						this.tracks[i].pushTimingInfo(info,
																				divisionBeats[currentDiv],
																				currentDiv,
																				divLengths[currentDiv]);
				}//if
		}//for
}

//******************************************************************************
//                                                                             *
//                              Scripter Functions                             *
//                                                                             *
//******************************************************************************

//-------------------------------- HandleMIDI() --------------------------------
/*
		called for each incoming MIDI event

		event = the incoming MIDI event
*/
function HandleMIDI (event) {

		/* Handle all MIDI events in the sequencer.

		If any track is in 'note' mode, Note events and Sustain Pedal events will
		not be passed through, but all others events will. If all tracks are in 'cc'
		mode, the Note and Sustain Pedal events will be passed through.

		This function must be called for the sequencer to work! */
		SEQ.pushMIDI(event);
}

//_______________________________ ProcessMIDI() ________________________________
/*
		called every process block
*/
function ProcessMIDI() {

		//Push the current timing info for this process block to the sequencer.
		//This function must be called for the sequencer to work!
	 	SEQ.pushTimingInfo(GetTimingInfo());

}

//_____________________________ ParameterChanged() _____________________________
/*
		called when a UI control is changed

		param : index of the incoming parameter
		value : current value of the incoming parameter
*/
function ParameterChanged (param, value) {

		//Push the parameter info to the sequencer, which will update the
		//appropriate values

		//This function must be called for the sequencer to work!
		SEQ.pushParameterChanged(param, value);
}

//__________________________________ Reset() ___________________________________
/*
		called when transport state goes from stopped to playing, or when Scripter
		bypass state changes.
*/
function Reset() {

		//Reset the sequencer
		//This function must be called for the sequencer to work!
		SEQ.reset();
}

//******************************************************************************
//                                                                             *
//                               Global Variables                              *
//                                                                             *
//******************************************************************************

//Global Scripter variables
var NeedsTimingInfo = true;               //needed for GetTimingInfo()

var ResetParameterDefaults = true;				//flag that tells Scripter whether
																				//or not to reset UI controls to
																				//their default values when
																				//re-running the script

//create a Sequencer object
/*
		This constructor sets the number of tracks the sequencer holds, and
		initializes them all to have the same mode and and max number of steps.
		To change modes for individual tracks, use the mode() function, explained
		next.
*/
var SEQ = new Sequencer(1,         //number of tracks
											 16,       //max number of steps
											 "note"); 	//'note' or 'cc' mode

//adding more tracks -----------------------------------------------------------
//example code, is commented out. Uncommenting this code will result in 2 more
//tracks being added to the sequencer: A Note sequencer with 16 steps, and a 
//CC sequencer with 4 steps.

//SEQ.addTrack(16, "note");     //adds a track with the specified max number of
															//steps using the specified mode
//SEQ.addTrack(4, "cc");



//_________________________optional configurations______________________________
/*
		The following functions are overloaded.If you only provide a single argument
		ALL tracks in the sequencer will be updated. If you supply an additional
		argument, which is a track number, then only that track will be configured
		in the specified state. example:

				SEQ.velocityByStep(true); = ALL tracks will have velocity controls
																			 per step

		If an additional value, which is the track number, is supplied, only that
		track will be configured in the specified state. example:

				SEQ.velocityByStep(true, 2); = ONLY track 2 will have velocity
																					controls per step. All other tracks
																					will use a track level slider.

		Uses these functions to customize the behavior of each sequencer track.

		Note: if you call a note function on a cc track, and vice versa, there are
		      no ill effects. They will simply not affect the track. Additionally,
		      false values are the default state. You do not need to set any option
		      to false, unless you have previous set the option to true.

*/


//sequencer mode selection ----------------------------------------------------

//example code is commented out

//SEQ.mode("cc");   						//sets ALL tracks to CC mode
//SEQ.mode("note", 2);  				//sets only track 2 to note mode

//SEQ.maxNumberOfSteps(4);			//sets the max number of steps for all tracks
//SEQ.maxNumberOfSteps(4,2);		//sets the max number of steps for the specified
														  //track


//'note' mode configurations 	--------------------------------------------------
SEQ.velocityByStep(true);			  //if true, each step has a velocity slider
															//if false, there is a track-level slider
															//that controls the velocity of all track
															//steps.

SEQ.usesRetrigger(true);        //if true, each step has a retrigger slider
															//that retriggers the note n number of times
															//in that beat. A track level control is
															//also added to dynamically bypass all
															//retrigger values.
															//if false, no retrigger controls will be
															//available.

SEQ.gateLengthByStep(true);     //if true, each step has a gate length
															//slider. if false, there is a track-level
															//slider that controls the gate length
															//of all track steps

SEQ.usesProbability(true);      //if true, each step has a probability
															//slider that sets the chance of the step
															//being triggered. if false, no probability
															//controls will be available.

SEQ.usesArticulationID(false);  //if true, each step has an articulationID
															//slider that sets the articulationID of
															//the step. if false, no articulationID
															//controls will be available.

SEQ.pitchByTrack(false);        //if true, pitch will be set by track. if false
															//pitch will be set by step. this mode is good
															//for sequencing a single drum voice per track.


SEQ.editingTools(true);       //if true, controls will be added for setting all
														  //steps controls to the same value. This is
															//helps speed up the process of setting all
															//steps the the same value. If false, no controls
															//are displayed.

//example code is commented out. uncomment this code if you want to set a range
//or articulation IDs to use

//SEQ.setArticulationRange(1,3, 1); //sets the min and max range for a tracks
																	//articulation ID (if enabled).
																	//min, max, optional track#

//'cc' mode configurations -----------------------------------------------------
SEQ.glideCurveByStep(true);   //if true, each step will have a control
														//to set the curve of it's glide. if false,
														//there is a track-level slider that controls
														//the glide curve of all track steps.

SEQ.usesEndGlide(true);				//if true, each step will have a control that
													 	//is the ending value of the glide. if false,
														//the step will glide into the value of the
														//next step.



//LED mode ---------------------------------------------------------------------
SEQ.usesLED(true);          //if true, LEDs will be added to the UI that
													//update to indicate the currently active step
													//in the sequence. if false, no LEDs will be
													//displayed.

SEQ.enableRandom(true);			//if true. controls for randomizing track values
													//will be displayed. if false, not randomization
													//controls will be displayed.

//******************************************************************************
//                                                                             *
//                                 GUI Creation                                *
//                                                                             *
//******************************************************************************


var PluginParameters = [];  //the empty array of UI controls

//pass the empty PluginParameters array to the sequencer, which will dynamically
//create the UI for the sequencer, based on the optional configurations that
//were set above. Note: all optional configurations must be set before calling
//the createUI() function
SEQ.createUI(PluginParameters);