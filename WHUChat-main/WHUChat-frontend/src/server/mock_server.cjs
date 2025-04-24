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
  if (uuid == 0 && session_id == 1) {
    mockMessages = [
      {
        // 用户消息
        id: 10,
        model_id: null,
        prompt: {
          content: "你好，这是一个历史消息。",
          role: "user",
        },
        sender: "user",
        session_id: 1,
        uuid: 0,
      },
      {
        // 机器人消息
        id: 11,
        model_id: 3,
        prompt: {
          content: "是的，我是历史记录中的机器人回复。",
          role: "assistant",
        },
        sender: "assistant",
        session_id: 1,
        uuid: 0,
        model_class: "anthropic",
      },
      {
        // 用户带图片的消息 - 这里需要特殊处理，因为图片需要用数组格式
        id: 12,
        model_id: null,
        prompt: [
          {
            type: "image",
            content: { url: "https://via.placeholder.com/150/92c952" },
          },
          {
            type: "text",
            content: "这是什么图片？(历史)",
          },
        ],
        sender: "user",
        session_id: 1,
        uuid: 0,
      },
      {
        // 机器人回复
        id: 13,
        model_id: 5,
        prompt: {
          content: "这是一张占位符图片。(历史)",
          role: "assistant",
        },
        sender: "assistant",
        session_id: 1,
        uuid: 0,
        model_class: "openai",
      },
    ];
  } else if (uuid === 0 && session_id === 8) {
    // 额外添加一个测试会话
    mockMessages = [
      {
        id: 20,
        model_id: 1,
        prompt: {
          content: "这是第二个测试会话",
          role: "user",
        },
        sender: "user",
        session_id: 8,
        uuid: 0,
      },
      {
        id: 21,
        model_id: 1,
        prompt: {
          content: "你好，这是第二个会话的回复",
          role: "assistant",
        },
        sender: "assistant",
        session_id: 8,
        uuid: 0,
      },
      {
        id: 22,
        model_id: 1,
        prompt: {
          content: "测试后续问题",
          role: "user",
        },
        sender: "user",
        session_id: 8,
        uuid: 0,
      },
      {
        id: 23,
        model_id: 1,
        prompt: {
          content: "ceshi",
          role: "assistant",
        },
        sender: "assistant",
        session_id: 8,
        uuid: 0,
      },
    ];
  } else {
    mockMessages = [];
  }
  // 返回模拟的历史对话数据，结构依照文档
  res.json({
    error: 0,
    messages: mockMessages,
  });
});

// 模拟获取用户所有会话列表的接口
app.post("/api/v1/chat/history", (req, res) => {
  console.log("Received request for /api/v1/chat/history:", req.body);
  const { uuid } = req.body;

  // 验证请求参数
  if (uuid === undefined || uuid === null) {
    console.log("Missing uuid parameter");
    return res
      .status(400)
      .json({ error: 2001, message: "Missing uuid parameter" });
  }

  // 为不同的用户返回不同的会话列表
  let mockSessions = [];

  // 默认用户 uuid=0 的会话列表
  if (uuid === 0) {
    mockSessions = [
      {
        uuid: 0,
        id: 1,
        title: "历史消息测试会话",
        updated_at: "2025-04-20T10:30:45Z",
      },
      {
        uuid: 0,
        id: 8,
        title: "第二个测试会话",
        updated_at: "2025-04-22T15:20:10Z",
      },
      {
        uuid: 0,
        id: 12,
        title: "Claude-3 Haiku 对话",
        updated_at: "2025-04-21T08:45:30Z",
      },
      {
        uuid: 0,
        id: 15,
        title: "Gemini 测试会话",
        updated_at: "2025-04-23T09:15:22Z",
      },
    ];
  }
  // 用户 uuid=1 的会话列表
  else if (uuid === 1) {
    mockSessions = [
      {
        uuid: 1,
        id: 25,
        title: "项目讨论",
        updated_at: "2025-04-22T11:45:30Z",
      },
      {
        uuid: 1,
        id: 26,
        title: "代码优化建议",
        updated_at: "2025-04-23T14:20:15Z",
      },
    ];
  }
  // 其他用户返回空列表
  else {
    mockSessions = [];
  }

  // 按更新时间降序排序（最新的在前面）
  mockSessions.sort((a, b) => {
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  // 返回模拟的会话列表数据
  res.json({
    error: 0,
    sessions: mockSessions,
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
