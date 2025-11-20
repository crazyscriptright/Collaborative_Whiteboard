import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import socketService from '../services/socket';

const CanvasBoard = forwardRef(({
  board,
  selectedTool,
  toolSettings,
  activeUsers
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [elements, setElements] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  // Selection & interaction state
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  
  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // UI state
  const [showGrid, setShowGrid] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Cursor state with smoothing
  const [cursors, setCursors] = useState({});
  const smoothedCursorsRef = useRef({});

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clearBoard: () => {
      setElements([]);
      setRedoStack([]);
      clearCanvas();
      if (board?._id) socketService.clearBoard(board._id);
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
        return newElements;
      });
    },
    redo: () => {
      setRedoStack(prev => {
        if (prev.length === 0) return prev;
        const newStack = [...prev];
        const restored = newStack.pop();
        setElements(els => [...els, restored]);
        return newStack;
      });
    },
    exportImage: (format = 'png') => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
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
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = rect.width;
        overlayCanvasRef.current.height = rect.height;
      }
      
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    // Prevent browser zoom globally when using Ctrl+wheel
    const preventBrowserZoom = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('wheel', preventBrowserZoom, { passive: false });
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

  // Load board elements
  useEffect(() => {
    if (board?.elements) {
      setElements(board.elements);
    }
  }, [board]);

  // Redraw canvas when elements, zoom, or pan change
  useEffect(() => {
    redrawCanvas();
  }, [elements, canvasSize, zoom, pan, showGrid]);

  // Smooth cursor animation
  useEffect(() => {
    const animationFrame = requestAnimationFrame(function smoothCursors() {
      Object.keys(cursors).forEach(userId => {
        if (!smoothedCursorsRef.current[userId]) {
          smoothedCursorsRef.current[userId] = { ...cursors[userId] };
        } else {
          const current = smoothedCursorsRef.current[userId];
          const target = cursors[userId];
          
          // Lerp interpolation for smooth movement
          current.x += (target.x - current.x) * 0.3;
          current.y += (target.y - current.y) * 0.3;
          current.color = target.color;
          current.username = target.username;
        }
      });
      
      requestAnimationFrame(smoothCursors);
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [cursors]);

  // Socket event listeners
  useEffect(() => {
    const handleDrawing = (data) => {
      setElements(prev => [...prev, data.element]);
    };

    const handleDrawingUpdate = (data) => {
      // For real-time preview of other users' drawing
    };

    const handleElementDeleted = (data) => {
      setElements(prev => prev.filter(el => el.clientId !== data.elementId));
    };

    const handleBoardCleared = () => {
      setElements([]);
      setRedoStack([]);
      clearCanvas();
    };

    const handleCursorMove = (data) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: {
          x: data.cursor.x,
          y: data.cursor.y,
          username: data.username,
          color: data.cursor.color || '#f59e0b'
        }
      }));
      
      // Auto-remove cursor after 3 seconds of inactivity
      setTimeout(() => {
        setCursors(prev => {
          const updated = { ...prev };
          delete updated[data.userId];
          return updated;
        });
      }, 3000);
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

  // File upload handler (images and PDFs)
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else if (file.type === 'application/pdf') {
        handlePDFUpload(file);
      }
    });
  };

  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const element = {
          type: 'image',
          clientId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          coordinates: {
            x: 100,
            y: 100,
            width: img.width > 500 ? 500 : img.width,
            height: img.height > 500 ? (500 * img.height / img.width) : img.height
          },
          imageData: e.target.result,
          timestamp: new Date(),
          userId: board.owner,
          username: 'current user'
        };
        
        setElements(prev => [...prev, element]);
        if (board?._id) {
          socketService.sendDrawing(board._id, { ...element, persist: true });
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePDFUpload = async (file) => {
    // Note: For PDF preview, you'd need pdf.js library
    // This is a placeholder implementation
    console.log('PDF upload:', file.name);
    alert('PDF support requires pdf.js library. Placeholder implementation.');
  };

  // Drag and drop support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileUpload({ target: { files } });
      }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [board]);

  // Coordinate transformation (screen to canvas with zoom/pan)
  const screenToCanvas = (screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom
    };
  };

  const getMousePos = (e) => {
    return screenToCanvas(e.clientX, e.clientY);
  };

  const getTouchPos = (e) => {
    const touch = e.touches[0];
    return screenToCanvas(touch.clientX, touch.clientY);
  };

  // Element hit detection
  const getElementAtPoint = (x, y) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (isPointInElement(x, y, element)) {
        return { element, index: i };
      }
    }
    return null;
  };

  const isPointInElement = (x, y, element) => {
    switch (element.type) {
      case 'rectangle':
      case 'sticky-note':
      case 'image':
        const rect = element.coordinates;
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
      
      case 'circle':
        const circle = element.coordinates;
        const dx = x - circle.cx;
        const dy = y - circle.cy;
        return Math.sqrt(dx * dx + dy * dy) <= circle.radius;
      
      case 'line':
        const line = element.coordinates;
        const distToLine = distanceToLineSegment(x, y, line.x1, line.y1, line.x2, line.y2);
        return distToLine < 5;
      
      default:
        return false;
    }
  };

  const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Drawing logic
  const startDrawing = (pos) => {
    if (selectedTool === 'select') {
      const hit = getElementAtPoint(pos.x, pos.y);
      if (hit) {
        setSelectedElement(hit.index);
        setIsDragging(true);
        setDragOffset({
          x: pos.x - (hit.element.coordinates.x || hit.element.coordinates.x1 || hit.element.coordinates.cx),
          y: pos.y - (hit.element.coordinates.y || hit.element.coordinates.y1 || hit.element.coordinates.cy)
        });
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (selectedTool === 'sticky-note') {
      const element = {
        type: 'sticky-note',
        clientId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        coordinates: { x: pos.x, y: pos.y, width: 200, height: 150 },
        text: 'Double-click to edit',
        style: { ...toolSettings, fill: toolSettings.color },
        timestamp: new Date()
      };
      setElements(prev => [...prev, element]);
      if (board?._id) {
        socketService.sendDrawing(board._id, { ...element, persist: true });
      }
      return;
    }

    setIsDrawing(true);
    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPath([pos]);
    } else {
      setCurrentPath([pos]);
    }
  };

  const draw = (pos) => {
    if (isPanning) return;
    
    if (isDragging && selectedElement !== null) {
      const element = elements[selectedElement];
      const newElements = [...elements];
      const updatedElement = { ...element };
      
      if (element.type === 'rectangle' || element.type === 'sticky-note' || element.type === 'image') {
        updatedElement.coordinates = {
          ...updatedElement.coordinates,
          x: pos.x - dragOffset.x,
          y: pos.y - dragOffset.y
        };
      } else if (element.type === 'circle') {
        updatedElement.coordinates = {
          ...updatedElement.coordinates,
          cx: pos.x - dragOffset.x,
          cy: pos.y - dragOffset.y
        };
      }
      
      newElements[selectedElement] = updatedElement;
      setElements(newElements);
      return;
    }

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (selectedTool === 'pen') {
      setCurrentPath(prev => [...prev, pos]);
      
      if (currentPath.length > 0) {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.strokeStyle = toolSettings.color;
        ctx.lineWidth = toolSettings.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
      }
    } else if (selectedTool === 'eraser') {
      // Eraser logic
    } else {
      // Preview for shapes
      redrawCanvas();
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      if (overlayCtx && currentPath.length > 0) {
        overlayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        overlayCtx.save();
        overlayCtx.translate(pan.x, pan.y);
        overlayCtx.scale(zoom, zoom);
        drawPreview(overlayCtx, currentPath[0], pos);
        overlayCtx.restore();
      }
    }

    // Send cursor position
    if (board?._id) {
      socketService.sendCursorMove(board._id, {
        x: pos.x,
        y: pos.y,
        color: toolSettings.color
      });
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || currentPath.length === 0) {
      setIsDrawing(false);
      setIsDragging(false);
      return;
    }

    setIsDrawing(false);
    setIsDragging(false);

    const element = createElementFromPath();
    if (element) {
      setElements(prev => [...prev, element]);
      setRedoStack([]);

      if (board?._id) {
        socketService.sendDrawing(board._id, { ...element, persist: true });
      }
    }

    setCurrentPath([]);
    
    // Clear overlay canvas
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    }
  };

  const createElementFromPath = () => {
    if (currentPath.length === 0) return null;

    const baseElement = {
      clientId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      style: { ...toolSettings }
    };

    const start = currentPath[0];
    const end = currentPath[currentPath.length - 1];

    switch (selectedTool) {
      case 'pen':
        return {
          ...baseElement,
          type: 'pen',
          coordinates: { points: currentPath }
        };
      
      case 'line':
        return {
          ...baseElement,
          type: 'line',
          coordinates: { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
        };
      
      case 'rectangle':
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
      
      case 'circle':
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        return {
          ...baseElement,
          type: 'circle',
          coordinates: { cx: start.x, cy: start.y, radius }
        };
      
      case 'triangle':
        return {
          ...baseElement,
          type: 'triangle',
          coordinates: {
            x1: start.x,
            y1: end.y,
            x2: (start.x + end.x) / 2,
            y2: start.y,
            x3: end.x,
            y3: end.y
          }
        };
      
      case 'star':
        return {
          ...baseElement,
          type: 'star',
          coordinates: {
            cx: start.x,
            cy: start.y,
            outerRadius: Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)),
            innerRadius: Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2.5
          }
        };
      
      default:
        return null;
    }
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
        ctx.beginPath();
        ctx.rect(
          Math.min(start.x, end.x),
          Math.min(start.y, end.y),
          Math.abs(end.x - start.x),
          Math.abs(end.y - start.y)
        );
        ctx.stroke();
        if (toolSettings.fill !== 'transparent') ctx.fill();
        break;
      
      case 'circle':
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        if (toolSettings.fill !== 'transparent') ctx.fill();
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
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx);
    }

    // Draw all elements
    elements.forEach((element, index) => {
      drawElement(ctx, element);
      
      // Draw selection handles
      if (selectedElement === index) {
        drawSelectionHandles(ctx, element);
      }
    });

    ctx.restore();
  };

  const drawGrid = (ctx) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < canvasSize.width / zoom; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height / zoom);
      ctx.stroke();
    }

    for (let y = 0; y < canvasSize.height / zoom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width / zoom, y);
      ctx.stroke();
    }
  };

  const drawElement = (ctx, element) => {
    const style = element.style || {};
    ctx.strokeStyle = style.color || '#000000';
    ctx.fillStyle = style.fill || 'transparent';
    ctx.lineWidth = style.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'pen':
        const points = element.coordinates.points;
        if (points && points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          points.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.stroke();
        }
        break;
      
      case 'line':
        ctx.beginPath();
        ctx.moveTo(element.coordinates.x1, element.coordinates.y1);
        ctx.lineTo(element.coordinates.x2, element.coordinates.y2);
        ctx.stroke();
        break;
      
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(element.coordinates.x, element.coordinates.y, element.coordinates.width, element.coordinates.height);
        ctx.stroke();
        if (style.fill !== 'transparent') ctx.fill();
        break;
      
      case 'circle':
        ctx.beginPath();
        ctx.arc(element.coordinates.cx, element.coordinates.cy, element.coordinates.radius, 0, 2 * Math.PI);
        ctx.stroke();
        if (style.fill !== 'transparent') ctx.fill();
        break;
      
      case 'sticky-note':
        // Draw sticky note background
        ctx.fillStyle = style.fill || '#fef08a';
        ctx.fillRect(element.coordinates.x, element.coordinates.y, element.coordinates.width, element.coordinates.height);
        ctx.strokeStyle = '#facc15';
        ctx.strokeRect(element.coordinates.x, element.coordinates.y, element.coordinates.width, element.coordinates.height);
        
        // Draw text
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText(element.text || '', element.coordinates.x + 10, element.coordinates.y + 25);
        break;
      
      case 'image':
        if (element.imageData) {
          const img = new Image();
          img.src = element.imageData;
          ctx.drawImage(img, element.coordinates.x, element.coordinates.y, element.coordinates.width, element.coordinates.height);
        }
        break;
      
      case 'star':
        drawStar(ctx, element.coordinates.cx, element.coordinates.cy, 5, element.coordinates.outerRadius, element.coordinates.innerRadius);
        ctx.stroke();
        if (style.fill !== 'transparent') ctx.fill();
        break;
    }
  };

  const drawSelectionHandles = (ctx, element) => {
    if (!element.coordinates) return;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    const handleSize = 8;
    let handles = [];
    
    if (element.type === 'rectangle' || element.type === 'sticky-note' || element.type === 'image') {
      const { x, y, width, height } = element.coordinates;
      handles = [
        { x, y }, // top-left
        { x: x + width, y }, // top-right
        { x, y: y + height }, // bottom-left
        { x: x + width, y: y + height } // bottom-right
      ];
      
      // Draw selection box
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
      ctx.setLineDash([]);
    }
    
    // Draw handles
    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  };

  const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
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

  // Mouse/touch event handlers
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle mouse or Ctrl+click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    
    const pos = getMousePos(e);
    startDrawing(pos);
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }
    
    const pos = getMousePos(e);
    draw(pos);
  };

  const handleMouseUp = () => {
    stopDrawing();
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    // Only zoom if Ctrl is pressed or it's a pinch gesture (ctrlKey is set for pinch on trackpad)
    if (e.ctrlKey) {
      // Global listener already prevents default, but we still update zoom
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
    }
    // Otherwise, allow normal scrolling
  };

  const handleDoubleClick = (e) => {
    if (selectedTool !== 'select') return;
    
    const pos = getMousePos(e);
    const hit = getElementAtPoint(pos.x, pos.y);
    
    if (hit && (hit.element.type === 'sticky-note' || hit.element.type === 'text')) {
      setEditingText(hit.index);
    }
  };

  // Touch event handlers
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

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-white">
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: isPanning ? 'grabbing' : 
                  selectedTool === 'select' ? 'default' :
                  selectedTool === 'eraser' ? 'crosshair' : 
                  selectedTool === 'pen' ? 'crosshair' :
                  selectedTool === 'text' ? 'text' : 'crosshair',
          touchAction: 'none',
          width: '100%',
          height: '100%'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Overlay canvas for previews */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          width: '100%',
          height: '100%'
        }}
      />

      {/* Hidden file input for image/PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Render smoothed cursors */}
      {Object.entries(smoothedCursorsRef.current).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute pointer-events-none flex flex-col items-start z-50 transition-all duration-75 ease-linear"
          style={{
            left: cursor.x * zoom + pan.x,
            top: cursor.y * zoom + pan.y,
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

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-full shadow-md text-sm font-medium">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;
