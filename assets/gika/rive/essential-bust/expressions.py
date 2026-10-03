from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,hashlib
from scipy.ndimage import distance_transform_edt,binary_dilation
p=Path(__file__).resolve().parent;repo=p.parents[3];out=p/'expressions';out.mkdir(exist_ok=True)
source=repo/'docs/gika/character/reference/gika-authoring-v2-original.png';im=Image.open(source)
assert hashlib.sha256(source.read_bytes()).hexdigest()=='2aea8b3141c195d9f7ce1851a21d5baa618ad78079dbd2295649168cbf9e2fba'
master_face=np.array(Image.open(p.parent.parent/'source/hybrid-bust-v2/layers/face_base_clean.png'))[:,:,3]>0
# Polygon-limited details only. The master face/skin/hair are never copied from a donor.
def feature(name,bbox,poly,center,target):
 rgb=np.array(im.crop(bbox));mask=Image.new('L',(rgb.shape[1],rgb.shape[0]));ImageDraw.Draw(mask).polygon(poly,fill=255);roi=np.array(mask)>0
 r,g,b=rgb.astype(float).transpose(2,0,1)
 skin=(r>130)&(g>65)&(g<170)&(b<135)&(r>1.3*g)&(g>b*1.1)
 ink=((r<130)&(g<105)&(b<100))|((r>175)&(g>165)&(b>145))|((r>150)&(g<100)&(b>65)&(b>g*.9))
 core=roi&ink&~skin
 # Coverage recovered against nearby donor skin; this is matte arithmetic, not inpainting.
 _,idx=distance_transform_edt(~skin,return_indices=True);bg=rgb[idx[0],idx[1]].astype(float)
 _,ci=distance_transform_edt(~core,return_indices=True);fg=rgb[ci[0],ci[1]].astype(float)
 fringe=binary_dilation(core)&roi&~core;den=((fg-bg)**2).sum(2);a=np.divide(((rgb-bg)*(fg-bg)).sum(2),den,out=np.zeros_like(den),where=den>1).clip(0,1)
 alpha=np.where(core,1,np.where(fringe,a,0));rgba=np.zeros((*rgb.shape[:2],4),np.uint8);rgba[:,:,:3]=np.where(core[:,:,None],rgb,fg).clip(0,255);rgba[:,:,3]=(alpha*255).round().astype('uint8');rgba[alpha==0]=0
 layer=Image.fromarray(rgba).transform((135,133),Image.Transform.AFFINE,(1,0,center[0]-target[0]-8,0,1,center[1]-target[1]-8),Image.Resampling.BICUBIC)
 registered=np.array(layer);occluded=int(((registered[:,:,3]>0)&~master_face).sum())
 registered[~master_face]=0  # Master hair/face boundary is authority, never donor geometry.
 layer=Image.fromarray(registered);layer.save(out/(name+'.png'))
 return {'name':name,'sourceBox':bbox,'sourceCenter':center,'neutralAnchor':target,'scale':1,'occludedOutsideMasterFace':occluded,'sourcePolygon':poly,'nontransparentPixels':int((np.array(layer)[:,:,3]>0).sum())}
records=[]
P=(828,417,947,534);C=(946,417,1065,534);A=(594,417,713,534)
for args in [
 ('thinking_eye_L',P,[(70,44),(77,42),(84,44),(89,49),(89,58),(84,63),(73,62),(70,56)],(80,53),(81,55)),
 ('thinking_eye_R',P,[(38,56),(43,51),(50,50),(57,52),(62,57),(62,62),(57,66),(43,65),(38,61)],(51,58),(52,60)),
 ('thinking_brow_L',P,[(68,39),(74,35),(80,35),(85,39),(85,44),(78,41),(70,44)],(77,40),(78,43)),
 ('thinking_brow_R',P,[(42,43),(48,39),(55,39),(59,42),(59,46),(52,44),(44,47)],(51,43),(52,48)),
 ('attentive_eye_L',C,[(67,46),(70,41),(76,40),(82,43),(87,49),(85,57),(79,61),(69,58),(66,52)],(77,51),(81,55)),
 ('attentive_eye_R',C,[(35,56),(39,50),(46,49),(53,51),(57,56),(57,62),(51,66),(39,64),(35,60)],(47,57),(52,60)),
 ('curious_brow_L',C,[(65,37),(70,33),(77,33),(82,37),(83,42),(76,39),(68,42)],(74,38),(78,43)),
 ('curious_mouth',C,[(55,71),(62,67),(69,68),(74,72),(70,77),(60,79),(55,76)],(64,73),(66,75)),
 ('concern_mouth',P,[(60,75),(65,70),(71,69),(76,71),(73,74),(67,74),(61,78)],(68,73),(66,75)),
 ('smile_mouth',A,[(53,65),(59,65),(70,61),(80,57),(79,70),(76,77),(68,82),(59,79),(54,73)],(67,71),(66,75)),
]:records.append(feature(*args))
(out/'registration.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Approved polygon-limited features, nearest donor skin matte, translation only at native scale; no master skin/hair changes','features':records},indent=2)+'\n')
