import SalesDirectory from './SalesDirectory';
import { customerService } from '../../services/managedUserService';

export default function SalesCustomers() {
  return (
    <SalesDirectory
      title="Customers"
      subtitle="Registered customers and their status."
      service={customerService}
      idLabel="Customer ID"
      extraColumn={{
        header: 'Preferred Property Type',
        value: (u) => u.preferredPropertyType || '—',
      }}
    />
  );
}
