import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSharedAssets, addInteraction, collectAsset } from '../../api/community';
import { PageHeader, Button, Icon } from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';

const ICON_COMMUNITY = 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z';
const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

// ── 关注列表（暂留，后端尚未提供关注 API） ──
const FOLLOW_DATA = [
  { id: 1, name: '张同学', avatar: '张', bio: '高等数学达人，专注知识图谱整理', direction: '数学/计算机', followers: 128, following: true },
  { id: 2, name: '李同学', avatar: '李', bio: '费曼练习爱好者，日均3次讲解', direction: '物理/电子', followers: 64, following: true },
  { id: 3, name: '王老师', avatar: '王', bio: '数据结构课程助教，分享学习模板', direction: '计算机/算法', followers: 256, following: true },
  { id: 4, name: '马同学', avatar: '马', bio: '考研政治高分分享，马原知识框架', direction: '政治/哲学', followers: 89, following: false },
];

const ALL_TAGS = ['全部', '操作系统', '数据结构', '计算机网络', '408考研', '考研数学', '考研政治', '费曼法', '记忆卡片', '思考模式', '思维导图'];

const ASSET_EMOJI_MAP = {
  note: '📝',
  knowledge_graph: '🔗',
  thinking_chain: '💡',
  feynman_session: '🗣',
  review_template: '📋',
};
const DEFAULT_EMOJI = '📖';

function formatRelative(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return '刚刚';
  if (diffH < 24) return `${diffH}h前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  const palette = ['#e8f0e8', '#e8ecf4', '#e8f4ec', '#f4efe8', '#e8f4f0', '#f0ece8', '#ece8f0', '#f0f4e8'];
  return palette[Math.abs(h) % palette.length];
}

function assetToCard(asset) {
  return {
    id: asset.id,
    author: asset.authorName || '用户',
    avatar: (asset.authorName || '用')[0],
    title: asset.title,
    preview: asset.description || '',
    tags: asset.tags || [],
    likes: asset.likes ?? 0,
    comments: asset.comments || [],
    time: formatRelative(asset.createdAt),
    cover: hashColor(asset.title),
    emoji: ASSET_EMOJI_MAP[asset.assetType] || DEFAULT_EMOJI,
    collected: asset.collected ?? false,
    liked: asset.liked ?? false,
  };
}

// ── 主组件 ──
const Community = () => {
  const { askAI } = useAgent();
  const navigate = useNavigate();
  const askAboutCommunity = () => {
    askAI('帮我看看社区里有哪些值得我收藏的学习资产，结合我最近学的课程推荐一下');
    navigate('/agent');
  };

  const [tab, setTab] = useState('discover');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTag, setActiveTag] = useState('全部');
  const [posts, setPosts] = useState([]);
  const [followList, setFollowList] = useState(FOLLOW_DATA);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentInputs, setCommentInputs] = useState({});
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 1500); }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchSharedAssets();
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setPosts(list.map(assetToCard));
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleLike = async (e, id) => {
    e.stopPropagation();
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const wasLiked = post.liked;
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, likes: wasLiked ? x.likes - 1 : x.likes + 1, liked: !wasLiked } : x)));
    try {
      await addInteraction({ targetId: id, interactionType: 'like' });
    } catch {
      setPosts((p) => p.map((x) => (x.id === id ? { ...x, likes: wasLiked ? x.likes + 1 : x.likes - 1, liked: wasLiked } : x)));
      showToast('操作失败，请重试');
    }
  };

  const handleCollect = async (e, id) => {
    e.stopPropagation();
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const wasCollected = post.collected;
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, collected: !x.collected } : x)));
    showToast(wasCollected ? '已取消收藏' : '已加入收藏');
    try {
      if (!wasCollected) await collectAsset(id);
    } catch {
      setPosts((p) => p.map((x) => (x.id === id ? { ...x, collected: wasCollected } : x)));
      showToast('操作失败，请重试');
    }
  };

  const handleFollow = (e, id) => {
    e.stopPropagation();
    setFollowList((p) => p.map((x) => (x.id === id ? { ...x, following: !x.following } : x)));
  };

  const toggleComments = (e, id) => {
    e.stopPropagation();
    setExpandedComments((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const addCommentFn = async (e, id) => {
    e.stopPropagation();
    const txt = commentInputs[id];
    if (!txt?.trim()) return;
    const trimmed = txt.trim();
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, comments: [...x.comments, trimmed] } : x)));
    setCommentInputs((p) => ({ ...p, [id]: '' }));
    try {
      await addInteraction({ targetId: id, interactionType: 'comment', body: trimmed });
    } catch {
      showToast('评论发送失败，请重试');
    }
  };

  const filteredPosts = useMemo(() => {
    let p = posts;
    if (search) p = p.filter((x) => x.title.includes(search) || x.tags.some((t) => t.includes(search)) || x.author.includes(search));
    if (activeTag !== '全部') p = p.filter((x) => x.tags.includes(activeTag));
    return p;
  }, [search, activeTag, posts]);

  const collectedPosts = posts.filter((p) => p.collected);
  const followingUsers = followList.filter((f) => f.following);

  const renderCard = (post, badge) => (
    <div key={post.id} className="break-inside-avoid card overflow-hidden card-hover cursor-pointer group">
      <div className="h-36 flex items-center justify-center text-4xl relative" style={{ backgroundColor: post.cover }}>
        {post.emoji}
        {badge && <span className="absolute top-3 right-3 text-[10px] bg-white/85 text-[#6b7280] px-2 py-0.5 rounded-lg font-medium">{badge}</span>}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#e8ecf4] text-[#5a6a8a] flex-shrink-0">{post.avatar}</div>
          <span className="text-sm font-semibold text-[#1f2937]">{post.author}</span>
          <span className="text-xs text-[#9ca3af] ml-auto">{post.time}</span>
        </div>
        <h3 className="font-bold text-[#1f2937] mb-2 leading-snug">{post.title}</h3>
        <p className="text-sm text-[#6b7280] leading-relaxed line-clamp-3 mb-3">{post.preview}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((t) => <button key={t} onClick={(e) => { e.stopPropagation(); setActiveTag(t); }} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#f3f4f6] text-[#6b7280] font-medium hover:bg-[#e5e7eb] transition-colors">{t}</button>)}
        </div>
        <div className="flex items-center gap-4 text-xs text-[#9ca3af] pt-3 border-t border-[#f3f4f6]">
          <button onClick={(e) => handleLike(e, post.id)} className={`flex items-center gap-1 transition-all duration-200 ${post.liked ? 'text-[#ef4444] scale-110' : ''} hover:text-[#ef4444]`}>
            <svg className="h-3.5 w-3.5" fill={post.liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            <span className="font-medium">{post.likes}</span>
          </button>
          <button onClick={(e) => toggleComments(e, post.id)} className="flex items-center gap-1 hover:text-[#1f2937] transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48" /></svg>
            <span className="font-medium">{post.comments.length}</span>
          </button>
          <button onClick={(e) => handleCollect(e, post.id)} className={`ml-auto text-xs font-semibold transition-colors ${post.collected ? 'text-[#1A7A57]' : ''} hover:text-[#1f2937]`}>
            {post.collected ? '已收藏' : '收藏'}
          </button>
        </div>
        {expandedComments.has(post.id) && (
          <div className="mt-3 pt-3 border-t border-[#f3f4f6] space-y-2" onClick={(e) => e.stopPropagation()}>
            {post.comments.map((c, i) => <p key={i} className="text-xs text-[#6b7280] bg-[#f9fafb] p-2 rounded-xl">{c}</p>)}
            <div className="flex gap-1">
              <input className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#f3f4f6] placeholder:text-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#10A37F]"
                placeholder="添加评论..." value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs((p) => ({ ...p, [post.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addCommentFn(e, post.id)} />
              <button onClick={(e) => addCommentFn(e, post.id)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#10A37F] text-[#1f2937] hover:bg-[#0D8B6C]">发送</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium bg-[#10A37F] text-[#1f2937] shadow-sm">{toast}</div>}

      {/* ===== 左侧导航 ===== */}
      <div className="w-[200px] flex-shrink-0">
        <div className="card p-4 space-y-0.5">
          {[
            { key: 'discover', label: '发现', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747" /> },
            { key: 'favorites', label: '我的收藏', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185" /> },
            { key: 'following', label: '已关注', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766" /> },
            { key: 'history', label: '历史足迹', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
          ].map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.key ? 'bg-[#10A37F] text-[#1f2937]' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={tab === item.key ? 2 : 1.5}>{item.icon}</svg>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== 主内容区 ===== */}
      <div className="flex-1 min-w-0 space-y-5">
        <PageHeader
          icon={ICON_COMMUNITY}
          title="共享社区"
          description="发现优质学习资产，连接同路人"
          actions={
            <Button variant="ghost" onClick={askAboutCommunity}>
              <Icon d={ICON_CHAT} className="h-4 w-4" />
              问 AI
            </Button>
          }
        />

        {/* 发现 Tab */}
        {tab === 'discover' && <>
          <div className={`rounded-2xl transition-all duration-300 ${searchFocused ? 'ring-2 ring-[#10A37F]/40' : ''}`}>
            <div className="relative bg-white rounded-2xl shadow-sm">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm bg-transparent placeholder:text-[#9ca3af] focus:outline-none" placeholder="搜索笔记、课程、用户、标签..."
                value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALL_TAGS.map((t) => <button key={t} onClick={() => setActiveTag(t)} className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${activeTag === t ? 'bg-[#10A37F] border-[#10A37F] text-[#1f2937] font-semibold' : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#10A37F]'}`}>{t}</button>)}
          </div>

          {loading && (
            <div className="columns-2 gap-5 space-y-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="break-inside-avoid card overflow-hidden animate-pulse">
                  <div className="h-36 bg-[#f3f4f6]" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#f3f4f6]" /><div className="h-4 bg-[#f3f4f6] rounded w-20" /></div>
                    <div className="h-5 bg-[#f3f4f6] rounded w-3/4" />
                    <div className="h-4 bg-[#f3f4f6] rounded w-full" />
                    <div className="flex gap-2"><div className="h-5 bg-[#f3f4f6] rounded w-12" /><div className="h-5 bg-[#f3f4f6] rounded w-12" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#fce4e4] flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-[#c0392b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              </div>
              <p className="text-ink-secondary font-medium mb-1">加载失败</p>
              <p className="text-ink-tertiary text-sm mb-4">{error}</p>
              <button onClick={loadPosts} className="btn-primary">重试</button>
            </div>
          )}

          {!loading && !error && filteredPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-black/[0.02] flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-ink-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
              </div>
              <p className="text-ink-secondary font-medium mb-1">社区还没有内容</p>
              <p className="text-ink-tertiary text-sm mb-4">成为第一个分享学习笔记的人</p>
            </div>
          )}

          {!loading && !error && filteredPosts.length > 0 && (
            <div className="columns-2 gap-5 space-y-5">{filteredPosts.map((p) => renderCard(p))}</div>
          )}
        </>}

        {/* 我的收藏 */}
        {tab === 'favorites' && (
          collectedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center card">
              <div className="w-16 h-16 rounded-2xl bg-black/[0.02] flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-ink-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185" /></svg>
              </div>
              <p className="text-ink-secondary font-medium mb-1">暂无收藏</p>
              <p className="text-ink-tertiary text-sm">去发现页面看看吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {collectedPosts.map((p) => (
                <div key={p.id} className="card overflow-hidden card-hover cursor-pointer group">
                  <div className="h-24 flex items-center justify-center text-2xl" style={{ backgroundColor: p.cover }}>{p.emoji}</div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{p.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-[#9ca3af]">{p.author} · {p.time}</span>
                      <button onClick={() => handleCollect({ stopPropagation: () => {} }, p.id)} className="text-xs font-semibold text-[#1A7A57] hover:text-[#c0392b]">取消收藏</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 已关注 */}
        {tab === 'following' && (
          <div className="grid grid-cols-2 gap-4">
            {followList.map((f) => (
              <div key={f.id} className="card p-5 flex items-center gap-4 card-hover">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 bg-[#e8ecf4] text-[#5a6a8a]">{f.avatar}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1f2937]">{f.name}</h3>
                  <p className="text-xs text-[#6b7280] mt-1 line-clamp-1">{f.bio}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge text-[10px] bg-[#e8f4ec] text-[#1A7A57]">{f.direction}</span>
                    <span className="text-[10px] text-[#9ca3af]">{f.followers} 粉丝</span>
                  </div>
                </div>
                <button onClick={(e) => handleFollow(e, f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${f.following ? 'bg-[#10A37F] text-[#1f2937]' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'}`}>
                  {f.following ? '已关注' : '+ 关注'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 历史足迹 */}
        {tab === 'history' && (
          <div className="flex flex-col items-center justify-center py-20 text-center card">
            <div className="w-16 h-16 rounded-2xl bg-black/[0.02] flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-ink-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-ink-secondary font-medium mb-1">历史足迹</p>
            <p className="text-ink-tertiary text-sm">即将上线，敬请期待</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
