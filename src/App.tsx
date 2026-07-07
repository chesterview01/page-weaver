import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import BrandProvider from "@/components/BrandProvider";

import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";

const queryClient = new QueryClient();

// Protected route wrapper - must be used inside AuthProvider
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Public route that redirects authenticated users - must be used inside AuthProvider
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={
      <PublicRoute>
        <Landing />
      </PublicRoute>
    } />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/login" element={
      <PublicRoute>
        <Login />
      </PublicRoute>
    } />
    <Route path="/app" element={
      <ProtectedRoute>
        <Index />
      </ProtectedRoute>
    } />
    <Route path="/settings" element={
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    } />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/admin" element={
      <ProtectedRoute>
        <Admin />
      </ProtectedRoute>
    } />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <BrandProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </BrandProvider>
        </AuthProvider>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
