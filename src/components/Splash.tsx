import { Logo } from './Logo';

export function Splash() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA]">
      <div className="relative">
        <div className="w-28 h-28 animate-[pulse_1.4s_ease-in-out_infinite]">
          <Logo className="w-full h-full rounded-3xl shadow-sm" />
        </div>
      </div>
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-brand-cobalt"
            style={{
              animation: `bounce-wave 1s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce-wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
