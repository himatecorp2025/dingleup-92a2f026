import { useNavigate } from 'react-router-dom';
import { LogOut, Eye, Users, Target, Zap, Package, Link, Play, BarChart3 } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';
import creatorsHeroBg from '@/assets/creators-hero-bg.png';

const CreatorHowItWorks = () => {
  const navigate = useNavigate();
  const { lang } = useI18n();

  const benefits = [
    {
      icon: Eye,
      title: lang === 'hu' ? 'Garantált figyelem' : 'Guaranteed attention',
      text: lang === 'hu' 
        ? 'Minden játékos 15 másodpercig garantáltan látja a videódat – nem ugorható át.' 
        : 'Every player sees your video for 15 seconds guaranteed – it can\'t be skipped.',
    },
    {
      icon: Target,
      title: lang === 'hu' ? 'Releváns közönség' : 'Relevant audience',
      text: lang === 'hu' 
        ? 'A videód a témádhoz illő játékosoknak jelenik meg, így releváns nézőket érsz el.' 
        : 'Your video appears to players interested in your topic, so you reach relevant viewers.',
    },
    {
      icon: Users,
      title: lang === 'hu' ? 'Rajongóépítés' : 'Build your fanbase',
      text: lang === 'hu' 
        ? 'A játékosok könnyen követhetnek a közösségi médiában, így növelheted a követőtáborod.' 
        : 'Players can easily follow you on social media, helping you grow your audience.',
    },
    {
      icon: Zap,
      title: lang === 'hu' ? 'Gyors indulás' : 'Quick start',
      text: lang === 'hu' 
        ? '30 napos ingyenes próbaidőszak – nincs kockázat, csak lehetőség.' 
        : '30-day free trial – no risk, just opportunity.',
    },
  ];

  const steps = [
    {
      icon: Package,
      step: '1',
      title: lang === 'hu' ? 'Válassz csomagot' : 'Choose a package',
      text: lang === 'hu' 
        ? 'Aktiváld a Creator fiókod és válassz az elérhető csomagok közül. Az első 30 nap ingyenes!' 
        : 'Activate your Creator account and choose from available packages. First 30 days free!',
    },
    {
      icon: Link,
      step: '2',
      title: lang === 'hu' ? 'Add meg a videód linkjét' : 'Add your video link',
      text: lang === 'hu' 
        ? 'Illeszd be a TikTok videód linkjét – hamarosan YouTube, Instagram és Facebook is támogatott lesz.' 
        : 'Paste your TikTok video link – YouTube, Instagram and Facebook support coming soon.',
    },
    {
      icon: Play,
      step: '3',
      title: lang === 'hu' ? 'A játékosok látják' : 'Players see your video',
      text: lang === 'hu' 
        ? 'A játékosok a kérdések között 15 másodpercig garantáltan látják a videódat.' 
        : 'Players see your video for 15 seconds guaranteed between questions.',
    },
    {
      icon: BarChart3,
      step: '4',
      title: lang === 'hu' ? 'Kövesd az eredményed' : 'Track your results',
      text: lang === 'hu' 
        ? 'Nézd meg, hányan látták a videódat és hogyan alakulnak a számaid.' 
        : 'See how many people viewed your video and track your statistics.',
    },
  ];

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

      {/* Content */}
      <div 
        className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden"
        style={{ 
          paddingTop: 'clamp(8px, 2vh, 16px)',
          paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 24px)' 
        }}
      >
        <div className="w-[90vw] max-w-[800px] mx-auto">
          
          {/* Header */}
          <header className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/creators/dashboard')}
              className="relative rounded-full hover:scale-110 transition-all p-3"
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 border-2 border-purple-400/50" />
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-purple-600 via-purple-500 to-purple-800" />
              <LogOut className="text-white relative z-10 -scale-x-100 w-5 h-5" />
            </button>
            
            <h1 className="text-white font-bold text-xl md:text-2xl">
              {lang === 'hu' ? 'Hogyan működik a Creator rendszer?' : 'How does the Creator system work?'}
            </h1>
          </header>

          {/* Benefits Section */}
          <section className="mb-10">
            <h2 
              className="text-white font-bold text-lg md:text-xl mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {lang === 'hu' ? 'Miért jó neked?' : 'Why is it good for you?'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-5 hover:border-purple-500/30 transition-all"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}
                  >
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-white font-semibold text-base mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {benefit.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Steps Section */}
          <section className="mb-10">
            <h2 
              className="text-white font-bold text-lg md:text-xl mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {lang === 'hu' ? 'Hogyan működik?' : 'How does it work?'}
            </h2>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-5 flex gap-4 items-start hover:border-purple-500/30 transition-all"
                >
                  {/* Step Number */}
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                      boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <span className="text-white font-bold text-lg">{step.step}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <step.icon className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-semibold text-base">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 text-center">
            <h3 className="text-white font-bold text-lg mb-3">
              {lang === 'hu' ? 'Készen állsz?' : 'Ready to start?'}
            </h3>
            <p className="text-white/70 text-sm mb-4">
              {lang === 'hu' 
                ? 'Térj vissza a dashboardra és add hozzá az első videódat!' 
                : 'Go back to the dashboard and add your first video!'}
            </p>
            <button
              onClick={() => navigate('/creators/dashboard')}
              className="px-6 py-3 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
              }}
            >
              {lang === 'hu' ? 'Vissza a Dashboardra' : 'Back to Dashboard'}
            </button>
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CreatorHowItWorks;
