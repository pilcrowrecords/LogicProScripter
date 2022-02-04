// Simple probability gate

function probabilityGate( threshold ) {
	var r = Math.ceil( Math.random() * 100 );
	if ( r <= threshold ) {
		return true;
	}
	return false;
}

// Generate a random number within a specific range

var r = rInt(1, 100);
function rInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Select a random value from an array

var array = [60, 62, 64, 65, 67, 69, 71];
var rIndex = rInt(0, array.length - 1];

// Select multiple unique values from an array

var array = [60, 62, 64, 65, 67, 69, 71];
var values = getRandomUniqueValuesFromArray( array, 3 );

function getRandomUniqueValuesFromArray( array, numValues = 1 ) {
	// copy the array so we don't destroy the original
	var src = array;
	var cache = [];
	for ( n = 0 ; n < numValues ; n++ ) {
		var r = rInt( 0 , src.length - 1 );
		var value = src.splice( r , 1 );
		cache.push( value[0] );
	}
	return cache;
}
