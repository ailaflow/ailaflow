import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { MyConfigurationView } from '../../views/my-configuration/my-configuration-view';
import type { MyConfigurationTab } from '../../views/my-configuration/my-configuration-view';
import { Portal } from '../common/portal';
import { TelegramConfiguration } from '../common/telegram-configuration';
import { MyConfigurationOverview } from './my-configuration-overview';
import { MySlackConfiguration } from './my-slack-configuration';

export function MyConfigurationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: MyConfigurationTab = requestedTab === 'telegram' || requestedTab === 'slack' ? requestedTab : 'overview';

  useEffect(() => {
    if (requestedTab !== activeTab) {
      setSearchParams(current => withTab(current, activeTab), { replace: true });
    }
  }, [activeTab, requestedTab, setSearchParams]);

  function selectTab(tab: MyConfigurationTab): void {
    setSearchParams(current => withTab(current, tab));
  }

  return (
    <Portal>
      <MyConfigurationView activeTab={activeTab} onTabChange={selectTab}>
        {activeTab === 'overview' ? (
          <MyConfigurationOverview />
        ) : activeTab === 'telegram' ? (
          <TelegramConfiguration />
        ) : (
          <MySlackConfiguration />
        )}
      </MyConfigurationView>
    </Portal>
  );
}

function withTab(current: URLSearchParams, tab: MyConfigurationTab): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set('tab', tab);
  return next;
}
