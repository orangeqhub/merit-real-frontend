import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ToastContainer from './components/common/ToastContainer';
import ConfirmDialog from './components/common/ConfirmDialog';
import GlobalLoader from './components/common/GlobalLoader';
import NavigationLoader from './components/common/NavigationLoader';
import CompareBar from './components/properties/CompareBar';
import LocationPermissionPopup from './components/common/LocationPermissionPopup';
import { useAuthStore } from './store/authStore';
import { useFavouritesStore } from './store/favouritesStore';
import { loaderService } from './store/loaderStore';
import { clearLegacyMockData } from './utils/clearLegacyMockData';

clearLegacyMockData();

function App() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const refreshFavourites = useFavouritesStore((s) => s.refresh);

  useEffect(() => {
    loaderService.show();
    Promise.resolve(init()).finally(() => loaderService.hide());
  }, [init]);

  useEffect(() => {
    refreshFavourites(user?.id);
  }, [user, refreshFavourites]);

  return (
    <BrowserRouter>
      <NavigationLoader />
      <AppRoutes />
      <GlobalLoader />
      <CompareBar />
      <ToastContainer />
      <ConfirmDialog />
      <LocationPermissionPopup />
    </BrowserRouter>
  );
}

export default App;
