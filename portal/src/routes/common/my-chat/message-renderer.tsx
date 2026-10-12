import { LlmMessageContentExtractor, type CompletedChatMessage, type LlmMessage } from '@aibindkit/core';
import { FormMessageView } from '../../../views/my-chat/form-message-view';
import { MyProcessForm, type MyProcessFormArgs } from '../my-form/my-process-form';
import { MyTaskForm, type MyTaskFormArgs } from '../my-form/my-task-form';
import {
  ProcessExecutionVariableValues,
  ProcessReturnFormMessageMetadata,
  ProcessStartFormMessageMetadata,
  TaskFormMessageMetadata
} from '@ailaflow/shared';
import { FormPreviewView } from '../../../views/form-renderer/form-preview-view';
import { ReturnFormMessage } from './return-form-message';

export interface MyChatMessageActions {
  openProcessForm(args: MyProcessFormArgs): void;
  openTaskForm(args: MyTaskFormArgs): void;
}

export function messageRenderer(
  actions: MyChatMessageActions,
  id: number,
  completedMessage: CompletedChatMessage,
  completedMessageIndex: number,
  sessionToken: string,
  testUserName?: string
) {
  const finished = completedMessage.metadata?.['finished'] === true;
  const startForm = completedMessage.metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
  if (typeof startForm === 'object' && startForm) {
    if (finished) {
      return <FormMessageView title="Form">Finished</FormMessageView>;
    }

    const args: MyProcessFormArgs = {
      processName: startForm.name,
      testUserName,
      chatSession: {
        token: sessionToken,
        messageId: id,
        completedMessageIndex
      }
    };
    return (
      <FormMessageView
        title="Form"
        lockedClickLabel={`Open start form for process ${startForm.name}`}
        onLockedClick={() => actions.openProcessForm(args)}
      >
        <FormPreviewView>
          <MyProcessForm args={args} />
        </FormPreviewView>
      </FormMessageView>
    );
  }

  const taskForm = completedMessage.metadata?.['taskForm'] as TaskFormMessageMetadata | undefined;
  if (taskForm) {
    if (finished) {
      return <FormMessageView title="Form">Finished</FormMessageView>;
    }

    const args: MyTaskFormArgs = { taskId: taskForm.id, testUserName };
    return (
      <FormMessageView title="Form" lockedClickLabel="Open task form" onLockedClick={() => actions.openTaskForm(args)}>
        <FormPreviewView>
          <MyTaskForm args={args} />
        </FormPreviewView>
      </FormMessageView>
    );
  }

  const returnForm = completedMessage.metadata?.['processReturnForm'] as ProcessReturnFormMessageMetadata | undefined;
  if (returnForm && returnForm.hasForm) {
    const outputValues = tryExtractOutputValues(completedMessage.message);
    if (outputValues) {
      return (
        <ReturnFormMessage
          processName={returnForm.name}
          stepId={returnForm.stepId}
          values={outputValues}
          onLockedClick={a => actions.openProcessForm(a)}
        />
      );
    }
  }

  return null;
}

function tryExtractOutputValues(message: LlmMessage): ProcessExecutionVariableValues | null {
  try {
    if (message.role === 'tool' && typeof message.content === 'string') {
      return JSON.parse(message.content).outputValues;
    }
    if (message.role === 'user' && Array.isArray(message.content)) {
      const content = LlmMessageContentExtractor.tryExtract(message);
      if (content?.content) {
        const match = /```json\r?\n([\s\S]*?)\r?\n```/.exec(content.content);
        if (match) {
          return JSON.parse(match[1]);
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to extract output values from message: ${e}`);
  }
  return null;
}
