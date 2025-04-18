// mock-server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 模拟HTTP POST响应
app.post("/api/v1/chat/send_message", (req, res) => {
  console.log("Received request:", req.body);

  // 返回一个模拟的session_id
  res.json({
    session_id: "12345",
  });
});

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({
  server,
  path: "/api/v1/ws/tran_ans",
});

// 处理WebSocket连接
wss.on("connection", (ws, req) => {
  console.log("WebSocket connected");

  // 解析URL查询参数
  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log("Connection params:", {
    uuid: url.searchParams.get("uuid"),
    session_id: url.searchParams.get("session_id"),
    model_id: url.searchParams.get("model_id"),
  });

  // 模拟打字响应
  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "content",
        content: "Hello, ",
      })
    );
  }, 500);

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "content",
        content: "I am a test message that simulates ",
      })
    );
  }, 1500);

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "content",
        content: "an AI response from the server. ",
      })
    );
  }, 2500);

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "content",
        content: "This confirms your frontend is working correctly!",
      })
    );
  }, 3500);

  // 发送完成信号
  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "done",
        message_id: "67890",
      })
    );
  }, 4000);
});

// 启动服务器
server.listen(3000, () => {
  console.log("Mock server running on http://localhost:3000");
});
