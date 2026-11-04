import React, { useState } from 'react';

const TodoBlock = ({ content, onChange, onDelete, onAddBlock }) => {
  const [todos, setTodos] = useState((content && JSON.parse(content)) || [
    { id: 1, text: '完成项目报告', completed: false },
    { id: 2, text: '回复邮件', completed: true },
    { id: 3, text: '准备会议材料', completed: false },
  ]);

  const addTodo = () => {
    const newTodo = { id: Date.now(), text: '', completed: false };
    setTodos([...todos, newTodo]);
    onChange(JSON.stringify([...todos, newTodo]));
  };

  const updateTodo = (id, text) => {
    const updated = todos.map(t => t.id === id ? { ...t, text } : t);
    setTodos(updated);
    onChange(JSON.stringify(updated));
  };

  const toggleTodo = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    onChange(JSON.stringify(updated));
  };

  const removeTodo = (id) => {
    const filtered = todos.filter(t => t.id !== id);
    setTodos(filtered);
    onChange(JSON.stringify(filtered));
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:border-[#10A37F]/50 transition-all duration-200">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#6B7280] font-medium">待办列表</div>
        <button
          onClick={onDelete}
          className="opacity-0 hover:opacity-100 p-2 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 待办列表 */}
      <div className="space-y-2">
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-3 group/item">
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                todo.completed 
                  ? 'bg-[#10A37F] border-[#10A37F]' 
                  : 'border-[#D1D5DB] hover:border-[#10A37F]'
              }`}
            >
              {todo.completed && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#1F1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <input
              type="text"
              value={todo.text}
              onChange={(e) => updateTodo(todo.id, e.target.value)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all ${
                todo.completed 
                  ? 'bg-[#FAFAFA] text-[#9CA3AF] line-through' 
                  : 'bg-[#FAFAFA] text-[#374151]'
              }`}
              placeholder="输入待办事项..."
            />
            <button
              onClick={() => removeTodo(todo.id)}
              className="opacity-0 group-hover/item:opacity-100 p-2 rounded-lg hover:bg-[#FEF2F2] text-[#9CA3AF] hover:text-[#DC2626] transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <button
        onClick={addTodo}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#10A37F] hover:text-[#10A37F] transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        添加待办
      </button>
    </div>
  );
};

export default TodoBlock;