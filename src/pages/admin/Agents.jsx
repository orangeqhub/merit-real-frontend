import ManagedUserPanel from '../../components/dashboard/ManagedUserPanel';
import { agentService } from '../../services/managedUserService';

export default function Agents() {
  return <ManagedUserPanel mode="agent" service={agentService} />;
}
