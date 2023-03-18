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
const MIN_PITCH = 1;
const STEP = 1;
const SKIP = 2;
const LEAP = 3;

var sequence = [];

// determine the "posts"
// determine highest and lowest notes

var max = rInt(4, 8);
var min = 0;
if ( rInt( 0, 1 ) ) {
    min = rInt(0, 7);
    min = 0 - min;
} else {
    min = rInt(1, 4);
}

// select root note
var start_note = START_OPTIONS[rInt(0, 2)];
sequence.push(start_note);

sequence.push(KEYSTONES.unique);

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

// place the unique pitch somewhere

console.log(sequence);

// between each post, determine the best approach

var connectors = [];
var connector = [];

for (let index = 1; index < sequence.length; index++) {
    connector = [];
    let post_start = sequence[ index - 1 ];
    let post_end = sequence[ index ];
    let cache = post_start;
    let distance = Math.abs ( post_start - post_end );
    if ( distance == 0 ) {
        // the notes are the same, so let's create some motion
        // up or down
        // step, skip, or leap
        let up = rInt(0,1);
        let motion = rInt(STEP,LEAP);
        if ( motion == LEAP ) {
            USAGE_COUNTS.leaps = 1;
        }
        if ( !up ) {
            motion = 0 - motion;
        }
        connector.push(post_start += motion )
    } else {
        if ( distance >= leap && USAGE_COUNTS.leaps == 0 ) {
            if ( distance > leap ) {
                cache += 2;
                connector.push(cache);
            }
            USAGE_COUNTS.leaps = 1;
        }
        while ( cache != post_end ) {
            // fill the gap with skips and leaps
            // check to see if a skip or step will land before post_end
            let cache_post_distance = Math.abs ( post_end - cache );
            if ( cache_post_distance > SKIP ) {
                // select motion
                // calculate direction
            } 
        }
    }
    connectors.push( connector );
}

// splice in the connectors

function rInt( min, max ) {
	if (min == max ) {return min;}
    return Math.floor(min + Math.random()*(max + 1 - min));
}