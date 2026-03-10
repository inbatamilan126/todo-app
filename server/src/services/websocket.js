import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

// In-memory rate limiting for WebSocket
const clientRateLimits = new Map();

/**
 * Check if client is rate limited
 * @param {string} socketId - Unique socket identifier
 * @returns {boolean} - True if rate limited
 */
function isRateLimited(socketId) {
  const now = Date.now();
  const clientLimit = clientRateLimits.get(socketId);
  
  if (!clientLimit) {
    clientRateLimits.set(socketId, { count: 1, resetAt: now + 1000 });
    return false;
  }
  
  if (now > clientLimit.resetAt) {
    // Reset counter
    clientRateLimits.set(socketId, { count: 1, resetAt: now + 1000 });
    return false;
  }
  
  if (clientLimit.count >= 20) {
    // 20 messages per second max
    return true;
  }
  
  clientLimit.count++;
  return false;
}

/**
 * Cleanup old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [socketId, data] of clientRateLimits.entries()) {
    if (now > data.resetAt + 5000) {
      clientRateLimits.delete(socketId);
    }
  }
}, 60000); // Run every minute

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
      
      // Validate projectId is provided
      if (!projectId) {
        socket.emit('error', { message: 'Project ID is required' });
        return;
      }
      
      socket.join(`project:${projectId}`);
      console.log(`User ${socket.user.name} joined project:${projectId}`);
    });

    // Leave project room
    socket.on('leave:project', (data) => {
      const { projectId } = data;
      if (!projectId) return;
      
      socket.leave(`project:${projectId}`);
      console.log(`User ${socket.user.name} left project:${projectId}`);
    });

    // Rate limit incoming events
    socket.on('message', () => {
      if (isRateLimited(socket.id)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
      // Clean up rate limit entry
      clientRateLimits.delete(socket.id);
    });
  });

  return io;
};

export default { setupWebSocket };
