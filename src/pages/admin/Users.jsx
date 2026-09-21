import ManagedUserPanel from '../../components/dashboard/ManagedUserPanel';
import { customerService } from '../../services/managedUserService';

export default function Users() {
  return <ManagedUserPanel mode="customer" service={customerService} />;
}
