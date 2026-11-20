import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DEFAULT_GOTENBERG_URL, GotenbergClient } from './gotenberg.client.js';

const config = (url?: string) => ({ get: () => url }) as unknown as ConfigService;

describe('GotenbergClient', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    fetch.mockReset();
  });

  it('posts the .docx to LibreOffice and returns the PDF', async () => {
    fetch.mockResolvedValue(new Response(Buffer.from('%PDF-1.7')));
    const client = new GotenbergClient(config('http://gotenberg:3000/'));

    const pdf = await client.toPdf(Buffer.from('docx'));

    expect(pdf.toString()).toBe('%PDF-1.7');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://gotenberg:3000/forms/libreoffice/convert');
    expect(init?.method).toBe('POST');
    const file = (init?.body as FormData).get('files') as File;
    expect(file.name).toBe('document.docx');
    expect(Buffer.from(await file.arrayBuffer()).toString()).toBe('docx');
  });

  it('uses the compose service without GOTENBERG_URL', async () => {
    fetch.mockResolvedValue(new Response('%PDF'));

    await new GotenbergClient(config()).toPdf(Buffer.from('docx'));

    expect(fetch.mock.calls[0][0]).toBe(`${DEFAULT_GOTENBERG_URL}/forms/libreoffice/convert`);
  });

  it('answers 503 when Gotenberg fails or cannot be reached', async () => {
    const client = new GotenbergClient(config());

    fetch.mockResolvedValue(new Response('LibreOffice failed', { status: 500 }));
    await expect(client.toPdf(Buffer.from('docx'))).rejects.toBeInstanceOf(ServiceUnavailableException);

    fetch.mockRejectedValue(new TypeError('fetch failed'));
    await expect(client.toPdf(Buffer.from('docx'))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
