let extract_info = (data) => {
    let result = {

    };
    let millisecondsPerBeat
   
    for (var event of data) {
        event = event[0];
    
        if (event.event.type == 'meta' && event.event.subtype == 'setTempo') {
            console.log('found it')
            millisecondsPerBeat = event.event.millisecondsPerBeat
        }
    }
    console.log('ms per beat ', millisecondsPerBeat)
};

let info

window.onload = () => {
    MIDI.loadPlugin({
        instruments: [ "acoustic_grand_piano", "synth_drum" ],
        onsuccess: () => {
            console.log("MIDI DIDNT CATCH ON FIRE")

            MIDI.Player.loadFile("mountainking.mid", () => {
                console.log("Started");
                MIDI.Player.start();
                console.log('after start, data: ', MIDI.Player.data)
                info = extract_info(MIDI.Player.data)
            })
            //MIDI.Player.addListener((data) => console.log(data))
        }
    })
};

let note_midis = {
    '1': 58,
    '2': 59,
    '3': 60, // middle C
    '4': 61,
    '5': 62,
    '6': 63,
    '7': 64,
    '8': 65,
    '9': 66,
    '10': 67,
    '11': 68,
    '12': 69,
}
/*
let bpm = 105
let bps = bpm / 60
let spb = 1 / bps


let duration_times = {
    'd': spb * 3,
    'c': spb * 2,
    'b': spb,
    'a': spb / 2,
}
*/

let background_color = '#ffffff'

let colors

let dynamic_heights = {
    'ppp': 50,
    'pp': 100,
    'p': 150,
    'mp': 275,
    'mf': 325,
    'f': 400*1.25,
    'ff': 475*1.5,
    'fff': 550,
}

let articulation_weights = {
    's': 0,
    'n': 2,
    't': 10,
}

let accent_amplitudes = {
    'y': 40,
    'n': 5
}

let width_mul = 150

let cur_note = -1
let osc

let overlay

let table
let N

let pitches
let note_types
let note_times
let offsets
let dynamics
let measures
let articulations
let accents

let measure_offset_pixels = 20

let last_start = 0
let wiggle_amplitude = 0

function preload() {
    //overlay = loadShader('overlay.vert', 'overlay.frag')

    // fields: measure,note_type,pitch,articulation,accent,dynamic
    table = loadTable('music.csv', 'csv', 'header')

}

function _setup() {
    createCanvas(1500, 700)

    // A triangle oscillator
    osc = new p5.TriOsc()
    // Start silent
    osc.start()
    osc.amp(0)

    N = table.getRowCount()

    note_types = table.getColumn('note_type')
    note_times = note_types.map((duration) => duration_times[duration])
    pitches = table.getColumn('pitch')
    dynamics = table.getColumn('dynamic')
    measures = table.getColumn('measure')
    articulations = table.getColumn('articulation')
    accents = table.getColumn('accent')

    console.log('loaded', note_types, note_times, pitches)

    let current = 0
    offsets = [] // in units of seconds
    for (let i = 0; i < N; i++) {
        let start = current
        let next = current + note_times[i]
        offsets.push([start, next])
        current = next
    }
    colorMode(HSL, 1)

    colors = {}
    colors[0] = background_color
    for (let i = 1; i < 13; i++) {
        colors[i] = color(i / 13, .4, .6)
    }
}

function _draw() {
    background(background_color)
    ellipse(0, 0, 10, 10)
    let cur_time = millis() / 1000

    stroke(background_color)

    // compute current starting note
    let i
    // detect if we've hit a new note
    for (i = 0; i < N; i++) {
        if (offsets[i][0] > cur_time && cur_time < offsets[i][1]) {
            console.log('hit', i)
            break
        }
    }
    if (i != cur_note) {
        cur_note = i
        // do anything w/ new note
        last_start = cur_time
        amplitude = accent_amplitudes[accents[cur_note]]
        //playNote(note_midis[pitches[i]], note_times[i])
    }

    push()
    translate(-cur_time * width_mul, 0)

    for (let i = 0; i < N; i++) {
        if (accents[i] == 'y') {
            let c = color(colors[pitches[i]])
            let h = hue(c)
            let s = saturation(c)
            let l = lightness(c)
            fill(h, s, l * .9)
        } else {
            fill(colors[pitches[i]])
        }
        strokeWeight(articulation_weights[articulations[i]])

        let start_x = offsets[i][0] * width_mul
        let end_x = offsets[i][1] * width_mul
        let note_width = end_x - start_x

        let note_height = dynamic_heights[dynamics[i]]
        let min = (height - note_height) / 2
        if (measures[i] % 2 == 1) {
            min -= measure_offset_pixels
        } else {
            min += measure_offset_pixels
        }
        /*if (i == cur_note) {
            min += amplitude * Math.sin(
                (cur_time - last_start) * 20
            )
        }*/

        rect(
            start_x,
            min,
            note_width,
            note_height

        )

    }
    pop()

    // overlay
    //overlay.setUniform('u_resolution', [width, height])
    //shader(overlay)
    //rect(0, 0, width, height)

}

// A function to play a note
function playNote(note, duration) {
    osc.freq(midiToFreq(note))
    // Fade it in
    osc.fade(0.5, 0.2)

    // If we set a duration, fade it out
    if (duration) {
        setTimeout(function () {
            osc.fade(0, 0.2)
        }, duration - 50)
    }
}