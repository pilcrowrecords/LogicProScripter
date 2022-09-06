var WEIGHT_POOL = {
	"75":"0",
	"100":"2",
	"125":"4",
	"150":"5",
	"175":"7",
	"200":"9",
	"225":"11",
	"total":225
}

var result = getRandomValueFromWeightPool( WEIGHT_POOL );

function getRandomValueFromWeightPool( weightPool ) {

	var total = weightPool["total"];

	var r = rInt( 1, total );
	var weights = Object.keys(weightPool);

	if ( weights.length == 2 ) {
		return weightPool[weights[0]];
	}

	weights.pop();
	var last_weight = total;
	for ( let index = weights.length - 1 ; index > -1 ; index-- ) {
		const weight = parseInt(weights[index]);
		if ( r > weight ) {
			return weightPool[last_weight];
		}
	last_weight = weight;
	}

	return weightPool[weights[0]];

}

function rInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
