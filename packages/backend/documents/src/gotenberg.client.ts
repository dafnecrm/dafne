import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DOCX_MEDIA_TYPE, msg } from '@dafne/contracts';

/** The gotenberg service of compose.yaml. */
export const DEFAULT_GOTENBERG_URL = 'http://gotenberg.dafne.localhost:3100';

/** LibreOffice can take a while on a long document. */
const TIMEOUT_MS = 60_000;

/**
 * Converts Word documents to PDF with Gotenberg (LibreOffice behind HTTP),
 * at GOTENBERG_URL. A conversion that fails, or a Gotenberg that can't be
 * reached, is a 503: the document is fine, the converter isn't.
 */
@Injectable()
export class GotenbergClient {
  private readonly logger = new Logger(GotenbergClient.name);
  private readonly url: string;

  constructor(config: ConfigService) {
    const base = config.get<string>('GOTENBERG_URL') ?? DEFAULT_GOTENBERG_URL;
    this.url = `${base.replace(/\/$/, '')}/forms/libreoffice/convert`;
  }

  async toPdf(docx: Buffer): Promise<Buffer> {
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(docx)], { type: DOCX_MEDIA_TYPE }), 'document.docx');

    let res: Response;
    try {
      res = await fetch(this.url, { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      this.logger.error(`Gotenberg unreachable: ${String(error)}`);
      throw new ServiceUnavailableException(msg('documents.conversionFailed'));
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Gotenberg answered ${res.status}: ${detail.slice(0, 500)}`);
      throw new ServiceUnavailableException(msg('documents.conversionFailed'));
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
