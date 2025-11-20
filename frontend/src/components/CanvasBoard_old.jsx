import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import socketService from '../services/socket';

const CanvasBoard = forwardRef(({
  board,
  selectedTool,
  toolSettings,
  activeUsers
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [elements, setElements] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [cursors, setCursors] = useState({});
  const [smoothedCursors, setSmoothedCursors] = useState({});
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const fileInputRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearBoard: () => {
      setElements([]);
      setRedoStack([]);
      clearCanvas();
      if (board?._id) {
        socketService.clearBoard(board._id);
      }
    },
    getElements: () => elements,
    addElement: (element) => {
      setElements(prev => [...prev, element]);
      setRedoStack([]);
    },
    toggleGrid: () => setShowGrid(prev => !prev),
    getShowGrid: () => showGrid,
    zoomIn: () => setZoom(prev => Math.min(prev + 0.1, 3)),
    zoomOut: () => setZoom(prev => Math.max(prev - 0.1, 0.3)),
    resetZoom: () => { setZoom(1); setPan({ x: 0, y: 0 }); },
    triggerImageUpload: () => fileInputRef.current?.click(),
    undo: () => {
      setElements(prev => {
        if (prev.length === 0) return prev;
        const newElements = [...prev];
        const removed = newElements.pop();
        setRedoStack(stack => [...stack, removed]);
        // Note: For collaborative undo, we would need to send an event to remove this specific element ID
        return newElements;
      });
    },
    redo: () => {
      setRedoStack(prev => {
        if (prev.length === 0) return prev;
        const newStack = [...prev];
        const restored = newStack.pop();
        setElements(els => [...els, restored]);
        // Note: For collaborative redo, we would need to send an event to add this element back
        return newStack;
      });
    },
    exportImage: (format = 'png') => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Create a temporary canvas to draw white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Fill white background
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw original canvas over it
      tempCtx.drawImage(canvas, 0, 0);
      
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.${format}`;
      link.href = tempCanvas.toDataURL(`image/${format}`);
      link.click();
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

    const handleCursorMove = (data) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: {
          x: data.x,
          y: data.y,
          username: data.username,
          color: data.color
        }
      }));
    };

    socketService.on('drawing', handleDrawing);
    socketService.on('drawing-update', handleDrawingUpdate);
    socketService.on('element-deleted', handleElementDeleted);
    socketService.on('board-cleared', handleBoardCleared);
    socketService.on('cursor-move', handleCursorMove);

    return () => {
      socketService.off('drawing', handleDrawing);
      socketService.off('drawing-update', handleDrawingUpdate);
      socketService.off('element-deleted', handleElementDeleted);
      socketService.off('board-cleared', handleBoardCleared);
      socketService.off('cursor-move', handleCursorMove);
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
      setRedoStack([]); // Clear redo stack
      
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

      case 'triangle':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          return {
            ...baseElement,
            type: 'triangle',
            coordinates: { start, end }
          };
        }
        break;

      case 'diamond':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          return {
            ...baseElement,
            type: 'diamond',
            coordinates: { start, end }
          };
        }
        break;

      case 'arrow':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          return {
            ...baseElement,
            type: 'arrow',
            coordinates: { start, end }
          };
        }
        break;
      
      case 'star':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );
          return {
            ...baseElement,
            type: 'star',
            coordinates: { center: start, radius }
          };
        }
        break;

      case 'hexagon':
        if (currentPath.length >= 2) {
          const [start, end] = currentPath;
          const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );
          return {
            ...baseElement,
            type: 'hexagon',
            coordinates: { center: start, radius }
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

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(start.x + (end.x - start.x) / 2, start.y);
        ctx.lineTo(start.x, end.y);
        ctx.lineTo(end.x, end.y);
        ctx.closePath();
        if (toolSettings.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'diamond':
        const midX = start.x + (end.x - start.x) / 2;
        const midY = start.y + (end.y - start.y) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, start.y);
        ctx.lineTo(end.x, midY);
        ctx.lineTo(midX, end.y);
        ctx.lineTo(start.x, midY);
        ctx.closePath();
        if (toolSettings.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'arrow':
        const headLength = 20;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      case 'star':
        const starRadius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        drawStar(ctx, start.x, start.y, 5, starRadius, starRadius / 2);
        if (toolSettings.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'hexagon':
        const hexRadius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        drawPolygon(ctx, start.x, start.y, 6, hexRadius);
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

      case 'triangle':
        const { start: tStart, end: tEnd } = element.coordinates;
        ctx.beginPath();
        ctx.moveTo(tStart.x + (tEnd.x - tStart.x) / 2, tStart.y);
        ctx.lineTo(tStart.x, tEnd.y);
        ctx.lineTo(tEnd.x, tEnd.y);
        ctx.closePath();
        if (style.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'diamond':
        const { start: dStart, end: dEnd } = element.coordinates;
        const dMidX = dStart.x + (dEnd.x - dStart.x) / 2;
        const dMidY = dStart.y + (dEnd.y - dStart.y) / 2;
        ctx.beginPath();
        ctx.moveTo(dMidX, dStart.y);
        ctx.lineTo(dEnd.x, dMidY);
        ctx.lineTo(dMidX, dEnd.y);
        ctx.lineTo(dStart.x, dMidY);
        ctx.closePath();
        if (style.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'arrow':
        const { start: aStart, end: aEnd } = element.coordinates;
        const headLength = 20;
        const angle = Math.atan2(aEnd.y - aStart.y, aEnd.x - aStart.x);
        ctx.beginPath();
        ctx.moveTo(aStart.x, aStart.y);
        ctx.lineTo(aEnd.x, aEnd.y);
        ctx.lineTo(aEnd.x - headLength * Math.cos(angle - Math.PI / 6), aEnd.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(aEnd.x, aEnd.y);
        ctx.lineTo(aEnd.x - headLength * Math.cos(angle + Math.PI / 6), aEnd.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;

      case 'star':
        const { center: sCenter, radius: sRadius } = element.coordinates;
        drawStar(ctx, sCenter.x, sCenter.y, 5, sRadius, sRadius / 2);
        if (style.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'hexagon':
        const { center: hCenter, radius: hRadius } = element.coordinates;
        drawPolygon(ctx, hCenter.x, hCenter.y, 6, hRadius);
        if (style.fill !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;
    }
  };

  const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  const drawPolygon = (ctx, x, y, sides, radius) => {
    if (sides < 3) return;
    const a = (Math.PI * 2) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      ctx.lineTo(x + radius * Math.cos(a * i), y + radius * Math.sin(a * i));
    }
    ctx.closePath();
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
    <div className="relative w-full h-full overflow-hidden">
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
      {/* Render Cursors */}
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute pointer-events-none flex flex-col items-start z-50 transition-all duration-75 ease-linear"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)'
          }}
        >
          <svg
            className="w-4 h-4 drop-shadow-md"
            viewBox="0 0 24 24"
            fill={cursor.color || '#f59e0b'}
            stroke="white"
            strokeWidth="2"
          >
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
          <span 
            className="px-2 py-0.5 text-xs text-white rounded-full shadow-sm whitespace-nowrap ml-4 -mt-2"
            style={{ backgroundColor: cursor.color || '#f59e0b' }}
          >
            {cursor.username}
          </span>
        </div>
      ))}
    </div>
  );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;