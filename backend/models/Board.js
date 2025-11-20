const mongoose = require('mongoose');

const drawingElementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      // Basic drawing tools
      'pen', 'eraser', 'line', 'arrow',
      // Shapes
      'rectangle', 'circle', 'triangle', 'diamond', 'star', 'hexagon',
      // Text and notes
      'text', 'sticky-note',
      // Media
      'image',
      // Legacy support
      'freehand'
    ],
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
  // Additional properties for specific element types
  text: {
    type: String,
    required: false
  },
  fontSize: {
    type: Number,
    default: 16,
    min: 8,
    max: 72
  },
  fontFamily: {
    type: String,
    default: 'Arial'
  },
  imageData: {
    type: String, // Base64 encoded image or URL
    required: false
  },
  width: {
    type: Number,
    required: false
  },
  height: {
    type: Number,
    required: false
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
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

// Lock/unlock board
boardSchema.methods.lockBoard = function(userId) {
  if (this.owner.toString() !== userId.toString()) {
    throw new Error('Only the owner can lock the board');
  }
  this.isLocked = true;
  this.lockedBy = userId;
  return this.save();
};

boardSchema.methods.unlockBoard = function(userId) {
  if (this.owner.toString() !== userId.toString()) {
    throw new Error('Only the owner can unlock the board');
  }
  this.isLocked = false;
  this.lockedBy = null;
  return this.save();
};

// Check if user can edit
boardSchema.methods.canEdit = function(userId) {
  if (this.isLocked && this.owner.toString() !== userId.toString()) {
    return false;
  }
  
  const role = this.getUserRole(userId);
  return role === 'owner' || role === 'editor' || role === 'admin';
};

// Add drawing element
boardSchema.methods.addElement = function(element) {
  // Check if element with same clientId exists
  if (element.clientId) {
    const existingIndex = this.elements.findIndex(el => el.clientId === element.clientId);
    
    if (existingIndex !== -1) {
      // Update existing element
      // We need to preserve the _id of the existing element to avoid Mongoose errors
      const existingElement = this.elements[existingIndex];
      const updatedElement = { ...element };
      delete updatedElement._id; // Ensure we don't overwrite _id with something else
      
      // Mongoose subdocuments are objects, so we can assign properties
      // But replacing the whole object in the array is cleaner if we handle _id
      this.elements[existingIndex] = { ...existingElement.toObject(), ...updatedElement };
    } else {
      this.elements.push(element);
    }
  } else {
    this.elements.push(element);
  }
  
  this.markModified('elements');
  return this.save();
};

// Remove drawing element
boardSchema.methods.removeElement = function(elementId) {
  this.elements = this.elements.filter(
    element => element._id.toString() !== elementId && element.clientId !== elementId
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