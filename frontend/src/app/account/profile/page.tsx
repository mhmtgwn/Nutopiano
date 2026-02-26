'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  MapPin,
  Shield,
  type LucideProps,
} from 'lucide-react';

import Button from '@/components/common/Button';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import api from '@/services/api';
import { getPanelHomePathByRole, getPanelLabelByRole } from '@/lib/role-routing';

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

interface ProfileResponse {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

type TabType = 'profile' | 'security' | 'admin';
type MenuItem = {
  kind: 'tab' | 'link';
  label: string;
  icon: ComponentType<LucideProps>;
  tab?: TabType;
  href?: string;
};

export default function ProfilePage() {
  const { user, status } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) return;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const profile = response.data;

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
            token: null,
          }),
        );
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Profil bilgileri alinamadi.');
        dispatch(setAuthError(message));
        toast.error(message);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void fetchProfile();
  }, [user, dispatch]);

  useEffect(() => {
    if (!user) return;
    const parts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
    setCompanyName(user.businessId ? `Isletme #${user.businessId}` : '');
    setTaxNumber('');
  }, [user]);

  const isLoading = isLoadingProfile || status === 'authenticating';

  if (isLoading && !user) {
    return (
      <div className="rounded-[24px] border border-[#e3d9c9] bg-[#fbf7f0] p-6">
        <p className="text-sm text-[#6f6a60]">Profil bilgileri yukleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasBackofficePanel = user.role !== 'CUSTOMER';

  const handleSaveProfile = async () => {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();

    try {
      setIsSavingProfile(true);
      dispatch(startAuth());

      const response = await api.patch<ProfileResponse>('/auth/profile', {
        name: fullName || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      const profile = response.data;

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
          token: null,
        }),
      );

      toast.success('Profil guncellendi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Profil guncellenemedi.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      toast.error('Mevcut sifrenizi girin.');
      return;
    }

    if (!trimmedNew) {
      toast.error('Yeni sifrenizi girin.');
      return;
    }

    if (!trimmedConfirm) {
      toast.error('Yeni sifrenizi dogrulayin.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      toast.error('Yeni sifre ve dogrulama sifresi eslesmiyor.');
      return;
    }

    if (trimmedNew.length < 6) {
      toast.error('Yeni sifre en az 6 karakter olmali.');
      return;
    }

    try {
      setIsChangingPassword(true);
      dispatch(startAuth());
      await api.post('/auth/change-password', {
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Sifre guncellendi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Sifre guncellenemedi.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const menuItems: MenuItem[] = [
    { kind: 'tab', tab: 'profile', label: 'Hesap Bilgileri', icon: Home },
    { kind: 'tab', tab: 'security', label: 'Guvenlik', icon: Shield },
    ...(hasBackofficePanel
      ? [
          {
            kind: 'tab' as const,
            tab: 'admin' as const,
            label: getPanelLabelByRole(user.role),
            icon: LayoutDashboard,
          },
        ]
      : []),
    { kind: 'link', href: '/account/orders', label: 'Siparislerim', icon: CreditCard },
    { kind: 'link', href: '/account/favorites', label: 'Favoriler', icon: Heart },
    { kind: 'link', href: '/account/addresses', label: 'Adreslerim', icon: MapPin },
  ];

  return (
    <div className="rounded-[24px] border border-[#e3d9c9] bg-[#f7f3eb] p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-serif leading-none text-[#21443b]">Hesap Bilgileri</h1>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#ddd3c4] bg-[#f7f3eb] px-6 text-sm font-semibold text-[#21443b] shadow-[0_6px_16px_rgba(26,60,52,0.08)] transition hover:bg-[#fffdfa]"
        >
          Profili Duzenle
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[20px] border border-[#e7dfd2] bg-[#fbf8f2] p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = item.kind === 'tab' && item.tab === activeTab;
            return (
              <button
                key={item.kind === 'tab' ? `tab-${item.tab}` : `link-${item.href}`}
                type="button"
                onClick={() => {
                  if (item.kind === 'tab' && item.tab) {
                    setActiveTab(item.tab);
                    return;
                  }

                  if (item.kind === 'link' && item.href) {
                    router.push(item.href);
                  }
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? 'bg-[#efebe3] text-[#21443b]'
                    : 'text-[#756f63] hover:bg-[#f4efe7] hover:text-[#21443b]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </aside>

        <section className="rounded-[20px] border border-[#e7dfd2] bg-white p-4 md:p-5">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-[#5f584d]">
                  <span>Ad</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#5f584d]">
                  <span>Soyad</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#5f584d] md:col-span-2">
                  <span>E-posta</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#5f584d] md:col-span-2">
                  <span>Telefon</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#5f584d] md:col-span-2">
                  <span>Sirket Adi</span>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#5f584d] md:col-span-2">
                  <span>Vergi No</span>
                  <input
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                  />
                </label>
              </div>

              <div className="border-t border-[#ece5d9] pt-4">
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  isLoading={isSavingProfile}
                  className="mx-auto flex h-11 min-w-[180px] rounded-2xl"
                >
                  Guncelle
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <label className="space-y-1 text-sm font-medium text-[#5f584d]">
                <span>Mevcut Sifre</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-[#5f584d]">
                <span>Yeni Sifre</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-[#5f584d]">
                <span>Yeni Sifre (Dogrula)</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fdfbf7] px-3 text-base text-[#21443b] outline-none transition focus:border-[#21443b]/40"
                />
              </label>
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                isLoading={isChangingPassword}
                className="mt-2 h-11 rounded-2xl"
              >
                Sifreyi Guncelle
              </Button>
            </div>
          )}

          {activeTab === 'admin' && hasBackofficePanel && (
            <div className="space-y-3">
              <p className="text-sm text-[#6b655b]">
                Rolunuze ait operasyon arayuzune gecis yapabilirsiniz.
              </p>
              <Button
                type="button"
                onClick={() => router.push(getPanelHomePathByRole(user.role))}
                className="h-11 rounded-2xl"
              >
                Panele Git
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
