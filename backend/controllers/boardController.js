const Board = require('../models/Board');
const Message = require('../models/Message');

// Create new board
const createBoard = async (req, res) => {
  try {
    const { title, description, isPublic, background, dimensions, tags } = req.body;
    const user = req.user;

    let boardTitle = title;

    // If no title provided, generate a unique default title
    if (!boardTitle || !boardTitle.trim()) {
      // Find all boards owned by user that start with "Untitled Board"
      const untitledBoards = await Board.find({
        owner: user._id,
        title: { $regex: /^Untitled Board( \d+)?$/ }
      }).select('title');

      if (untitledBoards.length === 0) {
        boardTitle = 'Untitled Board 1';
      } else {
        // Extract numbers and find the max
        const numbers = untitledBoards.map(b => {
          const match = b.title.match(/^Untitled Board( (\d+))?$/);
          if (match) {
            return match[2] ? parseInt(match[2]) : 1;
          }
          return 0;
        });
        
        const maxNum = Math.max(...numbers, 0);
        boardTitle = `Untitled Board ${maxNum + 1}`;
      }
    }

    const board = new Board({
      title: boardTitle,
      description,
      owner: user._id,
      isPublic: isPublic || false,
      background: background || {},
      dimensions: dimensions || { width: 1920, height: 1080 },
      tags: tags || []
    });

    await board.save();
    await board.populate('owner', 'username email avatar');

    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: { board }
    });

  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create board'
    });
  }
};

// Get user's boards
const getUserBoards = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, search, sortBy = 'lastModified', sortOrder = 'desc' } = req.query;

    const query = {
      $or: [
        { owner: user._id },
        { 'collaborators.user': user._id },
        { isPublic: true }
      ],
      isActive: true
    };

    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      ];
      delete query.$or;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const boards = await Board.find(query)
      .populate('owner', 'username email avatar')
      .populate('collaborators.user', 'username email avatar')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Board.countDocuments(query);

    res.json({
      success: true,
      data: {
        boards,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get user boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get boards'
    });
  }
};

// Get board by ID
const getBoard = async (req, res) => {
  try {
    const board = req.board; // From middleware
    
    await board.populate('owner', 'username email avatar');
    await board.populate('collaborators.user', 'username email avatar');

    res.json({
      success: true,
      data: { 
        board,
        userRole: req.userRole 
      }
    });

  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get board'
    });
  }
};

// Update board
const updateBoard = async (req, res) => {
  try {
    const board = req.board;
    const { title, description, isPublic, background, dimensions, tags } = req.body;

    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (isPublic !== undefined) board.isPublic = isPublic;
    if (background) board.background = { ...board.background, ...background };
    if (dimensions) board.dimensions = { ...board.dimensions, ...dimensions };
    if (tags !== undefined) board.tags = tags;

    await board.save();
    await board.populate('owner', 'username email avatar');
    await board.populate('collaborators.user', 'username email avatar');

    res.json({
      success: true,
      message: 'Board updated successfully',
      data: { board }
    });

  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update board'
    });
  }
};

// Delete board
const deleteBoard = async (req, res) => {
  try {
    const board = req.board;

    // Soft delete
    board.isActive = false;
    await board.save();

    res.json({
      success: true,
      message: 'Board deleted successfully'
    });

  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete board'
    });
  }
};

// Add drawing element
const addElement = async (req, res) => {
  try {
    const board = req.board;
    const user = req.user;
    const elementData = req.body;

    const element = {
      ...elementData,
      userId: user._id,
      username: user.username,
      timestamp: new Date()
    };

    await board.addElement(element);

    res.json({
      success: true,
      message: 'Element added successfully',
      data: { element }
    });

  } catch (error) {
    console.error('Add element error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add element'
    });
  }
};

// Remove drawing element
const removeElement = async (req, res) => {
  try {
    const board = req.board;
    const { elementId } = req.params;

    await board.removeElement(elementId);

    res.json({
      success: true,
      message: 'Element removed successfully'
    });

  } catch (error) {
    console.error('Remove element error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove element'
    });
  }
};

// Clear board
const clearBoard = async (req, res) => {
  try {
    const board = req.board;

    await board.clearBoard();

    res.json({
      success: true,
      message: 'Board cleared successfully'
    });

  } catch (error) {
    console.error('Clear board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear board'
    });
  }
};

// Add collaborator
const addCollaborator = async (req, res) => {
  try {
    const board = req.board;
    const { username, email, role = 'editor' } = req.body;

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        message: 'Username or email is required'
      });
    }

    const User = require('../models/User');
    let user;
    
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ username });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (board.owner.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add board owner as collaborator'
      });
    }

    await board.addCollaborator(user._id, role);
    await board.populate('collaborators.user', 'username email avatar');

    // Create system message
    await Message.createSystemMessage(
      board._id,
      `${user.username} was added as a ${role}`,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      data: { board }
    });

  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add collaborator'
    });
  }
};

// Remove collaborator
const removeCollaborator = async (req, res) => {
  try {
    const board = req.board;
    const { userId } = req.params;

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await board.removeCollaborator(userId);

    // Create system message
    await Message.createSystemMessage(
      board._id,
      `${user.username} was removed from the board`,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });

  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove collaborator'
    });
  }
};

// Get board messages
const getBoardMessages = async (req, res) => {
  try {
    const board = req.board;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.getBoardMessages(
      board._id,
      parseInt(page),
      parseInt(limit)
    );

    const total = await Message.countDocuments({
      board: board._id,
      isDeleted: false
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Show oldest first
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get board messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const board = req.board;
    const user = req.user;
    const { content, replyTo } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = new Message({
      content: content.trim(),
      sender: user._id,
      senderUsername: user.username,
      board: board._id,
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('replyTo', 'content senderUsername');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

// Lock board
const lockBoard = async (req, res) => {
  try {
    const board = req.board;
    const user = req.user;

    if (board.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can lock the board'
      });
    }

    await board.lockBoard(user._id);

    res.json({
      success: true,
      message: 'Board locked successfully',
      data: { board }
    });

  } catch (error) {
    console.error('Lock board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock board'
    });
  }
};

// Unlock board
const unlockBoard = async (req, res) => {
  try {
    const board = req.board;
    const user = req.user;

    if (board.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can unlock the board'
      });
    }

    await board.unlockBoard(user._id);

    res.json({
      success: true,
      message: 'Board unlocked successfully',
      data: { board }
    });

  } catch (error) {
    console.error('Unlock board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock board'
    });
  }
};

module.exports = {
  createBoard,
  getUserBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  addElement,
  removeElement,
  clearBoard,
  addCollaborator,
  removeCollaborator,
  getBoardMessages,
  sendMessage,
  lockBoard,
  unlockBoard
};