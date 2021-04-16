let started = false
let start_time

// to use: mappings[input][output](value)
// inputs: 
// - 'velocity' : 0-127
// - 'pitch': 0-11
// - 'octave': 0-7
// - 'key': 1-12
// outputs:
// - 'hue': 0-1
// - 'saturation': 0-1
// - 'lightness': 0.2-0.8
// - 'height': 0-max_height
let input_to_0_1 = {
    'velocity': (x) => map(x, 0, 127, 0, 1),
    'pitch': (x) => map(x, 0, 11, 0, 1),
    'octave': (x) => map(x, 0, 7, 0, 1),
    'key_signature': (x) => map(x, 1, 12, 0, 1),
}
let _0_1_to_output = {
    'hue': (x) => x,
    'saturation': (x) => map(x, 0, 1, 0.3, 1),
    'lightness': (x) => map(x, 0, 1, 0.2, 0.8),
    'height': (x) => map(x, 0, 1, 0, max_height),
}
let mapping = {
    'height': 'velocity',
    'saturation': 'octave', 
    'hue': 'pitch', 
    'lightness': 'key_signature', 
}

//Declare my attributes
const fold = (reducer, init, xs) => {
    let acc = init;
    for (const x of xs) {
        acc = reducer(acc, x);
    }
    return acc;
};



let key_mod = {
    'C': 1,
    'G': 2,
    'D': 10,
    'A': 4,
    'E': 5,
    'B': 6,
    'F#': 7,
    'C#': 8,
    'F': 9,
    'Bb': 3,
    'Eb': 11,
    'Ab': 12,
} //mapped to lighness



let channel_mod = {
    0: 0,
    1: 100,
    2: 200,
} //mapped to verticle displacement

let width_mul = 150 //scales width to make notes visible
let oscs
let table
let sectors

//define canvas height, used in volume calculation
let max_height = 350
//define canvas initial background brightness
let background_lighness = .8
let background_color = 1

let min_spb
let max_spb
let played = {};


function preload() {
    
    // fields: 
    table = loadTable('mountainking.mid.csv', 'csv', 'header')
    sectors = loadTable('mountainking.mid.sectors.csv', 'csv', 'header')

    
}

let text_boxes
let selectors
let start_button
let selectors_2
let 

function setup() {
    createCanvas(1500, max_height*2)
   
    // A triangle oscillator
    oscs = {
        0: new p5.TriOsc(),
        1: new p5.TriOsc()
    }
    // Start silent
    oscs[0].start()
    oscs[0].amp(0)

    oscs[1].start()
    oscs[1].amp(0)

    N = table.getRowCount()

    colorMode(HSL, 1)

    min_spb = 100
    max_spb = 0
    for (let i = 0; i < sectors.getRowCount(); i++) {
        let sector = sectors.rows[i];
        min_spb = Math.min(min_spb, sector.get('seconds_per_beat'))
        max_spb = Math.max(max_spb, sector.get('seconds_per_beat'))
    }

    text_boxes = {}
    selectors = {}
    text_boxes_2={"Background Color:"}
    selectors_2 = {0, .2, .4, .6, .8, 1}
  
    let y = 100;
    let x = 100;
    for (let input_name in input_to_0_1) {
        if (!input_to_0_1.hasOwnProperty(input_name)) continue;
        let text = input_name;
        if (text == 'velocity') {
            text = 'volume';
        }
        text_boxes[input_name] = createSpan(text + ":")
        text_boxes[input_name].position(x, y);
        selectors[input_name] = createSelect();
        for (let output_name in _0_1_to_output) {
            if (!_0_1_to_output.hasOwnProperty(output_name)) continue;

            selectors[input_name].option(output_name)
        }
        selectors[input_name].position(x + 100, y);
        y += 50;
    }
    for (i<text_boxes_2.length){
        let text = text_boxes_2[i];
        text_boxes_2[i] = createSpan(text)
        text_boxes_2[i].position (x, y);
        selectors_2[i] = createSelect();
         for (let output_name in selectors_2) {
            
            selectors[i].option(output_name)
        }
        selectors[i].position(x + 100, y);
        y += 50;
    }
    
    start_button = createButton("start")
    start_button.position(x, y)
    start_button.mouseClicked(() => {
        if (!started) {
            for (let input_name in selectors) {
                if (!selectors.hasOwnProperty(input_name)) continue;

                let output_name = selectors[input_name].value();
                mapping[output_name] = input_name

                console.log(input_name, output_name)

                console.log(selectors[input_name], text_boxes[input_name])
                selectors[input_name].hide()
                text_boxes[input_name].hide()
            }
            start_button.hide()

            console.log("starting");
            //MIDI.Player.start();
            started = true
            start_time = millis() / 1000 + 1.2

            //start_time = millis() / 1000
        }
    })

}


function seconds_to_x_pixels(s, time_window_start, time_window_size) {
    return ((s - time_window_start) / time_window_size) * width + 200
}

function get_output(inputs, output_name) {
    let input_name = mapping[output_name]
    let input = inputs[input_name]
    let _0_1 = input_to_0_1[input_name](input)
    let output = _0_1_to_output[output_name](_0_1)
    return output
}

function draw() {
    background(background_color, 0, background_lighness)
    if (!started) {
        return;
    }
    ellipse(0, 0, 10, 10)
    let cur_time = millis() / 1000

    let time_window_start = cur_time - start_time
    let time_window_size = 5

    for (let i = 0; i < sectors.getRowCount(); i++) {
        let sector = sectors.rows[i]
        let spb = sector.get('seconds_per_beat')
        let start_s = sector.get('start_s')
        let end_s = sector.get('end_s')
        noStroke()
        fill(map(spb, min_spb, max_spb, 0.2, 0.8));

        let start_px = seconds_to_x_pixels(start_s, time_window_start, time_window_size)
        let end_px = seconds_to_x_pixels(end_s, time_window_start, time_window_size)
        let length_px = end_px - start_px
        rect(start_px, -5, length_px, height+5)
        
        
    }

    stroke(color(1, 0, background_lighness))


    // start_ticks,channel,end_beats,end_s,end_ticks,key_signature,length_beats,length_s,length_ticks
    // note,start_beats,start_s,time_signature,track,velocity
    
    let inputs = {
        'key': 0,
        'pitch': 0,
        'octave': 0,
        'velocity': 0
    }
    
    for (let i = 0; i < N; i++) {
        let row = table.rows[i]
        let start_s = row.get('start_s')

        if (time_window_start > start_s && !played[i]) {
            played[i] = true
            playNote(row.get('note'), row.get('length_s'), row.get('channel'), row.get('velocity'))
        }

        if (row.get('end_s') < time_window_start || row.get('start_s') > time_window_start + time_window_size) {
            continue;
        }
        let channel = row.get('channel')
        let length_s = row.get('length_s')


        let note = parseFloat(row.get('note'))
        inputs['pitch'] = note % 12
        inputs['octave'] = (note+11)/12
        inputs['velocity'] = parseFloat(row.get('velocity'))
        inputs['key_signature'] = key_mod[row.get('key_signature')]

        let h = get_output(inputs, 'hue')
        let l = get_output(inputs, 'lightness')
        let s = get_output(inputs, 'saturation')
        let note_height = get_output(inputs, 'height')

        fill(h, s, l)

        let y
    
        if (channel == 1) {
            y = max_height*3/2 
        } else if (channel == 0) {
            y = max_height/2
        }

        let x = seconds_to_x_pixels(start_s, time_window_start, time_window_size)
        let note_width = (length_s / time_window_size) * width

        rect(x,y-note_height/2,note_width,note_height) //+200 creates and offset from the side of the page
    }  

    stroke(0,0,0)
    line(200, 0, 200, max_height*2) //creates a verticle line near the left of the page that notes dissapear off

    
    
}


// A function to play a note
function playNote(note, duration, channel, velocity) {
    let osc = oscs[channel]
    osc.start()
    osc.freq(midiToFreq(note))
    //osc.amp(parseFloat(velocity) / 128)
    // Fade it in
    osc.fade(parseFloat(velocity) / 128, .05)

    //console.log('duration', duration)

    //osc.stop(parseFloat(duration))

    // If we set a duration, fade it out
    setTimeout(function () {
        osc.fade(0, 0.05)
    }, duration * 1000)
    
}

function mouseClicked() {
}
