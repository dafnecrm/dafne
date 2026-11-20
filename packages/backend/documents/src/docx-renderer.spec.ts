import { UnprocessableEntityException } from '@nestjs/common';
import { documentFilters, fillDocx } from './docx-renderer.js';
import { docx, paragraph, paragraphs, row, rowCount, table } from './testing/docx-fixtures.js';

/** The 422 a call throws, with its body. */
function rejection(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    return (error as UnprocessableEntityException).getResponse() as {
      message: string;
      errors?: { tag: string | null; explanation: string }[];
    };
  }
  throw new Error('expected a 422');
}

describe('fillDocx', () => {
  const data = {
    customer: { name: 'Acme', address: { city: 'Milano' } },
    notes: null,
    items: [
      { product: 'Widget', price: 125 },
      { product: 'Gadget', price: 100.5 },
      { product: 'Gizmo', price: 7 },
    ],
  };

  it('puts values, dotted paths included, and leaves missing ones empty', () => {
    const template = docx(paragraph('{customer.name} – {customer.address.city}') + paragraph('[{missing.value}]'));

    expect(paragraphs(fillDocx(template, data, 'en'))).toEqual(['Acme – Milano', '[]']);
  });

  it('repeats a table row per item', () => {
    const template = docx(table(row('Product', 'Price'), row('{#items}{product}', '{price | number:2}{/items}')));

    const filled = fillDocx(template, data, 'en');
    expect(rowCount(filled)).toBe(4);
    expect(paragraphs(filled)).toEqual(['Product', 'Price', 'Widget', '125.00', 'Gadget', '100.50', 'Gizmo', '7.00']);
  });

  it('shows a section only when its value is set, dropping the paragraphs of its tags', () => {
    const template = docx(
      paragraph('{#notes}') + paragraph('Notes: {notes}') + paragraph('{/notes}') + paragraph('{^notes}No notes{/notes}'),
    );

    expect(paragraphs(fillDocx(template, data, 'en'))).toEqual(['No notes']);
    expect(paragraphs(fillDocx(template, { notes: 'Fragile' }, 'en'))).toEqual(['Notes: Fragile', '']);
  });

  it('formats with the filters, in the locale', () => {
    const template = docx(paragraph('{total | currency}') + paragraph('{day | date}'));
    const values = { total: 1234.5, day: new Date('2026-01-15T12:00:00Z') };

    // Intl puts no-break spaces before the currency.
    const texts = paragraphs(fillDocx(template, values, 'it')).map((text) => text.replace(/\s/g, ' '));
    expect(texts).toEqual(['1234,50 €', '15 gen 2026']);
  });

  it('rejects a file that is not a .docx', () => {
    const body = rejection(() => fillDocx(Buffer.from('not a zip'), data, 'en'));

    expect(body.message).toBe('documentTemplates.file.notDocx');
  });

  it('lists the tags at fault', () => {
    const template = docx(paragraph('{#items}{product}') + paragraph('{customer.name'));

    const body = rejection(() => fillDocx(template, data, 'en'));
    expect(body.message).toBe('documentTemplates.file.invalid');
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(body.errors?.every((error) => error.explanation)).toBe(true);
  });

  it("can't run code: expressions only read the data", () => {
    const template = docx(paragraph('[{constructor.constructor("return process")()}]'));

    // angular-expressions doesn't reach the Function constructor: nothing to show.
    expect(paragraphs(fillDocx(template, data, 'en'))).toEqual(['[]']);
  });
});

describe('documentFilters', () => {
  const filters = documentFilters('en');

  it('formats numbers, also given as text, and leaves what they cannot read', () => {
    expect(filters.number('3.14159', 3)).toBe('3.142');
    expect(filters.currency(10, 'USD')).toBe('$10.00');
    expect(filters.number('abc')).toBe('abc');
    expect(filters.date(null)).toBeNull();
  });

  it('changes the case of text', () => {
    expect(filters.upper('acme')).toBe('ACME');
    expect(filters.lower('ACME')).toBe('acme');
  });
});
