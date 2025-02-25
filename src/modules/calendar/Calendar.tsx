import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Minus, RotateCcw, X, Clock, CalendarDays, Users } from 'lucide-react';
import type { ViewMode } from '../../types';

interface TimeBlock {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  color: string;
  column: number;
  prepTime?: {
    start: Date;
    duration: number;
  };
  assignedMovers?: string[];
}

interface DragState {
  type: 'move' | 'resize' | 'prep';
  blockId: string;
  initialX: number;
  initialY: number;
  initialColumn?: number;
  initialHeight?: number;
  initialTop?: number;
  initialPrepHeight?: number;
  isDragging: boolean;
  touchIdentifier?: number;
}

interface TouchPoint {
  identifier: number;
  clientX: number;
  clientY: number;
}

interface Mover {
  id: string;
  name: string;
  color: string;
}

const MINUTES_IN_DAY = 24 * 60;
const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;
const BLOCK_WIDTH = 200;
const COLUMN_GAP = 10;
const MAX_COLUMNS = 4;
const TIME_COLUMN_WIDTH = 80;
const TIME_BLOCK_COLORS = [
  'rgba(59, 130, 246, 0.9)',
  'rgba(16, 185, 129, 0.9)',
  'rgba(245, 158, 11, 0.9)',
  'rgba(239, 68, 68, 0.9)',
  'rgba(139, 92, 246, 0.9)'
];

const DEFAULT_MOVERS: Mover[] = [
  { id: '1', name: 'Johnny', color: '#FF6B6B' },
  { id: '2', name: 'Cristiani', color: '#4ECDC4' },
  { id: '3', name: 'Alex', color: '#45B7D1' },
  { id: '4', name: 'Christian', color: '#96CEB4' },
  { id: '5', name: 'Stewart', color: '#FFEEAD' },
  { id: '6', name: 'Manny', color: '#D4A5A5' },
  { id: '7', name: 'Cory', color: '#9B89B3' }
];

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  });
};

export function Calendar({ viewMode }: { viewMode: ViewMode }) {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [doubleClickTimeout, setDoubleClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const [movers, setMovers] = useState<Mover[]>(DEFAULT_MOVERS);
  const [isAddingMover, setIsAddingMover] = useState(false);
  const [newMoverName, setNewMoverName] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const mouseDownRef = useRef(false);
  const mouseUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const newMoverInputRef = useRef<HTMLInputElement>(null);
  const touchStartTimeRef = useRef(0);
  const touchMoveCountRef = useRef(0);

  const minutesToPixels = (minutes: number) => (minutes / MINUTES_IN_DAY) * (24 * HOUR_HEIGHT);
  const pixelsToMinutes = (pixels: number) => Math.round((pixels / (24 * HOUR_HEIGHT)) * MINUTES_IN_DAY);
  const snapToGrid = (value: number) => Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;

  const getTimeFromPosition = (y: number) => {
    if (!gridRef.current) return new Date();
    const rect = gridRef.current.getBoundingClientRect();
    const relativeY = y - rect.top;
    const minutes = snapToGrid(pixelsToMinutes(relativeY));
    const time = new Date(currentDate);
    time.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return time;
  };

  const findAvailableColumn = (startTime: Date, endTime: Date) => {
    for (let col = 0; col < MAX_COLUMNS; col++) {
      const hasOverlap = blocks.some(block => 
        block.column === col &&
        startTime < new Date(block.end) &&
        endTime > new Date(block.start)
      );
      if (!hasOverlap) return col;
    }
    return 0;
  };

  const createBlock = (clickY: number) => {
    if (dragState?.isDragging) return null;

    const startTime = getTimeFromPosition(clickY);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    const column = findAvailableColumn(startTime, endTime);

    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substring(7),
      title: 'New Block',
      start: startTime,
      end: endTime,
      column,
      color: TIME_BLOCK_COLORS[blocks.length % TIME_BLOCK_COLORS.length],
      assignedMovers: []
    };

    setBlocks(prev => [...prev, newBlock]);
    return newBlock;
  };

  const deleteBlock = (blockId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (editingBlock?.id === blockId) {
      setEditingBlock(null);
    }
  };

  const handleBlockInteractionStart = (
    e: React.MouseEvent | React.TouchEvent,
    block: TimeBlock,
    type: 'move' | 'resize' | 'prep'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    mouseDownRef.current = true;

    const element = blockRefs.current[block.id];
    if (!element) return;

    const point = 'touches' in e ? e.touches[0] : e;
    const now = Date.now();

    if (type !== 'prep') {
      if (now - lastTapTime < 300) {
        setEditingBlock(block);
        return;
      }
      setLastTapTime(now);
    }

    const rect = element.getBoundingClientRect();
    setDragState({
      type,
      blockId: block.id,
      initialX: point.clientX,
      initialY: point.clientY,
      initialColumn: block.column,
      initialHeight: type === 'resize' ? rect.height : undefined,
      initialTop: type === 'move' ? rect.top : undefined,
      initialPrepHeight: type === 'prep' ? block.prepTime?.duration || 0 : undefined,
      isDragging: true,
      touchIdentifier: 'touches' in e ? e.touches[0].identifier : undefined
    });
  };

  const handleBlockMouseDown = (e: React.MouseEvent, block: TimeBlock, type: 'move' | 'resize' | 'prep') => {
    handleBlockInteractionStart(e, block, type);
  };

  const handleBlockTouchStart = (e: React.TouchEvent, block: TimeBlock, type: 'move' | 'resize' | 'prep') => {
    touchStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
    handleBlockInteractionStart(e, block, type);
  };

  useEffect(() => {
    const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
      if (!dragState || !gridRef.current) return;

      e.preventDefault();
      
      const point = 'touches' in e ? 
        Array.from(e.touches).find(t => t.identifier === dragState.touchIdentifier) :
        e;

      if (!point) return;

      const block = blocks.find(b => b.id === dragState.blockId);
      if (!block) return;

      const element = blockRefs.current[dragState.blockId];
      if (!element) return;

      if ('touches' in e) {
        touchMoveCountRef.current++;
      }

      const gridRect = gridRef.current.getBoundingClientRect();
      const deltaY = point.clientY - dragState.initialY;
      const deltaX = point.clientX - dragState.initialX;

      if (dragState.type === 'move') {
        const columnWidth = BLOCK_WIDTH + COLUMN_GAP;
        const columnDelta = Math.round(deltaX / columnWidth);
        const newColumn = Math.max(0, Math.min(
          MAX_COLUMNS - 1,
          (dragState.initialColumn || 0) + columnDelta
        ));

        const newTop = Math.max(0, Math.min(
          (dragState.initialTop || 0) + deltaY - gridRect.top,
          gridRect.height - element.offsetHeight
        ));
        
        const newStartTime = getTimeFromPosition(newTop + gridRect.top);
        const duration = block.end.getTime() - block.start.getTime();
        
        setBlocks(prev => prev.map(b => {
          if (b.id === block.id) {
            const newEndTime = new Date(newStartTime.getTime() + duration);
            const newPrepTime = b.prepTime ? {
              start: new Date(newStartTime.getTime() - b.prepTime.duration * 60000),
              duration: b.prepTime.duration
            } : undefined;
            return { ...b, start: newStartTime, end: newEndTime, column: newColumn, prepTime: newPrepTime };
          }
          return b;
        }));
      } else if (dragState.type === 'resize') {
        const newHeight = Math.max(SNAP_MINUTES, dragState.initialHeight! + deltaY);
        const durationMinutes = snapToGrid(pixelsToMinutes(newHeight));
        
        setBlocks(prev => prev.map(b => {
          if (b.id === block.id) {
            const newEndTime = new Date(b.start);
            newEndTime.setMinutes(newEndTime.getMinutes() + durationMinutes);
            return { ...b, end: newEndTime };
          }
          return b;
        }));
      } else if (dragState.type === 'prep') {
        const maxPrepMinutes = (block.start.getHours() * 60 + block.start.getMinutes());
        const newPrepMinutes = Math.max(0, Math.min(
          maxPrepMinutes,
          snapToGrid(pixelsToMinutes(deltaY))
        ));

        setBlocks(prev => prev.map(b => {
          if (b.id === block.id) {
            if (newPrepMinutes === 0) {
              const { prepTime, ...rest } = b;
              return rest;
            }
            return {
              ...b,
              prepTime: {
                start: new Date(b.start.getTime() - newPrepMinutes * 60000),
                duration: newPrepMinutes
              }
            };
          }
          return b;
        }));
      }
    };

    const handleInteractionEnd = (e: MouseEvent | TouchEvent) => {
      if (mouseUpTimeoutRef.current) {
        clearTimeout(mouseUpTimeoutRef.current);
      }
      
      mouseUpTimeoutRef.current = setTimeout(() => {
        mouseDownRef.current = false;
      }, 50);

      if ('changedTouches' in e && touchMoveCountRef.current < 3) {
        const tapDuration = Date.now() - touchStartTimeRef.current;
        if (tapDuration < 300) {
          const block = blocks.find(b => b.id === dragState?.blockId);
          if (block) {
            setEditingBlock(block);
          }
        }
      }
      
      setDragState(null);
    };

    if (dragState) {
      if ('ontouchstart' in window) {
        document.addEventListener('touchmove', handleInteractionMove, { passive: false });
        document.addEventListener('touchend', handleInteractionEnd);
        document.addEventListener('touchcancel', handleInteractionEnd);
      }
      document.addEventListener('mousemove', handleInteractionMove);
      document.addEventListener('mouseup', handleInteractionEnd);
      document.body.classList.add('select-none');
    }

    return () => {
      if ('ontouchstart' in window) {
        document.removeEventListener('touchmove', handleInteractionMove);
        document.removeEventListener('touchend', handleInteractionEnd);
        document.removeEventListener('touchcancel', handleInteractionEnd);
      }
      document.removeEventListener('mousemove', handleInteractionMove);
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.body.classList.remove('select-none');
    };
  }, [dragState, blocks]);

  const handleGridInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragState || mouseDownRef.current) return;
    const point = 'touches' in e ? e.touches[0] : e;
    createBlock(point.clientY);
  };

  const calculateDriveTime = (minutes: number) => {
    if (minutes <= 15) return '0';
    return `${minutes - 15}`;
  };

  const getDepartureTime = (startTime: Date) => {
    const departureTime = new Date(startTime);
    departureTime.setMinutes(startTime.getMinutes() + 15);
    return departureTime;
  };

  const addMover = () => {
    if (!newMoverName.trim()) return;
    
    const newMover: Mover = {
      id: (movers.length + 1).toString(),
      name: newMoverName.trim(),
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    setMovers(prev => [...prev, newMover]);
    setNewMoverName('');
  };

  const removeMover = (moverId: string) => {
    setMovers(prev => prev.filter(m => m.id !== moverId));
    setBlocks(prev => prev.map(block => ({
      ...block,
      assignedMovers: block.assignedMovers?.filter(id => id !== moverId) || []
    })));
    setShowRemoveConfirm(null);
  };

  useEffect(() => {
    if (isAddingMover && newMoverInputRef.current) {
      newMoverInputRef.current.focus();
    }
  }, [isAddingMover]);

  const MoverManagement = () => (
    <div className="fixed top-20 right-4 bg-white rounded-lg shadow-lg p-4 w-64 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Manage Movers</h3>
        <button
          onClick={() => setIsAddingMover(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          {movers.map(mover => (
            <div
              key={mover.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: mover.color }}
                />
                <span>{mover.name}</span>
              </div>
              <button
                onClick={() => setShowRemoveConfirm(mover.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
              {showRemoveConfirm === mover.id && (
                <div className="absolute right-0 top-0 mt-12 bg-white rounded-lg shadow-lg p-4 w-64 z-50">
                  <p className="text-sm mb-4">Are you sure you want to remove {mover.name}?</p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRemoveConfirm(null)}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => removeMover(mover.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input
            ref={newMoverInputRef}
            type="text"
            value={newMoverName}
            onChange={(e) => setNewMoverName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addMover();
              }
            }}
            placeholder="New mover name"
            className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addMover}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );

  const BlockEditor = ({ block }: { block: TimeBlock }) => {
    const [formState, setFormState] = useState(block);
    const [moverSearch, setMoverSearch] = useState('');
    const moverSearchRef = useRef<HTMLInputElement>(null);

    const handleEditorClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleClose = (save: boolean = false) => {
      if (save) {
        setBlocks(prev => prev.map(b => 
          b.id === block.id ? { ...formState } : b
        ));
      }
      setEditingBlock(null);
    };

    const toggleMover = (moverId: string) => {
      const newAssignedMovers = formState.assignedMovers || [];
      const index = newAssignedMovers.indexOf(moverId);
      
      if (index === -1) {
        newAssignedMovers.push(moverId);
      } else {
        newAssignedMovers.splice(index, 1);
      }
      
      setFormState(prev => ({
        ...prev,
        assignedMovers: newAssignedMovers
      }));
    };

    const filteredMovers = movers.filter(mover => 
      mover.name.toLowerCase().includes(moverSearch.toLowerCase())
    );

    useEffect(() => {
      if (moverSearchRef.current) {
        moverSearchRef.current.focus();
      }
    }, []);

    return (
      <div 
        className="absolute z-50 bg-white rounded-lg shadow-xl p-4 space-y-4"
        style={{
          left: `${(block.column * (BLOCK_WIDTH + COLUMN_GAP)) + BLOCK_WIDTH + 40}px`,
          top: `${minutesToPixels(block.start.getHours() * 60 + block.start.getMinutes())}px`,
          width: '300px'
        }}
        onClick={handleEditorClick}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Edit Block</h3>
          <button 
            onClick={() => handleClose(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <input
          type="text"
          name="title"
          value={formState.title}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Block title"
        />

        <input
          type="text"
          name="location"
          value={formState.location || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Location"
        />

        <textarea
          name="description"
          value={formState.description || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Description"
          rows={3}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Assign Movers
          </label>
          <input
            ref={moverSearchRef}
            type="text"
            value={moverSearch}
            onChange={(e) => setMoverSearch(e.target.value)}
            placeholder="Search movers..."
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {filteredMovers.map(mover => (
              <button
                key={mover.id}
                onClick={() => toggleMover(mover.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm
                  ${formState.assignedMovers?.includes(mover.id)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                  }`}
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: mover.color }}
                />
                {mover.name}
                {formState.assignedMovers?.includes(mover.id) && (
                  <X size={14} className="ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              deleteBlock(block.id);
              handleClose(false);
            }}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Delete
          </button>
          <button
            onClick={() => handleClose(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back
          </button>

          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(currentDate.getDate() - 1);
              setCurrentDate(newDate);
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon size={24} className="text-blue-500" />
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h2>

          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(currentDate.getDate() + 1);
              setCurrentDate(newDate);
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={() => {
              const now = new Date();
              createBlock(minutesToPixels(now.getHours() * 60 + now.getMinutes()));
            }}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Block
          </button>

          <button
            onClick={() => setIsAddingMover(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Users size={20} />
            Manage Movers
          </button>
        </div>
      </div>

      {isAddingMover && <MoverManagement />}

      <div className="flex-1 overflow-y-auto">
        <div 
          ref={gridRef}
          className="relative min-h-full"
          style={{ height: `${24 * HOUR_HEIGHT}px` }}
          onClick={handleGridInteraction}
          onTouchStart={handleGridInteraction}
        >
          <div className="absolute top-0 bottom-0 left-0 w-[90px] border-r-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white z-20">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute w-full flex items-center justify-end"
                style={{ top: `${hour * HOUR_HEIGHT - 12}px` }}
              >
                <div className="mr-2 px-3 py-1 bg-blue-200 text-blue-800 rounded-md shadow-sm min-w-[70px] text-center text-sm">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-blue-100"
                style={{ top: `${hour * HOUR_HEIGHT}px`, left: '90px' }}
              />
            ))}
          </div>

          {blocks
            .filter(block => block.start.toDateString() === currentDate.toDateString())
            .map(block => {
              const startMinutes = block.start.getHours() * 60 + block.start.getMinutes();
              const endMinutes = block.end.getHours() * 60 + block.end.getMinutes();
              const duration = endMinutes - startMinutes;

              return (
                <div
                  key={block.id}
                  ref={el => blockRefs.current[block.id] = el}
                  className={`absolute rounded-lg shadow-sm cursor-move transition-shadow hover:shadow-md
                    ${dragState?.blockId === block.id ? 'z-40' : 'z-30'}`}
                  style={{
                    top: `${minutesToPixels(startMinutes)}px`,
                    left: `${TIME_COLUMN_WIDTH + 10 + (block.column * (BLOCK_WIDTH + COLUMN_GAP))}px`,
                    height: `${minutesToPixels(duration)}px`,
                    backgroundColor: block.color,
                    width: `${BLOCK_WIDTH}px`,
                    backdropFilter: 'blur(4px)',
                    transition: dragState?.blockId === block.id ? 'none' : 'background-color 0.2s'
                  }}
                  onMouseDown={(e) => handleBlockMouseDown(e, block, 'move')}
                  onTouchStart={(e) => handleBlockTouchStart(e, block, 'move')}
                >
                  <div
                    className="absolute left-0 right-0 -top-4 h-4 flex items-center justify-center cursor-ns-resize group z-50"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleBlockMouseDown(e, block, 'prep');
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      handleBlockTouchStart(e, block, 'prep');
                    }}
                  >
                    <div className="w-8 h-2 bg-white rounded-full shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all" />
                  </div>

                  {block.prepTime && (
                    <div
                      className="absolute left-0 right-0 rounded-t-lg transition-all"
                      style={{
                        top: `-${minutesToPixels(block.prepTime.duration)}px`,
                        height: `${minutesToPixels(block.prepTime.duration)}px`,
                        backgroundColor: `${block.color.replace('0.9', '0.5')}`,
                        pointerEvents: dragState?.type === 'prep' ? 'none' : ' auto',
                        zIndex: dragState?.type === 'prep' ? 45 : 35
                      }}
                    >
                      <div className="p-2 text-white">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Start Time:</span>
                            <span className="font-medium">{formatTime(block.prepTime.start)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Departure:</span>
                            <span className="font-medium">{formatTime(getDepartureTime(block.prepTime.start))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Drive Time:</span>
                            <span className="font-medium">{calculateDriveTime(block.prepTime.duration)} minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2 text-white h-full flex flex-col relative">
                    <button
                      onClick={(e) => deleteBlock(block.id, e)}
                      className="absolute top-1 right-1 p-1 hover:bg-white/20 rounded-full"
                      title="Delete Block"
                    >
                      <X size={16} />
                    </button>
                    <div className="font-medium truncate mt-4">{block.title}</div>
                    {duration >= 30 && (
                      <>
                        {block.location && (
                          <div className="text-sm opacity-90 truncate">{block.location}</div>
                        )}
                        <div className="text-sm opacity-90">
                          {block.prepTime ? 'Move: ' : ''}
                          {block.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {block.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {block.assignedMovers && block.assignedMovers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {block.assignedMovers.map(moverId => {
                              const mover = movers.find(m => m.id === moverId);
                              if (!mover) return null;
                              return (
                                <div
                                  key={mover.id}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-white/20"
                                >
                                  <div
                                    className="w-2 h-2 rounded"
                                    style={{ backgroundColor: mover.color }}
                                  />
                                  {mover.name}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-black bg-opacity-10 
                      hover:bg-opacity-20 rounded-b-lg z-50"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleBlockMouseDown(e, block, 'resize');
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      handleBlockTouchStart(e, block, 'resize');
                    }}
                  />
                </div>
              );
            })}

          {editingBlock && <BlockEditor block={editingBlock} />}
        </div>
      </div>
    </div>
  );
}