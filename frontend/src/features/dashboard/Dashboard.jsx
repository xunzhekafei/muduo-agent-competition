import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart } from '../../shared/components';
import {
  PageHeader,
  Card,
  Stat,
  Badge,
  Progress,
  Button,
  Icon,
  Loading,
  ErrorState,
} from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';
import { fetchDashboardData } from '../../api/dashboard';
import { LEARNING_MODES, TASK_MODE_PATH, MODE_ICONS } from '../../shared/constants';

// Mock 降级数据（后端未就绪时保证页面完整）
const ACTIVITIES = [
  { id: 1, type: 'memory', action: '完成了 12 张记忆卡复习', course: '高等数学', time: '10 分钟前' },
  { id: 2, type: 'thinking', action: 'AI 追问了 3 个导数推导问题', course: '高等数学', time: '45 分钟前' },
  { id: 3, type: 'quick', action: '录制了 45 分钟课堂速记', course: '数据结构', time: '2 小时前' },
  { id: 4, type: 'feynman', action: '完成牛顿定律费曼讲解', course: '大学物理', time: '3 小时前' },
  { id: 5, type: 'resource', action: '导入 PDF 并生成结构化笔记', course: '操作系统', time: '昨天' },
];

const AI_SUGGESTIONS = [
  { id: 1, text: '复习《可导与连续》记忆卡', reason: '记忆曲线显示即将遗忘', priority: 'high' },
  { id: 2, text: '完成《链表反转》费曼讲解', reason: '上次评估逻辑完整度仅 60%', priority: 'medium' },
  { id: 3, text: '整理《进程调度》速记笔记', reason: '已积累 3 条未处理速记', priority: 'medium' },
];

const RECENT_COURSES = [
  { id: 'c1', name: '高等数学', subject: '数学', notes: 24, mastery: 78, color: '#10A37F' },
  { id: 'c2', name: '数据结构', subject: '计算机', notes: 18, mastery: 65, color: '#4A7DCE' },
  { id: 'c3', name: '大学物理', subject: '物理', notes: 15, mastery: 82, color: '#F0A040' },
  { id: 'c4', name: '操作系统', subject: '计算机', notes: 8, mastery: 45, color: '#B794F4' },
];

const MODE_COLOR = { blue: '#4A7DCE', green: '#10A37F', orange: '#F0A040', purple: '#B794F4' };
const MODE_BG = { blue: '#EEF3FC', green: '#EAF6F2', orange: '#FCF3E7', purple: '#F4F0FC' };

const priorityTone = { high: 'danger', medium: 'warning', low: 'success' };
const priorityLabel = { high: '优先', medium: '今日', low: '稍后' };

const ICON_DASHBOARD =
  'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25';
const ICON_FOLDER =
  'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z';
const ICON_CLOCK = 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z';
const ICON_CHECK = 'M4.5 12.75l6 6 9-13.5';
const ICON_SPARKLE =
  'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z';
const ICON_CHAT =
  'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

const Dashboard = () => {
  const navigate = useNavigate();
  const { askAI } = useAgent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchDashboardData()
      .then((d) => setOverview(d))
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const askAboutToday = () => {
    askAI('根据我最近的学习数据，帮我总结掌握情况，并给一个今天的复习建议');
    navigate('/agent');
  };

  if (loading) return <Loading className="min-h-[60vh]" />;
  if (error) return <ErrorState message="学习数据加载失败" onRetry={load} />;
  if (!overview) return null;

  const { weeklyGoal, streakDays, stats, tasks, mastery, activities, weeklyTrend, recentCourses } = overview;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ICON_DASHBOARD}
        title="学习中枢"
        description="总览你的学习数据、掌握度与今日任务"
        actions={
          <>
            <Button variant="ghost" onClick={askAboutToday}>
              <Icon d={ICON_CHAT} className="h-4 w-4" />
              问 AI
            </Button>
            <Button onClick={() => navigate('/quick-notes')}>开始速记</Button>
          </>
        }
      />

      {/* 4 个指标卡 */}
      <div className="grid grid-cols-4 gap-4">
        <Stat label="今日学习时长" value={`${stats?.todayMinutes || 4.2}h`} icon={<Icon d={ICON_CLOCK} className="h-5 w-5" />} />
        <Stat label="记忆完成率" value={`${stats?.memoryMastered ?? mastery?.mastered ?? 65}%`} icon={<Icon d={ICON_CHECK} className="h-5 w-5" />} />
        <Stat label="思考链增长" value={`+${stats?.thinkingCount ?? 8}`} icon={<Icon d={ICON_SPARKLE} className="h-5 w-5" />} />
        <Stat label="费曼输出次数" value={`${stats?.feynmanCount ?? 12} 次`} icon={<Icon d={ICON_CHAT} className="h-5 w-5" />} />
      </div>

      {/* 学习时间流 + AI 建议 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <h3 className="text-[15px] font-semibold text-ink-900 mb-5">学习时间流</h3>
          <div className="relative pl-5 border-l border-line space-y-5">
            {(activities?.length ? activities : ACTIVITIES).map((a) => (
              <div key={a.id} className="relative">
                <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-ink-300 bg-white" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{a.action}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{a.courseName || a.course}</p>
                  </div>
                  <span className="text-xs text-ink-400 flex-shrink-0 ml-2">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-ink-900">AI 学习建议</h3>
            <Badge tone="brand">基于记忆曲线</Badge>
          </div>
          <div className="space-y-2.5">
            {AI_SUGGESTIONS.map((s) => (
              <button
                key={s.id}
                onClick={askAboutToday}
                className="w-full text-left p-3 rounded-xl border border-line hover:border-brand-500/40 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Badge tone={priorityTone[s.priority]} className="mt-0.5 shrink-0">
                    {priorityLabel[s.priority]}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 leading-snug">{s.text}</p>
                    <p className="text-xs text-ink-400 mt-1">{s.reason}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
            <span className="text-xs text-ink-500">连续学习</span>
            <span className="text-2xl font-semibold text-ink-900">
              {streakDays} <span className="text-sm font-normal text-ink-500">天</span>
            </span>
          </div>
        </Card>
      </div>

      {/* 今日任务 + 学习模式 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">今日学习任务</h3>
              <p className="text-xs text-ink-400 mt-0.5">{tasks?.length || 0} 项待完成</p>
            </div>
            <button onClick={() => navigate('/note-management')} className="text-xs font-medium text-ink-500 hover:text-ink-900 transition-colors">
              查看全部 →
            </button>
          </div>
          {tasks?.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => navigate(TASK_MODE_PATH[task.mode] || '/dashboard')}
                  className="p-4 rounded-xl border border-line text-left hover:border-brand-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={priorityTone[task.priority]}>{priorityLabel[task.priority]}</Badge>
                    <span className="text-[11px] text-ink-400">{task.durationMinutes}min</span>
                  </div>
                  <h4 className="text-sm font-semibold text-ink-900 mb-1">{task.title}</h4>
                  <p className="text-xs text-ink-500">{task.courseName}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-400 py-8 text-center">今日暂无任务</p>
          )}
        </Card>

        <Card>
          <h3 className="text-[15px] font-semibold text-ink-900 mb-4">学习模式</h3>
          <div className="grid grid-cols-2 gap-3">
            {LEARNING_MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => navigate(mode.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-line hover:border-brand-500/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: MODE_BG[mode.color] }}>
                  <Icon d={MODE_ICONS[mode.key]} className="h-4 w-4" style={{ color: MODE_COLOR[mode.color] }} />
                </div>
                <span className="text-xs font-medium text-ink-900">{mode.title}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 趋势 + 掌握度 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">本周学习趋势</h3>
              <p className="text-xs text-ink-400 mt-0.5">每日学习时长</p>
            </div>
            <span className="text-lg font-semibold text-ink-900">
              {weeklyTrend
                ? weeklyTrend.reduce((s, d) => s + (d['课程学习'] + d['费曼练习'] + d['记忆复习'] + d['思考推导']), 0).toFixed(1)
                : '15.5'}h
            </span>
          </div>
          <BarChart data={weeklyTrend} />
          <div className="mt-3 pt-3 border-t border-line flex items-center gap-5">
            {[
              { l: '课程学习', c: '#10A37F' },
              { l: '费曼练习', c: '#63B3ED' },
              { l: '记忆复习', c: '#F0A040' },
              { l: '思考推导', c: '#B794F4' },
            ].map((i) => (
              <div key={i.l} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.c }} />
                <span className="text-xs text-ink-500">{i.l}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card padded className="flex-1 flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-ink-900 mb-4">本周目标</h3>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-semibold text-ink-900">{weeklyGoal.percentage}%</span>
              <span className="text-xs text-ink-500">
                {weeklyGoal.completedHours}/{weeklyGoal.targetHours}h
              </span>
            </div>
            <Progress value={weeklyGoal.percentage} />
          </Card>
          <Card padded className="flex-1 flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-ink-900 mb-4">掌握度</h3>
            {[
              { l: '已掌握', v: mastery.mastered, c: '#10A37F' },
              { l: '复习中', v: mastery.reviewing, c: '#F0A040' },
              { l: '薄弱项', v: mastery.weak, c: '#E0A0A0' },
            ].map((i) => (
              <div key={i.l} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="text-xs text-ink-500 w-12">{i.l}</span>
                <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${i.v}%`, backgroundColor: i.c }} />
                </div>
                <span className="text-xs font-semibold text-ink-900 w-8 text-right">{i.v}%</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* 最近课程 */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold text-ink-900">最近课程</h3>
            <p className="text-xs text-ink-400 mt-0.5">按掌握度排序</p>
          </div>
          <button onClick={() => navigate('/note-management')} className="text-xs font-medium text-ink-500 hover:text-ink-900 transition-colors">
            管理课程 →
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {(recentCourses?.length ? recentCourses : RECENT_COURSES).map((c) => (
            <button
              key={c.id}
              onClick={() => navigate('/note-management')}
              className="p-5 rounded-xl border border-line text-center hover:border-brand-500/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: c.color }}>
                <Icon d={ICON_FOLDER} className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-ink-900 mb-1">{c.name}</h4>
              <p className="text-xs text-ink-400 mb-3">{c.notes} 篇笔记</p>
              <div className="w-full">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-ink-400">掌握度</span>
                  <span className="font-semibold text-ink-900">{c.mastery}%</span>
                </div>
                <Progress value={c.mastery} />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
