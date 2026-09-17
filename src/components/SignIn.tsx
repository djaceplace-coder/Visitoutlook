import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Fingerprint, ShieldCheck, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';

interface SignInProps {
  onSignIn: () => void;
}

type SignInStep = 'identifier' | 'password';

export function SignIn({ onSignIn }: SignInProps) {
  const [step, setStep] = useState<SignInStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);

  // Validation & step handling
  const handleIdentifierSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage('Enter a valid email address, phone number, or username.');
      return;
    }
    // Basic format check
    if (trimmed.length < 3) {
      setErrorMessage('Please enter a valid credential to continue.');
      return;
    }
    setErrorMessage('');
    setStep('password');
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter the password for your account.');
      return;
    }
    setErrorMessage('');

    /**
     * -------------------------------------------------------------
     * [AUTHENTICATION PLUG-IN POINT]
     * In a production deployment, real authentication would be plugged in here:
     * - Microsoft Authentication Library (MSAL) for Microsoft Graph / Outlook accounts
     * - Firebase Auth (signInWithEmailAndPassword or OAuth popup)
     * - Backend REST /api/auth/login endpoint session exchange
     * -------------------------------------------------------------
     */
    onSignIn();
  };

  const handleBackToIdentifier = () => {
    setStep('identifier');
    setErrorMessage('');
    setPassword('');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F4F8FC] flex flex-col justify-center overflow-hidden">
      {/* Decorative low-contrast watermark / curves in canvas background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <svg
          className="absolute -right-20 -top-20 w-[60vw] max-w-[900px] h-[60vw] max-h-[900px] opacity-[0.035] text-brand-cobalt"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 200 C 150 100, 350 100, 450 250 C 550 400, 350 480, 200 450 C 50 420, -50 300, 50 200 Z"
            fill="currentColor"
          />
        </svg>
        <svg
          className="absolute -left-32 bottom-0 w-[55vw] max-w-[800px] h-[55vw] max-h-[800px] opacity-[0.025] text-brand-cobalt"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="300" cy="300" r="280" stroke="currentColor" strokeWidth="40" />
        </svg>
      </div>

      {/* Content block: Left-of-centre at roughly 35-40% viewport */}
      <div className="relative z-10 w-full px-4 sm:px-8 py-8 md:py-12 flex flex-col items-center lg:items-start lg:pl-[14%] xl:pl-[18%]">
        <div className="w-full max-w-[440px]">
          {/* Main Card: Sharp corners, flat white surface, diffuse shadow, 44px internal padding */}
          <div className="bg-white rounded-none border border-gray-200/70 p-7 sm:p-[44px] shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
            {/* 1. Logo mark + Wordmark lockup row (top-left, ~24px tall) */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-6 h-6 rounded-none overflow-hidden bg-[#F5F5F5] border border-gray-200/60 flex-shrink-0">
                <img
                  src="/Gemini_Generated_Image_ll19vill19vill19.jpg"
                  alt="Outlook Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-semibold text-lg text-brand-cobalt tracking-tight leading-none">
                Outlook
              </span>
            </div>

            {step === 'identifier' ? (
              /* Step 1: Identifier Input */
              <form onSubmit={handleIdentifierSubmit} noValidate>
                {/* 2. Heading */}
                <h1 className="text-2xl font-semibold text-[#1F2937] tracking-tight mb-4">
                  Sign in
                </h1>

                {/* 3. Underlined input field: no box, no fill, 1px bottom rule */}
                <div className="mt-4 mb-2">
                  <input
                    type="text"
                    id="login-identifier"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Email, phone, or username"
                    autoFocus
                    className="w-full bg-transparent border-0 border-b border-gray-400 focus:border-b-2 focus:border-brand-cobalt py-2 text-base text-[#1F2937] placeholder-gray-500 rounded-none focus:outline-none transition-colors"
                  />
                  {errorMessage && (
                    <p className="mt-2 text-xs text-[#D83B01] font-medium leading-relaxed">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* 4. Helper line: No account? Create one */}
                <div className="mt-4 text-sm text-[#4B5563]">
                  <span>No account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('newuser@outlook.com');
                      setErrorMessage('');
                    }}
                    className="text-brand-cobalt hover:underline font-normal inline"
                  >
                    Create one!
                  </button>
                </div>

                {/* 5. Second helper link on its own line */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => alert('Account recovery options will be emailed to your recovery contact.')}
                    className="text-sm text-brand-cobalt hover:underline font-normal block"
                  >
                    Can&apos;t access your account?
                  </button>
                </div>

                {/* 6. Right-aligned primary button with largest gap above */}
                <div className="mt-9 flex justify-end">
                  <button
                    type="submit"
                    disabled={!identifier.trim()}
                    className="w-[120px] py-2.5 bg-brand-cobalt hover:bg-brand-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-none transition-colors text-center shadow-xs"
                  >
                    Next
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Password Input */
              <form onSubmit={handlePasswordSubmit} noValidate>
                {/* Entered identifier with back button */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={handleBackToIdentifier}
                    className="p-1 -ml-1 text-gray-600 hover:text-brand-charcoal hover:bg-gray-100 rounded-none transition-colors"
                    title="Change identifier"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span className="text-sm text-[#374151] font-medium truncate max-w-[280px]">
                    {identifier}
                  </span>
                </div>

                {/* Heading */}
                <h1 className="text-2xl font-semibold text-[#1F2937] tracking-tight mb-4">
                  Enter password
                </h1>

                {/* Underlined password field */}
                <div className="mt-4 mb-2">
                  <input
                    type="password"
                    id="login-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Password"
                    autoFocus
                    className="w-full bg-transparent border-0 border-b border-gray-400 focus:border-b-2 focus:border-brand-cobalt py-2 text-base text-[#1F2937] placeholder-gray-500 rounded-none focus:outline-none transition-colors"
                  />
                  {errorMessage && (
                    <p className="mt-2 text-xs text-[#D83B01] font-medium leading-relaxed">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Forgot password link */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => alert('Password reset verification code has been dispatched.')}
                    className="text-sm text-brand-cobalt hover:underline font-normal block"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Right-aligned primary button */}
                <div className="mt-9 flex justify-end">
                  <button
                    type="submit"
                    disabled={!password}
                    className="w-[120px] py-2.5 bg-brand-cobalt hover:bg-brand-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-none transition-colors text-center shadow-xs"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Secondary Panel: Separate white card below main card, detached by ~12px */}
          <div className="mt-[12px] bg-white rounded-none border border-gray-200/70 shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptionsPanel(!showOptionsPanel)}
              className="w-full flex items-center justify-between p-4 px-6 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <KeyRound size={20} className="text-gray-600 group-hover:text-brand-cobalt transition-colors" />
                <span className="text-sm font-medium text-[#1F2937]">Sign-in options</span>
              </div>
              {showOptionsPanel ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>

            {/* Expandable options list */}
            {showOptionsPanel && (
              <div className="border-t border-gray-100 bg-[#FAFBFD] divide-y divide-gray-100/80">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('passkey.user@outlook.com');
                    setStep('password');
                    setPassword('passkey-verified');
                  }}
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100/80 transition-colors text-sm text-[#374151]"
                >
                  <Fingerprint size={18} className="text-brand-cobalt" />
                  <div>
                    <div className="font-medium">Sign in with a passkey</div>
                    <div className="text-xs text-gray-500">Use Windows Hello, Face ID, or security key</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('securitycode.user@outlook.com');
                    setStep('password');
                    setPassword('code-verified');
                  }}
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100/80 transition-colors text-sm text-[#374151]"
                >
                  <ShieldCheck size={18} className="text-brand-cobalt" />
                  <div>
                    <div className="font-medium">Sign in with a code</div>
                    <div className="text-xs text-gray-500">Send a one-time verification code via email or SMS</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('device.user@outlook.com');
                    setStep('password');
                    setPassword('device-approved');
                  }}
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100/80 transition-colors text-sm text-[#374151]"
                >
                  <Smartphone size={18} className="text-brand-cobalt" />
                  <div>
                    <div className="font-medium">Sign in on another device</div>
                    <div className="text-xs text-gray-500">Scan a QR code or approve on your mobile device</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

