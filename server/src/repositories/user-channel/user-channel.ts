import { UserChannelValidator } from '@ailaflow/shared';
import { UserChannelRepositoryError } from './user-channel-repository';

export class UserChannel {
  public static create(userName: string, name: string, prompt: string): UserChannel {
    const nameError = UserChannelValidator.validateName(name);
    if (nameError) {
      throw new UserChannelRepositoryError(nameError);
    }
    return new UserChannel(userName, name, prompt);
  }

  public constructor(
    public readonly userName: string,
    public readonly name: string,
    public prompt: string
  ) {}

  public setPrompt(prompt: string) {
    this.prompt = prompt;
  }
}
