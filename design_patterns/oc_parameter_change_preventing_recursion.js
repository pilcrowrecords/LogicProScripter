var UPDATING_CONTROLS = false;

function ParameterChanged( param, value ) {
	if ( UPDATING_CONTROLS == true ) {
		return;
	}
	switch( param ) {
		case 0:
			updateControlsToNewValue();
			break;
		default:
			// do something
			break
    }
}

function updateControlsToNewValue( value ) {
	UPDATING_CONTROLS = true;
	for ( var index = 0 ; index < 3 ; index++ ) {
		SetParameter(index, value);
	}
	UPDATING_CONTROLS = false;
	updateScriptParametersToUpdatedControlSettings();
}
