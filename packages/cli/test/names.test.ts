import { closest, resourceNames, words } from '../src/core/names.ts';

describe('resourceNames', () => {
  it('gets singular and plural from either form', () => {
    for (const input of ['invoice', 'invoices', 'Invoice']) {
      const { s, p } = resourceNames(input);
      expect([s.kebab, p.kebab]).toEqual(['invoice', 'invoices']);
    }
  });

  it('inflects only the last word, in every casing', () => {
    const { s, p } = resourceNames('invoiceItems');
    expect(s).toEqual({
      kebab: 'invoice-item',
      camel: 'invoiceItem',
      pascal: 'InvoiceItem',
      snake: 'invoice_item',
      constant: 'INVOICE_ITEM',
      lower: 'invoice item',
      title: 'Invoice item',
      a: 'an invoice item',
      A: 'An invoice item',
    });
    expect(p.pascal).toBe('InvoiceItems');
    expect(resourceNames('category').p.kebab).toBe('categories');
  });

  it('splits every separator', () => {
    expect(words('Invoice items')).toEqual(['invoice', 'items']);
    expect(words('invoice_items')).toEqual(['invoice', 'items']);
    expect(words('HTTPRequests')).toEqual(['http', 'requests']);
  });

  it('rejects empty names, leading digits and uncountable nouns', () => {
    expect(() => resourceNames(' ')).toThrow();
    expect(() => resourceNames('2fa')).toThrow();
    expect(() => resourceNames('news')).toThrow(/same singular and plural/);
  });
});

describe('closest', () => {
  it('finds a typo, not an unrelated name', () => {
    expect(closest('productsssss', ['customers', 'products', 'sales-orders'])).toBe('products');
    expect(closest('custmers', ['customers', 'products'])).toBe('customers');
    expect(closest('invoices', ['customers', 'products'])).toBeUndefined();
  });
});
