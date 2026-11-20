import PizZip from 'pizzip';

/*
 * The smallest Word documents docxtemplater reads, built in the tests: no
 * template file is kept in the repo (admins upload them).
 */

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** A .docx whose body is `body` (WordprocessingML: paragraphs, tables). */
export function docx(body: string): Buffer {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip.file(
    '_rels/.rels',
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  zip.file(
    'word/document.xml',
    `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generate({ type: 'nodebuffer' });
}

/** A paragraph with `text`. */
export const paragraph = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

/** A table row, one cell per text. */
export const row = (...cells: string[]) => `<w:tr>${cells.map((cell) => `<w:tc>${paragraph(cell)}</w:tc>`).join('')}</w:tr>`;

/** A table of `rows`. */
export const table = (...rows: string[]) => `<w:tbl>${rows.join('')}</w:tbl>`;

/** The text of a filled document, paragraph by paragraph. */
export function paragraphs(document: Buffer): string[] {
  const xml = new PizZip(document).file('word/document.xml')?.asText() ?? '';
  return [...xml.matchAll(/<w:p>(.*?)<\/w:p>/g)].map(([, inner]) =>
    [...inner.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)].map(([, text]) => text).join(''),
  );
}

/** How many table rows a filled document has. */
export const rowCount = (document: Buffer) =>
  (new PizZip(document).file('word/document.xml')?.asText() ?? '').split('<w:tr>').length - 1;
