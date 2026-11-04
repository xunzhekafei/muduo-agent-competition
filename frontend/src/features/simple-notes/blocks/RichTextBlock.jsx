import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    ['bold', 'underline', 'strike'],
    [{ header: 1 }, { header: 2 }, { header: 3 }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    [{ color: [] }, { background: [] }],
    ['link', 'image'],
    ['clean'],
  ],
};

const FORMATS = [
  'bold', 'underline', 'strike',
  'header', 'list', 'bullet', 'ordered',
  'blockquote', 'code-block',
  'color', 'background',
  'link', 'image',
];

const RichTextBlock = ({ content, onChange, onDelete }) => {
  const [text, setText] = useState(content || '');

  const handleChange = (value) => {
    setText(value);
    onChange(value);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] hover:border-[#10A37F]/50 transition-all duration-200">
      {/* 顶部标签 + 删除按钮 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="text-xs text-[#6B7280] font-medium">文本</div>
        <button
          onClick={onDelete}
          className="opacity-0 hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      {/* 富文本编辑器 */}
      <div className="quill-wrapper">
      <ReactQuill
        value={text}
        onChange={handleChange}
        placeholder="输入文本内容..."
        theme="snow"
        modules={MODULES}
        formats={FORMATS}
      />
      </div>
    </div>
  );
};

export default RichTextBlock;
