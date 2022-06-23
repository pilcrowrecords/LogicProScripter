Name: Note Event Timing and Triggering Design Pattern
Author(s): Philip Regan
Purpose: 
To find a way to track the predictable triggering of MIDI events across process blocks as the playhead moves along the track. So, once a NoteOn event is triggered, when to trigger a NoteOff to create a quarter note, and how to track the playhead to that point. There are many implementations of this across multiple example scripts and open source projects, but they each have their own 

About the files:

process_blocks_1_5_cycling.js
process_blocks_1_9_no_cycle.js
process_blocks_5_9_cycling.js

These are array of all the process block objects which are traversed while playing a track in the following contexts:

* `process_blocks_1_9_no_cycle' are the process blocks during a single playthrough of 8 bars of music.
* `process_blocks_1_5_cycling' is at least a 3 times repeat of the first 4 bars of music. Assume these bars can be repeated any number of times.
* `process_blocks_5_9_cycling' is at least a 3 times repeat of the first 4 bars of music. Assume these bars can be repeated any number of times.

`process_midi.js' is the Scripter callback function which is called every time a new process block is traversed by the playhead. All of the design pattern's code must fit within this file. There may be variables and functions which exist outside of the function, but everything must be entirely self-contained within this file. No external libraries, no linked files. The other variables provided in the other files may be considered a part of the solution, but 

`note_lengths.js` is a global object which calculates and stores note lengths in beats. Any combination of these values may be used in sequence.

The general approach:

There are two elements which need to be tracked: The playhead location and when the next event is to be triggered. 

There isn't a way to get the exact position of the playhead, only the static process block position is provided and work must be done to mimic of the playhead's traversal across the block.

The event trigger is some musically-important but still arbitrary point in the track when an event is supposed to be triggered.

All units are Beats. 

Caveats
* The Cycle start and end are measured in neatly divisible units like those calculate in `note_lengths.js`. 
* Process blocks are mostly predictable but have some randomness to them. 
* Process blocks may begin before or after the beginning of a cycle, regardless of the cycle's position, and may end before or after the end of a cycle, regardless of position. * That shifting in process block dimensions may be different depending on whether or not the track is cycling.