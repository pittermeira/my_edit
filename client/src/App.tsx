import { TextEditor } from "./components/TextEditor";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <TextEditor />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export default App;
