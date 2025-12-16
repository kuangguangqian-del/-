import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from './components/GameEngine';
import { GameState, UserProfile, LeaderboardEntry } from './types';
import { LEVELS, MUSIC_URL } from './constants';
import Webcam from 'react-webcam'; // Using react-webcam for the login snapshot for simplicity

// --- Snow Effect Component ---
const Snow = () => {
  const snowflakes = Array.from({ length: 20 }).map((_, i) => (
    <div 
      key={i} 
      className="snowflake" 
      style={{ 
        left: `${Math.random() * 100}vw`, 
        animationDuration: `${Math.random() * 5 + 5}s`,
        opacity: Math.random()
      }}
    >
      ❄
    </div>
  ));
  return <>{snowflakes}</>;
};

// --- Main App ---
const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOGIN);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Webcam ref for taking snapshot
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    // Load leaderboard
    const saved = localStorage.getItem('noseNinja_leaderboard');
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    }
    
    // Load User
    const savedUser = localStorage.getItem('noseNinja_currentUser');
    if (savedUser) {
       setUser(JSON.parse(savedUser));
       setGameState(GameState.MENU);
    }

    // Init Audio
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      audioRef.current?.play().catch(e => console.log("Audio play failed (interaction needed)", e));
    } else {
      // Keep playing music in menu, pause in login? Let's keep it playing if user interacted
      // audioRef.current?.pause();
    }
  }, [gameState]);

  const handleLogin = (name: string) => {
    // Capture snapshot
    const imageSrc = webcamRef.current?.getScreenshot();
    
    if (!name || !imageSrc) return;

    const newUser: UserProfile = {
      id: Date.now().toString(),
      name: name,
      avatarUrl: imageSrc,
      maxLevel: 1,
      highScore: 0
    };

    setUser(newUser);
    localStorage.setItem('noseNinja_currentUser', JSON.stringify(newUser));
    setGameState(GameState.MENU);
  };

  const startGame = () => {
    setScore(0);
    // If user has reached a high level before, we could offer to start there,
    // but the prompt says "start previous level". Let's assume start at 1 for fresh game or maxLevel.
    // For arcade flow, let's start at 1 but with "Previous Best" visible.
    // However, prompt says "identify avatar... start previous level".
    setLevel(user?.maxLevel || 1);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    
    if (user) {
        const newRecord: LeaderboardEntry = {
            name: user.name,
            score: finalScore,
            avatarUrl: user.avatarUrl,
            date: new Date().toLocaleDateString()
        };

        const updatedLeaderboard = [...leaderboard, newRecord]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Keep top 10
        
        setLeaderboard(updatedLeaderboard);
        localStorage.setItem('noseNinja_leaderboard', JSON.stringify(updatedLeaderboard));

        // Update max level if current level is higher
        const updatedUser = { 
            ...user, 
            maxLevel: Math.max(user.maxLevel, level),
            highScore: Math.max(user.highScore, finalScore)
        };
        setUser(updatedUser);
        localStorage.setItem('noseNinja_currentUser', JSON.stringify(updatedUser));
    }
  };

  const clearUser = () => {
    localStorage.removeItem('noseNinja_currentUser');
    setUser(null);
    setGameState(GameState.LOGIN);
  };

  return (
    <div className="relative min-h-screen bg-slate-900 text-white overflow-hidden selection:bg-red-500 selection:text-white">
      <Snow />

      {/* --- State: LOGIN --- */}
      {gameState === GameState.LOGIN && (
        <div className="flex flex-col items-center justify-center min-h-screen z-20 relative p-4 space-y-6">
          <h1 className="text-6xl font-christmas text-red-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse">
            Christmas Nose Ninja
          </h1>
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border-2 border-green-500 shadow-2xl flex flex-col items-center">
            <p className="mb-4 text-green-300">Identify yourself, Ninja!</p>
            <div className="relative w-64 h-64 bg-black rounded-full overflow-hidden border-4 border-gold mb-4 shadow-lg">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    mirrored={true}
                />
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                handleLogin((form.elements.namedItem('username') as HTMLInputElement).value);
              }}
              className="flex flex-col gap-4 w-full"
            >
                <input 
                    name="username"
                    type="text" 
                    placeholder="Enter your Ninja Name" 
                    className="px-4 py-2 rounded-lg text-black bg-slate-100 focus:outline-none focus:ring-4 focus:ring-red-500 transition-all"
                    required
                    maxLength={10}
                />
                <button type="submit" className="bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform">
                    📸 Capture Face & Login
                </button>
            </form>
          </div>
        </div>
      )}

      {/* --- State: MENU --- */}
      {gameState === GameState.MENU && user && (
        <div className="flex flex-col items-center justify-center min-h-screen z-20 relative p-4">
           <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 p-2 rounded-full">
               <img src={user.avatarUrl} alt="User" className="w-10 h-10 rounded-full border-2 border-green-400" />
               <span className="font-bold pr-2">{user.name}</span>
               <button onClick={clearUser} className="text-xs text-red-400 hover:text-red-200">Logout</button>
           </div>

           <h1 className="text-5xl font-christmas text-green-400 mb-8 drop-shadow-lg">Ready to Slice?</h1>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
               {/* Stats Card */}
               <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/20">
                   <h2 className="text-2xl font-bold mb-4 text-gold">Your Stats</h2>
                   <div className="space-y-2">
                       <p>Max Level Reached: <span className="text-green-400 text-xl">{user.maxLevel}</span></p>
                       <p>Highest Score: <span className="text-yellow-400 text-xl">{user.highScore}</span></p>
                       <p>Next Challenge: {LEVELS.find(l => l.levelNumber === user.maxLevel)?.title || "Master Ninja"}</p>
                   </div>
                   <button 
                    onClick={startGame}
                    className="mt-6 w-full bg-gradient-to-r from-green-600 to-green-500 py-4 rounded-xl font-bold text-2xl shadow-green-500/50 shadow-lg hover:scale-105 transition-transform"
                   >
                    🎅 Start Level {user.maxLevel}
                   </button>
               </div>

               {/* Leaderboard */}
               <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/20 max-h-96 overflow-y-auto custom-scrollbar">
                   <h2 className="text-2xl font-bold mb-4 text-red-400">🎄 Leaderboard</h2>
                   <ul className="space-y-3">
                       {leaderboard.length === 0 ? <p className="text-gray-400 italic">No records yet. Be the first!</p> : null}
                       {leaderboard.map((entry, idx) => (
                           <li key={idx} className="flex items-center gap-3 bg-black/30 p-2 rounded-lg">
                               <span className="font-mono text-gray-400 w-6 text-center">#{idx + 1}</span>
                               <img src={entry.avatarUrl} className="w-8 h-8 rounded-full border border-white/30" alt="Avt" />
                               <span className="flex-1 truncate">{entry.name}</span>
                               <span className="font-bold text-yellow-400">{entry.score}</span>
                           </li>
                       ))}
                   </ul>
               </div>
           </div>
        </div>
      )}

      {/* --- State: PLAYING --- */}
      {gameState === GameState.PLAYING && (
          <>
            <GameEngine 
                gameState={gameState}
                setGameState={setGameState}
                score={score}
                setScore={setScore}
                level={level}
                setLevel={setLevel}
                onGameOver={handleGameOver}
            />
            {/* HUD */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-30">
                <div className="flex flex-col">
                    <div className="text-4xl font-black text-white drop-shadow-[2px_2px_0_#ef4444]">
                        {score}
                    </div>
                    <div className="text-sm font-bold text-green-400 tracking-wider uppercase">
                        Score
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-christmas text-yellow-300 animate-bounce">
                        {LEVELS.find(l => l.levelNumber === level)?.title || (level === 99 ? "HIDDEN BOSS" : `Level ${level}`)}
                    </div>
                </div>

                <div className="bg-black/40 px-3 py-1 rounded-full border border-white/20">
                    <span className="text-xs text-gray-300">Use your 👃 Nose to slice!</span>
                </div>
            </div>

            {/* Hidden Level Indicator */}
            {level === 99 && (
                <div className="absolute top-20 w-full text-center pointer-events-none z-20">
                     <h2 className="text-4xl font-black text-purple-500 animate-pulse stroke-white">⚡ BOSS STAGE ⚡</h2>
                     <p className="text-white drop-shadow-md">Slice the heroes!</p>
                </div>
            )}
          </>
      )}

      {/* --- State: GAME OVER --- */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h2 className="text-7xl font-black text-red-600 mb-4 transform -rotate-3 border-4 border-white p-4 bg-white shadow-xl">GAME OVER</h2>
            <div className="text-white text-3xl mb-8">
                Final Score: <span className="text-yellow-400 font-bold">{score}</span>
            </div>
            <button 
                onClick={() => setGameState(GameState.MENU)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform hover:scale-110"
            >
                Back to Menu
            </button>
        </div>
      )}
      
      {/* Footer / Copyright */}
      <div className="absolute bottom-2 w-full text-center text-xs text-gray-500 z-10 pointer-events-none">
          Powered by Gemini & MediaPipe
      </div>
    </div>
  );
};

export default App;
