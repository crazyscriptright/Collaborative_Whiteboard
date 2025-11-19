import React from 'react';

const Background = ({ children, pattern = 'none', color = '#ffffff' }) => {
  const getBackgroundStyle = () => {
    const baseStyle = {
      backgroundColor: color,
      minHeight: '100vh',
      width: '100%',
      position: 'relative'
    };

    switch (pattern) {
      case 'grid':
        return {
          ...baseStyle,
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        };
      
      case 'dots':
        return {
          ...baseStyle,
          backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        };
      
      default:
        return baseStyle;
    }
  };

  return (
    <div style={getBackgroundStyle()}>
      {children}
    </div>
  );
};

export default Background;