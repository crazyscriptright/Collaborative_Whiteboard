const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/boardController');
const { authenticateToken, checkBoardAccess } = require('../middleware/authMiddleware');

// All board routes require authentication
router.use(authenticateToken);

// Board CRUD operations
router.post('/', createBoard);
router.get('/', getUserBoards);
router.get('/:boardId', checkBoardAccess('viewer'), getBoard);
router.put('/:boardId', checkBoardAccess('admin'), updateBoard);
router.delete('/:boardId', checkBoardAccess('owner'), deleteBoard);

// Drawing operations
router.post('/:boardId/elements', checkBoardAccess('editor'), addElement);
router.delete('/:boardId/elements/:elementId', checkBoardAccess('editor'), removeElement);
router.post('/:boardId/clear', checkBoardAccess('editor'), clearBoard);

// Collaboration operations
router.post('/:boardId/collaborators', checkBoardAccess('admin'), addCollaborator);
router.delete('/:boardId/collaborators/:userId', checkBoardAccess('admin'), removeCollaborator);

// Chat operations
router.get('/:boardId/messages', checkBoardAccess('viewer'), getBoardMessages);
router.post('/:boardId/messages', checkBoardAccess('viewer'), sendMessage);

// Board locking
router.post('/:boardId/lock', checkBoardAccess('owner'), lockBoard);
router.post('/:boardId/unlock', checkBoardAccess('owner'), unlockBoard);

module.exports = router;