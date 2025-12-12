import { useState, useEffect } from 'react';
import { useDailyGift } from './useDailyGift';
import { useWelcomeBonus } from './useWelcomeBonus';
import { useDailyWinnersPopup } from './useDailyWinnersPopup';
import { useDailyRankReward } from './useDailyRankReward';

/**
 * SIMPLIFIED Dashboard popup manager
 * Priority: Age Gate → Welcome Bonus → Daily Gift → Personal Winner OR Daily Winners
 * 
 * KEY LOGIC:
 * - Personal Winner: shown if user has pending reward in daily_winner_awarded
 * - Daily Winners: shown if user does NOT have pending reward (once per day)
 */

export interface PopupState {
  showAgeGate: boolean;
  showWelcomeBonus: boolean;
  showDailyGift: boolean;
  showDailyWinners: boolean;
  showPersonalWinner: boolean;
  ageGateCompleted: boolean;
  welcomeBonusCompleted: boolean;
  dailyGiftCompleted: boolean;
}

interface PopupManagerParams {
  canMountModals: boolean;
  needsAgeVerification: boolean;
  userId: string | undefined;
  username: string | undefined;
  profileLoading: boolean;
}

export const useDashboardPopupManager = (params: PopupManagerParams) => {
  const { canMountModals, needsAgeVerification, userId, profileLoading } = params;

  // Integrate popup hooks
  const dailyGift = useDailyGift(userId, false);
  const welcomeBonus = useWelcomeBonus(userId);
  const rankReward = useDailyRankReward(userId);
  
  // Daily Winners depends on whether user has pending reward
  const hasPendingReward = !!rankReward.pendingReward;
  const dailyWinners = useDailyWinnersPopup(userId, hasPendingReward);

  const [popupState, setPopupState] = useState<PopupState>({
    showAgeGate: false,
    showWelcomeBonus: false,
    showDailyGift: false,
    showDailyWinners: false,
    showPersonalWinner: false,
    ageGateCompleted: false,
    welcomeBonusCompleted: false,
    dailyGiftCompleted: false,
  });

  // Priority 1: Age Gate
  useEffect(() => {
    if (profileLoading || !userId) return;
    
    if (!popupState.ageGateCompleted) {
      setPopupState(prev => ({
        ...prev,
        showAgeGate: needsAgeVerification,
        ageGateCompleted: !needsAgeVerification,
      }));
    }
  }, [userId, needsAgeVerification, profileLoading]);

  // Priority 2: Welcome Bonus
  useEffect(() => {
    if (!canMountModals || !userId || profileLoading) return;
    if (!popupState.ageGateCompleted || popupState.showAgeGate) return;
    
    if (welcomeBonus.canClaim && !popupState.showWelcomeBonus) {
      const timer = setTimeout(() => {
        setPopupState(prev => ({ ...prev, showWelcomeBonus: true }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [canMountModals, userId, profileLoading, popupState.ageGateCompleted, popupState.showAgeGate, welcomeBonus.canClaim, popupState.showWelcomeBonus]);

  // Priority 3: Daily Gift
  useEffect(() => {
    if (!canMountModals || !userId || profileLoading) return;
    if (!popupState.ageGateCompleted || popupState.showAgeGate || popupState.showWelcomeBonus) return;
    if (welcomeBonus.canClaim && !popupState.welcomeBonusCompleted) return;
    if (popupState.dailyGiftCompleted) return;
    
    if (dailyGift.canClaim && !popupState.showDailyGift) {
      const timer = setTimeout(() => {
        setPopupState(prev => ({ ...prev, showDailyGift: true }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [canMountModals, userId, profileLoading, popupState.ageGateCompleted, popupState.showAgeGate, popupState.showWelcomeBonus, welcomeBonus.canClaim, popupState.welcomeBonusCompleted, dailyGift.canClaim, popupState.showDailyGift, popupState.dailyGiftCompleted]);

  // Priority 4: Personal Winner OR Daily Winners (3 second delay after Daily Gift completion)
  useEffect(() => {
    if (!canMountModals || !userId || profileLoading) return;
    if (!popupState.ageGateCompleted || popupState.showAgeGate || popupState.showWelcomeBonus || popupState.showDailyGift) return;
    
    // CRITICAL: Wait for Daily Gift to be fully completed (not just canClaim false)
    // This ensures video reward flow is complete before showing next popup
    if (dailyGift.canClaim && !popupState.dailyGiftCompleted) return;
    
    // Only proceed if dailyGiftCompleted is true (meaning user closed/claimed Daily Gift)
    if (!popupState.dailyGiftCompleted && dailyGift.canClaim === false) {
      // Daily Gift was never shown (already claimed today) - proceed immediately
    } else if (!popupState.dailyGiftCompleted) {
      return;
    }

    // If user has pending reward → Personal Winner (3 second delay)
    if (hasPendingReward && !popupState.showPersonalWinner) {
      const timer = setTimeout(() => {
        setPopupState(prev => ({ ...prev, showPersonalWinner: true, showDailyWinners: false }));
      }, 3000); // 3 second delay after Daily Gift closes
      return () => clearTimeout(timer);
    }

    // If no pending reward → Daily Winners (if should show) (3 second delay)
    if (!hasPendingReward && dailyWinners.showPopup && !popupState.showDailyWinners) {
      const timer = setTimeout(() => {
        setPopupState(prev => ({ ...prev, showDailyWinners: true, showPersonalWinner: false }));
      }, 3000); // 3 second delay after Daily Gift closes
      return () => clearTimeout(timer);
    }
  }, [canMountModals, userId, profileLoading, popupState.ageGateCompleted, popupState.showAgeGate, popupState.showWelcomeBonus, popupState.showDailyGift, dailyGift.canClaim, popupState.dailyGiftCompleted, hasPendingReward, dailyWinners.showPopup, popupState.showDailyWinners, popupState.showPersonalWinner]);

  // Handlers
  const closeAgeGate = () => {
    setPopupState(prev => ({ ...prev, showAgeGate: false, ageGateCompleted: true }));
  };

  const closeWelcomeBonus = () => {
    setPopupState(prev => ({ ...prev, showWelcomeBonus: false, welcomeBonusCompleted: true }));
  };

  const closeDailyGift = () => {
    setPopupState(prev => ({ ...prev, showDailyGift: false, dailyGiftCompleted: true }));
  };

  const closeDailyWinners = async () => {
    await dailyWinners.closePopup();
    setPopupState(prev => ({ ...prev, showDailyWinners: false }));
  };

  const closePersonalWinner = async () => {
    try {
      const result = await rankReward.claimReward();
      if (result?.success) {
        setPopupState(prev => ({ ...prev, showPersonalWinner: false }));
      }
      return result;
    } catch (error) {
      console.error('[PERSONAL-WINNER] Error:', error);
      return { success: false };
    }
  };

  const dismissPersonalWinner = async () => {
    await rankReward.dismissReward();
    setPopupState(prev => ({ ...prev, showPersonalWinner: false }));
  };

  return {
    popupState,
    closeAgeGate,
    closeWelcomeBonus,
    closeDailyGift,
    closeDailyWinners,
    closePersonalWinner,
    dismissPersonalWinner,
    dailyGift: {
      canClaim: dailyGift.canClaim,
      weeklyEntryCount: dailyGift.weeklyEntryCount,
      nextReward: dailyGift.nextReward,
      claiming: dailyGift.claiming,
      claimDailyGift: dailyGift.claimDailyGift,
      checkDailyGift: dailyGift.checkDailyGift,
      handleLater: dailyGift.handleLater,
    },
    welcomeBonus: {
      claiming: welcomeBonus.claiming,
      claimWelcomeBonus: welcomeBonus.claimWelcomeBonus,
      handleLater: welcomeBonus.handleLater,
    },
    dailyWinners: {
      closePopup: dailyWinners.closePopup,
    },
    rankReward: {
      pendingReward: rankReward.pendingReward,
      isLoading: rankReward.isLoading,
      isClaiming: rankReward.isClaiming,
      claimReward: rankReward.claimReward,
      dismissReward: rankReward.dismissReward,
    },
  };
};
