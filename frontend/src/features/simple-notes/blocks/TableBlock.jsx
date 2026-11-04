import React, { useState } from 'react';

const TableBlock = ({ content, onChange, onDelete }) => {
  const [tableData, setTableData] = useState((content && JSON.parse(content)) || {
    headers: ['列1', '列2', '列3'],
    rows: [
      ['数据1', '数据2', '数据3'],
      ['数据4', '数据5', '数据6'],
    ],
  });

  const addRow = () => {
    const newRow = Array(tableData.headers.length).fill('');
    const updated = { ...tableData, rows: [...tableData.rows, newRow] };
    setTableData(updated);
    onChange(JSON.stringify(updated));
  };

  const addColumn = () => {
    const updated = {
      ...tableData,
      headers: [...tableData.headers, `列${tableData.headers.length + 1}`],
      rows: tableData.rows.map(row => [...row, '']),
    };
    setTableData(updated);
    onChange(JSON.stringify(updated));
  };

  const updateCell = (rowIdx, colIdx, value) => {
    const updated = {
      ...tableData,
      rows: tableData.rows.map((row, rIdx) =>
        rIdx === rowIdx ? row.map((cell, cIdx) => (cIdx === colIdx ? value : cell)) : row
      ),
    };
    setTableData(updated);
    onChange(JSON.stringify(updated));
  };

  const updateHeader = (colIdx, value) => {
    const updated = {
      ...tableData,
      headers: tableData.headers.map((header, idx) => (idx === colIdx ? value : header)),
    };
    setTableData(updated);
    onChange(JSON.stringify(updated));
  };

  const removeRow = (rowIdx) => {
    const updated = { ...tableData, rows: tableData.rows.filter((_, idx) => idx !== rowIdx) };
    setTableData(updated);
    onChange(JSON.stringify(updated));
  };

  const removeColumn = (colIdx) => {
    const updated = {
      ...tableData,
      headers: tableData.headers.filter((_, idx) => idx !== colIdx),
      rows: tableData.rows.map(row => row.filter((_, idx) => idx !== colIdx)),
    };
    setTableData(updated);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:border-[#10A37F]/50 transition-all duration-200">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[#6B7280] font-medium">表格</div>
        <button
          onClick={onDelete}
          className="opacity-0 hover:opacity-100 p-2 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {tableData.headers.map((header, idx) => (
                <th key={idx} className="relative group/th px-4 py-3 bg-[#FAFAFA] border border-[#E5E7EB]">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(idx, e.target.value)}
                    className="w-full text-sm font-medium text-[#374151] bg-transparent border-none outline-none"
                  />
                  {tableData.headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#F3F4F6] text-[#9CA3AF] text-xs flex items-center justify-center opacity-0 group-hover/th:opacity-100 hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all"
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="group/tr hover:bg-[#FAFAFA]">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 border border-[#E5E7EB]">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      className="w-full text-sm text-[#374151] bg-transparent border-none outline-none"
                      placeholder="输入内容..."
                    />
                  </td>
                ))}
                {tableData.rows.length > 1 && (
                  <td className="px-1 border border-[#E5E7EB] opacity-0 group-hover/tr:opacity-100 transition-opacity">
                    <button
                      onClick={() => removeRow(rowIdx)}
                      className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 添加按钮 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#10A37F] hover:text-[#10A37F] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加行
        </button>
        <button
          onClick={addColumn}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#10A37F] hover:text-[#10A37F] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12H3m0 0v3m0-3h3m3-3v3m0 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          添加列
        </button>
      </div>
    </div>
  );
};

export default TableBlock;