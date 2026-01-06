import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Adatkezeles() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const docKey = `privacy_${lang}`;
        const { data, error } = await supabase
          .from('legal_documents')
          .select('content')
          .eq('document_key', docKey)
          .single();

        if (error) throw error;
        setContent(data?.content || t('legal.adatkezeles.content'));
      } catch (error) {
        console.error('Error loading document:', error);
        setContent(t('legal.adatkezeles.content'));
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [lang, t]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] flex items-center justify-center">
        <div className="text-white">{t('common.loading')}</div>
      </div>
    );
  }
  
  return (
    <div className="h-dvh w-screen overflow-y-auto overflow-x-hidden flex flex-col" style={{
      maxWidth: '100vw',
      maxHeight: '100dvh',
      padding: 'clamp(12px, 2vh, 24px)'
    }}>
      {/* Full-screen background that extends behind safe areas */}
      <div 
        className="fixed z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #0a0a2e 0%, #16213e 50%, #0f0f3d 100%)',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />
      <div className="bg-white/5 backdrop-blur-xl rounded-lg relative flex-1 overflow-y-auto z-10" style={{
        width: '90vw',
        maxWidth: '90vw',
        margin: '0 auto',
        padding: 'clamp(16px, 3vh, 32px)'
      }}>
        <button 
          onClick={() => navigate('/auth/register')} 
          className="absolute left-4 top-4 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200 group z-10 min-w-[44px] min-h-[44px] flex items-center justify-center" 
          aria-label="Vissza a regisztrációhoz"
        >
          <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
        </button>
        <h1 className="text-3xl font-bold text-yellow-400 mb-6 mt-8">{t('legal.adatkezeles.title')}</h1>
        <div className="text-gray-200 space-y-4 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}