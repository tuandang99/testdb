import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDbConnectionSchema, insertSavedQuerySchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    console.error("API Error:", err);
    
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationError.details 
      });
    }
    
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  };

  // Connection routes
  router.get("/connections", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getConnections();
      // Don't send passwords to client
      const safeConnections = connections.map(conn => ({
        ...conn,
        password: undefined
      }));
      res.json(safeConnections);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/connections/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const connection = await storage.getConnection(id);
      
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }
      
      // Don't send password to client
      const { password, ...safeConnection } = connection;
      res.json(safeConnection);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/connections", async (req: Request, res: Response) => {
    try {
      const connection = insertDbConnectionSchema.parse(req.body);
      
      try {
        // Test the connection before saving
        await storage.testConnection(connection);
        
        // If successful, create the connection
        const newConnection = await storage.createConnection(connection);
        
        // Don't return password
        const { password, ...safeConnection } = newConnection;
        res.status(201).json(safeConnection);
      } catch (connectionErr: any) {
        // Trả về lỗi kết nối cụ thể với status 400
        console.error("Connection creation error:", connectionErr);
        res.status(400).json({ 
          message: connectionErr.message || "Failed to connect to database",
          error: connectionErr.originalError?.message
        });
      }
    } catch (err) {
      // Lỗi xác thực dữ liệu đầu vào
      handleError(err, res);
    }
  });

  router.put("/connections/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Validate partial updates
      const updateData = insertDbConnectionSchema.partial().parse(req.body);
      
      // If connection details are changing, test the connection
      if (updateData.host || updateData.port || updateData.database || 
          updateData.username || updateData.password || updateData.ssl !== undefined) {
        
        // Get current connection data
        const currentConnection = await storage.getConnection(id);
        if (!currentConnection) {
          return res.status(404).json({ message: "Connection not found" });
        }
        
        // Merge with updates for testing
        const testConnection = {
          name: updateData.name || currentConnection.name,
          host: updateData.host || currentConnection.host,
          port: updateData.port || currentConnection.port,
          database: updateData.database || currentConnection.database,
          username: updateData.username || currentConnection.username,
          password: updateData.password || currentConnection.password,
          ssl: updateData.ssl !== undefined ? updateData.ssl : currentConnection.ssl
        };
        
        try {
          // Test the connection with updated details
          await storage.testConnection(testConnection);
        } catch (connectionErr: any) {
          // Trả về lỗi kết nối cụ thể với status 400
          console.error("Connection update error:", connectionErr);
          return res.status(400).json({ 
            message: connectionErr.message || "Failed to connect to database with the updated credentials",
            error: connectionErr.originalError?.message
          });
        }
      }
      
      // Cập nhật kết nối trong database
      const updatedConnection = await storage.updateConnection(id, updateData);
      
      if (!updatedConnection) {
        return res.status(404).json({ message: "Connection not found" });
      }
      
      // Don't return password
      const { password, ...safeConnection } = updatedConnection;
      res.json(safeConnection);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.delete("/connections/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await storage.deleteConnection(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Connection not found" });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/connections/test", async (req: Request, res: Response) => {
    try {
      const connection = insertDbConnectionSchema.parse(req.body);
      
      try {
        await storage.testConnection(connection);
        res.json({ success: true });
      } catch (connectionErr: any) {
        // Trả về lỗi kết nối cụ thể với status 400
        console.error("Connection test error:", connectionErr);
        res.status(400).json({ 
          success: false, 
          message: connectionErr.message || "Failed to connect to database",
          error: connectionErr.originalError?.message
        });
      }
    } catch (err) {
      // Lỗi xác thực dữ liệu đầu vào
      handleError(err, res);
    }
  });

  // Saved queries routes
  router.get("/saved-queries", async (req: Request, res: Response) => {
    try {
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string, 10) : undefined;
      const queries = await storage.getSavedQueries(connectionId);
      res.json(queries);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/saved-queries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const query = await storage.getSavedQuery(id);
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      res.json(query);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/saved-queries", async (req: Request, res: Response) => {
    try {
      const query = insertSavedQuerySchema.parse(req.body);
      const newQuery = await storage.createSavedQuery(query);
      res.status(201).json(newQuery);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.put("/saved-queries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updateData = insertSavedQuerySchema.partial().parse(req.body);
      
      const updatedQuery = await storage.updateSavedQuery(id, updateData);
      
      if (!updatedQuery) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      res.json(updatedQuery);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.delete("/saved-queries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await storage.deleteSavedQuery(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Database operations routes
  router.get("/databases/:connectionId", async (req: Request, res: Response) => {
    try {
      const connectionId = parseInt(req.params.connectionId, 10);
      const databases = await storage.listDatabases(connectionId);
      res.json(databases);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/tables/:connectionId", async (req: Request, res: Response) => {
    try {
      const connectionId = parseInt(req.params.connectionId, 10);
      const tables = await storage.listTables(connectionId);
      res.json(tables);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/schema/:connectionId/:table", async (req: Request, res: Response) => {
    try {
      const connectionId = parseInt(req.params.connectionId, 10);
      const table = req.params.table;
      const schema = await storage.getTableSchema(connectionId, table);
      res.json(schema);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/data/:connectionId/:table", async (req: Request, res: Response) => {
    try {
      const connectionId = parseInt(req.params.connectionId, 10);
      const table = req.params.table;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;
      
      const result = await storage.getTableData(connectionId, table, page, pageSize);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/query/:connectionId", async (req: Request, res: Response) => {
    try {
      const connectionId = parseInt(req.params.connectionId, 10);
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }
      
      const result = await storage.executeQuery(connectionId, query);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Register the router with a prefix
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
