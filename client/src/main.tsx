import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./providers/ThemeProvider";
import { OnboardingProvider } from "./providers/onboarding-provider";
import { Auth0Provider } from "./providers/Auth0Provider";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        console.log('Service worker registered successfully');
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });

  // Check if notifications are supported and permission is granted
  if ('Notification' in window) {
    console.log('Service Worker ready for notifications');
  }
}

createRoot(document.getElementById("root")!).render(
  <Auth0Provider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OnboardingProvider>
          <App />
          <Toaster />
        </OnboardingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Auth0Provider>
);
