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
    // 在发送完 "done" 消息后，发起正常的关闭连接
    // 使用代码 1000 表示正常关闭
    // 可以稍微延迟一点点确保消息发出
    setTimeout(() => {
      console.log("Mock server closing WebSocket connection normally.");
      ws.close(1000, "Simulation finished"); // <--- 添加这行
    }, 100); // 延迟 100ms 关闭
  }, 4000);

  ws.on("close", (code, reason) => {
    // 添加 close 事件监听器以确认服务器端关闭
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
