/* eslint-disable */

import React, { useEffect, useRef, useState } from 'react';
import SimulationDisplay from './Components/SimulationDisplay';
import ControlsPanel from './Components/ControlsPanel';
import earthImage from './Images/earth.png';
import {
  EARTH_RADIUS,
  EARTH_MASS,
  G,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  EARTH_CANVAS_RADIUS,
  EARTH_CENTER_X,
  EARTH_CENTER_Y,
  EARTH_IMAGE_SIZE,
  EARTH_IMAGE_OFFSET,
  MISSILE_MASS,
  DT
} from './constants';

interface SimulationState {
  isRunning: boolean;
  time: number;
  positionX: number;
  positionY: number;
  velocityX: number;
  velocityY: number;
  // keep target fields if you want later, but not required here
  targetX?: number;
  targetY?: number;
}

const PayloadSimulation: React.FC = () => {
  // UI remains unchanged (per your request)
  const [launchAngle, setLaunchAngle] = useState(17);
  const [initialVelocity, setInitialVelocity] = useState(5600);
  const [timeScale, setTimeScale] = useState(20);

  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    time: 0,
    positionX: EARTH_RADIUS,
    positionY: 0,
    velocityX: 0,
    velocityY: 0
  });

  const [hasCrashed, setHasCrashed] = useState(false);
  const [trajectory, setTrajectory] = useState<{ x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);

  // keep image in ref to avoid recreation each render
  const earthImageRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = earthImage;
    earthImageRef.current = img;
    img.onload = () => {
      if (canvasRef.current && miniCanvasRef.current) setupSimulation();
    };
    setTimeout(() => {
      if (canvasRef.current && miniCanvasRef.current) setupSimulation();
    }, 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canvasRef.current && miniCanvasRef.current) setupSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupSimulation = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Earth image clipped to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, EARTH_CANVAS_RADIUS, 0, 2 * Math.PI);
    ctx.clip();
    if (earthImageRef.current && earthImageRef.current.complete) {
      ctx.drawImage(
        earthImageRef.current,
        EARTH_CENTER_X - EARTH_IMAGE_SIZE / 2 + EARTH_IMAGE_OFFSET,
        EARTH_CENTER_Y - EARTH_IMAGE_SIZE / 2 + EARTH_IMAGE_OFFSET,
        EARTH_IMAGE_SIZE,
        EARTH_IMAGE_SIZE
      );
    } else {
      ctx.fillStyle = '#0b2940';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    ctx.restore();

    // Atmosphere halo
    ctx.beginPath();
    ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, EARTH_CANVAS_RADIUS, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(
      EARTH_CENTER_X,
      EARTH_CENTER_Y,
      EARTH_CANVAS_RADIUS - 10,
      EARTH_CENTER_X,
      EARTH_CENTER_Y,
      EARTH_CANVAS_RADIUS + 20
    );
    gradient.addColorStop(0, 'rgba(0, 100, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    setupMiniVisualizer();
  };

  const setupMiniVisualizer = () => {
    const miniCanvas = miniCanvasRef.current!;
    const ctx = miniCanvas.getContext('2d')!;
    const width = miniCanvas.width;
    const height = miniCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#001a00';
    ctx.fillRect(0, 0, width, height);

    // Radar circles
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, i * 50, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Radar lines
    for (let angle = 0; angle < 360; angle += 30) {
      const radian = (angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(radian) * 200, centerY + Math.sin(radian) * 200);
      ctx.stroke();
    }

    // Scanning wedge
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((Date.now() / 1000) % (2 * Math.PI));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(0, 255, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0, 255, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 200, 0, Math.PI / 8);
    ctx.fill();
    ctx.restore();

    // Random blips
    ctx.fillStyle = '#00ff00';
    for (let i = 0; i < 5; i++) {
      const distance = Math.random() * 200;
      const angle = Math.random() * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = '#336633';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, width, height);
  };

  // Main loop: call updatePosition frequently
  useEffect(() => {
    let animId = 0;
    const loop = () => {
      updatePosition();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationState, trajectory, hasCrashed, timeScale]);

  const updatePosition = () => {
    if (!simulationState.isRunning || hasCrashed) return;

    const dt = DT * timeScale;
    const { positionX, positionY, velocityX, velocityY, time } = simulationState;

    // distance from center
    const r = Math.sqrt(positionX ** 2 + positionY ** 2);

    // gravitational acceleration (always toward center (0,0))
    // NOTE: This uses inverse-square even inside Earth for simplicity (matches earlier behavior).
    const gravAcceleration = (G * EARTH_MASS) / (r ** 2);
    const gravAccelerationX = (-gravAcceleration * positionX) / r;
    const gravAccelerationY = (-gravAcceleration * positionY) / r;

    // semi-implicit Euler integration
    const newVelocityX = velocityX + gravAccelerationX * dt;
    const newVelocityY = velocityY + gravAccelerationY * dt;
    const newPositionX = positionX + newVelocityX * dt;
    const newPositionY = positionY + newVelocityY * dt;

    // update state & trajectory
    setSimulationState((prev) => ({
      ...prev,
      time: time + dt,
      positionX: newPositionX,
      positionY: newPositionY,
      velocityX: newVelocityX,
      velocityY: newVelocityY
    }));

    setTrajectory((prev) => {
      const next = [...prev, { x: newPositionX, y: newPositionY }];
      if (next.length > 800) next.shift();
      return next;
    });

    updateCanvasPosition(newPositionX, newPositionY);
    updateMiniVisualizer(Math.sqrt(newPositionX ** 2 + newPositionY ** 2));

    // IMPACT LOGIC: now triggers only when missile reaches (0,0) (within a tiny radius)
    // The user requested "hit (0,0)". Use a very small impact radius to approximate "exactly".
    const CENTER_IMPACT_RADIUS = 1000; // 1 km threshold around center (adjust if desired)
    const distToCenter = Math.sqrt(newPositionX * newPositionX + newPositionY * newPositionY);

    // Safety: avoid infinite loop / numerical issues: if missile enters very deep negative radius, stop
    const penetrationThreshold = EARTH_RADIUS * 0.1; // inside 10% of radius is very deep

    if (distToCenter <= CENTER_IMPACT_RADIUS) {
      // Stop and explode at the exact center (we draw explosion centered at canvas center)
      setSimulationState((prev) => ({ ...prev, isRunning: false }));
      setHasCrashed(true);
      // animate explosion at center coordinates (0,0)
      animateExplosion(0, 0);
      return;
    }

    if (distToCenter < penetrationThreshold) {
      // If it somehow goes very deep numerically, stop and explode at current location.
      setSimulationState((prev) => ({ ...prev, isRunning: false }));
      setHasCrashed(true);
      animateExplosion(newPositionX, newPositionY);
      return;
    }

    // Otherwise, continue — note: crossing EARTH_RADIUS does not trigger explosion anymore.
  };

  const updateCanvasPosition = (x: number, y: number) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Earth clipped image
    ctx.save();
    ctx.beginPath();
    ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, EARTH_CANVAS_RADIUS, 0, 2 * Math.PI);
    ctx.clip();
    if (earthImageRef.current && earthImageRef.current.complete) {
      ctx.drawImage(
        earthImageRef.current,
        EARTH_CENTER_X - EARTH_IMAGE_SIZE / 2 + EARTH_IMAGE_OFFSET,
        EARTH_CENTER_Y - EARTH_IMAGE_SIZE / 2 + EARTH_IMAGE_OFFSET,
        EARTH_IMAGE_SIZE,
        EARTH_IMAGE_SIZE
      );
    } else {
      ctx.fillStyle = '#0b2940';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    ctx.restore();

    // Atmosphere halo
    ctx.beginPath();
    ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, EARTH_CANVAS_RADIUS, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(
      EARTH_CENTER_X,
      EARTH_CENTER_Y,
      EARTH_CANVAS_RADIUS - 10,
      EARTH_CENTER_X,
      EARTH_CENTER_Y,
      EARTH_CANVAS_RADIUS + 20
    );
    gradient.addColorStop(0, 'rgba(0, 100, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw trajectory
    if (trajectory.length > 1) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
      ctx.shadowBlur = 10;

      for (let i = 1; i < trajectory.length; i++) {
        const start = trajectory[i - 1];
        const end = trajectory[i];
        const startX = EARTH_CENTER_X + (start.x / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;
        const startY = EARTH_CENTER_Y - (start.y / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;
        const endX = EARTH_CENTER_X + (end.x / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;
        const endY = EARTH_CENTER_Y - (end.y / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;

        const g = ctx.createLinearGradient(startX, startY, endX, endY);
        const alpha = Math.min(1, (i / trajectory.length) * 2);
        g.addColorStop(0, `rgba(0, 255, 0, ${alpha * 0.2})`);
        g.addColorStop(1, `rgba(0, 255, 0, ${alpha})`);

        ctx.beginPath();
        ctx.strokeStyle = g;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Draw missile (convert sim coords to canvas coords)
    const canvasX = EARTH_CENTER_X + (x / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;
    const canvasY = EARTH_CENTER_Y - (y / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;

    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw center marker (optional): shows where (0,0) maps on canvas
    ctx.beginPath();
    ctx.fillStyle = '#ff5555';
    ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, 4, 0, 2 * Math.PI);
    ctx.fill();
  };

  const updateMiniVisualizer = (r: number) => {
    const miniCanvas = miniCanvasRef.current!;
    const ctx = miniCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, 250, 200);
    setupMiniVisualizer();

    const angle = Math.atan2(simulationState.positionY, simulationState.positionX);
    const distance = r - EARTH_RADIUS;
    const maxVisualDistance = 180;
    const visualDistance = Math.min(maxVisualDistance, distance / 50000);

    const rocketLength = 30;
    const rocketWidth = 10;
    const baseX = 125;
    const baseY = 200 - visualDistance;
    const rocketAngle = angle + Math.PI / 2;

    const tipX = baseX + rocketLength * Math.cos(rocketAngle);
    const tipY = baseY - rocketLength * Math.sin(rocketAngle);

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX + (rocketWidth / 2) * Math.sin(rocketAngle), baseY + (rocketWidth / 2) * Math.cos(rocketAngle));
    ctx.lineTo(baseX - (rocketWidth / 2) * Math.sin(rocketAngle), baseY - (rocketWidth / 2) * Math.cos(rocketAngle));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.arc(
      baseX + (rocketLength / 4) * Math.cos(rocketAngle),
      baseY - (rocketLength / 4) * Math.sin(rocketAngle),
      3,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    const finLength = 10;
    const finWidth = 5;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + (finWidth / 2) * Math.cos(rocketAngle), baseY - (finWidth / 2) * Math.sin(rocketAngle));
    ctx.lineTo(baseX + finLength * Math.sin(rocketAngle - Math.PI / 6), baseY + finLength * Math.cos(rocketAngle - Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX - (finWidth / 2) * Math.cos(rocketAngle), baseY + (finWidth / 2) * Math.sin(rocketAngle));
    ctx.lineTo(baseX + finLength * Math.sin(rocketAngle + Math.PI / 6), baseY + finLength * Math.cos(rocketAngle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    const flameLength = Math.random() * 10 + 15;
    const flameWidth = 8;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + (flameWidth / 2) * Math.sin(rocketAngle), baseY + (flameWidth / 2) * Math.cos(rocketAngle));
    ctx.lineTo(baseX - flameLength * Math.cos(rocketAngle), baseY + flameLength * Math.sin(rocketAngle));
    ctx.lineTo(baseX - (flameWidth / 2) * Math.sin(rocketAngle), baseY - (flameWidth / 2) * Math.cos(rocketAngle));
    ctx.closePath();
    ctx.fill();
  };

  const drawExplosion = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 0, 1)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0.8)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);

    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(255, 200, 0, 1)';
    ctx.shadowBlur = 30;
    ctx.fill();

    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  const animateExplosion = (simX: number, simY: number) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // If center explosion, map (0,0) -> canvas center for nice visuals
    const canvasX = EARTH_CENTER_X + (simX / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;
    const canvasY = EARTH_CENTER_Y - (simY / EARTH_RADIUS) * EARTH_CANVAS_RADIUS;

    let radius = 0;
    const maxRadius = 100;
    const animationSpeed = 1.4;

    const animate = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // redraw Earth
      ctx.save();
      ctx.beginPath();
      ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, EARTH_CANVAS_RADIUS, 0, 2 * Math.PI);
      ctx.clip();
      if (earthImageRef.current && earthImageRef.current.complete) {
        ctx.drawImage(
          earthImageRef.current,
          EARTH_CENTER_X - EARTH_IMAGE_SIZE / 2 + EARTH_IMAGE_OFFSET,
          EARTH_CENTER_Y - EARTH_IMAGE_SIZE / 2 + EARTH_IMAGE_OFFSET,
          EARTH_IMAGE_SIZE,
          EARTH_IMAGE_SIZE
        );
      } else {
        ctx.fillStyle = '#0b2940';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      ctx.restore();

      // outline
      ctx.beginPath();
      ctx.arc(EARTH_CENTER_X, EARTH_CENTER_Y, EARTH_CANVAS_RADIUS, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 5;
      ctx.stroke();

      drawExplosion(ctx, canvasX, canvasY, radius);
      radius += animationSpeed;

      if (radius < maxRadius) requestAnimationFrame(animate);
    };

    animate();
  };

  // ---------------- START / PAUSE / RESET (UI unchanged) ----------------
  // The missile will start from the left (negative X direction) at a high radius and travel toward (0,0).
  // Gravity is ON (accelerates toward center).
  const startSimulation = () => {
    if (simulationState.isRunning) return;

    // Start altitude: max altitude, e.g., 800 km (same choice as before)
    const START_ALTITUDE_M = 800_000; // 800 km
    const startRadius = EARTH_RADIUS + START_ALTITUDE_M;

    // Place missile on the left side (negative X), centered vertically (y=0)
    const startX = -startRadius;
    const startY = 0;

    // Compute unit vector from start toward center (0,0)
    const dirX = 0 - startX; // positive
    const dirY = 0 - startY; // zero
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);
    const unitX = mag > 1e-12 ? dirX / mag : 1;
    const unitY = mag > 1e-12 ? dirY / mag : 0;

    // Use the existing initialVelocity UI value as the initial speed toward center
    const vx = initialVelocity * unitX;
    const vy = initialVelocity * unitY;

    setSimulationState({
      isRunning: true,
      time: 0,
      positionX: startX,
      positionY: startY,
      velocityX: vx,
      velocityY: vy
    });

    setHasCrashed(false);
    setTrajectory([{ x: startX, y: startY }]);
  };

  const pauseSimulation = () => {
    setSimulationState((prev) => ({ ...prev, isRunning: false }));
  };

  const resetSimulation = () => {
    setSimulationState({
      isRunning: false,
      time: 0,
      positionX: EARTH_RADIUS,
      positionY: 0,
      velocityX: 0,
      velocityY: 0
    });
    setHasCrashed(false);
    setTrajectory([]);
    setupSimulation();
  };

  return (
    <div className="row">
      <div className="col-12 col-md-8 my-3">
        <SimulationDisplay canvasRef={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
      </div>
      <div className="col-12 col-md-4 my-3">
        <ControlsPanel
          miniCanvasRef={miniCanvasRef}
          launchAngle={launchAngle}
          setLaunchAngle={setLaunchAngle}
          initialVelocity={initialVelocity}
          setInitialVelocity={setInitialVelocity}
          timeScale={timeScale}
          setTimeScale={setTimeScale}
          startSimulation={startSimulation}
          pauseSimulation={pauseSimulation}
          resetSimulation={resetSimulation}
          simulationState={simulationState}
          EARTH_RADIUS={EARTH_RADIUS}
        />
      </div>
    </div>
  );
};

export default PayloadSimulation;
