import SalesDirectory from './SalesDirectory';
import { agentService } from '../../services/managedUserService';

export default function SalesAgents() {
  return (
    <SalesDirectory
      title="Agents"
      subtitle="Registered agents, grades, and status."
      service={agentService}
      idLabel="Agent ID"
      extraColumn={{
        header: 'Assigned Grade',
        value: (u) => u.agentGradeLabel || u.agentGrade || '—',
      }}
    />
  );
}
