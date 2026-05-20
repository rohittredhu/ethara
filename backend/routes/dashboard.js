import { Router } from 'express';
import prisma from '../database/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    // 1. Get all projects user is a member of
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });

    const projectIds = memberships.map(m => m.projectId);

    if (projectIds.length === 0) {
      // User has no projects, return empty statistics structure
      return res.json({
        totalTasks: 0,
        statusCounts: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
        priorityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        overdueCount: 0,
        upcomingTasks: [],
        projectsSummary: []
      });
    }

    // 2. Query all tasks within these projects
    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds }
      },
      include: {
        project: {
          select: { name: true }
        },
        assignee: {
          select: { name: true }
        }
      }
    });

    // 3. Perform dashboard aggregations
    let totalTasks = tasks.length;
    let statusCounts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    let priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    let overdueCount = 0;
    const now = new Date();

    const formattedTasks = [];

    tasks.forEach(task => {
      // Status counting
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++;
      }
      
      // Priority counting
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++;
      }

      // Overdue calculation (Due date is in the past AND status is not DONE)
      if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'DONE') {
        overdueCount++;
      }
    });

    // 4. Extract upcoming incomplete tasks (due in the future, limit to 5)
    const upcomingTasks = tasks
      .filter(t => t.dueDate && new Date(t.dueDate) >= now && t.status !== 'DONE')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        projectName: t.project.name,
        priority: t.priority,
        status: t.status,
        assigneeName: t.assignee?.name || 'Unassigned'
      }));

    // 5. Aggregate project summaries (completion rates, task counts)
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds }
      },
      include: {
        tasks: true
      }
    });

    const projectsSummary = projects.map(proj => {
      const projTasks = proj.tasks;
      const total = projTasks.length;
      const completed = projTasks.filter(t => t.status === 'DONE').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        id: proj.id,
        name: proj.name,
        totalTasks: total,
        completedTasks: completed,
        progress
      };
    });

    res.json({
      totalTasks,
      statusCounts,
      priorityCounts,
      overdueCount,
      upcomingTasks,
      projectsSummary
    });
  } catch (error) {
    console.error('Fetch dashboard summary error:', error);
    res.status(500).json({ error: 'Server error retrieving dashboard metrics' });
  }
});

export default router;
