import { Injectable, Module, NotFoundException } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DocumentSourceFor, DocumentSources, placeholdersOf, type DocumentSource } from './document-sources.js';

@Injectable()
@DocumentSourceFor('invoice')
class InvoiceDocumentSource implements DocumentSource {
  load(id: string) {
    return Promise.resolve({ data: { id }, fileName: `invoice-${id}` });
  }
  sample() {
    return { number: 'A-1', customer: { name: 'Acme' }, lines: [{ product: 'Widget', price: 1 }] };
  }
}

/** A resource's module: its source stays among its own providers. */
@Module({ providers: [InvoiceDocumentSource] })
class InvoicesModule {}

describe('DocumentSources', () => {
  it('finds the providers marked @DocumentSourceFor, in any module', async () => {
    const module = await Test.createTestingModule({
      imports: [DiscoveryModule, InvoicesModule],
      providers: [DocumentSources],
    }).compile();
    await module.init();
    const sources = module.get(DocumentSources);

    expect(sources.has('invoice')).toBe(true);
    expect(sources.get('invoice')).toBeInstanceOf(InvoiceDocumentSource);
    expect(sources.list('en')).toEqual([
      {
        resource: 'invoice',
        placeholders: [
          { tag: 'number' },
          { tag: 'customer.name' },
          { tag: 'lines', loop: [{ tag: 'product' }, { tag: 'price' }] },
        ],
      },
    ]);
  });

  it('answers 404 for a resource without a source', () => {
    const sources = new DocumentSources({ getProviders: () => [] } as never);

    expect(() => sources.get('nothing')).toThrow(NotFoundException);
  });

  it('refuses a resource registered twice', () => {
    const sources = new DocumentSources({ getProviders: () => [] } as never);
    sources.register('invoice', new InvoiceDocumentSource());

    expect(() => sources.register('invoice', new InvoiceDocumentSource())).toThrow(/twice/);
  });
});

describe('placeholdersOf', () => {
  it('keeps dates and empty values as tags, and lists without objects as plain loops', () => {
    expect(placeholdersOf({ day: new Date(), notes: null, tags: ['a'], items: [] })).toEqual([
      { tag: 'day' },
      { tag: 'notes' },
      { tag: 'tags', loop: [] },
      { tag: 'items', loop: [] },
    ]);
  });
});
