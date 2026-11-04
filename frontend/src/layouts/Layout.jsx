import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToolHeader from './ToolHeader';
import { AgentProvider } from '../features/agent/AgentContext';

const CHAT_PATHS = ['/agent'];

/**
 * ChatGPT 桌面客户端式布局：
 * 左侧可折叠会话栏 + 右侧主区。
 * 对话页（/agent）全屏无 padding，其余工具页滚动并带极简标题栏。
 */
const Layout = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isChat = CHAT_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
  );

  return (
    <AgentProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-white">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <main className="flex-1 min-w-0 flex flex-col">
          {!isChat && <ToolHeader />}
          <div className={`flex-1 min-h-0 ${isChat ? 'flex' : 'overflow-y-auto px-8 py-6'}`}>
            {isChat ? (
              children
            ) : (
              <div className="max-w-[1200px] mx-auto w-full">{children}</div>
            )}
          </div>
        </main>
      </div>
    </AgentProvider>
  );
};

export default Layout;
