import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

describe("ToolCallBadge", () => {
  describe("str_replace_editor", () => {
    it("shows 'Creating' for create command", () => {
      render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "src/App.tsx" }} done={false} />);
      expect(screen.getByText(/Creating App\.tsx/)).toBeTruthy();
    });

    it("shows 'Editing' for str_replace command", () => {
      render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "str_replace", path: "src/Button.tsx" }} done={false} />);
      expect(screen.getByText(/Editing Button\.tsx/)).toBeTruthy();
    });

    it("shows 'Editing' for insert command", () => {
      render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "insert", path: "src/Card.tsx" }} done={false} />);
      expect(screen.getByText(/Editing Card\.tsx/)).toBeTruthy();
    });

    it("shows 'Reading' for view command", () => {
      render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "view", path: "src/index.tsx" }} done={false} />);
      expect(screen.getByText(/Reading index\.tsx/)).toBeTruthy();
    });
  });

  describe("file_manager", () => {
    it("shows 'Deleting' for delete command", () => {
      render(<ToolCallBadge toolName="file_manager" args={{ command: "delete", path: "src/Old.tsx" }} done={false} />);
      expect(screen.getByText(/Deleting Old\.tsx/)).toBeTruthy();
    });

    it("shows rename with old and new filename", () => {
      render(
        <ToolCallBadge
          toolName="file_manager"
          args={{ command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" }}
          done={false}
        />
      );
      expect(screen.getByText(/Renaming Old\.tsx → New\.tsx/)).toBeTruthy();
    });
  });

  describe("done state", () => {
    it("shows spinner when not done", () => {
      const { container } = render(
        <ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "App.tsx" }} done={false} />
      );
      expect(container.querySelector(".animate-spin")).toBeTruthy();
    });

    it("shows check icon when done", () => {
      const { container } = render(
        <ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "App.tsx" }} done={true} />
      );
      expect(container.querySelector(".animate-spin")).toBeNull();
      expect(container.querySelector("svg")).toBeTruthy();
    });
  });

  describe("unknown tool", () => {
    it("falls back to the tool name", () => {
      render(<ToolCallBadge toolName="unknown_tool" args={{ command: "create" as never, path: "x" }} done={false} />);
      expect(screen.getByText("unknown_tool")).toBeTruthy();
    });
  });
});
