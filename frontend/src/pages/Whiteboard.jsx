import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAuthenticated, getUser, clearAuth } from '../utils/jwt';
import { boardAPI, authAPI } from '../services/api';
import socketService from '../services/socket';
import Background from '../components/Background';
import CanvasBoard from '../components/CanvasBoard';
import Toolbar from '../components/Toolbar';
import ChatBox from '../components/ChatBox';

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
      if (socketService.getCurrentBoard()) {
        socketService.leaveBoard();
      }
    };
  }, [boardId, navigate]);

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
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
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
      <div className="whiteboard-container">
        {/* Header */}
        <header className="whiteboard-header">
          <div className="header-left">
            <h1 className="board-title">{board?.title || 'Whiteboard'}</h1>
            <div className="active-users">
              {activeUsers.slice(0, 5).map(user => (
                <div key={user.id} className="user-avatar" title={user.username}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
              {activeUsers.length > 5 && (
                <div className="user-count">+{activeUsers.length - 5}</div>
              )}
            </div>
          </div>
          
          <div className="header-right">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`chat-toggle ${isChatOpen ? 'active' : ''}`}
              title="Toggle Chat"
            >
              💬
            </button>
            <button onClick={handleBoardSave} className="save-button" title="Save Board">
              💾
            </button>
            <div className="user-menu">
              <span>{user?.username}</span>
              <button onClick={handleLogout} className="logout-button" title="Logout">
                🚪
              </button>
            </div>
          </div>
        </header>

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
        </div>

        {/* Notifications */}
        <div className="notifications">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification ${notification.type}`}
              onClick={() => removeNotification(notification.id)}
            >
              <span>{notification.message}</span>
              <button className="notification-close">×</button>
            </div>
          ))}
        </div>
      </div>
    </Background>
  );
};

export default Whiteboard;