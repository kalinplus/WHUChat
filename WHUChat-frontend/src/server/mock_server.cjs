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

// 模拟回应用户对话的HTTP POST响应
app.post("/api/v1/chat/send_message", (req, res) => {
  console.log("Received request:", req.body);

  // 返回一个模拟的session_id
  res.json({
    session_id: "12345",
  });
});

// 模拟获取一个会话内所有历史对话的HTTP POST响应
app.post("/api/v1/chat/browse_messages", (req, res) => {
  // 测试接口能正常连接
  console.log("Received request for /api/v1/chat/browse_messages:", req.body);
  const { uuid, session_id } = req.body;
  // 简单验证
  if (uuid === null || session_id === undefined || session_id === null) {
    console.log("Missing uuid or session_id"); // 尽管不可能
    return res
      .status(400)
      .json({ error: 2003, message: "Missing uuid or session_id" });
  }
  // 模拟不同会话返回不同历史记录
  let mockMessages = [];
  if (uuid === 0 && session_id === 1) {
    mockMessages = [
      {
        uuid: 0,
        session_id: 1,
        is_bot: false, // 用户消息
        prompt: [{ type: "text", content: "你好，这是一个历史消息。" }],
        model_id: null,
        model_class: null,
        // 其他字段根据需要添加，如 parameters (如果后端存储了)
      },
      {
        uuid: 0,
        session_id: 1,
        is_bot: true, // 机器人消息
        prompt: [
          { type: "text", content: "是的，我是历史记录中的机器人回复。" },
        ],
        model_id: 3,
        model_class: "anthropic",
      },
      {
        uuid: 0,
        session_id: 1,
        is_bot: false,
        prompt: [
          {
            type: "image",
            content: { url: "https://via.placeholder.com/150/92c952" },
          }, // 模拟图片
          { type: "text", content: "这是什么图片？(历史)" }, // 模拟图片+文字
        ],
        model_id: null,
        model_class: null,
      },
      {
        uuid: 0,
        session_id: 1,
        is_bot: true,
        prompt: [{ type: "text", content: "这是一张占位符图片。(历史)" }],
        model_id: 5,
        model_class: "openai",
      },
    ];
  } else {
    mockMessages = [];
  }

  // 返回模拟的历史对话数据，结构依照文档
  res.json({
    error: 0,
    messages: mockMessages
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
