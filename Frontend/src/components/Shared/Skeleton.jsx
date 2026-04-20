import React from 'react';

const Skeleton = ({ className = '', circle = false, width, height, style }) => {
  const baseClasses = "skeleton rounded-md";
  const circleClass = circle ? "rounded-full" : "";
  
  const combinedStyle = {
    ...style,
    width: width || style?.width,
    height: height || style?.height,
  };

  return (
    <div 
      className={`${baseClasses} ${circleClass} ${className}`} 
      style={combinedStyle}
    />
  );
};

export default Skeleton;
