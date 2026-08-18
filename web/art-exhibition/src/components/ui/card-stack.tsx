
import React, { useState, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';

interface CardStackProps {
  children: React.ReactNode[];
  onSwipeLeft?: (index: number) => void;
  onSwipeRight?: (index: number) => void;
}

export const CardStack: React.FC<CardStackProps> = ({ 
  children, 
  onSwipeLeft,
  onSwipeRight
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const controls = useAnimation();
  const constraintsRef = useRef(null);

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 100;
    
    if (info.offset.x > swipeThreshold) {
      await controls.start({ 
        x: window.innerWidth + 200,
        rotate: 30,
        transition: { duration: 0.5 }
      });
      onSwipeRight?.(currentIndex);
      setCurrentIndex(prev => Math.min(prev + 1, children.length - 1));
    } else if (info.offset.x < -swipeThreshold) {
      await controls.start({ 
        x: -window.innerWidth - 200,
        rotate: -30,
        transition: { duration: 0.5 }
      });
      onSwipeLeft?.(currentIndex);
      setCurrentIndex(prev => Math.min(prev + 1, children.length - 1));
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  if (children.length === 0) {
    return <div className="flex justify-center items-center h-full">No cards available</div>;
  }

  return (
    <div className="relative h-full w-full overflow-hidden" ref={constraintsRef}>
      <div className="absolute inset-0 flex items-center justify-center">
        {children.map((child, index) => {
          // Only render current card and next 2 cards
          if (index < currentIndex || index > currentIndex + 2) return null;
          
          const isCurrentCard = index === currentIndex;
          const zIndex = children.length - index;

          return (
            <motion.div
              key={index}
              className="absolute w-full h-full"
              style={{ 
                zIndex,
                scale: isCurrentCard ? 1 : 1 - (index - currentIndex) * 0.05,
                y: isCurrentCard ? 0 : (index - currentIndex) * 10,
                opacity: isCurrentCard ? 1 : 1 - (index - currentIndex) * 0.3
              }}
              animate={isCurrentCard ? controls : undefined}
              drag={isCurrentCard ? "x" : false}
              dragConstraints={constraintsRef}
              onDragEnd={isCurrentCard ? handleDragEnd : undefined}
              initial={false}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
