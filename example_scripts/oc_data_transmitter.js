/******************************************************************************
Name: Scripter Music Transmitter
Author(s): Philip Regan

Purpose: 
* Transmit information as MIDI-based packets across tracks for improved 
automation and performance
* This example shows how scale and chord information can be encoded and 
exchanged across scripts, and by extension across tracks

About Packets:
Packets are an array of MIDI Control Change events defined by the number and 
value properties of the Control Change. There are a number of undefined Control 
Change events in the MIDI 1.0 spec whicn can be leveraged for transmitting 
proprietary data. Undefined does not mean `unused' by any hardware or software, 
so this example offers ways to minimize Control Change collisions. The term 
"packet" is entirely proprietary to these scripts as a handy way of discussing
how data is managed.

The packet is really about reserving CC numbers and their values for certain
purposes. Creating and sending MIDI events lies at the core of Scripter, but 
Scripter has little to say about how to use those events outside of the MIDI
spec. This example script is really about clearly defining context for those
events.

There are two scripts involved: the transmitter and receiver. The transmitter 
encodes musical data as a series of Control Change events, the series being the
"packet", and sends them to the next item in the data chain. The receiver 
manages the incoming packet events, decodes the data and performs actions 
accordingly.

If the data were being transmitted from one function to another in a single 
script, there are much better options like global variables or JavaScript-native
data structures like Arrays and Objects. Since Scripter only allows a single 
stream of MIDI data to be sent through to whatever is next in the data chain, 
Control Change events are leveraged to send data in very specific ways. 

Program Change is not used here because that is specific to voice and patch 
selection. There is not necessarily a control change in the hardware sense of 
the term, and patch selection can be encoded in a packet, but the MIDI spec 
makes clear that changes to track element parameters which aren't patches are 
sent via Control Change.

By encoding and decoding information like this, much more complex musical data
can be sent from one track to multiple scripts and/or tracks which can go well 
beyond what is provided in the MIDI spec documentation. This allows for 
richer musical choices for automation and play across an entire project.

This packet specification leverages the undefined Control Change numbers in the
MIDI 1.0 spec.

MIDI 1.0 Control Change Messages, Undefined only
------------------------------------------------
DEC BIN         HEX Function    Value   Used As
3	00000011	03	Undefined	0-127	MSB
...
9	00001001	09	Undefined	0-127	MSB
...
14	00001110	0E	Undefined	0-127	MSB
15	00001111	0F	Undefined	0-127	MSB
...
20	00010100	14	Undefined	0-127	MSB
21	00010101	15	Undefined	0-127	MSB
22	00010110	16	Undefined	0-127	MSB
23	00010111	17	Undefined	0-127	MSB
24	00011000	18	Undefined	0-127	MSB
25	00011001	19	Undefined	0-127	MSB
26	00011010	1A	Undefined	0-127	MSB
27	00011011	1B	Undefined	0-127	MSB
28	00011100	1C	Undefined	0-127	MSB
29	00011101	1D	Undefined	0-127	MSB
30	00011110	1E	Undefined	0-127	MSB
31	00011111	1F	Undefined	0-127	MSB
...
85	01010101	55	Undefined	---	    ---
86	01010110	56	Undefined	---	    ---
87	01010111	57	Undefined	---	    ---
...
89	01011001	59	Undefined	---	    ---
90	01011010	5A	Undefined	---	    ---
...
102	01100110	66	Undefined	---	    ---
103	01100111	67	Undefined	---	    ---
104	01101000	68	Undefined	---	    ---
105	01101001	69	Undefined	---	    ---
106	01101010	6A	Undefined	---	    ---
107	01101011	6B	Undefined	---	    ---
108	01101100	6C	Undefined	---	    ---
109	01101101	6D	Undefined	---	    ---
110	01101110	6E	Undefined	---	    ---
111	01101111	6F	Undefined	---	    ---
112	01110000	70	Undefined	---	    ---
113	01110001	71	Undefined	---	    ---
114	01110010	72	Undefined	---	    ---
115	01110011	73	Undefined	---	    ---
116	01110100	74	Undefined	---	    ---
117	01110101	75	Undefined	---	    ---
118	01110110	76	Undefined	---	    ---
119	01110111	77	Undefined	---	    ---

Packets leverage Control Change events in the following ways:

CC Number: Cross-script identifier a packet payload is being delivered
CC Value: Packet instruction

At minimum, a packet is comprised of the following sequence of CC events:
    Packet Start
    Packet Data
    Packet Stop

CC Number is used to determine whether an event is part of a packet. In this 
script, only 1 number is used, 111 because it is easily recognizable, but there 
are a wide selection of undefined numbers as shown in the table. So, the CC 
number could define not just whether the event is a packet event, but also be 
used to differentiate the type of packet.

The Start and Stop events make clear a packet is being delivered. This helps to
ensure the receiving script is capturing and parsing the data correctly. Without
those Start and Stop events, the Control Change can look like just any other 
Control Change in the MIDI event data stream and get lost. 

One benefit of Scripter is that it is effectively a single threaded framework 
when it comes to the data stream. Even if HandleMIDI() and ProcessMIDI() are 
being fired at non-concurrent times, when a series of events are fired one 
right after the other, the other function will not start until the current one
is done executing it's code. This means there is a good chance the receiving 
script will get those events closely grouped together.

CC Value is used to provide instrucions for the script (sometimes noted as 
"payload" in this documentation). CC Value can be used for just about anything 
musically. In this example, the following data is managed by reserving values in 
the CC number 111 to define characteristics for scale and chord information:

CC Value	    Object	Type	Property1	Property2	Payload
-------------   ------  ----    ---------   ---------   -------
0				PACKET	EVENT	                        STOP
1	Unassigned			
2				PACKET	SCALE	TONIC					C
3				PACKET	SCALE	TONIC					Cs_Db
4				PACKET	SCALE	TONIC					D
5				PACKET	SCALE	TONIC					Ds_Eb
6				PACKET	SCALE	TONIC					E
7				PACKET	SCALE	TONIC					F
8				PACKET	SCALE	TONIC					Fs_Gb
9				PACKET	SCALE	TONIC					G
10				PACKET	SCALE	TONIC					Gs_Ab
11				PACKET	SCALE	TONIC					A
12				PACKET	SCALE	TONIC					As_Bb
13				PACKET	SCALE	TONIC					B
14	Unassigned				
15	Unassigned				
16				PACKET	SCALE	TYPE					IONIAN
17				PACKET	SCALE	TYPE					DORIAN
18				PACKET	SCALE	TYPE					PHRYGIAN
19				PACKET	SCALE	TYPE					LYDIAN
20				PACKET	SCALE	TYPE					MIXOLYDIAN
21				PACKET	SCALE	TYPE					AEOLIAN
22				PACKET	SCALE	TYPE					LOCRIAN
23-84 are unassigned					
85				PACKET	CHORD	CHORD		ACCIDENTAL	FLAT
86				PACKET	CHORD	CHORD		ACCIDENTAL	NATURAL
87				PACKET	CHORD	CHORD		ACCIDENTAL	SHARP
88				PACKET	CHORD	DEGREE					1
89				PACKET	CHORD	DEGREE					2
90				PACKET	CHORD	DEGREE					3
91				PACKET	CHORD	DEGREE					4
92				PACKET	CHORD	DEGREE					5
93				PACKET	CHORD	DEGREE					6
94				PACKET	CHORD	DEGREE					7
95				PACKET	CHORD	QUALITY					DIMINISHED
96				PACKET	CHORD	QUALITY					MINOR
97				PACKET	CHORD	QUALITY					MAJOR
98				PACKET	CHORD	QUALITY					AUGMENTED
99				PACKET	CHORD	QUALITY					SUS_2
100				PACKET	CHORD	QUALITY					SUS_4
101				PACKET	CHORD	ALT_BASS				1
102				PACKET	CHORD	ALT_BASS				2
103				PACKET	CHORD	ALT_BASS				3
104				PACKET	CHORD	ALT_BASS				4
105				PACKET	CHORD	ALT_BASS				5
106				PACKET	CHORD	ALT_BASS				6
107				PACKET	CHORD	ALT_BASS				7
108				PACKET	CHORD	EXTENSION	5TH			FLAT
109				PACKET	CHORD	EXTENSION	5TH			NATURAL
110				PACKET	CHORD	EXTENSION	5TH			SHARP
111				PACKET	CHORD	EXTENSION	7TH			FLAT
112				PACKET	CHORD	EXTENSION	7TH			NATURAL
113				PACKET	CHORD	EXTENSION	7TH			SHARP
114				PACKET	CHORD	EXTENSION	9TH			FLAT
115				PACKET	CHORD	EXTENSION	9TH			NATURAL
116				PACKET	CHORD	EXTENSION	9TH			SHARP
117				PACKET	CHORD	EXTENSION	9TH			ADD
118				PACKET	CHORD	EXTENSION	11TH		FLAT
119				PACKET	CHORD	EXTENSION	11TH		NATURAL
120				PACKET	CHORD	EXTENSION	11TH		SHARP
121				PACKET	CHORD	EXTENSION	11TH		ADD
122				PACKET	CHORD	EXTENSION	13TH		FLAT
123				PACKET	CHORD	EXTENSION	13TH		NATURAL
124				PACKET	CHORD	EXTENSION	13TH		SHARP
125				PACKET	CHORD	EXTENSION	13TH		ADD
126	Unassigned				
127				PACKET	EVENT	                        START		

This encoding does two important things:

* Encodes the scale information in values 2-22
* Encodes roman numeral analysis notation in value 85-127

In the above list, only half the values between 0-127 are needed to encode 
critical scale and chord information, which is intended to show just how 
information rich a packet can be when managed properly. A packet delivering 
information on building a C major chord in the above encoding would be the 
following:

CC Number   Event Value     Description
---------   -----------     -----------
111         127             PACKET EVENT START
111         2               PACKET SCALE TONIC C
111         16				PACKET SCALE TYPE IONIAN
111         88				PACKET CHORD DEGREE 1
111         97				PACKET CHORD QUALITY MAJOR
111         0               PACKET EVENT STOP

This encoding balances the need for sending a lot of information in a compressed
format by doing the following:

* Using only one CC number, which reduces the chances of collding with a control
change from an external source. If a competing source is found, then the CC 
number for script data can be changed in a single, global variable.
* Dividing values into specific scale and chord functions so the same detailed 
musical data is easily shared across scripts for flexible manipulation across 
tracks. 

However, one downside to this encoding is that it does require multiple scripts 
to re-parse data which has already been parsed. Every time a Scripter instance 
is used in a track, another JavaScript MIDI engine appears to be started up in 
the OS which consumes processor cycles. While this may not be a concern in 
newer Macs, it may be in older ones. Every encoding comes with these kinds of 
trade offs, and the environment and musical context in which this data will be 
used will determine that balance.

Alternative Encodings
--------------------- 
For something as deep and complex as chords, there are many ways this 
information can be handled. For example, instead of sending an encoding of 
Roman Numeral analysis and having to re-build that chord in another script, 
the specific voices of each chord could just be sent. 

For example, for easy parsing on the receiver, a different CC number can be used
to capture the different voices in a chord:

Voice       CC Number   Value
-----       ---------   -----
Root        112         MIDI pitch as integer 0-127
3rd         113         "   "   "   "   "   "   "
5th         114         "   "   "   "   "   "   "
7th         115         "   "   "   "   "   "   "
9th         116         "   "   "   "   "   "   "
11th        117         "   "   "   "   "   "   "
13th        118         "   "   "   "   "   "   "
Alt Bass    119         "   "   "   "   "   "   "

Packet events are handled in CC number 111.

A C Major triad packet in the above encoding would be the following:

CC Number   Event Value     0-based pitches     Middle-C based pitches  Description
---------   -----------     ---------------     ----------------------  ------------
111         127             --                  --                      Packet Start
112         --              0                   60                      Root
113         --              4                   64                      3rd
114         --              7                   67                      5th
111         0               --                  --                      Packet End

A benefit to this encoding is the receiver not having to re-parse chord 
information which has already been parsed; the voices are all documented for 
manipulating the chord later. The primary concern with this is the more CC 
numbers used for a packet, the liklier a collision with an externally-sourced 
control change. To avoid those collisions, this encoding can be distilled down 
even further into one CC Number if 0-1 denotes the event, 2-9 denotes the voice, 
and the MIDI pitches are provided in and around middle C within range of 10-127.

Event           CC 111 Value
-----           ------------
Packet Stop     0
Root            1
3rd             2
5th             3
7th             4
9th             5
11th            6
13th            7
Alt Bass        8
Voice Pitch     MIDI Pitch 10-126
Packet Start    127

A C Major triad packet in the above coding would be the following:

CC Number   Event Value     Voice Designation   Middle-C based pitches  Description
---------   -----------     -----------------   ----------------------  -----------
111         127             --                  --                      Packet Start
111         --              1                   --                      Root Voice Start
111         --              --                  60                      Root Voice Pitch
111         --              2                   --                      3rd Voice Start
111         --              --                  64                      3rd Voice Pitch
111         --              3                   --                      5th Voice Start
111         --              --                  67                      5th Voice Pitch
111         0               --                  --                      Packet End

On the one hand, the liklihood of interfering with other Control Changes is 
minimized and the same detail of chord information is maintained. On the other, 
even more musical data is potentially lost in the highest and lowest octave 
because those values are reserved for the packet information. 

Example Code Walkthrough
------------------------
Back to the original example of sending the C Major chord...

CC Number   Event Value     Description
---------   -----------     -----------
111         127             PACKET EVENT START
111         2               PACKET SCALE TONIC C
111         16				PACKET SCALE TYPE IONIAN
111         88				PACKET CHORD DEGREE 1
111         97				PACKET CHORD QUALITY MAJOR
111         0               PACKET EVENT STOP

For transmission, a core mechanic can be the following...

// assume the encoding values are handled as constants as in the example code 
// below
let packet = [
    PACKET_EVENT_START, 
    PACKET_SCALE_TONIC_C, 
    PACKET_SCALE_TYPE_IONIAN, 
    PACKET_CHORD_DEGREE_1, 
    PACKET_CHORD_QUALITY_MAJOR, 
    PACKET_EVENT_STOP
];
packet.forEach( function( payload ) {
    let cc = new ControlChange();
    cc.number = 111;
    cc.value = payload;
    cc.send();
});

By handling the packet as an array, then native JavaScript structures can be 
leveraged for easy management before sending, and sending is a simple loop
through the array.

For receiving, a core mechanic can be the following... 

// global variables
// used to help manage data receiving if there are other events intermingled 
// with the packet's data
var PACKET_RECEIVE_ON = false;
var PACKET_CACHE = [];

function HandleMIDI( event ) {
    // assume the encoding values are handled as constants
    // is this a packet?
    if ( event instanceof ControlChange && event.number == PACKET_MIDI_CONTROL_CHANGE ) {
        switch ( event.value ) {
            case PACKET_EVENT_STOP:
                PACKET_RECEIVE_ON = false;
                handle_packet( PACKET_CACHE );
                break;
            case PACKET_EVENT_START:
                PACKET_RECEIVE_ON = true;
                break;
            default:
                // capture whatever event is sent
                // a better practice would be more specific to the control change values
                // in the case clauses of the switch statement or in an if statement
                if ( PACKET_RECEIVE_ON ) {
                    PACKET_CACHE.push( event.value );
                }
        }
    } else {
        event.send();
    }
}

function handle_packet ( packet ) {
    // decode the packet and call any necessary functions
    PACKET_CACHE = [];
}

The handle_packet() function can be further expanded to handle both transmission 
and receiving:

function handle_packet( packet ) {
    if ( IS_PACKET_TRANSMITTER ) {
        // assume packet already contains START and STOP events
        packet.forEach( function( payload ) {
            let cc = new ControlChange();
            cc.number = 111;
            cc.value = payload;
            cc.send();
        });
    } else if ( !IS_PACKET_TRANSMITTER && !PACKET_RECEIVE_ON ) {
        // decode the packet and call any necessary functions
        PACKET_CACHE = [];
    } else {
        Trace("ERROR: handle_packet(" + JSON.stringify( packet ) + ") " + IS_PACKET_TRANSMITTER + "/" + PACKET_RECEIVE_ON);
    }
}

Roadmap:
> Packet
    X Events
        X Begin/Start
        X End/Stop
    > Payload
        X Scale
            X Tonic
            X Type
        X Chord
            X See String Parser for supported features
* Guided generation
    * Update to transmit instead of play
        * Scale
            * Tonic
            * Type  

This script is not open source. All rights reserved.

****************************************************************************/

var PluginParameters = [];
var NeedsTimingInfo = true;

const PACKET_MIDI_CONTROL_CHANGE = 111;
const PACKET_EVENT_STOP = 0;

const PACKET_SCALE_TONIC_C = 2;
const PACKET_SCALE_TONIC_Cs_Db = 3;
const PACKET_SCALE_TONIC_D = 4;
const PACKET_SCALE_TONIC_Ds_Eb = 5;
const PACKET_SCALE_TONIC_E = 6;
const PACKET_SCALE_TONIC_F = 7;
const PACKET_SCALE_TONIC_Fs_Gb = 8;
const PACKET_SCALE_TONIC_G = 9;
const PACKET_SCALE_TONIC_Gs_Ab = 10;
const PACKET_SCALE_TONIC_A = 11;
const PACKET_SCALE_TONIC_As_Bb = 12;
const PACKET_SCALE_TONIC_B = 13;

const PACKET_SCALE_TYPE_IONIAN = 16;
const PACKET_SCALE_TYPE_DORIAN = 17;
const PACKET_SCALE_TYPE_PHRYGIAN = 18;
const PACKET_SCALE_TYPE_LYDIAN = 19;
const PACKET_SCALE_TYPE_MIXOLYDIAN = 20;
const PACKET_SCALE_TYPE_AEOLIAN = 21;
const PACKET_SCALE_TYPE_LOCRIAN = 22;

const PACKET_CHORD_CHORD_ACCIDENTAL_FLAT = 85;
const PACKET_CHORD_CHORD_ACCIDENTAL_NATURAL = 86;
const PACKET_CHORD_CHORD_ACCIDENTAL_SHARP = 87;
const PACKET_CHORD_DEGREE_1 = 88;
const PACKET_CHORD_DEGREE_2 = 89;
const PACKET_CHORD_DEGREE_3 = 90;
const PACKET_CHORD_DEGREE_4 = 91;
const PACKET_CHORD_DEGREE_5 = 92;
const PACKET_CHORD_DEGREE_6 = 93;
const PACKET_CHORD_DEGREE_7 = 94;
const PACKET_CHORD_QUALITY_DIMINISHED = 95;
const PACKET_CHORD_QUALITY_MINOR = 96;
const PACKET_CHORD_QUALITY_MAJOR = 97;
const PACKET_PACKET_PACKET_AUGMENTED = 98;
const PACKET_PACKET_PACKET_SUS_2 = 99;
const PACKET_PACKET_PACKET_SUS_4 = 100;
const PACKET_CHORD_ALT_BASS_1 = 101;
const PACKET_CHORD_ALT_BASS_2 = 102;
const PACKET_CHORD_ALT_BASS_3 = 103;
const PACKET_CHORD_ALT_BASS_4 = 104;
const PACKET_CHORD_ALT_BASS_5 = 105;
const PACKET_CHORD_ALT_BASS_6 = 106;
const PACKET_CHORD_ALT_BASS_7 = 107;
const PACKET_CHORD_EXTENSION_5TH_FLAT = 108;
const PACKET_CHORD_EXTENSION_5TH_NATURAL = 109;
const PACKET_CHORD_EXTENSION_5TH_SHARP = 110;
const PACKET_CHORD_EXTENSION_7TH_FLAT = 111;
const PACKET_CHORD_EXTENSION_7TH_NATURAL = 112;
const PACKET_CHORD_EXTENSION_7TH_SHARP = 113;
const PACKET_CHORD_EXTENSION_9TH_FLAT = 114;
const PACKET_CHORD_EXTENSION_9TH_NATURAL = 115;
const PACKET_CHORD_EXTENSION_9TH_SHARP = 116;
const PACKET_CHORD_EXTENSION_9TH_ADD = 117;
const PACKET_CHORD_EXTENSION_11TH_FLAT = 118;
const PACKET_CHORD_EXTENSION_11TH_NATURAL = 119;
const PACKET_CHORD_EXTENSION_11TH_SHARP = 120;
const PACKET_CHORD_EXTENSION_11TH_ADD = 121;
const PACKET_CHORD_EXTENSION_13TH_FLAT = 122;
const PACKET_CHORD_EXTENSION_13TH_NATURAL = 123;
const PACKET_CHORD_EXTENSION_13TH_SHARP = 124;
const PACKET_CHORD_EXTENSION_13TH_ADD = 125;

const PACKET_EVENT_START = 127;

// used to manage actions
var IS_PACKET_TRANSMITTER = true;
// whenever receiver is TRUE, the script will look out for any events on the 
// channel set in PACKET_MIDI_CONTROL_CHANGE until PACKET_EVENT_STOP 
var PACKET_RECEIVE_ON = false;
var PACKET_CACHE = [];

/* RUNTIME */

function HandleMIDI( event ) {
    // create a simple trigger to kick off the packet
    let packet = [
        PACKET_EVENT_START, 
        PACKET_SCALE_TONIC_C, 
        PACKET_SCALE_TYPE_IONIAN, 
        PACKET_CHORD_DEGREE_1, 
        PACKET_CHORD_QUALITY_MAJOR, 
        PACKET_EVENT_STOP
    ];
    handle_packet( packet );
}

/* MESSAGE TRANSMISSION AND RECEIVING MANAGEMENT */

function handle_packet( packet ) {
    if ( IS_PACKET_TRANSMITTER ) {
        // assume packet already contains START and STOP events
        packet.forEach( function( payload ) {
            let cc = new ControlChange();
            cc.number = PACKET_MIDI_CONTROL_CHANGE;
            cc.value = payload;
            cc.send();
        });
    } else if ( !IS_PACKET_TRANSMITTER && !PACKET_RECEIVE_ON ) {
        // decode the packet and call any necessary functions
        Trace(JSON.stringify(packet));
        // clear the packet
        PACKET_CACHE = [];
    } else {
        Trace("ERROR: handle_packet(" + JSON.stringify( packet ) + ") " + IS_PACKET_TRANSMITTER + "/" + PACKET_RECEIVE_ON);
    }
}