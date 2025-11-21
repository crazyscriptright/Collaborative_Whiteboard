import React, { useState, useRef, useEffect } from 'react';

const WhiteboardMenu = ({ 
  onSave, 
  onClear, 
  onUndo, 
  onRedo, 
  onZoomIn, 
  onZoomOut, 
  onExport,
  onImport,
  onShare,
  onLock,
  onUnlock,
  onOpenBoardList,
  isLocked,
  isOwner,
  activeUsers = [],
  collaborators = [],
  notifications = [],
  currentUser,
  onLogout,
  syncStatus = 'synced', // 'synced', 'syncing', 'error'
  boardTitle,
  onRename
}) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = () => {
    if (isOwner) {
      setTempTitle(boardTitle || 'Untitled Board');
      setIsEditingTitle(true);
    }
  };

  const handleTitleSubmit = () => {
    if (tempTitle.trim() && tempTitle !== boardTitle) {
      onRename(tempTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  // Merge active users and collaborators
  const getAllUsers = () => {
    const allUsers = new Map();
    
    // Add collaborators first (offline by default)
    collaborators.forEach(c => {
      if (c.user) {
        allUsers.set(c.user._id, {
          id: c.user._id,
          username: c.user.username,
          avatar: c.user.avatar,
          role: c.role,
          status: 'offline'
        });
      }
    });

    // Update with active users (online)
    activeUsers.forEach(u => {
      const existing = allUsers.get(u.id);
      if (existing) {
        allUsers.set(u.id, { ...existing, status: 'online' });
      } else {
        // User is active but not in collaborators list (e.g. owner or public access)
        allUsers.set(u.id, {
          id: u.id,
          username: u.username,
          avatar: u.avatar,
          role: 'viewer', // Default assumption
          status: 'online'
        });
      }
    });

    // If a collaborator is not online, mark as 'waiting' if they were recently added?
    // For now, let's just use 'offline' vs 'online'. 
    // The user asked for "waiting for confirm". 
    // We can assume if they are in collaborators but not online, they are "waiting" or "offline".
    // Let's use "waiting" for anyone not online.
    
    return Array.from(allUsers.values()).map(u => ({
      ...u,
      status: u.status === 'online' ? 'online' : 'waiting'
    }));
  };

  const userList = getAllUsers();
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const menus = {
    File: [
      { label: 'New Board', action: () => {
        // Clear last board URL and create new board
        if (window.localStorage) {
          window.localStorage.removeItem('whiteboard_last_board_url');
        }
        window.location.href = '/whiteboard';
      }},
      { label: 'My Boards', action: onOpenBoardList },
      { label: 'Save Board', shortcut: 'Ctrl+S', action: onSave },
      { label: 'Export as PNG', action: () => onExport('png') },
      { label: 'Export as JPEG', action: () => onExport('jpeg') },
      { label: 'Export as JSON', action: () => onExport('json') },
      { label: 'Import JSON', action: onImport },
      { label: 'Invite Collaborator', action: onShare },
      ...(isOwner ? [
        { label: isLocked ? 'Unlock Board' : 'Lock Board', action: isLocked ? onUnlock : onLock }
      ] : [])
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: onUndo },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: onRedo },
      { label: 'Clear Board', action: onClear, className: 'text-red-600' },
    ],
    View: [
      { label: 'Zoom In', shortcut: 'Ctrl +', action: onZoomIn },
      { label: 'Zoom Out', shortcut: 'Ctrl -', action: onZoomOut },
      { label: 'Reset Zoom', action: () => {} },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', action: () => alert('Shortcuts:\nP: Pen\nE: Eraser\nT: Text\nR: Rectangle\nC: Circle\nL: Line\nCtrl+Z: Undo\nCtrl+Y: Redo\nCtrl+S: Save') },
    ]
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between bg-white border-b border-gray-200 px-2 sm:px-4 py-1 gap-2" ref={menuRef}>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Title Section */}
          <div className="min-w-[150px]">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="px-2 py-1 text-sm font-medium text-gray-900 border border-amber-500 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
              />
            ) : (
              <h1 
                onClick={handleTitleClick}
                className={`text-sm sm:text-base font-semibold text-gray-800 px-2 py-1 rounded truncate max-w-[200px] ${isOwner ? 'hover:bg-gray-100 cursor-pointer border border-transparent hover:border-gray-300' : ''}`}
                title={isOwner ? "Click to rename" : boardTitle}
              >
                {boardTitle || 'Untitled Board'}
              </h1>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex items-center space-x-1 flex-wrap border-l border-gray-200 pl-2 sm:pl-4">
            {Object.entries(menus).map(([name, items]) => (
              <div key={name} className="relative">
                <button
                  className={`px-2 sm:px-3 py-1 rounded hover:bg-gray-100 text-xs sm:text-sm font-medium transition-colors ${activeMenu === name ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                  onClick={() => setActiveMenu(activeMenu === name ? null : name)}
                >
                  {name}
                </button>
                {activeMenu === name && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {items.map((item, index) => (
                      <button
                        key={index}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between items-center ${item.className || 'text-gray-700'}`}
                        onClick={() => {
                          item.action && item.action();
                          setActiveMenu(null);
                        }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && <span className="text-gray-400 text-xs">{item.shortcut}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Active Users and User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
          {/* Sync Status */}
          <div className="flex items-center text-gray-500" title={
            syncStatus === 'synced' ? 'Saved to cloud' : 
            syncStatus === 'syncing' ? 'Saving...' : 'Offline / Not Saved'
          }>
            {syncStatus === 'syncing' && (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {syncStatus === 'synced' && (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {syncStatus === 'error' && (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 text-gray-600 relative"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed sm:absolute top-14 sm:top-full right-2 sm:right-0 sm:mt-2 w-[calc(100vw-16px)] max-w-sm sm:w-80 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notification, idx) => (
                      <div 
                        key={idx} 
                        className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${notification.read ? 'opacity-60' : ''}`}
                        onClick={() => {
                          if (notification.boardId) {
                            window.location.href = `/whiteboard/${notification.boardId}`;
                          }
                        }}
                      >
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Users Button */}
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            title="View Active Users"
          >
            <div className="flex items-center -space-x-1.5 sm:-space-x-2">
              {activeUsers.slice(0, 2).map((user, idx) => (
                <div
                  key={user.id}
                  className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] sm:text-xs font-medium border-2 border-white"
                  title={user.username}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
              {activeUsers.length > 2 && (
                <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gray-400 text-white flex items-center justify-center text-[9px] sm:text-xs font-medium border-2 border-white">
                  +{activeUsers.length - 2}
                </div>
              )}
            </div>
            <span className="text-[10px] sm:text-sm text-gray-600 font-medium">{activeUsers.length}</span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-700 max-w-[80px] sm:max-w-none truncate">{currentUser?.username}</span>
            <button
              onClick={onLogout}
              className="text-gray-600 hover:text-red-600 transition-colors p-0.5"
              title={`Logout${currentUser?.username ? ' (' + currentUser.username + ')' : ''}`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Active Users Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={() => setShowUserModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Collaborators ({userList.length})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    onShare();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  title="Invite Collaborator"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span className="hidden sm:inline">Invite</span>
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[65vh]">
              {userList.length === 0 ? (
                <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm sm:text-base">No collaborators yet</p>
                </div>
              ) : (
                <div className="px-2 sm:px-4 py-3">
                  {userList.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-medium text-sm sm:text-base">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span>{user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{user.username}</p>
                        <p className="text-xs text-gray-500">
                          {user.id === currentUser?.id ? 'You' : user.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.status === 'online' ? 'Online' : 'Waiting for confirm'}
                        </span>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} title={user.status === 'online' ? 'Online' : 'Waiting for confirm'}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WhiteboardMenu;
