import { ResourceValidator } from '../resource';

export class SandboxValidator {
  public static readonly validateName = ResourceValidator.validateName;
  public static readonly validateDescription = ResourceValidator.validateDescription;
}
