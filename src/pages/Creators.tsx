import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Menu, X, Video, Info } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

// Platform Icons
const TikTokIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// "All" filter icon (based on the user's reference image - 3 lines with arrow)
const AllFilterIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="6" x2="11" y2="6" />
    <line x1="4" y1="12" x2="11" y2="12" />
    <line x1="4" y1="18" x2="11" y2="18" />
    <line x1="15" y1="6" x2="20" y2="6" />
    <line x1="15" y1="12" x2="20" y2="12" />
    <line x1="15" y1="18" x2="20" y2="18" />
    <polyline points="17 20 20 17 17 14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type PlatformFilter = 'all' | 'tiktok' | 'youtube' | 'instagram' | 'facebook';

const Creators = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PlatformFilter>('all');

  // Placeholder video data (empty for now)
  const videos: any[] = [];

  const handleAddVideo = () => {
    // TODO: Implement package selection and payment modal here
    toast.info(
      lang === 'hu' 
        ? 'Hamarosan innen tudod majd hozzáadni a videóidat.' 
        : 'You will soon be able to add your videos from here.'
    );
  };

  const filters: { id: PlatformFilter; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'all', icon: <AllFilterIcon className="w-5 h-5" /> },
    { id: 'tiktok', icon: <TikTokIcon className="w-5 h-5" /> },
    { id: 'youtube', icon: <YouTubeIcon className="w-5 h-5" />, disabled: true },
    { id: 'instagram', icon: <InstagramIcon className="w-5 h-5" />, disabled: true },
    { id: 'facebook', icon: <FacebookIcon className="w-5 h-5" />, disabled: true },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              <button 
                onClick={() => { setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-lg bg-gray-100 text-gray-900 font-medium"
              >
                Dashboard
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/creators/how-it-works'); }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-600"
              >
                {lang === 'hu' ? 'Hogyan működik' : 'How it works'}
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Header */}
      <header 
        className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        {/* Back Button - Profile page style */}
        <button
          onClick={() => navigate('/dashboard')}
          className="relative rounded-full hover:scale-110 transition-all"
          style={{
            padding: 'clamp(8px, 2vw, 12px)',
            minWidth: 'clamp(40px, 10vw, 56px)',
            minHeight: 'clamp(40px, 10vw, 56px)'
          }}
          title={t('common.back')}
        >
          {/* BASE SHADOW */}
          <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} aria-hidden />
          
          {/* OUTER FRAME */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-700 via-red-600 to-red-900 border-2 border-red-400/50 shadow-lg" aria-hidden />
          
          {/* MIDDLE FRAME */}
          <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-red-600 via-red-500 to-red-800" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }} aria-hidden />
          
          {/* INNER LAYER */}
          <div className="absolute inset-[5px] rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-700" style={{ boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.3)' }} aria-hidden />
          
          {/* SPECULAR HIGHLIGHT */}
          <div className="absolute inset-[5px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)' }} aria-hidden />
          
          {/* Icon */}
          <LogOut 
            className="text-white relative z-10 -scale-x-100" 
            style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
          />
        </button>

        {/* Title - Desktop */}
        <h1 className="hidden md:block text-xl font-bold text-gray-900">
          Creator Dashboard
        </h1>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <button 
            onClick={() => navigate('/creators/how-it-works')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Info className="w-4 h-4" />
            {lang === 'hu' ? 'Hogyan működik' : 'How it works'}
          </button>
          <button
            onClick={handleAddVideo}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            {lang === 'hu' ? 'Videolink hozzáadása' : 'Add video link'}
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 text-gray-600"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 24px)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          
          {/* Mobile: Add Video Button (big, prominent) */}
          <div className="md:hidden mb-6">
            <button
              onClick={handleAddVideo}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
            >
              <Plus className="w-6 h-6" />
              {lang === 'hu' ? 'Videolink hozzáadása' : 'Add video link'}
            </button>
          </div>

          {/* Section Title */}
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {lang === 'hu' ? 'Megosztott videóid' : 'Your shared videos'}
          </h2>

          {/* Platform Filter Icons */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => !filter.disabled && setActiveFilter(filter.id)}
                disabled={filter.disabled}
                className={`p-3 rounded-xl transition-all ${
                  activeFilter === filter.id
                    ? 'bg-gray-900 text-white shadow-lg'
                    : filter.disabled
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={filter.id === 'all' 
                  ? (lang === 'hu' ? 'Összes' : 'All')
                  : filter.id.charAt(0).toUpperCase() + filter.id.slice(1)
                }
              >
                {filter.icon}
              </button>
            ))}
          </div>

          {/* Video List / Empty State */}
          {videos.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Video className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'hu' ? 'Még nem osztottál meg videót' : "You haven't shared a video yet"}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {lang === 'hu' 
                  ? 'Hamarosan itt fognak megjelenni a TikTok videóid, amelyeket a játékosaink látni fognak.'
                  : 'Your TikTok videos that our players will see will appear here soon.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Video cards will go here */}
            </div>
          )}

          {/* "How it works" Section - Always visible below */}
          <section className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {lang === 'hu' ? 'Hogyan működik?' : 'How it works?'}
              </h2>
              <button
                onClick={() => navigate('/creators/how-it-works')}
                className="text-sm text-pink-500 hover:text-pink-600 font-medium"
              >
                {lang === 'hu' ? 'Részletek →' : 'Details →'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {lang === 'hu' ? '30 napig kötetlenül!' : '30 days free trial!'}
                </h3>
                <p className="text-sm text-gray-600">
                  {lang === 'hu' 
                    ? 'Próbáld ki ingyen, és döntsd el később.'
                    : 'Try it for free and decide later.'}
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {lang === 'hu' ? 'Kiválasztod a videód linkjét!' : 'Select your video link!'}
                </h3>
                <p className="text-sm text-gray-600">
                  {lang === 'hu' 
                    ? 'Add meg a TikTok videód URL-jét.'
                    : 'Enter your TikTok video URL.'}
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {lang === 'hu' ? 'A többit mi intézzük!' : 'We handle the rest!'}
                </h3>
                <p className="text-sm text-gray-600">
                  {lang === 'hu' 
                    ? 'A videód automatikusan megjelenik a játékosainknak.'
                    : 'Your video automatically appears to our players.'}
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">
                  4
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {lang === 'hu' ? 'Kövesd az eredményed!' : 'Track your results!'}
                </h3>
                <p className="text-sm text-gray-600">
                  {lang === 'hu' 
                    ? 'Nézd meg, hogyan alakulnak a számaid.'
                    : 'See how your numbers are doing.'}
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Creators;
