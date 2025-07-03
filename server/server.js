// server/server.js
// Main server file for the multiplayer ThreeJS application

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Import socket handlers and utilities
import { initializeSocketHandlers, broadcastGameState } from './socket/index.js';
import { getSocketConfig } from './socket/config/socketConfig.js';
import { RoomManager } from './socket/managers/roomManager.js';
import { SocketEventEmitter } from './socket/utils/eventEmitter.js';

// Load environment variables
dotenv.config();

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with config
const io = new Server(httpServer, getSocketConfig());

// Make io available to routes
app.set('io', io);

// Game state
const gameState = {
  entities: {},
  worldObjects: {},
  lastUpdate: Date.now()
};

// Server tick rate (300ms)
const TICK_RATE = 3000; // milliseconds

// Initialize socket managers and utilities
const roomManager = new RoomManager(io);
const eventEmitter = new SocketEventEmitter(io);

// Initialize socket handlers
initializeSocketHandlers(io, gameState);

// Initialize room manager
roomManager.initialize();

// Make managers available to routes
app.set('roomManager', roomManager);
app.set('eventEmitter', eventEmitter);

// Serve static files from the client directory
app.use(express.static(join(__dirname, '../client')));

// Serve static files from the client/test directory
app.use('/test', express.static(join(__dirname, '../client/test')));

// Serve static files from the 'shared' directory with the correct path
app.use('/shared', express.static(join(__dirname, '../shared')));
// Serve favicon if it exists
app.use('/favicon.ico', express.static(join(__dirname, '../client/img/favicon.ico')));

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../client/views/index.html'));
});

// Route for the admin socket test page
app.get('/test', (req, res) => {
  res.sendFile(join(__dirname, '../client/test/test.html'));
});


// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Open http://localhost:3000 in your browser to view the application');
  
  // Start the server tick loop
  startServerTick();
});

// Server tick function - runs every TICK_RATE ms (300ms)
function startServerTick() {
  console.log(`Starting server tick loop with rate: ${TICK_RATE}ms`);
  
  // Set up the interval for server ticks
  const tickInterval = setInterval(() => {
    // Update game state timestamp
    gameState.lastUpdate = Date.now();
    
    // Use the broadcast utility to send game state to all clients
    broadcastGameState(io, gameState);
    
    // Log server tick (uncomment for debugging)
    // console.log('Server tick:', gameState);
  }, TICK_RATE);
  
  // Store the interval reference for cleanup
  app.set('tickInterval', tickInterval);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Clear the server tick interval
  const tickInterval = app.get('tickInterval');
  if (tickInterval) {
    clearInterval(tickInterval);
    console.log('Server tick loop stopped');
  }
  
  // Close all socket connections
  io.close(() => {
    console.log('Socket.io connections closed');
    
    // Close the HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      
      console.log('Server shut down successfully');
      // Force exit after a timeout in case something is still hanging
      setTimeout(() => {
        console.log('Forcing process exit');
        process.exit(0);
      }, 1000);
    });
  });
});
