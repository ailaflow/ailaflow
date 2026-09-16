import type { SlackMappingChange, SlackUserDto } from '@ailaflow/shared';
import { useMemo, useState } from 'react';

export function useSlackConfigurationState(users: SlackUserDto[]) {
  const [appToken, setAppToken] = useState('');
  const [botToken, setBotToken] = useState('');
  const [changes, setChanges] = useState<Record<string, string | null>>({});

  const visibleUsers = useMemo(
    () => users.map(user => (user.slackUserId in changes ? { ...user, userName: changes[user.slackUserId] } : user)),
    [changes, users]
  );

  function changeMapping(slackUserId: string, userName: string | null): void {
    const saved = users.find(user => user.slackUserId === slackUserId)?.userName ?? null;
    setChanges(current => {
      const next = { ...current };
      if (saved === userName) {
        delete next[slackUserId];
      } else {
        next[slackUserId] = userName;
      }
      return next;
    });
  }

  function cancelMappings(): void {
    setChanges({});
  }

  function mappingChanges(): SlackMappingChange[] {
    return Object.entries(changes).map(([slackUserId, userName]) => ({ slackUserId, userName }));
  }

  function credentialsSaved(): void {
    setAppToken('');
    setBotToken('');
  }

  return {
    appToken,
    botToken,
    setAppToken,
    setBotToken,
    visibleUsers,
    isMappingDirty: Object.keys(changes).length > 0,
    hasCredentialDraft: Boolean(appToken.trim() || botToken.trim()),
    mappingChanges,
    changeMapping,
    cancelMappings,
    credentialsSaved
  };
}
