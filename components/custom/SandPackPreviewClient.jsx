"use client";
import React, { useEffect } from "react";
import { SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { ActionContext } from "@/context/ActionContext";
import { useContext } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Loader2 } from "lucide-react";

function SandPackPreviewClient() {
  const previewRef = React.useRef();
  const { sandpack } = useSandpack();
  const { action, setAction } = useContext(ActionContext);
  const [previewKey, setPreviewKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const filesHashRef = React.useRef("");

  useEffect(() => {
    GetSandpackClient();
  }, [sandpack, action]);

  // Force preview refresh when component mounts (when switching to preview tab)
  useEffect(() => {
    // Show loading immediately when component mounts
    setIsLoading(true);
    // Always refresh when component mounts to ensure preview is fresh
    const timer = setTimeout(() => {
      setPreviewKey((prev) => prev + 1);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Force preview refresh when files change
  useEffect(() => {
    if (sandpack?.files) {
      // Create a hash of file contents to detect changes
      const filesHash = JSON.stringify(
        Object.keys(sandpack.files)
          .sort()
          .map((key) => [key, sandpack.files[key]])
      );
      
      // Only refresh if files actually changed
      if (filesHash !== filesHashRef.current) {
        filesHashRef.current = filesHash;
        setIsLoading(true);
        // Small delay to ensure files are fully loaded in Sandpack
        const timer = setTimeout(() => {
          setPreviewKey((prev) => prev + 1);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [sandpack?.files]);

  // Listen for preview ready state from Sandpack
  useEffect(() => {
    // Check if preview is ready - when status is idle and we have files
    if (sandpack?.status === "idle" && sandpack?.files && Object.keys(sandpack.files).length > 0 && previewKey > 0) {
      // Preview is ready, hide loading after a short delay to ensure it's fully rendered
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [sandpack?.status, sandpack?.files, previewKey]);

  const downloadAsZip = async () => {
    try {
      const zip = new JSZip();
      const { files } = sandpack;

      // Add all files to the zip
      Object.entries(files).forEach(([filename, fileContent]) => {
        // Remove leading slash if present
        const cleanFilename = filename.startsWith("/")
          ? filename.substring(1)
          : filename;

        // Get the file content (handle both string and object format)
        const content =
          typeof fileContent === "string" ? fileContent : fileContent.code;

        zip.file(cleanFilename, content);
      });

      // Add package.json if not already included
      if (!files["/package.json"] && !files["package.json"]) {
        const packageJson = {
          name: "sandpack-export",
          version: "1.0.0",
          description: "Exported from Sandpack",
          dependencies: sandpack.customSetup?.dependencies || {},
          scripts: {
            start: "react-scripts start",
            build: "react-scripts build",
          },
        };
        zip.file("package.json", JSON.stringify(packageJson, null, 2));
      }

      // Generate and download the zip file
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `sandpack-project-${Date.now()}.zip`);
    } catch (error) {
      console.error("Error creating zip:", error);
      alert("Failed to export project. Please try again.");
    }
  };

  const GetSandpackClient = async () => {
    const client = previewRef.current?.getClient();
    if (client && action) {
      if (action?.actionType === "deploy") {
        const result = await client.getCodeSandboxURL();
        window.open(`https://${result?.sandboxId}.csb.app/`, "_blank");
      } else if (action?.actionType === "export") {
        // Download as ZIP instead of opening CodeSandbox
        await downloadAsZip();
      }

      // Reset action after handling
      setAction(null);
    }
  };

  // Check if there's any content to show
  const hasContent = sandpack?.files && Object.keys(sandpack.files).length > 0;

  return (
    <div className="h-full w-full relative" style={{ minHeight: 0 }}>
      {isLoading && hasContent && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="text-gray-400 text-sm font-medium">Loading preview...</p>
          </div>
        </div>
      )}
      <SandpackPreview
        key={previewKey}
        className="h-full w-full"
        style={{ opacity: isLoading ? 0 : 1, transition: "opacity 0.3s ease-in-out", minHeight: 0 }}
        ref={previewRef}
        showNavigator
      />
    </div>
  );
}

export default SandPackPreviewClient;
