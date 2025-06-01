import React from "react";
import { Switch, Route } from "wouter";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { TutorialProvider } from "@/providers/TutorialProvider";
import { AccessibilityProvider } from "@/providers/AccessibilityProvider";
import { BrandingProvider } from "@/providers/BrandingProvider";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Auth0Debug } from "@/components/Auth0Debug";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/dashboard";
import HomeOnboardingPage from "@/pages/emshome/onboarding";
import BusinessSetupPage from "@/pages/admin/business-setup";
import AdminRouter from "@/pages/admin/index";
import TrainerRouter from "@/pages/trainer/index";
import SettingsPage from "@/pages/settings";
import SchedulePage from "@/pages/schedule";
import MessagesPage from "@/pages/messages";
import ProfilePage from "@/pages/profile";
import MotivationPage from "@/pages/motivation";


// Auth0 integrated router
function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public landing page for unauthenticated users */}
      <Route path="/">
        {isAuthenticated ? <Dashboard /> : <Landing />}
      </Route>
      
      {/* Auth route - redirect to landing */}
      <Route path="/auth">
        <Landing />
      </Route>
      
      {/* Protected dashboard route */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      {/* EMS Home Onboarding Route */}
      <Route path="/home-onboarding">
        <ProtectedRoute>
          <HomeOnboardingPage />
        </ProtectedRoute>
      </Route>
      
      {/* Admin Routes - catch all admin paths */}
      <Route path="/admin/:rest*">
        <AdminRouter />
      </Route>
      
      <Route path="/admin">
        <AdminRouter />
      </Route>
      
      {/* Trainer Routes */}
      <Route path="/trainer/:rest*">
        <TrainerRouter />
      </Route>
      
      {/* Schedule Route */}
      <Route path="/schedule">
        <ProtectedRoute>
          <SchedulePage />
        </ProtectedRoute>
      </Route>
      
      {/* Messages Route */}
      <Route path="/messages">
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      </Route>
      
      {/* Profile Route */}
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      
      {/* Motivation Route */}
      <Route path="/motivation">
        <ProtectedRoute>
          <MotivationPage />
        </ProtectedRoute>
      </Route>
      
      {/* Settings Route */}
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback for any other routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        }
      >
        <TooltipProvider>
          <BrandingProvider>
            <AccessibilityProvider>
              <TutorialProvider>
                <AppRouter />
                <Auth0Debug />
                <Toaster />
                <ServiceWorkerRegistration />
              </TutorialProvider>
            </AccessibilityProvider>
          </BrandingProvider>
        </TooltipProvider>
      </React.Suspense>
    </ErrorBoundary>
  );
}

export default App;