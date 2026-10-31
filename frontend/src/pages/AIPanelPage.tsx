import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Square, RotateCcw } from 'lucide-react';
import { fetchChatModels } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatMessage, ChatResponse } from '../lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MessageBubble({ message, typing }: { message: Message; typing: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm border border-border'
        }`}
      >
        {typing ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            正在输入<span className="animate-pulse">…</span>
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

export default function AIPanelPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [stream, setStream] = useState(true);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data, isError } = useQuery({ queryKey: ['chat-models'], queryFn: fetchChatModels });
  const models = data?.models ?? [];

  // 默认选中第一个可用模型(后端已把主力模型置顶)
  useEffect(() => {
    if (models.length > 0 && !model) {
      setModel(models[0].id);
    }
  }, [models, model]);

  // 新消息/流式输出时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function appendToLast(text: string) {
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
        next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + text };
      }
      return next;
    });
  }

  async function readSSE(resp: Response) {
    if (!resp.body) throw new Error('浏览器不支持流式响应');
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const obj = JSON.parse(payload);
          if (obj.error) appendToLast(`⚠️ ${obj.error}`);
          else if (obj.content) appendToLast(obj.content);
        } catch {
          /* 忽略无法解析的分片 */
        }
      }
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !model) return;

    const history: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model, stream }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        throw new Error(err || `请求失败 (${resp.status})`);
      }

      if (stream) {
        await readSSE(resp);
      } else {
        const data: ChatResponse = await resp.json();
        appendToLast(data.content);
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') {
        appendToLast(`⚠️ ${(e as Error)?.message ?? '请求出错'}`);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleClear() {
    if (loading) handleStop();
    setMessages([]);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 顶部:标题 + 模型选择 */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI 对话
          </h1>
          <p className="text-xs text-muted-foreground">本地 Ollama 优先，可切换云端模型</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stream}
              onChange={(e) => setStream(e.target.checked)}
              className="accent-primary"
            />
            流式
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {models.length === 0 && <option value="">加载模型…</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={messages.length === 0 && !loading}>
            <RotateCcw className="size-4" />
            新对话
          </Button>
        </div>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isError ? (
          <div className="text-center text-muted-foreground py-16">模型列表加载失败，请确认后端已启动</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-3xl mb-2">✨</p>
            <p>和 AI 对话，试试问它任何问题</p>
            <p className="text-xs mt-1">本地模型：qwen2.5:14b · 云模型：DeepSeek</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={i}
              message={m}
              typing={m.role === 'assistant' && !m.content && loading && i === messages.length - 1}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 底部输入框 */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={model ? `问点什么…(当前 ${models.find((m) => m.id === model)?.name ?? model})` : '请选择模型…'}
            disabled={!model || models.length === 0}
          />
          {loading ? (
            <Button variant="outline" onClick={handleStop}>
              <Square className="size-4" />
              停止
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={!input.trim() || !model}>
              <Send className="size-4" />
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
