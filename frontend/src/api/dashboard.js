import { apiRequest } from './client';
import { mockDashboardOverview } from '../mocks/mockData.jsx';

/**
 * 获取学习仪表盘聚合数据
 * GET /api/v1/dashboard/overview → DashboardOverviewResponse
 *
 * 按契约返回：weeklyGoal / todayStudyMinutes / streakDays / tasks / mastery
 * API 失败时使用 mock 数据作为降级
 */
export async function fetchDashboardData() {
  try {
    const result = await apiRequest('/api/v1/dashboard/overview');
    return result.data;
  } catch (error) {
    console.warn('Dashboard API failed, falling back to mock data:', error);
    return mockDashboardOverview.data;
  }
}
