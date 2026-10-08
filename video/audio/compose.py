#!/usr/bin/env python3
"""Original Leve instrumental and sound design; deterministic, no samples."""
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
import subprocess,json
ROOT=Path(__file__).resolve().parent
SR=48000; DURATION=72; BPM=92; N=SR*DURATION
rng=np.random.default_rng(20261007)
music=np.zeros((N,2)); ui=np.zeros_like(music); transitions=np.zeros_like(music)
def add(dst,x,start,amp=1,pan=0):
    p=int(start*SR); end=min(N,p+len(x)); x=x[:end-p]*amp
    if p<0 or end<=p:return
    dst[p:end,0]+=x*np.sqrt((1-pan)/2);dst[p:end,1]+=x*np.sqrt((1+pan)/2)
def tone(midi,duration,kind='felt'):
    t=np.arange(int(duration*SR))/SR;f=440*2**((midi-69)/12)
    if kind=='pad':
        x=sum(np.sin(2*np.pi*f*h*t+0.1*h)*a for h,a in [(1,1),(2,.16),(3,.07)])
        env=np.minimum(t/.7,1)*np.minimum((duration-t)/1.2,1)
        x*=env*.16
    else:
        x=(np.sin(2*np.pi*f*t+0.001*np.sin(2*np.pi*2*t))+.22*np.sin(2*np.pi*f*2*t)*np.exp(-3*t)+.09*np.sin(2*np.pi*f*3*t)*np.exp(-6*t))
        x*= (1-np.exp(-t/0.012))*np.exp(-t/(.8 if kind=='felt' else 1.8))*.27
    return x
beat=60/BPM; bar=4*beat
# Dmaj9 / Bmin7 / Gmaj9 / Aadd9: warm open voicings, slow harmonic rhythm.
chords=[[50,57,61,64,69],[47,54,57,62,66],[43,50,54,57,62],[45,52,57,59,64]]
for i,start in enumerate(np.arange(0,70,bar*2)):
    chord=chords[i%4]
    for j,m in enumerate(chord): add(music,tone(m,bar*2+1.3,'pad'),start,.18,[-.45,.3,-.15,.5,0][j])
    # sparse felt motifs, not a repeating arpeggio at every beat
    pattern=[(0,2),(1.5,4),(3,3),(5,2),(6.5,4)] if i%2==0 else [(0.5,3),(2,4),(4.5,2),(7,3)]
    for offset,idx in pattern:
        st=start+offset*beat
        add(music,tone(chord[idx]+12,2.9),st,.2 if st<7 else .31,(-.22 if idx%2 else .22))
    if start>=7:
        add(music,tone(chord[0]-12,3.1),start,.18,0)
# airy pulse only during middle, restrained percussion from filtered original noise.
for i,st in enumerate(np.arange(8,65,beat)):
    if 53<st<60:continue
    t=np.arange(int(.075*SR))/SR
    noise=sosfilt(butter(2,1800,fs=SR,output='sos'),rng.normal(size=len(t)))
    add(music,noise*np.exp(-t/.018),st,.009 if i%4 else .014,.35 if i%2 else -.35)
# Gika adds restrained glass colour, three notes, not a jingle.
for st,m in [(43,78),(47.1,81),(51.2,76)]:add(music,tone(m,4,'glass'),st,.12,.25)
# Resolve into D with a soft suspended colour at close.
for m in [50,57,62,66,69]:add(music,tone(m,7,'pad'),65,.23,0)
# Small room reflections create depth, rather than a dry oscillator feel.
for delay,gain in [(.113,.11),(.227,.07),(.389,.04)]:
    k=int(delay*SR);music[k:]+=music[:-k,::-1]*gain
# Envelope makes intro sparse and offline visibly quieter; editorial timing is configurable here.
t=np.arange(N)/SR
env=np.interp(t,[0,.35,4,7,14,21,25,40,49,52,54,58,59.6,64,68,70,72],[0,.4,.48,.68,.83,.86,.84,.9,.95,.72,.46,.48,.68,.75,.9,.72,0])
music*=env[:,None]
EVENTS=[(2.067,'note-save'),(2.50,'connection-down-opening'),(7.73,'task-complete'),(22.35,'mobile-tap'),(28.63,'note-save'),(35.93,'shopping-check'),(41.23,'gika-open'),(45.10,'gika-confirm'),(52.0,'connection-down'),(59.60,'connection-back')]
for st,name in EVENTS:
    dur=.23 if 'tap' in name or 'save' in name else .55
    tt=np.arange(int(dur*SR))/SR
    noise=sosfilt(butter(2,2200,fs=SR,output='sos'),rng.normal(size=len(tt)))
    x=noise*np.exp(-tt/.017)*.013
    pitches=[76] if 'tap' in name or 'save' in name else ([64,69] if 'connection-down' in name else [74,78])
    for j,m in enumerate(pitches):
        part=tone(m,dur,'felt')*.022
        offset=int(j*.07*SR);x[offset:]+=part[:len(x)-offset]
    x*=np.minimum(tt/.006,1)*np.minimum((dur-tt)/.03,1)
    add(ui,x,st,.42 if 'opening' in name else 1,-.12 if 'down' in name else .12)
# Two very quiet paper passes, synchronized to large changes only.
for st in [21,64]:
    tt=np.arange(int(.48*SR))/SR
    noise=sosfilt(butter(2,[350,1700],btype='band',fs=SR,output='sos'),rng.normal(size=len(tt)))
    add(transitions,noise*np.sin(np.pi*tt/.48)**2,st,.005,-.25)
def write(path,x):wavfile.write(str(ROOT/path),SR,x.astype(np.float32))
write('music/leve-original.wav',music);write('ui/leve-ui.wav',ui);write('transitions/leve-paper.wav',transitions)
write('mix/pre-master.wav',music+ui+transitions)
(ROOT/'events.json').write_text(json.dumps({'duration':DURATION,'bpm':BPM,'seed':20261007,'events':[{'time':s,'name':n}for s,n in EVENTS]},indent=2)+'\n')
source=ROOT/'mix/pre-master.wav';target=ROOT/'mix/leve-mix.wav'
f='loudnorm=I=-16:TP=-1.5:LRA=9'
p=subprocess.run(['ffmpeg','-hide_banner','-i',str(source),'-af',f+':print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
measurement=json.JSONDecoder().raw_decode(p.stderr[p.stderr.rfind('{'):])[0];(ROOT/'mix/loudness-pass1.json').write_text(json.dumps(measurement,indent=2)+'\n')
f+=f":measured_I={measurement['input_i']}:measured_TP={measurement['input_tp']}:measured_LRA={measurement['input_lra']}:measured_thresh={measurement['input_thresh']}:offset={measurement['target_offset']}:linear=true:print_format=json"
p=subprocess.run(['ffmpeg','-y','-hide_banner','-i',str(source),'-af',f,'-ar',str(SR),'-c:a','pcm_s24le',str(target)],capture_output=True,text=True,check=True)
(ROOT/'mix/loudness-pass2.json').write_text(json.dumps(json.JSONDecoder().raw_decode(p.stderr[p.stderr.rfind('{'):])[0],indent=2)+'\n')
p=subprocess.run(['ffmpeg','-hide_banner','-i',str(target),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
(ROOT/'mix/loudness-final.json').write_text(json.dumps(json.JSONDecoder().raw_decode(p.stderr[p.stderr.rfind('{'):])[0],indent=2)+'\n')
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(target),'-c:a','aac','-b:a','256k',str(ROOT/'mix/leve-mix.m4a')],check=True)
print((ROOT/'mix/loudness-final.json').read_text())
