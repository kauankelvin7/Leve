import { gikaInterpretationSchema } from '../../../../../packages/domain/src/gika';
import { commandEnvelopeSchema,type CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { rescheduleEnvelope,rescheduleDescriptorSchema,rescheduleTaskPatchSchema,rescheduledTaskSchema,type RescheduleDescriptor } from '../../../../../packages/domain/src/gikaReschedule';
import { completionResultSchema } from '../../../../../packages/domain/src/gikaCompletion';
import { ApiError,apiRequest,sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
export async function executeReschedule(task:RescheduleDescriptor,command:CommandEnvelope,uid:string,signal:AbortSignal){
 rescheduleDescriptorSchema.parse(task);commandEnvelopeSchema.parse(command);const patch=rescheduleTaskPatchSchema.parse(command.payload);
 if(!command.gikaReschedule||command.command!=='activity.update'||command.entityId!==task.id||command.expectedRevision!==task.revision||JSON.stringify(patch)!==JSON.stringify(task.patch)||JSON.stringify(command.payload)!==JSON.stringify(patch))throw new ApiError(422,'GIKA_INVALID_RESPONSE','Confira os dados da tarefa.');
 if(signal.aborted||firebaseAuth?.currentUser?.uid!==uid)throw new ApiError(401,'AUTH_REQUIRED','Entre na sua conta para continuar.');
 let result;
 try{result=await sendCommand(command,{signal,expectedUid:uid,queueOnNetworkError:false});}catch(error){if(error instanceof ApiError&&error.code==='REVISION_CONFLICT')throw new ApiError(409,'GIKA_RESCHEDULE_CONFLICT','Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.');throw error;}
 const ack=completionResultSchema.parse(result);
 if(ack.operationId!==command.operationId||ack.entityId!==task.id||ack.revision!==task.revision+1)throw new ApiError(503,'GIKA_INVALID_RESPONSE','Não recebi a confirmação. Confira sua agenda.');
 if(signal.aborted||firebaseAuth?.currentUser?.uid!==uid)throw new ApiError(401,'AUTH_REQUIRED','Entre na sua conta para continuar.');
 return rescheduledTaskSchema.parse({id:task.id,title:task.title,dueDate:task.patch.dueDate,dueTime:task.patch.dueTime??task.dueTime,timeZone:task.timeZone,revision:ack.revision,result:ack.result});
}

// Only a committed receipt mismatch reaches reconciliation; the server recovers before its provider.
export async function confirmReschedule(task:RescheduleDescriptor,request:{requestId:string;text:string},uid:string,signal:AbortSignal){
 try{return await executeReschedule(task,await rescheduleEnvelope(task,request),uid,signal);}
 catch(error){
  if(!(error instanceof ApiError)||error.code!=='OPERATION_MISMATCH')throw error;
  const response=gikaInterpretationSchema.parse(await apiRequest('/gika/respond',{method:'POST',body:JSON.stringify(request),signal},uid));
  if(!response.rescheduleTask)throw error;
  return executeReschedule(response.rescheduleTask,await rescheduleEnvelope(response.rescheduleTask,request),uid,signal);
 }
}
