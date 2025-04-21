// mock-server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 添加一个测试根路由
app.get("/", (req, res) => {
  console.log("Root route accessed!");
  res.send("Mock server is alive!");
});

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

  // 模拟发送分段消息
  // 1. 发送开始标记
  setTimeout(() => {
    console.log("Sending: $$$$$$$$$$");
    ws.send("$$$$$$$$$$");
  }, 500);

  // 2. 发送消息片段 1
  setTimeout(() => {
    const fragment = "你好，";
    console.log("Sending:", fragment);
    ws.send(fragment);
  }, 1000);

  // 3. 发送消息片段 2
  setTimeout(() => {
    const fragment = "这是一个模拟的";
    console.log("Sending:", fragment);
    ws.send(fragment);
  }, 1500);

  // 4. 发送消息片段 3
  setTimeout(() => {
    const fragment = "分段消息。";
    console.log("Sending:", fragment);
    ws.send(fragment);
  }, 2000);

  // 5. 发送结束标记
  setTimeout(() => {
    console.log("Sending: ##########");
    ws.send("##########");
    // 注意：这里不再由服务器主动关闭连接
    // 服务器发送完结束标记后就等待客户端的操作或关闭
  }, 2500);

  ws.on("close", (code, reason) => {
    // 这个监听器仍然有用，可以知道连接何时关闭
    console.log(
      `WebSocket closed on server: Code ${code}, Reason: ${reason.toString()}`
    );
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// 启动服务器
server.listen(886, () => {
  console.log("Mock server running on http://localhost:886");
});
