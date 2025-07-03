// Socket.IO Test Suite JavaScript
import { World, Entity } from '/shared/core/index.js';
import { TransformComponent } from '/shared/components/index.js';

// Socket.io is loaded globally from CDN

// --- DOM Elements ---

// Connection Tab
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const connectionStatus = document.getElementById('connection-status');
const socketId = document.getElementById('socket-id');

// Player Tab
const posX = document.getElementById('pos-x');
const posY = document.getElementById('pos-y');
const posZ = document.getElementById('pos-z');
const moveBtn = document.getElementById('move-btn');
const actionType = document.getElementById('action-type');
const actionBtn = document.getElementById('action-btn');

// Chat Tab
const globalChat = document.getElementById('global-chat');
const globalMessage = document.getElementById('global-message');
const sendGlobalBtn = document.getElementById('send-global-btn');
const recipientId = document.getElementById('recipient-id');
const privateChat = document.getElementById('private-chat');
const privateMessage = document.getElementById('private-message');
const sendPrivateBtn = document.getElementById('send-private-btn');
const channelId = document.getElementById('channel-id');
const joinChannelBtn = document.getElementById('join-channel-btn');
const leaveChannelBtn = document.getElementById('leave-channel-btn');
const channelChat = document.getElementById('channel-chat');
const channelMessage = document.getElementById('channel-message');
const sendChannelBtn = document.getElementById('send-channel-btn');

// World Tab
const requestWorldStateBtn = document.getElementById('request-world-state-btn');
const objectId = document.getElementById('object-id');
const interactionType = document.getElementById('interaction-type');
const interactBtn = document.getElementById('interact-btn');
const entityType = document.getElementById('entity-type');
const createEntityBtn = document.getElementById('create-entity-btn');

// Room Management
const roomList = document.getElementById('room-list');
const currentRoom = document.getElementById('current-room');
const joinRoomBtn = document.getElementById('join-room-btn');
const playersList = document.getElementById('players-list');

// Logs
const logOutput = document.getElementById('socket-log-output');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// Tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// --- State ---
let socket = null;
let username = `User_${Math.floor(Math.random() * 1000)}`;
let currentChannelId = null;
let selectedRoomId = null;

// --- Logging ---
function log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = `[${timestamp}] ${message}`;
    
    if (data) {
        if (typeof data === 'object') {
            logMessage += `\n${JSON.stringify(data, null, 2)}`;
        } else {
            logMessage += `\n${data}`;
        }
    }
    
    logOutput.textContent += logMessage + '\n';
    logOutput.scrollTop = logOutput.scrollHeight;
}

// --- Socket Connection ---
function connectToServer() {
    try {
        log('Connecting to server...');
        
        // Connect to the Socket.IO server
        // Using the default connection (no URL) which connects to the host that serves the page
        socket = io();
        
        // Update UI
        connectionStatus.textContent = 'Connecting...';
        connectionStatus.style.color = 'orange';
        
        // Connection event handlers
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        
        // Game state event handlers
        socket.on('server_tick', handleServerTick);
        socket.on('player_joined', handlePlayerJoined);
        socket.on('player_disconnected', handlePlayerDisconnected);
        socket.on('player_moved', handlePlayerMoved);
        socket.on('player_action', handlePlayerAction);
        
        // Chat event handlers
        socket.on('chat_message', handleChatMessage);
        socket.on('private_message', handlePrivateMessage);
        socket.on('channel_message', handleChannelMessage);
        socket.on('channel_joined', handleChannelJoined);
        socket.on('channel_left', handleChannelLeft);
        socket.on('channel_user_joined', handleChannelUserJoined);
        socket.on('channel_user_left', handleChannelUserLeft);
        socket.on('chat_error', handleChatError);
        
        // World event handlers
        socket.on('world_state', handleWorldState);
        socket.on('object_used', handleObjectUsed);
        socket.on('object_activated', handleObjectActivated);
        socket.on('object_removed', handleObjectRemoved);
        socket.on('entity_created', handleEntityCreated);
        socket.on('entity_added', handleEntityAdded);
        socket.on('entity_deleted', handleEntityDeleted);
        socket.on('entity_removed', handleEntityRemoved);
        socket.on('interaction_error', handleInteractionError);
        socket.on('entity_error', handleEntityError);
        
        log('Attempting to connect to server...');
    } catch (error) {
        log(`Error initializing socket: ${error.message}`);
        connectionStatus.textContent = 'Connection Error';
        connectionStatus.style.color = 'red';
    }
}

// --- Connection Event Handlers ---
function handleConnect() {
    log('Connected to server!', `Socket ID: ${socket.id}`);
    connectionStatus.textContent = 'Connected';
    connectionStatus.style.color = 'green';
    socketId.textContent = socket.id;
    
    // Update UI
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    
    // Request initial world state
    socket.emit('request_world_state', {});
}

function handleDisconnect(reason) {
    log(`Disconnected from server: ${reason}`);
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.style.color = 'red';
    socketId.textContent = 'Not connected';
    
    // Update UI
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
}

function handleConnectError(error) {
    log(`Connection error: ${error.message}`);
    connectionStatus.textContent = 'Connection Error';
    connectionStatus.style.color = 'red';
}

// --- Game State Event Handlers ---
function handleServerTick(gameState) {
    // log('Received server tick', gameState);
    // We don't want to log every tick as it would flood the logs
    
    // Update player list
    updatePlayersList(gameState.entities);
}

function handlePlayerJoined(data) {
    log('Player joined', data);
    addChatMessage('system', `Player ${data.playerId} joined the game.`);
}

function handlePlayerDisconnected(data) {
    log('Player disconnected', data);
    addChatMessage('system', `Player ${data.playerId} left the game.`);
}

function handlePlayerMoved(data) {
    log('Player moved', data);
}

function handlePlayerAction(data) {
    log('Player action', data);
}

// --- Chat Event Handlers ---
function handleChatMessage(message) {
    log('Received global message', message);
    addChatMessage(message.senderId === socket.id ? 'self' : 'other', 
        `${message.senderName}: ${message.content}`, globalChat);
}

function handlePrivateMessage(message) {
    log('Received private message', message);
    const isSelf = message.senderId === socket.id;
    const prefix = isSelf ? 'You to' : 'From';
    const targetName = isSelf ? message.recipientId : message.senderName;
    
    addChatMessage(isSelf ? 'self' : 'other', 
        `${prefix} ${targetName}: ${message.content}`, privateChat);
}

function handleChannelMessage(message) {
    log('Received channel message', message);
    addChatMessage(message.senderId === socket.id ? 'self' : 'other', 
        `${message.senderName} [${message.channelId}]: ${message.content}`, channelChat);
}

function handleChannelJoined(data) {
    log('Joined channel', data);
    currentChannelId = data.channelId;
    addChatMessage('system', `You joined channel: ${data.channelId}`, channelChat);
}

function handleChannelLeft(data) {
    log('Left channel', data);
    if (currentChannelId === data.channelId) {
        currentChannelId = null;
    }
    addChatMessage('system', `You left channel: ${data.channelId}`, channelChat);
}

function handleChannelUserJoined(data) {
    log('User joined channel', data);
    addChatMessage('system', `${data.username} joined channel: ${data.channelId}`, channelChat);
}

function handleChannelUserLeft(data) {
    log('User left channel', data);
    addChatMessage('system', `${data.username} left channel: ${data.channelId}`, channelChat);
}

function handleChatError(error) {
    log('Chat error', error);
}

// --- World Event Handlers ---
function handleWorldState(state) {
    log('Received world state', state);
}

function handleObjectUsed(data) {
    log('Object used', data);
}

function handleObjectActivated(data) {
    log('Object activated', data);
}

function handleObjectRemoved(data) {
    log('Object removed', data);
}

function handleEntityCreated(data) {
    log('Entity created', data);
}

function handleEntityAdded(data) {
    log('Entity added', data);
}

function handleEntityDeleted(data) {
    log('Entity deleted', data);
}

function handleEntityRemoved(data) {
    log('Entity removed', data);
}

function handleInteractionError(error) {
    log('Interaction error', error);
}

function handleEntityError(error) {
    log('Entity error', error);
}

// --- UI Helpers ---
function addChatMessage(type, message, chatElement = globalChat) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    chatElement.appendChild(messageDiv);
    chatElement.scrollTop = chatElement.scrollHeight;
}

function updatePlayersList(entities) {
    if (!entities) return;
    
    playersList.innerHTML = '';
    Object.keys(entities).forEach(playerId => {
        const li = document.createElement('li');
        li.textContent = playerId === socket.id ? `${playerId} (You)` : playerId;
        li.dataset.id = playerId;
        
        if (playerId === socket.id) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', () => {
            recipientId.value = playerId;
        });
        
        playersList.appendChild(li);
    });
}

function updateRoomList(rooms) {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const li = document.createElement('li');
        li.textContent = `${room.name} (${room.players.size}/${room.maxPlayers})`;
        li.dataset.id = room.id;
        
        if (room.id === selectedRoomId) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', () => {
            // Deselect all rooms
            document.querySelectorAll('#room-list li').forEach(el => {
                el.classList.remove('active');
            });
            
            // Select this room
            li.classList.add('active');
            selectedRoomId = room.id;
        });
        
        roomList.appendChild(li);
    });
}

// --- Event Listeners ---

// Connection Tab
connectBtn.addEventListener('click', () => {
    connectToServer();
});

disconnectBtn.addEventListener('click', () => {
    if (socket) {
        socket.disconnect();
    }
});

// Player Tab
moveBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const moveData = {
        x: parseFloat(posX.value) || 0,
        y: parseFloat(posY.value) || 0,
        z: parseFloat(posZ.value) || 0
    };
    
    socket.emit('player_move', moveData);
    log('Sent move request', moveData);
});

actionBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const actionData = {
        type: actionType.value
    };
    
    socket.emit('player_action', actionData);
    log('Sent action request', actionData);
});

// Chat Tab
sendGlobalBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const content = globalMessage.value.trim();
    if (!content) return;
    
    const messageData = {
        content,
        senderName: username
    };
    
    socket.emit('chat_message', messageData);
    globalMessage.value = '';
    log('Sent global message', messageData);
});

sendPrivateBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const content = privateMessage.value.trim();
    const recipient = recipientId.value.trim();
    if (!content || !recipient) return;
    
    const messageData = {
        content,
        senderName: username,
        recipientId: recipient
    };
    
    socket.emit('private_message', messageData);
    privateMessage.value = '';
    log('Sent private message', messageData);
});

joinChannelBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const channel = channelId.value.trim();
    if (!channel) return;
    
    const channelData = {
        channelId: channel,
        username
    };
    
    socket.emit('join_channel', channelData);
    log('Sent join channel request', channelData);
});

leaveChannelBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const channel = channelId.value.trim() || currentChannelId;
    if (!channel) return;
    
    const channelData = {
        channelId: channel,
        username
    };
    
    socket.emit('leave_channel', channelData);
    log('Sent leave channel request', channelData);
});

sendChannelBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const content = channelMessage.value.trim();
    const channel = channelId.value.trim() || currentChannelId;
    if (!content || !channel) return;
    
    const messageData = {
        content,
        senderName: username,
        channelId: channel
    };
    
    socket.emit('channel_message', messageData);
    channelMessage.value = '';
    log('Sent channel message', messageData);
});

// World Tab
requestWorldStateBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    socket.emit('request_world_state', {});
    log('Requested world state');
});

interactBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const object = objectId.value.trim();
    if (!object) return;
    
    const interactionData = {
        objectId: object,
        type: interactionType.value
    };
    
    socket.emit('interact_object', interactionData);
    log('Sent interaction request', interactionData);
});

createEntityBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    const type = entityType.value;
    
    const entityData = {
        type,
        position: {
            x: parseFloat(posX.value) || 0,
            y: parseFloat(posY.value) || 0,
            z: parseFloat(posZ.value) || 0
        },
        properties: {
            name: `${type}_${Date.now()}`,
            createdBy: socket.id
        }
    };
    
    socket.emit('create_entity', entityData);
    log('Sent create entity request', entityData);
});

// Room Management
joinRoomBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        log('Not connected to server');
        return;
    }
    
    if (!selectedRoomId) {
        log('No room selected');
        return;
    }
    
    // This would need a custom event on the server side
    socket.emit('join_room', { roomId: selectedRoomId });
    log('Sent join room request', { roomId: selectedRoomId });
});

// Logs
clearLogsBtn.addEventListener('click', () => {
    logOutput.textContent = '';
});

// Tab Navigation
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        
        // Deactivate all tabs
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Activate selected tab
        tab.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// --- Initial Log ---
log('Socket.IO Test Suite Initialized. Click "Connect to Server" to begin.');
