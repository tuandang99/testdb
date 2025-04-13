import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import {
  Database,
  Plus,
  Clock,
  Server,
  DatabaseIcon
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  
  const { data: connections, isLoading, error } = useQuery({
    queryKey: ['/api/connections'],
  });

  useEffect(() => {
    document.title = "EnterpriseDB - Database Management Tool";
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Database Connections</h1>
          <Button 
            onClick={() => navigate("/connect")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Connection
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6 h-40"></CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-error mb-2">Failed to load connections</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
              </div>
            </CardContent>
          </Card>
        ) : connections?.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <DatabaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No connections yet</h3>
                <p className="text-gray-500 mb-4">Create a new connection to get started managing your PostgreSQL databases.</p>
                <Button onClick={() => navigate("/connect")}>Create Connection</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections?.map((connection: any) => (
              <Card 
                key={connection.id} 
                className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/database/${connection.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="ml-3 text-lg font-semibold text-gray-900">{connection.name}</h3>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-green-500" title="Connected"></div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-gray-400" />
                      <span>{connection.host}:{connection.port}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DatabaseIcon className="h-4 w-4 text-gray-400" />
                      <span>{connection.database}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last connected: {connection.lastConnected ? new Date(connection.lastConnected).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card 
              className="bg-white shadow-sm border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center"
              onClick={() => navigate("/connect")}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Add Connection</h3>
                <p className="text-sm text-gray-500 mt-1">Connect to another PostgreSQL database</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
