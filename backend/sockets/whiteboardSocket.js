const { verifyAccessToken } = require('../utils/jwtUtils');
const User = require('../models/User');
const Board = require('../models/Board');
const Message = require('../models/Message');

// Store active users per board
const activeUsers = new Map();

// Authentication middleware for socket
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    
    if (!user || !user.isActive) {
      return next(new Error('Invalid user'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

// Check board access
const checkBoardAccess = async (socket, boardId) => {
  try {
    const board = await Board.findById(boardId);
    
    if (!board || !board.isActive) {
      return false;
    }

    return board.hasAccess(socket.user._id);
  } catch (error) {
    return false;
  }
};

// Add user to active users
const addActiveUser = (boardId, user) => {
  if (!activeUsers.has(boardId)) {
    activeUsers.set(boardId, new Map());
  }
  
  const boardUsers = activeUsers.get(boardId);
  boardUsers.set(user._id.toString(), {
    id: user._id,
    username: user.username,
    avatar: user.avatar,
    cursor: { x: 0, y: 0 },
    lastSeen: new Date()
  });
};

// Remove user from active users
const removeActiveUser = (boardId, userId) => {
  if (activeUsers.has(boardId)) {
    const boardUsers = activeUsers.get(boardId);
    boardUsers.delete(userId.toString());
    
    if (boardUsers.size === 0) {
      activeUsers.delete(boardId);
    }
  }
};

// Get active users for a board
const getActiveUsers = (boardId) => {
  if (!activeUsers.has(boardId)) {
    return [];
  }
  
  return Array.from(activeUsers.get(boardId).values());
};

// Update user cursor position
const updateUserCursor = (boardId, userId, cursor) => {
  if (activeUsers.has(boardId)) {
    const boardUsers = activeUsers.get(boardId);
    const user = boardUsers.get(userId.toString());
    if (user) {
      user.cursor = cursor;
      user.lastSeen = new Date();
    }
  }
};

const initializeSocket = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected`);

    // Join board room
    socket.on('join-board', async (data) => {
      try {
        const { boardId } = data;
        
        if (!boardId) {
          socket.emit('error', { message: 'Board ID is required' });
          return;
        }

        const hasAccess = await checkBoardAccess(socket, boardId);
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to this board' });
          return;
        }

        // Leave previous rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
            removeActiveUser(room, socket.user._id);
          }
        });

        // Join new board room
        socket.join(boardId);
        socket.currentBoard = boardId;
        
        // Join user's own room for personal notifications
        socket.join(socket.user._id.toString());
        
        // Add to active users
        addActiveUser(boardId, socket.user);
        
        // Notify others about new user
        socket.to(boardId).emit('user-joined', {
          user: {
            id: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar
          }
        });

        // Send current active users to the joining user
        socket.emit('active-users', {
          users: getActiveUsers(boardId)
        });

        // Send success confirmation
        socket.emit('joined-board', { boardId });

      } catch (error) {
        console.error('Join board error:', error);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // Leave board room
    socket.on('leave-board', (data) => {
      const { boardId } = data;
      
      if (boardId) {
        socket.leave(boardId);
        removeActiveUser(boardId, socket.user._id);
        
        socket.to(boardId).emit('user-left', {
          userId: socket.user._id,
          username: socket.user.username
        });

        socket.to(boardId).emit('active-users', {
          users: getActiveUsers(boardId)
        });
      }
    });

    // Handle drawing events
    socket.on('drawing', (data) => {
      try {
        const { boardId, element } = data;
        
        if (!boardId || !element) {
          socket.emit('error', { message: 'Invalid drawing data' });
          return;
        }

        // Add user info to element
        const drawingElement = {
          ...element,
          userId: socket.user._id,
          username: socket.user.username,
          timestamp: new Date()
        };

        // Broadcast to other users in the same board
        socket.to(boardId).emit('drawing', {
          element: drawingElement
        });

        // Save to database (optional, for persistence)
        if (element.persist) {
          console.log(`Persisting element for board ${boardId}, type: ${element.type}, clientId: ${element.clientId}`);
          Board.findById(boardId).then(board => {
            if (board) {
              // Remove the clientId and _id before saving to database (let Mongoose generate _id)
              const { clientId, _id, ...elementToSave } = drawingElement;
              // Store the original client ID for reference
              elementToSave.clientId = clientId || _id;
              
              board.addElement(elementToSave)
                .then(() => console.log(`Element saved successfully: ${elementToSave.clientId}`))
                .catch(err => console.error(`Failed to save element: ${err.message}`));
            } else {
              console.error(`Board not found for persistence: ${boardId}`);
            }
          }).catch(error => {
            console.error('Save drawing element error:', error);
          });
        } else {
            console.log(`Element not persisted (persist flag missing or false): ${element.type}`);
        }

      } catch (error) {
        console.error('Drawing event error:', error);
        socket.emit('error', { message: 'Failed to process drawing' });
      }
    });

    // Handle drawing updates (for real-time drawing)
    socket.on('drawing-update', (data) => {
      try {
        const { boardId, element } = data;
        
        if (!boardId || !element) {
          return;
        }

        // Broadcast live drawing updates
        socket.to(boardId).emit('drawing-update', {
          element: {
            ...element,
            userId: socket.user._id,
            username: socket.user.username
          }
        });

      } catch (error) {
        console.error('Drawing update error:', error);
      }
    });

    // Handle element deletion
    socket.on('delete-element', (data) => {
      try {
        const { boardId, elementId } = data;
        
        if (!boardId || !elementId) {
          socket.emit('error', { message: 'Invalid delete data' });
          return;
        }

        // Broadcast deletion to other users
        socket.to(boardId).emit('element-deleted', {
          elementId,
          deletedBy: socket.user.username
        });

        // Remove from database
        Board.findById(boardId).then(board => {
          if (board) {
            board.removeElement(elementId);
          }
        }).catch(error => {
          console.error('Delete element error:', error);
        });

      } catch (error) {
        console.error('Delete element event error:', error);
        socket.emit('error', { message: 'Failed to delete element' });
      }
    });

    // Handle board clear
    socket.on('clear-board', (data) => {
      try {
        const { boardId } = data;
        
        if (!boardId) {
          socket.emit('error', { message: 'Board ID is required' });
          return;
        }

        // Broadcast clear to other users
        socket.to(boardId).emit('board-cleared', {
          clearedBy: socket.user.username
        });

        // Clear database
        Board.findById(boardId).then(board => {
          if (board) {
            board.clearBoard();
          }
        }).catch(error => {
          console.error('Clear board error:', error);
        });

      } catch (error) {
        console.error('Clear board event error:', error);
        socket.emit('error', { message: 'Failed to clear board' });
      }
    });

    // Handle cursor movement
    socket.on('cursor-move', (data) => {
      try {
        const { boardId, cursor } = data;
        
        if (!boardId || !cursor) {
          return;
        }

        // Update user cursor position
        updateUserCursor(boardId, socket.user._id, cursor);

        // Broadcast cursor position to other users
        socket.to(boardId).emit('cursor-move', {
          userId: socket.user._id,
          username: socket.user.username,
          cursor
        });

      } catch (error) {
        console.error('Cursor move error:', error);
      }
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      try {
        const { boardId, content, replyTo } = data;
        
        if (!boardId || !content || !content.trim()) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        const hasAccess = await checkBoardAccess(socket, boardId);
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message in database
        const message = new Message({
          content: content.trim(),
          sender: socket.user._id,
          senderUsername: socket.user.username,
          board: boardId,
          replyTo: replyTo || null
        });

        await message.save();
        await message.populate('sender', 'username avatar');
        await message.populate('replyTo', 'content senderUsername');

        // Broadcast message to all users in the board
        io.to(boardId).emit('new-message', {
          message
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { boardId } = data;
      
      if (boardId) {
        socket.to(boardId).emit('user-typing', {
          userId: socket.user._id,
          username: socket.user.username,
          isTyping: true
        });
      }
    });

    socket.on('typing-stop', (data) => {
      const { boardId } = data;
      
      if (boardId) {
        socket.to(boardId).emit('user-typing', {
          userId: socket.user._id,
          username: socket.user.username,
          isTyping: false
        });
      }
    });

    // Handle sending invitations/notifications
    socket.on('send-invite', (data) => {
      const { userId, boardId, boardTitle } = data;
      // Send to the specific user room
      io.to(userId).emit('invite-received', {
        sender: socket.user.username,
        boardId,
        boardTitle,
        timestamp: new Date()
      });
    });

    // Handle collaborator added event
    socket.on('collaborator-added', async (data) => {
      const { boardId, collaboratorId } = data;
      try {
        const board = await Board.findById(boardId).populate('collaborators.user', 'username avatar');
        if (board) {
          const collaborator = board.collaborators.find(c => c.user._id.toString() === collaboratorId);
          // Broadcast to all users in the board
          io.to(boardId).emit('collaborator-added', {
            boardId,
            collaborators: board.collaborators,
            collaborator: collaborator ? {
              username: collaborator.user.username,
              avatar: collaborator.user.avatar
            } : null
          });
        }
      } catch (error) {
        console.error('Collaborator added event error:', error);
      }
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected`);
      
      if (socket.currentBoard) {
        removeActiveUser(socket.currentBoard, socket.user._id);
        
        socket.to(socket.currentBoard).emit('user-left', {
          userId: socket.user._id,
          username: socket.user.username
        });

        socket.to(socket.currentBoard).emit('active-users', {
          users: getActiveUsers(socket.currentBoard)
        });
      }
    });
  });

  // Clean up inactive users every 5 minutes
  setInterval(() => {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    activeUsers.forEach((boardUsers, boardId) => {
      boardUsers.forEach((user, userId) => {
        if (now - user.lastSeen > timeout) {
          boardUsers.delete(userId);
        }
      });

      if (boardUsers.size === 0) {
        activeUsers.delete(boardId);
      }
    });
  }, 5 * 60 * 1000);
};

module.exports = {
  initializeSocket,
  getActiveUsers
};