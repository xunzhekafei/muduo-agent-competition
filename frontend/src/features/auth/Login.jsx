import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setAuthToken } from '../../api/client';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/agent');
    } catch (err) {
      if (err.message.includes('JSON') || err.message.includes('Failed to fetch')) {
        setError('无法连接到服务器，请确保后端服务已启动');
      } else {
        setError(err.message || '登录失败，请检查邮箱和密码');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('demo@muduo.local');
    setPassword('demo123456');
  };

  const handleOfflineDemo = () => {
    setAuthToken('mock-token-for-demo');
    navigate('/agent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-[380px] mx-auto px-6">
        {/* Logo & Title */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: '#10A37F' }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1F1F] mb-1">木铎笔记</h1>
          <p className="text-sm text-[#6B7280]">会自己查笔记、安排复习的 AI 学习助手</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F1F1F] mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              className="w-full px-4 py-3 bg-white border border-black/[0.1] rounded-xl text-sm text-[#1F1F1F] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/20 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F1F1F] mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 bg-white border border-black/[0.1] rounded-xl text-sm text-[#1F1F1F] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/20 transition-all"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#FDF0EF] px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 inline-flex items-center justify-center rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#10A37F' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0D8B6C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10A37F')}
          >
            {loading ? '登录中…' : '登录'}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full h-11 text-sm font-medium text-[#4b4b4b] bg-white border border-black/[0.1] rounded-xl hover:bg-[#FAFAFA] transition-colors"
          >
            使用演示账号登录
          </button>

          <button
            type="button"
            onClick={handleOfflineDemo}
            className="w-full h-11 text-sm font-medium text-[#10A37F] bg-[#EAF6F2] rounded-xl hover:bg-[#DDF0EA] transition-colors"
          >
            离线演示模式（无需后端）
          </button>
        </form>

        <p className="text-center text-xs text-[#B0B0B0] mt-8">
          Muduo Notes © 2024
        </p>
      </div>
    </div>
  );
};

export default Login;
