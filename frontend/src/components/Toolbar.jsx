import React from 'react';

const Toolbar = ({
  selectedTool,
  toolSettings,
  onToolChange,
  onToolSettingsChange,
  onClearBoard,
  isCollapsed,
  onToggleCollapse
}) => {
  const tools = [
    { 
      id: 'pen', 
      name: 'Pen', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    },
    { 
      id: 'line', 
      name: 'Line', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 20L4 4" />
        </svg>
      )
    },
    { 
      id: 'rectangle', 
      name: 'Rectangle', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
        </svg>
      )
    },
    { 
      id: 'circle', 
      name: 'Circle', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
        </svg>
      )
    },
    { 
      id: 'text', 
      name: 'Text', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      )
    },
    { 
      id: 'eraser', 
      name: 'Eraser', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

  return (
    <div className={`absolute top-5 left-5 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 transition-transform duration-300 ${
      isCollapsed ? '-translate-x-64' : ''
    }`}>
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-10 top-4 w-8 h-8 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
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

      {/* Tools Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Drawing Tools</h3>
        <div className="grid grid-cols-3 gap-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                selectedTool === tool.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
              title={tool.name}
            >
              {tool.icon}
              <span className="text-xs font-medium">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Color</h3>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onToolSettingsChange({ color })}
              className={`w-7 h-7 rounded border-2 transition-all duration-200 ${
                toolSettings.color === color
                  ? 'border-primary-500 scale-110'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <input
          type="color"
          value={toolSettings.color}
          onChange={(e) => onToolSettingsChange({ color: e.target.value })}
          className="w-full h-8 border border-gray-200 rounded cursor-pointer"
          title="Custom Color"
        />
      </div>

      {/* Stroke Width Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Stroke Width: {toolSettings.strokeWidth}px
        </h3>
        <input
          type="range"
          min="1"
          max="20"
          value={toolSettings.strokeWidth}
          onChange={(e) => onToolSettingsChange({ strokeWidth: parseInt(e.target.value) })}
          className="w-full mb-3 slider"
        />
        <div className="flex flex-wrap gap-1">
          {strokeWidths.map(width => (
            <button
              key={width}
              onClick={() => onToolSettingsChange({ strokeWidth: width })}
              className={`px-2 py-1 text-xs rounded border transition-all duration-200 ${
                toolSettings.strokeWidth === width
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              {width}
            </button>
          ))}
        </div>
      </div>

      {/* Fill Section for Shapes */}
      {(selectedTool === 'rectangle' || selectedTool === 'circle') && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Fill</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onToolSettingsChange({ fill: 'transparent' })}
              className={`flex-1 py-2 px-3 text-sm rounded border transition-all duration-200 ${
                toolSettings.fill === 'transparent'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              None
            </button>
            <button
              onClick={() => onToolSettingsChange({ fill: toolSettings.color })}
              className={`flex-1 py-2 px-3 text-sm rounded border transition-all duration-200 ${
                toolSettings.fill !== 'transparent'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              Fill
            </button>
          </div>
        </div>
      )}

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
  );
};

export default Toolbar;