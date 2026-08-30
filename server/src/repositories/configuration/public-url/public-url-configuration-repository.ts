import { Repository } from '../../repository';
import { PublicUrlConfiguration } from './public-url-configuration';

export interface PublicUrlConfigurationRepository extends Repository {
  get(abortSignal: AbortSignal): Promise<PublicUrlConfiguration>;
  save(abortSignal: AbortSignal, configuration: PublicUrlConfiguration): Promise<void>;
}
