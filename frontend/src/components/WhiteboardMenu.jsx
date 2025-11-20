import React, { useState, useRef, useEffect } from 'react';

const WhiteboardMenu = ({ 
  onSave, 
  onClear, 
  onUndo, 
  onRedo, 
  onZoomIn, 
  onZoomOut, 
  onExport,
  onShare,
  onLock,
  onUnlock,
  isLocked,
  isOwner,
  activeUsers = [],
  currentUser,
  onLogout
}) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus = {
    File: [
      { label: 'Save Board', shortcut: 'Ctrl+S', action: onSave },
      { label: 'Export as PNG', action: () => onExport('png') },
      { label: 'Export as JPEG', action: () => onExport('jpeg') },
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
        {/* Menu Items */}
        <div className="flex items-center space-x-1 flex-wrap">
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

        {/* Right side - Active Users and User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Active Users Button */}
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition-colors"
            title="View Active Users"
          >
            <div className="flex items-center -space-x-2">
              {activeUsers.slice(0, 3).map((user, idx) => (
                <div
                  key={user.id}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-medium border-2 border-white"
                  title={user.username}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
              {activeUsers.length > 3 && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] sm:text-xs font-medium border-2 border-white">
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm text-gray-600">{activeUsers.length}</span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition-colors">
            <span className="text-xs sm:text-sm font-medium text-gray-700 max-w-[80px] sm:max-w-none truncate">{currentUser?.username}</span>
            <button
              onClick={onLogout}
              className="text-gray-600 hover:text-red-600 transition-colors"
              title="Logout"
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Active Users ({activeUsers.length})</h3>
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
              {activeUsers.length === 0 ? (
                <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm sm:text-base">No active users</p>
                </div>
              ) : (
                <div className="px-2 sm:px-4 py-3">
                  {activeUsers.map((user) => (
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
                          {user.id === currentUser?.id ? 'You' : 'Collaborator'}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Online"></div>
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
