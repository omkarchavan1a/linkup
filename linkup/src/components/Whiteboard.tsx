import React, { useRef, useState, useEffect } from 'react';
import { 
  FiTrash2, 
  FiRotateCcw, 
  FiDownload, 
  FiLock, 
  FiUnlock,
  FiSliders,
  FiX
} from 'react-icons/fi';

interface WhiteboardProps {
  roomId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
  isHost: boolean;
  isLocked: boolean;
  onClose: () => void;
  onLockToggle?: (locked: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  prevPos: Point;
  currentPos: Point;
  color: string;
  size: number;
  isEraser: boolean;
}

export default function Whiteboard({
  roomId,
  socket,
  isHost,
  isLocked,
  onClose,
  onLockToggle
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366f1'); // Default Indigo
  const [size, setSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [showBrushControls, setShowBrushControls] = useState(false);

  // Local drawing strokes list for undo operations
  const strokesRef = useRef<Stroke[]>([]);
  const lastPosRef = useRef<Point>({ x: 0, y: 0 });

  const colors = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#a855f7', // Purple
    '#09090b', // Zinc Dark
  ];

  // Configure Canvas settings on mount and window resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions based on container bounding client rect
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = rect?.height || 500;

      // Keep backup of strokes before resizing clears the canvas
      const backupStrokes = [...strokesRef.current];

      canvas.width = width * 2; // high res retina support
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(2, 2);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;
      }

      // Re-draw all strokes after resize
      redrawCanvas(backupStrokes);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Re-draw canvas strokes list
  const redrawCanvas = (strokesList: Stroke[]) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Clear whole canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Replay strokes
    strokesList.forEach((stroke) => {
      ctx.beginPath();
      ctx.moveTo(stroke.prevPos.x * canvas.width / 2, stroke.prevPos.y * canvas.height / 2);
      ctx.lineTo(stroke.currentPos.x * canvas.width / 2, stroke.currentPos.y * canvas.height / 2);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.stroke();
      ctx.closePath();
    });

    // Reset default compositing
    ctx.globalCompositeOperation = 'source-over';
  };

  // Synchronize dynamic Socket event triggers
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDraw = (stroke: Stroke) => {
      // Add remote stroke to our local strokes stack
      strokesRef.current.push(stroke);
      drawStroke(stroke);
    };

    const handleRemoteClear = () => {
      strokesRef.current = [];
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handleRemoteUndo = () => {
      strokesRef.current.pop();
      redrawCanvas(strokesRef.current);
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:undo', handleRemoteUndo);

    return () => {
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('whiteboard:undo', handleRemoteUndo);
    };
  }, [socket]);

  // Execute drawing stroke on canvas
  const drawStroke = (stroke: Stroke) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.beginPath();
    ctx.moveTo(stroke.prevPos.x * (canvas.width / 2), stroke.prevPos.y * (canvas.height / 2));
    ctx.lineTo(stroke.currentPos.x * (canvas.width / 2), stroke.currentPos.y * (canvas.height / 2));
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.stroke();
    ctx.closePath();

    // Restore to default compositing
    ctx.globalCompositeOperation = 'source-over';
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isLocked && !isHost) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);

    const pos = getCoordinates(e, canvas);
    lastPosRef.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (isLocked && !isHost)) return;

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const currentPos = getCoordinates(e, canvas);
    
    // Normalize coordinates relatively to support different screen ratios (0.0 to 1.0)
    const normalizedPrev = {
      x: lastPosRef.current.x / (canvas.width / 2),
      y: lastPosRef.current.y / (canvas.height / 2),
    };

    const normalizedCurrent = {
      x: currentPos.x / (canvas.width / 2),
      y: currentPos.y / (canvas.height / 2),
    };

    const stroke: Stroke = {
      prevPos: normalizedPrev,
      currentPos: normalizedCurrent,
      color: isEraser ? '#ffffff' : color,
      size,
      isEraser
    };

    // Save to local stroke stack
    strokesRef.current.push(stroke);

    // Render stroke immediately
    drawStroke(stroke);

    // Relay path coordinates to peer network
    socket?.emit('whiteboard:draw', {
      roomId,
      ...stroke
    });

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    
    // Support Touch Events for mobile device whiteboard collaboration
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Whiteboard controls triggers
  const clearBoard = () => {
    if (isLocked && !isHost) return;

    strokesRef.current = [];
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    socket?.emit('whiteboard:clear', { roomId });
  };

  const undoStroke = () => {
    if (isLocked && !isHost) return;
    if (strokesRef.current.length === 0) return;

    strokesRef.current.pop();
    redrawCanvas(strokesRef.current);
    socket?.emit('whiteboard:undo', { roomId });
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a virtual canvas to bake the clean white background behind PNG exports
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    if (exportCtx) {
      // 1. Fill clean bright white background
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      // 2. Render actual drawing canvas content on top
      exportCtx.drawImage(canvas, 0, 0);

      const dataURL = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId.slice(0, 8)}-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-2xl">
      {/* Canvas Draw Board */}
      <div className="relative flex-1 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 cursor-crosshair touch-none"
        />

        {/* Lock Overlay for non-host users if whiteboard is drawing-locked */}
        {isLocked && !isHost && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/70 backdrop-blur-[3px] text-white p-6 text-center animate-fade-in">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-3 animate-pulse">
              <FiLock size={28} />
            </div>
            <h4 className="font-bold text-lg">Drawing Locked by Host</h4>
            <p className="text-zinc-400 text-xs mt-1 max-w-xs">
              The host has locked drawing controls. You can view drawings in real time but cannot add strokes.
            </p>
          </div>
        )}
      </div>

      {/* Floating Glassmorphic Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* Title Badges */}
        <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center space-x-2 text-white shadow-xl pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-xs font-semibold tracking-wide uppercase">Collaborative Canvas</span>
          {isLocked && (
            <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-md flex items-center">
              <FiLock size={10} className="mr-1" /> Locked
            </span>
          )}
        </div>

        {/* Action Panel Button Ribbon */}
        <div className="flex items-center space-x-2 bg-zinc-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl pointer-events-auto">
          {isHost && onLockToggle && (
            <button
              onClick={() => onLockToggle(!isLocked)}
              className={`p-2.5 rounded-xl transition duration-200 ${
                isLocked 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
              title={isLocked ? 'Unlock Drawing for Guests' : 'Lock Drawing for Guests'}
            >
              {isLocked ? <FiLock size={16} /> : <FiUnlock size={16} />}
            </button>
          )}

          <button
            onClick={undoStroke}
            disabled={isLocked && !isHost}
            className="p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white rounded-xl transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo Last Stroke"
          >
            <FiRotateCcw size={16} />
          </button>

          <button
            onClick={clearBoard}
            disabled={isLocked && !isHost}
            className="p-2.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Clear Whole Canvas"
          >
            <FiTrash2 size={16} />
          </button>

          <button
            onClick={downloadImage}
            className="p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white rounded-xl transition duration-200"
            title="Download Canvas PNG"
          >
            <FiDownload size={16} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1"></div>

          <button
            onClick={onClose}
            className="p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white rounded-xl transition duration-200"
            title="Close Whiteboard"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* Floating Bottom Brush Controls Panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center bg-zinc-950/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl text-white space-x-3">
        {/* Colors Swatches */}
        <div className="flex items-center space-x-1.5 px-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
              disabled={isLocked && !isHost}
              className={`w-6 h-6 rounded-full border transition duration-200 hover:scale-115 active:scale-95 disabled:opacity-30 ${
                color === c && !isEraser
                  ? 'border-white scale-110 shadow-md shadow-white/30'
                  : 'border-white/10'
              }`}
              style={{ backgroundColor: c }}
              title={`Brush Color: ${c}`}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-white/10"></div>

        {/* Eraser Tool Toggle */}
        <button
          onClick={() => setIsEraser(!isEraser)}
          disabled={isLocked && !isHost}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition duration-200 flex items-center space-x-1 disabled:opacity-30 ${
            isEraser
              ? 'bg-indigo-500 text-white font-extrabold shadow-lg shadow-indigo-500/20'
              : 'text-zinc-400 hover:bg-white/10 hover:text-white'
          }`}
          title="Toggle Eraser Mode"
        >
          <span>🧼</span>
          <span className="hidden sm:inline">Eraser</span>
        </button>

        <div className="w-px h-6 bg-white/10"></div>

        {/* Brush Size Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowBrushControls(!showBrushControls)}
            disabled={isLocked && !isHost}
            className={`p-2.5 rounded-xl transition duration-200 flex items-center justify-center disabled:opacity-30 ${
              showBrushControls ? 'bg-white/15 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Configure Stroke Thickness"
          >
            <FiSliders size={15} />
          </button>

          {showBrushControls && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 p-4 rounded-2xl w-48 shadow-2xl animate-fade-in flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Thickness</span>
                <span className="font-bold font-mono text-indigo-400">{size}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
