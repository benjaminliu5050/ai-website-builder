"use client";
import React, { useEffect } from "react";
import { SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { ActionContext } from "@/context/ActionContext";
import { useContext } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function SandPackPreviewClient() {
  const previewRef = React.useRef();
  const { sandpack } = useSandpack();
  const { action, setAction } = useContext(ActionContext);
  const [previewKey, setPreviewKey] = React.useState(0);
  const filesHashRef = React.useRef("");

  useEffect(() => {
    GetSandpackClient();
  }, [sandpack, action]);

  // Force preview refresh when component mounts (when switching to preview tab)
  useEffect(() => {
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
        // Small delay to ensure files are fully loaded in Sandpack
        const timer = setTimeout(() => {
          setPreviewKey((prev) => prev + 1);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [sandpack?.files]);

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

  return (
    <SandpackPreview
      key={previewKey}
      style={{ height: "80vh", width: "100%" }}
      ref={previewRef}
      showNavigator
    />
  );
}

export default SandPackPreviewClient;
