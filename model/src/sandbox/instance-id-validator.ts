export class InstanceIdValidator {
  public static assert(instanceId: string) {
    if (instanceId.length < 4 || instanceId.length > 16 || !/^[a-z0-9][a-z0-9_]*$/.test(instanceId)) {
      throw new Error(`Instance ID '${instanceId}' is invalid`);
    }
  }
}
