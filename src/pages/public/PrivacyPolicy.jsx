import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Shield,
  User,
  MapPin,
  Home,
  Fingerprint,
  Camera,
  Database,
  Lock,
  Globe,
  CheckCircle2,
  Mail,
  Phone,
  ArrowUp,
} from 'lucide-react';

const SECTIONS = [
  { id: 'introduction', label: 'Introduction', icon: Shield },
  { id: 'registration-data', label: '1. Registration Data', icon: User },
  { id: 'location-usage', label: '2. Location & Positioning', icon: MapPin },
  { id: 'user-content', label: '3. Listings & Enquiries', icon: Home },
  { id: 'device-identifiers', label: '4. Device Identifiers', icon: Fingerprint },
  { id: 'camera-uploads', label: '5. Camera & Uploads', icon: Camera },
  { id: 'purpose-collection', label: '6. Purpose of Collection', icon: Database },
  { id: 'data-security', label: '7. Security & Protection', icon: Lock },
  { id: 'third-party-services', label: '8. Third-Party Integrations', icon: Globe },
  { id: 'user-rights', label: '9. Your Rights & Choices', icon: CheckCircle2 },
  { id: 'contact-details', label: '10. Contact Information', icon: Mail },
];

export default function PrivacyPolicy() {
  const { t } = useTranslation('common');
  const [activeSection, setActiveSection] = useState('introduction');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleScroll = () => {
      // Show/hide scroll-to-top button
      setShowScrollTop(window.scrollY > 400);

      // Determine active section in viewport
      const sectionElements = SECTIONS.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 200;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100; // Offset for sticky headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Hero Header Section */}
      <section className="bg-gradient-to-b from-brand-50 to-warm-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
            <Link to="/" className="hover:underline hover:text-brand-600 transition-colors">
              {t('nav.home') || 'Home'}
            </Link>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-medium text-brand-800">Privacy Policy</span>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-800 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-2.5 text-sm text-gray-500">
              Effective Date: August 21, 2026 | Last Updated: August 21, 2026
            </p>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              At Merit Real Solutions, we value your trust and are committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our website, mobile application, and related services.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          
          {/* Sidebar - Sticky Table of Contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-brand-100 bg-brand-50 p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-800 mb-4">
                Table of Contents
              </h2>
              <nav className="space-y-1.5">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToId(section.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-600 text-warm-white shadow-sm'
                          : 'text-brand-700 hover:bg-brand-100/50 hover:text-brand-900'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-warm-white' : 'text-brand-500'} />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Privacy Content */}
          <main className="lg:col-span-3 space-y-8">
            
            {/* Introduction Section */}
            <article
              id="introduction"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Shield className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">Introduction</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  Merit Real Solutions (referred to as "Company", "we", "us", or "our") operates the website{' '}
                  <a href="https://meritrealsolutions.in" className="text-brand-600 font-semibold hover:underline">
                    meritrealsolutions.in
                  </a>{' '}
                  and related mobile software solutions. We are dedicated to providing a secure, transparent platform for buyers, sellers, mediators, and sales executives in real estate transactions.
                </p>
                <p>
                  By accessing or using our services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with any terms of this policy, please do not use our services or submit personal data to us.
                </p>
              </div>
            </article>

            {/* Section 1: Account Registration Data */}
            <article
              id="registration-data"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <User className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">1. Account Registration Data</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  To register an account or use certain features on our platform (such as listing properties, expressing interest, or scheduling visits), we collect key contact and identity information. This includes:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Full Name:</strong> To personalize your account and identify you to other users during transactions.
                  </li>
                  <li>
                    <strong className="text-brand-800">Phone Number:</strong> For verifying your identity via OTP, sending alerts, and allowing verified users (e.g. buyers, sellers) to connect with you.
                  </li>
                  <li>
                    <strong className="text-brand-800">Email Address:</strong> For account updates, receipt of purchases, newsletters, and official correspondence.
                  </li>
                  <li>
                    <strong className="text-brand-800">Physical Address:</strong> For property documentation, verifying user authenticity (specifically for agents, mediators, and sellers), and rendering location-based services.
                  </li>
                </ul>
              </div>
            </article>

            {/* Section 2: Location Usage */}
            <article
              id="location-usage"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <MapPin className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">2. Location & Positioning</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  Our platform offers location-based features to simplify property searches and verify listings. We collect and process location details as follows:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Nearby Property Search:</strong> With your permission, we access your device’s geographical coordinates to display nearby residential, commercial, or agricultural plots.
                  </li>
                  <li>
                    <strong className="text-brand-800">Map Positioning:</strong> Location data helps display plots dynamically on maps (using Leaflet and Google Maps) to help you explore and navigate to the property site.
                  </li>
                  <li>
                    <strong className="text-brand-800">Verification of Site Visits:</strong> To prevent fraudulent claims and ensure safety, we log location coordinates when scheduling or carrying out site visits.
                  </li>
                </ul>
                <p className="text-sm bg-brand-50 text-brand-800 p-3 rounded-lg border border-brand-100">
                  <strong>Control:</strong> You can enable or disable location services via your device settings or browser permissions at any time. However, disabling this might limit some location-based functionalities.
                </p>
              </div>
            </article>

            {/* Section 3: Property listings & Enquiry Content */}
            <article
              id="user-content"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Home className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">3. Property Listings & Enquiry Content</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  Any content you post or send through the Merit Real Solutions portal is stored securely and processed to fulfill your requests:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Property Listings:</strong> When sellers list a property, we store and show plot dimensions, pricing, descriptions, structures, and documents to interested buyers.
                  </li>
                  <li>
                    <strong className="text-brand-800">Enquiries & Expressed Interests:</strong> When you enquire about a listing, we collect details on your preference, budget, and specific message. This is forwarded to the respective owner, mediator, or sales representative to help resolve your request.
                  </li>
                  <li>
                    <strong className="text-brand-800">Booking Requests & Transactions:</strong> Data regarding booked plots, agreements, and receipt generations are retained to provide a historical ledger of your investments.
                  </li>
                </ul>
              </div>
            </article>

            {/* Section 4: Device Identifiers */}
            <article
              id="device-identifiers"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Fingerprint className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">4. Device & Session Identifiers</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  To secure user accounts, diagnose server issues, and analyze user interactions, we automatically log specific technical metadata:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Device Details:</strong> Device models, OS versions, unique device identifiers, browser types, and IP addresses.
                  </li>
                  <li>
                    <strong className="text-brand-800">Session & Activity:</strong> Log-in logs, pages visited, time spent, search queries, and general interface interaction details.
                  </li>
                  <li>
                    <strong className="text-brand-800">Cookies & Local Storage:</strong> We use local storage (such as state tokens via Zustand/React) and cookies to keep you logged in, preserve user settings (like selected language), and hold comparison lists.
                  </li>
                </ul>
              </div>
            </article>

            {/* Section 5: Camera & Photo Uploads */}
            <article
              id="camera-uploads"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Camera className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">5. Camera & Photo Uploads</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  Certain features require access to your device’s camera or file storage system to upload relevant images and documents:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Property Photos:</strong> Sellers can take photos or upload images of their properties to build visually appealing listings.
                  </li>
                  <li>
                    <strong className="text-brand-800">Document Uploads:</strong> Mediators, employees, and sellers can upload ID proofs, land registry certificates, or bank details to comply with our mandatory verification processes.
                  </li>
                  <li>
                    <strong className="text-brand-800">Profile Images:</strong> Custom profile pictures uploaded to personalize accounts.
                  </li>
                </ul>
                <p className="text-sm bg-brand-50 text-brand-800 p-3 rounded-lg border border-brand-100">
                  <strong>Control:</strong> Camera and gallery access will prompt you for explicit permission on your device before access. You can revoke these rights via your operating system settings.
                </p>
              </div>
            </article>

            {/* Section 6: Purpose of Collection */}
            <article
              id="purpose-collection"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Database className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">6. Purpose of Collection</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  We gather and use your personal information for distinct business purposes, including:
                </p>
                <div className="grid gap-4 sm:grid-cols-2 mt-2">
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <h4 className="font-semibold text-brand-800 mb-1">Service Facilitation</h4>
                    <p className="text-sm text-gray-500">Creating and maintaining accounts, listing plots, managing bookings, and executing real estate transactions.</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <h4 className="font-semibold text-brand-800 mb-1">Communication & Support</h4>
                    <p className="text-sm text-gray-500">Responding to enquiries, providing updates, sending receipt PDFs, and offering support via phone, SMS, and WhatsApp.</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <h4 className="font-semibold text-brand-800 mb-1">Security & Moderation</h4>
                    <p className="text-sm text-gray-500">Verifying listings, checking ID submissions of mediators, and detecting fraud or security events.</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <h4 className="font-semibold text-brand-800 mb-1">Legal & Regulatory</h4>
                    <p className="text-sm text-gray-500">Complying with applicable Indian laws, maintaining records for tax audits, and supporting dispute resolutions.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Section 7: Data Security */}
            <article
              id="data-security"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Lock className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">7. Security & Protection</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  The safety of your data is paramount to us. We implement industry-standard organizational and technical safeguards, including:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">HTTPS Encryption:</strong> All information exchanged between your device and our servers is encrypted in transit using Secure Socket Layer (SSL/TLS) protocols.
                  </li>
                  <li>
                    <strong className="text-brand-800">Restricted Access:</strong> Access to sensitive verification documents and user data is strictly restricted to authorized employees on a need-to-know basis.
                  </li>
                  <li>
                    <strong className="text-brand-800">Data Minimization:</strong> We review our storage practices regularly and remove or anonymize files and listings that are no longer necessary for processing.
                  </li>
                </ul>
                <p className="text-sm text-gray-500 italic">
                  Note: While we apply strict measures, no system over the Internet is 100% secure. We cannot guarantee the absolute security of your transmission, but we pledge to notify users promptly in case of any critical security incident.
                </p>
              </div>
            </article>

            {/* Section 8: Third-Party Services */}
            <article
              id="third-party-services"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Globe className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">8. Third-Party Integrations</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  We coordinate with trusted third-party providers to enhance features, perform analysis, or comply with legal requirements:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Map APIs (Google Maps & Leaflet):</strong> To display map layouts, street views, and location listings. These providers have their own respective privacy policies.
                  </li>
                  <li>
                    <strong className="text-brand-800">Hosting & Storage Services:</strong> Cloud service platforms (e.g. AWS or similar secure database providers) where our database and uploaded assets are securely housed.
                  </li>
                  <li>
                    <strong className="text-brand-800">Analytics Providers:</strong> Services that track website usage trends to assist us in optimizing our application interface.
                  </li>
                </ul>
              </div>
            </article>

            {/* Section 9: User Rights */}
            <article
              id="user-rights"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <CheckCircle2 className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">9. Your Rights & Choices</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  Depending on your jurisdiction and role, you have control over how your data is managed:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-brand-800">Access and Portability:</strong> You can request a summary of the personal information we hold about you.
                  </li>
                  <li>
                    <strong className="text-brand-800">Correction:</strong> You can update inaccuracies in your profile name, email, phone, and address from your user dashboard at any time.
                  </li>
                  <li>
                    <strong className="text-brand-800">Deletion (Right to be Forgotten):</strong> You can request the deletion of your account. Please note that we may retain certain records for tax, legal, or audit compliance as required by law.
                  </li>
                  <li>
                    <strong className="text-brand-800">Opt-Out:</strong> You can opt out of promotional notifications or communications from our system settings.
                  </li>
                </ul>
              </div>
            </article>

            {/* Section 10: Contact details */}
            <article
              id="contact-details"
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm scroll-mt-24"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                <Mail className="h-6 w-6 text-brand-600" />
                <h2 className="text-xl font-bold text-brand-800">10. Contact Information</h2>
              </div>
              <div className="prose max-w-none text-gray-600 space-y-4 leading-relaxed">
                <p>
                  If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please feel free to reach out to our privacy officer:
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <Mail className="text-brand-600 shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Email Address</p>
                      <a href="mailto:info@meritrealsolutions.in" className="text-sm font-semibold text-brand-800 hover:text-brand-600 transition-colors">
                        info@meritrealsolutions.in
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <Phone className="text-brand-600 shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Phone Support</p>
                      <a href="tel:+919999999999" className="text-sm font-semibold text-brand-800 hover:text-brand-600 transition-colors">
                        +91 99999 99999
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </article>

          </main>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-warm-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
