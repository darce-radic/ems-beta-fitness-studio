import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { OnboardingWalkthrough } from "@/components/onboarding/onboarding-walkthrough";
import { Mascot } from "@/components/onboarding/mascot";

type OnboardingContextType = {
  hasCompletedOnboarding: boolean;
  showOnboarding: () => void;
  hideOnboarding: () => void;
  showMascot: (message: string, expression?: 'happy' | 'thinking' | 'excited' | 'calm' | 'waving', autoHide?: boolean) => void;
  hideMascot: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isMascotVisible, setIsMascotVisible] = useState(false);
  const [mascotMessage, setMascotMessage] = useState("");
  const [mascotExpression, setMascotExpression] = useState<'happy' | 'thinking' | 'excited' | 'calm' | 'waving'>('happy');
  const [autoHideMascot, setAutoHideMascot] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    setHasCompletedOnboarding(onboardingCompleted === 'true');
    
    // Show onboarding automatically for new users after a short delay
    const timer = setTimeout(() => {
      if (onboardingCompleted !== 'true') {
        setIsOnboardingOpen(true);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const showOnboarding = () => {
    setIsOnboardingOpen(true);
  };

  const hideOnboarding = () => {
    setIsOnboardingOpen(false);
  };

  const completeOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setHasCompletedOnboarding(true);
    hideOnboarding();
    
    // Show a congratulatory mascot message after completing onboarding
    showMascot(
      "Congratulations on completing the tour! I'll be here if you need any help.", 
      'excited', 
      true
    );
  };

  const showMascot = (
    message: string, 
    expression: 'happy' | 'thinking' | 'excited' | 'calm' | 'waving' = 'happy',
    autoHide = false
  ) => {
    setMascotMessage(message);
    setMascotExpression(expression);
    setIsMascotVisible(true);
    setAutoHideMascot(autoHide);
  };

  const hideMascot = () => {
    setIsMascotVisible(false);
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        showOnboarding,
        hideOnboarding,
        showMascot,
        hideMascot,
      }}
    >
      {children}
      
      {/* Onboarding Walkthrough */}
      <OnboardingWalkthrough
        isOpen={isOnboardingOpen}
        onClose={hideOnboarding}
        onComplete={completeOnboarding}
      />
      
      {/* Floating Mascot */}
      {isMascotVisible && !isOnboardingOpen && (
        <Mascot
          message={mascotMessage}
          expression={mascotExpression}
          onClose={hideMascot}
          autoHide={autoHideMascot}
          hideDelay={8000}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}