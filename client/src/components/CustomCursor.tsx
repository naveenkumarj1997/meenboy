import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import './CustomCursor.css';

// Cyan normal fish
const BabyFish1 = () => (
  <svg width="16" height="8" viewBox="0 0 16 8">
    <ellipse cx="9" cy="4" rx="5" ry="2.5" fill="#67e8f9" opacity="0.8" />
    <polygon points="5,4 1,1.5 1,6.5" fill="#22d3ee" opacity="0.8" />
    <circle cx="12" cy="3" r="0.8" fill="#083344" />
  </svg>
);

// Orange chubby fish
const BabyFish2 = () => (
  <svg width="14" height="10" viewBox="0 0 14 10">
    <ellipse cx="8" cy="5" rx="4" ry="4" fill="#fdba74" opacity="0.8" />
    <polygon points="4,5 0,2 0,8" fill="#fb923c" opacity="0.8" />
    <circle cx="10" cy="3.5" r="0.8" fill="#431407" />
  </svg>
);

// Pink thin fish
const BabyFish3 = () => (
  <svg width="18" height="6" viewBox="0 0 18 6">
    <ellipse cx="10" cy="3" rx="6" ry="1.5" fill="#f9a8d4" opacity="0.8" />
    <polygon points="4,3 0,1 0,5" fill="#f472b6" opacity="0.8" />
    <circle cx="14" cy="2.5" r="0.6" fill="#831843" />
  </svg>
);

const CustomCursor = () => {
  // Mouse coordinates
  const mouseX = useMotionValue(window.innerWidth / 2);
  const mouseY = useMotionValue(window.innerHeight / 2);

  // Rotation value to face movement direction
  const rotation = useMotionValue(0);

  // Click states for ripples
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Springs for trailing fish (slow and calm)
  const slowRot = useSpring(rotation, { damping: 50, stiffness: 40, mass: 1.5 });
  
  const trail1X = useSpring(mouseX, { damping: 40, stiffness: 80, mass: 1.5 });
  const trail1Y = useSpring(mouseY, { damping: 40, stiffness: 80, mass: 1.5 });
  
  const trail2X = useSpring(mouseX, { damping: 50, stiffness: 60, mass: 2 });
  const trail2Y = useSpring(mouseY, { damping: 50, stiffness: 60, mass: 2 });
  
  const trail3X = useSpring(mouseX, { damping: 60, stiffness: 40, mass: 2.5 });
  const trail3Y = useSpring(mouseY, { damping: 60, stiffness: 40, mass: 2.5 });

  useEffect(() => {
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        let currentRot = rotation.get() % 360;
        if (currentRot < 0) currentRot += 360;
        
        let targetRot = angle;
        if (targetRot < 0) targetRot += 360;

        let diff = targetRot - currentRot;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        rotation.set(rotation.get() + diff);
      }

      lastX = e.clientX;
      lastY = e.clientY;

      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY };
      setRipples((prev) => [...prev, newRipple]);
      
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 800);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [mouseX, mouseY, rotation]);

  return (
    <div className="custom-cursor-container">
      {/* Ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="cursor-ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}

      {/* Trailing Fish 3 (Pink) */}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          x: trail3X,
          y: trail3Y,
          rotate: slowRot,
          translateX: '-60px',
          translateY: '-50%',
        }}
      >
        <BabyFish3 />
      </motion.div>

      {/* Trailing Fish 2 (Orange) */}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          x: trail2X,
          y: trail2Y,
          rotate: slowRot,
          translateX: '-45px',
          translateY: '-150%',
        }}
      >
        <BabyFish2 />
      </motion.div>

      {/* Trailing Fish 1 (Cyan) */}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          x: trail1X,
          y: trail1Y,
          rotate: slowRot,
          translateX: '-45px',
          translateY: '50%',
        }}
      >
        <BabyFish1 />
      </motion.div>

    </div>
  );
};

export default CustomCursor;
