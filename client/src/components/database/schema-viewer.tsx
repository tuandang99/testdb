import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle,
  Key,
  Link as LinkIcon,
  DatabaseIcon,
  ArrowRight
} from "lucide-react";

interface SchemaViewerProps {
  connectionId: number;
  tableName: string;
}

export function SchemaViewer({ connectionId, tableName }: SchemaViewerProps) {
  // Fetch schema info
  const { data: schema, isLoading, error } = useQuery({
    queryKey: [`/api/schema/${connectionId}/${tableName}`],
    enabled: !!connectionId && !!tableName,
  });

  if (isLoading) {
    return (
      <aside className="hidden lg:block w-80 border-l border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-4 border-b border-gray-200">
          <Skeleton className="h-5 w-32 mb-2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="p-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-md" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  if (error || !schema) {
    return (
      <aside className="hidden lg:block w-80 border-l border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 flex items-center text-error">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Failed to load schema information</span>
        </div>
      </aside>
    );
  }

  const { columns, primaryKeys, foreignKeys, indexes, recordCount, name } = schema;

  return (
    <aside className="hidden lg:block w-80 border-l border-gray-200 bg-white overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Table Details</h3>
      </div>
      
      {/* Table properties */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Properties</h4>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-500">Name:</dt>
            <dd className="text-sm text-gray-900">{name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-500">Records:</dt>
            <dd className="text-sm text-gray-900">{recordCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-500">Columns:</dt>
            <dd className="text-sm text-gray-900">{columns.length}</dd>
          </div>
        </dl>
      </div>
      
      {/* Schema */}
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Structure</h4>
          <div className="space-y-3">
            {columns.map((column: any) => (
              <div key={column.column_name} className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 flex items-center">
                    {primaryKeys.includes(column.column_name) && (
                      <Key className="h-3 w-3 text-amber-500 mr-1" />
                    )}
                    {column.column_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {column.data_type.toUpperCase()}
                    {column.character_maximum_length ? `(${column.character_maximum_length})` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {primaryKeys.includes(column.column_name) && (
                    <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                      Primary Key
                    </Badge>
                  )}
                  {column.column_default && (
                    <Badge variant="outline" className="text-xs">
                      Default: {column.column_default}
                    </Badge>
                  )}
                  {column.is_nullable === "NO" && (
                    <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                      NOT NULL
                    </Badge>
                  )}
                  
                  {/* Check if this column is a foreign key */}
                  {foreignKeys.some((fk: any) => fk.column_name === column.column_name) && (
                    <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                      Foreign Key
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Indexes */}
        {indexes.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Indexes</h4>
            <ul className="space-y-2">
              {indexes.map((index: any, idx: number) => (
                <li key={idx} className="text-sm">
                  <span className="font-medium">{index.indexname}</span>
                  <p className="text-xs text-gray-500 mt-1">{index.indexdef}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Relationships */}
        {foreignKeys.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Relationships</h4>
            <div className="space-y-2">
              {foreignKeys.map((fk: any, idx: number) => (
                <div key={idx} className="p-2 bg-purple-50 border border-purple-100 rounded-md">
                  <div className="flex items-center">
                    <LinkIcon className="h-4 w-4 text-purple-500 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    <span className="mx-1 text-gray-500">
                      <ArrowRight className="h-3 w-3 inline" />
                    </span>
                    <span className="text-sm text-gray-900">{fk.foreign_table_name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    via {fk.column_name} → {fk.foreign_column_name} (Foreign Key)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
