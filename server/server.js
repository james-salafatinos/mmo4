// server/server.js
// Main server file for the multiplayer ThreeJS application

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Make io available to routes
app.set('io', io);

// Serve static files from the 'client' directory
app.use(express.static(join(__dirname, '../client')));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../client/views/index.html'));
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Open http://localhost:3000 in your browser to view the application');
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close all socket connections
  io.close(() => {
    console.log('Socket.io connections closed');
    
    // Close the HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      
      // Close the database connection
      if (db) {
        try {
          db.close();
          console.log('Database connection closed');
        } catch (err) {
          console.error('Error closing database:', err);
        }
      }
      
      console.log('Server shut down successfully');
      // Force exit after a timeout in case something is still hanging
      setTimeout(() => {
        console.log('Forcing process exit');
        process.exit(0);
      }, 1000);
    });
  });
});
