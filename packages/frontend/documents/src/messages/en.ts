/**
 * Document texts in English. The source of truth: it.ts must have the same
 * keys (DocumentTemplatesMessages, DocumentsMessages), and the apps merge
 * them under `documentTemplates` (the templates' pages) and `documents`
 * (a record's PDF button).
 */
export const documentTemplates = {
  title: "Document templates",
  singular: "Document template",
  new: "New document template",
  all: "All document templates",
  noun: "document templates",
  create: "Create document template",
  editMeta: "Edit document template",
  newDescription: "Name the template and pick what it is for. You upload the Word file on its page.",
  editDescription: "Saving replaces the template's details; its Word file stays.",
  empty: {
    title: "No document templates found",
    filtered: "No document template where {filter}.",
    none: "Add your first document template to get started.",
  },
  deleteDescription: "The document template will no longer be listed or editable.",
  notFound: "This document template no longer exists.",
  sections: {
    details: "Details",
  },
  fields: {
    createdAt: "Added",
    id: "Template ID",
    name: "Name",
    resource: "Document",
    language: "Language",
    isDefault: "Default for this document and language",
    fileName: "Word file",
    size: "Size",
  },
  languages: {
    it: "Italian",
    en: "English",
  },
  resources: {
    quotation: "Quotation",
    salesOrder: "Sales order"
  },
  file: {
    title: "Word file",
    none: "No file yet: upload the .docx made in Word.",
    upload: "Upload .docx",
    replace: "Replace .docx",
    download: "Download .docx",
    preview: "Preview PDF",
    uploading: "Uploading…",
    uploaded: "Template uploaded.",
    hint: "Up to 5 MB. It is checked with sample data before it is saved.",
  },
  placeholders: {
    title: "Tags you can use",
    description: "Write them in the Word file. <value></value> puts a value, <loop></loop> repeats a table row for each element, and filters format values, e.g. <filter></filter>.",
    loop: "Repeat for each element",
    none: "Pick a document to see its tags.",
  },
  errors: {
    tag: "Tag {tag}: {explanation}",
  },
};

export const documents = {
  title: "Documents",
  pdf: "PDF",
  choose: "PDF other templates",
  defaultTemplate: "Default",
  languages: {
    it: "Italian",
    en: "English",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type DocumentTemplatesMessages = Shape<typeof documentTemplates>;
export type DocumentsMessages = Shape<typeof documents>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of the templates' texts, e.g. "documentTemplates.fields.id". */
export type DocumentTemplatesMessageKey = `documentTemplates.${Paths<DocumentTemplatesMessages>}`;
