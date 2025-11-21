import React from 'react';

const Toolbar = ({
  selectedTool,
  toolSettings,
  onToolChange,
  onToolSettingsChange,
  onClearBoard,
  isCollapsed,
  onToggleCollapse,
  onToggleGrid,
  showGrid,
  canvasRef
}) => {
  const tools = [
    { 
      id: 'select', 
      name: 'Select', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )
    },
    { 
      id: 'sticky-note', 
      name: 'Sticky', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'image', 
      name: 'Image', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'pen', 
      name: 'Pen', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    },
    { 
      id: 'line', 
      name: 'Line', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 20L4 4" />
        </svg>
      )
    },
    { 
      id: 'rectangle', 
      name: 'Rectangle', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
        </svg>
      )
    },
    { 
      id: 'circle', 
      name: 'Circle', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
        </svg>
      )
    },
    { 
      id: 'triangle', 
      name: 'Triangle', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l10 18H2L12 3z" />
        </svg>
      )
    },
    { 
      id: 'diamond', 
      name: 'Diamond', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l9 9-9 9-9-9 9-9z" />
        </svg>
      )
    },
    { 
      id: 'star', 
      name: 'Star', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    { 
      id: 'hexagon', 
      name: 'Hexagon', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l8.66 5v10L12 22 3.34 17V7L12 2z" />
        </svg>
      )
    },
    { 
      id: 'arrow', 
      name: 'Arrow', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )
    },
    { 
      id: 'text', 
      name: 'Text', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      )
    },
    { 
      id: 'eraser', 
      name: 'Eraser', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    { 
      id: 'fill', 
      name: 'Fill', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ];

  const colors = [
    '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500',
    '#800080', '#ffc0cb', '#a52a2a', '#808080'
  ];

  const strokeWidths = [1, 2, 4, 6, 8, 12, 16, 20];
  const scrollContainerRef = React.useRef(null);

  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -200, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className={`fixed top-16 md:top-20 left-2 md:left-5 z-40 transition-transform duration-300 ${
      isCollapsed ? '-translate-x-[calc(100%+20px)]' : ''
    }`}>
      <div className="relative">
        <div className="w-56 md:w-64 max-w-[calc(100vw-40px)] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-120px)]">
          {/* Scroll Up Button - Mobile Only */}
          <button
            onClick={scrollUp}
            className="md:hidden sticky top-0 z-10 w-full py-3 bg-gradient-to-b from-white to-transparent flex items-center justify-center text-gray-600 hover:text-amber-600 active:scale-95 transition-all"
            aria-label="Scroll up"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <div ref={scrollContainerRef} className="p-3 sm:p-4 overflow-y-auto flex-1">
            {/* Tools Section */}
              <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Drawing Tools</h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {tools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'image' && canvasRef?.current) {
                        canvasRef.current.triggerImageUpload();
                      } else {
                        onToolChange(tool.id);
                      }
                    }}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-0.5 sm:gap-1 ${
                      selectedTool === tool.id
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    title={tool.name}
                  >
                    <div className="w-4 h-4 sm:w-5 sm:h-5">{tool.icon}</div>
                    <span className="text-[10px] sm:text-xs font-medium">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>            {/* Color Section */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Color</h3>
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => onToolSettingsChange({ color })}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded border-2 transition-all duration-200 ${
                      toolSettings.color === color
                        ? 'border-amber-500 scale-110'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center mt-2">
                <input
                  type="color"
                  value={toolSettings.color}
                  onChange={(e) => onToolSettingsChange({ color: e.target.value })}
                  className="w-8 h-8 border border-gray-200 rounded cursor-pointer p-0.5"
                  title="Custom Color"
                />
                <input
                  type="text"
                  value={toolSettings.color}
                  onChange={(e) => onToolSettingsChange({ color: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-amber-500 uppercase"
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Stroke Width Section */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                Stroke Width: {toolSettings.strokeWidth}px
              </h3>
              <input
                type="range"
                min="1"
                max="20"
                value={toolSettings.strokeWidth}
                onChange={(e) => onToolSettingsChange({ strokeWidth: parseInt(e.target.value) })}
                className="w-full mb-2 sm:mb-3 slider"
              />
              <div className="flex flex-wrap gap-1">
                {strokeWidths.map(width => (
                  <button
                    key={width}
                    onClick={() => onToolSettingsChange({ strokeWidth: width })}
                    className={`px-2 py-1 text-xs rounded border transition-all duration-200 ${
                      toolSettings.strokeWidth === width
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {width}
                  </button>
                ))}
              </div>
            </div>

            {/* Fill Section for Shapes */}
            {(selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'triangle' || selectedTool === 'diamond' || selectedTool === 'star' || selectedTool === 'hexagon') && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Fill</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => onToolSettingsChange({ fill: 'transparent' })}
                    className={`flex-1 py-2 px-3 text-sm rounded border transition-all duration-200 ${
                      toolSettings.fill === 'transparent'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => onToolSettingsChange({ fill: toolSettings.color })}
                    className={`flex-1 py-2 px-3 text-sm rounded border transition-all duration-200 ${
                      toolSettings.fill !== 'transparent'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    Fill
                  </button>
                </div>
              </div>
            )}

            {/* Grid Toggle */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Background</h3>
              <button
                onClick={onToggleGrid}
                className={`w-full py-2 px-3 text-sm rounded border transition-all duration-200 flex items-center justify-center gap-2 ${
                  showGrid
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                {showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
            </div>

            {/* Clear Board Button */}
            <button
              onClick={onClearBoard}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Board
            </button>
          </div>
          
          {/* Scroll Down Button - Mobile Only */}
          <button
            onClick={scrollDown}
            className="md:hidden sticky bottom-0 z-10 w-full py-3 bg-gradient-to-t from-white to-transparent flex items-center justify-center text-gray-600 hover:text-amber-600 active:scale-95 transition-all"
            aria-label="Scroll down"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-8 sm:-right-10 top-4 w-7 h-7 sm:w-8 sm:h-8 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
          title={isCollapsed ? 'Show Toolbar' : 'Hide Toolbar'}
        >
          {isCollapsed ? (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;