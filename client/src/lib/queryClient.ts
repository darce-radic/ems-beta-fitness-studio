import { QueryClient } from "@tanstack/react-query";

// Base API URL
const API_BASE_URL = "";

// Default fetcher for the useQuery hook
export const getQueryFn = (options?: { on401?: "returnNull" | "throw" }) => {
  return async ({ queryKey }: { queryKey: string[] }) => {
    const endpoint = queryKey[0];
    
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    
    // Add JWT token from localStorage if available (check both possible keys)
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { 
      headers,
      credentials: 'include' // Important: include cookies for session-based auth
    });
    
    if (response.status === 401) {
      if (options?.on401 === "returnNull") {
        return null;
      }
      throw new Error("Unauthorized");
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText || "Something went wrong";
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  };
};

// Helper for mutation methods (POST, PUT, DELETE, etc.)
export const apiRequest = async (
  method: string,
  endpoint: string,
  data?: any,
  options?: RequestInit
) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  // Add JWT token from localStorage if available (check both possible keys)
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    credentials: 'include', // Important: include cookies for session-based auth
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
  
  return response;
};

// Create a QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      staleTime: Infinity, // Never auto-refetch
      gcTime: Infinity, // Keep in cache forever
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
    },
  },
});