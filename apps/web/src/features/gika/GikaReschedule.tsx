import { useEffect,useRef,useState } from 'react';
import { type RescheduleDescriptor,type RescheduledTask } from '../../../../../packages/domain/src/gikaReschedule';
import type { GikaRequest } from './conversation';
import { ApiError } from '../../platform/api';
import { Icon } from '../../components/ui/Icon';
import { confirmReschedule } from './rescheduleBridge';
export function GikaReschedule({task,context,active}:{task:RescheduleDescriptor;context:{uid:string;request:GikaRequest};active:boolean}){
 const [state,setState]=useState<'preview'|'pending'|'error'|'conflict'|'cancelled'|'auth'|'done'>('preview');
 const [result,setResult]=useState<RescheduledTask|null>(null);
 const controller=useRef<AbortController|null>(null),action=useRef<HTMLButtonElement>(null),feedback=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(!active){controller.current?.abort();controller.current=null;setState(current=>current==='pending'?'error':current);}return()=>{controller.current?.abort();controller.current=null;};},[active]);
 async function move(){
  if(!active||controller.current||!['preview','error'].includes(state))return;
  const hadFocus=document.activeElement===action.current,pending=new AbortController();controller.current=pending;setState('pending');
  try{const ack=await confirmReschedule(task,context.request,context.uid,AbortSignal.any([pending.signal,AbortSignal.timeout(30_000)]));if(pending.signal.aborted||controller.current!==pending)return;setResult(ack);setState('done');}
  catch(error){if(pending.signal.aborted||controller.current!==pending)return;const code=error instanceof ApiError?error.code:'';setState(code==='GIKA_RESCHEDULE_CONFLICT'?'conflict':['AUTH_REQUIRED','FORBIDDEN','EMAIL_UNVERIFIED'].includes(code)?'auth':'error');}
  finally{if(controller.current===pending){controller.current=null;if(hadFocus&&[action.current,document.body,action.current?.closest('dialog')].includes(document.activeElement as HTMLButtonElement))requestAnimationFrame(()=>{if(feedback.current?.closest('dialog')?.open)feedback.current.focus({preventScroll:true});});}}
 }
 const label=(date:string|null)=>date?date.split('-').reverse().join('/'):'Sem data';
 const time=task.patch.dueTime??task.dueTime;
 const text=state==='done'?`Movida para ${label(result!.dueDate)}.`:state==='pending'?'Movendo a tarefa…':state==='conflict'?'Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.':state==='cancelled'?'Reagendamento cancelado.':state==='auth'?'Entre na conta que fez esse pedido para mover a tarefa.':state==='error'?'Não consegui confirmar. Confira sua agenda e tente novamente.':'Confira a nova data antes de mover.';
 return <section className="gika-result" role="group" aria-label={state==='done'?'Tarefa reagendada':'Prévia de reagendamento'}>
  <div className="gika-card-title"><Icon name={state==='done'?'check':'calendar'} /><strong>{result?.title??task.title}</strong></div>
  {state==='done'?<p>{label(result!.dueDate)}{result!.dueTime?` às ${result!.dueTime}`:''}</p>:<><p>De {label(task.dueDate)}{task.dueTime?` às ${task.dueTime}`:''} para {label(task.patch.dueDate)}{time?` às ${time}`:''}.</p><p>Horários em {task.timeZone}.</p></>}
  <p ref={feedback} tabIndex={-1} role="status" aria-live="polite">{text}</p>
  {['preview','pending','error'].includes(state)&&<div className="gika-card-actions">{state==='preview'&&<button type="button" onClick={()=>setState('cancelled')}>Cancelar</button>}<button ref={action} type="button" disabled={state==='pending'||!active} onClick={()=>void move()}>{state==='pending'?'Movendo…':state==='error'?'Tentar mover novamente':'Mover tarefa'}</button></div>}
 </section>;
}
