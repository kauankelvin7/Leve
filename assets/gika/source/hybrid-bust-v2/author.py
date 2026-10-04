"""Gika v2 authoring: explicit masks, adjacent-color backing and registered source lids.
No ML, generative inpainting, tracing or identity redesign. Derived from v1 RML.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage as ndi
import xml.etree.ElementTree as E
import copy,json,hashlib,sys
repo=Path(__file__).resolve().parents[4]
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/tmp/gika-hybrid-bust-v2');(root/'layers').mkdir(parents=True,exist_ok=True)
src=repo/'docs/gika/character/reference/gika-authoring-v2-original.png';
assert hashlib.sha256(src.read_bytes()).hexdigest()=='2aea8b3141c195d9f7ce1851a21d5baa618ad78079dbd2295649168cbf9e2fba'
box=(477,417,596,534)
rgb=np.array(Image.open(src).convert('RGB').crop(box));h,w=rgb.shape[:2]
def poly(points):
 im=Image.new('1',(w,h));ImageDraw.Draw(im).polygon(points,fill=1);return np.array(im,dtype=bool)
chroma=rgb.max(2).astype(int)-rgb.min(2).astype(int)
seed=(rgb.mean(2)<210)|((chroma>25)&(rgb.mean(2)<240))
labels,n=ndi.label(ndi.binary_closing(seed));sizes=np.bincount(labels.ravel());sizes[0]=0
fg=ndi.binary_fill_holes(labels==sizes.argmax())
fg|=poly([(31,116),(33,106),(43,100),(55,101),(62,106),(73,106),(85,101),(101,107),(105,116)])
# White neutral islands outside face/shirt are background, not hair highlights.
protected=poly([(60,28),(74,26),(90,38),(96,50),(96,70),(89,80),(74,88),(54,84),(37,75),(35,54),(46,46),(52,38)])|poly([(29,98),(48,97),(63,105),(81,98),(105,104),(110,117),(26,117)])
fg &= ~((rgb.mean(2)>210)&(chroma<24)&~protected)
# Remove background contribution only along the silhouette's 1-pixel edge.
core=ndi.binary_erosion(fg);edge=fg&~core
_,ix=ndi.distance_transform_edt(~core,return_indices=True);near=rgb[tuple(ix)].astype(float)
_,ox=ndi.distance_transform_edt(fg,return_indices=True);background=rgb[tuple(ox)].astype(float)
v=near-background;alpha=np.ones((h,w),float)
alpha[edge]=np.clip(np.sum((rgb.astype(float)-background)*v,axis=2)[edge]/np.maximum(np.sum(v*v,axis=2)[edge],1),.02,1)
clean=rgb.copy();clean[edge]=near[edge].astype('uint8')
# Actual dark-background QA exposed light matte islands up to 4px inside curls.
# Decontaminate only low-chroma hair fringe with adjacent same-source dark hair;
# face/shirt and the signature-purple pixels are excluded. No new silhouette.
Y,X=np.indices((h,w))
hair_core=core&~protected&(rgb.mean(2)<125)
near_distance,hair_ix=ndi.distance_transform_edt(~hair_core,return_indices=True)
signature_color=(rgb[:,:,2].astype(int)>rgb[:,:,1].astype(int)+18)&(rgb[:,:,0].astype(int)>rgb[:,:,1].astype(int)+12)&(X>=80)
shirt_boundary=poly([(27,96),(48,94),(63,103),(81,94),(109,102),(114,117),(25,117)])
hair_matte=fg&~protected&~shirt_boundary&(Y<116)&(rgb.mean(2)>100)&(chroma<45)&(near_distance<=3)&~signature_color
hair_color=rgb[tuple(hair_ix)].astype(float);v=hair_color-background
coverage=np.clip(np.sum((rgb.astype(float)-background)*v,axis=2)/np.maximum(np.sum(v*v,axis=2),1),0,1)
alpha[hair_matte]=coverage[hair_matte];clean[hair_matte]=hair_color[hair_matte].astype('uint8')
a=np.where(fg,np.round(alpha*255),0).astype('uint8')
regions=[
 ('eye_L',[(70,49),(76,45),(86,46),(93,51),(93,60),(86,64),(73,62),(69,56)]),
 ('eye_R',[(40,54),(47,50),(59,51),(65,55),(65,65),(57,69),(44,67),(39,62)]),
 ('brow_L',[(69,40),(78,38),(85,40),(86,45),(70,47)]),
 ('brow_R',[(43,45),(53,43),(61,46),(61,50),(43,51)]),
 ('mouth_neutral',[(58,71),(71,69),(77,72),(75,78),(64,81),(57,77)]),
 ('signature_purple_curl',[(81,27),(93,27),(99,40),(110,53),(109,71),(110,89),(103,104),(93,104),(88,95),(90,80),(87,65),(86,52),(80,41)]),
 ('face_visible',[(61,32),(73,29),(86,37),(92,51),(94,66),(87,76),(72,85),(57,82),(45,75),(40,65),(42,54),(50,49),(53,40)]),
 ('neck_shoulders_visible',[(61,82),(75,81),(77,94),(88,100),(102,108),(106,117),(27,117),(32,106),(45,99),(60,94)]),
 ('hair_front_visible',[(30,21),(66,6),(88,24),(82,35),(61,42),(52,51),(40,55),(28,49)]),
 ('side_curls_L_visible',[(103,49),(119,48),(119,113),(100,114),(100,101),(108,84)]),
 ('side_curls_R_visible',[(0,48),(29,49),(31,79),(30,116),(0,116)]),
]
# Signature is permanent: isolate its entire approved contour before eye/face masks.
regions=[r for r in regions if r[0]=='signature_purple_curl']+[r for r in regions if r[0]!='signature_purple_curl']
remaining=fg.copy();masks={}
for name,points in regions:
 m=poly(points)&remaining
 if name=='neck_shoulders_visible':
  m |= remaining & (np.indices((h,w))[0]>=92) & (rgb.mean(2)>165) & (chroma<65)
 if name=='signature_purple_curl':m&=(rgb[:,:,2].astype(int)>rgb[:,:,1].astype(int)+18)&(rgb[:,:,0].astype(int)>rgb[:,:,1].astype(int)+12)
 masks[name]=m;remaining&=~m
masks['hair_back_visible']=remaining
assert np.array_equal(sum(m.astype(int) for m in masks.values()),fg.astype(int))
feature= np.logical_or.reduce([masks[k] for k in ['eye_L','eye_R','brow_L','brow_R','mouth_neutral']])
face=masks['face_visible']|feature
# Backing uses only neighbouring skin from this same face, not another face.
skin=face&~feature&(rgb[:,:,0]>140)&(rgb[:,:,1]>60)&(rgb[:,:,1]<175)&(rgb[:,:,2]<115)&(rgb[:,:,0]>rgb[:,:,1]+35)
_,ni=ndi.distance_transform_edt(~skin,return_indices=True)
backing=clean.astype(float).copy();backing[feature]=clean[tuple(ni)][feature]
# Harmonic relaxation restricted to hidden feature pixels, skin-valued boundary.
field=backing.copy();support=ndi.binary_dilation(feature,iterations=2)&face
field[support&~skin]=clean[tuple(ni)][support&~skin]
for _ in range(160):
 avg=ndi.convolve(field,np.array([[0,1,0],[1,0,1],[0,1,0]])[:,:,None]/4,mode='nearest');field[feature]=avg[feature]
backing[feature]=field[feature];backing=np.clip(np.round(backing),0,255).astype('uint8')
layers={}
def rgba(colors,mask,opacity=None):
 out=np.zeros((h,w,4),dtype='uint8');out[:,:,:3]=np.where(mask[:,:,None],colors,0);out[:,:,3]=np.where(mask,a if opacity is None else opacity,0);return out
for name,m in masks.items():layers[name]=rgba(clean,m)
layers['face_base_clean']=rgba(backing,face);del layers['face_visible']
# Minimal padded overlap: hidden, clipped inside the original silhouette.
pads={}
for name,iters in [('hair_back_visible',3),('hair_front_visible',2),('side_curls_L_visible',2),('side_curls_R_visible',2),('neck_shoulders_visible',4)]:
 m=masks[name];valid=m.copy()
 if name.startswith('hair_') or name.startswith('side_'):valid&=(rgb[:,:,0]<115)&(rgb[:,:,1]<85)
 else:valid&=skin|( (rgb[:,:,0]>140)&(rgb[:,:,1]>65)&(rgb[:,:,1]<170)&(rgb[:,:,2]<115))
 if not valid.any():continue
 _,nix=ndi.distance_transform_edt(~valid,return_indices=True)
 added=ndi.binary_dilation(m,iterations=iters)&fg&~m
 # Underlap must be hidden by a higher layer at rest; never pad onto an exposed shirt.
 draw_order=list(masks)
 higher=np.logical_or.reduce([masks[k] for k in draw_order[:draw_order.index(name)]])
 added &= higher & (a==255)
 if name=='neck_shoulders_visible':added&=face&poly([(48,77),(81,77),(85,103),(43,103)])
 cols=clean[tuple(nix)];layers[name][added,:3]=cols[added];layers[name][added,3]=a[added]
 pads[name]=int(added.sum())
# Closed lashes from the approved Carinhosa expression, excluding hands/hair/brows.
donorbox=(1413,417,1532,534);donor=np.array(Image.open(src).convert('RGB').crop(donorbox))
lidmeta={}
for side,points,center,target,sx,sy in [
 ('L',[(72,53),(73,48),(79,44),(84,44),(88,47),(88,51),(83,52),(78,52),(74,55)],(80,49),(81,55),1.17,.85),
 ('R',[(40,60),(40,55),(44,51),(49,50),(54,53),(58,56),(58,61),(53,59),(47,57),(42,61)],(48,56),(52,60),1.18,.85),
]:
 region=poly(points);luma=donor.mean(2);dark=region&(luma<72)
 _,idx=ndi.distance_transform_edt(~dark,return_indices=True);f=donor[tuple(idx)].astype(float)
 # The reference's own orange skin is the local matte background.
 donor_skin=(donor[:,:,0]>155)&(donor[:,:,1]>70)&(donor[:,:,1]<175)&(donor[:,:,2]<105)&~region
 _,idx=ndi.distance_transform_edt(~donor_skin,return_indices=True);bg=donor[tuple(idx)].astype(float)
 vec=f-bg;cov=np.clip(np.sum((donor-bg)*vec,axis=2)/np.maximum(np.sum(vec*vec,axis=2),1),0,1)
 cov[~region]=0;cov[cov<.12]=0
 # Keep dark original pixels, decontaminate only antialiased fringe.
 colors=donor.copy();colors[(cov>0)&(cov<.98)]=f[(cov>0)&(cov<.98)].astype('uint8')
 img=np.zeros((h,w,4),dtype='uint8');img[:,:,:3]=np.where((cov>0)[:,:,None],colors,0);img[:,:,3]=np.round(cov*255).astype('uint8')
 # Inverse affine for source-to-neutral registration; no eye shape generation.
 tx=target[0]-sx*center[0];ty=target[1]-sy*center[1]
 transformed=Image.fromarray(img).transform((w,h),Image.Transform.AFFINE,(1/sx,0,-tx/sx,0,1/sy,-ty/sy),Image.Resampling.BICUBIC)
 layers['lid_'+side+'_closed']=np.array(transformed)
 lidmeta[side]={'sourceBox':donorbox,'sourcePolygon':points,'sourceCenter':center,'targetCenter':target,'scale':[sx,sy],'method':'registered approved closed lash; local matte removal; no generative drawing'}
# Keep motion inside the artboard without cropping hair. Native source is not upscaled.
native_size=[w,h];margin=8
layers={n:np.pad(img,((margin,margin),(margin,margin),(0,0))) for n,img in layers.items()}
for name,img in layers.items():Image.fromarray(img).save(root/'layers'/f'{name}.png')
Image.fromarray(np.pad(rgba(clean,fg),((margin,margin),(margin,margin),(0,0)))).save(root/'source-bust-matte-clean.png')
Image.fromarray(np.pad(rgba(rgb,fg,fg.astype('uint8')*255),((margin,margin),(margin,margin),(0,0)))).save(root/'source-bust-before-matte.png')
# Reuse v1 source scene/bones/meshes/state machines; adapt geometry to new source.
w+=2*margin;h+=2*margin
doc=E.parse(repo/'assets/gika/rive/hybrid-bust-spike/scene.rml').getroot()
bonespec={'body':(0,0,None),'neck':(65,104,'body'),'head':(65,83,'neck'),'curl':(95,37,'head'),'eye_L':(81,55,'head'),'eye_R':(52,60,'head'),'side_curls_L':(109,77,'head'),'side_curls_R':(20,77,'head')}
bonespec={n:(x+margin,y+margin,parent) for n,(x,y,parent) in bonespec.items()}
assetnames=list(layers);assets={name:f'0:{11000+j}' for j,name in enumerate(assetnames)}
for j,b in enumerate(doc.findall('Artboard')):
 old=b.attrib['name'];b.attrib.update(width=str(w),height=str(h),x=str(j*(w+20)),name=old.replace('GikaHybrid','GikaHybridV2').replace('BlinkProbe','Blink'))
 ids={n.attrib['name']:n.attrib['id'] for n in b.iter('RootBone')}
 for n in b.iter('RootBone'):
  x,y,parent=bonespec[n.attrib['name']];px,py=bonespec[parent][:2] if parent else (0,0);n.attrib.update(x=str(x-px),y=str(y-py))
 images={n.attrib['name']:n for n in b.findall('Image')}
 for side in ['L','R']:
  obj=copy.deepcopy(images['eye_'+side]);obj.attrib.update(name='lid_'+side+'_closed',id=f'0:{30000+j*100+int(side=="R")}',opacity='0');b.insert(list(b).index(images['eye_'+side]),obj);images[obj.attrib['name']]=obj
 for name,im in images.items():
  if name=='face_visible':name='face_base_clean';im.attrib['name']=name
  im.attrib['assetId']=assets[name]
  mesh=im.find('Mesh');mesh.attrib['id']=f'0:{40000+j*100+assetnames.index(name)}';mesh.attrib['name']=name+'_mesh'
  for vert in list(mesh):
   if vert.tag in ['MeshVertex','ContourMeshVertex']:
    vert.attrib['x']=str(float(vert.attrib['u'])*w);vert.attrib['y']=str(float(vert.attrib['v'])*h)
    if name.startswith('lid_'):vert.find('Weight').attrib['values']='255'
  for t in mesh.find('Skin').findall('Tendon'):
   bn='head' if name.startswith('lid_') and t.attrib['name']!='body_bind' else t.attrib['name'].replace('_bind','')
   t.attrib.update(boneId=ids[bn],tx=str(bonespec[bn][0]),ty=str(bonespec[bn][1]))
 anim=b.find('LinearAnimation')
 for prop in anim.findall('./KeyedObject/KeyedProperty'):
  if prop.attrib['propertyKey']=='91':
   for k in prop:k.attrib['value']=str(104+(float(k.attrib['value'])-86)*h/104)
 if 'Blink' in old or 'Idle' in old:
  if 'Blink' in old:
   for obj in list(anim):anim.remove(obj)
  def key(objid,prop,frames):
   ob=E.SubElement(anim,'KeyedObject',objectId=objid);pr=E.SubElement(ob,'KeyedProperty',propertyKey=str(prop))
   for frame,value in frames:E.SubElement(pr,'KeyFrameDouble',frame=str(frame),value=str(value),interpolationType='linear')
  for side in ['L','R']:
   key(ids['eye_'+side],17,[(0,1),(40,1),(44,.65),(46,.02),(50,.02),(54,.65),(56,1),(240,1)])
   key(images['eye_'+side].attrib['id'],18,[(0,1),(44,1),(46,0),(50,0),(52,1),(240,1)])
   key(images['lid_'+side+'_closed'].attrib['id'],18,[(0,0),(44,0),(46,1),(50,1),(52,0),(240,0)])
for a0 in list(doc.findall('ImageAsset')):doc.remove(a0)
for n,aid in assets.items():E.SubElement(doc,'ImageAsset',file='layers/'+n+'.png',name=n,id=aid)
E.indent(doc);E.ElementTree(doc).write(root/'scene.rml',encoding='unicode');(root/'rive.yaml').write_text('name: gika-hybrid-bust-v2\n')
meta={'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'sourceBox':box,'nativeSize':native_size,'assetCanvas':[w,h],'sourceOffset':[margin,margin],'sourceFormat':'PNG RGB','faceBackingPixels':int(feature.sum()),'faceBackingMethod':'nearest adjacent same-face skin, harmonic relaxation only in hidden feature masks; no ML','matteBoundaryPixels':int(edge.sum()),'hairMatteInteriorPixels':int(hair_matte.sum()),'underlapAddedPixels':pads,'lidRegistration':lidmeta,'signatureSide':'anatomical LEFT / viewer RIGHT','layerFiles':{n:{'pixelsWithAlpha':int((v[:,:,3]>0).sum()),'sha256':hashlib.sha256((root/'layers'/f'{n}.png').read_bytes()).hexdigest()} for n,v in layers.items()}}
(root/'extraction.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps({k:v for k,v in meta.items() if k not in ['layerFiles','lidRegistration']}))
