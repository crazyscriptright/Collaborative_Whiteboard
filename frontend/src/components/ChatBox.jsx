import React, { useState, useEffect, useRef } from 'react';
import { boardAPI } from '../services/api';
import socketService from '../services/socket';

const ChatBox = ({ board, user, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const emojis = ['😀', '😂', '❤️', '👍', '👎', '🎉', '🔥', '✨', '💯', '👏', '🙌', '🤝', '💪', '🎨', '🖌️', '✏️', '📝', '💡', '🚀'];

  // Load messages when board changes
  useEffect(() => {
    if (board?._id && isOpen) {
      loadMessages();
    }
  }, [board?._id, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (data) => {
      setMessages(prev => [...prev, data.message]);
    };

    const handleUserTyping = (data) => {
      if (data.userId === user?.id) return;

      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.username) ? prev : [...prev, data.username];
        } else {
          return prev.filter(username => username !== data.username);
        }
      });

      // Clear typing status after 3 seconds
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(username => username !== data.username));
        }, 3000);
      }
    };

    socketService.on('new-message', handleNewMessage);
    socketService.on('user-typing', handleUserTyping);

    return () => {
      socketService.off('new-message', handleNewMessage);
      socketService.off('user-typing', handleUserTyping);
    };
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await boardAPI.getBoardMessages(board._id);
      
      if (response.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !board?._id) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    
    // Stop typing indicator
    handleStopTyping();

    try {
      // Send via socket for real-time delivery
      socketService.sendMessage(board._id, messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Fallback to API if socket fails
      try {
        await boardAPI.sendMessage(board._id, { content: messageContent });
      } catch (apiError) {
        console.error('Failed to send message via API:', apiError);
      }
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      handleStartTyping();
    } else if (isTyping && !e.target.value.trim()) {
      handleStopTyping();
    }
  };

  const handleStartTyping = () => {
    if (!board?._id || isTyping) return;
    
    setIsTyping(true);
    socketService.startTyping(board._id);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (!board?._id || !isTyping) return;
    
    setIsTyping(false);
    socketService.stopTyping(board._id);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (message, index) => {
    if (index === 0) return true;
    
    const currentDate = new Date(message.createdAt).toDateString();
    const previousDate = new Date(messages[index - 1].createdAt).toDateString();
    
    return currentDate !== previousDate;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full md:top-5 md:right-5 md:w-96 md:h-[600px] md:max-h-[calc(100vh-40px)] md:left-auto bg-white md:rounded-xl shadow-xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-900">Team Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 h-full flex items-center justify-center">
            <div>
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={message._id || index}>
                {shouldShowDateSeparator(message, index) && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                )}
                
                <div className={`flex ${message.sender._id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender._id === user?.id
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.sender._id !== user?.id && (
                      <div className="text-xs font-semibold mb-1 text-gray-600">
                        {message.senderUsername}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.sender._id === user?.id ? 'text-amber-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  setNewMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                  inputRef.current?.focus();
                }}
                className="text-xl hover:bg-gray-200 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-500 hover:text-amber-600 transition-colors p-2"
            title="Add emoji"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors duration-200 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;