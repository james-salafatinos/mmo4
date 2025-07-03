// server/socket/managers/roomManager.js
// Manages socket rooms for different areas of the game world

/**
 * Room Manager for handling socket.io rooms
 */
export class RoomManager {
  /**
   * Create a new RoomManager
   * @param {Server} io - The Socket.IO server instance
   */
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map(); // Maps player IDs to their current rooms
  }
  
  /**
   * Initialize the room manager with default rooms
   */
  initialize() {
    // Create default rooms
    this.createRoom('lobby', { isDefault: true, maxPlayers: 100 });
    this.createRoom('tutorial', { isDefault: false, maxPlayers: 20 });
    
    console.log('Room Manager initialized with default rooms');
  }
  
  /**
   * Create a new room
   * @param {string} roomId - The ID of the room to create
   * @param {Object} options - Room configuration options
   * @returns {Object} The created room
   */
  createRoom(roomId, options = {}) {
    if (this.rooms.has(roomId)) {
      console.warn(`Room ${roomId} already exists`);
      return this.rooms.get(roomId);
    }
    
    const room = {
      id: roomId,
      name: options.name || roomId,
      players: new Set(),
      maxPlayers: options.maxPlayers || 50,
      isDefault: options.isDefault || false,
      metadata: options.metadata || {},
      createdAt: Date.now()
    };
    
    this.rooms.set(roomId, room);
    console.log(`Created room: ${roomId}`);
    
    return room;
  }
  
  /**
   * Delete a room
   * @param {string} roomId - The ID of the room to delete
   * @returns {boolean} Whether the room was deleted
   */
  deleteRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      console.warn(`Room ${roomId} does not exist`);
      return false;
    }
    
    // Get all players in the room
    const room = this.rooms.get(roomId);
    const players = Array.from(room.players);
    
    // Move all players to a default room
    const defaultRoom = this.getDefaultRoom();
    if (defaultRoom) {
      players.forEach(playerId => {
        this.movePlayerToRoom(playerId, defaultRoom.id);
      });
    }
    
    // Delete the room
    this.rooms.delete(roomId);
    console.log(`Deleted room: ${roomId}`);
    
    return true;
  }
  
  /**
   * Get a default room
   * @returns {Object|null} A default room, or null if none exists
   */
  getDefaultRoom() {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.isDefault) {
        return room;
      }
    }
    
    return null;
  }
  
  /**
   * Add a player to a room
   * @param {string} playerId - The ID of the player
   * @param {string} roomId - The ID of the room
   * @returns {boolean} Whether the player was added to the room
   */
  addPlayerToRoom(playerId, roomId) {
    if (!this.rooms.has(roomId)) {
      console.warn(`Room ${roomId} does not exist`);
      return false;
    }
    
    const room = this.rooms.get(roomId);
    
    // Check if room is full
    if (room.players.size >= room.maxPlayers) {
      console.warn(`Room ${roomId} is full`);
      return false;
    }
    
    // Remove player from current room if any
    this.removePlayerFromCurrentRoom(playerId);
    
    // Add player to new room
    room.players.add(playerId);
    this.playerRooms.set(playerId, roomId);
    
    // Join socket.io room
    const socket = this.getSocketById(playerId);
    if (socket) {
      socket.join(`room:${roomId}`);
    }
    
    console.log(`Player ${playerId} added to room ${roomId}`);
    
    return true;
  }
  
  /**
   * Remove a player from their current room
   * @param {string} playerId - The ID of the player
   * @returns {boolean} Whether the player was removed from a room
   */
  removePlayerFromCurrentRoom(playerId) {
    if (!this.playerRooms.has(playerId)) {
      return false;
    }
    
    const currentRoomId = this.playerRooms.get(playerId);
    const currentRoom = this.rooms.get(currentRoomId);
    
    if (currentRoom) {
      currentRoom.players.delete(playerId);
      console.log(`Player ${playerId} removed from room ${currentRoomId}`);
    }
    
    this.playerRooms.delete(playerId);
    
    // Leave socket.io room
    const socket = this.getSocketById(playerId);
    if (socket) {
      socket.leave(`room:${currentRoomId}`);
    }
    
    return true;
  }
  
  /**
   * Move a player from one room to another
   * @param {string} playerId - The ID of the player
   * @param {string} newRoomId - The ID of the destination room
   * @returns {boolean} Whether the player was moved
   */
  movePlayerToRoom(playerId, newRoomId) {
    // Remove from current room
    this.removePlayerFromCurrentRoom(playerId);
    
    // Add to new room
    return this.addPlayerToRoom(playerId, newRoomId);
  }
  
  /**
   * Get all players in a room
   * @param {string} roomId - The ID of the room
   * @returns {Array<string>} Array of player IDs in the room
   */
  getPlayersInRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      console.warn(`Room ${roomId} does not exist`);
      return [];
    }
    
    const room = this.rooms.get(roomId);
    return Array.from(room.players);
  }
  
  /**
   * Get the room a player is in
   * @param {string} playerId - The ID of the player
   * @returns {Object|null} The room object, or null if not in a room
   */
  getPlayerRoom(playerId) {
    if (!this.playerRooms.has(playerId)) {
      return null;
    }
    
    const roomId = this.playerRooms.get(playerId);
    return this.rooms.get(roomId) || null;
  }
  
  /**
   * Broadcast a message to all players in a room
   * @param {string} roomId - The ID of the room
   * @param {string} event - The event name
   * @param {*} data - The data to send
   */
  broadcastToRoom(roomId, event, data) {
    if (!this.rooms.has(roomId)) {
      console.warn(`Room ${roomId} does not exist`);
      return;
    }
    
    this.io.to(`room:${roomId}`).emit(event, data);
  }
  
  /**
   * Get a socket by player ID
   * @param {string} playerId - The ID of the player
   * @returns {Socket|null} The socket object, or null if not found
   * @private
   */
  getSocketById(playerId) {
    return this.io.sockets.sockets.get(playerId) || null;
  }
  
  /**
   * Get all rooms
   * @returns {Array<Object>} Array of all room objects
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }
  
  /**
   * Get room by ID
   * @param {string} roomId - The ID of the room
   * @returns {Object|null} The room object, or null if not found
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }
}
