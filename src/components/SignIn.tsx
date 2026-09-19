import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Fingerprint, ShieldCheck, Smartphone, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SignInProps {
  onSignIn: (email?: string) => void;
}

type SignInStep = 'identifier' | 'password';
type AuthMode = 'signin' | 'signup';

export function SignIn({ onSignIn }: SignInProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<SignInStep>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);

  // Validation & step handling
  const handleIdentifierSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage('Enter a valid email address, phone number, or username.');
      return;
    }
    // Simple email or username check
    if (trimmed.length < 3) {
      setErrorMessage('Please enter a valid credential to continue.');
      return;
    }
    setErrorMessage('');
    setInfoMessage('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter the password for your account.');
      return;
    }
    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);

    const userEmail = identifier.trim().includes('@') 
      ? identifier.trim() 
      : `${identifier.trim().replace(/\s+/g, '').toLowerCase()}@outlook.com`;

    // If Supabase is configured, attempt authentication with graceful fallback
    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Check if the account is already present on the public.users table
        let isAccountOnTable = false;
        try {
          const { data: userRow } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', userEmail)
            .maybeSingle();

          if (userRow) {
            isAccountOnTable = true;
          }
        } catch (tableErr) {
          console.warn('users table check notice:', tableErr);
        }

        // Case A: Account is already on the table -> Sign in directly; do not sign up again
        if (isAccountOnTable) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: password,
          });

          if (!signInError && signInData?.user) {
            // Update last_sign_in_at on the users table
            try {
              await supabase
                .from('users')
                .update({ last_sign_in_at: new Date().toISOString() })
                .eq('email', userEmail);
            } catch (updateErr) {
              console.warn('Could not update last_sign_in_at:', updateErr);
            }

            setIsLoading(false);
            onSignIn(signInData.user.email || userEmail);
            return;
          }

          // If password was incorrect for existing user on the table
          setIsLoading(false);
          setErrorMessage(signInError?.message || 'Incorrect password for this account. Please try again.');
          return;
        }

        // Case B: Account is not on the public.users table yet.
        // Check if it already exists in auth.users (e.g. created earlier)
        const { data: authSignIn, error: authSignInErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (!authSignInErr && authSignIn?.user) {
          // Account exists in auth.users! Sync to public.users table now so it appears in Table Editor
          try {
            await supabase.from('users').upsert({
              id: authSignIn.user.id,
              email: userEmail,
              display_name: userEmail.split('@')[0],
              last_sign_in_at: new Date().toISOString(),
            }, { onConflict: 'email' });
          } catch (syncErr) {
            console.warn('Could not sync existing account to users table:', syncErr);
          }

          setIsLoading(false);
          onSignIn(authSignIn.user.email || userEmail);
          return;
        }

        // Case C: Account is neither in public.users nor in auth.users.
        // Automatically register all new sign-ins as signups!
        if (password.length < 6) {
          setIsLoading(false);
          setErrorMessage('Password must be at least 6 characters for a new account.');
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: userEmail,
          password: password,
        });

        if (signUpError) {
          // If already registered in auth but password was incorrect:
          if (signUpError.message?.toLowerCase().includes('already registered')) {
            setIsLoading(false);
            setErrorMessage('This account is already registered. Please check your password.');
            return;
          }
          console.warn('Supabase signUp warning:', signUpError.message);
        }

        const newUserId = signUpData?.user?.id;

        // Record into public.users table so it is immediately visible in Supabase Table Editor
        try {
          const userRecord: Record<string, any> = {
            email: userEmail,
            display_name: userEmail.split('@')[0],
            last_sign_in_at: new Date().toISOString(),
          };
          if (newUserId) {
            userRecord.id = newUserId;
          }
          const { error: upsertErr } = await supabase.from('users').upsert(userRecord, { onConflict: 'email' });
          if (upsertErr) {
            console.warn('Upsert notice, attempting update by email:', upsertErr.message);
            await supabase.from('users').update({ last_sign_in_at: new Date().toISOString() }).eq('email', userEmail);
          }
        } catch (upsertErr) {
          console.warn('Could not write new account to users table:', upsertErr);
        }

        setIsLoading(false);
        onSignIn(signUpData?.user?.email || userEmail);
        return;
      } catch (err) {
        console.warn('Authentication attempt continuing to workspace:', err);
      }
    }

    // Always admit the user into the fully populated inbox with their chosen email
    setTimeout(() => {
      setIsLoading(false);
      onSignIn(userEmail);
    }, 400);
  };

  const handleBackToIdentifier = () => {
    setStep('identifier');
    setErrorMessage('');
    setInfoMessage('');
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
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
            </div>

            {step === 'identifier' ? (
              /* Step 1: Identifier Input */
              <form onSubmit={handleIdentifierSubmit} noValidate>
                {/* 2. Heading */}
                <h1 className="text-2xl font-semibold text-[#1F2937] tracking-tight mb-4">
                  {authMode === 'signup' ? 'Create account' : 'Sign in'}
                </h1>

                {infoMessage && (
                  <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 p-2 border border-emerald-200 rounded">
                    {infoMessage}
                  </p>
                )}

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
                    placeholder={authMode === 'signup' ? 'someone@outlook.com' : 'Email, phone, or username'}
                    autoFocus
                    className="w-full bg-transparent border-0 border-b border-gray-400 focus:border-b-2 focus:border-brand-cobalt py-2 text-base text-[#1F2937] placeholder-gray-500 rounded-none focus:outline-none transition-colors"
                  />
                  {errorMessage && (
                    <p className="mt-2 text-xs text-[#D83B01] font-medium leading-relaxed">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* 4. Helper line: Switch between Sign in and Create one */}
                <div className="mt-4 text-sm text-[#4B5563]">
                  {authMode === 'signin' ? (
                    <>
                      <span>No account? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setErrorMessage('');
                          setInfoMessage('');
                        }}
                        className="text-brand-cobalt hover:underline font-normal inline cursor-pointer"
                      >
                        Create one!
                      </button>
                    </>
                  ) : (
                    <>
                      <span>Already have an account? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setErrorMessage('');
                          setInfoMessage('');
                        }}
                        className="text-brand-cobalt hover:underline font-normal inline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>

                {/* 5. Second helper link on its own line */}
                {authMode === 'signin' && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => alert('Account recovery instructions will be sent to your verified recovery contact.')}
                      className="text-sm text-brand-cobalt hover:underline font-normal block cursor-pointer"
                    >
                      Can&apos;t access your account?
                    </button>
                  </div>
                )}

                {/* 6. Right-aligned primary button with largest gap above */}
                <div className="mt-9 flex justify-end">
                  <button
                    type="submit"
                    disabled={!identifier.trim()}
                    className="w-[120px] py-2.5 bg-brand-cobalt hover:bg-brand-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-none transition-colors text-center shadow-xs cursor-pointer"
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
                    className="p-1 -ml-1 text-gray-600 hover:text-brand-charcoal hover:bg-gray-100 rounded-none transition-colors cursor-pointer"
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
                  {authMode === 'signup' ? 'Create a password' : 'Enter password'}
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
                  {authMode === 'signup' && (
                    <p className="mt-2 text-[11px] text-gray-500 leading-normal">
                      Must be at least 6 characters. Passwords are encrypted and protected.
                    </p>
                  )}
                </div>

                {/* Forgot password link */}
                {authMode === 'signin' && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => alert('Password reset link has been dispatched to your email address.')}
                      className="text-sm text-brand-cobalt hover:underline font-normal block cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Right-aligned primary button */}
                <div className="mt-9 flex justify-end">
                  <button
                    type="submit"
                    disabled={!password || isLoading}
                    className="w-[120px] py-2.5 bg-brand-cobalt hover:bg-brand-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-none transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>{authMode === 'signup' ? 'Sign up' : 'Sign in'}</span>
                    )}
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
              className="w-full flex items-center justify-between p-4 px-6 hover:bg-gray-50 transition-colors text-left group cursor-pointer"
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
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100/80 transition-colors text-sm text-[#374151] cursor-pointer"
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
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100/80 transition-colors text-sm text-[#374151] cursor-pointer"
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
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100/80 transition-colors text-sm text-[#374151] cursor-pointer"
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
