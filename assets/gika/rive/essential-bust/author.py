"""Compose approved v2 textures/meshes into one transparent essential rig. No new pixels."""
from pathlib import Path
import xml.etree.ElementTree as E
import copy
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
vm=E.Element('ViewModel',name='GikaVisual',id='0:900',defaultInstanceId='0:901')
E.SubElement(vm,'ViewModelPropertyNumber',name='mode',id='0:902')
instance=E.SubElement(vm,'ViewModelInstance',name='Default',id='0:901',exports='true')
E.SubElement(instance,'ViewModelInstanceNumber',propertyValue='0',viewModelPropertyId='0:902')
sm=E.SubElement(board,'StateMachine',name='GikaEssential',id='0:11');layer=E.SubElement(sm,'StateMachineLayer',name='Essential')
anyState=E.SubElement(layer,'AnyState',x='200',y='-200');E.SubElement(layer,'ExitState',x='500',y='-200')
entry=E.SubElement(layer,'EntryState',x='0',y='0');E.SubElement(entry,'StateTransition',stateToId='0:200')
names=['rest','idle','blink','listening','thinking','clarify','success','error','offline']
defaults=[('head',15,0),('head',91,-21),('neck',91,104),('curl',15,0),('side_curls_L',15,0),('side_curls_R',15,0),('eye_L',17,1),('eye_R',17,1),('eye_L',18,1),('eye_R',18,1),('lid_L_closed',18,0),('lid_R_closed',18,0),('brow_L',91,-38),('brow_R',91,-32)]
ids={el.get('name'):el.get('id') for el in board.iter() if el.get('id')}
for mode,name in enumerate(names):
 stateId='0:'+str(200+mode);animId='0:'+str(100+mode)
 E.SubElement(layer,'AnimationState',animationId=animId,id=stateId,x=str(200+(mode%3)*230),y=str((mode//3)*150),reset='true')
 trans=E.SubElement(anyState,'StateTransition',stateToId=stateId,duration='120');cond=E.SubElement(trans,'TransitionViewModelCondition',opValue='equal')
 comp=E.SubElement(cond,'TransitionPropertyViewModelComparator');prop=E.SubElement(comp,'BindablePropertyNumber');E.SubElement(prop,'DataBindContext',sourcePathIds='0:900-0:902',propertyKey='636');E.SubElement(cond,'TransitionValueNumberComparator',value=str(mode))
 duration=60 if name in ['rest','offline','blink','success'] else 240
 anim=E.SubElement(board,'LinearAnimation',duration=str(duration),loopValue='oneShot' if name in ['blink','success'] else 'loop',name=name,id=animId)
 values={(obj,key):[(0,value),(duration,value)] for obj,key,value in defaults}
 if name in ['idle','listening','thinking','clarify','error']:
  tilt={'idle':0,'listening':-.018,'thinking':.018,'clarify':.032,'error':-.026}[name]
  values['head',15]=[(0,tilt),(60,tilt+.006),(180,tilt-.006),(240,tilt)]
  values['neck',91]=[(0,104),(120,103.7),(240,104)];values['curl',15]=[(0,0),(120,.010),(240,0)]
  for side in ['L','R']:values['side_curls_'+side,15]=[(0,0),(120,.004 if side=='L' else -.004),(240,0)]
 if name=='listening':values['brow_L',91]=[(0,-38.4),(240,-38.4)];values['brow_R',91]=[(0,-32.4),(240,-32.4)]
 if name in ['thinking','clarify']:values['brow_L',91]=[(0,-38.5),(240,-38.5)]
 if name=='error':values['head',91]=[(0,-20.5),(240,-20.5)]
 if name=='success':values['head',91]=[(0,-21),(16,-20.3),(32,-21),(60,-21)];values['head',15]=[(0,0),(16,.015),(32,0),(60,0)]
 if name not in ['rest','offline','error']:
  offset=-30 if name in ['blink','success'] else 0
  for side in ['L','R']:
   values['eye_'+side,17]=[(max(0,f+offset),v) for f,v in [(0,1),(40,1),(44,.65),(46,.02),(50,.02),(54,.65),(56,1)]]+[(duration,1)]
   values['eye_'+side,18]=[(max(0,f+offset),v) for f,v in [(0,1),(44,1),(46,0),(50,0),(52,1)]]+[(duration,1)]
   values['lid_'+side+'_closed',18]=[(f,1-v) for f,v in values['eye_'+side,18]]
 objects={}
 for (obj,key),keys in values.items():
  if obj not in objects:objects[obj]=E.SubElement(anim,'KeyedObject',objectId=ids[obj])
  prop=E.SubElement(objects[obj],'KeyedProperty',propertyKey=str(key))
  for frame,value in dict(keys).items():E.SubElement(prop,'KeyFrameDouble',frame=str(frame),value=str(value),interpolationType='linear')
new=E.Element('Rive',version='1',kind='fragment');new.append(board);new.append(vm)
for asset in root.findall('ImageAsset'):new.append(copy.deepcopy(asset))
E.indent(new);E.ElementTree(new).write(p/'scene.rml',encoding='unicode');(p/'rive.yaml').write_text('name: gika-essential-bust\n')
