import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

// 中间件
app.use(express.json());

// CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * Test endpoint - 验证 SSE 连接是否成功
 */
app.post('/api/test-sse', (req: Request, res: Response) => {
  console.log('📡 SSE 测试连接开始...');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  // 立即发送第一条数据
  res.write(
    'data: {"test":"connected","timestamp":"' +
      new Date().toISOString() +
      '"}\n\n',
  );
  console.log('✅ 第1条消息已发送');

  // 使用递归发送，而不是 setInterval
  let messageNum = 2;

  const sendMessage = () => {
    if (messageNum <= 5) {
      const delay = (messageNum - 1) * 3000; // 每条消息相隔500ms
      setTimeout(() => {
        if (!res.writableEnded) {
          res.write(
            'data: {"test":"message_' +
              messageNum +
              '","timestamp":"' +
              new Date().toISOString() +
              '"}\n\n',
          );
          console.log(`✅ 第${messageNum}条消息已发送`);
          messageNum++;
          sendMessage();
        }
      }, delay);
    } else {
      // 发送完成信号
      setTimeout(() => {
        if (!res.writableEnded) {
          res.write('data: {"test":"done","total":5}\n\n');
          console.log('✅ 所有消息发送完成，连接结束');
          res.end();
        }
      }, 5000);
    }
  };

  sendMessage();

  req.on('close', () => {
    console.log('❌ 客户端断开连接');
  });

  req.on('error', (err: any) => {
    console.error('❌ 请求错误:', err);
  });
});

/**
 * Mock deepinsightConferenceQuestion 接口
 * 读取本地 response_confusionQuestion.txt 文件并流式返回
 */
app.post(
  '/api/deepinsight/conference_question',
  (req: Request, res: Response) => {
    console.log('📡 Conference Question 请求开始...');

    // 使用相对于当前工作目录的路径（项目根目录）
    const responseFile = path.resolve(
      process.cwd(),
      'response_confusionQuestion3.txt',
    );

    // 检查文件是否存在
    if (!fs.existsSync(responseFile)) {
      console.error(`❌ File not found: ${responseFile}`);
      return res.status(404).json({
        code: 404,
        message: `Response file not found: ${responseFile}`,
        data: null,
      });
    }

    try {
      // 使用 writeHead 设置响应头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      });

      // 读取文件内容
      const fileContent = fs.readFileSync(responseFile, 'utf-8');
      const lines = fileContent
        .split('\n')
        .filter((line) => line.trim().length > 0);

      console.log(`✅ 文件读取成功，共 ${lines.length} 行`);

      let lineIndex = 0;
      let sentCount = 0;

      // 递归发送，每行之间有很小的延迟以防止阻塞
      const sendNext = () => {
        if (lineIndex < lines.length && !res.writableEnded) {
          const line = lines[lineIndex];
          res.write(`${line}\n\n`);
          sentCount++;

          if (sentCount % 100 === 0) {
            console.log(`📤 已发送 ${sentCount}/${lines.length} 行数据`);
          }

          lineIndex++;

          // 使用 setTimeout 每隔 100ms 发送下一行
          setTimeout(sendNext, 20);
        } else if (!res.writableEnded) {
          // 所有数据发送完成
          console.log(`✅ 全部 ${sentCount} 行数据发送完成`);
          res.end();
        }
      };

      // 立即开始发送第一行
      sendNext();

      // 客户端断开连接时清理
      req.on('close', () => {
        console.log(`❌ 客户端断开连接，已发送 ${sentCount} 行`);
      });

      req.on('error', (err: any) => {
        console.error('❌ 流错误:', err);
      });
    } catch (error) {
      console.error('❌ Error reading response file:', error);
      if (!res.writableEnded) {
        res.status(500).json({
          code: 500,
          message: 'Internal server error',
          data: null,
        });
      }
    }
  },
);

/**
 * Mock deepinsightChat 接口
 * 读取本地 response_chat.txt 文件并流式返回
 */
app.post('/api/deepinsight/chat', (req: Request, res: Response) => {
  console.log('📡 DeepInsight Chat 请求开始...');

  // 使用相对于当前工作目录的路径（项目根目录）
  const responseFile = path.resolve(process.cwd(), 'response_chat1.txt');

  // 检查文件是否存在
  if (!fs.existsSync(responseFile)) {
    console.error(`❌ File not found: ${responseFile}`);
    return res.status(404).json({
      code: 404,
      message: `Response file not found: ${responseFile}`,
      data: null,
    });
  }

  try {
    // 使用 writeHead 设置响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    // 读取文件内容
    const fileContent = fs.readFileSync(responseFile, 'utf-8');
    const lines = fileContent
      .split('\n')
      .filter((line) => line.trim().length > 0);

    console.log(`✅ 文件读取成功，共 ${lines.length} 行`);

    let lineIndex = 0;
    let sentCount = 0;

    // 递归发送，每行之间有很小的延迟以防止阻塞
    const sendNext = () => {
      if (lineIndex < lines.length && !res.writableEnded) {
        const line = lines[lineIndex];
        res.write(`${line}\n\n`);
        sentCount++;

        if (sentCount % 100 === 0) {
          console.log(`📤 已发送 ${sentCount}/${lines.length} 行数据`);
        }

        lineIndex++;

        // 使用 setTimeout 每隔 500ms 发送下一行
        setTimeout(sendNext, 20);
      } else if (!res.writableEnded) {
        // 所有数据发送完成
        console.log(`✅ 全部 ${sentCount} 行数据发送完成`);
        res.end();
      }
    };

    // 立即开始发送第一行
    sendNext();

    // 客户端断开连接时清理
    req.on('close', () => {
      console.log(`❌ 客户端断开连接，已发送 ${sentCount} 行`);
    });

    req.on('error', (err: any) => {
      console.error('❌ 流错误:', err);
    });
  } catch (error) {
    console.error('❌ Error reading response file:', error);
    if (!res.writableEnded) {
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
        data: null,
      });
    }
  }
});

/**
 * Mock completeConversation 接口
 * 标准的回答格式
 */
app.post('/api/conversation/complete', (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const mockResponse = {
      code: 0,
      message: '',
      data: {
        id: 'msg_complete_001',
        session_id: 'conv_complete_123',
        answer: '这是标准 API 的回答示例。支持 Markdown 格式。',
        reference: { chunks: [] },
      },
    };

    res.write(`data:${JSON.stringify(mockResponse)}\n\n`);
    res.write(`data:{"code": 0, "message": "", "data": true}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error in complete endpoint:', error);
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      data: null,
    });
  }
});

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  DeepInsight Mock Server Started         ║
╚══════════════════════════════════════════╝

📍 Server running at: http://localhost:${PORT}

Available endpoints:
  • POST /api/deepinsight/conference_question
  • POST /api/deepinsight/chat
  • POST /api/conversation/complete
  • GET  /health

Tips:
  1. Ensure response_confusionQuestion.txt exists in the root directory
  2. Use http://localhost:${PORT} as the base URL for API calls
  3. CORS is enabled for all origins

Ctrl+C to stop the server
  `);
});

export default app;
