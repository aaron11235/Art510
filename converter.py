import mido
import csv

file = './mountainking.mid'

# [track, channel, id]{dt: ticks, on|off, ...} -> [start_time_ticks]{...}
f = mido.MidiFile(file)
events = {}
live = {}
for track in f.tracks[1:]:
    track_name = track[0].name
    time_ticks = 0
    for msg in track:
        time_ticks += msg.time
        if msg.type == 'note_on':
            if msg.velocity == 0:
                mid = (msg.channel, msg.note)
                ev = live[mid].pop()
                ev['end_ticks'] = time_ticks
                ev['length_ticks'] = time_ticks - ev['start_ticks']
                
                ev['start_beats'] = ev['start_ticks'] / f.ticks_per_beat
                ev['end_beats'] = ev['end_ticks'] / f.ticks_per_beat
                ev['length_beats'] = ev['end_ticks'] / f.ticks_per_beat
                
                events[(ev['start_ticks'], ev['channel'])] = ev
                #print('end', ev)
            else:
                ev = {
                    'start_ticks': time_ticks,
                    'velocity': msg.velocity,
                    'note': msg.note,
                    'channel': msg.channel,
                    'track': track_name
                }
                
                mid = (msg.channel, msg.note)
                if mid in live:
                    live[mid].append(ev)
                else:
                    live[mid] = [ev]

events = sorted(events.values(), key=lambda ev: (ev['start_ticks'], ev['channel']))
                    
time_signature = 'unknown'
key_signature = 'unknown'
tempo = 'unknown'

i = 0
time_ticks = 0


# tempo: microseconds/beat
# seconds/beat = microseconds/beat / 1,000,000
# seconds/tick = (seconds/beat) / (ticks/beat)

sector_start_s = 0
sector_start_ticks = 0
sector_seconds_per_tick = 0
def get_time_s(time_ticks):
    return sector_start_s + sector_seconds_per_tick * (time_ticks - sector_start_ticks)

def update_to_present():
    global i
    while i < len(events) and events[i]['start_ticks'] < time_ticks:
        events[i]['time_signature'] = time_signature
        events[i]['key_signature'] = key_signature
        
        events[i]['start_s'] = get_time_s(events[i]['start_ticks'])
        events[i]['end_s'] = get_time_s(events[i]['end_ticks'])
        events[i]['length_s'] = events[i]['end_s'] - events[i]['start_s']
        i += 1

sectors = []
sectors.append({'start_ticks': 0, 'start_s': 0})
        
for meta in f.tracks[0]:
    time_ticks += meta.time
    
    update_to_present()
    
    if meta.type == 'time_signature':
        time_signature = f'{meta.numerator} {meta.denominator}'
    if meta.type == 'key_signature':
        key_signature = meta.key
    if meta.type == 'set_tempo':
        sector_start_s = get_time_s(time_ticks)
        # DO THIS SECOND (relies on previous sector_start_s)
        sector_start_ticks = time_ticks
        sector_seconds_per_tick = (meta.tempo / 1000000) / f.ticks_per_beat
        
        seconds_per_beat = meta.tempo / 1000000
        
        sectors[-1]['end_ticks'] = sector_start_ticks
        sectors[-1]['end_s'] = sector_start_s
        sectors.append({'start_ticks': sector_start_ticks, 'start_s': sector_start_s, 'seconds_per_tick': sector_seconds_per_tick, 'seconds_per_beat': seconds_per_beat})

time_ticks = max(ev['end_ticks'] for ev in events) + 1
update_to_present()
sectors[-1]['end_ticks'] = sector_start_ticks
sectors[-1]['end_s'] = sector_start_s


with open(file + '.csv', 'w', newline='') as o:
    writer = csv.DictWriter(o, fieldnames = ['start_ticks'] + sorted(events[0].keys() - {'start_ticks'}))
    writer.writeheader()
    for event in events:
        writer.writerow(event)

with open(file + '.sectors.csv', 'w', newline='') as o:
    writer = csv.DictWriter(o, fieldnames = ['start_ticks', 'end_ticks', 'start_s', 'end_s', 'seconds_per_tick', 'seconds_per_beat'])
    writer.writeheader()
    for sector in sectors:
        writer.writerow(sector)