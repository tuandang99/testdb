import { TableName } from '@shared/schema';
import { apiRequest } from './queryClient';

interface ConnectionCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

interface SavedConnection {
  id: number;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  isActive: boolean;
  lastConnected: string | null;
}

interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  recordCount: number;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  column_default: string | null;
  is_nullable: 'YES' | 'NO';
}

interface ForeignKeyInfo {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: FieldInfo[];
}

interface FieldInfo {
  name: string;
  dataTypeID: number;
}

interface TableData {
  data: any[];
  total: number;
}

interface SavedQuery {
  id: number;
  name: string;
  query: string;
  connectionId: number;
  createdAt: string;
}

export async function testConnection(credentials: ConnectionCredentials): Promise<boolean> {
  const response = await apiRequest('POST', '/api/connections/test', credentials);
  const data = await response.json();
  return data.success;
}

export async function createConnection(connection: ConnectionCredentials & { name: string }): Promise<SavedConnection> {
  const response = await apiRequest('POST', '/api/connections', connection);
  return await response.json();
}

export async function updateConnection(id: number, connection: Partial<ConnectionCredentials & { name: string }>): Promise<SavedConnection> {
  const response = await apiRequest('PUT', `/api/connections/${id}`, connection);
  return await response.json();
}

export async function deleteConnection(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/connections/${id}`);
}

export async function getTableSchema(connectionId: number, tableName: string): Promise<TableSchema> {
  const response = await apiRequest('GET', `/api/schema/${connectionId}/${tableName}`);
  return await response.json();
}

export async function getTableData(
  connectionId: number,
  tableName: string,
  page: number = 1,
  pageSize: number = 50
): Promise<TableData> {
  const response = await apiRequest(
    'GET',
    `/api/data/${connectionId}/${tableName}?page=${page}&pageSize=${pageSize}`
  );
  return await response.json();
}

export async function executeQuery(connectionId: number, query: string): Promise<QueryResult> {
  const response = await apiRequest('POST', `/api/query/${connectionId}`, { query });
  return await response.json();
}

export async function saveQuery(
  connectionId: number,
  name: string,
  query: string
): Promise<SavedQuery> {
  const response = await apiRequest('POST', '/api/saved-queries', {
    name,
    query,
    connectionId
  });
  return await response.json();
}

export async function getSavedQueries(connectionId?: number): Promise<SavedQuery[]> {
  const endpoint = connectionId 
    ? `/api/saved-queries?connectionId=${connectionId}`
    : '/api/saved-queries';
  const response = await apiRequest('GET', endpoint);
  return await response.json();
}

export async function exportTableData(
  connectionId: number,
  tableName: string,
  format: 'json' | 'csv' | 'sql'
): Promise<Blob> {
  // This would be implemented with a SQL query to get all data and then format it
  // For now we're handling this directly in the components
  throw new Error('Not implemented');
}
