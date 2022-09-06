const INTERVALS_LIB = {
INTERVAL_KEY_PER_UNI : 0,
INTERVAL_KEY_MIN_2ND : 1,
INTERVAL_KEY_MAJ_2ND : 2,
INTERVAL_KEY_MIN_3RD : 3,
INTERVAL_KEY_MAJ_3RD : 4,
INTERVAL_KEY_PER_4TH : 5,
INTERVAL_KEY_AU4_DI5 : 6,
INTERVAL_KEY_PER_5TH : 7,
INTERVAL_KEY_MIN_6TH : 8,
INTERVAL_KEY_MAJ_6TH : 9,
INTERVAL_KEY_MIN_7TH : 10,
INTERVAL_KEY_MAJ_7TH : 11,
INTERVAL_KEY_PER_8TH : 12
};

const CHORD_TEMPLATES_LIB = {
    "None" : [],
    "Major: 1 3 5" : [ INTERVALS_LIB.INTERVAL_KEY_PER_UNI, INTERVALS_LIB.INTERVAL_KEY_MAJ_3RD, INTERVALS_LIB.INTERVAL_KEY_PER_5TH ],
    "Minor: 1 b3 5" : [ INTERVALS_LIB.INTERVAL_KEY_PER_UNI, INTERVALS_LIB.INTERVAL_KEY_MIN_3RD, INTERVALS_LIB.INTERVAL_KEY_PER_5TH ],
    "Augmented: 1 3 #5" : [ INTERVALS_LIB.INTERVAL_KEY_PER_UNI, INTERVALS_LIB.INTERVAL_KEY_MAJ_3RD, INTERVALS_LIB.INTERVAL_KEY_MIN_6TH ],
    "Diminished: 1 b3 b5" : [ INTERVALS_LIB.INTERVAL_KEY_PER_UNI, INTERVALS_LIB.INTERVAL_KEY_MIN_3RD, INTERVALS_LIB.INTERVAL_KEY_AU4_DI5 ]
};

const CHORD_PULLDOWN_LABELS = Object.keys( CHORD_TEMPLATES_LIB );

function calculate_chord_pitches ( root , chord_type ) {
	 if ( chord_type == 0 ) {
		return;
	 }
	
    var voices = {};
    const template = CHORD_TEMPLATES_LIB[ CHORD_PULLDOWN_LABELS[ chord_type ] ];
    // calculate the chord pitches
    template.forEach( function ( interval ) {
        var pitch = root + interval;
        if ( pitch >= 12 ) {
        pitch -= 12;
        }
        if ( half_steps == 0 ) {
        voices[ pitch ] = { "type" : "root" };
        } else {
        voices[ pitch ] = { "type" : "harmonic" };
        }
    });
    
    var cache = {};
    for (let pitch = 0; pitch < 12; pitch++) {
        const pitch_record = voices[pitch];
        if ( pitch_record ) {
            cache[ pitch ] = pitch_record;
        } else {
            cache[ pitch ] = { "type" : "non-harmonic" };
        }
    }
    
    // do something with cache
}
