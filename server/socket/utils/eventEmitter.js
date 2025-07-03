// server/socket/utils/eventEmitter.js
// Utility for standardized event emission

/**
 * EventEmitter class for standardized socket event emission
 */
export class SocketEventEmitter {
  /**
   * Create a new SocketEventEmitter
   * @param {Server} io - The Socket.IO server instance
   */
  constructor(io) {
    this.io = io;
  }
  
  /**
   * Emit an event to all connected clients
   * @param {string} eventName - The name of the event
   * @param {*} data - The data to send
   * @param {Object} options - Additional options
   */
  broadcast(eventName, data, options = {}) {
    const payload = this.createPayload(eventName, data);
    this.io.emit(eventName, payload);
    
    if (options.log) {
      console.log(`[BROADCAST] ${eventName}:`, payload);
    }
  }
  
  /**
   * Emit an event to a specific client
   * @param {string} socketId - The ID of the socket to emit to
   * @param {string} eventName - The name of the event
   * @param {*} data - The data to send
   * @param {Object} options - Additional options
   */
  emitToClient(socketId, eventName, data, options = {}) {
    const payload = this.createPayload(eventName, data);
    this.io.to(socketId).emit(eventName, payload);
    
    if (options.log) {
      console.log(`[EMIT] To ${socketId} - ${eventName}:`, payload);
    }
  }
  
  /**
   * Emit an event to all clients in a room
   * @param {string} roomId - The ID of the room
   * @param {string} eventName - The name of the event
   * @param {*} data - The data to send
   * @param {Object} options - Additional options
   */
  emitToRoom(roomId, eventName, data, options = {}) {
    const payload = this.createPayload(eventName, data);
    this.io.to(`room:${roomId}`).emit(eventName, payload);
    
    if (options.log) {
      console.log(`[EMIT] To room ${roomId} - ${eventName}:`, payload);
    }
  }
  
  /**
   * Emit an event to all clients except the sender
   * @param {string} senderSocketId - The ID of the sender socket
   * @param {string} eventName - The name of the event
   * @param {*} data - The data to send
   * @param {Object} options - Additional options
   */
  broadcastExcept(senderSocketId, eventName, data, options = {}) {
    const payload = this.createPayload(eventName, data);
    this.io.except(senderSocketId).emit(eventName, payload);
    
    if (options.log) {
      console.log(`[BROADCAST] Except ${senderSocketId} - ${eventName}:`, payload);
    }
  }
  
  /**
   * Create a standardized payload for events
   * @param {string} eventName - The name of the event
   * @param {*} data - The event data
   * @returns {Object} The standardized payload
   * @private
   */
  createPayload(eventName, data) {
    return {
      event: eventName,
      data,
      timestamp: Date.now(),
      id: this.generateEventId()
    };
  }
  
  /**
   * Generate a unique event ID
   * @returns {string} A unique event ID
   * @private
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
