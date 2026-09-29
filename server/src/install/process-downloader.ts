import { ExportedProcess, exportedProcessSchema } from '@ailaflow/shared';
import { gunzip } from 'node:zlib';
import { promisify } from 'util';
import { VersionProvider } from '../core/version-provider';
import { HttpClient } from '../core/http-client';

const gunzipAsync = promisify(gunzip);

type ListResponse = {
  path: string;
  minVersion: string;
}[];

export class ProcessDownloader {
  private readonly client = new HttpClient(new URL('https://ailaflow.com'));

  public constructor(private readonly versionProvider: VersionProvider) {}

  private async downloadProcess(signal: AbortSignal, path: string): Promise<ExportedProcess> {
    const data = await this.client.blob(signal, 'GET', path);
    const buffer = Buffer.from(await data.arrayBuffer());
    const decompressed = await gunzipAsync(buffer);
    const raw = JSON.parse(decompressed.toString());
    return exportedProcessSchema.parse(raw);
  }

  private downloadList(signal: AbortSignal): Promise<ListResponse> {
    return this.client.json<ListResponse>(signal, 'GET', '/marketplace/auto-install.json');
  }

  public async download(signal: AbortSignal): Promise<ExportedProcess[]> {
    let list = await this.downloadList(signal);
    list = list.filter(item => this.versionProvider.meetsMin(item.minVersion));
    const r = await Promise.allSettled(list.map(item => this.downloadProcess(signal, item.path)));
    const result: ExportedProcess[] = [];
    r.forEach(item => {
      if (item.status === 'fulfilled') {
        result.push(item.value);
      }
    });
    return result;
  }
}
