import React, { useState } from 'react';

const ImageBlock = ({ content, onChange, onDelete }) => {
  const [imageUrl, setImageUrl] = useState(content || '');
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setImageUrl(e.target.value);
    onChange(e.target.value);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageUrl(event.target.result);
          onChange(event.target.result);
          setUploading(false);
        };
        reader.readAsDataURL(file);
      }, 500);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:border-[#10A37F]/50 transition-all duration-200">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B7280] font-medium">图片</div>
        <button
          onClick={onDelete}
          className="opacity-0 hover:opacity-100 p-2 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {imageUrl ? (
        <div className="relative">
          <div className="rounded-lg overflow-hidden bg-[#FAFAFA]">
            <img 
              src={imageUrl} 
              alt="图片" 
              className="w-full max-h-[300px] object-contain"
            />
          </div>
          <input
            type="text"
            value={imageUrl}
            onChange={handleChange}
            className="w-full mt-3 px-4 py-2.5 rounded-lg bg-[#FAFAFA] text-sm outline-none focus:ring-2 focus:ring-[#10A37F]/40 text-[#374151]"
            placeholder="图片URL..."
          />
        </div>
      ) : (
        <div className="relative">
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#E5E7EB] rounded-xl cursor-pointer hover:border-[#10A37F] hover:bg-[#FAFAFA] transition-all">
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" />
                <span className="text-sm text-[#6B7280]">上传中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-[#6B7280]">点击上传图片或输入URL</span>
              </div>
            )}
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={handleChange}
            className="w-full mt-3 px-4 py-2.5 rounded-lg bg-[#FAFAFA] text-sm outline-none focus:ring-2 focus:ring-[#10A37F]/40 text-[#374151]"
            placeholder="或直接输入图片URL..."
          />
        </div>
      )}
    </div>
  );
};

export default ImageBlock;