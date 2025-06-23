
import { Toaster } from "@/components/ui/toaster";
import { TextEditor } from "@/components/TextEditor";
import { AuthScreen } from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

function App() {
  const { user, isAuthenticated, isLoading, login, register } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen onLogin={login} onRegister={register} />
        <Toaster />
      </>
    );
  }

  // Show main editor if authenticated
  return (
    <>
      <TextEditor />
      <Toaster />
    </>
  );
}

export default App;
