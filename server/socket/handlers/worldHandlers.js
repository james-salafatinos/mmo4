// server/socket/handlers/worldHandlers.js
// Handles all world-related socket events

/**
 * Set up world-related socket event handlers
 * @param {Server} io - The Socket.IO server instance
 * @param {Socket} socket - The individual socket connection
 */
export default function worldHandlers(io, socket) {
  const playerId = socket.id;
  const gameState = socket.gameState;
  
  // Handle world interaction events
  socket.on('interact_object', handleObjectInteraction);
  
  // Handle world state sync requests
  socket.on('request_world_state', handleWorldStateRequest);
  
  // Handle entity creation
  socket.on('create_entity', handleEntityCreation);
  
  // Handle entity deletion
  socket.on('delete_entity', handleEntityDeletion);
  
  /**
   * Handle player interactions with world objects
   * @param {Object} interactionData - Interaction data from client
   */
  function handleObjectInteraction(interactionData) {
    console.log(`Player ${playerId} interacting with object:`, interactionData);
    
    // Validate object ID
    if (!interactionData.objectId) {
      socket.emit('interaction_error', { error: 'Object ID is required' });
      return;
    }
    
    // Process the interaction based on type
    switch (interactionData.type) {
      case 'pickup':
        // Handle item pickup
        handleItemPickup(interactionData);
        break;
        
      case 'use':
        // Handle object use
        handleObjectUse(interactionData);
        break;
        
      case 'activate':
        // Handle object activation
        handleObjectActivation(interactionData);
        break;
        
      default:
        console.log(`Unknown interaction type: ${interactionData.type}`);
        socket.emit('interaction_error', { error: 'Unknown interaction type' });
    }
  }
  
  /**
   * Handle item pickup interactions
   * @param {Object} interactionData - Interaction data from client
   */
  function handleItemPickup(interactionData) {
    // Check if the object exists in the world
    const worldObject = gameState.worldObjects?.[interactionData.objectId];
    if (!worldObject) {
      socket.emit('interaction_error', { 
        error: 'Object not found',
        objectId: interactionData.objectId
      });
      return;
    }
    
    // Check if the object is pickable
    if (!worldObject.pickable) {
      socket.emit('interaction_error', { 
        error: 'Object cannot be picked up',
        objectId: interactionData.objectId
      });
      return;
    }
    
    // Remove the object from the world
    delete gameState.worldObjects[interactionData.objectId];
    
    // Add the item to player inventory (simplified)
    if (!gameState.entities[playerId].inventory) {
      gameState.entities[playerId].inventory = [];
    }
    gameState.entities[playerId].inventory.push({
      id: interactionData.objectId,
      type: worldObject.type,
      properties: worldObject.properties
    });
    
    // Notify the player
    socket.emit('pickup_success', {
      objectId: interactionData.objectId,
      item: {
        id: interactionData.objectId,
        type: worldObject.type,
        properties: worldObject.properties
      }
    });
    
    // Notify other players
    socket.broadcast.emit('object_removed', {
      objectId: interactionData.objectId,
      reason: 'pickup',
      playerId
    });
  }
  
  /**
   * Handle object use interactions
   * @param {Object} interactionData - Interaction data from client
   */
  function handleObjectUse(interactionData) {
    // Implementation would depend on game mechanics
    // This is a simplified example
    
    // Notify all nearby players about the object use
    io.emit('object_used', {
      objectId: interactionData.objectId,
      playerId,
      effects: interactionData.effects || []
    });
  }
  
  /**
   * Handle object activation interactions
   * @param {Object} interactionData - Interaction data from client
   */
  function handleObjectActivation(interactionData) {
    // Implementation would depend on game mechanics
    // This is a simplified example
    
    // Update object state in the game world
    if (gameState.worldObjects?.[interactionData.objectId]) {
      gameState.worldObjects[interactionData.objectId].activated = true;
      gameState.worldObjects[interactionData.objectId].lastActivatedBy = playerId;
      gameState.worldObjects[interactionData.objectId].lastActivatedTime = Date.now();
    }
    
    // Notify all players about the object activation
    io.emit('object_activated', {
      objectId: interactionData.objectId,
      playerId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle requests for world state
   * @param {Object} requestData - Request data from client
   */
  function handleWorldStateRequest(requestData) {
    console.log(`Player ${playerId} requesting world state:`, requestData);
    
    // Create a response with the current world state
    // This could be filtered based on player position, visibility, etc.
    const worldStateResponse = {
      entities: gameState.entities,
      worldObjects: gameState.worldObjects || {},
      timestamp: Date.now()
    };
    
    // Send the world state to the requesting client
    socket.emit('world_state', worldStateResponse);
  }
  
  /**
   * Handle entity creation requests
   * @param {Object} entityData - Entity data from client
   */
  function handleEntityCreation(entityData) {
    console.log(`Player ${playerId} creating entity:`, entityData);
    
    // Validate entity data
    if (!entityData.type) {
      socket.emit('entity_error', { error: 'Entity type is required' });
      return;
    }
    
    // Generate a unique ID for the entity
    const entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the entity in the game state
    const newEntity = {
      id: entityId,
      type: entityData.type,
      position: entityData.position || { x: 0, y: 0, z: 0 },
      rotation: entityData.rotation || { x: 0, y: 0, z: 0 },
      scale: entityData.scale || { x: 1, y: 1, z: 1 },
      properties: entityData.properties || {},
      createdBy: playerId,
      createdAt: Date.now()
    };
    
    // Add to game state
    if (!gameState.worldObjects) {
      gameState.worldObjects = {};
    }
    gameState.worldObjects[entityId] = newEntity;
    
    // Notify the creating player
    socket.emit('entity_created', {
      success: true,
      entity: newEntity
    });
    
    // Notify other players
    socket.broadcast.emit('entity_added', {
      entity: newEntity
    });
  }
  
  /**
   * Handle entity deletion requests
   * @param {Object} deleteData - Delete data from client
   */
  function handleEntityDeletion(deleteData) {
    console.log(`Player ${playerId} deleting entity:`, deleteData);
    
    // Validate entity ID
    if (!deleteData.entityId) {
      socket.emit('entity_error', { error: 'Entity ID is required' });
      return;
    }
    
    // Check if entity exists
    const entity = gameState.worldObjects?.[deleteData.entityId];
    if (!entity) {
      socket.emit('entity_error', { 
        error: 'Entity not found',
        entityId: deleteData.entityId
      });
      return;
    }
    
    // Check permissions (only creator or admin can delete)
    if (entity.createdBy !== playerId && !socket.isAdmin) {
      socket.emit('entity_error', { 
        error: 'Permission denied',
        entityId: deleteData.entityId
      });
      return;
    }
    
    // Remove the entity
    delete gameState.worldObjects[deleteData.entityId];
    
    // Notify the deleting player
    socket.emit('entity_deleted', {
      success: true,
      entityId: deleteData.entityId
    });
    
    // Notify other players
    socket.broadcast.emit('entity_removed', {
      entityId: deleteData.entityId,
      removedBy: playerId
    });
  }
}
