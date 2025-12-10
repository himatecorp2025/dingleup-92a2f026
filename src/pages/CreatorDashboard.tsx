import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Plus, Film, LayoutDashboard, HelpCircle, LogOut } from 'lucide-react';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import creatorsHeroBg from '@/assets/creators-hero-bg.png';
import defaultProfile from '@/assets/default-profile.png';

// Platform icons
const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

type Platform = 'all' | 'tiktok' | 'youtube' | 'instagram' | 'facebook';

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  platform: Platform;
  status: 'active' | 'inactive' | 'error';
  url: string;
}

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  
  // Mock empty video list - will be replaced with real data later
  const [videos] = useState<VideoItem[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleAddVideo = () => {
    // TODO: Implement package selection modal and payment flow
    toast.info(
      lang === 'hu' 
        ? 'Hamarosan innen tudod majd hozzáadni a videóidat.' 
        : 'You will be able to add your videos here soon.'
    );
  };

  const platforms: { key: Platform; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { key: 'all', label: lang === 'hu' ? 'Összes' : 'All', icon: null },
    { key: 'tiktok', label: 'TikTok', icon: <TikTokIcon className="w-4 h-4" /> },
    { key: 'youtube', label: 'YouTube', icon: <YouTubeIcon className="w-4 h-4" />, disabled: true },
    { key: 'instagram', label: 'Insta', icon: <InstagramIcon className="w-4 h-4" />, disabled: true },
    { key: 'facebook', label: 'Facebook', icon: <FacebookIcon className="w-4 h-4" />, disabled: true },
  ];

  const filteredVideos = selectedPlatform === 'all' 
    ? videos 
    : videos.filter(v => v.platform === selectedPlatform);

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" />, 
      onClick: () => { setMobileMenuOpen(false); },
      active: true 
    },
    { 
      label: lang === 'hu' ? 'Hogyan működik' : 'How it works', 
      icon: <HelpCircle className="w-5 h-5" />, 
      onClick: () => { setMobileMenuOpen(false); navigate('/creators/how-it-works'); },
      active: false 
    },
  ];

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'tiktok': return <TikTokIcon className="w-4 h-4 text-white" />;
      case 'youtube': return <YouTubeIcon className="w-4 h-4 text-white" />;
      case 'instagram': return <InstagramIcon className="w-4 h-4 text-white" />;
      case 'facebook': return <FacebookIcon className="w-4 h-4 text-white" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: VideoItem['status']) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels = {
      active: lang === 'hu' ? 'Aktív' : 'Active',
      inactive: lang === 'hu' ? 'Inaktív' : 'Inactive',
      error: lang === 'hu' ? 'Hibás' : 'Error',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: `url(${creatorsHeroBg})`,
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />
      <div 
        className="fixed inset-0 bg-black/60 pointer-events-none"
        style={{
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="absolute top-0 right-0 w-64 h-full bg-[#1a0a2e] border-l border-white/10 p-6"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <nav className="mt-12 space-y-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    item.active 
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white border border-purple-500/30' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden"
        style={{ 
          paddingTop: 'clamp(8px, 2vh, 16px)',
          paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 24px)' 
        }}
      >
        <div className="w-[90vw] max-w-[1000px] mx-auto">
          
          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-between mb-6">
            {/* Left: Back button + Profile */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/creators')}
                className="relative rounded-full hover:scale-110 transition-all p-3"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 border-2 border-purple-400/50" />
                <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-purple-600 via-purple-500 to-purple-800" />
                <LogOut className="text-white relative z-10 -scale-x-100 w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <img 
                  src={profile?.avatar_url || defaultProfile} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover"
                />
                <span className="text-white font-semibold text-lg">
                  {profile?.username || 'Creator'}
                </span>
              </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    item.active 
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white border border-purple-500/30' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right: Add Video Button */}
            <button
              onClick={handleAddVideo}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
              }}
            >
              <Plus className="w-5 h-5" />
              <span>{lang === 'hu' ? 'Videolink hozzáadása' : 'Add video link'}</span>
            </button>
          </header>

          {/* Mobile Header */}
          <header className="md:hidden mb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/creators')}
                className="relative rounded-full hover:scale-110 transition-all p-2"
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(2px, 2px)', filter: 'blur(3px)' }} />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 border-2 border-purple-400/50" />
                <LogOut className="text-white relative z-10 -scale-x-100 w-4 h-4" />
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-white/80 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Profile Center */}
            <div className="flex flex-col items-center mb-4">
              <img 
                src={profile?.avatar_url || defaultProfile} 
                alt="Profile" 
                className="w-16 h-16 rounded-full border-2 border-purple-500/50 object-cover mb-2"
              />
              <span className="text-white font-semibold text-lg">
                {profile?.username || 'Creator'}
              </span>
            </div>

            {/* Mobile Add Video Button */}
            <button
              onClick={handleAddVideo}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-white transition-all shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
              }}
            >
              <Plus className="w-5 h-5" />
              <span>{lang === 'hu' ? 'Videolink hozzáadása' : 'Add video link'}</span>
            </button>
          </header>

          {/* Videos Section */}
          <section className="mt-6">
            <h2 className="text-white font-bold text-xl mb-4">
              {lang === 'hu' ? 'Megosztott videóid' : 'Your shared videos'}
            </h2>

            {/* Platform Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {platforms.map((platform) => (
                <button
                  key={platform.key}
                  onClick={() => !platform.disabled && setSelectedPlatform(platform.key)}
                  disabled={platform.disabled}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedPlatform === platform.key
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : platform.disabled
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {platform.icon}
                  <span>{platform.label}</span>
                </button>
              ))}
            </div>

            {/* Video List or Empty State */}
            {filteredVideos.length === 0 ? (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Film className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  {lang === 'hu' ? 'Még nem osztottál meg videót.' : 'You haven\'t shared any videos yet.'}
                </h3>
                <p className="text-white/60 text-sm max-w-md mx-auto">
                  {lang === 'hu' 
                    ? 'Hamarosan itt fognak megjelenni a TikTok videóid, amelyeket a játékosaink látni fognak.' 
                    : 'Your TikTok videos that our players will see will appear here soon.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div 
                    key={video.id}
                    className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[9/16] bg-black/50">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Platform Badge */}
                      <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        {getPlatformIcon(video.platform)}
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="p-4">
                      <h4 className="text-white font-medium text-sm mb-2 truncate">
                        {video.title || 'TikTok videó'}
                      </h4>
                      {getStatusBadge(video.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CreatorDashboard;
