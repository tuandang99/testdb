import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppHeader } from "@/components/layout/app-header";
import { ConnectionForm } from "@/components/database/connection-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Connect() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Connect to Database - EnterpriseDB";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Connections
        </Button>
        
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Connect to PostgreSQL Database</h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            <ConnectionForm onSuccess={(id) => navigate(`/database/${id}`)} />
          </div>
        </div>
      </main>
    </div>
  );
}
