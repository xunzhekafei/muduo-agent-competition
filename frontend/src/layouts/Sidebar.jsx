import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAgent } from '../features/agent/AgentContext';
import { LogoIcon } from '../shared/components/Logo';
import { logout } from '../api/client';

const ACCENT = '#10A37F';

const Icon = ({ d, className = 'h-4 w-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.7}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  newChat: 'M12 4.5v15m7.5-7.5h-15',
  tools: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  panel: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
};

const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversations, activeId, newChat, selectChat, deleteChat } = useAgent();

  const email = localStorage.getItem('auth_email') || '学生用户';

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleNewChat = () => {
    const id = newChat();
    navigate('/agent');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ===== 折叠态：极窄图标栏 =====
  if (collapsed) {
    return (
      <aside className="w-[56px] h-full flex flex-col items-center py-3 shrink-0 border-r border-black/[0.06]"
        style={{ backgroundColor: '#F9F9F9' }}>
        <button
          type="button"
          onClick={onToggle}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-black/[0.05] transition-colors"
          title="展开侧边栏"
        >
          <Icon d={ICONS.panel} className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleNewChat}
          className="mt-2 w-9 h-9 rounded-lg flex items-center justify-center text-[#1F1F1F] hover:bg-black/[0.05] transition-colors"
          title="新对话"
        >
          <Icon d={ICONS.newChat} className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/tools')}
          className="mt-1 w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-black/[0.05] transition-colors"
          title="工具库"
        >
          <Icon d={ICONS.tools} className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-black/[0.05] transition-colors"
          title="设置"
        >
          <Icon d={ICONS.settings} className="h-5 w-5" />
        </button>

        <div className="mt-2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
          style={{ backgroundColor: '#10A37F', color: '#fff' }}>
          学
        </div>
      </aside>
    );
  }

  // ===== 展开态：完整侧边栏 =====
  return (
    <aside className="w-[260px] h-full flex flex-col shrink-0 border-r border-black/[0.06]"
      style={{ backgroundColor: '#F9F9F9' }}>
      {/* 顶部：Logo + 折叠 */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={onToggle}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-black/[0.05] transition-colors shrink-0"
          title="折叠侧边栏"
        >
          <Icon d={ICONS.panel} className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <LogoIcon size={26} />
          <span className="text-[15px] font-semibold text-[#1F1F1F] truncate">木铎</span>
        </div>
      </div>

      {/* 新对话 */}
      <div className="px-3 pt-2 pb-1">
        <button
          type="button"
          onClick={handleNewChat}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: ACCENT }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0D8B6C')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ACCENT)}
        >
          <Icon d={ICONS.newChat} className="h-4 w-4" />
          新对话
        </button>
      </div>

      {/* 工具库入口 */}
      <div className="px-3 py-1">
        <button
          type="button"
          onClick={() => navigate('/tools')}
          className={`w-full h-10 flex items-center gap-3 px-3 rounded-xl text-sm transition-colors ${
            location.pathname === '/tools'
              ? 'bg-black/[0.06] text-[#1F1F1F] font-medium'
              : 'text-[#4b4b4b] hover:bg-black/[0.04]'
          }`}
        >
          <Icon d={ICONS.tools} />
          工具库
        </button>
      </div>

      {/* 对话历史 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-1.5 text-[11px] font-medium text-[#9CA3AF]">对话</p>
        {sorted.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#9CA3AF]">还没有对话记录</p>
        )}
        <ul className="space-y-0.5">
          {sorted.map((convo) => {
            const active = convo.id === activeId;
            return (
              <li key={convo.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    selectChat(convo.id);
                    navigate('/agent');
                  }}
                  className={`w-full h-9 flex items-center px-3 rounded-lg text-sm truncate transition-colors ${
                    active
                      ? 'bg-black/[0.06] text-[#1F1F1F] font-medium'
                      : 'text-[#4b4b4b] hover:bg-black/[0.04]'
                  }`}
                >
                  <span className="truncate">{convo.title || '新对话'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteChat(convo.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 hidden group-hover:flex items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#c0392b] hover:bg-black/[0.06] transition-colors"
                  title="删除对话"
                >
                  <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 底部：设置 + 账户 */}
      <div className="border-t border-black/[0.06] p-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={`w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm transition-colors ${
            location.pathname === '/settings'
              ? 'bg-black/[0.06] text-[#1F1F1F] font-medium'
              : 'text-[#4b4b4b] hover:bg-black/[0.04]'
          }`}
        >
          <Icon d={ICONS.settings} />
          设置
        </button>

        <div className="mt-2 flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-black/[0.04] transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ backgroundColor: '#10A37F', color: '#fff' }}>
            学
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#1F1F1F] truncate leading-tight">学生用户</p>
            <p className="text-[11px] text-[#9CA3AF] truncate leading-tight">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#c0392b] hover:bg-black/[0.06] transition-colors shrink-0"
            title="退出登录"
          >
            <Icon d={ICONS.logout} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
