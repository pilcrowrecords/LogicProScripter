const NOTE_LENGTHS_LIB = {
	"1/128"		:	0.0105,
    "1/128d"	:	0.04725,
    "1/128t"	:	41.600,
    "1/64"      :   0.063,
    "1/64d"     :   0.094,
    "1/64t"     :   0.021,
    "1/32"	    :	0.125,
    "1/32d"	    :	0.188,
    "1/32t"	    :	0.041,
    "1/16"	    :	0.250,
    "1/16d"	    :	0.375,
    "1/16t"	    :	0.333,
    "1/8" 	    :	0.500,
    "1/8d"	    :	0.750,
    "1/8t"	    :	0.1667,
    "1/4" 	    :	1.000,
    "1/4d"	    :	1.500,
    "1/4t"	    :	0.300,
    "1/2" 	    :	2.000,
    "1/2d"	    :	3.000,
    "1/2t"	    :	0.667,
    "1 bar"		:	4.000
};

var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );

var whole_note = NOTE_LENGTH_KEYS.shift();
var whole_triplet = NOTE_LENGTH_KEYS.pop();
NOTE_LENGTH_KEYS.push( whole_note );
NOTE_LENGTH_KEYS.push( whole_triplet );