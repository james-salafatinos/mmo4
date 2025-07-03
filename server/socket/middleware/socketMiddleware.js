// server/socket/middleware/socketMiddleware.js
// Socket.IO middleware for authentication and other cross-cutting concerns

/**
 * Set up Socket.IO middleware
 * @param {Server} io - The Socket.IO server instance
 */
export function setupMiddleware(io) {
  // Add middleware for all socket connections
  io.use(authMiddleware);
  io.use(loggingMiddleware);
  io.use(rateLimit);
}

/**
 * Authentication middleware for Socket.IO
 * @param {Socket} socket - The socket connection
 * @param {Function} next - Callback to continue to the next middleware
 */
function authMiddleware(socket, next) {
  // Get auth token from handshake
  const token = socket.handshake.auth.token;
  
  // If no token is provided, allow connection as guest
  if (!token) {
    console.log(`Socket ${socket.id} connected as guest`);
    socket.isAuthenticated = false;
    socket.isGuest = true;
    socket.isAdmin = false;
    socket.userData = { guestId: socket.id };
    return next();
  }
  
  // In a real implementation, you would verify the token
  // For now, we'll just simulate authentication
  try {
    // Simulate token validation
    const userData = validateToken(token);
    
    // Attach user data to the socket
    socket.isAuthenticated = true;
    socket.isGuest = false;
    socket.isAdmin = userData.role === 'admin';
    socket.userData = userData;
    
    console.log(`Socket ${socket.id} authenticated as ${userData.username}`);
    next();
  } catch (error) {
    console.error(`Socket ${socket.id} authentication failed:`, error);
    next(new Error('Authentication failed'));
  }
}

/**
 * Logging middleware for Socket.IO
 * @param {Socket} socket - The socket connection
 * @param {Function} next - Callback to continue to the next middleware
 */
function loggingMiddleware(socket, next) {
  // Log connection details
  console.log(`Socket connected: ${socket.id}`);
  console.log(`  IP: ${socket.handshake.address}`);
  console.log(`  User Agent: ${socket.handshake.headers['user-agent']}`);
  console.log(`  Auth Status: ${socket.isAuthenticated ? 'Authenticated' : 'Guest'}`);
  
  // Log all events (for development only)
  if (process.env.NODE_ENV === 'development') {
    const onevent = socket.onevent;
    socket.onevent = function(packet) {
      const args = packet.data || [];
      console.log(`[SOCKET EVENT] ${socket.id} - ${args[0]}`, args.slice(1));
      onevent.call(this, packet);
    };
  }
  
  next();
}

/**
 * Rate limiting middleware for Socket.IO
 * @param {Socket} socket - The socket connection
 * @param {Function} next - Callback to continue to the next middleware
 */
function rateLimit(socket, next) {
  // Initialize rate limiting data
  socket.rateLimit = {
    events: {},
    lastReset: Date.now()
  };
  
  // Override emit to check rate limits
  const emit = socket.emit;
  socket.emit = function(...args) {
    const eventName = args[0];
    
    // Skip rate limiting for certain events
    const excludedEvents = ['connect', 'disconnect', 'error', 'server_tick'];
    if (excludedEvents.includes(eventName)) {
      return emit.apply(this, args);
    }
    
    // Check if we need to reset counters
    const now = Date.now();
    if (now - socket.rateLimit.lastReset > 60000) {
      socket.rateLimit.events = {};
      socket.rateLimit.lastReset = now;
    }
    
    // Initialize counter for this event
    if (!socket.rateLimit.events[eventName]) {
      socket.rateLimit.events[eventName] = 0;
    }
    
    // Increment counter
    socket.rateLimit.events[eventName]++;
    
    // Check if limit exceeded
    const limit = getEventLimit(eventName);
    if (socket.rateLimit.events[eventName] > limit) {
      console.warn(`Rate limit exceeded for ${socket.id} on event ${eventName}`);
      socket.emit('error', { code: 'RATE_LIMIT', message: 'Rate limit exceeded' });
      return;
    }
    
    // Call original emit
    return emit.apply(this, args);
  };
  
  next();
}

/**
 * Get the rate limit for a specific event
 * @param {string} eventName - The name of the event
 * @returns {number} The rate limit (events per minute)
 */
function getEventLimit(eventName) {
  // Define limits for different event types
  const limits = {
    'chat_message': 30,      // 30 messages per minute
    'player_move': 120,      // 120 movements per minute (2 per second)
    'player_action': 60,     // 60 actions per minute (1 per second)
    'interact_object': 30,   // 30 interactions per minute
    'default': 60            // Default limit
  };
  
  return limits[eventName] || limits.default;
}

/**
 * Simulate token validation (in a real app, this would verify with your auth system)
 * @param {string} token - The authentication token
 * @returns {Object} The user data
 */
function validateToken(token) {
  // This is a placeholder for actual token validation
  // In a real application, you would verify the token with your auth system
  
  // For demo purposes, we'll just check for a specific format
  if (token.startsWith('ADMIN_')) {
    return {
      id: 'admin1',
      username: 'admin',
      role: 'admin'
    };
  } else if (token.startsWith('USER_')) {
    const userId = token.split('_')[1];
    return {
      id: userId,
      username: `user_${userId}`,
      role: 'user'
    };
  }
  
  throw new Error('Invalid token');
}
