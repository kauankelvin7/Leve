"""Compose approved v2 textures/meshes into one transparent essential rig. No new pixels."""
from pathlib import Path
import xml.etree.ElementTree as E
import copy
import expressions  # Registered details from the same approved PNG.
p=Path(__file__).resolve().parent
root=E.parse(p.parent/'hybrid-bust-v2/scene.rml').getroot()
board=copy.deepcopy(root.find('Artboard'))
board.set('name','GikaEssential');board.set('viewModelId','0:900');board.set('viewModelInstanceId','0:901')
for child in list(board):
 if child.tag in ['Fill','StateMachine','LinearAnimation']:board.remove(child)
head=board.find('.//RootBone[@name="head"]')
for side,x,y,ident in [('L',16,-38,800),('R',-13,-32,801)]:
 E.SubElement(head,'RootBone',x=str(x),y=str(y),length='0',name='brow_'+side,id='0:'+str(ident))
 tendon=board.find(f'.//Image[@name="brow_{side}"]//Tendon');tendon.set('boneId','0:'+str(ident));tendon.set('tx',str(73+x));tendon.set('ty',str(91+y))
# Variants reuse the neutral master's head mesh: no new bone or semantic state.
variants=[file.stem for file in sorted((p/'expressions').glob('*.png'))]
extra_assets=[]
for index,name in enumerate(variants):
 image=copy.deepcopy(board.find('.//Image[@name="lid_L_closed"]'))
 image.set('name',name);image.set('id','0:'+str(31000+index));image.set('assetId','0:'+str(12000+index));image.set('opacity','0')
 mesh=image.find('Mesh');mesh.set('id','0:'+str(41000+index));mesh.set('name',name+'_mesh')
 board.insert(1,image)
 extra_assets.append(E.Element('ImageAsset',name=name,file='expressions/'+name+'.png',id='0:'+str(12000+index)))
vm=E.Element('ViewModel',name='GikaVisual',id='0:900',defaultInstanceId='0:901')
E.SubElement(vm,'ViewModelPropertyNumber',name='mode',id='0:902')
instance=E.SubElement(vm,'ViewModelInstance',name='Default',id='0:901',exports='true')
E.SubElement(instance,'ViewModelInstanceNumber',propertyValue='0',viewModelPropertyId='0:902')
sm=E.SubElement(board,'StateMachine',name='GikaEssential',id='0:11');layer=E.SubElement(sm,'StateMachineLayer',name='Essential')
anyState=E.SubElement(layer,'AnyState',x='200',y='-200');E.SubElement(layer,'ExitState',x='500',y='-200')
entry=E.SubElement(layer,'EntryState',x='0',y='0');E.SubElement(entry,'StateTransition',stateToId='0:200')
names=['rest','idle','blink','listening','thinking','clarify','success','error','offline']
defaults=[('head',15,0),('head',91,-21),('neck',91,104),('curl',15,0),('side_curls_L',15,0),('side_curls_R',15,0),('eye_L',18,1),('eye_R',18,1),('lid_L_closed',18,0),('lid_R_closed',18,0),('brow_L',91,-38),('brow_R',91,-32),('brow_L_image',18,1),('brow_R_image',18,1),('mouth_neutral',18,1)] + [(name,18,0) for name in variants]
ids={el.get('name'):el.get('id') for el in board.iter() if el.get('id')}
for side in ['L','R']:
 ids['brow_'+side+'_image']=board.find(f'.//Image[@name="brow_{side}"]').get('id')
 ids['brow_'+side]=board.find(f'.//RootBone[@name="brow_{side}"]').get('id')
expressions_by_state={
 'listening':{'eye_L':'attentive_eye_L','eye_R':'attentive_eye_R'},
 'thinking':{'eye_L':'thinking_eye_L','eye_R':'thinking_eye_R','brow_L_image':'thinking_brow_L','brow_R_image':'thinking_brow_R'},
 'clarify':{'eye_L':'attentive_eye_L','eye_R':'attentive_eye_R','brow_L_image':'curious_brow_L','mouth_neutral':'curious_mouth'},
 'success':{'mouth_neutral':'smile_mouth'},
 'error':{'brow_L_image':'thinking_brow_L','brow_R_image':'thinking_brow_R','mouth_neutral':'concern_mouth'},
 'offline':{'eye_L':'lid_L_closed','eye_R':'lid_R_closed'},
}
for mode,name in enumerate(names):
 stateId='0:'+str(200+mode);animId='0:'+str(100+mode)
 E.SubElement(layer,'AnimationState',animationId=animId,id=stateId,x=str(200+(mode%3)*230),y=str((mode//3)*150),reset='true')
 trans=E.SubElement(anyState,'StateTransition',stateToId=stateId,duration='120');cond=E.SubElement(trans,'TransitionViewModelCondition',opValue='equal')
 comp=E.SubElement(cond,'TransitionPropertyViewModelComparator');prop=E.SubElement(comp,'BindablePropertyNumber');E.SubElement(prop,'DataBindContext',sourcePathIds='0:900-0:902',propertyKey='636');E.SubElement(cond,'TransitionValueNumberComparator',value=str(mode))
 duration=60 if name in ['rest','offline','blink','success'] else 360
 anim=E.SubElement(board,'LinearAnimation',duration=str(duration),loopValue='oneShot' if name in ['blink','success'] else 'loop',name=name,id=animId)
 values={(obj,key):[(0,value),(duration,value)] for obj,key,value in defaults}
 # Hold expression, brief anticipation then pauses; no continuous head bobbing.
 tilt={'rest':0,'idle':0,'blink':0,'listening':-.045,'thinking':.038,'clarify':.052,'success':-.012,'error':-.030,'offline':0}[name]
 values['head',15]=[(0,tilt),(duration,tilt)]
 if name in ['listening','thinking','clarify']:
  values['head',15]=[(0,tilt),(45,tilt+.005),(90,tilt),(duration,tilt)]
 if name=='idle':values['neck',91]=[(0,104),(120,103.8),(180,104),(duration,104)]
 if name=='listening':
  values['brow_L',91]=[(0,-39.2),(duration,-39.2)];values['brow_R',91]=[(0,-33.2),(duration,-33.2)]
 if name=='error':values['head',91]=[(0,-20.4),(duration,-20.4)]
 if name=='success':values['head',91]=[(0,-21),(16,-20.4),(32,-21),(60,-21)]
 replacements=expressions_by_state.get(name,{})
 # Every state resets all neutral/variant channels, so no feature survives a transition.
 for neutral,detail in replacements.items():
  values[neutral,18]=[(0,0),(duration,0)];values[detail,18]=[(0,1),(duration,1)]
 if name not in ['rest','offline','error']:
  start=16 if name=='blink' else 190
  if name=='success':start=38
  for side in ['L','R']:
   eye=replacements.get('eye_'+side,'eye_'+side)
   values[eye,18]=[(0,1),(start-3,1),(start,0),(start+4,0),(start+7,1),(duration,1)]
   values['lid_'+side+'_closed',18]=[(frame,1-v) for frame,v in values[eye,18]]
 objects={}
 for (obj,key),keys in values.items():
  if obj not in objects:objects[obj]=E.SubElement(anim,'KeyedObject',objectId=ids[obj])
  prop=E.SubElement(objects[obj],'KeyedProperty',propertyKey=str(key))
  for frame,value in dict(keys).items():E.SubElement(prop,'KeyFrameDouble',frame=str(frame),value=str(value),interpolationType='linear')
new=E.Element('Rive',version='1',kind='fragment');new.append(board);new.append(vm)
for asset in root.findall('ImageAsset'):new.append(copy.deepcopy(asset))
for asset in extra_assets:new.append(asset)
E.indent(new);E.ElementTree(new).write(p/'scene.rml',encoding='unicode');(p/'rive.yaml').write_text('name: gika-essential-bust\n')
