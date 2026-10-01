import { z } from 'zod';
import { activityInputSchema,civilDateSchema,civilTimeSchema,moveScheduleToDate } from './content.ts';
import { commandEnvelopeSchema,type CommandEnvelope } from './identity.ts';
import { completionDescriptorSchema,completedTaskSchema } from './gikaCompletion.ts';
import { updateResolutionSchema } from './gikaUpdate.ts';
export const rescheduleTaskPatchSchema=z.object({dueDate:civilDateSchema,dueTime:civilTimeSchema.optional()}).strict();
export const rescheduleTaskArgsSchema=z.object({title:activityInputSchema.shape.title,date:civilDateSchema.nullable(),patch:rescheduleTaskPatchSchema}).strict();
export const rescheduleTaskCallSchema=z.object({name:z.literal('reschedule_task'),args:rescheduleTaskArgsSchema}).strict();
export const rescheduleDescriptorSchema=completionDescriptorSchema.extend({dueTime:civilTimeSchema.nullable(),patch:rescheduleTaskPatchSchema}).strict();
export const rescheduledTaskSchema=completedTaskSchema.extend({dueTime:civilTimeSchema.nullable()}).strict();
export const rescheduleResolutionSchema=updateResolutionSchema;
export type RescheduleDescriptor=z.infer<typeof rescheduleDescriptorSchema>;
export type RescheduledTask=z.infer<typeof rescheduledTaskSchema>;
export type RescheduleResolution=z.infer<typeof rescheduleResolutionSchema>;
// Narrow adaptation to the conventional ActivityInput, not a new temporal domain or writer.
export function applyReschedulePatch(current:Record<string,unknown>,value:unknown){
 const patch=rescheduleTaskPatchSchema.parse(value);
 const input=activityInputSchema.parse(Object.fromEntries(Object.keys(activityInputSchema.shape).filter(key=>Object.hasOwn(current,key)).map(key=>[key,current[key]])));
 if(input.schedule.type!=='task'||!input.schedule.dueDate)throw new Error('Tarefa com data necessária.');
 const schedule=moveScheduleToDate(input.schedule,patch.dueDate);
 return activityInputSchema.parse({...input,schedule:{...schedule,...(patch.dueTime!==undefined?{dueTime:patch.dueTime}:{})}});
}
export async function rescheduleEnvelope(descriptor:RescheduleDescriptor,request:{requestId:string;text:string}):Promise<CommandEnvelope>{
 const task=rescheduleDescriptorSchema.parse(descriptor),operationId=z.uuid().parse(request.requestId);
 const text=z.string().trim().min(1).max(2000).parse(request.text);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 const requestTextHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return commandEnvelopeSchema.parse({command:'activity.update',operationId,entityId:task.id,expectedRevision:task.revision,payload:task.patch,gikaReschedule:{requestTextHash}});
}
