import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileText, Clipboard, Sparkles, Check, AlertCircle, FileImage, RefreshCw } from "lucide-react";
import { Invoice } from "../types";
import { api } from "../lib/api";

interface InvoiceUploadProps {
  userId: string;
  onInvoiceParsed: (invoice: Invoice, replaceExistingId?: string | null) => void;
  existingInvoices: Invoice[];
}

export default function InvoiceUpload({ userId, onInvoiceParsed, existingInvoices }: InvoiceUploadProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ fileName: string, existingId: string } | null>(null);

  // Generates a unique version of a filename based on active ledger rows
  const getUniqueFileName = (fileName: string): string => {
    let uniqueName = fileName;
    const nameParts = fileName.lastIndexOf('.') !== -1 
      ? [fileName.substring(0, fileName.lastIndexOf('.')), fileName.substring(fileName.lastIndexOf('.'))]
      : [fileName, ''];
    
    const baseName = nameParts[0];
    const extension = nameParts[1];
    let counter = 1;

    while (existingInvoices.some(inv => inv.file_name.toLowerCase() === uniqueName.toLowerCase())) {
      uniqueName = `${baseName} (${counter})${extension}`;
      counter++;
    }
    return uniqueName;
  };

  // Read file and set state
  const handleFileChange = (file: File) => {
    if (!file) return;
    
    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload an image (JPG, PNG, WEBP) or a PDF.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setDuplicatePrompt(null);

    // If image, create locally visible object data URL for instant frontend mockup preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null); // No visual preview for PDF, but file name recorded
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileElementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  // Convert selected file to base64
  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = (reader.result as string).split(",")[1];
        resolve(base64Str);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Invokes OCR parse operation to model API
  const executeParse = async (fileNameToUse: string, replaceId: string | null = null) => {
    setError(null);
    setSuccess(false);
    setDuplicatePrompt(null);
    setLoading(true);

    try {
      let filePayload = null;

      if (activeTab === "file" && selectedFile) {
        const b64Data = await getBase64(selectedFile);
        filePayload = {
          mimeType: selectedFile.type,
          base64: b64Data
        };
      }

      const data = await api.parseInvoice(
        userId,
        filePayload,
        activeTab === "file" ? fileNameToUse : "Raw Text Entry",
        activeTab === "paste" ? pasteText : ""
      );

      setSuccess(true);
      onInvoiceParsed(data, replaceId);
      
      // Clear current form inputs on success
      setSelectedFile(null);
      setFilePreview(null);
      setPasteText("");
    } catch (err: any) {
      setError(err.message || "An error occurred while connecting to model.");
    } finally {
      setLoading(false);
    }
  };

  // Core parsing request submit wrapper that checks for unique filenames first
  const handleParseSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (activeTab === "file" && !selectedFile) {
      setError("Please select or drop an invoice or receipt file first.");
      return;
    }
    if (activeTab === "paste" && !pasteText.trim()) {
      setError("Please paste raw receipt/invoice email text first.");
      return;
    }

    // Intercept with prompt if filename already exists
    if (activeTab === "file" && selectedFile) {
      const duplicate = existingInvoices.find(
        (inv) => inv.file_name.toLowerCase() === selectedFile.name.toLowerCase()
      );
      if (duplicate) {
        setDuplicatePrompt({
          fileName: selectedFile.name,
          existingId: duplicate.id
        });
        return;
      }
    }

    await executeParse(selectedFile?.name || "Raw Text Entry", null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col justify-between transition-all duration-200">
      {/* Tab Selectors with Sleek layout */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Extraction Engine
        </h2>
        <div className="flex gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
          <button
            onClick={() => {
              setActiveTab("file");
              setError(null);
            }}
            className={`px-3 py-1 text-xs font-semibold duration-150 rounded-full cursor-pointer ${
              activeTab === "file"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Upload PDF/IMG
          </button>
          <button
            onClick={() => {
              setActiveTab("paste");
              setError(null);
            }}
            className={`px-3 py-1 text-xs font-semibold duration-150 rounded-full cursor-pointer ${
              activeTab === "paste"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Paste Text
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col justify-between flex-grow space-y-4">
        {/* Tab content */}
        <div className="flex-1">
          {error && (
            <div className="mb-4 flex items-start space-x-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start space-x-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-xs animate-fade-in">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Structured & stored! View verified record below.</span>
            </div>
          )}

          {activeTab === "file" ? (
            <div className="space-y-3.5">
              {duplicatePrompt ? (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-4.5 space-y-4 animate-fade-in transition-all duration-200">
                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                        Receipt Filename Conflict
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        A transaction file named <span className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded font-semibold text-amber-900 dark:text-amber-200">{duplicatePrompt.fileName}</span> already exists within your ledger.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    <button
                      onClick={() => executeParse(duplicatePrompt.fileName, duplicatePrompt.existingId)}
                      disabled={loading}
                      className="flex items-center justify-between p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/30 bg-white dark:bg-slate-800/80 hover:bg-amber-50/40 dark:hover:bg-slate-800 duration-150 text-left outline-none cursor-pointer group disabled:opacity-50"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Replace existing entry</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">Overwrites the outdated record with newly extracted details.</p>
                      </div>
                      <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 duration-150" />
                    </button>

                    <button
                      onClick={() => {
                        const uniqueName = getUniqueFileName(duplicatePrompt.fileName);
                        executeParse(uniqueName, null);
                      }}
                      disabled={loading}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/5 dark:hover:bg-slate-800 duration-150 text-left outline-none cursor-pointer group disabled:opacity-50"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Add as new entry</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">Appends a copy with a unique name: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{getUniqueFileName(duplicatePrompt.fileName)}</span></p>
                      </div>
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 duration-150" />
                    </button>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setDuplicatePrompt(null);
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      disabled={loading}
                      className="text-xs text-slate-450 hover:text-slate-700 dark:hover:text-slate-350 bg-slate-100/80 dark:bg-slate-800 px-3.5 py-1.5 rounded-lg font-bold cursor-pointer transition disabled:opacity-50"
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Drag zone */}
                  {!selectedFile ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={triggerFileInput}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer duration-150 flex flex-col items-center justify-center space-y-3 ${
                        dragActive
                          ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50/20 dark:hover:bg-slate-800/10"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileElementChange}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                      />
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 transition-colors">
                        <FileImage className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Drag Your Receipt & Invoice
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          Supports JPG, PNG, WEBP, or PDF
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                      <div className="flex items-center space-x-3 truncate">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-904/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center rounded-lg shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.split("/")[1].toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer px-2.5 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Copied Raw Receipt / Slack Message Text
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste email payload here... e.g. 'Coffee with client $15.42 at Starbucks Co on Jun 18, 2026 for Software dev alignment.'"
                className="w-full h-32 p-3 text-xs border border-slate-200 dark:border-slate-850 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 bg-slate-50/30 dark:bg-slate-950/30 text-slate-800 dark:text-slate-100 outline-none transition duration-150 resize-none font-mono"
              />
            </div>
          )}
        </div>
 
        {/* Submit action matching Sleek Interface's shadow-indigo elements */}
        {!duplicatePrompt && (
          <div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleParseSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs tracking-wide transition shadow-lg shadow-indigo-100/20 dark:shadow-none flex items-center justify-center space-x-2 disabled:bg-slate-400 dark:disabled:bg-slate-800 disabled:border-slate-500 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>AI Core Extraction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Process with AI</span>
                </>
              )}
            </motion.button>
            
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3.5 leading-relaxed">
              AI structures vendor, amount, date, cataloging books cleanly.
            </p>
          </div>
        )}
      </div>
    </div>

  );
}
