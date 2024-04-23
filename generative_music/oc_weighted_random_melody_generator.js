    /******************************************************************************
    Name: Weighted Random Melody Generator 
    Author(s): Philip Regan
    Purpose: 
    * Creates random melodies based on weighted selections of pitches, note and 
    rest lengths
    * Contains examples of the following:
        * Modeling scales
        * Modeling chords
        * Capturing notes dueing live play
        * Random selection of weighted values (useful for music generation without 
        using pre-existing notes in the track)
        * Tracking playhead and beats locations across process blocks and loops
        * Handling recursive changes across controls so that settings don't change 
        endlessly

    Instructions for use:
    * The script functionality is divided into several sections:
        * Selection of source pitches
        * Selection of possible note lengths
        * Selection of possible note rests
        * Basic preferences, really for troubleshooting
    * Source pitches can come from three sources:
        * Scale
        * Chord (irrespective of the selected scale)
        * Live play or MIDI events already in the track
        * Weights for the source pitches are between 1-100. Selection of notes
        based on those weights is proportional to their individual selections
    * Note Lengths and Note Rests work the same way, as do the selection of their
    respective weights.

    This script is intended to automated by making scale and chord selection 
    streamlined to two automation lanes, while still offering the ability to 
    fine tune those selections as needed for blues, jazz, or any scale or
    chord variants.

    This script is released under the MIT License.

    Permissions
    * Commercial use
    * Modification
    * Distribution
    * Private use

    Limitations
    x Liability
    x Warranty

    Conditions
    ! License and copyright notice

    Copyright Philip Regan and Pilcrow Records

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    ****************************************************************************/

    /*
    SCRIPTER GLOBAL VARIABLES
    */

    var NeedsTimingInfo = true;
    var PluginParameters = [];

    /* 
    CUSTOM GLOBAL VARIABLES 
    */

    /* GLOBAL PARAMS */

    const PROBABILITY_SLIDER_MIN = 0;
    const PROBABILITY_SLIDER_MAX = 100;
    const PROBABILITY_SLIDER_DEF = PROBABILITY_SLIDER_MIN;
    const PROBABILITY_SLIDER_STEPS = PROBABILITY_SLIDER_MAX;
    const PROBABILITY_MIN = 1;
    const PROBABILITY_MAX = 100; 

    /* pitch params */

    // stores and identifies root and diatonic pitches with their weights
    var PITCH_WEIGHT_MAP = {};
    const PITCH_RECORD_KEY_WEIGHT = "w";
    const PITCH_RECORD_KEY_TYPE = "t";
    // stores the scale as calculated
    var SCALE_MAP = {}
    // the store from which pitches are selected
    var NOTE_PITCH_POOL = [];

    const OCTAVE_CONTROL_NAME = "Octave";

    const TARGET_OCTAVE_LIB = {
        "8"             :   10, 
        "7"             :   9, 
        "6"             :   8, 
        "5"             :   7, 
        "4"             :   6, 
        "3 (Middle C)"  :   5, 
        "2"             :   4, 
        "1"             :   3, 
        "0"             :   2, 
        "-1"            :   1, 
        "-2"            :   0
    };
    const TARGET_OCTAVE_KEYS = ["8", "7", "6", "5", "4", "3 (Middle C)", "2", "1", "0", "-1", "-2"];
    var TARGET_OCTAVE = TARGET_OCTAVE_LIB["3 (Middle C)"];

    /* scales */
    const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

    const SCALE_TEMPLATES = {
        "Chromatic" : [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        "Ionian" : [2, 2, 1, 2, 2, 2, 1],
        "Dorian" : [2, 1, 2, 2, 2, 1, 2],
        "Phrygian" : [1, 2, 2, 2, 1, 2, 2],
        "Lydian" : [2, 2, 2, 1, 2, 2, 1],
        "Mixolydian" : [2, 2, 1, 2, 2, 1, 2],
        "Aeolian" : [2, 1, 2, 2, 1, 2, 2],
        "Locrian" : [1, 2, 2, 1, 2, 2, 2]
    }
    const SCALE_KEYS = Object.keys(SCALE_TEMPLATES);
    const NONDIATONIC_PITCH_VALUE = -1;
    const NOTE_PROB_ROOT = 75;
    const NOTE_PROB_DIATONIC = 25;
    const NOTE_PROB_DEFAULT = 0;
    const NOTE_PROB_NONDIATONIC = 10;
    const NOTE_PROB_CHROMATIC = 50;
    const PITCH_TYPE_ROOT = 'root';
    const PITCH_TYPE_DIATONIC = 'diatonic';
    const PITCH_TYPE_NONDIATONIC = 'non-diatonic';

    /* chords */

    const INTERVAL_KEY_PER_UNI = "1 - Perfect Unison - 0";
    const INTERVAL_KEY_MIN_2ND = "b2 - Minor 2nd - 1";
    const INTERVAL_KEY_MAJ_2ND = "2 - Major 2nd - 2";
    const INTERVAL_KEY_MIN_3RD = "b3 - Minor 3rd - 3";
    const INTERVAL_KEY_MAJ_3RD = "3 - Major 3rd - 4";
    const INTERVAL_KEY_PER_4TH = "4 - Perfect 4th - 5";
    const INTERVAL_KEY_AU4_DI5 = "#4/b5 - Aug 4th / Dim 5th - 6";
    const INTERVAL_KEY_PER_5TH = "5 - Perfect 5th - 7";
    const INTERVAL_KEY_MIN_6TH = "b6 - Minor 6th - 8";
    const INTERVAL_KEY_MAJ_6TH = "6 - Major 6th - 9";
    const INTERVAL_KEY_MIN_7TH = "b7 - Minor 7th - 10";
    const INTERVAL_KEY_MAJ_7TH = "7 - Major 7th - 11";
    const INTERVAL_KEY_PER_8TH = "8 - Perfect 8th / Octave - 12";

    const INTERVALS_LIB = {
        "1 - Perfect Unison - 0" : 0,
        "b2 - Minor 2nd - 1" : 1,
        "2 - Major 2nd - 2" : 2,
        "b3 - Minor 3rd - 3" : 3,
        "3 - Major 3rd - 4" : 4,
        "4 - Perfect 4th - 5" : 5,
        "#4/b5 - Aug 4th / Dim 5th - 6" : 6,
        "5 - Perfect 5th - 7" : 7,
        "b6 - Minor 6th - 8" : 8,
        "6 - Major 6th - 9" : 9,
        "b7 - Minor 7th - 10" : 10,
        "7 - Major 7th - 11" : 11,
        "8 - Perfect 8th / Octave - 12" : 12
    };

    // we keep the scale degrees to make these easier to maintain
    // each element in the TEMPLATE is subtracted by 1 for the actual calc
    const CHORD_TEMPLATES_LIB = {
        "Major: 1 3 5"    :   [   
                                        INTERVALS_LIB[INTERVAL_KEY_PER_UNI], 
                                        INTERVALS_LIB[INTERVAL_KEY_MAJ_3RD], 
                                        INTERVALS_LIB[INTERVAL_KEY_PER_5TH],
                                        null,
                                        null,
                                        null,
                                        null
                                    ],
        "Minor: 1 b3 5"    :   [   
                                        INTERVALS_LIB[INTERVAL_KEY_PER_UNI], 
                                        INTERVALS_LIB[INTERVAL_KEY_MIN_3RD], 
                                        INTERVALS_LIB[INTERVAL_KEY_PER_5TH],
                                        null,
                                        null,
                                        null,
                                        null
                                    ],
        "Augmented: 1 3 #5"      :   [   
                                        INTERVALS_LIB[INTERVAL_KEY_PER_UNI], 
                                        INTERVALS_LIB[INTERVAL_KEY_MAJ_3RD], 
                                        INTERVALS_LIB[INTERVAL_KEY_MIN_6TH],
                                        null,
                                        null,
                                        null,
                                        null
                                    ],
        "Diminished: 1 b3 b5"      :   [   
                                        INTERVALS_LIB[INTERVAL_KEY_PER_UNI], 
                                        INTERVALS_LIB[INTERVAL_KEY_MIN_3RD], 
                                        INTERVALS_LIB[INTERVAL_KEY_AU4_DI5],
                                        null,
                                        null,
                                        null,
                                        null
                                    ]
    };

    const CHORD_PULLDOWN_LABELS = Object.keys( CHORD_TEMPLATES_LIB );

    // chord qualities

    const CHORD_QUAL_7TH_LIB = {
        "None"  :   null, 
        "7"     :   INTERVALS_LIB[INTERVAL_KEY_MIN_7TH], 
        "M7"    :   INTERVALS_LIB[INTERVAL_KEY_MAJ_7TH], 
        "add#7" :   INTERVALS_LIB[INTERVAL_KEY_PER_8TH]
    };
    const CHORD_QUAL_7TH_PULLDOWN_LABELS = Object.keys( CHORD_QUAL_7TH_LIB );
    [
        CHORD_QUAL_7TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_7TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_7TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_7TH_PULLDOWN_LABELS[3]
    ] = [
        CHORD_QUAL_7TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_7TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_7TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_7TH_PULLDOWN_LABELS[3]
    ];

    const CHORD_QUAL_9TH_LIB = {
        "None"  :   null, 
        "b9"    :   INTERVALS_LIB[INTERVAL_KEY_MIN_2ND], 
        "9"     :   INTERVALS_LIB[INTERVAL_KEY_MAJ_2ND], 
        "#9"    :   INTERVALS_LIB[INTERVAL_KEY_MIN_3RD]
    };
    const CHORD_QUAL_9TH_PULLDOWN_LABELS = Object.keys( CHORD_QUAL_9TH_LIB );
    [
        CHORD_QUAL_9TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_9TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_9TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_9TH_PULLDOWN_LABELS[3]
    ] = [
        CHORD_QUAL_9TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_9TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_9TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_9TH_PULLDOWN_LABELS[3]
    ];

    const CHORD_QUAL_11TH_LIB = {
        "None"  :   null, 
        "b11"   :   INTERVALS_LIB[INTERVAL_KEY_MAJ_3RD], 
        "11"    :   INTERVALS_LIB[INTERVAL_KEY_PER_4TH], 
        "#11"   :   INTERVALS_LIB[INTERVAL_KEY_AU4_DI5]
    };
    const CHORD_QUAL_11TH_PULLDOWN_LABELS = Object.keys( CHORD_QUAL_11TH_LIB );
    [
        CHORD_QUAL_11TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_11TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_11TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_11TH_PULLDOWN_LABELS[3]
    ] = [
        CHORD_QUAL_11TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_11TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_11TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_11TH_PULLDOWN_LABELS[3]
    ];

    const CHORD_QUAL_13TH_LIB = {
        "None"  :   null, 
        "b13"   :   INTERVALS_LIB[INTERVAL_KEY_MIN_6TH], 
        "13"    :   INTERVALS_LIB[INTERVAL_KEY_MAJ_6TH], 
        "#13"   :   INTERVALS_LIB[INTERVAL_KEY_MIN_7TH]
    };
    const CHORD_QUAL_13TH_PULLDOWN_LABELS = Object.keys(CHORD_QUAL_13TH_LIB);
    [
        CHORD_QUAL_13TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_13TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_13TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_13TH_PULLDOWN_LABELS[3]
    ] = [
        CHORD_QUAL_13TH_PULLDOWN_LABELS[0],
        CHORD_QUAL_13TH_PULLDOWN_LABELS[1],
        CHORD_QUAL_13TH_PULLDOWN_LABELS[2],
        CHORD_QUAL_13TH_PULLDOWN_LABELS[3]
    ];

    /* length params */
    
    const NOTE_LENGTHS_LIB = {
        "1/64"		:	0.063,
        "1/64d"		:	0.094,
        "1/64t"		:	0.021,
        "1/32"		:	0.125,
        "1/32d"		:	0.188,
        "1/32t"		:	0.042,
        "1/16"		:	0.250,
        "1/16d"		:	0.375,
        "1/16t"		:	0.083,
        "1/8"		:	0.500,
        "1/8d"		:	0.750,
        "1/8t"		:	0.167,
        "1/4"		:	1.000,
        "1/4d"		:	1.500,
        "1/4t"		:	0.333,
        "1/2"		:	2.000,
        "1/2d"		:	3.000,
        "1/2t"		:	0.667,
        "1 bar"		:	4.000,
        "1.5 bars"	:	6.000,
        "2 bars"	:	8.000,
        "4 bars"	:	16.000,
        "8 bars"	:	32.000
    };
    var NOTE_LENGTH_KEYS = Object.keys( NOTE_LENGTHS_LIB );
    // var whole_note = NOTE_LENGTH_KEYS.shift();
    // var whole_triplet = NOTE_LENGTH_KEYS.pop();
    // NOTE_LENGTH_KEYS.push( whole_note );
    // NOTE_LENGTH_KEYS.push( whole_triplet );

    const POOL_SOURCE_OPTIONS = ["Scale" , "Chord" , "Live"];

    // Manage note length selections and pool
    var NOTE_LENGTH_SELECTIONS = [];
    var note_lengths = Object.keys(NOTE_LENGTHS_LIB);
    note_lengths.forEach( function ( l ) {
        NOTE_LENGTH_SELECTIONS.push(NOTE_PROB_CHROMATIC);
    });
    // weighted selection store,  built from values in store
    var NOTE_LENGTH_POOL = [];

    // Manage rest length selections and pool
    var REST_LENGTH_SELECTIONS = [];
    var rest_lengths = Object.keys(NOTE_LENGTHS_LIB);
    rest_lengths.forEach( function ( l ) {
        REST_LENGTH_SELECTIONS.push(NOTE_PROB_CHROMATIC);
    });
    // weighted selection store,  built from values in store
    var REST_LENGTH_POOL = [];

    // index 0 = length count
    // index 1 = rest count
    // to select: total both numbers, select random within total, and see where it lands in the array
    var NOTE_REST_RATIO_POOL = [];
    const EVENT_IS_REST = "r";
    const EVENT_IS_NOTE = "n";

    const POOL_TOTAL_KEY = "total";

    // prevents endless loop of control and map changes
    var UPDATING_CONTROLS = false;
    const PITCH_CONTROL_OFFSET = 11;
    const LENGTH_CONTROL_OFFSET = 24;
    const REST_CONTROL_OFFSET = 48;

    // Used by beatToSchedule and TRIGGER to align musically
    // determines how many notes are in the time siqnature denominator
    // 0.25 = 1/1 note, 1 = 1/4 note, 4 = 1/16, 8 = 1/32
    const TIME_SIG_DENOM_DIVISION = 16; // beatToSchedule results in 1/64 notes

    // the trigger variable is where the next note (or rest) is to be played
    // trigger is global to track it across process blocks
    // the cursor is a simulated location of the transport/playhead in the track
    // cursor is handled locally because only the current process block matters while playing
    const RESET_VALUE = -1.0;
    var TRIGGER = RESET_VALUE;
    const CURSOR_INCREMENT = 0.001; // smallest note length = 0.125

    var OUTPUT_NOTES_TO_CONSOLE = false;
    var VERBOSE = false;

    // currently set up to only track one played note at a time.
    var ACTIVE_RGEN_NOTES = [];

    var ACTIVE_LIVE_NOTES = {};

    /*
    SCRIPTER FUNCTIONS
    */

    function HandleMIDI( event ) {
        if ( GetParameter("Parameters Source") == 2 ) {
            // source from live or preset source notes
            const pitch = event.pitch;
            if ( event instanceof NoteOn ) {
                var notes = ACTIVE_LIVE_NOTES[ pitch ];
                if ( !notes ) {
                    notes = [];
                }
                notes.push( event );
                ACTIVE_LIVE_NOTES[ pitch ] = notes;
                calculate_live_preset_pitches();
            } else if ( event instanceof NoteOff ) {
                var notes = ACTIVE_LIVE_NOTES[ pitch ];
                if ( notes ) {
                    var note = notes.pop();
                    if (note) {
                        // do nothing
                    }
                    ACTIVE_LIVE_NOTES[ pitch ] = notes;
                    calculate_live_preset_pitches();
                }
            } else if ( event instanceof NoteOn == false && event instanceof NoteOff == false ) {
                event.send();
            }
        }
    }

    function ProcessMIDI() {
        var timing_info = GetTimingInfo();

        // when the transport stops, stop any playing notes and track the cursor and trigger so play can begin uninterrupted
        if ( timing_info.playing ){
            // init the values to calculate beats
            var beatToSchedule = align_beat_to_bar_division( timing_info.blockStartBeat, TIME_SIG_DENOM_DIVISION );
            if ( TRIGGER == RESET_VALUE ) {
                TRIGGER = beatToSchedule;
            }

            // loop through the beats that fall within this buffer
            while ( beats_fall_within_buffer( beatToSchedule, timing_info ) ) {
                // adjust for cycle
                beatToSchedule = handle_beat_wraparound( beatToSchedule, timing_info );
                TRIGGER = handle_beat_wraparound( TRIGGER, timing_info );
            
                // the cursor has come to the trigger
                if ( beatToSchedule == TRIGGER && NOTE_PITCH_POOL[POOL_TOTAL_KEY] != 0 ) {
                    // get some basic note information
                    var event_pitch = ( TARGET_OCTAVE * 12 ) + parseInt(getRandomValueFromWeightPool( NOTE_PITCH_POOL ));
                    note_length_index = getRandomValueFromWeightPool( NOTE_LENGTH_POOL );
                    event_length = getLengthByIndexFromEventLengthLib( note_length_index );
 
                    // is this going to be a played note or a rest?
                    var note_rest_result = getRandomValueFromWeightPool( NOTE_REST_RATIO_POOL );

                    // if ( VERBOSE ) {
                    //     Trace("NOTE_REST_RATIO_POOL: " + JSON.stringify( NOTE_REST_RATIO_POOL ));
                    //     Trace("REST_LENGTH_SELECTIONS: " + JSON.stringify(REST_LENGTH_SELECTIONS)); 
                    //     Trace("REST_LENGTH_POOL: " +  JSON.stringify( REST_LENGTH_POOL ));
                    //     Trace("NOTE_LENGTH_SELECTIONS: " + JSON.stringify(NOTE_LENGTH_SELECTIONS)); 
                    //     Trace("NOTE_LENGTH_POOL: " +  JSON.stringify( NOTE_LENGTH_POOL ));
                    // }

                    if ( note_rest_result == EVENT_IS_REST ) { 

                        // if it's a rest, then simply push the trigger out to the next playable beat

                        if ( OUTPUT_NOTES_TO_CONSOLE ) {
                            Trace( "Rest    " + "---" + "    " + event_length );
                        }
                    
                    } else {
                        // if it's a played note, build and send the NoteOn and NoteOff events
                        var note_on = new NoteOn();
                        note_on.pitch = event_pitch;
                        note_on.velocity = 100;

                        note_on.sendAtBeat( beatToSchedule ); 
                        ACTIVE_RGEN_NOTES.push( note_on );

                        var note_off = new NoteOff( note_on );
                        var note_off_beat = beatToSchedule + event_length;
                        
                        note_off_beat = handle_beat_wraparound(note_off_beat, timing_info);

                        if ( VERBOSE ) {
                            if ( note_off_beat != (beatToSchedule + event_length) || note_off_beat < (beatToSchedule + event_length) ) {
                                if ( note_off_beat < (beatToSchedule + event_length) ) {
                                    Trace( "note_off_beat < beatToSchedule\t" + (beatToSchedule + event_length) + "\t" + note_off_beat);
                                } else {
                                    Trace( "note_off_beat != beatToSchedule\t" + (beatToSchedule + event_length) + "\t" + note_off_beat);
                                }
                                Trace(JSON.stringify(timing_info));
                            }
                        }

                        note_off.sendAtBeat( note_off_beat );

                        // if ( VERBOSE ) {
                        //     Trace("NOTE_LENGTH_POOL: " +  JSON.stringify( NOTE_LENGTH_POOL ));
                        // }

                        if ( OUTPUT_NOTES_TO_CONSOLE ) {
                            Trace( "Note\t" + event_pitch + "\t" + event_length + "\t" + beatToSchedule + "\t" + note_off_beat);
                        }

                    }
                    if ( VERBOSE ) {
                        Trace(JSON.stringify({beatToSchedule:beatToSchedule,TRIGGER:TRIGGER,event_length:event_length,note_off_beat:note_off_beat}));
                    }
                    // advance the trigger
                    // if ( VERBOSE ) {
                    //     Trace("TRIGGER: " + TRIGGER);
                    // }
                    TRIGGER += event_length;
                    // if ( VERBOSE ) {
                    //     Trace("TRIGGER: " + TRIGGER);
                    // }
                }
             // advance to next beat
             beatToSchedule += CURSOR_INCREMENT;
             beatToSchedule = align_beat_to_bar_division( beatToSchedule, TIME_SIG_DENOM_DIVISION ); 
            }
        } else {
            ACTIVE_RGEN_NOTES.forEach( function ( note_on ) {
                var note_off = new NoteOff( note_on );
                note_off.send();
            });
            beatToSchedule = align_beat_to_bar_division( timing_info.blockStartBeat, TIME_SIG_DENOM_DIVISION );
            TRIGGER = RESET_VALUE;
        }
        
    }

    // aligns any float value to the beats
    // ceiling used because all recordable beats are >= 1.000
    function align_beat_to_bar_division( value, division ) {
        return Math.ceil( value * division ) / division;
    }

    // when the intended beat falls outside the cycle, wrap it proportionally 
    // from the cycle start
    function handle_beat_wraparound( value, timing_info ) {
        let cache = value;
        if ( timing_info.cycling && value >= timing_info.rightCycleBeat ) {
            cache = cache - ( timing_info.rightCycleBeat - timing_info.leftCycleBeat );
        }
        
        return cache;
    }

    // loop through the beats that fall within this buffer
    // including beats that wrap around the cycle point
    // return false by default
    function beats_fall_within_buffer ( beatToSchedule, timing_info ) {
        let lookAheadEnd = timing_info.blockEndBeat;
        let cycleBeats = timing_info.rightCycleBeat - timing_info.leftCycleBeat;
        let cycleEnd = lookAheadEnd - cycleBeats;
        if ( beatToSchedule >= timing_info.blockStartBeat && beatToSchedule < lookAheadEnd || (timing_info.cycling && beatToSchedule < cycleEnd)) {
            return true;
        }
        return false;
    }   

    function ParameterChanged( param, value ) {
        if ( UPDATING_CONTROLS == true ) {
            return;
        }
        switch( param ) {
            case 0:
                // "Pitch Parameters"
                break;
            case 1:
                // Target Octave
                TARGET_OCTAVE = TARGET_OCTAVE_LIB[TARGET_OCTAVE_KEYS[value]];
                break;
            case 2:
                // scale root pulldown
                if ( GetParameter( "Parameters Source" ) != 2 ) {
                    calculate_scale_pitches( GetParameter("Scale Root") , GetParameter("Scale Type") );
                }
                break;
            case 3:
                // scale type pulldown
                if ( GetParameter( "Parameters Source" ) != 2 ) {
                    if ( value == 0 ) {
                        calculate_scale_pitches_to_chromatic();
                    } else {			
                        calculate_scale_pitches( GetParameter("Scale Root") , GetParameter("Scale Type") );				
                    }
                }
                break;
            case 4:
                // parameters source pulldown
                if ( value == 0 ) {
                    // scale type pulldown
                    if ( GetParameter("Scale Type") == 0 ) {
                        calculate_scale_pitches_to_chromatic();
                    } else {			
                        calculate_scale_pitches( GetParameter("Scale Root") , GetParameter("Scale Type") );				
                    }
                } else if ( value == 1 ) {
                    // chord pulldowns
                    calculate_chord_pitches ( GetParameter("Chord Root") , GetParameter("Chord Type") );
                } else if ( value == 2 ) {
                    // live play
                    calculate_live_preset_pitches();
                }
                break;
            case 5:
                // chord root
            case 6:
                // chord type
            case 7:
                // 7th
            case 8:
                // 9th
            case 9:
                // 11th
            case 10:
                // 13ths
                if ( GetParameter( "Parameters Source" ) == 1 ) {
                    calculate_chord_pitches ( GetParameter("Chord Root") , GetParameter("Chord Type") );
                }
                break;
            case 11:	// "C"
            case 12:	// "C♯/D♭"
            case 13:	// "D"
            case 14:	// "D♯/E♭"
            case 15:	// "E"
            case 16:	// "F"
            case 17:	// "F♯/G♭"
            case 18:	// "G"
            case 19:	// "G♯/A♭"
            case 20:	// "A"
            case 21:	// "A♯/B♭"
            case 22:	// "B"
                updatePitchWeight( param , value );
                break;
            case 23:
                // note lengths label; do nothing
            case 24:	// "1/64"		:	0.063
            case 25:	// "1/64d"		:	0.094
            case 26:	// "1/64t"		:	0.021
            case 27:	// "1/32"		:	0.125
            case 28:	// "1/32d"		:	0.188
            case 29:	// "1/32t"		:	0.042
            case 30:	// "1/16"		:	0.250
            case 31:	// "1/16d"		:	0.375
            case 32:	// "1/16t"		:	0.083
            case 33:	// "1/8"		:	0.500
            case 34:	// "1/8d"		:	0.750
            case 35:	// "1/8t"		:	0.167
            case 36:	// "1/4"		:	1.000
            case 37:	// "1/4d"		:	1.500
            case 38:	// "1/4t"		:	0.333
            case 39:	// "1/2"		:	2.000
            case 40:	// "1/2d"		:	3.000
            case 41:	// "1/2t"		:	0.667
            case 42:	// "1 bar"		:	4.000
            case 43:	// "1.5 bars"	:	6.000
            case 44:	// "2 bars"	:	8.000
            case 45:	// "4 bars"	:	16.000
            case 46:	// "8 bars"	:	32.000            
                updateNoteLengthPool( param , value );
                break;
            case 47:
                // rest lengths label; do nothing
            case 48:	// "1/64"		:	0.063
            case 49:	// "1/64d"		:	0.094
            case 50:	// "1/64t"		:	0.021
            case 51:	// "1/32"		:	0.125
            case 52:	// "1/32d"		:	0.188
            case 53:	// "1/32t"		:	0.042
            case 54:	// "1/16"		:	0.250
            case 55:	// "1/16d"		:	0.375
            case 56:	// "1/16t"		:	0.083
            case 57:	// "1/8"		:	0.500
            case 58:	// "1/8d"		:	0.750
            case 59:	// "1/8t"		:	0.167
            case 60:	// "1/4"		:	1.000
            case 61:	// "1/4d"		:	1.500
            case 62:	// "1/4t"		:	0.333
            case 63:	// "1/2"		:	2.000
            case 64:	// "1/2d"		:	3.000
            case 65:	// "1/2t"		:	0.667
            case 66:	// "1 bar"		:	4.000
            case 67:	// "1.5 bars"	:	6.000
            case 68:	// "2 bars"	:	8.000
            case 69:	// "4 bars"	:	16.000
            case 70:	// "8 bars"	:	32.000
                updateRestLengthPool( param , value );
                break;
            case 71:
                OUTPUT_NOTES_TO_CONSOLE = value;
                Trace( "Output notes to console is " + ( value == 1 ? "true" : "false" ) );
                break;
            case 72:
                VERBOSE = value;
                Trace( "Verbosity is " + ( value == 1 ? "true" : "false" ) );
                break;
            default:
                Trace("ERROR: ParameterChanged("+ param + "," + value + ")");
        }
    }

    /*
    CUSTOM FUNCTIONS
    */

    /* TRANSPOSITION */

    // converts the half- and whole-step jumps into the transposition and pitch shift maps
    function calculate_scale_pitches( root, templateIndex ) {

        // root index maps directly to MIDI pitches 0-11
        var template = SCALE_TEMPLATES[SCALE_KEYS[templateIndex]];
        var lastPitch = root;
        // init
        PITCH_WEIGHT_MAP = {};
        PITCH_WEIGHT_MAP[lastPitch] = createPitchRecord( NOTE_PROB_ROOT, PITCH_TYPE_ROOT );

        // build; length - 2 because we ignore the last value
        for ( var index = 0 ; index <= template.length - 2 ; index++ ) {
            var steps = template[index];
            var pitch = lastPitch + steps;
            // non-diatonic pitches
            if ( steps > 1 ) {
                while ( steps > 0 ) {
                    PITCH_WEIGHT_MAP[pitch] = createPitchRecord( NOTE_PROB_DEFAULT, PITCH_TYPE_NONDIATONIC );
                    steps--;
                }
            }
            PITCH_WEIGHT_MAP[pitch] = createPitchRecord( NOTE_PROB_DIATONIC, PITCH_TYPE_DIATONIC );
            lastPitch = pitch;
        }
            
        // normalize to octave C-2 (MIDI pitches 0-11)
        var cache = {};
        var keys = Object.keys(PITCH_WEIGHT_MAP);
        keys.forEach( function ( key ) {
            var pitch = parseInt(key);
            var pitchRecord = PITCH_WEIGHT_MAP[key]
            if ( pitch >= 12 ) { 
                pitch = pitch - 12;
            }
                cache[pitch] = pitchRecord;
        });

        PITCH_WEIGHT_MAP = cache;
        
        NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );
        
        updateControlsToScaleWeights( PITCH_WEIGHT_MAP );
            
    }

    function calculate_chord_pitches ( chord_root , chord_type ) {

        let chord_template = CHORD_TEMPLATES_LIB[ CHORD_PULLDOWN_LABELS[ chord_type ] ];

        // if ( VERBOSE ) {
        //     Trace("chord template pre qual: " + JSON.stringify( chord_template ));
        // }
        // get the qualities and modify

        var ext7 = GetParameter("7ths");
        if ( ext7 > 0 ) {
            let key = CHORD_QUAL_7TH_PULLDOWN_LABELS[ ext7 ];
            let interval = CHORD_QUAL_7TH_LIB[ key ];
            chord_template[3] = interval;
        } else {
            chord_template[3] = null;
        }

        var ext9 = GetParameter("9ths");
        if ( ext9 > 0 ) {
            let key = CHORD_QUAL_9TH_PULLDOWN_LABELS[ ext9 ];
            let interval = CHORD_QUAL_9TH_LIB[ key ];
            chord_template[4] = interval;
        } else {
            chord_template[4] = null;
        }

        var ext11 = GetParameter("11ths");
        if ( ext11 > 0 ) {
            let key = CHORD_QUAL_11TH_PULLDOWN_LABELS[ ext11 ];
            let interval = CHORD_QUAL_11TH_LIB[ key ];
            chord_template[5] = interval;
        } else {
            chord_template[5] = null;
        }

        var ext13 = GetParameter("13ths");
        if ( ext13 > 0 ) {
            let key = CHORD_QUAL_13TH_PULLDOWN_LABELS[ ext13 ];
            let interval = CHORD_QUAL_13TH_LIB[ key ];
            chord_template[6] = interval;
        } else {
            chord_template[6] = null;
        }

        // if ( VERBOSE ) {
        //     Trace("chord template postqual: " + JSON.stringify( chord_template ));
        // }

        // calculate the chord pitches
        let voices = {};
        chord_template.forEach( function ( interval ) {
            if ( interval != null ) {
                var pitch = chord_root + interval;
            if ( pitch >= 12 ) {
                pitch -= 12;
            }
            if ( interval == 0 ) {
                voices[ pitch ] = createPitchRecord( NOTE_PROB_CHROMATIC , PITCH_TYPE_ROOT );
            } else {
                voices[ pitch ] = createPitchRecord( NOTE_PROB_CHROMATIC , PITCH_TYPE_DIATONIC );
            }
        }
            
        });
        // compile the chord pitches with empty values for the remaining pitches in 
        // the chromatic scale for the PITCH_WEIGHT_MAP
        let chord_cache = {};
        for (let pitch = 0; pitch < 12; pitch++) {
            const pitch_record = voices[pitch];
            if ( pitch_record ) {
                chord_cache[ pitch ] = pitch_record;
            } else {
                chord_cache[ pitch ] = createPitchRecord( NOTE_PROB_DEFAULT , PITCH_TYPE_NONDIATONIC );
            }
        }

        PITCH_WEIGHT_MAP = chord_cache;
        
        NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );
        
        updateControlsToScaleWeights( PITCH_WEIGHT_MAP );
    }

    function calculate_live_preset_pitches () {

        var pitches = {};
        const keys = Object.keys( ACTIVE_LIVE_NOTES );
        keys.forEach( function ( key ) {
            const arr = ACTIVE_LIVE_NOTES[key];
            if ( arr ) {
                var length = arr.length;
                if ( length > 0 ) {
                    var pitch = parseInt( key );
                    if ( pitch >= 12 ) {
                        while ( pitch >= 12 ) {
                            pitch -= 12;
                        }
                    }
                    pitches[pitch] = createPitchRecord ( NOTE_PROB_CHROMATIC , PITCH_TYPE_DIATONIC );
                }
            }
        });

        // compile the chord pitches with empty values for the remaining pitches in 
        // the chromatic scale for the PITCH_WEIGHT_MAP
        var cache = {};
        for (let pitch = 0; pitch < 12; pitch++) {
            const pitch_record = pitches[pitch];
            if ( pitch_record ) {
                cache[ pitch ] = pitch_record;
            } else {
                cache[ pitch ] = createPitchRecord( NOTE_PROB_DEFAULT , PITCH_TYPE_NONDIATONIC );
            }
        }

        PITCH_WEIGHT_MAP = cache;
        
        NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );
        
        updateControlsToScaleWeights( PITCH_WEIGHT_MAP );

    }

    // special function for chromatic because it doesn't need special calculations
    function calculate_scale_pitches_to_chromatic() {

        for ( index = 0 ; index < 12 ; index++ ) {
            var pitchRecord = createPitchRecord( NOTE_PROB_CHROMATIC, PITCH_TYPE_DIATONIC );
            PITCH_WEIGHT_MAP[index] = pitchRecord;
        }
        NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );
        updateControlsToChromaticWeights();
    }

    // update to apply chromatic weights
    function updateControlsToChromaticWeights() {
        UPDATING_CONTROLS = true;
        
        // reset controls to chromatic value
        for ( var index = PITCH_CONTROL_OFFSET ; index < 12 + PITCH_CONTROL_OFFSET ; index++ ) {
            SetParameter(index, NOTE_PROB_CHROMATIC);
        }
        UPDATING_CONTROLS = false;
    }

    function updateControlsToScaleWeights( weights ) {
        UPDATING_CONTROLS = true;
        
        // reset controls to 0
        for ( var index = PITCH_CONTROL_OFFSET ; index < 12 + PITCH_CONTROL_OFFSET ; index++ ) {
            SetParameter(index, NOTE_PROB_DEFAULT);
        }
        
        // set controls to the weights
        var keys = Object.keys(weights);
        for ( var index = 0 ; index < keys.length ; index++ ) {
            var key = keys[index];
            var k = parseInt(key);
            var pitchRecord = weights[key];
            var weight = pitchRecord[PITCH_RECORD_KEY_WEIGHT];
            var controlIndex = k + PITCH_CONTROL_OFFSET;
            SetParameter(controlIndex, weight);
        }

        UPDATING_CONTROLS = false;
    }

    // transposes a pitch to the target octave
    function transposePitchToTargetOctave( pitch, targetOctave ) {
        var transposedPitch = pitch + ( targetOctave * 12 );
        return transposedPitch;
    }

    // update weights and pool based on change in a control
    function updatePitchWeight( param, value ) {
        
        // adjust for control index
        var pitch = param - PITCH_CONTROL_OFFSET;
        var pitchRecord = PITCH_WEIGHT_MAP[pitch];
        if ( pitchRecord == undefined ) {
            pitchRecord = createPitchRecord( NOTE_PROB_NONDIATONIC , PITCH_TYPE_NONDIATONIC );
        }
        pitchRecord[PITCH_RECORD_KEY_WEIGHT] = value;
        PITCH_WEIGHT_MAP[pitch] = pitchRecord;

        // calculate the updated weight pool
        NOTE_PITCH_POOL = buildNotePitchWeightPoolWithPitchWeightMap( PITCH_WEIGHT_MAP );

    }

    /* NOTE and REST LENGTH */

    function updateNoteLengthPool( param , value ) {

        var index = param - LENGTH_CONTROL_OFFSET;
        NOTE_LENGTH_SELECTIONS[index] = value;
        NOTE_LENGTH_POOL = buildEventLengthPoolWithSelections( NOTE_LENGTH_SELECTIONS );
        updateNoteRestRatioPool();

    }

    function updateRestLengthPool( param , value ) {

        var index = param - REST_CONTROL_OFFSET;
        REST_LENGTH_SELECTIONS[index] = value;
        REST_LENGTH_POOL = buildEventLengthPoolWithSelections( REST_LENGTH_SELECTIONS );
        updateNoteRestRatioPool();

    }

    function updateNoteRestRatioPool() {

        NOTE_REST_RATIO_POOL = {};
        var rest_total = REST_LENGTH_POOL[POOL_TOTAL_KEY];
        var note_total = NOTE_LENGTH_POOL[POOL_TOTAL_KEY];
        NOTE_REST_RATIO_POOL[rest_total] = EVENT_IS_REST;
        NOTE_REST_RATIO_POOL[rest_total + note_total] = EVENT_IS_NOTE;
        NOTE_REST_RATIO_POOL[POOL_TOTAL_KEY] = rest_total + note_total;

    }

    /* HELPER FUNCTIONS */

    function buildNotePitchWeightPoolWithPitchWeightMap( map ) {

        /*
        PITCH_WEIGHT_MAP
            pitch { 0-11 }
                weight/prob { % }
                type { String }

        PITCH_RECORD_KEY_WEIGHT
        */

        var pool = {};
        var total = 0;

        var pitches = Object.keys( map );
        pitches.forEach( function ( pitch ) {
            const record = map[pitch];
            const weight = record[PITCH_RECORD_KEY_WEIGHT];
            var value = parseInt( weight );
            if ( value > 0 ) {
                total += value; 
                pool[total] = pitch;
            }
        });

        /*
            {
                <int>total% : selection index
                <str>total  : total
            }

        */
        pool[POOL_TOTAL_KEY] = total;

        return pool;

    }

    function buildEventLengthPoolWithSelections( selections ) {

        var pool = {};
        var total = 0;

        for ( let index = 0; index < selections.length; index++ ) {
            const value = selections[index];
            if ( value > 0 ) {
                total += value;
                pool[total] = index;
            }
        }

        /*
            {
                <int>total% : pitch
                <str>total  : total
            }
        */

        pool[POOL_TOTAL_KEY] = total;
        return pool;

    }

    function getRandomValueFromWeightPool( weightPool ) {

        /*
        NOTE_LENGTH_POOL
        REST_LENGTH_POOL{"50":10,"total":50}
        NOTE_REST_RATIO_POOL{"50":"r","100":,"total":100}
        NOTE_PITCH_POOL{"75":"0","100":"2","125":"4","150":"5","175":"7","200":"9","225":"11","total":225}
        */

        var total = weightPool[POOL_TOTAL_KEY];

        var r = rInt( 1, total );
        var weights = Object.keys(weightPool);

        if ( weights.length == 2 ) {
            return weightPool[weights[0]];
        }

        weights.pop();
        var last_weight = total;
        // if ( VERBOSE ) {
        //     Trace("weights\t" + JSON.stringify(weights));
        // }
        for ( let index = weights.length - 1 ; index > -1 ; index-- ) {
            const weight = parseInt(weights[index]);
            // if ( VERBOSE ) {
            //     Trace("r > weight?\t" + r + " > " + weight);
            // }
            if ( r > weight ) {
                // if ( VERBOSE ) {
                //     Trace("\tr > weight\t" + r + " > " + weight);
                // }
                return weightPool[last_weight];
            }
            last_weight = weight;
        }

        return weightPool[weights[0]];
        
    }

    function getLengthByIndexFromEventLengthLib( index ) {
        const keys = Object.keys( NOTE_LENGTHS_LIB );
        const key = keys[index];
        return NOTE_LENGTHS_LIB[key]; 
    }

    function quantizeToMinimumDivision( pos ) {
        return Math.ceil( timing_info.blockStartBeat * NOTE_DIVISION_MIN ) / NOTE_DIVISION_MIN;
    }

    function createPitchRecord ( weight, type ) {
        var cache = {};
        cache[PITCH_RECORD_KEY_WEIGHT] = weight;
        cache[PITCH_RECORD_KEY_TYPE] = type;
        return cache;
    }

    function rInt( min, max ) {
        if (min == max ) {return min;}
        return Math.floor(min + Math.random()*(max + 1 - min));
    }

    function getRandomValueFromArray( arr ) {
        var r = rInt( 0 , arr.length );
        return arr[r];
    }

    /*
    PARAMETER CONTROL MANAGEMENT

    -> Remember to update ParameterChanged() 
    */

    // index 0
    PluginParameters.push({
        name:"Pitch Parameters", 
        type:"text"
        });

    // 1
    PluginParameters.push({
        name:"Target Octave", 
        type:"menu", 
        valueStrings:TARGET_OCTAVE_KEYS, 
        defaultValue:5
    });

    // 2
    PluginParameters.push({
        name:"Scale Root", 
        type:"menu", 
        valueStrings: CHROMATIC_SCALE_STRINGS,
        defaultValue:0
    });

    // 3
    PluginParameters.push({
        name:"Scale Type", 
        type:"menu", 
        valueStrings: SCALE_KEYS, 
        defaultValue:1
    });

    // 4
    PluginParameters.push({
        name:"Parameters Source", 
        type:"menu", 
        valueStrings: POOL_SOURCE_OPTIONS,
        defaultValue:0
    });

    // 5
    PluginParameters.push({
        name:"Chord Root", 
        type:"menu", 
        valueStrings: CHROMATIC_SCALE_STRINGS,
        defaultValue:0
    });

    // 6
    PluginParameters.push({
        name:"Chord Type", 
        type:"menu", 
        valueStrings: CHORD_PULLDOWN_LABELS,
        defaultValue:0
    });

    // 7
    PluginParameters.push({
        name:"7ths", 
        type:"menu", 
        valueStrings: CHORD_QUAL_7TH_PULLDOWN_LABELS,
        defaultValue:0
    });

    // 8 
    PluginParameters.push({
        name:"9ths", 
        type:"menu", 
        valueStrings: CHORD_QUAL_9TH_PULLDOWN_LABELS,
        defaultValue:0
    });

    // 9
    PluginParameters.push({
        name:"11ths", 
        type:"menu", 
        valueStrings: CHORD_QUAL_11TH_PULLDOWN_LABELS,
        defaultValue:0
    });

    // 10
    PluginParameters.push({
        name:"13ths", 
        type:"menu", 
        valueStrings: CHORD_QUAL_13TH_PULLDOWN_LABELS,
        defaultValue:0
    });

    // 11-22
    var index = 0;
    CHROMATIC_SCALE_STRINGS.forEach(element => {
        PluginParameters.push({
            name:CHROMATIC_SCALE_STRINGS[index], 
            type:"lin", 
            unit:"\%", 
            minValue:PROBABILITY_SLIDER_MIN, 
            maxValue:PROBABILITY_SLIDER_MAX, 
            numberOfSteps:PROBABILITY_SLIDER_MAX, 
            defaultValue:PROBABILITY_SLIDER_MIN}
        );
        index++;
    });

    // 23
    PluginParameters.push({
            name:"Note Lengths", 
            type:"text"
            });

    index = 0;

    // 24-40
    NOTE_LENGTH_KEYS.forEach( element => {
        var default_length = 0;
        if ( element == "1/4") {
            default_length = NOTE_PROB_CHROMATIC;
        }

        PluginParameters.push({
            name:"Note " + element, 
            type:"lin", 
            // unit:"\%", 
            minValue:PROBABILITY_SLIDER_MIN, 
            maxValue:PROBABILITY_SLIDER_MAX, 
            numberOfSteps:PROBABILITY_SLIDER_MAX, 
            defaultValue:default_length}
        );
        index++;
    });

    // 41
    PluginParameters.push({
        name:"Rest Lengths", 
        type:"text" 
        });

    // 42-58
    index = 0;
    NOTE_LENGTH_KEYS.forEach( element => {

        var default_length = 0;

        PluginParameters.push({
            name:"Rest " + element, 
            type:"lin", 
            // unit:"\%", 
            minValue:PROBABILITY_SLIDER_MIN, 
            maxValue:PROBABILITY_SLIDER_MAX, 
            numberOfSteps:PROBABILITY_SLIDER_MAX, 
            defaultValue:default_length}
        );
        index++;
    });

    // 59
    PluginParameters.push({
        name:"Output Notes to Console", 
        type:"checkbox", 
        defaultValue:0
    });

    // 60
    PluginParameters.push({
        name:"Verbose for Troubleshooting", 
        type:"checkbox", 
        defaultValue:0
    });