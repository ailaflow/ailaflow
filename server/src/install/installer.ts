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

export class Installer {
  private isInstalling = false;

  public constructor(
    private readonly cipherKeyStore: FileSystemCipherKeyStore,
    private readonly cipher: Cipher,
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly sandboxRepository: SandboxRepository,
    private readonly licenseManager: LicenseManager
  ) {}

  public async canInstall(abortSignal: AbortSignal): Promise<boolean> {
    const userCount = await this.userRepository.count(abortSignal, false);
    return userCount === 0;
  }

  public async install(
    abortSignal: AbortSignal,
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
      if ((await this.canInstall(abortSignal)) === false) {
        return 'Installation is not allowed because the system is already initialized';
      }

      const licenseValidationError = await this.licenseManager.tryValidateAndSet(abortSignal, licenseType, licenseKey);
      if (licenseValidationError !== null) {
        return `License validation failed: ${licenseValidationError}`;
      }

      await this.cipherKeyStore.install();

      const user = await User.create(rootUserName, rootPassword, true, this.cipher);
      const attributes = UserAttributes.create(user, {});
      const defaultSandbox = Sandbox.create({
        name: 'default',
        description: 'Default sandbox',
        configuration: '',
        isEnabled: true,
        secrets: {}
      });

      await this.userRepository.insert(abortSignal, user);
      await this.userAttributesRepository.replace(abortSignal, attributes);
      await this.sandboxRepository.upsert(abortSignal, defaultSandbox);
    } finally {
      this.isInstalling = false;
    }
    return null;
  }
}
