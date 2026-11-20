import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { SessionUser } from '@dafne/backend-session';
import { msg, type DocumentPlaceholder, type DocumentResource } from '@dafne/contracts';

/** Who asks for a document, and the language to format it in. */
export interface DocumentContext {
  actor: SessionUser;
  /** E.g. "it": numbers, dates and currencies are formatted in it. */
  locale: string;
}

/** What a source gives a template: its data, and the PDF's file name. */
export interface DocumentData<Data extends object = object> {
  data: Data;
  /** Without the extension, e.g. "quotation-42". */
  fileName: string;
}

/**
 * A resource documents can be made for: a provider of the resource's own
 * module, marked with `@DocumentSourceFor('<resource>')`, which turns one
 * of its records into the data its templates read.
 */
export interface DocumentSource<Data extends object = object> {
  /**
   * The data of the record `id` (the route's param, as text), with the
   * resource's own rules: 404 when it's missing, 403 when `actor` can't
   * read it.
   */
  load(id: string, context: DocumentContext): Promise<DocumentData<Data>>;
  /**
   * Made-up data with every field `load` fills (lists with at least one
   * element): the preview of a template, the check of an upload, and the
   * placeholders shown to admins.
   */
  sample(locale: string): Data;
}

/**
 * Makes a provider the document source of `resource` (e.g. `quotation`):
 * `GET /documents/<resource>/:id/pdf` and the templates of that resource
 * use it. The provider stays in its resource's module, with its
 * dependencies; that module imports DocumentsModule.
 */
export const DocumentSourceFor = DiscoveryService.createDecorator<string>();

/** Whether `value` is a plain object (not a Date, list or value). */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

/**
 * The tags a template can use with `data`: a value per leaf, as a dotted
 * path, and a loop per list, with the tags of its first element.
 */
export function placeholdersOf(data: Record<string, unknown>, prefix = ''): DocumentPlaceholder[] {
  return Object.entries(data).flatMap(([key, value]): DocumentPlaceholder[] => {
    const tag = prefix + key;
    if (Array.isArray(value)) {
      const first: unknown = value[0];
      return [{ tag, loop: isRecord(first) ? placeholdersOf(first) : [] }];
    }
    if (isRecord(value)) {
      return placeholdersOf(value, `${tag}.`);
    }
    return [{ tag }];
  });
}

/**
 * The resources documents can be made for: every provider marked with
 * `@DocumentSourceFor`, from any lib, found when the app starts. One
 * instance in the app.
 */
@Injectable()
export class DocumentSources implements OnModuleInit {
  private readonly sources = new Map<string, DocumentSource>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit(): void {
    for (const wrapper of this.discovery.getProviders({ metadataKey: DocumentSourceFor.KEY })) {
      const resource = this.discovery.getMetadataByDecorator(DocumentSourceFor, wrapper);
      if (resource && wrapper.instance) {
        this.register(resource, wrapper.instance as DocumentSource);
      }
    }
  }

  register(resource: string, source: DocumentSource): void {
    if (this.sources.has(resource)) {
      throw new Error(`Documents: "${resource}" is registered twice`);
    }
    this.sources.set(resource, source);
  }

  has(resource: string): boolean {
    return this.sources.has(resource);
  }

  /** The source of `resource`; 404 when none is registered. */
  get(resource: string): DocumentSource {
    const source = this.sources.get(resource);
    if (!source) {
      throw new NotFoundException(msg('documents.unknownResource'));
    }
    return source;
  }

  /** Every resource, sorted, with the tags its templates can use. */
  list(locale: string): DocumentResource[] {
    return [...this.sources.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([resource, source]) => ({ resource, placeholders: placeholdersOf({ ...source.sample(locale) }) }));
  }
}
