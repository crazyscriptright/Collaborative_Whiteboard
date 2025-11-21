import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import socketService from '../services/socket';

const CanvasBoard = forwardRef(({
  board,
  selectedTool,
  toolSettings,
  activeUsers,
  onBoardChange
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const lastTouchTimeRef = useRef(0);
  
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
  const [cursor, setCursor] = useState('default');

  // Update cursor when tool changes
  useEffect(() => {
    if (selectedTool === 'select') setCursor('default');
    else if (selectedTool === 'text') setCursor('text');
    else if (selectedTool === 'fill') setCursor('alias');
    else if (selectedTool === 'hand') setCursor('grab');
    else setCursor('crosshair');
  }, [selectedTool]);
  
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
    },
    exportJSON: () => {
      const data = JSON.stringify(elements);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.json`;
      link.href = url;
      link.click();
    },
    importJSON: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedElements = JSON.parse(e.target.result);
          if (Array.isArray(importedElements)) {
            setElements(importedElements);
            if (board?._id) {
              // Sync with server - this might be heavy if many elements
              // Ideally we'd have a bulk update endpoint
              importedElements.forEach(el => {
                 socketService.sendDrawing(board._id, { ...el, persist: true });
              });
            }
          }
        } catch (err) {
          console.error('Failed to parse JSON', err);
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      // Use fixed large dimensions for the canvas
      // This ensures consistent coordinate system across devices
      // The parent container handles scrolling
      const fixedWidth = 3000;
      const fixedHeight = 2000;
      
      if (canvas.width !== fixedWidth || canvas.height !== fixedHeight) {
        canvas.width = fixedWidth;
        canvas.height = fixedHeight;
        
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = fixedWidth;
          overlayCanvasRef.current.height = fixedHeight;
        }
        
        setCanvasSize({ width: fixedWidth, height: fixedHeight });
      }
    };

    // Initial size update
    updateCanvasSize();
    
    // Prevent browser zoom globally when using Ctrl+wheel
    const preventBrowserZoom = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('wheel', preventBrowserZoom, { passive: false });
    
    return () => {
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
      case 'diamond':
      case 'hexagon':
        const rect = element.coordinates;
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
      
      case 'circle':
        const circle = element.coordinates;
        const dx = x - circle.cx;
        const dy = y - circle.cy;
        return Math.sqrt(dx * dx + dy * dy) <= circle.radius;
      
      case 'line':
      case 'arrow':
        const line = element.coordinates;
        // Increase tolerance for easier selection, scaled by zoom
        const tolerance = 10 / zoom;
        const distToLine = distanceToLineSegment(x, y, line.x1, line.y1, line.x2, line.y2);
        return distToLine < tolerance;

      case 'triangle':
        const tri = element.coordinates;
        // Simple bounding box check for now
        const minX = Math.min(tri.x1, tri.x2, tri.x3);
        const maxX = Math.max(tri.x1, tri.x2, tri.x3);
        const minY = Math.min(tri.y1, tri.y2, tri.y3);
        const maxY = Math.max(tri.y1, tri.y2, tri.y3);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;

      case 'star':
        const star = element.coordinates;
        return x >= star.cx - star.outerRadius && x <= star.cx + star.outerRadius &&
               y >= star.cy - star.outerRadius && y <= star.cy + star.outerRadius;

      case 'text':
        const textX = element.coordinates.x;
        const textY = element.coordinates.y;
        const fontSize = element.style?.fontSize || 24;
        const textWidth = (element.text || '').length * (fontSize * 0.6);
        return x >= textX && x <= textX + textWidth &&
               y >= textY - fontSize && y <= textY;
      
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
        
        const coords = hit.element.coordinates;
        let anchorX, anchorY;
        
        if (['rectangle', 'sticky-note', 'image', 'diamond', 'hexagon', 'text'].includes(hit.element.type)) {
            anchorX = coords.x;
            anchorY = coords.y;
        } else if (['circle', 'star'].includes(hit.element.type)) {
            anchorX = coords.cx;
            anchorY = coords.cy;
        } else if (['line', 'arrow', 'triangle'].includes(hit.element.type)) {
            anchorX = coords.x1;
            anchorY = coords.y1;
        }

        setDragOffset({
          x: pos.x - anchorX,
          y: pos.y - anchorY
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
        if (onBoardChange) onBoardChange();
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
      
      const newAnchorX = pos.x - dragOffset.x;
      const newAnchorY = pos.y - dragOffset.y;

      if (['rectangle', 'sticky-note', 'image', 'diamond', 'hexagon', 'text'].includes(element.type)) {
        updatedElement.coordinates = {
          ...updatedElement.coordinates,
          x: newAnchorX,
          y: newAnchorY
        };
      } else if (['circle', 'star'].includes(element.type)) {
        updatedElement.coordinates = {
          ...updatedElement.coordinates,
          cx: newAnchorX,
          cy: newAnchorY
        };
      } else if (['line', 'arrow'].includes(element.type)) {
        const dx = newAnchorX - element.coordinates.x1;
        const dy = newAnchorY - element.coordinates.y1;
        updatedElement.coordinates = {
          ...updatedElement.coordinates,
          x1: newAnchorX,
          y1: newAnchorY,
          x2: element.coordinates.x2 + dx,
          y2: element.coordinates.y2 + dy
        };
      } else if (element.type === 'triangle') {
        const dx = newAnchorX - element.coordinates.x1;
        const dy = newAnchorY - element.coordinates.y1;
        updatedElement.coordinates = {
          ...updatedElement.coordinates,
          x1: newAnchorX,
          y1: newAnchorY,
          x2: element.coordinates.x2 + dx,
          y2: element.coordinates.y2 + dy,
          x3: element.coordinates.x3 + dx,
          y3: element.coordinates.y3 + dy
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
      // Eraser logic handled in handleMouseMove
    } else if (selectedTool === 'text') {
       // Preview text box
       const overlayCtx = overlayCanvasRef.current?.getContext('2d');
       if (overlayCtx && currentPath.length > 0) {
         overlayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
         overlayCtx.save();
         overlayCtx.translate(pan.x, pan.y);
         overlayCtx.scale(zoom, zoom);
         
         const start = currentPath[0];
         const width = pos.x - start.x;
         const height = pos.y - start.y;
         
         overlayCtx.strokeStyle = '#3b82f6';
         overlayCtx.setLineDash([5, 5]);
         overlayCtx.strokeRect(start.x, start.y, width, height);
         
         overlayCtx.restore();
         
         // Update currentPath
         setCurrentPath(prev => [prev[0], pos]);
       }
    } else {
      // Preview for shapes
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      if (overlayCtx && currentPath.length > 0) {
        overlayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        overlayCtx.save();
        overlayCtx.translate(pan.x, pan.y);
        overlayCtx.scale(zoom, zoom);
        drawPreview(overlayCtx, currentPath[0], pos);
        overlayCtx.restore();
        
        // Update currentPath so stopDrawing has the end point
        setCurrentPath(prev => [prev[0], pos]);
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

    if (selectedTool === 'text') {
       const start = currentPath[0];
       const end = currentPath[currentPath.length - 1] || start;
       
       const width = Math.abs(end.x - start.x);
       const height = Math.abs(end.y - start.y);
       
       const finalWidth = width < 20 ? 100 : width;
       const finalHeight = height < 20 ? 30 : height;
       
       const element = {
        type: 'text',
        clientId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        coordinates: { 
            x: Math.min(start.x, end.x), 
            y: Math.min(start.y, end.y),
            width: finalWidth,
            height: finalHeight
        },
        text: '',
        style: { ...toolSettings, color: toolSettings.color, fontSize: 24 },
        timestamp: new Date()
      };
      
      const newElements = [...elements, element];
      setElements(newElements);
      setEditingText(newElements.length - 1);
      
      setCurrentPath([]);
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      }
      return;
    }

    const element = createElementFromPath();
    if (element) {
      setElements(prev => [...prev, element]);
      setRedoStack([]);

      if (board?._id) {
        socketService.sendDrawing(board._id, { ...element, persist: true });
        if (onBoardChange) onBoardChange();
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

      case 'diamond':
        return {
          ...baseElement,
          type: 'diamond',
          coordinates: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y)
          }
        };

      case 'hexagon':
        return {
          ...baseElement,
          type: 'hexagon',
          coordinates: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y)
          }
        };

      case 'arrow':
        return {
          ...baseElement,
          type: 'arrow',
          coordinates: {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y
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

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(start.x, end.y);
        ctx.lineTo((start.x + end.x) / 2, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.closePath();
        ctx.stroke();
        if (toolSettings.fill !== 'transparent') ctx.fill();
        break;

      case 'diamond':
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const w = Math.abs(end.x - start.x) / 2;
        const h = Math.abs(end.y - start.y) / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.lineTo(cx + w, cy);
        ctx.lineTo(cx, cy + h);
        ctx.lineTo(cx - w, cy);
        ctx.closePath();
        ctx.stroke();
        if (toolSettings.fill !== 'transparent') ctx.fill();
        break;

      case 'hexagon':
        const hexW = Math.abs(end.x - start.x);
        const hexH = Math.abs(end.y - start.y);
        const hexX = Math.min(start.x, end.x);
        const hexY = Math.min(start.y, end.y);
        ctx.beginPath();
        ctx.moveTo(hexX + hexW * 0.25, hexY);
        ctx.lineTo(hexX + hexW * 0.75, hexY);
        ctx.lineTo(hexX + hexW, hexY + hexH * 0.5);
        ctx.lineTo(hexX + hexW * 0.75, hexY + hexH);
        ctx.lineTo(hexX + hexW * 0.25, hexY + hexH);
        ctx.lineTo(hexX, hexY + hexH * 0.5);
        ctx.closePath();
        ctx.stroke();
        if (toolSettings.fill !== 'transparent') ctx.fill();
        break;

      case 'arrow':
        const headLen = 20;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;

      case 'star':
        drawStar(ctx, start.x, start.y, 5, Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)), Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2.5);
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
      // Skip drawing the element being edited (it will be rendered by the textarea)
      if (index === editingText) return;
      
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

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(element.coordinates.x1, element.coordinates.y1);
        ctx.lineTo(element.coordinates.x2, element.coordinates.y2);
        ctx.lineTo(element.coordinates.x3, element.coordinates.y3);
        ctx.closePath();
        ctx.stroke();
        if (style.fill !== 'transparent') ctx.fill();
        break;

      case 'diamond':
        const { x: dx, y: dy, width: dw, height: dh } = element.coordinates;
        const dcx = dx + dw / 2;
        const dcy = dy + dh / 2;
        ctx.beginPath();
        ctx.moveTo(dcx, dy);
        ctx.lineTo(dx + dw, dcy);
        ctx.lineTo(dcx, dy + dh);
        ctx.lineTo(dx, dcy);
        ctx.closePath();
        ctx.stroke();
        if (style.fill !== 'transparent') ctx.fill();
        break;

      case 'hexagon':
        const { x: hx, y: hy, width: hw, height: hh } = element.coordinates;
        ctx.beginPath();
        ctx.moveTo(hx + hw * 0.25, hy);
        ctx.lineTo(hx + hw * 0.75, hy);
        ctx.lineTo(hx + hw, hy + hh * 0.5);
        ctx.lineTo(hx + hw * 0.75, hy + hh);
        ctx.lineTo(hx + hw * 0.25, hy + hh);
        ctx.lineTo(hx, hy + hh * 0.5);
        ctx.closePath();
        ctx.stroke();
        if (style.fill !== 'transparent') ctx.fill();
        break;

      case 'arrow':
        const { x1, y1, x2, y2 } = element.coordinates;
        const headLen = 20;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;

      case 'text':
        ctx.fillStyle = style.color || '#000';
        ctx.font = `${style.fontSize || 24}px Arial`;
        ctx.fillText(element.text || '', element.coordinates.x, element.coordinates.y);
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
    
    if (['rectangle', 'sticky-note', 'image', 'diamond', 'hexagon'].includes(element.type)) {
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
    } else if (element.type === 'circle' || element.type === 'star') {
       const cx = element.coordinates.cx;
       const cy = element.coordinates.cy;
       const r = element.coordinates.radius || element.coordinates.outerRadius;
       handles = [
         { x: cx - r, y: cy - r },
         { x: cx + r, y: cy - r },
         { x: cx - r, y: cy + r },
         { x: cx + r, y: cy + r }
       ];
       ctx.setLineDash([5, 5]);
       ctx.strokeRect(cx - r - 5, cy - r - 5, r * 2 + 10, r * 2 + 10);
       ctx.setLineDash([]);
    } else if (element.type === 'line' || element.type === 'arrow') {
       handles = [
         { x: element.coordinates.x1, y: element.coordinates.y1 },
         { x: element.coordinates.x2, y: element.coordinates.y2 }
       ];
    } else if (element.type === 'triangle') {
       handles = [
         { x: element.coordinates.x1, y: element.coordinates.y1 },
         { x: element.coordinates.x2, y: element.coordinates.y2 },
         { x: element.coordinates.x3, y: element.coordinates.y3 }
       ];
    } else if (element.type === 'text') {
        const fontSize = element.style?.fontSize || 24;
        const width = (element.text || '').length * (fontSize * 0.6);
        const height = fontSize;
        const x = element.coordinates.x;
        const y = element.coordinates.y - height; // Text draws from baseline
        
        handles = [
            { x, y },
            { x: x + width, y },
            { x, y: y + height },
            { x: x + width, y: y + height }
        ];
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

  // Delete shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement !== null && editingText === null) {
        e.preventDefault(); // Prevent browser back navigation
        const element = elements[selectedElement];
        if (element) {
          const newElements = elements.filter((_, index) => index !== selectedElement);
          setElements(newElements);
          setSelectedElement(null);
          
          if (board?._id) {
            socketService.deleteElement(board._id, element.clientId);
            if (onBoardChange) onBoardChange();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements, editingText, board]);

  const eraseElementAt = (pos) => {
    const hit = getElementAtPoint(pos.x, pos.y);
    if (hit) {
      const element = elements[hit.index];
      const newElements = elements.filter((_, index) => index !== hit.index);
      setElements(newElements);
      
      if (board?._id) {
        socketService.deleteElement(board._id, element.clientId);
        if (onBoardChange) onBoardChange();
      }
    }
  };

  const getResizeHandleAtPoint = (x, y, element) => {
    if (!element || !element.coordinates) return null;
    
    const handleSize = 10 / zoom;
    let handles = {};

    if (['rectangle', 'sticky-note', 'image', 'diamond', 'hexagon'].includes(element.type)) {
      const { x: ex, y: ey, width, height } = element.coordinates;
      handles = {
        tl: { x: ex, y: ey },
        tr: { x: ex + width, y: ey },
        bl: { x: ex, y: ey + height },
        br: { x: ex + width, y: ey + height }
      };
    } else if (element.type === 'circle' || element.type === 'star') {
      const cx = element.coordinates.cx;
      const cy = element.coordinates.cy;
      const r = element.coordinates.radius || element.coordinates.outerRadius;
      handles = {
        tl: { x: cx - r, y: cy - r },
        tr: { x: cx + r, y: cy - r },
        bl: { x: cx - r, y: cy + r },
        br: { x: cx + r, y: cy + r }
      };
    } else if (element.type === 'line' || element.type === 'arrow') {
      handles = {
        start: { x: element.coordinates.x1, y: element.coordinates.y1 },
        end: { x: element.coordinates.x2, y: element.coordinates.y2 }
      };
    } else if (element.type === 'triangle') {
      handles = {
        v1: { x: element.coordinates.x1, y: element.coordinates.y1 },
        v2: { x: element.coordinates.x2, y: element.coordinates.y2 },
        v3: { x: element.coordinates.x3, y: element.coordinates.y3 }
      };
    } else if (element.type === 'text') {
        const fontSize = element.style?.fontSize || 24;
        const width = (element.text || '').length * (fontSize * 0.6);
        const height = fontSize;
        const tx = element.coordinates.x;
        const ty = element.coordinates.y - height;
        
        handles = {
            tl: { x: tx, y: ty },
            tr: { x: tx + width, y: ty },
            bl: { x: tx, y: ty + height },
            br: { x: tx + width, y: ty + height }
        };
    }

    for (const [key, handle] of Object.entries(handles)) {
      if (Math.abs(x - handle.x) <= handleSize && Math.abs(y - handle.y) <= handleSize) {
        return key;
      }
    }
    return null;
  };

  const resizeElement = (index, pos, handle) => {
    const element = elements[index];
    if (!element) return;

    let newCoords = { ...element.coordinates };

    if (['rectangle', 'sticky-note', 'image', 'diamond', 'hexagon', 'text'].includes(element.type)) {
        const { x, y, width, height } = element.coordinates;
        // For text, we might want to scale font size instead of width/height, but for now let's just move it or do nothing?
        // Actually for text, resizing usually changes font size. Let's keep it simple for now or implement font scaling.
        // For now, treat text like a box for positioning, but maybe don't change width/height directly if it's auto-calculated.
        // But the user asked for resizing.
        
        if (element.type === 'text') {
             // For text, we'll just move the origin if dragging TL, or maybe scale font size?
             // Let's implement simple font scaling based on height change
             if (handle === 'br' || handle === 'tr' || handle === 'bl') {
                 // Calculate new height
                 let newHeight = height;
                 if (handle === 'br' || handle === 'bl') newHeight = pos.y - (y - height); // y is baseline
                 if (handle === 'tr') newHeight = (y) - pos.y;
                 
                 // Update font size
                 const newFontSize = Math.max(12, Math.abs(newHeight));
                 const newStyle = { ...element.style, fontSize: newFontSize };
                 
                 const newElements = [...elements];
                 newElements[index] = { ...element, style: newStyle };
                 setElements(newElements);
                 return;
             }
             // If dragging TL, move the text
             if (handle === 'tl') {
                 const dx = pos.x - x;
                 const dy = pos.y - (y - height);
                 newCoords.x = pos.x;
                 newCoords.y = y + dy;
                 const newElements = [...elements];
                 newElements[index] = { ...element, coordinates: newCoords };
                 setElements(newElements);
                 return;
             }
             return;
        }

        switch (handle) {
          case 'tl':
            newCoords.x = pos.x;
            newCoords.y = pos.y;
            newCoords.width = width + (x - pos.x);
            newCoords.height = height + (y - pos.y);
            break;
          case 'tr':
            newCoords.y = pos.y;
            newCoords.width = pos.x - x;
            newCoords.height = height + (y - pos.y);
            break;
          case 'bl':
            newCoords.x = pos.x;
            newCoords.width = width + (x - pos.x);
            newCoords.height = pos.y - y;
            break;
          case 'br':
            newCoords.width = pos.x - x;
            newCoords.height = pos.y - y;
            break;
        }

        if (newCoords.width < 0) {
          newCoords.x += newCoords.width;
          newCoords.width = Math.abs(newCoords.width);
        }
        if (newCoords.height < 0) {
          newCoords.y += newCoords.height;
          newCoords.height = Math.abs(newCoords.height);
        }
    } else if (element.type === 'circle' || element.type === 'star') {
        const cx = element.coordinates.cx;
        const cy = element.coordinates.cy;
        // Calculate new radius based on distance from center to mouse
        const newRadius = Math.sqrt(Math.pow(pos.x - cx, 2) + Math.pow(pos.y - cy, 2));
        
        if (element.type === 'circle') {
            newCoords.radius = newRadius;
        } else {
            const ratio = element.coordinates.innerRadius / element.coordinates.outerRadius;
            newCoords.outerRadius = newRadius;
            newCoords.innerRadius = newRadius * ratio;
        }
    } else if (element.type === 'line' || element.type === 'arrow') {
        if (handle === 'start') {
            newCoords.x1 = pos.x;
            newCoords.y1 = pos.y;
        } else {
            newCoords.x2 = pos.x;
            newCoords.y2 = pos.y;
        }
    } else if (element.type === 'triangle') {
        if (handle === 'v1') {
            newCoords.x1 = pos.x;
            newCoords.y1 = pos.y;
        } else if (handle === 'v2') {
            newCoords.x2 = pos.x;
            newCoords.y2 = pos.y;
        } else if (handle === 'v3') {
            newCoords.x3 = pos.x;
            newCoords.y3 = pos.y;
        }
    }

    const newElements = [...elements];
    newElements[index] = { ...element, coordinates: newCoords };
    setElements(newElements);
  };

  // Mouse/touch event handlers
  const handleMouseDown = (e) => {
    // Ignore mouse events that are triggered by touch
    if (Date.now() - lastTouchTimeRef.current < 500) return;

    if (e.button === 1 || (e.button === 0 && e.ctrlKey) || selectedTool === 'hand') {
      // Middle mouse, Ctrl+click, or Hand tool for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setCursor('grabbing');
      return;
    }
    
    const pos = getMousePos(e);

    // Check for resize handles first
    if (selectedElement !== null) {
      const element = elements[selectedElement];
      const handle = getResizeHandleAtPoint(pos.x, pos.y, element);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        return;
      }
    }

    // Eraser
    if (selectedTool === 'eraser') {
      setIsDrawing(true);
      eraseElementAt(pos);
      return;
    }

    // Fill Tool
    if (selectedTool === 'fill') {
      const hit = getElementAtPoint(pos.x, pos.y);
      if (hit) {
        const element = elements[hit.index];
        const newElements = [...elements];
        const updatedElement = { 
            ...element, 
            style: { ...element.style, fill: toolSettings.color } 
        };
        newElements[hit.index] = updatedElement;
        setElements(newElements);
        
        if (board?._id) {
            socketService.sendDrawing(board._id, { ...updatedElement, persist: true });
            if (onBoardChange) onBoardChange();
        }
      } else {
          // Flood fill logic for empty space or overlapping areas
          performFloodFill(pos.x, pos.y, toolSettings.color);
      }
      return;
    }

    startDrawing(pos);
  };

  const performFloodFill = (startX, startY, color) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Convert start coordinates to integer
      // Note: startX/Y are in canvas coordinates (zoomed/panned), we need screen coordinates for getImageData
      // But wait, getImageData gets the pixels as they are rendered on screen.
      // So we need to convert startX/Y back to screen coordinates relative to canvas
      
      const screenX = Math.floor(startX * zoom + pan.x);
      const screenY = Math.floor(startY * zoom + pan.y);
      
      if (screenX < 0 || screenX >= width || screenY < 0 || screenY >= height) return;
      
      const startPos = (screenY * width + screenX) * 4;
      const startR = data[startPos];
      const startG = data[startPos + 1];
      const startB = data[startPos + 2];
      const startA = data[startPos + 3];
      
      // Parse fill color
      const tempCtx = document.createElement('canvas').getContext('2d');
      tempCtx.fillStyle = color;
      tempCtx.fillRect(0,0,1,1);
      const fillData = tempCtx.getImageData(0,0,1,1).data;
      const [fillR, fillG, fillB] = fillData;
      const fillA = 255; // Assume opaque fill
      
      if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;
      
      // Create a separate canvas for the fill result to avoid modifying the main canvas directly
      // We will create an image element from this
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = width;
      resultCanvas.height = height;
      const resultCtx = resultCanvas.getContext('2d');
      const resultImageData = resultCtx.createImageData(width, height);
      const resData = resultImageData.data;
      
      const stack = [[screenX, screenY]];
      const visited = new Set(); // To prevent infinite loops if logic fails, though color check usually suffices
      
      // Helper to check color match
      const matchStartColor = (pos) => {
          return data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA;
      };
      
      while (stack.length) {
          const [x, y] = stack.pop();
          const pos = (y * width + x) * 4;
          
          if (resData[pos + 3] !== 0) continue; // Already filled in result
          if (!matchStartColor(pos)) continue; // Boundary hit
          
          // Fill pixel in result
          resData[pos] = fillR;
          resData[pos + 1] = fillG;
          resData[pos + 2] = fillB;
          resData[pos + 3] = fillA;
          
          // Add neighbors
          if (x > 0) stack.push([x - 1, y]);
          if (x < width - 1) stack.push([x + 1, y]);
          if (y > 0) stack.push([x, y - 1]);
          if (y < height - 1) stack.push([x, y + 1]);
      }
      
      resultCtx.putImageData(resultImageData, 0, 0);
      
      // Crop the result to minimize image size? 
      // For now, just use the full canvas size but positioned at 0,0 relative to screen, 
      // which means we need to transform it back to world coordinates.
      // Actually, the image we created is in screen coordinates.
      // If we add it as an 'image' element, it will be drawn transformed by zoom/pan.
      // So we need to inverse transform the image or its coordinates.
      // Easier: Create an image element that covers the visible area.
      
      // Calculate world coordinates for the top-left of the screen
      const worldX = -pan.x / zoom;
      const worldY = -pan.y / zoom;
      const worldWidth = width / zoom;
      const worldHeight = height / zoom;
      
      const element = {
          type: 'image',
          clientId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          coordinates: {
            x: worldX,
            y: worldY,
            width: worldWidth,
            height: worldHeight
          },
          imageData: resultCanvas.toDataURL(),
          timestamp: new Date(),
          userId: board.owner,
          username: 'current user'
      };
      
      setElements(prev => [...prev, element]);
      if (board?._id) {
          socketService.sendDrawing(board._id, { ...element, persist: true });
          if (onBoardChange) onBoardChange();
      }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);

    // Cursor update logic
    let newCursor = cursor;
    if (isPanning) {
      newCursor = 'grabbing';
    } else if (selectedTool === 'hand') {
      newCursor = 'grab';
    } else if (isResizing) {
      // Keep current cursor
    } else if (isDragging) {
      newCursor = 'move';
    } else if (selectedTool === 'select') {
      if (selectedElement !== null) {
        const element = elements[selectedElement];
        const handle = getResizeHandleAtPoint(pos.x, pos.y, element);
        if (handle) {
          if (handle === 'tl' || handle === 'br') newCursor = 'nwse-resize';
          else if (handle === 'tr' || handle === 'bl') newCursor = 'nesw-resize';
          else newCursor = 'pointer';
        } else if (isPointInElement(pos.x, pos.y, element)) {
          newCursor = 'move';
        } else {
          newCursor = 'default';
        }
      } else {
        const hit = getElementAtPoint(pos.x, pos.y);
        newCursor = hit ? 'pointer' : 'default';
      }
    } else if (selectedTool === 'text') {
      newCursor = 'text';
    } else if (selectedTool === 'fill') {
      newCursor = 'alias';
    } else {
      newCursor = 'crosshair';
    }

    if (newCursor !== cursor) {
      setCursor(newCursor);
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isResizing && selectedElement !== null) {
      resizeElement(selectedElement, pos, resizeHandle);
      return;
    }

    if (isDrawing && selectedTool === 'eraser') {
      eraseElementAt(pos);
      return;
    }
    
    draw(pos);
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      if (selectedElement !== null && board?._id) {
         socketService.sendDrawing(board._id, { ...elements[selectedElement], persist: true });
         if (onBoardChange) onBoardChange();
      }
      return;
    }

    stopDrawing();
    setIsPanning(false);
    
    // Reset cursor if we were panning
    if (isPanning) {
       if (selectedTool === 'select') setCursor('default');
       else if (selectedTool === 'text') setCursor('text');
       else if (selectedTool === 'hand') setCursor('grab');
       else setCursor('crosshair');
    }
  };

  const handleWheel = (e) => {
    // Only zoom if Ctrl is pressed or it's a pinch gesture (ctrlKey is set for pinch on trackpad)
    if (e.ctrlKey) {
      // Get mouse position before zoom
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom delta
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.3, Math.min(3, zoom + delta));
      
      // Calculate the point under the mouse in canvas coordinates before zoom
      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;
      
      // Calculate new pan to keep the point under the mouse
      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;
      
      // Update zoom and pan together
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
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
    lastTouchTimeRef.current = Date.now();
    
    // If Hand tool, allow native behavior (scrolling)
    if (selectedTool === 'hand') {
      return;
    }
    
    // Two-finger touch or Hand tool for panning
    if (e.touches.length === 2) {
      if (isDrawing) {
        stopDrawing();
      }
      setIsPanning(true);
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      return;
    }

    const pos = getTouchPos(e);
    startDrawing(pos);
  };

  const handleTouchMove = (e) => {
    lastTouchTimeRef.current = Date.now();
    
    if (isPanning) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y
      });
      return;
    }

    const pos = getTouchPos(e);
    draw(pos);
  };

  const handleTouchEnd = (e) => {
    lastTouchTimeRef.current = Date.now();
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    stopDrawing();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-white">
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: cursor,
          touchAction: selectedTool === 'hand' ? 'auto' : 'none',
          width: '3000px',
          height: '2000px'
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
          width: '3000px',
          height: '2000px'
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

      {/* Text Editing Input */}
      {editingText !== null && elements[editingText] && (
        <textarea
          ref={textInputRef}
          className="absolute z-50 p-1 bg-transparent border-2 border-blue-500 outline-none resize-none overflow-hidden rounded"
          style={{
            left: (elements[editingText].coordinates.x * zoom + pan.x) + 'px',
            top: (elements[editingText].type === 'text' 
              ? (elements[editingText].coordinates.y * zoom + pan.y - (elements[editingText].style?.fontSize || 24) * zoom) 
              : (elements[editingText].coordinates.y * zoom + pan.y)) + 'px',
            width: elements[editingText].type === 'sticky-note' 
              ? (elements[editingText].coordinates.width * zoom) + 'px' 
              : Math.max(100, (elements[editingText].text?.length || 0) * ((elements[editingText].style?.fontSize || 24) * 0.6 * zoom) + 20) + 'px',
            height: elements[editingText].type === 'sticky-note' 
              ? (elements[editingText].coordinates.height * zoom) + 'px' 
              : ((elements[editingText].style?.fontSize || 24) * 1.5 * zoom) + 'px',
            fontSize: ((elements[editingText].style?.fontSize || 24) * zoom) + 'px',
            color: elements[editingText].style?.color || '#000',
            fontFamily: 'Arial',
            lineHeight: '1.2'
          }}
          value={elements[editingText].text || ''}
          onChange={(e) => {
            const newElements = [...elements];
            newElements[editingText] = {
              ...newElements[editingText],
              text: e.target.value
            };
            setElements(newElements);
          }}
          onBlur={() => {
            if (board?._id) {
               socketService.sendDrawing(board._id, { ...elements[editingText], persist: true });
            }
            setEditingText(null);
          }}
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      )}

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
      <div className="fixed bottom-4 right-4 z-50 bg-white px-3 py-1 rounded-full shadow-md text-sm font-medium border border-gray-200">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;
