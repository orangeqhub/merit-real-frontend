import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { userService } from '../../services/userService';
import { toast } from '../../store/toastStore';
import { getWalletSoundPrefs, setWalletSoundPrefs, unlockWalletAudio } from '../../utils/walletSounds';

export default function AccountSettingsForm({ profilePath }) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user, setUser } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const preferences = user?.preferences || { emailNotifications: true, smsNotifications: true };
  const [soundPrefs, setSoundPrefsState] = useState(() => getWalletSoundPrefs());

  async function handleTogglePreference(key) {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    const updated = await userService.updateUser(user.id, { preferences: nextPreferences });
    setUser(updated);
    toast.success(t('toast.settingsUpdated'));
  }

  function handleSoundPref(key) {
    unlockWalletAudio();
    const next = setWalletSoundPrefs({ [key]: !soundPrefs[key] });
    setSoundPrefsState(next);
    toast.success(t('toast.settingsUpdated'));
  }

  const showWalletSounds = user?.role === 'agent' || user?.role === 'mediator';

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">{t('accountSettings.language')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-full border px-4 py-1.5 text-sm ${language === 'en' ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}
          >
            {t('language.en', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={() => setLanguage('te')}
            className={`rounded-full border px-4 py-1.5 text-sm ${language === 'te' ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}
          >
            {t('language.te', { ns: 'common' })}
          </button>
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
        <span className="text-sm text-gray-700">{t('accountSettings.emailNotifications')}</span>
        <input
          type="checkbox"
          checked={Boolean(preferences.emailNotifications)}
          onChange={() => handleTogglePreference('emailNotifications')}
          className="h-4 w-4 rounded border-gray-300 text-brand-600"
        />
      </label>

      <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
        <span className="text-sm text-gray-700">{t('accountSettings.smsNotifications')}</span>
        <input
          type="checkbox"
          checked={Boolean(preferences.smsNotifications)}
          onChange={() => handleTogglePreference('smsNotifications')}
          className="h-4 w-4 rounded border-gray-300 text-brand-600"
        />
      </label>

      {showWalletSounds && (
        <>
          <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <span className="text-sm text-gray-700">Wallet notification sounds</span>
            <input
              type="checkbox"
              checked={Boolean(soundPrefs.walletSoundsEnabled)}
              onChange={() => handleSoundPref('walletSoundsEnabled')}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <span className="text-sm text-gray-700">Mute all notification sounds</span>
            <input
              type="checkbox"
              checked={Boolean(soundPrefs.muteAllSounds)}
              onChange={() => handleSoundPref('muteAllSounds')}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </label>
        </>
      )}

      <Link
        to={profilePath}
        className="inline-block rounded-lg border border-brand-300 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
      >
        {t('profileMenu.editProfile', { ns: 'common' })}
      </Link>
    </div>
  );
}
