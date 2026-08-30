import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { PublicUrlConfiguration } from './public-url-configuration';
import { PublicUrlConfigurationRepository } from './public-url-configuration-repository';

interface PublicUrlConfigurationRow {
  publicUrl: string;
}

export class SqlitePublicUrlConfigurationRepository implements PublicUrlConfigurationRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS public_url_configuration (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        publicUrl TEXT NOT NULL
      ) STRICT
    `);
  }

  public async get(_: AbortSignal): Promise<PublicUrlConfiguration> {
    const row = this.db.prepare(`SELECT publicUrl FROM public_url_configuration WHERE id = 1`).get() as
      | PublicUrlConfigurationRow
      | undefined;
    return new PublicUrlConfiguration(row?.publicUrl ?? null);
  }

  public async save(_: AbortSignal, configuration: PublicUrlConfiguration): Promise<void> {
    if (configuration.publicUrl === null) {
      this.db.prepare(`DELETE FROM public_url_configuration WHERE id = 1`).run();
      return;
    }

    this.db
      .prepare(
        `
        INSERT INTO public_url_configuration (id, publicUrl)
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET publicUrl = excluded.publicUrl
      `
      )
      .run(configuration.publicUrl);
  }
}
