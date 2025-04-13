import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";
import { TableViewer } from "@/components/database/table-viewer";
import { SchemaViewer } from "@/components/database/schema-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SQLEditor } from "@/components/database/sql-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Database, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DatabaseExplorer({ params }: { params: { id: string } }) {
  const connectionId = parseInt(params.id, 10);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("table");
  const { toast } = useToast();

  // Fetch connection details
  const { data: connection, isLoading: isLoadingConnection, error: connectionError } = useQuery({
    queryKey: [`/api/connections/${connectionId}`],
  });

  // Fetch tables
  const { data: tables, isLoading: isLoadingTables, error: tablesError } = useQuery({
    queryKey: [`/api/tables/${connectionId}`],
    enabled: !!connection,
    onSuccess: (data) => {
      // Select the first table by default if none is selected
      if (data && data.length > 0 && !selectedTable) {
        setSelectedTable(data[0]);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load tables. Please check your connection.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    document.title = connection ? `${connection.name} - EnterpriseDB` : "Database Explorer - EnterpriseDB";
  }, [connection]);

  if (connectionError) {
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
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
        />
        
        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs bar */}
          <div className="bg-white border-b border-gray-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-2">
                <TabsList>
                  <TabsTrigger value="table" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {isLoadingConnection ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <span>Table: {selectedTable || "Select a table"}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="query" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Query Editor</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>
          
          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="table" className="h-full flex flex-col">
              {!selectedTable ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No table selected</h3>
                    <p className="text-gray-500 mb-4">Select a table from the sidebar to view its data.</p>
                  </div>
                </div>
              ) : (
                <>
                  <TableViewer 
                    connectionId={connectionId}
                    tableName={selectedTable || ""}
                  />
                </>
              )}
            </TabsContent>
            
            <TabsContent value="query" className="h-full p-0 m-0 data-[state=inactive]:hidden">
              <SQLEditor connectionId={connectionId} />
            </TabsContent>
          </div>
        </main>
        
        {/* Right panel for schema details - conditionally rendered */}
        {selectedTable && activeTab === "table" && (
          <SchemaViewer
            connectionId={connectionId}
            tableName={selectedTable}
          />
        )}
      </div>
    </div>
  );
}
