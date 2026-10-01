import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import { UserAttributes } from '../repositories/user-attributes/user-attributes';
import { UserAttributesRepository } from '../repositories/user-attributes/user-attributes-repository';
import { UserChannel } from '../repositories/user-channel/user-channel';
import { UserChannelRepository } from '../repositories/user-channel/user-channel-repository';
import { User } from '../repositories/user/user';
import { UserRepository } from '../repositories/user/user-repository';
import { Transaction } from '../core/transaction';

export class UserManager {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly userChannelRepository: UserChannelRepository
  ) {}

  public async create(signal: AbortSignal, user: User, userAttributes?: UserAttributes): Promise<void> {
    const attributes = userAttributes ?? UserAttributes.create(user, {});
    const userChannel = UserChannel.create(user.name, DEFAULT_CHANNEL_NAME, '');

    const t = Transaction.begin();
    try {
      await this.userRepository.insert(signal, user, t);
      await this.userAttributesRepository.replace(signal, attributes, t);
      await this.userChannelRepository.upsert(signal, userChannel, t);
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  public async update(signal: AbortSignal, user: User, userAttributes?: UserAttributes): Promise<void> {
    const attributes = userAttributes ?? UserAttributes.create(user, {});

    const t = Transaction.begin();
    try {
      await this.userRepository.update(signal, user, t);
      await this.userAttributesRepository.replace(signal, attributes, t);
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
