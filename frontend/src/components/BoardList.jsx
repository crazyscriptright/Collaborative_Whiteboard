import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardAPI } from '../services/api';
import { format } from 'date-fns';

const BoardList = ({ onClose, onSelectBoard }) => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await boardAPI.getUserBoards({ limit: 50, sortBy: 'lastModified', sortOrder: 'desc' });
      if (response.success) {
        setBoards(response.data.boards);
      } else {
        setError('Failed to load boards');
      }
    } catch (err) {
      setError('Error loading boards');
      console.error(err);
    } finally {
      setLoading(false);
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
          <div className="text-red-500 text-center py-4">{error}</div>
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
                className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-amber-600 truncate max-w-[200px]">
                      {board.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Last modified: {format(new Date(board.lastModified), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  {board.isPublic && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                      Public
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardList;
