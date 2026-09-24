import { LicenseType } from '@ailaflow/shared';
import { LicenseManager } from '../configuration/license/license-manager';
import { SandboxRepository } from '../repositories/sandbox/sandbox-repository';
import { UserAttributesRepository } from '../repositories/user-attributes/user-attributes-repository';
import { UserRepository } from '../repositories/user/user-repository';
import { User } from '../repositories/user/user';
import { UserAttributes } from '../repositories/user-attributes/user-attributes';
import { Sandbox } from '../repositories/sandbox/sandbox';
import { Cipher } from '../core/cipher/cipher';
import { FileSystemCipherKeyStore } from '../core/cipher/file-system-cipher-key-store';
import { NotificationRepository } from '../repositories/notification/notification-repository';
import { Notification } from '../repositories/notification/notification';

export class Installer {
  private isInstalling = false;

  public constructor(
    private readonly cipherKeyStore: FileSystemCipherKeyStore,
    private readonly cipher: Cipher,
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly sandboxRepository: SandboxRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly licenseManager: LicenseManager
  ) {}

  public async canInstall(signal: AbortSignal): Promise<boolean> {
    const userCount = await this.userRepository.count(signal, false);
    return userCount === 0;
  }

  public async install(
    signal: AbortSignal,
    rootUserName: string,
    rootPassword: string,
    licenseType: LicenseType,
    licenseKey: string | null
  ): Promise<string | null> {
    if (this.isInstalling) {
      return 'Installation is already in progress';
    }
    this.isInstalling = true;

    try {
      if ((await this.canInstall(signal)) === false) {
        return 'Installation is not allowed because the system is already initialized';
      }

      const licenseValidationError = await this.licenseManager.tryValidateAndSet(signal, licenseType, licenseKey);
      if (licenseValidationError !== null) {
        return `License validation failed: ${licenseValidationError}`;
      }

      await this.cipherKeyStore.install();

      const user = await User.create(rootUserName, null, rootPassword, true, this.cipher);
      const attributes = UserAttributes.create(user, {});
      const defaultSandbox = Sandbox.create({
        insert: true,
        name: 'default',
        description: 'Default sandbox',
        configuration: '',
        isEnabled: true,
        secrets: {}
      });

      await this.userRepository.insert(signal, user);
      await this.userAttributesRepository.replace(signal, attributes);
      await this.sandboxRepository.insert(signal, defaultSandbox);

      const notification = Notification.create(rootUserName, null, 'AilaFlow is successfully installed');
      await this.notificationRepository.insertMultiple(signal, [notification]);
    } finally {
      this.isInstalling = false;
    }
    return null;
  }
}
