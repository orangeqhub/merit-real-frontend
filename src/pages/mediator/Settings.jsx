import AccountSettingsForm from '../../components/dashboard/AccountSettingsForm';
import { useAuthStore } from '../../store/authStore';

export default function Settings() {
  const { user } = useAuthStore();
  const profilePath = user?.role === 'agent' ? '/agent/profile' : '/mediator/profile';
  return <AccountSettingsForm profilePath={profilePath} />;
}
