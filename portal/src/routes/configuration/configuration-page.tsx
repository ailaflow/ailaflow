import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { ConfigurationView } from '../../views/configuration/configuration-view';
import type { ConfigurationTab } from '../../views/configuration/configuration-view';
import { ConfigurationOverviewPage } from './configuration-overview-page';
import { LlmConfigurationPage } from './llm-configuration-page';
import { PublicUrlConfigurationPage } from './public-url-configuration-page';

export function ConfigurationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: ConfigurationTab = requestedTab === 'llm' || requestedTab === 'public-url' ? requestedTab : 'overview';

  useEffect(() => {
    if (requestedTab !== activeTab) {
      setSearchParams(current => withTab(current, activeTab), { replace: true });
    }
  }, [activeTab, requestedTab, setSearchParams]);

  function selectTab(tab: ConfigurationTab): void {
    setSearchParams(current => withTab(current, tab));
  }

  return (
    <ConfigurationView activeTab={activeTab} onTabChange={selectTab}>
      {activeTab === 'overview' ? (
        <ConfigurationOverviewPage />
      ) : activeTab === 'llm' ? (
        <LlmConfigurationPage />
      ) : (
        <PublicUrlConfigurationPage />
      )}
    </ConfigurationView>
  );
}

function withTab(current: URLSearchParams, tab: ConfigurationTab): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set('tab', tab);
  return next;
}
