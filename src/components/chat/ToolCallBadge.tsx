"use client";

import { Loader2, CheckCircle2, FilePlus, FilePen, FileSearch, FileX, FolderInput } from "lucide-react";

interface StrReplaceArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

type ToolArgs = StrReplaceArgs | FileManagerArgs;

function getLabel(toolName: string, args: ToolArgs): { icon: React.ReactNode; text: string } {
  const filename = args.path.split("/").pop() ?? args.path;

  if (toolName === "str_replace_editor") {
    const { command } = args as StrReplaceArgs;
    switch (command) {
      case "create":
        return { icon: <FilePlus className="w-3 h-3" />, text: `Creating ${filename}` };
      case "str_replace":
      case "insert":
        return { icon: <FilePen className="w-3 h-3" />, text: `Editing ${filename}` };
      case "view":
        return { icon: <FileSearch className="w-3 h-3" />, text: `Reading ${filename}` };
      default:
        return { icon: <FilePen className="w-3 h-3" />, text: `Updating ${filename}` };
    }
  }

  if (toolName === "file_manager") {
    const { command, new_path } = args as FileManagerArgs;
    if (command === "delete") {
      return { icon: <FileX className="w-3 h-3" />, text: `Deleting ${filename}` };
    }
    const newName = new_path?.split("/").pop() ?? new_path ?? filename;
    return { icon: <FolderInput className="w-3 h-3" />, text: `Renaming ${filename} → ${newName}` };
  }

  return { icon: <FilePen className="w-3 h-3" />, text: toolName };
}

interface ToolCallBadgeProps {
  toolName: string;
  args: ToolArgs;
  done: boolean;
}

export function ToolCallBadge({ toolName, args, done }: ToolCallBadgeProps) {
  const { icon, text } = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
      )}
      <span className="text-neutral-700 flex items-center gap-1.5">
        {icon}
        {text}
      </span>
    </div>
  );
}
