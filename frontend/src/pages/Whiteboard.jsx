import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAuthenticated, getUser, clearAuth } from '../utils/jwt';
import { boardAPI, authAPI } from '../services/api';
import socketService from '../services/socket';
import Background from '../components/Background';
import CanvasBoard from '../components/CanvasBoard';
import Toolbar from '../components/Toolbar';
import ChatBox from '../components/ChatBox';
import WhiteboardMenu from '../components/WhiteboardMenu';

const Whiteboard = () => {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const [user, setUser] = useState(null);
  const [board, setBoard] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [selectedTool, setSelectedTool] = useState('pen');
  const [toolSettings, setToolSettings] = useState({
    color: '#000000',
    strokeWidth: 2,
    fill: 'transparent'
  });
  const [notifications, setNotifications] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const canvasRef = useRef(null);

  // Initialize
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const currentUser = getUser();
    setUser(currentUser);
    
    // If no boardId, create a new board or redirect to board selection
    if (!boardId) {
      createNewBoard();
    } else {
      loadBoard(boardId);
    }

    // Set up socket event listeners
    setupSocketListeners();

    // Cleanup
    return () => {
      // Remove all socket listeners
      socketService.off('board-joined');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('active-users');
      socketService.off('connection-lost');
      socketService.off('socket-error');
      
      if (socketService.getCurrentBoard()) {
        socketService.leaveBoard();
      }
    };
  }, [boardId, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleBoardSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
               handleRedo();
            } else {
               handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case '=': // + key
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
        }
      } else {
        // Tool shortcuts
        switch(e.key.toLowerCase()) {
          case 'p': setSelectedTool('pen'); break;
          case 'e': setSelectedTool('eraser'); break;
          case 't': setSelectedTool('text'); break;
          case 'r': setSelectedTool('rectangle'); break;
          case 'c': setSelectedTool('circle'); break;
          case 'l': setSelectedTool('line'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board]);

  const handleUndo = () => {
    if (canvasRef.current?.undo) {
      canvasRef.current.undo();
      addNotification('Undo', 'info');
    }
  };

  const handleRedo = () => {
    if (canvasRef.current?.redo) {
      canvasRef.current.redo();
      addNotification('Redo', 'info');
    }
  };

  const handleZoomIn = () => {
    if (canvasRef.current?.zoomIn) {
      canvasRef.current.zoomIn();
      addNotification(`Zoom In`, 'info');
    }
  };

  const handleZoomOut = () => {
    if (canvasRef.current?.zoomOut) {
      canvasRef.current.zoomOut();
      addNotification(`Zoom Out`, 'info');
    }
  };

  const handleToggleGrid = () => {
    if (canvasRef.current?.toggleGrid) {
      canvasRef.current.toggleGrid();
      const newShowGrid = !canvasRef.current.getShowGrid();
      setShowGrid(newShowGrid);
      addNotification(`Grid ${newShowGrid ? 'enabled' : 'disabled'}`, 'info');
    }
  };

  const handleExport = (format) => {
    if (canvasRef.current?.exportImage) {
      canvasRef.current.exportImage(format);
      addNotification(`Exporting as ${format.toUpperCase()}...`, 'success');
    }
  };

  const createNewBoard = async () => {
    try {
      const response = await boardAPI.createBoard({
        title: 'New Whiteboard',
        isPublic: false
      });

      if (response.success) {
        navigate(`/whiteboard/${response.data.board._id}`, { replace: true });
      } else {
        setError('Failed to create new board');
      }
    } catch (error) {
      console.error('Create board error:', error);
      setError('Failed to create new board');
    }
  };

  const loadBoard = async (id) => {
    try {
      setIsLoading(true);
      const response = await boardAPI.getBoard(id);

      if (response.success) {
        setBoard(response.data.board);
        
        // Connect to socket and join board
        if (socketService.isSocketConnected()) {
          socketService.joinBoard(id);
        } else {
          await socketService.connect();
          socketService.joinBoard(id);
        }
      } else {
        setError(response.message || 'Failed to load board');
      }
    } catch (error) {
      console.error('Load board error:', error);
      setError('Failed to load board');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Remove all existing listeners first to prevent duplicates
    socketService.off('board-joined');
    socketService.off('user-joined');
    socketService.off('user-left');
    socketService.off('active-users');
    socketService.off('connection-lost');
    socketService.off('socket-error');

    // Board events
    socketService.on('board-joined', (data) => {
      addNotification('Connected to board', 'success');
    });

    socketService.on('user-joined', (data) => {
      addNotification(`${data.user.username} joined the board`, 'info');
    });

    socketService.on('user-left', (data) => {
      addNotification(`${data.username} left the board`, 'info');
    });

    socketService.on('active-users', (data) => {
      setActiveUsers(data.users);
    });

    // Connection events
    socketService.on('connection-lost', () => {
      addNotification('Connection lost. Trying to reconnect...', 'warning');
    });

    socketService.on('socket-error', (error) => {
      addNotification(error.message || 'Connection error', 'error');
    });
  };

  const addNotification = (message, type = 'info') => {
    const notificationId = Date.now() + Math.random(); // Ensure unique ID
    const notification = {
      id: notificationId,
      message,
      type,
      timestamp: new Date(),
      isExiting: false
    };

    setNotifications(prev => [...prev, notification]);

    // Start exit animation after 2.7 seconds, then remove after 3 seconds
    const exitTimer = setTimeout(() => {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isExiting: true } : n
      ));
    }, 2700);

    const removeTimer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 3000);

    // Store timers for potential cleanup (optional, but good practice)
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      socketService.disconnect();
      clearAuth();
      navigate('/login');
    }
  };

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  const handleToolSettingsChange = (settings) => {
    setToolSettings(prev => ({ ...prev, ...settings }));
  };

  const handleBoardClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clearBoard();
    }
  };

  const handleBoardSave = async () => {
    if (canvasRef.current && board) {
      const elements = canvasRef.current.getElements();
      try {
        await boardAPI.updateBoard(board._id, { elements });
        addNotification('Board saved successfully', 'success');
      } catch (error) {
        addNotification('Failed to save board', 'error');
      }
    }
  };

  const handleShareBoard = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    try {
      setIsSharing(true);
      const response = await boardAPI.addCollaborator(board._id, {
        email: shareEmail,
        role: 'editor'
      });

      if (response.success) {
        addNotification(`Invitation sent to ${shareEmail}`, 'success');
        setShareEmail('');
        setIsShareModalOpen(false);
        // Refresh board data to show new collaborator if needed
        loadBoard(board._id);
      } else {
        addNotification(response.message || 'Failed to share board', 'error');
      }
    } catch (error) {
      console.error('Share board error:', error);
      addNotification(error.response?.data?.message || 'Failed to share board', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleLockBoard = async () => {
    if (!board?._id) return;
    
    try {
      const response = await boardAPI.lockBoard(board._id);
      if (response.success) {
        setBoard(response.data.board);
        addNotification('Board locked. Only you can edit now.', 'success');
      }
    } catch (error) {
      addNotification('Failed to lock board', 'error');
    }
  };

  const handleUnlockBoard = async () => {
    if (!board?._id) return;
    
    try {
      const response = await boardAPI.unlockBoard(board._id);
      if (response.success) {
        setBoard(response.data.board);
        addNotification('Board unlocked. Collaborators can edit again.', 'success');
      }
    } catch (error) {
      addNotification('Failed to unlock board', 'error');
    }
  };

  if (isLoading) {
    return (
      <Background>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading whiteboard...</p>
        </div>
      </Background>
    );
  }

  if (error) {
    return (
      <Background>
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/whiteboard')} className="retry-button">
            Create New Board
          </button>
        </div>
      </Background>
    );
  }

  return (
    <Background>
      <div className="whiteboard-container flex flex-col h-screen">
        <WhiteboardMenu 
          onSave={handleBoardSave}
          onClear={handleBoardClear}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onExport={handleExport}
          onShare={() => setIsShareModalOpen(true)}
          onLock={handleLockBoard}
          onUnlock={handleUnlockBoard}
          isLocked={board?.isLocked || false}
          isOwner={board?.owner === user?.id || board?.owner?._id === user?.id}
          activeUsers={activeUsers}
          currentUser={user}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <div className="whiteboard-main">
          {/* Toolbar */}
          <Toolbar
            selectedTool={selectedTool}
            toolSettings={toolSettings}
            onToolChange={handleToolChange}
            onToolSettingsChange={handleToolSettingsChange}
            onClearBoard={handleBoardClear}
            isCollapsed={isToolbarCollapsed}
            onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
            onToggleGrid={handleToggleGrid}
            showGrid={showGrid}
            canvasRef={canvasRef}
          />

          {/* Canvas */}
          <div className="canvas-container">
            <CanvasBoard
              ref={canvasRef}
              board={board}
              selectedTool={selectedTool}
              toolSettings={toolSettings}
              activeUsers={activeUsers}
            />
          </div>

          {/* Chat */}
          {isChatOpen && (
            <ChatBox
              board={board}
              user={user}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          )}

          {/* Floating Chat Toggle Button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`fixed bottom-0 left-6 w-64 h-12 bg-white border-t border-x border-gray-200 rounded-t-lg shadow-lg flex items-center justify-between px-4 transition-all duration-300 z-50 hover:bg-gray-50 ${
              isChatOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <span className="font-semibold text-gray-700">Messaging</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Notifications - Bottom Right Corner */}
        <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-3 max-w-sm pointer-events-none">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`toast-notification toast-${notification.type} ${
                notification.isExiting ? 'toast-exit' : 'toast-enter'
              }`}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="toast-icon">
                {notification.type === 'success' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'warning' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="toast-content">
                <p className="toast-message">{notification.message}</p>
              </div>
              <button className="toast-close" onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="toast-progress">
                <div className="toast-progress-bar"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Invite Modal */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={(e) => {
            if (e.target === e.currentTarget) setIsShareModalOpen(false);
          }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Invite Collaborator</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  onClick={() => setIsShareModalOpen(false)}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleShareBoard}>
                <div className="px-4 sm:px-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="shareEmail" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="shareEmail"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        required
                        autoFocus
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex gap-2">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs sm:text-sm text-blue-800">
                          The user must have an account to be added as a collaborator. They will be able to view and edit this board.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
                  <button 
                    type="button" 
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setIsShareModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={isSharing}
                  >
                    {isSharing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Background>
  );
};

export default Whiteboard;