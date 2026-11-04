'use client'

import { Placeholder } from '@tiptap/extensions'
import { useTranslations, type Messages } from 'next-intl'
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { cn } from 'cn'
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react'
import * as React from 'react'
import { Separator } from '@dafne/frontend-ui/components/separator'
import { Toggle } from '@dafne/frontend-ui/components/toggle'

type TextEditorProps = {
  /** The content as HTML; "" when empty. */
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  id?: string
  disabled?: boolean
  readOnly?: boolean
  'aria-invalid'?: boolean
  /** Classes of the frame (toolbar + writing area). */
  className?: string
  /** Classes of the writing area, e.g. "min-h-48" or "h-64 overflow-y-auto". */
  contentClassName?: string
}

/** The editor's frame, styled like <Textarea />. */
const FRAME =
  'w-full rounded-lg border border-input bg-transparent text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-disabled:cursor-not-allowed aria-disabled:bg-input/50 aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

/**
 * A rich text editor (Tiptap) whose value is HTML. An empty editor gives
 * "", so the contracts' optionalText turns it into null. Show the saved
 * HTML with <TextEditorContent />, which sanitizes it.
 *
 * The server renders only the empty frame: Tiptap calls Math.random() when
 * it creates an editor, which Next.js forbids while prerendering a page
 * (Cache Components). The editor appears once the page is in the browser.
 */
function TextEditor(props: TextEditorProps) {
  const inBrowser = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  if (!inBrowser)
    return (
      <div
        data-slot="text-editor"
        aria-invalid={props['aria-invalid']}
        aria-disabled={props.disabled}
        className={cn(FRAME, props.className)}
      >
        <div className={cn('min-h-16', props.contentClassName)} />
      </div>
    )
  return <TiptapEditor {...props} />
}

function TiptapEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
  disabled,
  readOnly,
  'aria-invalid': ariaInvalid,
  className,
  contentClassName,
}: TextEditorProps) {
  const editable = !disabled && !readOnly
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable,
    // Next.js renders on the server first: create the editor on the client.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id && { id }),
        ...(ariaInvalid && { 'aria-invalid': 'true' }),
        class: 'text-editor-content min-h-16 px-2.5 py-2 outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    onBlur: () => onBlur?.(),
  })

  // Follow changes from outside (a form reset, a record loaded later…).
  React.useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  React.useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  return (
    <div
      data-slot="text-editor"
      aria-invalid={ariaInvalid}
      aria-disabled={disabled}
      className={cn(FRAME, className)}
    >
      {editor && !readOnly && (
        <TextEditorToolbar editor={editor} disabled={disabled} />
      )}
      {/* Flex, so the editable area fills a taller box and clicks anywhere focus it. */}
      <EditorContent
        editor={editor}
        className={cn('flex flex-col [&>.ProseMirror]:flex-1', contentClassName)}
      />
    </div>
  )
}

// Extract: with no typed messages (the lib alone) keyof is string | number | symbol.
type EditorKey = Extract<keyof Messages['editor'], string>

type Action = {
  /** A key of the `editor` messages. */
  label: Exclude<EditorKey, 'toolbar' | 'linkPrompt'>
  icon: LucideIcon
  isActive?: (editor: Editor) => boolean
  /** `text` gives the editor's translated messages (for prompts). */
  run: (editor: Editor, text: (key: EditorKey) => string) => void
}

const ACTION_GROUPS: Action[][] = [
  [
    {
      label: 'bold',
      icon: BoldIcon,
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: 'italic',
      icon: ItalicIcon,
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: 'underline',
      icon: UnderlineIcon,
      isActive: (e) => e.isActive('underline'),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'strikethrough',
      icon: StrikethroughIcon,
      isActive: (e) => e.isActive('strike'),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      label: 'heading',
      icon: Heading2Icon,
      isActive: (e) => e.isActive('heading', { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'subheading',
      icon: Heading3Icon,
      isActive: (e) => e.isActive('heading', { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'bulletList',
      icon: ListIcon,
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'numberedList',
      icon: ListOrderedIcon,
      isActive: (e) => e.isActive('orderedList'),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'quote',
      icon: QuoteIcon,
      isActive: (e) => e.isActive('blockquote'),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    // {
    //   label: 'Code',
    //   icon: CodeIcon,
    //   isActive: (e) => e.isActive('code'),
    //   run: (e) => e.chain().focus().toggleCode().run(),
    // },
    {
      label: 'link',
      icon: LinkIcon,
      isActive: (e) => e.isActive('link'),
      run: (e, text) => {
        const previous = e.getAttributes('link').href as string | undefined
        const href = window.prompt(text('linkPrompt'), previous ?? 'https://')
        if (href === null) return
        const chain = e.chain().focus().extendMarkRange('link')
        if (href.trim() === '') chain.unsetLink().run()
        else chain.setLink({ href: href.trim() }).run()
      },
    },
  ],
  [
    {
      label: 'undo',
      icon: Undo2Icon,
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      label: 'redo',
      icon: Redo2Icon,
      run: (e) => e.chain().focus().redo().run(),
    },
  ],
]

const ACTIONS = ACTION_GROUPS.flat()

function TextEditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor
  disabled?: boolean
}) {
  const t = useTranslations('editor')
  // Re-render the buttons when the selection or the content changes.
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      ACTIONS.map((action) => action.isActive?.(editor) ?? false),
  })

  return (
    <div
      role="toolbar"
      aria-label={t('toolbar')}
      className="flex flex-wrap items-center gap-0.5 border-b border-input p-1"
    >
      {ACTION_GROUPS.map((group, g) => (
        <React.Fragment key={g}>
          {g > 0 && (
            <Separator orientation="vertical" className="mx-1 h-5 self-center!" />
          )}
          {group.map((action) => {
            const Icon = action.icon
            return (
              <Toggle
                key={action.label}
                size="sm"
                aria-label={t(action.label)}
                title={t(action.label)}
                disabled={disabled}
                pressed={active[ACTIONS.indexOf(action)]}
                onPressedChange={() => action.run(editor, (key) => t(key))}
                // Keep the editor's selection when a button is clicked.
                onMouseDown={(e) => e.preventDefault()}
              >
                <Icon />
              </Toggle>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

const subscribe = () => () => {}

/**
 * Shows HTML written with <TextEditor />. It comes from users, so it's
 * sanitized first. DOMPurify needs a DOM: on the server nothing is
 * rendered, and the content appears once the page is in the browser.
 */
function TextEditorContent({
  html,
  className,
}: {
  html: string | null | undefined
  className?: string
}) {
  const inBrowser = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  const clean = React.useMemo(
    () => (inBrowser && html ? DOMPurify.sanitize(html) : ''),
    [inBrowser, html]
  )
  return (
    <div
      data-slot="text-editor-content"
      className={cn('text-editor-content', className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}

export { TextEditor, TextEditorContent }
