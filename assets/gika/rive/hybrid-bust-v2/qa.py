from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,math,hashlib,sys,subprocess,os
from scipy import ndimage as ndi
repo=Path(__file__).resolve().parents[4]
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/tmp/gika-hybrid-bust-v2')
if '--capture' in sys.argv:
 cli=os.environ.get('GIKA_RIVE_CLI','rive')
 for theme in ['Light','Dark']:
  for mode in ['Rest','Idle','Blink','OcclusionStress']:
   frames=[1] if mode=='Rest' else [1,60,120,180,240] if mode=='Idle' else [1,40,42,44,45,46,48,50,51,52,54,56,60,240] if mode=='Blink' else [1,30,60,120,180,240]
   jobs=[(f,135,133,f'{mode}{theme}-{f}') for f in frames]+[(1 if mode=='Rest' else 48 if mode=='Blink' else 60,size,size,f'{mode}{theme}-size{size}') for size in [24,32,36,48,64,72]]
   for frame,w,h,name in jobs:
    run=subprocess.run([cli,f'--screenshot={p/name}.png',f'--artboard=GikaHybridV2{mode}{theme}',f'--advance={frame}',f'--viewport={w}x{h}','--fit=contain'],cwd=p,capture_output=True,text=True)
    if run.returncode:raise RuntimeError(run.stdout+run.stderr)
src=np.array(Image.open(repo/'docs/gika/character/reference/gika-authoring-v2-original.png').crop((477,417,596,534)))
curl=np.array(Image.open(p/'layers/signature_purple_curl.png'))[8:125,8:127,3]>0
Y,X=np.indices(src.shape[:2]);canonical=(src[:,:,2].astype(int)>src[:,:,1].astype(int)+18)&(src[:,:,0].astype(int)>src[:,:,1].astype(int)+12)&(X>80)&(Y>20)&(Y<103)&((Y<96)|(X>90))
missing=canonical&~curl;assert not missing.any(),int(missing.sum())
face=ndi.binary_erosion(np.array(Image.open(p/'layers/face_base_clean.png'))[:,:,3]>240,iterations=3)
checks=[];centers=[];restStats={};sizes=[24,32,36,48,64,72];modes=['Rest','Idle','Blink','OcclusionStress'];framesByMode={'Rest':[1],'Idle':[1,60,120,180,240],'Blink':[1,40,42,44,45,46,48,50,51,52,54,56,60,240],'OcclusionStress':[1,30,60,120,180,240]}
for t,bg in [('Light',np.array([255,249,243])),('Dark',np.array([36,33,45]))]:
 for m,frames in framesByMode.items():
  for f in frames:
   angle=0;dy=0
   if m=='OcclusionStress':angle=float(np.interp(f,[0,60,120,180,240],[0,.07,0,-.07,0]))
   if m=='Idle':angle=float(np.interp(f,[0,60,180,240],[0,.0075,-.0075,0]));dy=float(np.interp(f,[0,120,240],[0,-.25*133/104,0]))
   c=math.cos(angle);s=math.sin(angle);cx,cy=73,91;trans=(c,s,cx-c*cx-s*(cy+dy),-s,c,cy+s*cx-c*(cy+dy))
   expected=np.array(Image.fromarray(face).transform((135,133),Image.Transform.AFFINE,trans,Image.Resampling.NEAREST));im=np.array(Image.open(p/f'{m}{t}-{f}.png').convert('RGB'));isbg=np.abs(im.astype(int)-bg).max(2)<=1
   assert not (expected&isbg).any(),(m,t,f,'face hole');assert not isbg[96:103,72:79].any(),(m,t,f,'neck gap')
   roi=np.zeros(im.shape[:2],bool);roi[30:115,95:125]=True
   purple=roi&(im[:,:,2].astype(int)>im[:,:,1].astype(int)+30)&(im[:,:,0].astype(int)>im[:,:,1].astype(int)+15)
   assert purple.sum()>15;_,xs=np.nonzero(purple);assert xs.mean()>73;centers.append(float(xs.mean()));checks.append([m,t,f])
  if m=='Rest':
   original=Image.open(p/'source-bust-matte-clean.png');flat=Image.new('RGBA',original.size,tuple(bg)+(255,));flat.alpha_composite(original);d=np.abs(im.astype(int)-np.array(flat.convert('RGB')).astype(int));restStats[t]={'maxRgbError':int(d.max()),'meanRgbError':float(d.mean()),'pixelsOver1':int((d.max(2)>1).sum())};assert d.max()<=2
  for size in sizes:
   small=np.array(Image.open(p/f'{m}{t}-size{size}.png').convert('RGB'));ys,xs=np.indices(small.shape[:2]);pur=(small[:,:,2].astype(int)>small[:,:,1].astype(int)+25)&(small[:,:,0].astype(int)>small[:,:,1].astype(int)+15)&(xs>size*.56)&(ys<size*.8)
   assert pur.any(),(m,t,size,'curl absent at small size')
# Rebuild review sheets from final captures.
o=Image.new('RGB',(660,760),'#eee7f0');d=ImageDraw.Draw(o)
for row,(t,m) in enumerate((t,m) for t in ['Light','Dark'] for m in modes):
 y=row*95;d.text((4,y+3),m+'/'+t,fill='black')
 for col,size in enumerate(sizes):
  x=col*110;d.text((x+5,y+18),str(size)+'px',fill='black');o.paste(Image.open(p/f'{m}{t}-size{size}.png'),(x+55-size//2,y+55-size//2))
o.save(p/'small-sizes.png')
frames=framesByMode['Blink'];o=Image.new('RGB',(945,620),'#eee7f0');d=ImageDraw.Draw(o)
for j,t in enumerate(['Light','Dark']):
 for i,f in enumerate(frames):
  x=i%7*135;y=j*310+i//7*155;d.text((x,y),t+' frame'+str(f),fill='black');o.paste(Image.open(p/f'Blink{t}-{f}.png'),(x,y+20))
o.save(p/'blink-sequence.png')
sequence=[]
for f in frames:
 c=Image.new('RGB',(270,133));c.paste(Image.open(p/f'BlinkLight-{f}.png'),(0,0));c.paste(Image.open(p/f'BlinkDark-{f}.png'),(135,0));sequence.append(c)
durations=[round((frames[i+1]-f)*1000/60) if i<len(frames)-1 else 17 for i,f in enumerate(frames)]
sequence[0].save(p/'blink-motion.png',save_all=True,append_images=sequence[1:],duration=durations,loop=0,disposal=0,blend=0)
o=Image.new('RGB',(1400,600),'#eee7f0');d=ImageDraw.Draw(o)
for j,t in enumerate(['Light','Dark']):
 for i,m in enumerate(['Source']+modes):
  if m=='Source':
   original=Image.open(p/'source-bust-matte-clean.png');im=Image.new('RGBA',original.size,'#fff9f3' if t=='Light' else '#24212d');im.alpha_composite(original)
  else:im=Image.open(p/f'{m}{t}-{1 if m=="Rest" else 48 if m=="Blink" else 60}.png')
  o.paste(im.convert('RGB').resize((270,266),Image.Resampling.NEAREST),(i*280,20+j*300));d.text((i*280,3+j*300),m+'/'+t,fill='black')
o.save(p/'comparison.png')
report={'nativeFramesChecked':len(checks),'smallCapturesChecked':48,'sizes':sizes,'restFidelity':restStats,'backgroundExposureInTransformedFaceInteriorAndNeckSeam':0,'canonicalPurpleHairPixels':int(canonical.sum()),'canonicalPurpleHairPixelsOutsideMasterLayer':int(missing.sum()),'curlCentroidXRange':(min(centers),max(centers)),'faceAxisX':73,'closedLidsProvenance':'Carinhosa expression only; donor hair never copied','anatomicalSide':'LEFT / frontal viewer RIGHT','checks':checks,'limitations':['Hair silhouette contains deliberate transparent negative spaces; not every background-connected component is a defect.','Headless captures and inspected sheets, not final product/browser lifecycle/performance or user final rig approval.','Native portrait119x117; no HD240/fullbody claim.']}
(p/'qa-results.json').write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items() if k not in ['checks','limitations']})
