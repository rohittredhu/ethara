import jwt from 'jsonwebtoken';
import prisma from '../database/prisma.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'premium_team_task_manager_secret_jwt_2026_xyz', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
};

// Middleware factory to check project membership and role
export const requireProjectRole = (allowedRoles = ['ADMIN', 'MEMBER']) => {
  return async (req, res, next) => {
    const { projectId } = req.params;
    const currentProjectId = projectId || req.body.projectId || req.query.projectId;

    if (!currentProjectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: currentProjectId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Unauthorized: insufficient project role permissions' });
      }

      // Attach membership information to request for downstream use
      req.projectMembership = membership;
      next();
    } catch (error) {
      console.error('Error in requireProjectRole middleware:', error);
      res.status(500).json({ error: 'Internal server validation error' });
    }
  };
};
