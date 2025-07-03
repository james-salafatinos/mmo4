// server/socket/handlers/chatHandlers.js
// Handles all chat-related socket events

/**
 * Set up chat-related socket event handlers
 * @param {Server} io - The Socket.IO server instance
 * @param {Socket} socket - The individual socket connection
 */
export default function chatHandlers(io, socket) {
  const playerId = socket.id;
  
  // Handle global chat messages
  socket.on('chat_message', handleChatMessage);
  
  // Handle private messages
  socket.on('private_message', handlePrivateMessage);
  
  // Handle channel messages
  socket.on('channel_message', handleChannelMessage);
  
  // Handle channel join/leave
  socket.on('join_channel', handleJoinChannel);
  socket.on('leave_channel', handleLeaveChannel);
  
  /**
   * Handle global chat messages
   * @param {Object} messageData - Message data from client
   */
  function handleChatMessage(messageData) {
    console.log(`Global chat from ${playerId}:`, messageData);
    
    // Validate message content
    if (!messageData.content || messageData.content.trim() === '') {
      socket.emit('chat_error', { error: 'Message cannot be empty' });
      return;
    }
    
    // Create the message object
    const chatMessage = {
      id: generateMessageId(),
      senderId: playerId,
      senderName: messageData.senderName || 'Anonymous',
      content: messageData.content,
      timestamp: Date.now(),
      type: 'global'
    };
    
    // Broadcast to all connected clients
    io.emit('chat_message', chatMessage);
  }
  
  /**
   * Handle private messages between players
   * @param {Object} messageData - Message data from client
   */
  function handlePrivateMessage(messageData) {
    console.log(`Private message from ${playerId} to ${messageData.recipientId}:`, messageData);
    
    // Validate recipient
    if (!messageData.recipientId) {
      socket.emit('chat_error', { error: 'Recipient ID is required' });
      return;
    }
    
    // Validate message content
    if (!messageData.content || messageData.content.trim() === '') {
      socket.emit('chat_error', { error: 'Message cannot be empty' });
      return;
    }
    
    // Create the message object
    const privateMessage = {
      id: generateMessageId(),
      senderId: playerId,
      senderName: messageData.senderName || 'Anonymous',
      recipientId: messageData.recipientId,
      content: messageData.content,
      timestamp: Date.now(),
      type: 'private'
    };
    
    // Send to recipient and back to sender
    io.to(messageData.recipientId).emit('private_message', privateMessage);
    socket.emit('private_message', privateMessage);
  }
  
  /**
   * Handle messages sent to specific channels
   * @param {Object} messageData - Message data from client
   */
  function handleChannelMessage(messageData) {
    console.log(`Channel message from ${playerId} to ${messageData.channelId}:`, messageData);
    
    // Validate channel
    if (!messageData.channelId) {
      socket.emit('chat_error', { error: 'Channel ID is required' });
      return;
    }
    
    // Validate message content
    if (!messageData.content || messageData.content.trim() === '') {
      socket.emit('chat_error', { error: 'Message cannot be empty' });
      return;
    }
    
    // Create the message object
    const channelMessage = {
      id: generateMessageId(),
      senderId: playerId,
      senderName: messageData.senderName || 'Anonymous',
      channelId: messageData.channelId,
      content: messageData.content,
      timestamp: Date.now(),
      type: 'channel'
    };
    
    // Broadcast to the specific channel
    io.to(`channel:${messageData.channelId}`).emit('channel_message', channelMessage);
  }
  
  /**
   * Handle player joining a chat channel
   * @param {Object} channelData - Channel data from client
   */
  function handleJoinChannel(channelData) {
    console.log(`Player ${playerId} joining channel:`, channelData);
    
    // Validate channel
    if (!channelData.channelId) {
      socket.emit('chat_error', { error: 'Channel ID is required' });
      return;
    }
    
    // Join the socket.io room for this channel
    socket.join(`channel:${channelData.channelId}`);
    
    // Notify the player
    socket.emit('channel_joined', {
      channelId: channelData.channelId,
      success: true
    });
    
    // Notify other channel members
    socket.to(`channel:${channelData.channelId}`).emit('channel_user_joined', {
      channelId: channelData.channelId,
      userId: playerId,
      username: channelData.username || 'Anonymous'
    });
  }
  
  /**
   * Handle player leaving a chat channel
   * @param {Object} channelData - Channel data from client
   */
  function handleLeaveChannel(channelData) {
    console.log(`Player ${playerId} leaving channel:`, channelData);
    
    // Validate channel
    if (!channelData.channelId) {
      socket.emit('chat_error', { error: 'Channel ID is required' });
      return;
    }
    
    // Leave the socket.io room for this channel
    socket.leave(`channel:${channelData.channelId}`);
    
    // Notify the player
    socket.emit('channel_left', {
      channelId: channelData.channelId,
      success: true
    });
    
    // Notify other channel members
    socket.to(`channel:${channelData.channelId}`).emit('channel_user_left', {
      channelId: channelData.channelId,
      userId: playerId,
      username: channelData.username || 'Anonymous'
    });
  }
  
  /**
   * Generate a unique message ID
   * @returns {string} A unique message ID
   */
  function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
