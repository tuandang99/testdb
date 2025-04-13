#!/usr/bin/env node

/**
 * Standalone Server for Database Management Application (CommonJS version)
 *
 * Tương thích với Node.js phiên bản cũ không hỗ trợ ES modules
 * Hỗ trợ tự động đổi port khi port bị bận
 * 
 * Sử dụng:
 * node standalone-server.cjs
 *
 * Biến môi trường:
 * - PORT: Cổng để lắng nghe (mặc định: 5000)
 * - HOST: Địa chỉ IP để lắng nghe (mặc định: 127.0.0.1 trên Windows, 0.0.0.0 trên các OS khác)
 * - DATABASE_URL: URL kết nối PostgreSQL (có thể bỏ qua nếu kết nối thủ công)
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Tạo Express app
const app = express();

// Sử dụng biến để có thể thay đổi trong quá trình chạy (trong trường hợp port bị chiếm)
let startPort = process.env.PORT ? Number(process.env.PORT) : 5000;
let defaultHost = process.platform === 'win32' ? '127.0.0.1' : '0.0.0.0';
let host = process.env.HOST || defaultHost;

// Xác định thư mục public nếu có
let publicDir = path.join(__dirname, 'dist', 'public');
if (!fs.existsSync(publicDir)) {
  publicDir = path.join(__dirname, 'client', 'dist');
  if (!fs.existsSync(publicDir)) {
    console.warn('Không tìm thấy thư mục dist/public, có thể bạn cần build frontend trước.');
  }
}

// Middleware
app.use(express.json());
app.use(express.static(publicDir));
app.use('/api', (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).json({ error: 'Server error', message: err?.message || 'Unknown error' });
});

// Kết nối cơ sở dữ liệu nếu có DATABASE_URL
let pool;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('Đã kết nối tới PostgreSQL');
  } catch (err) {
    console.error('Lỗi kết nối PostgreSQL:', err);
  }
}

// API routes
app.get('/api/connections', async (req, res) => {
  try {
    if (!pool) {
      return res.json([]);
    }
    const result = await pool.query('SELECT * FROM db_connections ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching connections:', err);
    res.status(500).json({ error: err.message });
  }
});

// Thêm các route API khác ở đây...

// Phục vụ ứng dụng React (SPA fallback)
app.get('*', (req, res) => {
  const indexFile = path.join(publicDir, 'index.html');
  
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send(
      '<h1>Database Manager</h1>' +
      '<p>Frontend chưa được build hoặc không tìm thấy.</p>' +
      '<p>Vui lòng build frontend trước khi chạy server này.</p>'
    );
  }
});

// Tạo HTTP server
const server = http.createServer(app);

// Khởi động server với xử lý lỗi và tự động tìm port
function tryListenOnPort(portToTry, maxAttempts = 5) {
  let currentAttempt = 0;
  
  function startListening(port, useHost) {
    // Loại bỏ các event listeners trước đó để tránh memory leak
    server.removeAllListeners('error');
    server.removeAllListeners('listening');
    
    // Xử lý lỗi khi không thể bind vào port
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        // Port đang bị sử dụng, thử port khác
        if (currentAttempt < maxAttempts) {
          currentAttempt++;
          const nextPort = port + 1;
          console.log(`Port ${port} đang bận, thử port ${nextPort}`);
          startListening(nextPort, useHost);
        } else {
          console.log(`Không tìm thấy port khả dụng sau ${maxAttempts} lần thử. Port cuối: ${port}`);
          process.exit(1);
        }
      } else if (error.code === 'ENOTSUP' && useHost === '0.0.0.0') {
        // 0.0.0.0 không được hỗ trợ (thường trên Windows), thử dùng 127.0.0.1
        console.log(`Địa chỉ ${useHost} không được hỗ trợ, thử với 127.0.0.1:${port}`);
        startListening(port, '127.0.0.1');
      } else {
        // Lỗi khác, hiển thị và exit
        console.error(`Lỗi khởi động server: ${error.code} - ${error.message}`);
        process.exit(1);
      }
    });
    
    // Khi server đã lắng nghe thành công
    server.once('listening', () => {
      const address = server.address();
      const listeningURL = 
        typeof address === 'string' ? 
        address : 
        `http://${address.address === '0.0.0.0' ? 'localhost' : address.address}:${address.port}`;
      
      console.log(`Server đang chạy tại ${listeningURL}`);
      console.log(`Nhấn Ctrl+C để dừng server`);
    });
    
    // Bắt đầu lắng nghe
    server.listen(port, useHost);
  }
  
  // Bắt đầu quá trình
  startListening(portToTry, host);
}

// Khởi động server
console.log(`Khởi động server...`);
tryListenOnPort(startPort);

// Xử lý tín hiệu tắt server
process.on('SIGINT', () => {
  console.log('\nĐang đóng server...');
  server.close(() => {
    console.log('Server đã đóng.');
    process.exit(0);
  });
});