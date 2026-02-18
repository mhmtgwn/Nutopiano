'use client';

import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { setCredentials, startAuth, setAuthError } from '@/store/userSlice';
import api from '@/services/api';
import { setAuthToken, getAuthToken } from '@/utils/helpers';
import Button from '@/components/common/Button';

type AuthScreen = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileResponse {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  if (!('response' in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return fallback;
  if (!('data' in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return fallback;
  if (!('message' in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const dispatch = useAppDispatch();
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Forgot password form
  const [resetPhone, setResetPhone] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');

  if (!isOpen) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedPhone = loginPhone.trim();
    const trimmedPassword = loginPassword.trim();

    if (!trimmedPhone) {
      toast.error('Lütfen telefon numarası girin.');
      return;
    }
    if (!trimmedPassword) {
      toast.error('Lütfen şifrenizi girin.');
      return;
    }

    try {
      setIsSubmitting(true);
      dispatch(startAuth());

      const loginResponse = await api.post<{ accessToken: string }>(
        '/auth/login',
        { phone: trimmedPhone, password: trimmedPassword },
      );

      const token = loginResponse.data.accessToken;
      setAuthToken(token);

      const profileResponse = await api.get<ProfileResponse>('/auth/profile');
      const profile = profileResponse.data;

      dispatch(
        setCredentials({
          user: {
            id: profile.userId,
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            role: profile.role,
            businessId: profile.businessId,
          },
          token,
        }),
      );

      toast.success('Giriş başarılı.');
      onClose();
      setLoginPhone('');
      setLoginPassword('');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Giriş yapılırken bir hata oluştu.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = registerName.trim();
    const trimmedPhone = registerPhone.trim();
    const trimmedEmail = registerEmail.trim();
    const trimmedPassword = registerPassword.trim();
    const trimmedConfirm = registerConfirmPassword.trim();

    if (!trimmedName) {
      toast.error('Lütfen adınızı girin.');
      return;
    }
    if (!trimmedPhone) {
      toast.error('Lütfen telefon numarası girin.');
      return;
    }
    if (!trimmedEmail) {
      toast.error('Lütfen email girin.');
      return;
    }
    if (!trimmedPassword) {
      toast.error('Lütfen şifre girin.');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    if (trimmedPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setIsSubmitting(true);
      dispatch(startAuth());

      const registerResponse = await api.post<{ accessToken: string }>(
        '/auth/register',
        {
          name: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
          password: trimmedPassword,
        },
      );

      const token = registerResponse.data.accessToken;
      setAuthToken(token);

      const profileResponse = await api.get<ProfileResponse>('/auth/profile');
      const profile = profileResponse.data;

      dispatch(
        setCredentials({
          user: {
            id: profile.userId,
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            role: profile.role,
            businessId: profile.businessId,
          },
          token,
        }),
      );

      toast.success('Kayıt başarılı.');
      onClose();
      setRegisterName('');
      setRegisterPhone('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Kayıt yapılırken bir hata oluştu.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordRequest = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedPhone = resetPhone.trim();
    const trimmedEmail = resetEmail.trim();

    if (!trimmedPhone) {
      toast.error('Lütfen telefon numarası girin.');
      return;
    }
    if (!trimmedEmail) {
      toast.error('Lütfen email girin.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/forgot-password', {
        phone: trimmedPhone,
        email: trimmedEmail,
      });
      toast.success('İşlem kodu email adresinize gönderildi.');
      setResetStep('verify');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'İşlem yapılırken bir hata oluştu.');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedPhone = resetPhone.trim();
    const trimmedCode = resetCode.trim();
    const trimmedPassword = resetPassword.trim();

    if (!trimmedPhone) {
      toast.error('Lütfen telefon numarası girin.');
      return;
    }
    if (!trimmedCode) {
      toast.error('Lütfen işlem kodunu girin.');
      return;
    }
    if (!trimmedPassword) {
      toast.error('Lütfen yeni şifre girin.');
      return;
    }
    if (trimmedPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/reset-password', {
        phone: trimmedPhone,
        code: trimmedCode,
        newPassword: trimmedPassword,
      });
      toast.success('Şifre değiştirildi. Lütfen giriş yapın.');
      setScreen('login');
      setResetPhone('');
      setResetEmail('');
      setResetCode('');
      setResetPassword('');
      setResetStep('request');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Şifre sıfırlanırken bir hata oluştu.');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-2xl)]">
        {/* Header */}
        <div className="border-b border-[var(--neutral-200)] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              {screen === 'login' && 'Giriş Yap'}
              {screen === 'register' && 'Kayıt Ol'}
              {screen === 'forgot' && 'Şifre Sıfırla'}
            </h2>
            <p className="mt-1 text-xs text-[var(--neutral-500)]">
              {screen === 'login' && 'Hesabınıza giriş yapın'}
              {screen === 'register' && 'Yeni bir hesap oluşturun'}
              {screen === 'forgot' && 'Şifrenizi yeniden ayarlayın'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Login Screen */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="loginPhone" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Telefon
                </label>
                <input
                  id="loginPhone"
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="5XXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="loginPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Şifre
                </label>
                <input
                  id="loginPassword"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="••••••"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="flex-1">
                  Giriş Yap
                </Button>
              </div>

              <div className="space-y-2 border-t border-[var(--neutral-200)] pt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setScreen('forgot')}
                  className="text-[var(--primary-800)] hover:underline"
                >
                  Şifremi unuttum
                </button>
                <div>
                  <span className="text-[var(--neutral-500)]">Hesabınız yok mu? </span>
                  <button
                    type="button"
                    onClick={() => setScreen('register')}
                    className="text-[var(--primary-800)] font-semibold hover:underline"
                  >
                    Kayıt ol
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Register Screen */}
          {screen === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="registerName" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Ad Soyad
                </label>
                <input
                  id="registerName"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="Adınız Soyadınız"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="registerPhone" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Telefon
                </label>
                <input
                  id="registerPhone"
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="5XXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="registerEmail" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Email
                </label>
                <input
                  id="registerEmail"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="ornek@domain.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="registerPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Şifre
                </label>
                <input
                  id="registerPassword"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="••••••"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="registerConfirmPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Şifre (Doğrula)
                </label>
                <input
                  id="registerConfirmPassword"
                  type="password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  placeholder="••••••"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="flex-1">
                  Kayıt Ol
                </Button>
              </div>

              <div className="border-t border-[var(--neutral-200)] pt-4 text-center text-sm">
                <span className="text-[var(--neutral-500)]">Zaten hesabınız var mı? </span>
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="text-[var(--primary-800)] font-semibold hover:underline"
                >
                  Giriş yap
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Screen */}
          {screen === 'forgot' && (
            <form onSubmit={resetStep === 'request' ? handleForgotPasswordRequest : handleResetPassword} className="space-y-4">
              {resetStep === 'request' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="resetPhone" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Telefon
                    </label>
                    <input
                      id="resetPhone"
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="5XXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="resetEmail" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Email
                    </label>
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="ornek@domain.com"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="flex-1">
                      Kod Gönder
                    </Button>
                  </div>
                </>
              )}

              {resetStep === 'verify' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="resetCode" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      İşlem Kodu
                    </label>
                    <input
                      id="resetCode"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="000000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="resetPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Yeni Şifre
                    </label>
                    <input
                      id="resetPassword"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="••••••"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => setResetStep('request')}
                      variant="secondary"
                      className="flex-1"
                    >
                      Geri
                    </Button>
                    <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="flex-1">
                      Şifreyi Sıfırla
                    </Button>
                  </div>
                </>
              )}

              <div className="border-t border-[var(--neutral-200)] pt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="text-[var(--primary-800)] font-semibold hover:underline"
                >
                  Giriş sayfasına dön
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
