"use client";
import React, { useState, useRef } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import Lookup from "@/data/Lookup";
import axios from "axios";
import { MessagesContext } from "@/context/MessagesContext";
import { UserDetailContext } from "@/context/UserDetailContext";
import Prompt from "@/data/Prompt";
import { useContext } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useConvex } from "convex/react";
import { Loader } from "react-feather";
import SandPackPreviewClient from "./SandPackPreviewClient";
import { toast } from "sonner";

function CodeView() {
  const { id } = useParams();
  const convex = useConvex();
  const [activeTab, setActiveTab] = useState("code");
  const [files, setFiles] = React.useState(Lookup?.DEFAULT_FILE);
  const { messages, setMessages } = useContext(MessagesContext);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const UpdateFiles = useMutation(api.workspace.UpdateFiles);
  const [loading, setLoading] = React.useState(false);
  const isInitialLoad = useRef(true);
  const previousMessagesLength = useRef(0);
  const [sandpackKey, setSandpackKey] = React.useState(0);
  const [previewRefreshKey, setPreviewRefreshKey] = React.useState(0);

  // Inject styles to ensure Sandpack editor can scroll
  React.useEffect(() => {
    const styleId = 'sandpack-scroll-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Ensure Sandpack code editor can scroll */
      .sp-code-editor,
      .sp-code-editor > div,
      .sp-code-editor .cm-editor,
      .sp-code-editor .cm-scroller {
        height: 100% !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
      }
      /* Ensure Sandpack file explorer can scroll */
      .sp-file-explorer,
      .sp-file-explorer > div {
        height: 100% !important;
        overflow-y: auto !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  React.useEffect(() => {
    // Only trigger AI code generation if:
    // 1. Not in initial load
    // 2. Messages length increased (new message added)
    // 3. Last message is from user
    if (!isInitialLoad.current && messages?.length > 0) {
      const currentLength = messages.length;
      const role = messages[messages?.length - 1].role;
      
      // Only call API if a new message was added (length increased)
      if (currentLength > previousMessagesLength.current && role === "user") {
        GenerateAiCode();
      }
      
      previousMessagesLength.current = currentLength;
    }
  }, [messages]);

  React.useEffect(() => {
    if (id) {
      isInitialLoad.current = true;
      previousMessagesLength.current = 0;
      GetFiles();
    }
  }, [id]);

  const GetFiles = async () => {
    setLoading(true);
    const result = await convex.query(api.workspace.GetWorkspaceData, {
      workspaceId: id,
    });
    const mergedFiles = { ...Lookup.DEFAULT_FILE, ...result?.fileData };
    setFiles(mergedFiles);
    previousMessagesLength.current = result?.messages?.length || 0;
    isInitialLoad.current = false;
    // Reset preview refresh key when loading new workspace
    setPreviewRefreshKey(0);
    setSandpackKey(0);
    setLoading(false);
  };


  const GenerateAiCode = async () => {
    setLoading(true);
    // Capture current tab state to check later
    const currentTab = activeTab;
    const PROMPT = JSON.stringify(messages) + " " + Prompt.CODE_GEN_PROMPT;
    try {
      const result = await axios.post("/api/gen-ai-code", {
        prompt: PROMPT,
      });
      const aiResp = result.data;

      const mergedFiles = { ...Lookup.DEFAULT_FILE, ...aiResp.files };
      setFiles(mergedFiles);
      await UpdateFiles({
        workspaceId: id,
        files: aiResp?.files,
      });

      // Force Sandpack to remount with new files
      setSandpackKey((prev) => prev + 1);
      // Also refresh preview key so preview updates when switched to
      setPreviewRefreshKey((prev) => prev + 1);

      // If currently on "code" tab, automatically switch to "preview" to show the generated result
      if (currentTab === "code") {
        setActiveTab("preview");
        // Force preview refresh when switching to preview tab
        setPreviewRefreshKey((prev) => prev + 1);
      }

    } catch (error) {
      console.error("Error in GenerateAiCode:", error);
      toast.error("Failed to generate AI code. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="bg-[#181818] w-full p-2 border border-neutral-800 shrink-0">
        <div className="flex items-center flex-wrap shrink-0 bg-black p-1 w-[160px] gap-2 justify-center rounded-full">
          <button
            type="button"
            className={`text-sm font-medium transition-all duration-200 cursor-pointer px-3 py-1 rounded-full ${
              activeTab === "code"
                ? "bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                : "text-gray-300 hover:text-blue-400 hover:bg-blue-500/10"
            }`}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            type="button"
            className={`text-sm font-medium transition-all duration-200 cursor-pointer px-3 py-1 rounded-full ${
              activeTab === "preview"
                ? "bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                : "text-gray-300 hover:text-blue-400 hover:bg-blue-500/10"
            }`}
            onClick={() => {
              setActiveTab("preview");
              // Force preview refresh when switching to preview tab
              setPreviewRefreshKey((prev) => prev + 1);
            }}
          >
            Preview
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <SandpackProvider
          key={sandpackKey}
          files={files}
          template="react"
          theme="dark"
          customSetup={{
            dependencies: {
              ...Lookup.DEPENDANCY,
            },
          }}
          options={{ externalResources: ["https://cdn.tailwindcss.com"] }}
        >
          <SandpackLayout style={{ height: "100%" }}>
            {activeTab === "code" ? (
              <>
                <SandpackFileExplorer style={{ height: "100%" }} />
                <SandpackCodeEditor style={{ height: "100%" }} />
              </>
            ) : (
              <div style={{ height: "100%", width: "100%", position: "relative" }}>
                <SandPackPreviewClient style={{ height: "100%" }} key={`preview-${sandpackKey}-${activeTab}-${previewRefreshKey}`} />
              </div>
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
      {loading && (
        <div className="p-10 bg-gray-900 opacity-80 absolute top-0 rounded-lg w-full h-full flex items-center justify-center">
          <Loader className="animate-spin h-10 w-10 text-white" />
          <h2 className="text-white ml-3">Generating Your Files...</h2>
        </div>
      )}
    </div>
  );
}

export default CodeView;