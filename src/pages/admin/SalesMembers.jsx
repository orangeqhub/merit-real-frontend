import ManagedUserPanel from '../../components/dashboard/ManagedUserPanel';
import { salesMemberService } from '../../services/managedUserService';

export default function SalesMembers() {
  return <ManagedUserPanel mode="sales_member" service={salesMemberService} />;
}
