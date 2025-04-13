import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Database,
  Table,
  FileText,
  Eye,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Save,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  connectionId: number;
  tables: string[];
  isLoading: boolean;
  selectedTable: string | null;
  onSelectTable: (table: string) => void;
  hideTableSelection?: boolean;
}

export function Sidebar({ 
  connectionId, 
  tables,
  isLoading,
  selectedTable,
  onSelectTable,
  hideTableSelection = false
}: SidebarProps) {
  const [, navigate] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tables: true,
    views: false,
    functions: false,
    queries: true
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch saved queries
  const { data: savedQueries, isLoading: isLoadingQueries } = useQuery({
    queryKey: [`/api/saved-queries?connectionId=${connectionId}`],
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredTables = tables?.filter(table => 
    table.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Connection panel */}
      <div className="p-4 border-b border-gray-200">
        <Button
          className="w-full flex items-center justify-center gap-2"
          onClick={() => navigate("/connect")}
        >
          <Plus className="h-4 w-4" />
          New Connection
        </Button>
      </div>
      
      {/* Search input */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tables..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Database navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-2">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database Objects</h3>
          </div>
          
          {/* Tables section */}
          <div className="space-y-1">
            <button 
              className={`w-full flex items-center px-3 py-2 text-sm font-medium ${
                expandedSections.tables ? 'text-primary bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => toggleSection('tables')}
            >
              <Table className="h-4 w-4 mr-2" />
              Tables
              {expandedSections.tables ? (
                <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
              )}
            </button>
            
            {expandedSections.tables && (
              <div className="pl-9 space-y-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-40 rounded-md" />
                    <Skeleton className="h-6 w-32 rounded-md" />
                    <Skeleton className="h-6 w-36 rounded-md" />
                  </>
                ) : filteredTables.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {searchTerm ? "No tables found" : "No tables available"}
                  </div>
                ) : (
                  filteredTables.map(table => (
                    <button
                      key={table}
                      className={`block px-3 py-1 text-sm rounded-md w-full text-left ${
                        table === selectedTable 
                          ? 'text-gray-900 font-medium bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={() => {
                        if (!hideTableSelection) {
                          onSelectTable(table);
                        } else {
                          navigate(`/database/${connectionId}`);
                          // Wait for navigation and then set the table
                          setTimeout(() => onSelectTable(table), 100);
                        }
                      }}
                    >
                      {table}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* Views section */}
          <div className="mt-3 space-y-1">
            <button 
              className={`w-full flex items-center px-3 py-2 text-sm font-medium ${
                expandedSections.views ? 'text-primary bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => toggleSection('views')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Views
              {expandedSections.views ? (
                <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
              )}
            </button>
            
            {expandedSections.views && (
              <div className="pl-9 px-3 py-2 text-sm text-gray-500">
                No views available
              </div>
            )}
          </div>
          
          {/* Saved Queries section */}
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved Queries</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-2 space-y-1">
            {isLoadingQueries ? (
              <>
                <Skeleton className="mx-3 h-8 rounded-md" />
                <Skeleton className="mx-3 h-8 rounded-md" />
              </>
            ) : !savedQueries || savedQueries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No saved queries
              </div>
            ) : (
              savedQueries.map((query: any) => (
                <button 
                  key={query.id}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 group"
                  onClick={() => {
                    navigate(`/query/${connectionId}`);
                    // Implement loading saved query functionality
                  }}
                >
                  <FileText className="h-4 w-4 mr-2 text-gray-400 group-hover:text-gray-500" />
                  <span className="truncate">{query.name}</span>
                </button>
              ))
            )}
            
            <button 
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-primary hover:bg-blue-50"
              onClick={() => navigate(`/query/${connectionId}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Query
            </button>
          </div>
        </nav>
      </ScrollArea>
      
      {/* Quick links */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <button 
            className="hover:text-primary"
            onClick={() => navigate(`/database/${connectionId}`)}
          >
            Schema
          </button>
          <span>•</span>
          <button 
            className="hover:text-primary"
            onClick={() => navigate(`/query/${connectionId}`)}
          >
            SQL
          </button>
          <span>•</span>
          <button className="hover:text-primary">Settings</button>
        </div>
      </div>
    </aside>
  );
}
