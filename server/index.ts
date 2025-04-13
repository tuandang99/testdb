import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Xác định host dựa trên hệ điều hành
  // Windows thường không hỗ trợ 0.0.0.0 (gây lỗi ENOTSUP) nên dùng 127.0.0.1
  // Các hệ điều hành khác dùng 0.0.0.0 để ứng dụng có thể truy cập từ bên ngoài
  const startPort = process.env.PORT ? Number(process.env.PORT) : 5000;
  const defaultHost = process.platform === 'win32' ? '127.0.0.1' : '0.0.0.0';
  const host = process.env.HOST || defaultHost;
  
  // Hàm thử lắng nghe trên một port cụ thể
  function tryListenOnPort(portToTry: number, maxAttempts: number = 5) {
    let currentAttempt = 0;
    
    function startListening(port: number, useHost: string) {
      // Loại bỏ các event listeners trước đó để tránh memory leak
      server.removeAllListeners('error');
      server.removeAllListeners('listening');
      
      // Xử lý lỗi khi không thể bind vào port
      server.once('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          // Port đang bị sử dụng, thử port khác
          if (currentAttempt < maxAttempts) {
            currentAttempt++;
            const nextPort = port + 1;
            log(`Port ${port} in use, trying port ${nextPort}`);
            startListening(nextPort, useHost);
          } else {
            log(`Failed to find available port after ${maxAttempts} attempts. Last tried: ${port}`);
            throw error;
          }
        } else if (error.code === 'ENOTSUP' && useHost === '0.0.0.0') {
          // 0.0.0.0 không được hỗ trợ (thường trên Windows), thử dùng 127.0.0.1
          log(`Failed to bind to ${useHost}:${port}, trying 127.0.0.1:${port}`);
          startListening(port, '127.0.0.1');
        } else {
          // Lỗi khác, hiển thị và throw
          log(`Error starting server: ${error.code} - ${error.message}`);
          throw error;
        }
      });
      
      // Khi server đã lắng nghe thành công
      server.once('listening', () => {
        const address = server.address();
        const listeningHost = typeof address === 'string' ? address : `${address?.address}:${address?.port}`;
        log(`Server is serving on ${listeningHost}`);
      });
      
      // Bắt đầu lắng nghe
      server.listen({
        port: port,
        host: useHost,
        reusePort: true
      });
    }
    
    // Bắt đầu quá trình
    startListening(portToTry, host);
  }
  
  // Bắt đầu lắng nghe từ port được chỉ định
  tryListenOnPort(startPort);
})();
