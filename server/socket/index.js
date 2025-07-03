// server/socket/index.js
// Main socket handler that initializes and manages all socket connections

import playerHandlers from './handlers/playerHandlers.js';
import chatHandlers from './handlers/chatHandlers.js';
import worldHandlers from './handlers/worldHandlers.js';
import { setupMiddleware } from './middleware/socketMiddleware.js';

/**
 * Initialize all socket.io handlers and middleware
 * @param {Server} io - The Socket.IO server instance
 * @param {Object} gameState - The shared game state object
 */
export function initializeSocketHandlers(io, gameState) {
  console.log('Initializing socket handlers...');
  
  // Set up socket middleware
  setupMiddleware(io);
  
  // Handle new connections
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    // Attach the game state to the socket for handlers to access
    socket.gameState = gameState;
    
    // Register all handlers
    playerHandlers(io, socket);
    chatHandlers(io, socket);
    worldHandlers(io, socket);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Remove player from game state
      if (gameState.entities && gameState.entities[socket.id]) {
        delete gameState.entities[socket.id];
        // Notify other clients about the disconnection
        socket.broadcast.emit('player_disconnected', { playerId: socket.id });
      }
    });
  });
  
  return io;
}

/**
 * Broadcast the current game state to all connected clients
 * @param {Server} io - The Socket.IO server instance
 * @param {Object} gameState - The current game state to broadcast
 */
export function broadcastGameState(io, gameState) {
  gameState.lastUpdate = Date.now();
  io.emit('server_tick', gameState);
}
