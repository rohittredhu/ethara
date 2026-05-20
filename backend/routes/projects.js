import { Router } from 'express';
import prisma from '../database/prisma.js';
import { authenticateToken, requireProjectRole } from '../middleware/auth.js';

const router = Router();

// Apply auth token validation to all project routes
router.use(authenticateToken);

// GET /api/projects - Get all projects current user belongs to
router.get('/', async (req, res) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      include: {
        project: {
          include: {
            _count: {
              select: { members: true, tasks: true }
            }
          }
        }
      }
    });

    // Format output to return project details with role
    const projects = memberships.map(m => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      joinedAt: m.joinedAt,
      membersCount: m.project._count.members,
      tasksCount: m.project._count.tasks,
      createdAt: m.project.createdAt
    }));

    res.json(projects);
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    // Create project and assign creator as ADMIN in a single transaction
    const newProject = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: true
      }
    });

    res.status(201).json({
      id: newProject.id,
      name: newProject.name,
      description: newProject.description,
      role: 'ADMIN',
      createdAt: newProject.createdAt
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error creating project' });
  }
});

// GET /api/projects/:projectId - Get details of a single project (Members & Tasks included)
router.get('/:projectId', requireProjectRole(['ADMIN', 'MEMBER']), async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true }
            },
            creator: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Determine current user's role on this project
    const userMember = project.members.find(m => m.userId === req.user.id);
    const userRole = userMember ? userMember.role : 'MEMBER';

    // Format result
    const result = {
      id: project.id,
      name: project.name,
      description: project.description,
      currentUserRole: userRole,
      createdAt: project.createdAt,
      members: project.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      tasks: project.tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email } : null,
        creator: { id: t.creator.id, name: t.creator.name },
        createdAt: t.createdAt
      }))
    };

    res.json(result);
  } catch (error) {
    console.error('Fetch project details error:', error);
    res.status(500).json({ error: 'Server error retrieving project details' });
  }
});

// DELETE /api/projects/:projectId - Delete project (ADMIN role required)
router.delete('/:projectId', requireProjectRole(['ADMIN']), async (req, res) => {
  const { projectId } = req.params;

  try {
    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error deleting project' });
  }
});

// POST /api/projects/:projectId/members - Add/Invite member to project (ADMIN role required)
router.post('/:projectId/members', requireProjectRole(['ADMIN']), async (req, res) => {
  const { projectId } = req.params;
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

  try {
    // 1. Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!targetUser) {
      return res.status(404).json({ error: `User with email ${email} is not registered` });
    }

    // 2. Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id
        }
      }
    });

    if (existingMember) {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }

    // 3. Create project member
    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role: assignedRole
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      id: newMember.user.id,
      name: newMember.user.name,
      email: newMember.user.email,
      role: newMember.role,
      joinedAt: newMember.joinedAt
    });
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Server error adding member to project' });
  }
});

// DELETE /api/projects/:projectId/members/:userId - Remove member from project (ADMIN role required)
router.delete('/:projectId/members/:userId', requireProjectRole(['ADMIN']), async (req, res) => {
  const { projectId, userId } = req.params;

  try {
    // Prevent removing yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself from the project. Delete the project instead if needed.' });
    }

    // Check if the user to be removed is actually a member
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found on this project' });
    }

    // Delete membership
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error removing member' });
  }
});

export default router;
