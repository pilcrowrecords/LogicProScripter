/******************************************************************************
Name: Scripter Music Transmitter
Author(s): Philip Regan

For documentation, see Transmitter script;

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

function HandleMIDI( event ) {
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
                if ( PACKET_RECEIVE_ON ) {
                    PACKET_CACHE.push( event.value );
                }
        }
    } else {
        event.send();
    }
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