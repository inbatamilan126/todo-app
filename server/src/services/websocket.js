import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

export const setupWebSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // Join project room
    socket.on('join:project', (data) => {
      const { projectId } = data;
      socket.join(`project:${projectId}`);
      console.log(`User ${socket.user.name} joined project:${projectId}`);
    });

    // Leave project room
    socket.on('leave:project', (data) => {
      const { projectId } = data;
      socket.leave(`project:${projectId}`);
      console.log(`User ${socket.user.name} left project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

export default { setupWebSocket };
