import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';

const Creators = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-[clamp(0.75rem,2vh,1rem)]">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)]" />
          <span className="text-[clamp(0.75rem,3vw,0.875rem)]">{t('common.back')}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center pb-[var(--bottom-nav-h,4rem)]">
        <h1 className="text-[clamp(1.5rem,6vw,2rem)] font-bold text-white text-center">
          {t('nav.creators')}
        </h1>
      </div>

      <BottomNav />
    </div>
  );
};

export default Creators;
