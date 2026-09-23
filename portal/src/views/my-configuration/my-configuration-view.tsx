export type MyConfigurationTab = 'overview' | 'telegram' | 'slack' | 'password';

export interface MyConfigurationViewProps {
  activeTab: MyConfigurationTab;
  onTabChange(tab: MyConfigurationTab): void;
  children: React.ReactNode;
}

const tabs: ReadonlyArray<{ id: MyConfigurationTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'slack', label: 'Slack' },
  { id: 'password', label: 'Password' }
];

export function MyConfigurationView(props: MyConfigurationViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 sm:px-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My configuration</h1>
        <nav className="mt-4 flex gap-5 overflow-x-auto" aria-label="My configuration sections">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => props.onTabChange(tab.id)}
              className={`cursor-pointer border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                props.activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{props.children}</div>
    </div>
  );
}
