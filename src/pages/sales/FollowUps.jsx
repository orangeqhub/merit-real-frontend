import DecisionRequests from '../shared/DecisionRequests';

/** Follow-up monitoring via booking pipeline remarks/history. */
export default function SalesFollowUps() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-brand-800">Follow-ups</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor customer and agent follow-ups on active bookings. Add remarks where permitted.
        </p>
      </div>
      <DecisionRequests type="booking" scope="sales" />
    </div>
  );
}
