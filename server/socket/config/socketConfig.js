// server/socket/config/socketConfig.js
// Configuration for Socket.IO

/**
 * Get Socket.IO configuration options
 * @param {Object} env - Environment variables
 * @returns {Object} Socket.IO configuration options
 */
export function getSocketConfig(env = process.env) {
  return {
    // Socket.IO server options
    cors: {
      origin: env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    
    // Connection timeout in milliseconds
    connectTimeout: 45000,
    
    // Ping interval in milliseconds
    pingInterval: 10000,
    
    // Ping timeout in milliseconds
    pingTimeout: 5000,
    
    // Maximum number of attempts to reconnect
    reconnectionAttempts: 10,
    
    // Reconnection delay in milliseconds
    reconnectionDelay: 1000,
    
    // Maximum reconnection delay in milliseconds
    reconnectionDelayMax: 5000,
    
    // Randomization factor for reconnection delay
    randomizationFactor: 0.5,
    
    // Enable/disable compression
    perMessageDeflate: true,
    
    // Transport methods
    transports: ['websocket', 'polling'],
    
    // Upgrade from polling to websocket
    upgradeTimeout: 10000,
    
    // Maximum HTTP buffer size
    maxHttpBufferSize: 1e6 // 1MB
  };
}

/**
 * Get namespace configuration
 * @returns {Array<Object>} Array of namespace configurations
 */
export function getNamespaceConfig() {
  return [
    {
      name: '/', // Default namespace
      description: 'Main game namespace'
    },
    {
      name: '/test',
      description: 'Admin namespace for moderation and monitoring',
      auth: true // Requires authentication
    },
    {
      name: '/chat',
      description: 'Chat namespace for messaging features'
    }
  ];
}

/**
 * Get event throttling configuration
 * @returns {Object} Event throttling configuration
 */
export function getEventThrottleConfig() {
  return {
    'chat_message': {
      limit: 30,      // 30 messages per minute
      window: 60000   // 1 minute window
    },
    'player_move': {
      limit: 120,     // 120 movements per minute (2 per second)
      window: 60000   // 1 minute window
    },
    'player_action': {
      limit: 60,      // 60 actions per minute (1 per second)
      window: 60000   // 1 minute window
    },
    'interact_object': {
      limit: 30,      // 30 interactions per minute
      window: 60000   // 1 minute window
    },
    'default': {
      limit: 60,      // Default limit
      window: 60000   // 1 minute window
    }
  };
}
