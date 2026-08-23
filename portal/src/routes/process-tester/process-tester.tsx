import type { ProcessDto } from '@aila/model';
import { ProcessTesterView } from '../../views/process-tester/process-tester-view';
import { ProcessTesterChats } from './process-tester-chats';
import { ProcessTesterContext } from './process-tester-context';
import { ProcessTesterTop } from './process-tester-top';

export interface ProcessTesterProps {
  process: ProcessDto;
}

export function ProcessTester(props: ProcessTesterProps) {
  return (
    <ProcessTesterContext key={props.process.name} process={props.process}>
      <ProcessTesterView>
        <ProcessTesterTop />
        <ProcessTesterChats />
      </ProcessTesterView>
    </ProcessTesterContext>
  );
}
