import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardAPI } from '../services/api';
import { format } from 'date-fns';
import { removeLastBoardUrl } from '../utils/jwt';

const BoardList = ({ onClose, onSelectBoard, onBoardDeleted, currentBoardId }) => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async (retryCount = 0, page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Fetch only 20 most recent boards for faster loading
      const response = await boardAPI.getUserBoards({ 
        limit: 20, 
        page: page,
        sortBy: 'lastModified', 
        sortOrder: 'desc' 
      });
      
      if (response.success) {
        if (append) {
          setBoards(prev => [...prev, ...response.data.boards]);
        } else {
          setBoards(response.data.boards);
        }
        
        // Check if there are more boards to load
        const totalPages = response.data.pagination?.pages || 1;
        setHasMore(page < totalPages);
        setCurrentPage(page);
        setError(null);
      } else {
        setError('Failed to load boards');
      }
    } catch (err) {
      console.error('Fetch boards error:', err);
      
      // Retry once on timeout or network error
      if (retryCount === 0 && (err.code === 'ECONNABORTED' || err.message.includes('timeout') || err.message.includes('network'))) {
        console.log('Retrying fetch boards...');
        return fetchBoards(1, page, append);
      }
      
      setError(
        err.code === 'ECONNABORTED' || err.message.includes('timeout')
          ? 'Request timed out. Please check your connection.' 
          : 'Error loading boards. Please check your connection.'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const response = await boardAPI.createBoard({ title: newBoardTitle });
      if (response.success) {
        const newBoard = response.data.board;
        setNewBoardTitle('');
        fetchBoards(); // Refresh list
        if (onSelectBoard) {
          onSelectBoard(newBoard._id);
        } else {
          navigate(`/whiteboard/${newBoard._id}`);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Error creating board:', err);
      setError('Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleBoardClick = (boardId) => {
    if (onSelectBoard) {
      onSelectBoard(boardId);
    } else {
      navigate(`/whiteboard/${boardId}`);
    }
    if (onClose) onClose();
  };

  const handleDeleteBoard = async (e, boardId, boardTitle) => {
    e.stopPropagation(); // Prevent board click
    
    if (!window.confirm(`Are you sure you want to delete "${boardTitle}"?`)) {
      return;
    }
    
    try {
      setDeletingBoardId(boardId);
      const response = await boardAPI.deleteBoard(boardId);
      if (response.success) {
        // Remove from list
        setBoards(boards.filter(b => b._id !== boardId));
        
        // Notify parent if current board was deleted
        if (currentBoardId === boardId) {
          // Clear last board URL to prevent loading deleted board
          removeLastBoardUrl();
          if (onBoardDeleted) {
            onBoardDeleted(boardId);
          }
        }
      } else {
        setError('Failed to delete board');
      }
    } catch (err) {
      console.error('Error deleting board:', err);
      setError('Failed to delete board');
    } finally {
      setDeletingBoardId(null);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchBoards(0, currentPage + 1, true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto flex flex-col max-h-[80vh]">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h2 className="text-xl font-semibold text-gray-800">My Boards</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b bg-gray-50">
        <form onSubmit={handleCreateBoard} className="flex gap-2">
          <input
            type="text"
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            placeholder="New board name (optional)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? 'Creating...' : 'Create New'}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={() => fetchBoards()}
              className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No boards found. Create one to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {boards.map((board) => (
              <div
                key={board._id}
                onClick={() => handleBoardClick(board._id)}
                className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-colors group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 group-hover:text-amber-600 truncate max-w-[200px]">
                      {board.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Last modified: {format(new Date(board.lastModified), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {board.isPublic && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                        Public
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteBoard(e, board._id, board.title)}
                      disabled={deletingBoardId === board._id}
                      className="p-1.5 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-50"
                      title="Delete board"
                    >
                      {deletingBoardId === board._id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Load More Button */}
        {!loading && !error && boards.length > 0 && hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardList;
