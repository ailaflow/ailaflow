export class UnsavedChangesController {
  private hasChanges = false;

  public setHasUnsavedChanges(hasChanges: boolean) {
    this.hasChanges = hasChanges;
  }

  public hasUnsavedChanges(): boolean {
    return this.hasChanges;
  }

  public clear() {
    this.hasChanges = false;
  }
}
