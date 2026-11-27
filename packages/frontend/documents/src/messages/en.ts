/**
 * Document texts in English. The source of truth: it.ts must have the same
 * keys (DocumentTemplatesMessages, DocumentsMessages), and the apps merge
 * them under `documentTemplates` (the templates' pages) and `documents`
 * (a record's PDF button).
 */
export const documentTemplates = {
  all: "All document templates",
  create: "Create document template",
  deleteDescription: "The document template will no longer be listed or editable.",
  editDescription: "Saving replaces the template's details; its Word file stays.",
  editMeta: "Edit document template",
  empty: {
    filtered: "No document template where {filter}.",
    none: "Add your first document template to get started.",
    title: "No document templates found",
  },
  errors: {
    tag: "Tag {tag}: {explanation}",
  },
  fields: {
    createdAt: "Added",
    fileName: "Word file",
    id: "Template ID",
    isDefault: "Default for this document and language",
    language: "Language",
    name: "Name",
    resource: "Document",
    size: "Size",
  },
  file: {
    download: "Download .docx",
    hint: "Up to 5 MB. It is checked with sample data before it is saved.",
    none: "No file yet: upload the .docx made in Word.",
    preview: "Preview PDF",
    replace: "Replace .docx",
    title: "Word file",
    upload: "Upload .docx",
    uploaded: "Template uploaded.",
    uploading: "Uploading…",
  },
  languages: {
    en: "English",
    it: "Italian",
  },
  new: "New document template",
  newDescription: "Name the template and pick what it is for. You upload the Word file on its page.",
  notFound: "This document template no longer exists.",
  noun: "document templates",
  placeholders: {
    description: "Write them in the Word file. <value></value> puts a value, <loop></loop> repeats a table row for each element, and filters format values, e.g. <filter></filter>.",
    loop: "Repeat for each element",
    none: "Pick a document to see its tags.",
    title: "Tags you can use",
  },
  resources: {
    quotation: "Quotation",
    salesOrder: "Sales order"
  },
  sections: {
    details: "Details",
  },
  singular: "Document template",
  title: "Document templates",
};

export const documents = {
  choose: "PDF other templates",
  defaultTemplate: "Default",
  languages: {
    en: "English",
    it: "Italian",
  },
  pdf: "PDF",
  title: "Documents",
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
