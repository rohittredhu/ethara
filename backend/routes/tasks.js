import { Router } from 'express';
import prisma from '../database/prisma.js';
import { authenticateToken, requireProjectRole } from '../middleware/auth.js';

const router = Router();

// Apply auth token validation to all task routes
router.use(authenticateToken);

// POST /api/projects/:projectId/tasks - Create a task in a project (ADMIN role required)
router.post('/project/:projectId', requireProjectRole(['ADMIN']), async (req, res) => {
  const { projectId } = req.params;
  const { title, description, priority, dueDate, assignedToId } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const taskPriority = ['LOW', 'MEDIUM', 'HIGH'].includes(priority) ? priority : 'MEDIUM';
  const parsedDueDate = dueDate ? new Date(dueDate) : null;

  try {
    // If assignedToId is provided, verify they are a member of the project
    if (assignedToId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: assignedToId
          }
        }
      });

      if (!isMember) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project' });
      }
    }

    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        status: 'TODO',
        priority: taskPriority,
        dueDate: parsedDueDate,
        projectId,
        assignedToId: assignedToId || null,
        createdById: req.user.id
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error creating task' });
  }
});

// PUT /api/tasks/:taskId - Update a task (Admin can update all fields; Member can update status)
router.put('/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, assignedToId } = req.body;

  try {
    // 1. Find the task to check its project
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 2. Fetch user role in the task's project
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId: req.user.id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Unauthorized: you are not a member of this project' });
    }

    // 3. Define updates
    let updateData = {};

    if (membership.role === 'ADMIN') {
      // Admins have full access
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (status !== undefined) {
        if (!['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
          return res.status(400).json({ error: 'Invalid task status' });
        }
        updateData.status = status;
      }
      if (priority !== undefined) {
        if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
          return res.status(400).json({ error: 'Invalid priority level' });
        }
        updateData.priority = priority;
      }
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      
      if (assignedToId !== undefined) {
        if (assignedToId) {
          // Verify assignee is in project
          const isMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId: task.projectId,
                userId: assignedToId
              }
            }
          });
          if (!isMember) {
            return res.status(400).json({ error: 'Assigned user is not a member of this project' });
          }
          updateData.assignedToId = assignedToId;
        } else {
          updateData.assignedToId = null;
        }
      }
    } else {
      // Members can only update status
      if (title !== undefined || description !== undefined || priority !== undefined || dueDate !== undefined || assignedToId !== undefined) {
        return res.status(403).json({ error: 'Forbidden: Only project Admins can modify task details' });
      }

      if (status !== undefined) {
        if (!['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
          return res.status(400).json({ error: 'Invalid task status' });
        }
        updateData.status = status;
      }
    }

    // Perform update
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// DELETE /api/tasks/:taskId - Delete a task (ADMIN role required)
router.delete('/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    // 1. Find the task to check its project
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 2. Fetch user role in the task's project
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId: req.user.id
        }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Only project Admins can delete tasks' });
    }

    // 3. Delete task
    await prisma.task.delete({
      where: { id: taskId }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error deleting task' });
  }
});

export default router;
