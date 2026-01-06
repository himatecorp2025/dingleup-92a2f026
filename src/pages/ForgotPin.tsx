import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { z } from "zod";
import { useI18n } from "@/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import loadingLogo from '@/assets/dingleup-loading-logo.png';


const createForgotPinSchema = (t: (key: string) => string) => z.object({
  username: z.string().trim().min(1, t('auth.forgotPin.validationUsernameRequired')),
  recoveryCode: z.string().trim().min(1, t('auth.forgotPin.validationRecoveryCodeRequired')).regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, t('auth.forgotPin.validationRecoveryCodeFormat')),
  newPin: z.string().regex(/^\d{6}$/, t('auth.forgotPin.validationPinFormat')),
  newPinConfirm: z.string(),
}).refine(data => data.newPin === data.newPinConfirm, {
  message: t('auth.forgotPin.validationPinMismatch'),
  path: ["newPinConfirm"],
});

const ForgotPin = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const forgotPinSchema = createForgotPinSchema(t);
  type ForgotPinForm = z.infer<typeof forgotPinSchema>;
  const [formData, setFormData] = useState<ForgotPinForm>({
    username: "",
    recoveryCode: "",
    newPin: "",
    newPinConfirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPinForm, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showNewPinConfirm, setShowNewPinConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);

  useEffect(() => {
    const checkStandalone = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
      setIsStandalone(isPWA);
    };
    checkStandalone();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = forgotPinSchema.parse(formData);

      // Call forgot-pin edge function
      const { data: resetData, error: resetError } = await supabase.functions.invoke('forgot-pin', {
        body: {
          username: validated.username,
          recovery_code: validated.recoveryCode,
          new_pin: validated.newPin,
          new_pin_confirm: validated.newPinConfirm,
        },
      });

      if (resetError || resetData?.error) {
        toast.error(t('auth.forgotPin.error_title'), {
          description: resetData?.error || t('auth.forgotPin.errorResetFailed'),
          duration: 4000,
        });
        return;
      }

      if (!resetData?.success) {
        toast.error(t('auth.forgotPin.error_title'), {
          description: t('auth.forgotPin.errorResetUnsuccessful'),
          duration: 4000,
        });
        return;
      }

      // Store the new recovery code and show success dialog
      setNewRecoveryCode(resetData.new_recovery_code || null);
      setShowSuccessDialog(true);

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ForgotPinForm, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ForgotPinForm] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('PIN reset error:', error);
        toast.error(t('auth.forgotPin.error_title'), {
          description: t('auth.forgotPin.errorUnexpected'),
          duration: 4000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    navigate('/auth/login');
  };

  return (
    <div 
      className="h-screen w-screen fixed inset-0 overflow-hidden animate-fade-in"
    >
      {/* Background handled globally by body::before in index.css */}

      <div className="w-full h-[90vh] flex items-center justify-center px-4 sm:px-6 md:px-8 relative z-10" style={{ maxHeight: '90vh' }}>
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 relative w-full max-w-md" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          <button 
            onClick={() => navigate('/auth/login')} 
            className="absolute left-4 top-4 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200 group z-10 min-w-[44px] min-h-[44px] flex items-center justify-center" 
            aria-label={t('auth.forgotPin.backButton')}
          >
            <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-4 mt-2">
            <img 
              src={loadingLogo} 
              alt="DingleUP! Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain" 
            />
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-center mb-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] break-words hyphens-auto px-2">
            {t('auth.forgotPin.title')}
          </h1>
          <p className="text-center text-white/70 mb-6 text-xs xs:text-sm sm:text-base font-medium break-words px-4">
            {t('auth.forgotPin.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">{t('auth.forgotPin.usernameLabel')}</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-yellow-400 transition-colors" />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="h-12 pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 text-base"
                  placeholder={t('auth.forgotPin.usernamePlaceholder')}
                  disabled={isLoading}
                />
              </div>
              {errors.username && <p className="text-sm text-red-400">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">{t('auth.forgotPin.recoveryCodeLabel')}</Label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-yellow-400 transition-colors" />
                <Input
                  type="text"
                  value={formData.recoveryCode}
                  onChange={(e) => {
                    // Format input to XXXX-XXXX-XXXX pattern
                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (value.length > 4) {
                      value = value.slice(0, 4) + '-' + value.slice(4);
                    }
                    if (value.length > 9) {
                      value = value.slice(0, 9) + '-' + value.slice(9);
                    }
                    value = value.slice(0, 14); // Max length XXXX-XXXX-XXXX
                    setFormData({ ...formData, recoveryCode: value });
                  }}
                  className="h-12 pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 text-base uppercase"
                  placeholder={t('auth.forgotPin.recoveryCodePlaceholder')}
                  disabled={isLoading}
                  maxLength={14}
                />
              </div>
              {errors.recoveryCode && <p className="text-sm text-red-400">{errors.recoveryCode}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">{t('auth.forgotPin.newPinLabel')}</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-yellow-400 transition-colors" />
                <Input
                  type={showNewPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.newPin}
                  onChange={(e) => setFormData({ ...formData, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="h-12 pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 text-base"
                  placeholder={t('auth.forgotPin.newPinPlaceholder')}
                  disabled={isLoading}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  aria-label={showNewPin ? t('auth.forgotPin.hidePin') : t('auth.forgotPin.showPin')}
                >
                  {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.newPin && <p className="text-sm text-red-400">{errors.newPin}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">{t('auth.forgotPin.newPinConfirmLabel')}</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-yellow-400 transition-colors" />
                <Input
                  type={showNewPinConfirm ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.newPinConfirm}
                  onChange={(e) => setFormData({ ...formData, newPinConfirm: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="h-12 pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 text-base"
                  placeholder={t('auth.forgotPin.newPinPlaceholder')}
                  disabled={isLoading}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPinConfirm(!showNewPinConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  aria-label={showNewPinConfirm ? t('auth.forgotPin.hidePin') : t('auth.forgotPin.showPin')}
                >
                  {showNewPinConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.newPinConfirm && <p className="text-sm text-red-400">{errors.newPinConfirm}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300 text-base"
              disabled={isLoading}
            >
              {isLoading ? t('auth.forgotPin.submittingButton') : t('auth.forgotPin.submitButton')}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <button
                onClick={() => navigate('/auth/login')}
                className="text-white/60 hover:text-white/90 text-sm transition-colors underline"
              >
                {t('auth.forgotPin.backToLogin')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog with new recovery code */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] border-yellow-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              {t('auth.forgotPin.successTitle')}
            </DialogTitle>
            <DialogDescription className="text-white/80 space-y-4">
              <p>{t('auth.forgotPin.successMessage')}</p>
              {newRecoveryCode && (
                <div className="bg-white/10 border border-yellow-500/30 rounded-lg p-4 space-y-2">
                  <p className="text-yellow-400 font-semibold text-sm">{t('auth.forgotPin.newRecoveryCodeLabel')}</p>
                  <p className="text-white font-mono text-lg text-center tracking-wider">{newRecoveryCode}</p>
                  <p className="text-white/70 text-xs">{t('auth.forgotPin.newRecoveryCodeWarning')}</p>
                </div>
              )}
              <Button
                onClick={handleSuccessDialogClose}
                className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold"
              >
                {t('auth.forgotPin.continueToLogin')}
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ForgotPin;
