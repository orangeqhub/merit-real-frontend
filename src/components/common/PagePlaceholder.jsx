export default function PagePlaceholder({ title }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-800">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">This section is under construction.</p>
    </div>
  );
}
