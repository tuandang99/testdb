import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  Plus,
  Download,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  Image,
  Link as LinkIcon,
  ExternalLink,
  Save,
  X,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2
} from "lucide-react";

interface TableViewerProps {
  connectionId: number;
  tableName: string;
}

export function TableViewer({ connectionId, tableName }: TableViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "sql">("json");
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch schema info
  const { data: schemaInfo, isLoading: schemaLoading } = useQuery({
    queryKey: [`/api/schema/${connectionId}/${tableName}`],
    enabled: !!connectionId && !!tableName,
  });

  // Fetch table data
  const { data: tableData, isLoading: dataLoading } = useQuery({
    queryKey: [`/api/data/${connectionId}/${tableName}?page=${page}&pageSize=${pageSize}`],
    enabled: !!connectionId && !!tableName,
  });

  // Reset page when table changes
  useEffect(() => {
    setPage(1);
  }, [tableName]);

  // Function to render cell content
  const renderCellContent = (row: any, columnName: string) => {
    const value = row[columnName];
    
    if (value === null) {
      return <span className="text-gray-400 italic">NULL</span>;
    }
    
    // Check if it's likely an image URL or path
    if (typeof value === 'string' && 
        (columnName.toLowerCase().includes('image') || 
         columnName.toLowerCase().includes('avatar') || 
         columnName.toLowerCase().includes('photo') || 
         columnName.toLowerCase().includes('picture'))) {
      
      if (value.match(/^https?:\/\//i) || value.startsWith('/')) {
        return (
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-gray-400" />
            <span className="truncate max-w-[200px]" title={value}>{value}</span>
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-dark"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        );
      }
    }
    
    // Handle JSON data
    if (typeof value === 'object') {
      return <span className="font-mono text-xs">{JSON.stringify(value)}</span>;
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    return String(value);
  };

  const getPageNumbers = () => {
    if (!tableData) return [];
    
    const totalPages = Math.ceil(tableData.total / pageSize);
    let pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Show pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    
    // Always show last page if there are more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    // Add ellipsis where needed
    const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);
    const result = [];
    
    for (let i = 0; i < uniquePages.length; i++) {
      // Add ellipsis if pages are not consecutive
      if (i > 0 && uniquePages[i] > uniquePages[i - 1] + 1) {
        result.push('ellipsis');
      }
      result.push(uniquePages[i]);
    }
    
    return result;
  };

  // Export table data
  const handleExport = async () => {
    setExportLoading(true);
    try {
      // Use SQL to get all data
      const query = `SELECT * FROM "${tableName}"`;
      const result = await apiRequest("POST", `/api/query/${connectionId}`, { query });
      const data = await result.json();
      
      let content = '';
      let filename = `${tableName}_export_${new Date().toISOString().slice(0, 10)}`;
      
      if (exportFormat === 'json') {
        content = JSON.stringify(data.rows, null, 2);
        filename += '.json';
      } else if (exportFormat === 'csv') {
        // Create CSV header
        const headers = data.fields.map((f: any) => f.name).join(',');
        // Create CSV rows
        const rows = data.rows.map((row: any) => 
          data.fields.map((f: any) => {
            const value = row[f.name];
            if (value === null) return '';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
            return value;
          }).join(',')
        ).join('\n');
        
        content = `${headers}\n${rows}`;
        filename += '.csv';
      } else if (exportFormat === 'sql') {
        // Create SQL INSERT statements
        const tableCols = data.fields.map((f: any) => `"${f.name}"`).join(', ');
        
        const insertStmts = data.rows.map((row: any) => {
          const values = data.fields.map((f: any) => {
            const value = row[f.name];
            if (value === null) return 'NULL';
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            return value;
          }).join(', ');
          
          return `INSERT INTO "${tableName}" (${tableCols}) VALUES (${values});`;
        }).join('\n');
        
        content = insertStmts;
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
      
      setShowExportDialog(false);
      toast({
        title: "Export successful",
        description: `Table data exported as ${exportFormat.toUpperCase()}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  if (schemaLoading || dataLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-60" />
        </div>
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-60" />
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex space-x-4">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tableData || !schemaInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-gray-500">
              No data available for table: {tableName}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left toolbar */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>RefreshCw</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>Insert Row</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  setExportFormat("json");
                  setShowExportDialog(true);
                }}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setExportFormat("csv");
                  setShowExportDialog(true);
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setExportFormat("sql");
                  setShowExportDialog(true);
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as SQL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Right toolbar */}
          <div className="flex items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search records..."
                className="pl-9 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">{tableName}</h2>
          <span className="text-sm text-gray-500">{tableData.total} rows</span>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  {schemaInfo.columns.map((column: any) => (
                    <TableHead key={column.column_name} className="whitespace-nowrap">
                      <div className="flex items-center">
                        <span>{column.column_name}</span>
                        <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.data.map((row: any, index: number) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    {schemaInfo.columns.map((column: any) => (
                      <TableCell key={column.column_name} className="whitespace-nowrap">
                        {renderCellContent(row, column.column_name)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </div>
        </ScrollArea>
        
        <div className="border-t border-gray-200 p-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value, 10));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, i) => 
                pageNum === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={page === pageNum}
                      onClick={() => setPage(pageNum as number)}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => {
                    if (tableData.total > page * pageSize) {
                      setPage(prev => prev + 1);
                    }
                  }}
                  className={tableData.total <= page * pageSize ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          
          <div className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * pageSize + 1, tableData.total)} to {Math.min(page * pageSize, tableData.total)} of {tableData.total} rows
          </div>
        </div>
      </div>
      
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export {tableName} Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Export Format</h4>
              <div className="flex flex-col space-y-2">
                <Button
                  variant={exportFormat === "json" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setExportFormat("json")}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant={exportFormat === "csv" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setExportFormat("csv")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === "sql" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setExportFormat("sql")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  SQL (INSERT statements)
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exportLoading}>
              {exportLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
