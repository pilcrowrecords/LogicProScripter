const KEYSTONES = {
    "root" : 1,
    "unique" : 5, 
    "diminished" : 7
};
const CADENCE_OPTIONS = [
    [5, 1],
    [2, 1],
    [0, 1],
];
const START_OPTIONS = [1, 3, 5];
var USAGE_COUNTS = {
   "1" : 0,
   "2" : 0,
   "3" : 0, 
   "4" : 0,
   "5" : 0,
   "6" : 0,
   "7" : 0,
   "skips" : 0,
   "leaps" : 0 // max 1
};
const MAX_PITCH = 8;
const MIN_PITCH = -7;

var sequence = [];

// determine the "posts"
// determine highest and lowest notes

var max = rInt(4, 8);
var min = rInt(4, 7);
min = 0 - min;

// select root note
var start_note = START_OPTIONS[rInt(0, 2)];
sequence.push(start_note);

// determine locations of highest and lowest notes

if ( rInt( 0, 1 ) ) {
    sequence.push(min);
    sequence.push(max);
} else {
    sequence.push(max);
    sequence.push(min);
}

// select cadence

var cadence = CADENCE_OPTIONS[rInt(0, 2)];
cadence.forEach( function ( pitch ) {
   sequence.push( pitch ); 
});

console.log(sequence);

// between each post, determine the best approach

var cursor = 0;
var connectors = [];
var connector = [];

for (let index = 1; index < sequence.length; index++) {
    connector = 0;
    let post_start = sequence[ index - 1 ];
    let post_end = sequence[ index ];
    
}

function rInt( min, max ) {
	if (min == max ) {return min;}
    return Math.floor(min + Math.random()*(max + 1 - min));
}