/*
Adding and managing controls for all 128 MIDI pitches
*/

var PluginParameters = [];

const CHROMATIC_SCALE_STRINGS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
const OCTAVE_STRINGS = ["-2", "-1", "0", "1", "2", "3", "4", "5", "6", "7", "8"];

var pitch_cursor = -1;
var octave_cursor = -1;
var current_octave = "";
for (let pitch = 0; pitch < 128; pitch++) {

    pitch_cursor += 1;
    if ( pitch_cursor == CHROMATIC_SCALE_STRINGS.length ) {
        pitch_cursor = 0;
    }
    
    if ( pitch_cursor == 0 ) {
        octave_cursor += 1;
        if ( octave_cursor == OCTAVE_STRINGS.length ) {
            octave_cursor = 0;
        }
    }
    
    PluginParameters.push({
            name:CHROMATIC_SCALE_STRINGS[pitch_cursor] + " " + OCTAVE_STRINGS[octave_cursor] + " (" + pitch + ")", 
            type:"lin", 
            unit:"\%", 
            minValue:0, 
            maxValue:100, 
            numberOfSteps:100, 
            defaultValue:50
        });
}

function ParameterChanged( param , value ) {
    switch ( param ) {
        case 0:
        // C -2 (0)
        break;
        case 1:
        // C♯/D♭ -2 (1)
        break;
        case 2:
        // D -2 (2)
        break;
        case 3:
        // D♯/E♭ -2 (3)
        break;
        case 4:
        // E -2 (4)
        break;
        case 5:
        // F -2 (5)
        break;
        case 6:
        // F♯/G♭ -2 (6)
        break;
        case 7:
        // G -2 (7)
        break;
        case 8:
        // G♯/A♭ -2 (8)
        break;
        case 9:
        // A -2 (9)
        break;
        case 10:
        // A♯/B♭ -2 (10)
        break;
        case 11:
        // B -2 (11)
        break;
        case 12:
        // C -1 (12)
        break;
        case 13:
        // C♯/D♭ -1 (13)
        break;
        case 14:
        // D -1 (14)
        break;
        case 15:
        // D♯/E♭ -1 (15)
        break;
        case 16:
        // E -1 (16)
        break;
        case 17:
        // F -1 (17)
        break;
        case 18:
        // F♯/G♭ -1 (18)
        break;
        case 19:
        // G -1 (19)
        break;
        case 20:
        // G♯/A♭ -1 (20)
        break;
        case 21:
        // A -1 (21)
        break;
        case 22:
        // A♯/B♭ -1 (22)
        break;
        case 23:
        // B -1 (23)
        break;
        case 24:
        // C 0 (24)
        break;
        case 25:
        // C♯/D♭ 0 (25)
        break;
        case 26:
        // D 0 (26)
        break;
        case 27:
        // D♯/E♭ 0 (27)
        break;
        case 28:
        // E 0 (28)
        break;
        case 29:
        // F 0 (29)
        break;
        case 30:
        // F♯/G♭ 0 (30)
        break;
        case 31:
        // G 0 (31)
        break;
        case 32:
        // G♯/A♭ 0 (32)
        break;
        case 33:
        // A 0 (33)
        break;
        case 34:
        // A♯/B♭ 0 (34)
        break;
        case 35:
        // B 0 (35)
        break;
        case 36:
        // C 1 (36)
        break;
        case 37:
        // C♯/D♭ 1 (37)
        break;
        case 38:
        // D 1 (38)
        break;
        case 39:
        // D♯/E♭ 1 (39)
        break;
        case 40:
        // E 1 (40)
        break;
        case 41:
        // F 1 (41)
        break;
        case 42:
        // F♯/G♭ 1 (42)
        break;
        case 43:
        // G 1 (43)
        break;
        case 44:
        // G♯/A♭ 1 (44)
        break;
        case 45:
        // A 1 (45)
        break;
        case 46:
        // A♯/B♭ 1 (46)
        break;
        case 47:
        // B 1 (47)
        break;
        case 48:
        // C 2 (48)
        break;
        case 49:
        // C♯/D♭ 2 (49)
        break;
        case 50:
        // D 2 (50)
        break;
        case 51:
        // D♯/E♭ 2 (51)
        break;
        case 52:
        // E 2 (52)
        break;
        case 53:
        // F 2 (53)
        break;
        case 54:
        // F♯/G♭ 2 (54)
        break;
        case 55:
        // G 2 (55)
        break;
        case 56:
        // G♯/A♭ 2 (56)
        break;
        case 57:
        // A 2 (57)
        break;
        case 58:
        // A♯/B♭ 2 (58)
        break;
        case 59:
        // B 2 (59)
        break;
        case 60:
        // C 3 (60)
        break;
        case 61:
        // C♯/D♭ 3 (61)
        break;
        case 62:
        // D 3 (62)
        break;
        case 63:
        // D♯/E♭ 3 (63)
        break;
        case 64:
        // E 3 (64)
        break;
        case 65:
        // F 3 (65)
        break;
        case 66:
        // F♯/G♭ 3 (66)
        break;
        case 67:
        // G 3 (67)
        break;
        case 68:
        // G♯/A♭ 3 (68)
        break;
        case 69:
        // A 3 (69)
        break;
        case 70:
        // A♯/B♭ 3 (70)
        break;
        case 71:
        // B 3 (71)
        break;
        case 72:
        // C 4 (72)
        break;
        case 73:
        // C♯/D♭ 4 (73)
        break;
        case 74:
        // D 4 (74)
        break;
        case 75:
        // D♯/E♭ 4 (75)
        break;
        case 76:
        // E 4 (76)
        break;
        case 77:
        // F 4 (77)
        break;
        case 78:
        // F♯/G♭ 4 (78)
        break;
        case 79:
        // G 4 (79)
        break;
        case 80:
        // G♯/A♭ 4 (80)
        break;
        case 81:
        // A 4 (81)
        break;
        case 82:
        // A♯/B♭ 4 (82)
        break;
        case 83:
        // B 4 (83)
        break;
        case 84:
        // C 5 (84)
        break;
        case 85:
        // C♯/D♭ 5 (85)
        break;
        case 86:
        // D 5 (86)
        break;
        case 87:
        // D♯/E♭ 5 (87)
        break;
        case 88:
        // E 5 (88)
        break;
        case 89:
        // F 5 (89)
        break;
        case 90:
        // F♯/G♭ 5 (90)
        break;
        case 91:
        // G 5 (91)
        break;
        case 92:
        // G♯/A♭ 5 (92)
        break;
        case 93:
        // A 5 (93)
        break;
        case 94:
        // A♯/B♭ 5 (94)
        break;
        case 95:
        // B 5 (95)
        break;
        case 96:
        // C 6 (96)
        break;
        case 97:
        // C♯/D♭ 6 (97)
        break;
        case 98:
        // D 6 (98)
        break;
        case 99:
        // D♯/E♭ 6 (99)
        break;
        case 100:
        // E 6 (100)
        break;
        case 101:
        // F 6 (101)
        break;
        case 102:
        // F♯/G♭ 6 (102)
        break;
        case 103:
        // G 6 (103)
        break;
        case 104:
        // G♯/A♭ 6 (104)
        break;
        case 105:
        // A 6 (105)
        break;
        case 106:
        // A♯/B♭ 6 (106)
        break;
        case 107:
        // B 6 (107)
        break;
        case 108:
        // C 7 (108)
        break;
        case 109:
        // C♯/D♭ 7 (109)
        break;
        case 110:
        // D 7 (110)
        break;
        case 111:
        // D♯/E♭ 7 (111)
        break;
        case 112:
        // E 7 (112)
        break;
        case 113:
        // F 7 (113)
        break;
        case 114:
        // F♯/G♭ 7 (114)
        break;
        case 115:
        // G 7 (115)
        break;
        case 116:
        // G♯/A♭ 7 (116)
        break;
        case 117:
        // A 7 (117)
        break;
        case 118:
        // A♯/B♭ 7 (118)
        break;
        case 119:
        // B 7 (119)
        break;
        case 120:
        // C 8 (120)
        break;
        case 121:
        // C♯/D♭ 8 (121)
        break;
        case 122:
        // D 8 (122)
        break;
        case 123:
        // D♯/E♭ 8 (123)
        break;
        case 124:
        // E 8 (124)
        break;
        case 125:
        // F 8 (125)
        break;
        case 126:
        // F♯/G♭ 8 (126)
        break;
        case 127:
        // G 8 (127)
        break;
        default:
            Trace("ERROR: ParameterChanged(" + param + ", " + value + ")");
            break;
    }
}