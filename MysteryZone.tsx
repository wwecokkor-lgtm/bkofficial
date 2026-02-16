import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const MysteryZone = () => {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{code: string, discount: string} | null>(null);
  
  // Show logic: Show if user is logged in and hasn't claimed yet (Local storage sim for demo)
  useEffect(() => {
    const claimed = localStorage.getItem(`mystery_claimed_${userProfile?.uid}`);
    if (userProfile && !claimed) {
      const timer = setTimeout(() => setIsOpen(true), 5000); // Show after 5s
      return () => clearTimeout(timer);
    }
  }, [userProfile]);

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    // Simulate API call to claim reward
    setTimeout(() => {
      const rewards = [
        { code: 'LUCKY10', discount: '10% OFF' },
        { code: 'MYSTERY20', discount: '20% OFF' },
        { code: 'BK50', discount: '৳50 OFF' },
        { code: 'SUPER30', discount: '30% OFF' }
      ];
      const win = rewards[Math.floor(Math.random() * rewards.length)];
      setResult(win);
      setIsSpinning(false);
      localStorage.setItem(`mystery_claimed_${userProfile?.uid}`, 'true');
    }, 3000);
  };

  if (!isOpen || !userProfile) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" onClick={() => !isSpinning && setIsOpen(false)}></div>
      
      <div className="relative bg-gradient-to-br from-purple-700 to-indigo-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center text-white overflow-hidden border-4 border-yellow-400">
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>

        {!result ? (
          <>
            <h2 className="text-3xl font-bold mb-2 text-yellow-300 drop-shadow-md">MYSTERY BOX</h2>
            <p className="text-purple-200 mb-8">Spin to win an exclusive discount!</p>
            
            <div className="relative w-48 h-48 mx-auto mb-8">
               {/* Wheel Visual */}
               <div className={`w-full h-full rounded-full border-8 border-yellow-400 bg-white flex items-center justify-center shadow-lg ${isSpinning ? 'animate-spin' : ''}`} style={{animationDuration: '0.5s'}}>
                  <div className="grid grid-cols-2 gap-1 w-full h-full rounded-full overflow-hidden opacity-80">
                     <div className="bg-red-500"></div><div className="bg-blue-500"></div>
                     <div className="bg-green-500"></div><div className="bg-yellow-500"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-4xl">🎁</span>
                  </div>
               </div>
               {/* Pointer */}
               <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-yellow-400 text-3xl">▼</div>
            </div>

            <button 
              onClick={handleSpin} 
              disabled={isSpinning}
              className="bg-yellow-400 text-purple-900 font-bold text-lg px-8 py-3 rounded-full shadow-lg hover:bg-yellow-300 transition transform hover:scale-105 disabled:opacity-50"
            >
              {isSpinning ? 'Spinning...' : 'SPIN NOW'}
            </button>
          </>
        ) : (
          <div className="animate-bounce-in">
             <div className="text-6xl mb-4">🎉</div>
             <h3 className="text-2xl font-bold text-white mb-2">CONGRATULATIONS!</h3>
             <p className="text-purple-200">You won <span className="text-yellow-300 font-bold text-xl">{result.discount}</span></p>
             
             <div className="bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg p-4 my-6">
                <p className="text-xs uppercase tracking-widest mb-1">Your Coupon Code</p>
                <p className="text-3xl font-mono font-bold text-yellow-300 tracking-wider select-all">{result.code}</p>
             </div>

             <button 
               onClick={() => setIsOpen(false)}
               className="bg-white text-purple-900 font-bold px-6 py-2 rounded-full hover:bg-gray-100 transition"
             >
               Claim & Close
             </button>
          </div>
        )}

        {!isSpinning && !result && (
           <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-300">
             <i className="fas fa-times text-xl"></i>
           </button>
        )}
      </div>
    </div>
  );
};

export default MysteryZone;