import { ExportedProcess, LicenseType } from '@ailaflow/shared';
import { LicenseManager } from '../configuration/license/license-manager';
import { SandboxRepository } from '../repositories/sandbox/sandbox-repository';
import { UserRepository } from '../repositories/user/user-repository';
import { User } from '../repositories/user/user';
import { Sandbox } from '../repositories/sandbox/sandbox';
import { Cipher } from '../core/cipher/cipher';
import { FileSystemCipherKeyStore } from '../core/cipher/file-system-cipher-key-store';
import { NotificationRepository } from '../repositories/notification/notification-repository';
import { Notification } from '../repositories/notification/notification';
import { ProcessDownloader } from './process-downloader';
import { ProcessValidatorsFactory } from '../process/process-validators-factory';
import { Process } from '../repositories/process/process';
import { ProcessManager } from '../process/process-manager';
import { Logger } from '../core/logger';
import { UserManager } from '../user/user-manager';

export class Installer {
  private readonly logger = new Logger(Installer.name);
  private isInstalling = false;

  public constructor(
    private readonly cipherKeyStore: FileSystemCipherKeyStore,
    private readonly cipher: Cipher,
    private readonly userRepository: UserRepository,
    private readonly userManager: UserManager,
    private readonly sandboxRepository: SandboxRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly processManager: ProcessManager,
    private readonly licenseManager: LicenseManager,
    private readonly processValidatorsFactory: ProcessValidatorsFactory,
    private readonly processDownloader: ProcessDownloader
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
      await this.installSandbox(signal);
      await this.installRootUser(signal, rootUserName, rootPassword);
      await this.installProcesses(signal, rootUserName);
      await this.installNotification(signal, rootUserName);
    } finally {
      this.isInstalling = false;
    }
    return null;
  }

  private installSandbox(signal: AbortSignal): Promise<void> {
    const defaultSandbox = Sandbox.create({
      insert: true,
      name: 'default',
      description: 'Default sandbox',
      configuration: '',
      isEnabled: true,
      secrets: {}
    });
    return this.sandboxRepository.insert(signal, defaultSandbox);
  }

  private async installRootUser(signal: AbortSignal, rootUserName: string, rootPassword: string) {
    const user = await User.create(rootUserName, null, rootPassword, true, this.cipher);
    await this.userManager.create(signal, user);
  }

  private async installProcesses(signal: AbortSignal, rootUserName: string) {
    let exportedProcesses: ExportedProcess[];
    try {
      exportedProcesses = await this.processDownloader.download(signal);
    } catch (e) {
      this.logger.error(`Failed to download default processes: ${(e as Error)?.message || e}`);
      return;
    }

    for (const ep of exportedProcesses) {
      try {
        const validators = await this.processValidatorsFactory.create(signal, ep.name);
        const process = Process.import(ep, rootUserName, validators.rootValidator, validators.stepValidator);
        await this.processManager.insert(signal, process);
      } catch (e) {
        this.logger.error(`Failed to import /${ep.name} process: ${(e as Error)?.message || e}`);
      }
    }
  }

  private async installNotification(signal: AbortSignal, rootUserName: string) {
    const notification = Notification.create(rootUserName, null, 'AilaFlow is successfully installed');
    await this.notificationRepository.insertMultiple(signal, [notification]);
  }
}
