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
import { log } from "console";

function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const responseRef = useRef("");

  useEffect(() => {
    responseRef.current = response;
  }, [response]);

  // 在组件状态区添加：
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState({
    systemPrompt: "",
    url: "https://api.openai.com",
    apiKey: "",
    model: "gpt-3.5-turbo",
  });
  // 发送消息处理函数
  const handleSend = () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse("");
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
          {
            role: "user",
            content: input,
          },
        ],
        stream: true,
        n: 1,
      }),
    });
    setInput("");

    source.addEventListener("message", (e: CustomEventType) => {
      const dataEvent = e as CustomEventDataType;

      if (dataEvent.data !== "[DONE]") {
        const payload = JSON.parse(dataEvent.data);

        const text = payload.choices[0].delta.content;

        if (text && text !== "\n") {
          responseRef.current = responseRef.current + text;
          setResponse(responseRef.current);
        }
      } else {
        setLoading(false);
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
      {/* 左边对话区域 */}
      <div className="flex-1 p-4 border-r flex flex-col">
        <div className="h-[calc(100vh-160px)]  overflow-auto mb-4 space-y-4">
          {response}
        </div>
        <div className="flex gap-2 items-center">
          {" "}
          {/* 添加 items-center */}
          <Textarea
            className="resize-none max-h-[5rem] "
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyUp={(e) => e.key === "Enter" && handleSend()}
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
        <div className="space-y-4">
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
              onChange={(e) =>
                setConfig({ ...config, systemPrompt: e.target.value })
              }
              placeholder="输入系统提示词"
            />
          </div>
          <div className="grid gap-2">
            <Label>API URL</Label>
            <Input
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>API Key</Label>
            <div className="flex items-center gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) =>
                  setConfig({ ...config, apiKey: e.target.value })
                }
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
            <Label>模型输入</Label>
            <Input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
