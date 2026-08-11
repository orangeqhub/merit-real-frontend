import { Link } from 'react-router-dom';
import MapLayoutSection from '../../components/home/MapLayoutSection';

export default function MapLayoutPage() {
  return (
    <div className="pb-10">
      <div className="border-b border-gray-100 bg-brand-50/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div>
            <Link to="/" className="text-sm text-brand-700 hover:underline">← Back to home</Link>
            <h1 className="mt-1 text-2xl font-bold text-brand-900">Map Layout & Plot Booking</h1>
            <p className="mt-1 text-sm text-gray-600">
              Pan, zoom, and inspect plots on the interactive layout. Book available plots from the status board.
            </p>
          </div>
        </div>
      </div>
      <MapLayoutSection compact={false} />
    </div>
  );
}
