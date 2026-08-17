import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import PromotionFloatingWidget from '../promotions/PromotionFloatingWidget';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen-ios flex-col bg-warm-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <PromotionFloatingWidget />
    </div>
  );
}
