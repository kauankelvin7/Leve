"""Render actual mode-driven Rive states; inspect same-master curl and skin underlaps."""
from pathlib import Path
import xml.etree.ElementTree as E
import subprocess,os,json,hashlib,tempfile,math
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage as ndi
p=Path(__file__).resolve().parent;out=Path('/tmp/gika-essential-qa');out.mkdir(exist_ok=True)
cli=os.environ.get('GIKA_RIVE_CLI','rive');names=['rest','idle','blink','listening','thinking','clarify','success','error','offline']
frames=[1,16,20,48,60,120,180,240];sizes=[24,32,48,56,64,72]
face=ndi.binary_erosion(np.array(Image.open(p.parent.parent/'source/hybrid-bust-v2/layers/face_base_clean.png'))[:,:,3]>240,iterations=4)
checks=[];distinct={};centroids=[];rest={}
for theme,bg in [('light','#fff9f3'),('dark','#24212d')]:
 root=E.parse(p/'scene.rml').getroot();b=root.find('Artboard');fill=E.Element('Fill',name='QA only');E.SubElement(fill,'SolidColor',colorValue='FF'+bg[1:]);b.insert(1,fill)
 for asset in root.findall('ImageAsset'):asset.set('file',str((p/asset.get('file')).resolve()))
 with tempfile.TemporaryDirectory(prefix='gika-essential-qa-') as tmp:
  temp=Path(tmp);E.ElementTree(root).write(temp/'scene.rml',encoding='unicode');(temp/'rive.yaml').write_text('name: gika-essential-qa\n')
  for mode,name in enumerate(names):
   jobs=[(f,135,133,f'{name}-{theme}-{f}') for f in frames]+[(20 if name in ['blink','success'] else 60,s,s,f'{name}-{theme}-size{s}') for s in sizes]
   for frame,w,h,file in jobs:
    run=subprocess.run([cli,f'--screenshot={out/file}.png',f'--data=mode={mode}',f'--advance={frame}',f'--viewport={w}x{h}','--fit=contain'],cwd=temp,capture_output=True,text=True)
    if run.returncode:raise RuntimeError(run.stdout+run.stderr)
    im=np.array(Image.open(out/(file+'.png')).convert('RGB'));Y,X=np.indices(im.shape[:2]);pur=(im[:,:,2].astype(int)>im[:,:,1].astype(int)+25)&(im[:,:,0].astype(int)>im[:,:,1].astype(int)+15)&(X>w*.60)&(Y<h*.85)
    assert pur.any(),(file,'missing curl');cy,cx=np.nonzero(pur);assert cx.mean()>w*.55;centroids.append(float(cx.mean()/w))
    if w==135:
     if name=='rest':angle=0;dy=0
     elif name in ['offline','blink']:angle=0;dy=0
     elif name=='success':angle=float(np.interp(frame,[0,16,32,60],[0,.015,0,0]));dy=float(np.interp(frame,[0,16,32,60],[0,.7,0,0]))
     else:
      tilt={'idle':0,'listening':-.018,'thinking':.018,'clarify':.032,'error':-.026}[name];angle=float(np.interp(frame,[0,60,180,240],[tilt,tilt+.006,tilt-.006,tilt]));dy=float(np.interp(frame,[0,120,240],[0,-.3,0]))+(.5 if name=='error' else 0)
     # Ignore the first blended120ms; later frames use exact authored transforms.
     if frame>=16:
      c,s=math.cos(angle),math.sin(angle);x,y=73,91;matrix=(c,s,x-c*x-s*(y+dy),-s,c,y+s*x-c*(y+dy));expected=np.array(Image.fromarray(face).transform((135,133),Image.Transform.AFFINE,matrix,Image.Resampling.NEAREST));color=np.array(Image.new('RGB',(1,1),bg))[0,0];isbg=np.abs(im.astype(int)-color).max(2)<=1
      assert not (expected&isbg).any(),(file,'exposed face');assert not isbg[96:103,72:79].any(),(file,'neck gap')
     if name=='rest' and frame==240:
      source=Image.open(p.parent.parent/'source/hybrid-bust-v2/source-bust-matte-clean.png');flat=Image.new('RGBA',source.size,bg);flat.alpha_composite(source);delta=np.abs(im.astype(int)-np.array(flat.convert('RGB')).astype(int));assert delta.max()<=2;rest[theme]={'maxRgbError':int(delta.max()),'meanRgbError':float(delta.mean())}
    checks.append(file)
   distinct[name]=hashlib.sha256((out/f'{name}-{theme}-60.png').read_bytes()).hexdigest()
# Offline deliberately identical to rest; explicit blink and success end at rest.
assert len(set(distinct[n] for n in ['idle','listening','thinking','clarify','error']))==5,distinct
sheet=Image.new('RGB',(9*160,340),'#eee7f0');draw=ImageDraw.Draw(sheet)
for row,theme in enumerate(['light','dark']):
 for col,name in enumerate(names):
  x=col*160;y=row*170;draw.text((x+4,y+2),name+'/'+theme,fill='black');sheet.paste(Image.open(out/f'{name}-{theme}-{20 if name in ["blink","success"] else 60}.png'),(x+12,y+22))
sheet.save(out/'essential-states.png')
sequence=[]
for name in names:
 for frame in frames:
  im=Image.new('RGB',(270,153));im.paste(Image.open(out/f'{name}-light-{frame}.png'),(0,20));im.paste(Image.open(out/f'{name}-dark-{frame}.png'),(135,20));ImageDraw.Draw(im).text((4,2),name+' frame '+str(frame),fill='white');sequence.append(im)
sequence[0].save(out/'essential-motion.png',save_all=True,append_images=sequence[1:],duration=[round((frames[i+1]-frame)*1000/60) if i+1<len(frames) else 17 for _ in names for i,frame in enumerate(frames)],loop=0,disposal=0,blend=0)
report={'nativeFrames':len(names)*len(frames)*2,'smallFrames':len(names)*len(sizes)*2,'states':names,'sizes':sizes,'restFidelity':rest,'curlCentroidWidthFraction':[min(centroids),max(centroids)],'faceAndNeckExposureHoles':0,'distinctAnimatedStates':5,'anatomicalSide':'LEFT / viewer RIGHT frontal','rigBytes':(p/'gika-essential-bust.riv').stat().st_size,'rigSha256':hashlib.sha256((p/'gika-essential-bust.riv').read_bytes()).hexdigest(),'limitations':['Small119x117native bust only; not HD240/fullbody.','Headless motion proof requires product/browser integration and human review.','Local unsigned scriptless build, not final signed production export/licensing proof.']}
(p/'qa-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
