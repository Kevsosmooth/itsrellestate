"use client";

import { useState, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StagedFile {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  assignedTo?: string;
}

export interface PersonPickerOption {
  value: string;
  label: string;
}

interface FileUploadProps {
  label?: string;
  helperText?: string;
  stagedFiles: StagedFile[];
  onFilesStaged: (files: StagedFile[]) => void;
  onFileRemoved: (index: number) => void;
  onAssignedToChange?: (index: number, value: string) => void;
  personPicker?: {
    options: PersonPickerOption[];
    placeholder?: string;
  };
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  required?: boolean;
  error?: boolean;
  className?: string;
}

const DEFAULT_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
const DEFAULT_MAX_SIZE = 25 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "text-error";
  if (["jpg", "jpeg", "png"].includes(ext)) return "text-primary";
  if (["doc", "docx"].includes(ext)) return "text-primary";
  return "text-text-muted";
}

export function FileUpload({
  label,
  helperText,
  stagedFiles,
  onFilesStaged,
  onFileRemoved,
  onAssignedToChange,
  personPicker,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles,
  required = false,
  error = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sizeError, setSizeError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: File[]) => {
      setSizeError("");
      const limit = maxFiles && maxFiles > 0 ? maxFiles : Infinity;
      const remaining = limit - stagedFiles.length;
      if (remaining <= 0) return;

      const filesToProcess = files.slice(0, remaining);
      const staged: StagedFile[] = [];

      for (const file of filesToProcess) {
        if (file.size > maxSize) {
          setSizeError(`"${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
          continue;
        }
        staged.push({
          id: generateId(),
          file,
          fileName: file.name,
          mimeType: file.type,
          sizeInBytes: file.size,
        });
      }

      if (staged.length > 0) onFilesStaged(staged);
    },
    [maxFiles, maxSize, stagedFiles.length, onFilesStaged],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length > 0) processFiles(files);
  };

  const showError = error && stagedFiles.length === 0 && !isDragOver;

  return (
    <div className={cn("rounded-lg border border-border p-4 overflow-hidden", className)}>
      {label && (
        <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-1">
          {label}
          {required && (
            <span aria-hidden="true" className="text-primary font-bold">*</span>
          )}
          {stagedFiles.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""}
            </span>
          )}
        </label>
      )}

      {helperText && (
        <p className="text-xs text-text-muted mb-2 leading-relaxed">{helperText}</p>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg py-8 px-6 text-center cursor-pointer transition-all",
          isDragOver && "border-primary bg-primary/5",
          showError && "border-error bg-error/5",
          !isDragOver && !showError && "border-border hover:border-primary/40",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (fileInputRef.current) fileInputRef.current.value = "";
          fileInputRef.current?.click();
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto mb-3 text-text-muted"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        <p className="text-sm text-text-secondary mb-1">
          Drag and drop files here, or{" "}
          <span className="text-primary font-medium">browse</span>
        </p>
        <p className="text-xs text-text-muted">
          Max {formatFileSize(maxSize)} per file
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles !== 1}
          accept={accept}
          onClick={(e) => e.stopPropagation()}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {sizeError && (
        <p className="text-xs text-error mt-2">{sizeError}</p>
      )}

      {stagedFiles.map((file, index) => {
        const needsAssignment = !!personPicker && !file.assignedTo;
        return (
          <div
            key={file.id}
            className={cn(
              "flex flex-col gap-2 px-3 py-2.5 bg-surface/50 rounded-md mt-2 min-w-0 overflow-hidden",
              "border-l-2",
              needsAssignment ? "border-error" : "border-primary",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn("shrink-0", fileIconColor(file.fileName))}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>

              <span className="text-sm text-text-primary min-w-0 flex-1 truncate">
                {file.fileName}
              </span>
              <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                {formatFileSize(file.sizeInBytes)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.fileName}`}
                className="shrink-0 p-1.5 rounded text-error bg-error/10 border border-error/20 cursor-pointer transition-colors hover:bg-error/20 min-h-[28px] min-w-[28px] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemoved(index);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {personPicker && onAssignedToChange && (
              <div className="block w-full min-w-0">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  This belongs to:
                </label>
                <div className="relative w-full min-w-0">
                  <select
                    value={file.assignedTo ?? ""}
                    onChange={(e) => onAssignedToChange(index, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "block w-full min-w-0 max-w-full min-h-[40px] px-2 pr-8 rounded-md text-sm bg-light border appearance-none truncate",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      needsAssignment ? "border-error" : "border-border",
                    )}
                  >
                    <option value="" disabled>
                      {personPicker.placeholder ?? "Select a person"}
                    </option>
                    {personPicker.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
