const mongoose = require('mongoose');

const drawingElementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['line', 'rectangle', 'circle', 'text', 'freehand'],
    required: true
  },
  coordinates: {
    type: mongoose.Schema.Types.Mixed, // Can store different coordinate structures
    required: true
  },
  style: {
    color: {
      type: String,
      default: '#000000'
    },
    strokeWidth: {
      type: Number,
      default: 2,
      min: 1,
      max: 50
    },
    fill: {
      type: String,
      default: 'transparent'
    },
    opacity: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  clientId: {
    type: String, // Store the client-generated ID separately
    required: false
  }
});

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Board title is required'],
    trim: true,
    maxlength: [100, 'Board title cannot exceed 100 characters'],
    default: 'Untitled Board'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null // For password-protected boards
  },
  background: {
    color: {
      type: String,
      default: '#ffffff'
    },
    pattern: {
      type: String,
      enum: ['none', 'grid', 'dots'],
      default: 'none'
    }
  },
  elements: [drawingElementSchema],
  dimensions: {
    width: {
      type: Number,
      default: 1920
    },
    height: {
      type: Number,
      default: 1080
    }
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for better performance
boardSchema.index({ owner: 1, createdAt: -1 });
boardSchema.index({ 'collaborators.user': 1 });
boardSchema.index({ isPublic: 1, isActive: 1 });

// Update lastModified on element changes
boardSchema.pre('save', function(next) {
  if (this.isModified('elements')) {
    this.lastModified = new Date();
    this.version += 1;
  }
  next();
});

// Add collaborator method
boardSchema.methods.addCollaborator = function(userId, role = 'editor') {
  const existingCollaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (!existingCollaborator) {
    this.collaborators.push({
      user: userId,
      role: role
    });
  }
  
  return this.save();
};

// Remove collaborator method
boardSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  return this.save();
};

// Check if user has access
boardSchema.methods.hasAccess = function(userId) {
  if (this.owner.toString() === userId.toString()) return true;
  if (this.isPublic) return true;
  
  return this.collaborators.some(
    collab => collab.user.toString() === userId.toString()
  );
};

// Get user role
boardSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  return collaborator ? collaborator.role : null;
};

// Add drawing element
boardSchema.methods.addElement = function(element) {
  this.elements.push(element);
  this.markModified('elements');
  return this.save();
};

// Remove drawing element
boardSchema.methods.removeElement = function(elementId) {
  this.elements = this.elements.filter(
    element => element._id !== elementId
  );
  this.markModified('elements');
  return this.save();
};

// Clear all elements
boardSchema.methods.clearBoard = function() {
  this.elements = [];
  this.markModified('elements');
  return this.save();
};

module.exports = mongoose.model('Board', boardSchema);