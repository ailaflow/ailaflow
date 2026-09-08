import { scriptDefinitionSchema } from './script-definition';
import * as z from 'zod/v4';
import { formDefinitionSchema } from './form-definition';
import { baseStepSchema } from './base-step-model';
import { taskCompletionPolicySchema } from '../task';

// common

const stringOrVariableSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('string'),
    value: z.string()
  }),
  z.object({
    type: z.literal('variable'),
    name: z.string()
  })
]);

export type StringOrVariable = z.infer<typeof stringOrVariableSchema>;

// script step

export const scriptStepPropertiesSchema = z.object({
  script: scriptDefinitionSchema
});

export const scriptStepSchema = baseStepSchema
  .extend({
    type: z.literal('script'),
    componentType: z.literal('task'),
    properties: scriptStepPropertiesSchema
  })
  .describe('A script step.');

export type ScriptStep = z.infer<typeof scriptStepSchema>;

// agent step

export const agentStepPropertiesSchema = z.object({
  prompt: stringOrVariableSchema,
  sandboxName: z.string().min(3),
  allowedProcesses: z.array(z.string()).nullable(),
  allowedVariableNames: z.array(z.string()),
  isTerminalAllowed: z.boolean()
});

export const agentStepSchema = baseStepSchema.extend({
  type: z.literal('agent'),
  componentType: z.literal('task'),
  properties: agentStepPropertiesSchema
});

export type AgentStep = z.infer<typeof agentStepSchema>;

// notification step

export const notificationStepPropertiesSchema = z.object({
  userExpression: stringOrVariableSchema,
  notification: stringOrVariableSchema
});

export const notificationStepSchema = baseStepSchema.extend({
  type: z.literal('notification'),
  componentType: z.literal('task'),
  properties: notificationStepPropertiesSchema
});

export type NotificationStep = z.infer<typeof notificationStepSchema>;

// task step

export const taskStepPropertiesSchema = z.object({
  title: stringOrVariableSchema,
  inputVariableNames: z.array(z.string()),
  outputVariableNames: z.array(z.string()),
  metadataVariableName: z.string().optional(),
  userExpression: stringOrVariableSchema,
  form: formDefinitionSchema,
  deadline: stringOrVariableSchema.optional(),
  completionPolicy: taskCompletionPolicySchema
});

export const taskStepSchema = baseStepSchema.extend({
  type: z.literal('task'),
  componentType: z.literal('task'),
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
  componentType: z.literal('task'),
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
