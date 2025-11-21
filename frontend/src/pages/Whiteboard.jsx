import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAuthenticated, getUser, clearAuth, saveLastBoardUrl, getLastBoardUrl } from '../utils/jwt';
import { boardAPI, authAPI, notificationAPI } from '../services/api';
import socketService from '../services/socket';
import Background from '../components/Background';
import CanvasBoard from '../components/CanvasBoard';
import Toolbar from '../components/Toolbar';
import ChatBox from '../components/ChatBox';
import WhiteboardMenu from '../components/WhiteboardMenu';
import BoardList from '../components/BoardList';

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
  const [syncStatus, setSyncStatus] = useState('synced');
  const [bellNotifications, setBellNotifications] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [isBoardListOpen, setIsBoardListOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const canvasRef = useRef(null);
  const jsonInputRef = useRef(null);
  const hasShownConnectedRef = useRef(false);
  const lastNotificationTimeRef = useRef({});
  const isCreatingBoardRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      if (response.success) {
        const formattedNotifications = response.data.notifications.map(n => ({
          id: n._id,
          message: n.message,
          timestamp: n.createdAt,
          read: n.read,
          boardId: n.boardId?._id || n.boardId,
          type: n.type
        }));
        setBellNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Initialize
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const currentUser = getUser();
    setUser(currentUser);
    
    // Fetch notifications
    fetchNotifications();
    
    // Reset the connected notification flag when board changes
    hasShownConnectedRef.current = false;
    
    // Reset error state when boardId changes
    setError(null);
    
    // If no boardId, check for last visited board or create new
    if (!boardId) {
      const lastBoardUrl = getLastBoardUrl();
      if (lastBoardUrl) {
        navigate(lastBoardUrl);
      } else {
        createNewBoard();
      }
    } else {
      loadBoard(boardId);
      saveLastBoardUrl(boardId);
    }

    // Set up socket event listeners
    setupSocketListeners();

    // Fetch notifications
    fetchNotifications();

    // Cleanup
    return () => {
      // Remove all socket listeners
      socketService.off('board-joined');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('active-users');
      socketService.off('connection-lost');
      socketService.off('socket-error');
      socketService.off('invite-received');
      socketService.off('new-message');
      socketService.off('collaborator-added');
      socketService.off('reconnect');
      
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
    if (canvasRef.current) {
      if (format === 'json') {
        canvasRef.current.exportJSON();
        addNotification('Exporting as JSON...', 'success');
      } else {
        canvasRef.current.exportImage(format);
        addNotification(`Exporting as ${format.toUpperCase()}...`, 'success');
      }
    }
  };

  const handleImportClick = () => {
    jsonInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file && canvasRef.current) {
      canvasRef.current.importJSON(file);
      addNotification('Importing board...', 'success');
    }
    e.target.value = null;
  };

  const createNewBoard = async () => {
    if (isCreatingBoardRef.current) {
      return; // Prevent double creation
    }
    
    try {
      isCreatingBoardRef.current = true;
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
    } finally {
      isCreatingBoardRef.current = false;
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
    socketService.off('invite-received');
    socketService.off('new-message');
    socketService.off('collaborator-added');
    socketService.off('reconnect');

    // Board events
    socketService.on('board-joined', (data) => {
      // Only show notification once per board session
      if (!hasShownConnectedRef.current) {
        addNotification('Connected to board', 'success');
        hasShownConnectedRef.current = true;
      }
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

    socketService.on('new-message', (data) => {
      // Don't notify if it's our own message
      if (data.message.sender._id === user?.id || data.message.sender === user?.id) {
        return;
      }
      
      // Only show notification if chat is closed
      if (!isChatOpen) {
        setUnreadMessageCount(prev => prev + 1);
        addNotification(`New message from ${data.message.senderUsername || data.senderUsername}`, 'info', () => {
          setIsChatOpen(true);
          setUnreadMessageCount(0);
        });
      } else {
        // Chat is open, just increment count silently
        setUnreadMessageCount(prev => prev + 1);
      }
    });

    socketService.on('invite-received', (data) => {
      const message = `${data.sender} invited you to board "${data.boardTitle || 'Untitled'}"`;
      
      addNotification(message, 'info', () => {
        navigate(`/whiteboard/${data.boardId}`);
      });

      setBellNotifications(prev => {
        // Prevent duplicates (check if same message received within last 2 seconds)
        const isDuplicate = prev.some(n => 
          n.message === message && 
          (Date.now() - new Date(n.timestamp || Date.now()).getTime() < 2000)
        );
        
        if (isDuplicate) return prev;

        return [{
          id: data._id || Date.now(),
          message,
          timestamp: data.timestamp || new Date(),
          read: false,
          boardId: data.boardId
        }, ...prev];
      });
    });

    socketService.on('collaborator-added', (data) => {
      // Update board collaborators in real-time
      if (data.boardId === boardId) {
        setBoard(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            collaborators: data.collaborators
          };
        });
        addNotification(`${data.collaborator.username} was added as a collaborator`, 'info');
      }
    });

    // Connection events
    socketService.on('connection-lost', () => {
      addNotification('Connection lost. Trying to reconnect...', 'warning');
      setSyncStatus('error');
    });

    socketService.on('socket-error', (error) => {
      addNotification(error.message || 'Connection error', 'error');
      setSyncStatus('error');
    });
    
    socketService.on('reconnect', () => {
        setSyncStatus('synced');
        addNotification('Reconnected', 'success');
    });
  };

  const handleBoardChange = () => {
      setSyncStatus('syncing');
      // Simulate save delay or wait for ack if implemented
      setTimeout(() => {
          setSyncStatus('synced');
      }, 500);
  };

  const addNotification = (message, type = 'info', action = null) => {
    // Check for duplicate notifications within 5 seconds
    const now = Date.now();
    const lastTime = lastNotificationTimeRef.current[message];
    
    if (lastTime && now - lastTime < 5000) {
      return;
    }
    
    lastNotificationTimeRef.current[message] = now;

    const notificationId = Date.now() + Math.random(); // Ensure unique ID
    const notification = {
      id: notificationId,
      message,
      type,
      timestamp: new Date(),
      isExiting: false,
      action
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
        
        // Send socket notification if we can identify the user
        // The response.data.board.collaborators contains the new user
        // We need to find the user ID corresponding to the email we just added
        const newCollaborator = response.data.board.collaborators.find(c => 
          (c.user.email && c.user.email.toLowerCase() === shareEmail.toLowerCase()) || 
          (c.user.username && c.user.username.toLowerCase() === shareEmail.toLowerCase())
        );
        
        if (newCollaborator && newCollaborator.user._id) {
          socketService.sendInvite(newCollaborator.user._id, board._id, board.title);
          // Notify all board users about new collaborator
          if (socketService.isSocketConnected()) {
            socketService.socket.emit('collaborator-added', {
              boardId: board._id,
              collaboratorId: newCollaborator.user._id
            });
          }
        }

        setInviteLink(window.location.href);
        // Don't close modal immediately, show link
        // setIsShareModalOpen(false);
        // Update board state immediately
        setBoard(response.data.board);
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

  const handleRenameBoard = async (newTitle) => {
    if (!board?._id || !newTitle.trim()) return;
    
    try {
      const response = await boardAPI.updateBoard(board._id, { title: newTitle });
      if (response.success) {
        setBoard(prev => ({ ...prev, title: newTitle }));
        addNotification('Board renamed successfully', 'success');
      } else {
        addNotification('Failed to rename board', 'error');
      }
    } catch (error) {
      console.error('Rename board error:', error);
      addNotification('Failed to rename board', 'error');
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

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setBellNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setBellNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  if (isLoading) {
    return (
      <Background>
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 border-4 border-amber-100 rounded-full"></div>
            <div className="absolute w-24 h-24 border-4 border-amber-500 rounded-full animate-spin border-t-transparent"></div>
            <svg className="absolute w-10 h-10 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="mt-6 flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-3 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-3 h-3 bg-amber-500 rounded-full animate-bounce"></span>
          </div>
        </div>
      </Background>
    );
  }

  if (error) {
    return (
      <Background>
        <div className="flex flex-col items-center justify-center h-full w-full px-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              <button 
                onClick={() => navigate('/whiteboard', { replace: true })} 
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create New Board
              </button>
            </div>
          </div>
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
          onImport={handleImportClick}
          onShare={() => {
            setInviteLink('');
            setShareEmail('');
            setIsShareModalOpen(true);
          }}
          onLock={handleLockBoard}
          onUnlock={handleUnlockBoard}
          onOpenBoardList={() => setIsBoardListOpen(true)}
          isLocked={board?.isLocked || false}
          isOwner={board?.owner === user?.id || board?.owner?._id === user?.id}
          activeUsers={activeUsers}
          collaborators={board?.collaborators || []}
          notifications={bellNotifications}
          currentUser={user}
          onLogout={handleLogout}
          syncStatus={syncStatus}
          boardTitle={board?.title}
          onRename={handleRenameBoard}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
        
        {/* Board List Modal */}
        {isBoardListOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={(e) => {
            if (e.target === e.currentTarget) setIsBoardListOpen(false);
          }}>
            <BoardList 
              onClose={() => setIsBoardListOpen(false)}
              onSelectBoard={(id) => {
                setIsBoardListOpen(false);
                navigate(`/whiteboard/${id}`);
              }}
              currentBoardId={boardId}
              onBoardDeleted={(deletedId) => {
                setIsBoardListOpen(false);
                // Clear error state before navigation
                setError(null);
                setIsLoading(true);
                navigate('/whiteboard', { replace: true });
              }}
            />
          </div>
        )}

        <input 
            type="file" 
            ref={jsonInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleImportFile} 
        />

        {/* Main Content */}
        <div className="whiteboard-main flex-1 relative overflow-auto">
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
          <div className="canvas-container absolute inset-0 p-4 md:p-6 overflow-auto">
            <div className="w-full h-full border-4 border-amber-200 rounded-lg shadow-lg overflow-auto bg-white">
              <CanvasBoard
                ref={canvasRef}
                board={board}
                selectedTool={selectedTool}
                toolSettings={toolSettings}
                activeUsers={activeUsers}
                onBoardChange={handleBoardChange}
              />
            </div>
          </div>

          {/* Chat */}
          {isChatOpen && (
            <ChatBox
              board={board}
              user={user}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              onNewMessage={() => {
                // Reset unread count when chat is open and new message arrives
                if (isChatOpen) {
                  setUnreadMessageCount(0);
                }
              }}
            />
          )}

          {/* Floating Chat Toggle Button */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setUnreadMessageCount(0);
            }}
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
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </div>
              <span className="font-semibold text-gray-700">Messaging</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7-7" />
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
              } ${notification.action ? 'cursor-pointer hover:brightness-95' : ''}`}
              onClick={() => {
                if (notification.action) notification.action();
                removeNotification(notification.id);
              }}
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
                    {!inviteLink ? (
                      <>
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
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex gap-2">
                            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs sm:text-sm text-grey-800">
                              The user must have an account to collaborate on this board.
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-3 animate-bounce">
                            <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium text-amber-800">Invitation Sent!</h3>
                          <p className="text-sm text-amber-600 mt-1">
                            {shareEmail} has been invited to the board.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Share Link
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={inviteLink}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLink);
                                addNotification('Link copied to clipboard', 'success');
                              }}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                              title="Copy Link"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
                  <button 
                    type="button" 
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setIsShareModalOpen(false)}
                  >
                    {inviteLink ? 'Close' : 'Cancel'}
                  </button>
                  {!inviteLink && (
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
                  )}
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