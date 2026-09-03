import { useAiStore } from '../common/admin-portal';
import type { ProcessTesterState } from './process-tester-context';

export function useProcessTesterAi(state: ProcessTesterState) {
  useAiStore(
    'processTester',
    store =>
      store.bind({
        async getTimeline() {
          return {
            items: state.timelineItems.map(item => ({ ...item, id: item.id }))
          };
        }
      }),
    [state]
  );
}
