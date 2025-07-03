// server/socket/handlers/playerHandlers.js
// Handles all player-related socket events

/**
 * Set up player-related socket event handlers
 * @param {Server} io - The Socket.IO server instance
 * @param {Socket} socket - The individual socket connection
 */
export default function playerHandlers(io, socket) {
  const playerId = socket.id;
  const gameState = socket.gameState;
  
  // Initialize player entity if it doesn't exist
  if (!gameState.entities[playerId]) {
    gameState.entities[playerId] = {
      id: playerId,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      lastUpdate: Date.now()
    };
  }
  
  // Send initial state to the client
  socket.emit('server_tick', gameState);
  
  // Notify other players about the new player
  socket.broadcast.emit('player_joined', {
    playerId,
    position: gameState.entities[playerId].position
  });
  
  // Handle player movement
  socket.on('player_move', handlePlayerMove);
  
  // Handle player action
  socket.on('player_action', handlePlayerAction);
  
  // Handle player state update
  socket.on('player_state', handlePlayerState);
  
  /**
   * Handle player movement updates
   * @param {Object} moveData - Movement data from client
   */
  function handlePlayerMove(moveData) {
    console.log(`Player ${playerId} move request:`, moveData);
    
    // Update player position in game state
    if (gameState.entities[playerId]) {
      gameState.entities[playerId].position = {
        x: moveData.x || gameState.entities[playerId].position.x,
        y: moveData.y || gameState.entities[playerId].position.y,
        z: moveData.z || gameState.entities[playerId].position.z
      };
      
      // Update rotation if provided
      if (moveData.rotation) {
        gameState.entities[playerId].rotation = {
          x: moveData.rotation.x || gameState.entities[playerId].rotation.x,
          y: moveData.rotation.y || gameState.entities[playerId].rotation.y,
          z: moveData.rotation.z || gameState.entities[playerId].rotation.z
        };
      }
      
      gameState.entities[playerId].lastUpdate = Date.now();
      
      // Broadcast movement to other players for immediate feedback
      socket.broadcast.emit('player_moved', {
        playerId,
        position: gameState.entities[playerId].position,
        rotation: gameState.entities[playerId].rotation
      });
    }
  }
  
  /**
   * Handle player actions (jumping, attacking, etc.)
   * @param {Object} actionData - Action data from client
   */
  function handlePlayerAction(actionData) {
    console.log(`Player ${playerId} action:`, actionData);
    
    // Process the action based on type
    switch (actionData.type) {
      case 'jump':
        // Handle jump action
        socket.broadcast.emit('player_action', {
          playerId,
          action: 'jump',
          position: gameState.entities[playerId].position
        });
        break;
        
      case 'attack':
        // Handle attack action
        socket.broadcast.emit('player_action', {
          playerId,
          action: 'attack',
          target: actionData.target,
          position: gameState.entities[playerId].position
        });
        break;
        
      default:
        console.log(`Unknown action type: ${actionData.type}`);
    }
  }
  
  /**
   * Handle player state updates (health, inventory, etc.)
   * @param {Object} stateData - State data from client
   */
  function handlePlayerState(stateData) {
    console.log(`Player ${playerId} state update:`, stateData);
    
    // Update player state in game state
    if (gameState.entities[playerId]) {
      // Merge the new state data with existing state
      gameState.entities[playerId] = {
        ...gameState.entities[playerId],
        ...stateData,
        id: playerId, // Ensure ID doesn't get overwritten
        lastUpdate: Date.now()
      };
    }
  }
}
