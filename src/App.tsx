import { useEffect, useRef, useState } from "react";
import "./App.css";
import { ModeToggle } from "./components/mode-toggle";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Eye, EyeOff } from "lucide-react";
import {
  CustomEventDataType,
  CustomEventReadyStateChangeType,
  CustomEventType,
  SSE,
  SSEOptionsMethod,
} from "sse-ts";
import ReactMarkdownAsync from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";

const defaultConfig = {
  systemPrompt: "",
  url: "https://api.openai.com",
  apiKey: "",
  model: "gpt-3.5-turbo",
  temperature: 1,
  top_p: 1,
  maxLength: 30,
};
function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const responseRef = useRef("");
  // 在组件状态区添加：
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState(defaultConfig);
  const history = useRef<
    { role: "user" | "system" | "assistant"; content: string }[]
  >([]);
  useEffect(() => {
    responseRef.current = response;
  }, [response]);

  useEffect(() => {
    const config = localStorage.getItem("config");

    if (config) {
      try {
        setConfig(JSON.parse(config));
      } catch (error) {
        console.log(error);
      }
    }
  }, []);

  // 发送消息处理函数
  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse("");
    history.current.push({
      role: "user",
      content: input,
    });
    const source = new SSE(`${config.url}/v1/chat/completions`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      method: SSEOptionsMethod.POST,
      payload: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: config.systemPrompt,
          },
          ...history.current.slice(-1 * config.maxLength),
        ],
        stream: true,
      }),
    });

    setInput("");

    source.addEventListener("message", (e: CustomEventType) => {
      const dataEvent = e as CustomEventDataType;

      if (dataEvent.data !== "[DONE]") {
        const payload = JSON.parse(dataEvent.data);

        const text = payload.choices[0].delta.content;

        if (text) {
          responseRef.current = responseRef.current + text;
          setResponse(responseRef.current);
        }
      } else {
        setLoading(false);
        history.current.push({
          role: "assistant",
          content: responseRef.current,
        });
        source.close();
      }
    });

    source.addEventListener("readystatechange", (e: CustomEventType) => {
      const dataEvent = e as CustomEventReadyStateChangeType;
      if (dataEvent.readyState >= 2) {
        setLoading(false);
      }
    });
    source.stream();
  };

  const handleClean = () => {
    setInput("");
    setResponse("");
  };

  return (
    <div className="flex h-screen">
      {showSavedAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <Alert variant="default">
            <AlertTitle className="text-green-600">保存成功!</AlertTitle>
          </Alert>
        </div>
      )}

      {/* 左边对话区域 */}
      <div className="flex-1 p-4  flex flex-col">
        <div className="h-[calc(100vh-160px)]  overflow-auto mb-4 space-y-4 border rounded-2xl p-4 text-left">
          {loading && response.length == 0 ? (
            "思考中..."
          ) : (
            <ReactMarkdownAsync
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {children}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {response}
            </ReactMarkdownAsync>
          )}
        </div>
        <div className="flex gap-2 items-center  p-1">
          {" "}
          {/* 添加 items-center */}
          <Textarea
            className="resize-none max-h-[5rem] "
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
          />
          {/* 包裹按钮并保持间距 */}
          <Button onClick={handleSend} disabled={loading}>
            发送
          </Button>
          <Button onClick={handleClean}>清空</Button>
        </div>
      </div>
      {/* 右边设置区域 */}
      <div className="w-80 p-4 space-y-6">
        <div className="space-y-4 border-b-1 p-3">
          <div className="flex justify-between items-center">
            {" "}
            {/* 添加flex布局 */}
            <h3 className="text-lg font-semibold flex-1 text-center">
              模型配置
            </h3>{" "}
            {/* 添加flex和居中样式 */}
            <ModeToggle />
          </div>
          <div className="grid gap-2">
            <Label>系统提示词</Label>
            <Textarea
              className="resize-none max-h-[8rem] " // 新增样式
              rows={4}
              value={config.systemPrompt}
              onChange={(e) => {
                setConfig({ ...config, systemPrompt: e.target.value });
              }}
              placeholder="输入系统提示词"
            />
          </div>
          <div className="grid gap-2">
            <Label>API URL</Label>
            <Input
              value={config.url}
              onChange={(e) => {
                setConfig({ ...config, url: e.target.value });
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>API Key</Label>
            <div className="flex items-center gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => {
                  setConfig({ ...config, apiKey: e.target.value });
                }}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>模型名称</Label>
            <Input
              type="text"
              value={config.model}
              onChange={(e) => {
                setConfig({ ...config, model: e.target.value });
              }}
              className="flex-1"
            />
          </div>

          <div className="grid gap-2">
            <Label>采样温度</Label>
            <Input
              type="number"
              max={2}
              min={1}
              value={config.temperature}
              onChange={(e) => {
                setConfig({
                  ...config,
                  temperature: parseFloat(e.target.value),
                });
              }}
              className="flex-1"
            />
          </div>

          <div className="grid gap-2">
            <Label>核采样</Label>
            <Input
              type="number"
              max={1}
              min={0}
              value={config.top_p}
              onChange={(e) =>
                setConfig({ ...config, top_p: parseFloat(e.target.value) })
              }
              className="flex-1"
            />
          </div>
          <div className="grid gap-2">
            <Label>上下文最大长度</Label>
            <Input
              type="number"
              min={10}
              value={config.maxLength}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxLength: Math.floor(parseFloat(e.target.value)),
                })
              }
              className="flex-1"
            />
          </div>

          <div className="grid gap-2">
            <Button
              onClick={() => {
                localStorage.setItem("config", JSON.stringify(config));
                setShowSavedAlert(true);
                setTimeout(() => setShowSavedAlert(false), 3000);
              }}
            >
              保存设置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
