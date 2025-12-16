import React, { useEffect, useRef, useState } from 'react';
import { TrackingService } from '../services/faceService';
import { GameState, GameObject, Point, Particle, LevelConfig } from '../types';
import { FRUITS, HIDDEN_CHARACTERS, LEVELS, MAX_TRAIL_LENGTH, SFX_SLICE, SFX_GAME_OVER } from '../constants';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: (finalScore: number) => void;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  score, 
  setScore, 
  level, 
  setLevel,
  onGameOver 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackingServiceRef = useRef<TrackingService | null>(null);
  
  // Loading State for AI Models
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Game Logic Refs
  const cursors = useRef<Map<string, Point>>(new Map());
  const trails = useRef<Map<string, Point[]>>(new Map());
  
  const objects = useRef<GameObject[]>([]);
  const particles = useRef<Particle[]>([]);
  const lastSpawnTime = useRef<number>(0);
  const animationFrameId = useRef<number>(0);
  const gameActive = useRef<boolean>(false);
  
  // Audio Refs
  const sliceAudio = useRef<HTMLAudioElement>(new Audio(SFX_SLICE));
  const boomAudio = useRef<HTMLAudioElement>(new Audio(SFX_GAME_OVER));

  // Current Level Config
  const [currentConfig, setCurrentConfig] = useState<LevelConfig>(LEVELS[0]);

  // Update Config when level changes
  useEffect(() => {
    let config = LEVELS.find(l => l.levelNumber === level);
    if (!config) {
        if (level === 99) {
             config = LEVELS.find(l => l.levelNumber === 99);
        } else {
             config = { ...LEVELS[3], levelNumber: level, spawnRate: Math.max(200, 600 - (level * 20)) };
        }
    }
    setCurrentConfig(config || LEVELS[0]);
  }, [level]);

  const spawnObject = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const isHiddenLevel = currentConfig.isHidden;
    const isBomb = !isHiddenLevel && Math.random() < currentConfig.bombChance;
    
    // Pick content
    let type: GameObject['type'] = isBomb ? 'BOMB' : 'FRUIT';
    let contentObj = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    
    if (isHiddenLevel) {
        type = 'HIDDEN_CHARACTER';
        contentObj = HIDDEN_CHARACTERS[Math.floor(Math.random() * HIDDEN_CHARACTERS.length)];
    }

    const x = Math.random() * (canvas.width - 100) + 50;
    const y = canvas.height + 100; // Start slightly below screen
    
    // Velocity
    const vx = (Math.random() - 0.5) * 6; 
    const vy = -(Math.random() * 8 + 14 + (level * 0.5)); 

    const scale = Math.random() * 0.5 + 1.0; 
    const radius = 50 * scale; 

    objects.current.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      vx,
      vy,
      radius: radius, 
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      type: type,
      content: isBomb ? '💣' : contentObj.content,
      color: isBomb ? '#000000' : contentObj.color,
      isSliced: false
    });
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 25; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 1.0,
        color,
        size: Math.random() * 10 + 5
      });
    }
  };

  const updateGame = (timestamp: number) => {
    if (!canvasRef.current || !gameActive.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const canvas = canvasRef.current;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Spawning
    if (timestamp - lastSpawnTime.current > currentConfig.spawnRate) {
      const burstChance = 0.2 + (level * 0.05);
      const count = Math.random() < burstChance ? Math.floor(Math.random() * 2) + 2 : 1;
      
      for(let k=0; k<count; k++) {
        spawnObject();
      }
      lastSpawnTime.current = timestamp;
    }

    // 2. Update Trails
    cursors.current.forEach((pos, key) => {
        if (key !== 'nose') return; 

        if (!trails.current.has(key)) {
            trails.current.set(key, []);
        }
        const trail = trails.current.get(key)!;
        trail.push({ ...pos });
        if (trail.length > MAX_TRAIL_LENGTH) {
            trail.shift();
        }

        // Draw Trail
        if (trail.length > 1) {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                const p1 = trail[i-1];
                const p2 = trail[i];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }
            ctx.lineTo(trail[trail.length-1].x, trail[trail.length-1].y);
            
            ctx.lineWidth = 15;
            ctx.strokeStyle = '#ef4444'; 
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fbbf24'; 
            ctx.stroke();

            ctx.lineWidth = 6;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.stroke();
        }

        // Draw Cursor
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 3. Objects
    for (let i = objects.current.length - 1; i >= 0; i--) {
      const obj = objects.current[i];
      
      obj.x += obj.vx;
      obj.y += obj.vy;
      obj.vy += currentConfig.gravity;
      obj.rotation += obj.rotationSpeed;

      if (obj.y > canvas.height + 100) {
        objects.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation);
      const fontSize = Math.floor(obj.radius * 2); 
      ctx.font = `${fontSize}px Arial`; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.content, 0, 0);
      ctx.restore();

      // Collision
      if (!obj.isSliced) {
        const nosePos = cursors.current.get('nose');
        
        if (nosePos) {
            const dx = nosePos.x - obj.x;
            const dy = nosePos.y - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < obj.radius + 20) {
                if (obj.type === 'BOMB') {
                    gameActive.current = false;
                    boomAudio.current.play().catch(() => {});
                    onGameOver(score);
                    return;
                } else {
                    obj.isSliced = true;
                    
                    const sound = sliceAudio.current.cloneNode() as HTMLAudioElement;
                    sound.volume = 0.5;
                    sound.play().catch(() => {});

                    createExplosion(obj.x, obj.y, obj.color);
                    
                    const points = obj.type === 'HIDDEN_CHARACTER' ? 100 : 10;
                    setScore(prev => {
                        const newScore = prev + points;
                        if (newScore >= currentConfig.targetScore) {
                            if (level === 4) {
                                setLevel(99); 
                            } else if (level !== 99) {
                                setLevel(prevLvl => prevLvl + 1);
                            }
                        }
                        return newScore;
                    });

                    objects.current.splice(i, 1);
                }
            }
        }
      }
    }

    // 4. Particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life -= 0.02;

      if (p.life <= 0) {
        particles.current.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    animationFrameId.current = requestAnimationFrame(updateGame);
  };

  // Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Tracking
  useEffect(() => {
    const init = async () => {
        try {
            setError(null);
            if (videoRef.current) {
              trackingServiceRef.current = new TrackingService(
                videoRef.current,
                // On Face Results
                (results) => {
                  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    if (!isReady) setIsReady(true); // Tracking worked, we are ready

                    const landmarks = results.multiFaceLandmarks[0];
                    const nose = landmarks[4]; // Nose Tip
                    if (canvasRef.current) {
                      // NOTE: MediaPipe camera output is often mirrored visually but coordinates are normalized.
                      // If video CSS is mirrored (scale-x[-1]), we need to flip X to match visual.
                      // Nose X=0 is left of IMAGE. Visual is Right.
                      const x = (1 - nose.x) * canvasRef.current.width;
                      const y = nose.y * canvasRef.current.height;
                      cursors.current.set('nose', { x, y });
                    }
                  } else {
                      cursors.current.delete('nose');
                  }
                },
                // On Hand Results
                (results) => {}
              );
              
              // Start init
              await trackingServiceRef.current.initialize();
            }
        } catch (err: any) {
            console.error("GameEngine: Init failed", err);
            setError(err.message || "Failed to start camera or load AI models.");
        }
    }

    init();

    return () => {
      if (trackingServiceRef.current) {
        trackingServiceRef.current.stop();
      }
    };
  }, []);

  // Game Loop
  useEffect(() => {
    if (gameState === GameState.PLAYING && isReady) {
      gameActive.current = true;
      objects.current = [];
      particles.current = [];
      cursors.current.clear();
      trails.current.clear();
      lastSpawnTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(updateGame);
    } else {
      gameActive.current = false;
      cancelAnimationFrame(animationFrameId.current);
    }

    return () => cancelAnimationFrame(animationFrameId.current);
  }, [gameState, currentConfig, isReady]);

  const handleRetry = () => {
      window.location.reload();
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Video Feed (Hidden but active) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-30 mix-blend-overlay pointer-events-none"
        playsInline
        muted
        autoPlay
      />
      
      {/* Loading/Error Overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center">
            {!error ? (
                <>
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 mb-4"></div>
                    <h2 className="text-2xl font-christmas text-white animate-pulse">
                        Loading Nose Tracker...
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Downloading AI Models & Starting Camera</p>
                </>
            ) : (
                <>
                     <h2 className="text-3xl font-bold text-red-500 mb-4">Setup Failed</h2>
                     <p className="text-white mb-6">{error}</p>
                     <button 
                        onClick={handleRetry}
                        className="bg-white text-red-600 font-bold py-2 px-6 rounded-full hover:bg-gray-200"
                     >
                        Retry
                     </button>
                </>
            )}
        </div>
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 block"
      />
    </div>
  );
};