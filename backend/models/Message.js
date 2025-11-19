const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'notification'],
    default: 'text'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }]
}, {
  timestamps: true
});

// Index for better performance
messageSchema.index({ board: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ board: 1, isDeleted: 1, createdAt: -1 });

// Virtual for reply count
messageSchema.virtual('replyCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'replyTo',
  count: true
});

// Edit message method
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Soft delete message
messageSchema.methods.deleteMessage = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[This message was deleted]';
  return this.save();
};

// Add reaction method
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user for this emoji
  this.reactions = this.reactions.filter(
    reaction => !(reaction.user.toString() === userId.toString() && reaction.emoji === emoji)
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji
  });
  
  return this.save();
};

// Remove reaction method
messageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(
    reaction => !(reaction.user.toString() === userId.toString() && reaction.emoji === emoji)
  );
  
  return this.save();
};

// Add mention method
messageSchema.methods.addMention = function(userId, username) {
  const existingMention = this.mentions.find(
    mention => mention.user.toString() === userId.toString()
  );
  
  if (!existingMention) {
    this.mentions.push({
      user: userId,
      username: username
    });
  }
  
  return this.save();
};

// Static method to get board messages with pagination
messageSchema.statics.getBoardMessages = function(boardId, page = 1, limit = 50) {
  return this.find({
    board: boardId,
    isDeleted: false
  })
  .populate('sender', 'username avatar')
  .populate('replyTo', 'content senderUsername')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
};

// Static method to create system message
messageSchema.statics.createSystemMessage = function(boardId, content, senderId = null) {
  return this.create({
    content: content,
    sender: senderId,
    senderUsername: 'System',
    board: boardId,
    messageType: 'system'
  });
};

// Don't return deleted messages in JSON
messageSchema.methods.toJSON = function() {
  const message = this.toObject();
  if (message.isDeleted) {
    message.content = '[This message was deleted]';
    delete message.attachments;
  }
  return message;
};

module.exports = mongoose.model('Message', messageSchema);