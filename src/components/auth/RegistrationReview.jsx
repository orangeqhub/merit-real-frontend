import { Pencil, FileCheck2 } from 'lucide-react';

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

function Section({ title, stepIndex, onEdit, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-800">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-gold-50 hover:text-brand-800"
        >
          <Pencil size={12} /> Edit
        </button>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

const ROLE_LABELS = { customer: 'Buyer / Seller', agent: 'Agent', sales_member: 'Sales Member' };

/**
 * Final-step read-only summary of everything entered so far, grouped to
 * match the wizard's own steps, with an Edit link back into each one.
 */
export default function RegistrationReview({ values, role, uploads, referralAgent, agentCategoryName, onEdit }) {
  const { profilePhoto, aadhaarProof, panProof } = uploads;

  return (
    <div className="space-y-3">
      <Section title="Basic Information" stepIndex={0} onEdit={onEdit}>
        <Row label="Full Name" value={values.name} />
        <Row label="Mobile Number" value={values.mobile} />
        <Row label="Email" value={values.email} />
      </Section>

      <Section title="Personal Details" stepIndex={1} onEdit={onEdit}>
        <Row label="City" value={values.city} />
        <Row label="District" value={values.district} />
        <Row label="Address" value={values.address} />
        <Row label="Occupation" value={values.occupation} />
        <Row label="Aadhaar Number" value={values.aadhaarNumber} />
        <Row label="PAN Number" value={values.panNumber} />
      </Section>

      <Section title="Account Information" stepIndex={2} onEdit={onEdit}>
        <Row label="Password" value="••••••••" />
      </Section>

      <Section title="Role & Professional Information" stepIndex={3} onEdit={onEdit}>
        <Row label="Register As" value={ROLE_LABELS[role] || role} />
        {role === 'customer' && (
          <>
            <Row label="Preferred Property Type" value={values.preferredPropertyType} />
            <Row label="Referral Agent" value={referralAgent ? `${referralAgent.name} (${referralAgent.memberId})` : 'None'} />
          </>
        )}
        {role === 'agent' && <Row label="Agent Category" value={agentCategoryName || 'Not selected'} />}
        <Row label="Aadhaar Proof" value={aadhaarProof ? aadhaarProof.fileName : 'Not uploaded'} />
        <Row label="PAN Proof" value={panProof ? panProof.fileName : 'Not uploaded'} />
      </Section>

      <Section title="Profile" stepIndex={4} onEdit={onEdit}>
        <Row label="Username" value={values.username} />
        <Row label="Profile Photo" value={profilePhoto ? profilePhoto.fileName : 'Not uploaded'} />
      </Section>

      <div className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 p-3 text-xs text-brand-800">
        <FileCheck2 size={16} className="mt-0.5 shrink-0 text-gold-600" />
        <p>Please review everything above carefully. Your account will stay <strong>Pending</strong> until an admin approves it.</p>
      </div>
    </div>
  );
}
