import { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing... Use [[title]] to link to another note.',
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-blue-600 underline' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none outline-none',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <ToolButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          label="H1"
        />
        <ToolButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="H3"
        />
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
          style="font-bold"
        />
        <ToolButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          style="italic"
        />
        <ToolButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          label="&lt;/&gt;"
        />
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="•"
        />
        <ToolButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1."
        />
        <ToolButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="❝"
        />
        <ToolButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          label="📋"
        />
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={setLink}
          className={`px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500'
          }`}
          title="Add link"
        >
          🔗
        </button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="min-h-[400px]" />
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  style = '',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  style?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors ${
        active ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500'
      } ${style}`}
    >
      {label}
    </button>
  );
}
