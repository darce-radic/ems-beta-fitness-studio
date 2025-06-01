import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TutorialTooltip, TutorialStep } from './TutorialTooltip';
import { apiRequest } from '@/lib/queryClient';

// Tutorial IDs for different features
export type TutorialId = 
  | 'welcome'
  | 'ems_setup'
  | 'ems_session'
  | 'progress_tracking'
  | 'recovery_goals'
  | 'booking_session'
  | 'notification_setup';

// Interface for tutorial data
export interface Tutorial {
  id: TutorialId;
  title: string;
  steps: TutorialStep[];
  requiredRole?: string[];
  triggerPath?: string; // URL path that triggers this tutorial
  triggerAction?: string; // Specific action that triggers this tutorial
  dependsOn?: TutorialId[]; // Tutorials that must be completed first
  showOnlyOnce?: boolean; // If true, only show once per user
}

// Context to manage tutorial state
interface TutorialContextType {
  activeTutorial: Tutorial | null;
  isTutorialActive: boolean;
  completedTutorials: TutorialId[];
  startTutorial: (tutorialId: TutorialId) => void;
  endTutorial: () => void;
  markTutorialCompleted: (tutorialId: TutorialId) => void;
  checkPathForTutorial: (path: string) => void;
  triggerActionTutorial: (action: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

interface TutorialProviderProps {
  children: ReactNode;
  tutorials: Tutorial[];
}

export function TutorialProvider({ children, tutorials }: TutorialProviderProps) {
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<TutorialId[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  // TODO: Re-enable when StackAuth is implemented
  // const { user } = useAuth();

  // Load completed tutorials for the user
  useEffect(() => {
    // if (!user) return;

    const loadCompletedTutorials = async () => {
      try {
        // In a real app, you'd fetch from your API
        // const response = await apiRequest('GET', '/api/tutorials/completed');
        // const data = await response.json();
        // setCompletedTutorials(data.completedTutorials);

        // For demo purposes, we'll load from localStorage
        const saved = localStorage.getItem('completedTutorials');
        if (saved) {
          setCompletedTutorials(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading completed tutorials:', error);
      }
    };

    loadCompletedTutorials();
  }, []);

  // Save completed tutorials when updated
  useEffect(() => {
    if (completedTutorials.length > 0) {
      // In a real app, you'd save to your API as well
      localStorage.setItem('completedTutorials', JSON.stringify(completedTutorials));
    }
  }, [completedTutorials]);

  // Start a tutorial by ID
  const startTutorial = (tutorialId: TutorialId) => {
    const tutorial = tutorials.find(t => t.id === tutorialId);
    
    if (!tutorial) {
      console.error(`Tutorial with ID ${tutorialId} not found`);
      return;
    }

    // Check if tutorial is already completed and should only show once
    if (tutorial.showOnlyOnce && completedTutorials.includes(tutorialId)) {
      return;
    }

    // TODO: Re-enable role checking when StackAuth is fully integrated
    // Check if user has required role (if specified)
    // if (tutorial.requiredRole && user?.role && 
    //     !tutorial.requiredRole.includes(user.role)) {
    //   return;
    // }

    // Check if dependent tutorials are completed
    if (tutorial.dependsOn && 
        tutorial.dependsOn.some(depId => !completedTutorials.includes(depId))) {
      // Some required tutorials are not completed
      const firstIncomplete = tutorial.dependsOn.find(
        depId => !completedTutorials.includes(depId)
      );
      if (firstIncomplete) {
        // Start the first incomplete dependency instead
        startTutorial(firstIncomplete);
        return;
      }
    }

    // Set as active tutorial and reset to first step
    setActiveTutorial(tutorial);
    setCurrentStep(0);
  };

  // End the current tutorial
  const endTutorial = () => {
    setActiveTutorial(null);
    setCurrentStep(0);
  };

  // Mark a tutorial as completed
  const markTutorialCompleted = (tutorialId: TutorialId) => {
    if (completedTutorials.includes(tutorialId)) return;
    
    setCompletedTutorials(prev => [...prev, tutorialId]);
    
    // In a real app, you'd send to your API
    // apiRequest('POST', '/api/tutorials/completed', { tutorialId });
  };

  // Check if a path should trigger a tutorial
  const checkPathForTutorial = (path: string) => {
    if (activeTutorial) return; // Don't start a new one if one is active
    
    // Find tutorial that matches this path
    const matchingTutorial = tutorials.find(tutorial => 
      tutorial.triggerPath === path && 
      (!tutorial.showOnlyOnce || !completedTutorials.includes(tutorial.id))
    );

    if (matchingTutorial) {
      startTutorial(matchingTutorial.id);
    }
  };

  // Trigger a tutorial based on user action
  const triggerActionTutorial = (action: string) => {
    if (activeTutorial) return; // Don't start a new one if one is active
    
    // Find tutorial that matches this action
    const matchingTutorial = tutorials.find(tutorial => 
      tutorial.triggerAction === action && 
      (!tutorial.showOnlyOnce || !completedTutorials.includes(tutorial.id))
    );

    if (matchingTutorial) {
      startTutorial(matchingTutorial.id);
    }
  };

  // Handle tutorial completion
  const handleTutorialComplete = () => {
    if (activeTutorial) {
      markTutorialCompleted(activeTutorial.id);
      endTutorial();
    }
  };

  // Handle step change
  const handleStepChange = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  return (
    <TutorialContext.Provider
      value={{
        activeTutorial,
        isTutorialActive: !!activeTutorial,
        completedTutorials,
        startTutorial,
        endTutorial,
        markTutorialCompleted,
        checkPathForTutorial,
        triggerActionTutorial,
      }}
    >
      {children}
      
      {activeTutorial && (
        <TutorialTooltip
          steps={activeTutorial.steps}
          isOpen={!!activeTutorial}
          onClose={endTutorial}
          onComplete={handleTutorialComplete}
          onStepChange={handleStepChange}
          initialStep={currentStep}
          persistent={false}
        />
      )}
    </TutorialContext.Provider>
  );
}