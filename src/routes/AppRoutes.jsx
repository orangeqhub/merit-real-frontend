import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import RequirePermission from '../components/common/RequirePermission';
import RouteLoadingFallback from '../components/common/RouteLoadingFallback';

import Home from '../pages/public/Home';
import PropertyListing from '../pages/public/PropertyListing';
import PropertyDetail from '../pages/public/PropertyDetail';
import ExpressInterestForm from '../pages/public/ExpressInterestForm';
import ScheduleSiteVisitForm from '../pages/public/ScheduleSiteVisitForm';
import MapLayoutPage from '../pages/public/MapLayoutPage';
import Ventures from '../pages/public/Ventures';
import About from '../pages/public/About';
import Wishlist from '../pages/public/Wishlist';
import PostPropertyType from '../pages/public/PostPropertyType';
import Unauthorized from '../pages/public/Unauthorized';
import NotFound from '../pages/public/NotFound';

import Register from '../pages/auth/Register';
import Login from '../pages/auth/Login';
import AdminLogin from '../pages/auth/AdminLogin';
import ApplicationStatus from '../pages/auth/ApplicationStatus';
import PortalAreaGate from '../components/common/PortalAreaGate';

// Dashboards, Recharts pages and other heavy admin modules are code-split
// per-route: each role's pages only download once that role's dashboard is
// actually visited, instead of bloating the initial public-site bundle.
const BuyerDashboard = lazy(() => import('../pages/buyer/Dashboard'));
const BuyerBrowseProperties = lazy(() => import('../pages/buyer/BrowseProperties'));
const BuyerFavourites = lazy(() => import('../pages/buyer/Favourites'));
const BuyerInterests = lazy(() => import('../pages/buyer/Interests'));
const BuyerPurchases = lazy(() => import('../pages/buyer/Purchases'));
const BuyerPurchaseReceipt = lazy(() => import('../pages/buyer/PurchaseReceipt'));
const BuyerDocuments = lazy(() => import('../pages/buyer/Documents'));
const BuyerBookings = lazy(() => import('../pages/buyer/Bookings'));
const BuyerBookingDetail = lazy(() => import('../pages/buyer/BookingDetail'));
const BuyerVisits = lazy(() => import('../pages/buyer/Visits'));
const BuyerCompare = lazy(() => import('../pages/buyer/Compare'));
const BuyerProfile = lazy(() => import('../pages/buyer/Profile'));
const BuyerSavedSearches = lazy(() => import('../pages/buyer/SavedSearches'));
const BuyerNotifications = lazy(() => import('../pages/buyer/Notifications'));
const BuyerMyPromotions = lazy(() => import('../pages/buyer/MyPromotions'));
const BuyerSettings = lazy(() => import('../pages/buyer/Settings'));
const BuyerMyProperties = lazy(() => import('../pages/seller/MyProperties'));
const BuyerEditProperty = lazy(() => import('../pages/seller/EditProperty'));

const SellerDashboard = lazy(() => import('../pages/seller/Dashboard'));
const SellerMyProperties = lazy(() => import('../pages/seller/MyProperties'));
const SellerAddProperty = lazy(() => import('../pages/seller/AddProperty'));
const SellerEditProperty = lazy(() => import('../pages/seller/EditProperty'));
const SellerEnquiries = lazy(() => import('../pages/seller/Enquiries'));
const SellerVisits = lazy(() => import('../pages/seller/Visits'));
const SellerProfile = lazy(() => import('../pages/seller/Profile'));
const SellerAnalytics = lazy(() => import('../pages/seller/Analytics'));
const SellerNotifications = lazy(() => import('../pages/seller/Notifications'));
const SellerSettings = lazy(() => import('../pages/seller/Settings'));

const MediatorDashboard = lazy(() => import('../pages/mediator/Dashboard'));
const MediatorLeads = lazy(() => import('../pages/mediator/Leads'));
const MediatorPurchases = lazy(() => import('../pages/mediator/Purchases'));
const MediatorBookings = lazy(() => import('../pages/mediator/Bookings'));
const MediatorClosedDeals = lazy(() => import('../pages/mediator/ClosedDeals'));
const MediatorWallet = lazy(() => import('../pages/mediator/Wallet'));
const MediatorBankDetails = lazy(() => import('../pages/mediator/BankDetails'));
const MediatorDocuments = lazy(() => import('../pages/mediator/Documents'));
const MediatorProperties = lazy(() => import('../pages/mediator/Properties'));
const MediatorVisits = lazy(() => import('../pages/mediator/Visits'));
const MediatorFollowUps = lazy(() => import('../pages/mediator/FollowUps'));
const MediatorProfile = lazy(() => import('../pages/mediator/Profile'));
const MediatorCommissionHistory = lazy(() => import('../pages/mediator/CommissionHistory'));
const MediatorNotifications = lazy(() => import('../pages/mediator/Notifications'));
const MediatorSettings = lazy(() => import('../pages/mediator/Settings'));

const EmployeeDashboard = lazy(() => import('../pages/employee/Dashboard'));
const EmployeeVerifications = lazy(() => import('../pages/employee/Verifications'));
const EmployeeVerificationDetail = lazy(() => import('../pages/employee/VerificationDetail'));
const EmployeeProperties = lazy(() => import('../pages/employee/Properties'));
const EmployeePropertyDetail = lazy(() => import('../pages/employee/PropertyModerationDetail'));
const EmployeeEnquiries = lazy(() => import('../pages/employee/Enquiries'));
const EmployeeEnquiryDetail = lazy(() => import('../pages/employee/EnquiryDetail'));
const EmployeeVisits = lazy(() => import('../pages/employee/Visits'));
const EmployeeFollowUps = lazy(() => import('../pages/employee/FollowUps'));
const EmployeeNotifications = lazy(() => import('../pages/employee/Notifications'));
const EmployeeReports = lazy(() => import('../pages/employee/Reports'));
const EmployeeProfile = lazy(() => import('../pages/employee/Profile'));

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminRegistrations = lazy(() => import('../pages/admin/Registrations'));
const AdminUsers = lazy(() => import('../pages/admin/Users'));
const AdminEmployees = lazy(() => import('../pages/admin/Employees'));
const AdminAgents = lazy(() => import('../pages/admin/Agents'));
const AdminSalesMembers = lazy(() => import('../pages/admin/SalesMembers'));
const AdminProperties = lazy(() => import('../pages/admin/Properties'));
const AdminCategories = lazy(() => import('../pages/admin/Categories'));
const AdminMediaRules = lazy(() => import('../pages/admin/MediaRules'));
const AdminCms = lazy(() => import('../pages/admin/Cms'));
const AdminHeroSlides = lazy(() => import('../pages/admin/HeroSlides'));
const AdminPromotions = lazy(() => import('../pages/admin/Promotions'));
const AdminEnquiries = lazy(() => import('../pages/admin/Enquiries'));
const AdminContactMessages = lazy(() => import('../pages/admin/ContactMessages'));
const AdminExpressInterests = lazy(() => import('../pages/admin/ExpressInterests'));
const AdminPurchases = lazy(() => import('../pages/admin/Purchases'));
const AdminClosedDeals = lazy(() => import('../pages/admin/ClosedDeals'));
const AdminWalletRedemptions = lazy(() => import('../pages/admin/WalletRedemptions'));
const AdminWalletReports = lazy(() => import('../pages/admin/WalletReports'));
const AdminDocuments = lazy(() => import('../pages/admin/Documents'));
const AdminBookings = lazy(() => import('../pages/admin/Bookings'));
const AdminMapPlots = lazy(() => import('../pages/admin/MapPlots'));
const AdminVisits = lazy(() => import('../pages/admin/Visits'));
const AdminFollowUps = lazy(() => import('../pages/admin/FollowUps'));
const AdminReports = lazy(() => import('../pages/admin/Reports'));
const AdminNotifications = lazy(() => import('../pages/admin/Notifications'));
const AdminAuditLogs = lazy(() => import('../pages/admin/AuditLogs'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));
const AdminProfile = lazy(() => import('../pages/admin/Profile'));

const SalesDashboard = lazy(() => import('../pages/sales/Dashboard'));
const SalesCustomers = lazy(() => import('../pages/sales/Customers'));
const SalesAgents = lazy(() => import('../pages/sales/Agents'));
const SalesLeads = lazy(() => import('../pages/sales/Leads'));
const SalesContactMessages = lazy(() => import('../pages/sales/ContactMessages'));
const SalesFollowUps = lazy(() => import('../pages/sales/FollowUps'));
const SalesBookings = lazy(() => import('../pages/sales/Bookings'));
const SalesPurchases = lazy(() => import('../pages/sales/Purchases'));
const SalesClosedDeals = lazy(() => import('../pages/sales/ClosedDeals'));
const SalesProperties = lazy(() => import('../pages/sales/Properties'));
const SalesNotifications = lazy(() => import('../pages/sales/Notifications'));
const SalesProfile = lazy(() => import('../pages/sales/Profile'));
const SalesSettings = lazy(() => import('../pages/sales/Settings'));

function DashboardRoute({ role, roles }) {
  const allowedRoles = roles || [role];
  return (
    <ProtectedRoute roles={allowedRoles}>
      <DashboardLayout role={role} />
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/map-layout" element={<MapLayoutPage />} />
          <Route path="/properties" element={<PropertyListing />} />
          <Route path="/properties/category/:categorySlug" element={<PropertyListing />} />
          <Route path="/properties/:propertyId" element={<PropertyDetail />} />
          <Route path="/express-interest/:propertyId" element={<ExpressInterestForm />} />
          <Route path="/schedule-visit/:propertyId" element={<ScheduleSiteVisitForm />} />
          <Route path="/ventures" element={<Ventures />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Navigate to="/about#contact" replace />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route
            path="/post-property"
            element={
              <ProtectedRoute roles={['seller']}>
                <PostPropertyType />
              </ProtectedRoute>
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:role" element={<Navigate to="/register" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/application-status" element={<ApplicationStatus />} />
        </Route>

        <Route path="/buyer" element={<DashboardRoute role="buyer" roles={['buyer', 'customer']} />}>
          <Route index element={<Navigate to="/buyer/dashboard" replace />} />
          <Route path="dashboard" element={<BuyerDashboard />} />
          <Route path="properties" element={<BuyerBrowseProperties />} />
          <Route path="favourites" element={<BuyerFavourites />} />
          <Route path="interests" element={<BuyerInterests />} />
          <Route path="purchases" element={<BuyerPurchases />} />
          <Route path="purchases/:id/receipt" element={<BuyerPurchaseReceipt />} />
          <Route path="documents" element={<BuyerDocuments />} />
          <Route path="bookings" element={<BuyerBookings />} />
          <Route path="bookings/:id" element={<BuyerBookingDetail />} />
          <Route path="visits" element={<BuyerVisits />} />
          <Route path="compare" element={<BuyerCompare />} />
          <Route path="profile" element={<BuyerProfile />} />
          <Route path="saved-searches" element={<BuyerSavedSearches />} />
          <Route path="notifications" element={<BuyerNotifications />} />
          <Route path="promotions" element={<BuyerMyPromotions />} />
          <Route path="settings" element={<BuyerSettings />} />
          <Route path="my-properties" element={<BuyerMyProperties basePath="/buyer/properties" />} />
          <Route path="properties/:id/edit" element={<BuyerEditProperty />} />
        </Route>

        <Route path="/seller" element={<DashboardRoute role="seller" />}>
          <Route path="dashboard" element={<SellerDashboard />} />
          <Route path="properties" element={<SellerMyProperties />} />
          <Route path="properties/new" element={<SellerAddProperty />} />
          <Route path="properties/:id/edit" element={<SellerEditProperty />} />
          <Route path="enquiries" element={<SellerEnquiries />} />
          <Route path="visits" element={<SellerVisits />} />
          <Route path="profile" element={<SellerProfile />} />
          <Route path="analytics" element={<SellerAnalytics />} />
          <Route path="notifications" element={<SellerNotifications />} />
          <Route path="settings" element={<SellerSettings />} />
        </Route>

        <Route path="/mediator" element={<DashboardRoute role="mediator" roles={['mediator', 'agent']} />}>
          <Route path="dashboard" element={<MediatorDashboard />} />
          <Route path="leads" element={<MediatorLeads />} />
          <Route path="purchases" element={<MediatorPurchases />} />
          <Route path="bookings" element={<MediatorBookings />} />
          <Route path="closed-deals" element={<MediatorClosedDeals />} />
          <Route path="wallet" element={<MediatorWallet />} />
          <Route path="bank-details" element={<MediatorBankDetails />} />
          <Route path="documents" element={<MediatorDocuments />} />
          <Route path="properties" element={<MediatorProperties />} />
          <Route path="visits" element={<MediatorVisits />} />
          <Route path="follow-ups" element={<MediatorFollowUps />} />
          <Route path="profile" element={<MediatorProfile />} />
          <Route path="commission" element={<MediatorCommissionHistory />} />
          <Route path="notifications" element={<MediatorNotifications />} />
          <Route path="settings" element={<MediatorSettings />} />
        </Route>

        <Route path="/employee" element={<DashboardRoute role="employee" />}>
          <Route index element={<Navigate to="/" replace />} />
          <Route
            path="dashboard"
            element={<RequirePermission permission="EMPLOYEE_DASHBOARD_VIEW"><EmployeeDashboard /></RequirePermission>}
          />
          <Route
            path="verifications"
            element={<RequirePermission permission="USER_VERIFICATION_VIEW"><EmployeeVerifications /></RequirePermission>}
          />
          <Route
            path="verifications/:id"
            element={<RequirePermission permission="USER_VERIFICATION_VIEW"><EmployeeVerificationDetail /></RequirePermission>}
          />
          <Route
            path="properties"
            element={<RequirePermission permission="PROPERTY_MODERATION_VIEW"><EmployeeProperties /></RequirePermission>}
          />
          <Route
            path="properties/:id"
            element={<RequirePermission permission="PROPERTY_MODERATION_VIEW"><EmployeePropertyDetail /></RequirePermission>}
          />
          <Route
            path="enquiries"
            element={<RequirePermission permission="ENQUIRY_VIEW"><EmployeeEnquiries /></RequirePermission>}
          />
          <Route
            path="enquiries/:id"
            element={<RequirePermission permission="ENQUIRY_VIEW"><EmployeeEnquiryDetail /></RequirePermission>}
          />
          <Route
            path="visits"
            element={<RequirePermission permission="VISIT_VIEW"><EmployeeVisits /></RequirePermission>}
          />
          <Route
            path="follow-ups"
            element={<RequirePermission permission="FOLLOWUP_VIEW"><EmployeeFollowUps /></RequirePermission>}
          />
          <Route
            path="notifications"
            element={<RequirePermission permission="NOTIFICATIONS_VIEW"><EmployeeNotifications /></RequirePermission>}
          />
          <Route
            path="reports"
            element={<RequirePermission permission="REPORTS_VIEW"><EmployeeReports /></RequirePermission>}
          />
          <Route path="profile" element={<EmployeeProfile />} />
        </Route>

        <Route
          path="/admin"
          element={<PortalAreaGate role="admin" dashboardPath="/admin/dashboard" LoginComponent={AdminLogin} />}
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="registrations" element={<AdminRegistrations />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="agents" element={<AdminAgents />} />
          <Route path="sales-members" element={<AdminSalesMembers />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="media-rules" element={<AdminMediaRules />} />
          <Route path="cms" element={<AdminCms />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="contact-messages" element={<AdminContactMessages />} />
          <Route path="express-interests" element={<AdminExpressInterests />} />
          <Route path="purchases" element={<AdminPurchases />} />
          <Route path="closed-deals" element={<AdminClosedDeals />} />
          <Route path="wallet-redemptions" element={<AdminWalletRedemptions />} />
          <Route path="wallet-reports" element={<AdminWalletReports />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="map-plots" element={<AdminMapPlots />} />
          <Route path="visits" element={<AdminVisits />} />
          <Route path="follow-ups" element={<AdminFollowUps />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="settings/hero-slides" element={<AdminHeroSlides />} />
          <Route path="hero-slides" element={<Navigate to="/admin/settings/hero-slides" replace />} />
        </Route>

        <Route path="/sales" element={<DashboardRoute role="sales_member" />}>
          <Route index element={<Navigate to="/sales/dashboard" replace />} />
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="customers" element={<SalesCustomers />} />
          <Route path="agents" element={<SalesAgents />} />
          <Route path="leads" element={<SalesLeads />} />
          <Route path="contact-messages" element={<SalesContactMessages />} />
          <Route path="follow-ups" element={<SalesFollowUps />} />
          <Route path="bookings" element={<SalesBookings />} />
          <Route path="purchases" element={<SalesPurchases />} />
          <Route path="closed-deals" element={<SalesClosedDeals />} />
          <Route path="properties" element={<SalesProperties />} />
          <Route path="notifications" element={<SalesNotifications />} />
          <Route path="profile" element={<SalesProfile />} />
          <Route path="settings" element={<SalesSettings />} />
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
