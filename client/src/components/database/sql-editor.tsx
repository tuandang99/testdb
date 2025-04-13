import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Play, 
  Save,
  Loader2,
  AlertCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  FileCode,
  Check,
  Clock
} from "lucide-react";

// Load CodeMirror dynamically to avoid SSR issues
import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';

interface SQLEditorProps {
  connectionId: number;
  fullScreen?: boolean;
  initialQuery?: string;
}

export function SQLEditor({ connectionId, fullScreen = false, initialQuery = "" }: SQLEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [queryResults, setQueryResults] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("results");
  const [isSaving, setIsSaving] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"json" | "csv" | "sql" | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch saved queries
  const { data: savedQueries } = useQuery({
    queryKey: [`/api/saved-queries?connectionId=${connectionId}`],
  });

  // Code editor setup
  useEffect(() => {
    if (editorRef.current && !editorViewRef.current) {
      const startState = EditorState.create({
        doc: query,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          sql(),
          oneDark,
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              setQuery(update.state.doc.toString());
            }
          })
        ]
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current
      });
      
      editorViewRef.current = view;
      
      return () => {
        view.destroy();
        editorViewRef.current = null;
      };
    }
  }, []);

  // Update editor content when initialQuery changes
  useEffect(() => {
    if (editorViewRef.current && initialQuery !== query) {
      const transaction = editorViewRef.current.state.update({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: initialQuery
        }
      });
      editorViewRef.current.dispatch(transaction);
    }
  }, [initialQuery]);

  // Execute query
  const executeQuery = useMutation({
    mutationFn: async () => {
      if (!query.trim()) {
        throw new Error("Query cannot be empty");
      }
      
      const startTime = performance.now();
      const res = await apiRequest("POST", `/api/query/${connectionId}`, { query });
      const data = await res.json();
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      return data;
    },
    onSuccess: (data) => {
      setQueryResults(data);
      setActiveTab("results");
      toast({
        title: "Query executed successfully",
        description: `Retrieved ${data.rows.length} records in ${executionTime ? (executionTime / 1000).toFixed(2) : '?'} seconds`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Query execution failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save query
  const saveQuery = useMutation({
    mutationFn: async () => {
      if (!saveQueryName.trim()) {
        throw new Error("Query name cannot be empty");
      }
      
      const res = await apiRequest("POST", `/api/saved-queries`, {
        name: saveQueryName,
        query,
        connectionId
      });
      return await res.json();
    },
    onSuccess: () => {
      setShowSaveDialog(false);
      setSaveQueryName("");
      toast({
        title: "Query saved",
        description: "Your SQL query has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save query",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle download
  const handleDownload = () => {
    if (!queryResults) return;
    
    let content = '';
    let filename = `query_results_${new Date().toISOString().slice(0, 10)}`;
    
    if (downloadFormat === 'json') {
      content = JSON.stringify(queryResults.rows, null, 2);
      filename += '.json';
    } else if (downloadFormat === 'csv') {
      // Create CSV header
      const headers = queryResults.fields.map((f: any) => f.name).join(',');
      // Create CSV rows
      const rows = queryResults.rows.map((row: any) => 
        queryResults.fields.map((f: any) => {
          const value = row[f.name];
          if (value === null) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        }).join(',')
      ).join('\n');
      
      content = `${headers}\n${rows}`;
      filename += '.csv';
    } else if (downloadFormat === 'sql') {
      content = query;
      filename += '.sql';
    }
    
    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDownloadFormat(null);
  };

  // Handle keydown for Ctrl+Enter to execute query
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeQuery.mutate();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query]);

  return (
    <div className={`flex flex-col ${fullScreen ? 'h-full' : 'h-96'}`}>
      {/* Editor toolbar */}
      <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            size="sm"
            onClick={() => executeQuery.mutate()}
            disabled={executeQuery.isPending}
            className="flex items-center gap-1"
          >
            {executeQuery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>Run</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {executionTime !== null && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{(executionTime / 1000).toFixed(2)}s</span>
            </div>
          )}
          
          {queryResults && queryResults.rowCount !== undefined && (
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              <span>{queryResults.rowCount} rows</span>
            </div>
          )}
        </div>
      </div>
      
      {/* SQL editor */}
      <div className={`${fullScreen ? 'h-[40%]' : 'h-40'} border-b border-gray-200 overflow-hidden`}>
        <div ref={editorRef} className="h-full w-full" />
      </div>
      
      {/* Results section */}
      <div className={`flex-1 ${fullScreen ? 'overflow-hidden' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="border-b border-gray-200 px-3">
            <TabsList>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="results" className="flex-1 overflow-hidden p-0 m-0 data-[state=inactive]:hidden">
            {executeQuery.isPending ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : queryResults ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">
                    {queryResults.rows.length} rows in set
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDownloadFormat("json")}
                      className="flex items-center gap-1"
                    >
                      <FileJson className="h-4 w-4" />
                      <span className="hidden sm:inline">Export JSON</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDownloadFormat("csv")}
                      className="flex items-center gap-1"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDownloadFormat("sql")}
                      className="flex items-center gap-1"
                    >
                      <FileCode className="h-4 w-4" />
                      <span className="hidden sm:inline">Save SQL</span>
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {queryResults.fields.map((field: any, index: number) => (
                            <TableHead key={index}>{field.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResults.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={queryResults.fields.length} className="text-center py-8 text-gray-500">
                              No results returned
                            </TableCell>
                          </TableRow>
                        ) : (
                          queryResults.rows.map((row: any, rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              {queryResults.fields.map((field: any, cellIndex: number) => {
                                const value = row[field.name];
                                return (
                                  <TableCell key={cellIndex}>
                                    {value === null ? (
                                      <span className="text-gray-400 italic">NULL</span>
                                    ) : typeof value === "object" ? (
                                      <span className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</span>
                                    ) : (
                                      String(value)
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </div>
                </ScrollArea>
              </div>
            ) : executeQuery.isError ? (
              <div className="p-4 text-error">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Error executing query</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {executeQuery.error instanceof Error ? executeQuery.error.message : "Unknown error"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Execute a query to see results</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="messages" className="flex-1 p-4 overflow-auto m-0 data-[state=inactive]:hidden">
            {executeQuery.isError ? (
              <div className="text-error">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Error</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {executeQuery.error instanceof Error ? executeQuery.error.message : "Unknown error"}
                    </p>
                  </div>
                </div>
              </div>
            ) : queryResults ? (
              <div className="space-y-2">
                <div className="flex items-center text-green-600">
                  <Check className="h-5 w-5 mr-2" />
                  <span>Query executed successfully</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Affected rows: {queryResults.rowCount || 0}</p>
                  <p>Execution time: {executionTime ? `${(executionTime / 1000).toFixed(3)} seconds` : "N/A"}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No messages to display</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Save query dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="query-name" className="text-sm font-medium">
                Query Name
              </label>
              <Input
                id="query-name"
                value={saveQueryName}
                onChange={(e) => setSaveQueryName(e.target.value)}
                placeholder="Enter a name for this query"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Query</label>
              <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">{query}</pre>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveQuery.mutate()}
              disabled={saveQuery.isPending || !saveQueryName.trim()}
            >
              {saveQuery.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Download confirmation dialog */}
      <AlertDialog open={downloadFormat !== null} onOpenChange={() => setDownloadFormat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Download {downloadFormat === 'json' ? 'JSON' : downloadFormat === 'csv' ? 'CSV' : 'SQL'} File
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will download your query {downloadFormat === 'sql' ? 'code' : 'results'} as a {downloadFormat?.toUpperCase()} file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDownload}>
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
