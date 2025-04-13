import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/app-header";
import { SQLEditor } from "@/components/database/sql-editor";
import { Sidebar } from "@/components/layout/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function QueryEditor({ params }: { params: { id: string } }) {
  const connectionId = parseInt(params.id, 10);

  // Fetch connection details
  const { data: connection, isLoading, error } = useQuery({
    queryKey: [`/api/connections/${connectionId}`],
  });

  // Fetch tables
  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: [`/api/tables/${connectionId}`],
    enabled: !!connection,
  });

  useEffect(() => {
    document.title = connection ? `SQL Editor: ${connection.name} - EnterpriseDB` : "SQL Editor - EnterpriseDB";
  }, [connection]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load database connection. Please check your connection settings.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <AppHeader connection={connection} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar for database navigation */}
        <Sidebar 
          connectionId={connectionId}
          tables={tables || []}
          isLoading={isLoadingTables}
          selectedTable={null}
          onSelectTable={() => {}}
          hideTableSelection
        />
        
        {/* Main content area - full SQL editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SQLEditor 
              connectionId={connectionId} 
              fullScreen
              initialQuery="-- Write your SQL query here
SELECT * FROM products
LIMIT 10;"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
