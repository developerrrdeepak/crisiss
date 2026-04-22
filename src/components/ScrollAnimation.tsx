"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useScroll, useTransform, useMotionValueEvent } from "framer-motion";

function parseFrameIndex(n: number) {
  return `/animation/ezgif-frame-${String(n).padStart(3, "0")}.jpg`;
}

// 109 frames total: 12, 24, 36, then 37 to 142
const frames = [
  parseFrameIndex(12),
  parseFrameIndex(24),
  parseFrameIndex(36),
  ...Array.from({ length: 142 - 37 + 1 }, (_, i) => parseFrameIndex(i + 37))
];

export function ScrollAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const { scrollYProgress } = useScroll(); // tracks scroll progress of the entire page

  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(frames.length).fill(null));

  useEffect(() => {
    let isMounted = true;
    let loadedCount = 0;
    const loadStart = Date.now();

    frames.forEach((src, index) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (!isMounted) return;
        imagesRef.current[index] = img;
        loadedCount++;
        
        // As soon as the very first image we need is loaded (or frame 0),
        // trigger a state update to force a re-render. Since we want to paint right away:
        if (index === 0 || loadedCount === frames.length) {
          setImages([...imagesRef.current as HTMLImageElement[]]);
        }
      };
      img.onerror = () => {
        if (!isMounted) return;
        loadedCount++;
        if (loadedCount === frames.length) {
          setImages([...imagesRef.current as HTMLImageElement[]]);
        }
      };
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const drawFrame = useCallback((progress: number) => {
    if (images.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // determine index from scroll progress
    const maxIndex = images.length - 1;
    let index = Math.floor(progress * images.length);
    if (index > maxIndex) index = maxIndex;
    if (index < 0) index = 0;

    const img = images[index];
    if (!img) return;

    // ensure canvas dimensions match window dimensions for high-res crispness
    const { innerWidth, innerHeight } = window;
    if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    }

    // calculate object-fit: cover logic
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;
    let renderWidth, renderHeight, x, y;

    if (canvasRatio > imgRatio) {
      renderWidth = canvas.width;
      renderHeight = canvas.width / imgRatio;
      x = 0;
      y = (canvas.height - renderHeight) / 2;
    } else {
      renderWidth = canvas.height * imgRatio;
      renderHeight = canvas.height;
      x = (canvas.width - renderWidth) / 2;
      y = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, renderWidth, renderHeight);
  }, [images]);

  // Redraw when images load or window resizes
  useEffect(() => {
    drawFrame(scrollYProgress.get());

    const handleResize = () => {
      drawFrame(scrollYProgress.get());
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [images, drawFrame, scrollYProgress]);

  // Update frame immediately on scroll via framer-motion event listener
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    drawFrame(latest);
  });

  return (
    <div className="fixed inset-0 z-0 w-full h-full pointer-events-none bg-transparent">
      <canvas
        ref={canvasRef}
        className="block min-w-full min-h-full object-cover"
      />
      {/* Subtle overlay to guarantee text readability without hiding the animation */}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10 dark:from-black/50 dark:via-transparent dark:to-black/20" />
    </div>
  );
}
