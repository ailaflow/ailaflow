import { scriptDefinitionSchema } from './script-definition';
import z from 'zod/v4';
import { formDefinitionSchema } from './form-definition';
import { baseStepSchema } from './base-step-model';

// script step

export const scriptStepPropertiesSchema = z.object({
  script: scriptDefinitionSchema
});

export const scriptStepSchema = baseStepSchema
  .extend({
    type: z.literal('script'),
    properties: scriptStepPropertiesSchema
  })
  .describe('A script step.');

export type ScriptStep = z.infer<typeof scriptStepSchema>;

// agent step

export const agentStepPropertiesSchema = z.object({
  prompt: z.string()
});

export const agentStepSchema = baseStepSchema.extend({
  type: z.literal('agent'),
  properties: agentStepPropertiesSchema
});

export type AgentStep = z.infer<typeof agentStepSchema>;

// notification step

export const notificationStepPropertiesSchema = z.object({
  userList: z.string()
});

export const notificationStepSchema = baseStepSchema.extend({
  type: z.literal('notification'),
  properties: notificationStepPropertiesSchema
});

export type NotificationStep = z.infer<typeof notificationStepSchema>;

// task step

export const taskStepPropertiesSchema = z.object({
  inputVariableNames: z.array(z.string()),
  outputVariableNames: z.array(z.string()),
  user: z.string(),
  deadlineMinutes: z.number(),
  stopProcessOnDeadline: z.boolean(),
  form: formDefinitionSchema
});

export const taskStepSchema = baseStepSchema.extend({
  type: z.literal('task'),
  properties: taskStepPropertiesSchema
});

export type TaskStep = z.infer<typeof taskStepSchema>;

// return step

export const returnStepPropertiesSchema = z.object({
  outputVariableNames: z.array(z.string()),
  outputForm: formDefinitionSchema.optional()
});

export const returnStepSchema = baseStepSchema.extend({
  type: z.literal('return'),
  properties: returnStepPropertiesSchema
});

export type ReturnStep = z.infer<typeof returnStepSchema>;

// union of all step types

export const anyStepSchema = z.discriminatedUnion('type', [
  scriptStepSchema,
  agentStepSchema,
  notificationStepSchema,
  taskStepSchema,
  returnStepSchema
]);

export const sequenceSchema = z.array(anyStepSchema);
