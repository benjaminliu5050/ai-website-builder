"use client";
import { useConvex } from "convex/react";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useContext, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { MessagesContext } from "@/context/MessagesContext";
import Colors from "@/data/Colors";
import { UserDetailContext } from "@/context/UserDetailContext";
import Image from "next/image";
import { ArrowRight, Link, Loader2Icon, Bot, AlertCircle } from "lucide-react";
import Lookup from "@/data/Lookup";
import Prompt from "@/data/Prompt";
import axios from "axios";
import ReactMarkdown from "react-markdown";
// import { useSidebar } from "@/components/ui/sidebar";

function ChatView() {
  const { id } = useParams();
  const convex = useConvex();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const { messages, setMessages } = useContext(MessagesContext);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isInitialLoad = useRef(true);
  const previousMessagesLength = useRef(0);
  const messagesEndRef = useRef(null);
  // const { toggleSidebar } = useSidebar();

  const GetWorkspaceData = async () => {
    const result = await convex.query(api.workspace.GetWorkspaceData, {
      workspaceId: id,
    });
    setMessages(result?.messages);
    previousMessagesLength.current = result?.messages?.length || 0;
    isInitialLoad.current = false;
  };

  useEffect(() => {
    if (id) {
      isInitialLoad.current = true;
      previousMessagesLength.current = 0;
      GetWorkspaceData();
    }
  }, [id]);

  useEffect(() => {
    // Only trigger AI response if:
    // 1. Not in initial load
    // 2. Messages length increased (new message added)
    // 3. Last message is from user
    if (!isInitialLoad.current && messages?.length > 0) {
      const currentLength = messages.length;
      const role = messages[messages.length - 1]?.role;
      
      // Only call API if a new message was added (length increased)
      if (currentLength > previousMessagesLength.current && role == "user") {
        GetAiResponse();
      }
      
      previousMessagesLength.current = currentLength;
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const GetAiResponse = async () => {
    setLoading(true);
    setError(null);

    try {
      const PROMPT = JSON.stringify(messages) + Prompt.CHAT_PROMPT;
      const result = await axios.post("/api/ai-chat", {
        prompt: PROMPT,
      });

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: result.data.result },
      ]);
    } catch (err) {
      console.error("Error getting AI response:", err);
      console.error("Error details:", err.response?.data);

      setError(
        err.response?.data?.error ||
          "Failed to get AI response. Please try again."
      );

      // Remove the last user message if AI fails
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const onGenerate = async (input) => {
    if (!input?.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setUserInput(""); // Clear input immediately
  };

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* Messages Container with Custom Scrollbar */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent px-2 py-2 pb-4">
        <style jsx>{`
          .scrollbar-thin {
            scrollbar-width: thin;
          }
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: rgba(75, 85, 99, 0.5);
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background-color: rgba(75, 85, 99, 0.7);
          }
        `}</style>

        {messages?.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-3 ${msg?.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg flex gap-2 items-start leading-4 text-sm ${
                msg?.role === "user" ? "ml-auto" : "mr-auto"
              }`}
              style={{
                backgroundColor:
                  msg?.role === "user" ? "#3A3A3A" : Colors.CHAT_BACKGROUND,
                color: "#FFFFFF",
              }}
            >
              {msg?.role === "user" ? (
                <>
                  <div className="flex-1">
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                  <Image
                    src={userDetail?.picture}
                    alt="userImage"
                    width={20}
                    height={20}
                    className="rounded-full flex-shrink-0"
                  />
                </>
              ) : (
                <>
                  <div className="bg-purple-500 rounded-full p-2 flex-shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 prose prose-invert prose-sm max-w-none">
                    <div className="font-semibold text-purple-600 mb-1 not-prose">
                      DIFINES Prompt
                    </div>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc ml-4 mb-2 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal ml-4 mb-2 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        code: ({ inline, children }) =>
                          inline ? (
                            <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm">
                              {children}
                            </code>
                          ) : (
                            <code className="block bg-gray-800 p-3 rounded my-2 overflow-x-auto">
                              {children}
                            </code>
                          ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-white">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold mb-2 mt-3">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-bold mb-2 mt-3">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-bold mb-2 mt-2">
                            {children}
                          </h3>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div
              className="max-w-[75%] p-3 rounded-lg flex gap-2 items-center"
              style={{ backgroundColor: Colors.CHAT_BACKGROUND }}
            >
              <div className="bg-purple-500 rounded-full p-2">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-purple-600 mb-1">AI</div>
                <div className="flex items-center gap-2">
                  <Loader2Icon className="animate-spin h-4 w-4" />
                  <h2>Generating response...</h2>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start mb-3">
            <div
              className="max-w-[75%] p-3 rounded-lg flex gap-2 items-start"
              style={{ backgroundColor: "#991B1B", color: "#FFFFFF" }}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="font-semibold mb-1">Error</div>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Section */}
      <div
        className="flex-shrink-0 p-4 border rounded-xl w-full mt-3"
        style={{ backgroundColor: Colors.BACKGROUND }}
      >
        <textarea
          value={userInput}
          placeholder={Lookup.INPUT_PLACEHOLDER}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (userInput?.trim()) {
                onGenerate(userInput);
              }
            }
          }}
          spellCheck={false}
          className="outline-none bg-transparent w-full min-h-[80px] max-h-[120px] resize-none text-sm"
          disabled={loading}
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-gray-400 hover:text-gray-300 cursor-pointer transition-colors" />
          </div>
          {userInput && (
            <button
              onClick={() => onGenerate(userInput)}
              disabled={loading}
              className={`bg-blue-500 hover:bg-blue-600 p-2 h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              title="Send message"
            >
              <ArrowRight className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatView;