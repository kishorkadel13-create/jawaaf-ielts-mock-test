import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Type } from 'lucide-react';

interface PassageEditorProps {
  passage: string;
  onChange: (value: string) => void;
}

export default function PassageEditor({ passage, onChange }: PassageEditorProps) {
  const [localPassage, setLocalPassage] = useState(passage || '');
  const latestSavedPassage = useRef(passage || '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestSavedPassage.current = passage || '';
    setLocalPassage(passage || '');
  }, [passage]);

  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
  }, []);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote'],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean'],
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list',
    'indent',
    'align',
    'blockquote',
    'color', 'background',
    'link',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Label */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <Type className="h-4 w-4 text-[#1E3A6E]" />
        <h3 className="font-extrabold text-[13px] text-[#05162E] uppercase tracking-wider">Passage Editor</h3>
        <span className="text-[11px] text-slate-400 font-medium ml-auto">Paste or type your reading passage below</span>
      </div>

      {/* Rich Text Editor */}
      <div className="passage-editor-wrapper">
        <ReactQuill
          theme="snow"
          value={localPassage}
          onChange={(value, _delta, source) => {
            setLocalPassage(value);

            if (source !== 'user' || value === latestSavedPassage.current) {
              return;
            }

            if (saveTimer.current) {
              clearTimeout(saveTimer.current);
            }

            saveTimer.current = setTimeout(() => {
              latestSavedPassage.current = value;
              onChange(value);
            }, 650);
          }}
          modules={modules}
          formats={formats}
          placeholder="Paste or type your reading passage here..."
        />
      </div>

      {/* Styling overrides injected as inline style tag */}
      <style>{`
        .passage-editor-wrapper .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background: #f8fafc;
          padding: 10px 16px;
          font-family: 'Inter', sans-serif;
        }
        .passage-editor-wrapper .ql-container.ql-snow {
          border: none !important;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 15px;
          line-height: 1.8;
          color: #1e293b;
        }
        .passage-editor-wrapper .ql-editor {
          min-height: 320px;
          padding: 24px 28px;
        }
        .passage-editor-wrapper .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: italic;
          left: 28px;
          right: 28px;
        }
        .passage-editor-wrapper .ql-editor p {
          margin-bottom: 12px;
        }
        .passage-editor-wrapper .ql-editor h1 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 16px;
          color: #0f172a;
        }
        .passage-editor-wrapper .ql-editor h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 14px;
          color: #0f172a;
        }
        .passage-editor-wrapper .ql-editor h3 {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .passage-editor-wrapper .ql-editor ol,
        .passage-editor-wrapper .ql-editor ul {
          padding-left: 24px;
          margin-bottom: 12px;
        }
        .passage-editor-wrapper .ql-editor li {
          margin-bottom: 6px;
        }
        .passage-editor-wrapper .ql-editor blockquote {
          border-left: 4px solid #1E3A6E;
          padding: 12px 20px;
          background: #EFF4FB;
          border-radius: 0 12px 12px 0;
          margin: 16px 0;
          color: #334155;
        }
        .passage-editor-wrapper .ql-snow .ql-picker {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 13px;
        }
        .passage-editor-wrapper .ql-toolbar button:hover,
        .passage-editor-wrapper .ql-toolbar button.ql-active {
          color: #1E3A6E !important;
        }
        .passage-editor-wrapper .ql-toolbar button:hover .ql-stroke,
        .passage-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: #1E3A6E !important;
        }
        .passage-editor-wrapper .ql-toolbar button:hover .ql-fill,
        .passage-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: #1E3A6E !important;
        }
      `}</style>
    </div>
  );
}
