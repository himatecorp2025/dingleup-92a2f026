import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Zap, Heart, HelpCircle, Timer, Coins } from "lucide-react";
import { useI18n } from "@/i18n";


const GameRules = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="h-dvh w-screen overflow-y-auto overflow-x-hidden relative flex flex-col" style={{
      maxWidth: '100vw',
      maxHeight: '100dvh'
    }}>
      {/* Background handled globally by body::before in index.css */}
      
      <div className="relative z-10 flex-1 overflow-y-auto" style={{
        width: '90vw',
        maxWidth: '90vw',
        margin: '0 auto',
        padding: 'clamp(12px, 2vh, 24px)'
      }}>
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="mb-4 bg-background/80 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            {t('game.rules.title') || 'Játékszabályzat'}
          </h1>
          <p className="text-xl text-foreground/80">
            {t('game.rules.subtitle') || 'Minden, amit tudnod kell a játékról'}
          </p>
        </div>

        {/* Mobile Only Notice */}
        <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-2xl p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-background" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {t('game.rules.mobile_only.title') || 'Csak mobilon játszható!'}
              </h3>
              <p className="text-foreground/80">
                {t('game.rules.mobile_only.description') || 'Ez a játék kifejezetten mobil eszközökre lett optimalizálva. A legjobb élmény érdekében használd okostelefonodon!'}
              </p>
            </div>
          </div>
        </div>

        {/* Game Rules Cards */}
        <div className="space-y-6">
          {/* Lives */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t('game.rules.lives.title') || 'Életek rendszere'}
              </h2>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.lives.point1') || '15 élettel kezdesz'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.lives.point2') || 'Minden játék 1 életet használ'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.lives.point3') || 'Az életek 12 percenként automatikusan regenerálódnak'}</span>
              </li>
            </ul>
          </div>

          {/* Questions */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t('game.rules.questions.title') || 'Kérdések'}
              </h2>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.questions.point1') || '15 kérdés játékonként'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.questions.point2') || '3 válaszlehetőség (A, B, C)'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.questions.point3') || 'Különböző témakörök: kultúra, történelem, tudomány, művészet, stb.'}</span>
              </li>
            </ul>
          </div>

          {/* Time */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Timer className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t('game.rules.time.title') || 'Időkorlát'}
              </h2>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.time.point1') || '30 másodperc kérdésenként'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.time.point2') || 'Ha lejár az idő, rossz válasznak számít'}</span>
              </li>
            </ul>
          </div>

          {/* Helpers */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t('game.rules.helpers.title') || 'Segítségek'}
              </h2>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.helpers.point1') || '50:50 - Töröl 1 rossz választ'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.helpers.point2') || 'Dupla válasz - 2 próbálkozás'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.helpers.point3') || 'Közönség segítség - Láthatod az összes játékos válaszait'}</span>
              </li>
            </ul>
          </div>

          {/* Rewards */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t('game.rules.rewards.title') || 'Jutalmak'}
              </h2>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.rewards.point1') || 'Aranyérmék minden helyes válaszért'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.rewards.point2') || 'Bónusz aranyérmék gyors válaszokért'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.rewards.point3') || 'Napi és heti toplista díjak'}</span>
              </li>
            </ul>
          </div>

          {/* Ranking */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t('game.rules.ranking.title') || 'Rangsor'}
              </h2>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.ranking.point1') || 'Napi toplista: Ma válaszolt helyes kérdések alapján'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.ranking.point2') || 'Országonként külön rangsorok'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>{t('game.rules.ranking.point3') || 'TOP 10 játékos jutalmakat kap minden nap!'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-8 text-center">
          <Button 
            onClick={() => navigate('/')}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg"
          >
            {t('common.back_to_home') || 'Vissza a főoldalra'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameRules;
