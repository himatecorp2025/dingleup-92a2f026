import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleStartGame = () => {
    // AudioManager handles music automatically based on user settings
    navigate('/intro?next=/game?autostart=true');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
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

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="absolute top-20 left-10 w-20 h-20 bg-accent rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-secondary rounded-full opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-gradient-card border border-border/50 rounded-2xl p-8 shadow-glow text-center animate-fade-in relative z-20">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="96"
              height="96"
              viewBox="0 0 1024 1024"
              className="mx-auto mb-4"
            >
              <image
                href="/logo.png"
                x="0"
                y="0"
                width="1024"
                height="1024"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/20 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-accent" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4 font-poppins">
            <span className="text-transparent bg-clip-text bg-gradient-gold">
              {t('auth.registration_success.title')}
            </span>
          </h1>

          <p className="text-muted-foreground mb-8 text-lg">
            {t('auth.registration_success.description')}
          </p>

          <Button
            size="lg"
            onClick={handleStartGame}
            className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90 transition-all hover:scale-105 shadow-glow text-lg px-8 py-6"
          >
            {t('auth.registration_success.start_button')}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
