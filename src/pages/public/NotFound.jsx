import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-brand-800">404</h1>
      <p className="mt-2 text-gray-600">Page not found.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-brand-500 px-5 py-2 text-warm-white">
        Go Home
      </Link>
    </div>
  );
}
