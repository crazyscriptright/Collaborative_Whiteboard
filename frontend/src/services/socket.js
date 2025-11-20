import { io } from 'socket.io-client';
import { getToken, isAuthenticated, handleAuthError } from '../utils/jwt';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentBoard = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.eventListeners = new Map();
  }

  // Connect to socket server
  connect() {
    if (this.socket && this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const token = getToken();
      
      if (!isAuthenticated() || !token) {
        handleAuthError();
        reject(new Error('Authentication required'));
        return;
      }

      const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      // Connection successful
      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        
        if (error.message === 'Authentication failed' || error.message === 'Authentication token required') {
          handleAuthError();
        }
        
        reject(error);
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        
        // Try to reconnect if it wasn't intentional
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          this.handleReconnection();
        }
      });

      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Reconnection attempt ${attemptNumber}`);
        this.reconnectAttempts = attemptNumber;
      });

      // Reconnection successful
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Rejoin current board if any
        if (this.currentBoard) {
          this.joinBoard(this.currentBoard);
        }
      });

      // Reconnection failed
      this.socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect after maximum attempts');
        this.isConnected = false;
        this.handleReconnectionFailure();
      });

      // Server errors
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emit('socket-error', error);
      });

      // Set up default event listeners
      this.setupDefaultListeners();
    });
  }

  // Setup default event listeners
  setupDefaultListeners() {
    if (!this.socket) return;

    // Board events
    this.socket.on('joined-board', (data) => {
      this.currentBoard = data.boardId;
      this.emit('board-joined', data);
    });

    this.socket.on('user-joined', (data) => {
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      this.emit('user-left', data);
    });

    this.socket.on('active-users', (data) => {
      this.emit('active-users', data);
    });

    // Drawing events
    this.socket.on('drawing', (data) => {
      this.emit('drawing', data);
    });

    this.socket.on('drawing-update', (data) => {
      this.emit('drawing-update', data);
    });

    this.socket.on('element-deleted', (data) => {
      this.emit('element-deleted', data);
    });

    this.socket.on('board-cleared', (data) => {
      this.emit('board-cleared', data);
    });

    // Cursor events
    this.socket.on('cursor-move', (data) => {
      this.emit('cursor-move', data);
    });

    // Chat events
    this.socket.on('new-message', (data) => {
      this.emit('new-message', data);
    });

    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data);
    });

    // Notification events
    this.socket.on('invite-received', (data) => {
      this.emit('invite-received', data);
    });

    // Connection health
    this.socket.on('pong', () => {
      this.emit('pong');
    });
  }

  // Handle reconnection
  handleReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isConnected && isAuthenticated()) {
        this.connect().catch(console.error);
      }
    }, 2000);
  }

  // Handle reconnection failure
  handleReconnectionFailure() {
    this.emit('connection-lost');
    // Could show a UI notification to the user
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentBoard = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Join a board room
  joinBoard(boardId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join-board', { boardId });
  }

  // Leave current board room
  leaveBoard() {
    if (!this.socket || !this.currentBoard) return;

    this.socket.emit('leave-board', { boardId: this.currentBoard });
    this.currentBoard = null;
  }

  // Drawing methods
  sendDrawing(boardId, element) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('drawing', {
      boardId,
      element
    });
  }

  sendDrawingUpdate(boardId, element) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('drawing-update', {
      boardId,
      element
    });
  }

  deleteElement(boardId, elementId) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('delete-element', {
      boardId,
      elementId
    });
  }

  clearBoard(boardId) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('clear-board', { boardId });
  }

  // Cursor methods
  sendCursorMove(boardId, cursor) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('cursor-move', {
      boardId,
      cursor
    });
  }

  // Chat methods
  sendMessage(boardId, content, replyTo = null) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('send-message', {
      boardId,
      content,
      replyTo
    });
  }

  startTyping(boardId) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('typing-start', { boardId });
  }

  stopTyping(boardId) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('typing-stop', { boardId });
  }

  // Notification methods
  sendInvite(userId, boardId, boardTitle) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('send-invite', {
      userId,
      boardId,
      boardTitle
    });
  }

  // Connection health check
  ping() {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('ping');
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.eventListeners.has(event)) return;
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Utility methods
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  getCurrentBoard() {
    return this.currentBoard;
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      currentBoard: this.currentBoard,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

// Auto-connect when authenticated
if (isAuthenticated()) {
  socketService.connect().catch(console.error);
}

export default socketService;