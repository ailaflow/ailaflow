export class FormUserStorage {
  public tryReadUserStorage(payload: Record<string, unknown>) {
    // TODO: we should not use localStorage, but move the dictionary to the database.
    const key = this.buildUserStorageKey(payload.key as string);
    return localStorage.getItem(key);
  }

  public async writeUserStorage(payload: Record<string, unknown>) {
    const key = this.buildUserStorageKey(payload.key as string);
    if (typeof payload.value !== 'string') {
      throw new Error('User storage accepts only string values');
    }
    localStorage.setItem(key, payload.value);
    return true;
  }

  public buildUserStorageKey(key: string) {
    if (typeof key !== 'string' || key.length < 1 || key.length > 32) {
      throw new Error('User storage key must be a string with length between 1 and 32 characters');
    }
    return 'ailaFlowForm_' + key;
  }
}
