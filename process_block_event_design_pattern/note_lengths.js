const NOTE_LENGTH_MAX = 24.0;
const NOTE_DIVISION_MIN = 32.0;
 
const NOTE_LENGTHS_LIB = {
    "1/32" : (NOTE_LENGTH_MAX / 32.0), 
    "1/32d" : (NOTE_LENGTH_MAX / 32.0) + (NOTE_LENGTH_MAX / 32.0) / 2.0, 
    "1/32t" : (NOTE_LENGTH_MAX / 32.0) / 3.0, 
    "1/16" : (NOTE_LENGTH_MAX / 16.0) , 
    "1/16d" : (NOTE_LENGTH_MAX / 16.0) + (NOTE_LENGTH_MAX / 16.0) / 2.0, 
    "1/16t" : (NOTE_LENGTH_MAX / 16.0) / 3.0, 
    "1/8" : (NOTE_LENGTH_MAX / 8.0), 
    "1/8d" : (NOTE_LENGTH_MAX / 8.0) + (NOTE_LENGTH_MAX / 8.0) / 2.0,   
    "1/8t" : (NOTE_LENGTH_MAX / 8.0) / 3.0, 
    "1/4" : (NOTE_LENGTH_MAX / 4.0), 
    "1/4d" : (NOTE_LENGTH_MAX / 4.0) + (NOTE_LENGTH_MAX / 4.0) / 2.0, 
    "1/4t" : (NOTE_LENGTH_MAX / 4.0) / 3.0, 
    "1/2" : (NOTE_LENGTH_MAX / 2.0), 
    "1/2d" : (NOTE_LENGTH_MAX / 2.0) + (NOTE_LENGTH_MAX / 2.0) / 2.0, 
    "1/2t" : (NOTE_LENGTH_MAX / 2.0) / 3.0 , 
    "1" : (NOTE_LENGTH_MAX), 
    "1t" : (NOTE_LENGTH_MAX / 3.0)
};