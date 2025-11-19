import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import socketService from '../services/socket';

const CanvasBoard = forwardRef(({
  board,
  selectedTool,
  toolSettings,
  activeUsers
}, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [elements, setElements] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearBoard: () => {
      setElements([]);
      clearCanvas();
      if (board?._id) {
        socketService.clearBoard(board._id);
      }
    },
    getElements: () => elements,
    addElement: (element) => {
      setElements(prev => [...prev, element]);
    }
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      setCanvasSize({ width: rect.width, height: rect.height });
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Load board elements
  useEffect(() => {
    if (board?.elements) {
      setElements(board.elements);
    }
  }, [board]);

  // Redraw canvas when elements change
  useEffect(() => {
    redrawCanvas();
  }, [elements, canvasSize]);

  // Socket event listeners
  useEffect(() => {
    const handleDrawing = (data) => {
      setElements(prev => [...prev, data.element]);
    };

    const handleDrawingUpdate = (data) => {
      // Handle real-time drawing updates (for pen tool)
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      drawElement(ctx, data.element);
    };

    const handleElementDeleted = (data) => {
      setElements(prev => prev.filter(el => el.clientId !== data.elementId));
    };

    const handleBoardCleared = () => {
      setElements([]);
      clearCanvas();
    };

    socketService.on('drawing', handleDrawing);
    socketService.on('drawing-update', handleDrawingUpdate);
    socketService.on('element-deleted', handleElementDeleted);
    socketService.on('board-cleared', handleBoardCleared);

    return () => {
      socketService.off('drawing', handleDrawing);
      socketService.off('drawing-update', handleDrawingUpdate);
      socketService.off('element-deleted', handleElementDeleted);
      socketService.off('board-cleared', handleBoardCleared);
    };
  }, []);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const startDrawing = (pos) => {
    setIsDrawing(true);
    
    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPath([pos]);
    } else {
      setCurrentPath([pos, pos]);
    }
  };

  const draw = (pos) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (selectedTool === 'pen') {
      const newPath = [...currentPath, pos];
      setCurrentPath(newPath);
      
      // Draw current stroke
      ctx.strokeStyle = toolSettings.color;
      ctx.lineWidth = toolSettings.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (newPath.length > 1) {
        ctx.beginPath();
        ctx.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      // Send real-time update
      if (board?._id) {
        socketService.sendDrawingUpdate(board._id, {
          type: 'freehand',
          coordinates: newPath,
          style: toolSettings
        });
      }
    } else if (selectedTool === 'eraser') {
      const newPath = [...currentPath, pos];
      setCurrentPath(newPath);
      
      // Erase by drawing with composite operation
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = toolSettings.strokeWidth * 2;
      ctx.lineCap = 'round';
      
      if (newPath.length > 1) {
        ctx.beginPath();
        ctx.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Update end position for shapes
      setCurrentPath([currentPath[0], pos]);
      
      // Redraw canvas with preview
      redrawCanvas();
      drawPreview(ctx, currentPath[0], pos);
    }

    // Send cursor position
    if (board?._id) {
      socketService.sendCursorMove(board._id, pos);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || currentPath.length === 0) return;

    setIsDrawing(false);

    const element = createElementFromPath();
    if (element) {
      setElements(prev => [...prev, element]);
      
      // Send to other users
      if (board?._id) {
        socketService.sendDrawing(board._id, {
          ...element,
          persist: true
        });
      }
    }

    setCurrentPath([]);
  };

  const createElementFromPath = () => {
    if (currentPath.length === 0) return null;

    const baseElement = {
      clientId: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Client-side ID for tracking
      timestamp: new Date(),
      style: { ...toolSettings }
    };

    switch (selectedTool) {
      case 'pen':
        return {
          ...baseElement,
          type: 'freehand',
          coordinates: currentPath
        };
      
      case 'line':
        if (currentPath.length >= 2) {
          return {
            ...baseElement,
            type: 'line',
            coordinates: {
              start: currentPath[0],
              end: currentPath[1]
            }
          };
        }
        break;
      
      case 'rectangle':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          return {
            ...baseElement,
            type: 'rectangle',
            coordinates: {
              x: Math.min(start.x, end.x),
              y: Math.min(start.y, end.y),
              width: Math.abs(end.x - start.x),
              height: Math.abs(end.y - start.y)
            }
          };
        }
        break;
      
      case 'circle':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );
          return {
            ...baseElement,
            type: 'circle',
            coordinates: {
              center: start,
              radius
            }
          };
        }
        break;
      
      default:
        return null;
    }
    
    return null;
  };

  const drawPreview = (ctx, start, end) => {
    ctx.strokeStyle = toolSettings.color;
    ctx.fillStyle = toolSettings.fill;
    ctx.lineWidth = toolSettings.strokeWidth;
    ctx.setLineDash([5, 5]);

    switch (selectedTool) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      
      case 'rectangle':
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.beginPath();
        ctx.rect(start.x, start.y, width, height);
        if (toolSettings.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
      
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        if (toolSettings.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
    }

    ctx.setLineDash([]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    clearCanvas();

    elements.forEach(element => {
      drawElement(ctx, element);
    });
  };

  const drawElement = (ctx, element) => {
    const style = element.style || {};
    ctx.strokeStyle = style.color || '#000000';
    ctx.fillStyle = style.fill || 'transparent';
    ctx.lineWidth = style.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'freehand':
        if (element.coordinates && element.coordinates.length > 1) {
          ctx.beginPath();
          ctx.moveTo(element.coordinates[0].x, element.coordinates[0].y);
          for (let i = 1; i < element.coordinates.length; i++) {
            ctx.lineTo(element.coordinates[i].x, element.coordinates[i].y);
          }
          ctx.stroke();
        }
        break;
      
      case 'line':
        const { start, end } = element.coordinates;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      
      case 'rectangle':
        const { x, y, width, height } = element.coordinates;
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        if (style.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
      
      case 'circle':
        const { center, radius } = element.coordinates;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        if (style.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
    }
  };

  // Mouse events
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    startDrawing(pos);
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    draw(pos);
  };

  const handleMouseUp = () => {
    stopDrawing();
  };

  // Touch events
  const handleTouchStart = (e) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    startDrawing(pos);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    draw(pos);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  const canvasStyle = {
    display: 'block',
    cursor: selectedTool === 'eraser' ? 'crosshair' : 
            selectedTool === 'pen' ? 'crosshair' :
            selectedTool === 'text' ? 'text' : 'crosshair',
    touchAction: 'none',
    width: '100%',
    height: '100%'
  };

  return (
    <canvas
      ref={canvasRef}
      style={canvasStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;