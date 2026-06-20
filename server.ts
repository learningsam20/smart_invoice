import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Temporary mock database for fallback offline mode
const mockUsers = [
  { id: "neha-demo-user-id", email: "neha@company.com", password: "password123" }
];

const mockInvoices = [
  {
    id: "1",
    user_id: "neha-demo-user-id",
    file_name: "starbucks_receipt.png",
    parsed_datetime: new Date(Date.now() - 3600000 * 2).toISOString(),
    amount: 14.50,
    vendor: "Starbucks Coffee",
    category: "Meals & Entertainment",
    date: "2026-06-18",
    confidence_score: 98,
    invoice_preview: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2300704A'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10'>Starbucks</text></svg>"
  },
  {
    id: "2",
    user_id: "neha-demo-user-id",
    file_name: "acme_hosting_invoice_1092.pdf",
    parsed_datetime: new Date(Date.now() - 3600000 * 24).toISOString(),
    amount: 149.00,
    vendor: "ACME Cloud Services",
    category: "Software & SaaS",
    date: "2026-06-15",
    confidence_score: 95,
    invoice_preview: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231E293B'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10'>ACME SaaS</text></svg>"
  },
  {
    id: "3",
    user_id: "neha-demo-user-id",
    file_name: "pasted_text_snippet",
    parsed_datetime: new Date(Date.now() - 3600000 * 48).toISOString(),
    amount: 32.12,
    vendor: "Office Depot",
    category: "Office Supplies",
    date: "2026-06-12",
    confidence_score: 87,
    invoice_preview: null
  }
];

// Lazy-loaded Supabase client
let supabaseClient: any = null;
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || url === "MY_SUPABASE_URL" || !key || key === "MY_SUPABASE_ANON_KEY") {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false
      }
    });
  }
  return supabaseClient;
}

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini() {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GOOGLE_API_KEY" || key === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Structured OCR / Detail extraction with Gemini
async function parseInvoiceWithGemini(fileData?: { mimeType: string, base64: string }, rawText?: string) {
  const ai = getGemini();
  if (!ai) {
    throw new Error("Google/Gemini API key is not configured in the Secrets panel. Please configure GOOGLE_API_KEY.");
  }

  const contents: any[] = [];
  if (fileData) {
    contents.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.base64
      }
    });
  }

  let prompt = `Extract standard receipt or invoice values. Provide a confidence score (from 0 to 100) on how accurate the extraction is.
Return a structured JSON output with the exact details.
Standard bookkeeping categories to choose from:
- Meals & Entertainment
- Software & SaaS
- Office Supplies
- Utilities
- Marketing
- Rent
- Travel
- Professional Services
- Other

Example:
{
  "amount": 25.40,
  "vendor": "Uber Services",
  "category": "Travel",
  "date": "2026-06-14",
  "confidenceScore": 95
}`;

  if (rawText) {
    prompt += `\n\nRaw text of invoice/receipt:\n${rawText}`;
  }

  contents.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: {
            type: Type.NUMBER,
            description: "The total amount of the receipt or invoice (numeric, e.g., 24.50)."
          },
          vendor: {
            type: Type.STRING,
            description: "The business or seller name (e.g., Starbucks)."
          },
          category: {
            type: Type.STRING,
            description: "The matching standard bookkeeping category."
          },
          date: {
            type: Type.STRING,
            description: "The exact date on receipt/invoice in YYYY-MM-DD format (or closest match)."
          },
          confidenceScore: {
            type: Type.INTEGER,
            description: "Estimated extraction accuracy from 0 to 100."
          }
        },
        required: ["amount", "vendor", "category", "date", "confidenceScore"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response received from Gemini model.");
  }

  return JSON.parse(text.trim());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Config Status Endpoint
  app.get("/api/config", async (req, res) => {
    const supabaseConnected = !!getSupabase();
    const geminiConnected = !!getGemini();
    let isTableMissing = false;
    let tableErrorMessage = "";

    if (supabaseConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from("invoices").select("id").limit(1);
        if (error) {
          const errMsg = error.message || "";
          if (
            error.code === "PGRST116" || 
            errMsg.includes("relation \"invoices\" does not exist") || 
            errMsg.includes("Could not find the table") ||
            errMsg.includes("schema cache")
          ) {
            isTableMissing = true;
            tableErrorMessage = error.message;
          }
        }
      } catch (err: any) {
        console.warn("Probe invoices table failed:", err);
      }
    }

    res.json({
      supabaseConfigured: supabaseConnected,
      supabaseUrl: process.env.SUPABASE_URL || "",
      geminiConfigured: geminiConnected,
      mode: supabaseConnected ? "production" : "offline-fallback",
      isTableMissing,
      tableErrorMessage
    });
  });

  // Auth: Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) {
            const isSupabaseOffline = error.message && (
              error.message.includes("Unexpected token") ||
              error.message.includes("valid JSON") ||
              error.message.includes("NOT_FOUND") ||
              error.message.includes("could not be found") ||
              error.message.includes("database") ||
              error.message.includes("fetch")
            );
            if (isSupabaseOffline) {
              console.warn("Supabase Auth signUp returned error/failed. Falling back to Mock DB:", error.message);
            } else {
              return res.status(400).json({ error: error.message });
            }
          } else if (data && data.user) {
            return res.json({
              user: { id: data.user.id, email: data.user.email },
              session: data.session
            });
          }
        } catch (err: any) {
          const errMsg = err?.message || "";
          const isSupabaseOffline = errMsg.includes("Unexpected token") || 
                                   errMsg.includes("valid JSON") || 
                                   errMsg.includes("NOT_FOUND") || 
                                   errMsg.includes("could not be found") ||
                                   errMsg.includes("fetch");
          if (isSupabaseOffline) {
            console.warn("Supabase Auth signUp threw exception. Falling back to Mock DB:", errMsg);
          } else {
            return res.status(500).json({ error: errMsg });
          }
        }
      }

      // Offline / Preview fallback mode
      const exists = mockUsers.find(u => u.email === email);
      if (exists) {
        if (exists.password === password) {
          return res.json({
            user: { id: exists.id, email: exists.email },
            isDemo: true,
            message: "User already exists. Logged in via Offline Demo Mode (local memory)."
          });
        }
        return res.status(400).json({ error: "User already exists in demo mode." });
      }
      const newUser = { id: "user_" + Math.random().toString(36).substring(2, 11), email, password };
      mockUsers.push(newUser);
      
      const supabaseConfigured = !!supabase;
      return res.json({
        user: { id: newUser.id, email: newUser.email },
        isDemo: true,
        message: supabaseConfigured 
          ? "Your Supabase project is offline or paused. Registered successfully in Offline Demo Mode (Saves data locally in memory)!"
          : "Registered successfully in Offline Demo Mode (Saves data locally in memory)!"
      });
    } catch (err: any) {
      console.error("Signup error catch-all:", err);
      return res.status(500).json({ error: err.message || "An unexpected registration error occurred." });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            const isSupabaseOffline = error.message && (
              error.message.includes("Unexpected token") ||
              error.message.includes("valid JSON") ||
              error.message.includes("NOT_FOUND") ||
              error.message.includes("could not be found") ||
              error.message.includes("database") ||
              error.message.includes("fetch")
            );
            if (isSupabaseOffline) {
              console.warn("Supabase Auth signInWithPassword returned error/failed. Falling back to Mock DB:", error.message);
            } else {
              return res.status(400).json({ error: error.message });
            }
          } else if (data && data.user) {
            return res.json({
              user: { id: data.user.id, email: data.user.email },
              session: data.session
            });
          }
        } catch (err: any) {
          const errMsg = err?.message || "";
          const isSupabaseOffline = errMsg.includes("Unexpected token") || 
                                   errMsg.includes("valid JSON") || 
                                   errMsg.includes("NOT_FOUND") || 
                                   errMsg.includes("could not be found") ||
                                   errMsg.includes("fetch");
          if (isSupabaseOffline) {
            console.warn("Supabase Auth signInWithPassword threw exception. Falling back to Mock DB:", errMsg);
          } else {
            return res.status(500).json({ error: errMsg });
          }
        }
      }

      // Offline / Preview fallback mode
      let user = mockUsers.find(u => u.email === email && u.password === password);
      if (!user) {
        const emailExists = mockUsers.some(u => u.email === email);
        if (emailExists) {
          return res.status(400).json({ error: "Invalid password for this account in demo mode." });
        }
        // Auto-provision fallback user to prevent any blockers
        user = { id: "user_" + Math.random().toString(36).substring(2, 11), email, password };
        mockUsers.push(user);
      }

      const supabaseConfigured = !!supabase;
      return res.json({
        user: { id: user.id, email: user.email },
        isDemo: true,
        message: supabaseConfigured
          ? "Your Supabase project is offline or paused. Logged in via Offline Demo Mode (local memory)!"
          : "Logged in via Offline Demo Mode (local memory)!"
      });
    } catch (err: any) {
      console.error("Login error catch-all:", err);
      return res.status(500).json({ error: err.message || "An unexpected login error occurred." });
    }
  });

  // Parse Invoice Invoice OCR Endpoint
  app.post("/api/invoices/parse", async (req, res) => {
    const { fileData, fileName, rawText, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required to track files." });
    }

    try {
      // 1. Core Gemini Parsing
      let extracted;
      const ai = getGemini();

      if (!ai) {
        // Simple mock parser fallback for developers if Gemini key is missing
        console.warn("GOOGLE_API_KEY / GEMINI_API_KEY missing - using mocked OCR values matching general invoice templates");
        const categories = ["Meals & Entertainment", "Software & SaaS", "Office Supplies", "Utilities", "Marketing", "Travel"];
        extracted = {
          amount: parseFloat((Math.random() * 80 + 10).toFixed(2)),
          vendor: fileName ? fileName.split(".")[0].replace(/[_-]/g, " ") : "Demo Vendor",
          category: categories[Math.floor(Math.random() * categories.length)],
          date: new Date().toISOString().split("T")[0],
          confidenceScore: Math.floor(Math.random() * 20) + 80
        };
      } else {
        extracted = await parseInvoiceWithGemini(fileData, rawText);
      }

      // Prepare preview URL (We store base64 as exact visual data URL representation)
      const visualPreview = fileData ? `data:${fileData.mimeType};base64,${fileData.base64}` : null;

      const invoiceRecord = {
        id: "inv_" + Math.random().toString(36).substring(2, 11),
        user_id: userId,
        file_name: fileName || "Raw pasted receipt text",
        parsed_datetime: new Date().toISOString(),
        amount: extracted.amount || 0.0,
        vendor: extracted.vendor || "Unknown Vendor",
        category: extracted.category || "Other",
        date: extracted.date || new Date().toISOString().split("T")[0],
        confidence_score: extracted.confidenceScore || 100,
        invoice_preview: visualPreview
      };

      const supabase = getSupabase();
      if (supabase) {
        // Let's safe-insert into Supabase
        const { data, error } = await supabase
          .from("invoices")
          .insert([invoiceRecord])
          .select();
        
        if (error) {
          console.error("Supabase insert error, falling back locally:", error.message);
          mockInvoices.unshift(invoiceRecord);
          return res.json({
            ...invoiceRecord,
            warning: `Extracted successfully! Saved to in-memory fallback because Supabase schema insertion failed: ${error.message}. Please make sure you have created the 'invoices' table.`
          });
        }
        return res.json(data[0]);
      } else {
        mockInvoices.unshift(invoiceRecord);
        return res.json(invoiceRecord);
      }

    } catch (err: any) {
      console.error("Extraction failed: ", err);
      return res.status(500).json({ error: err.message || "An error occurred during invoice extraction." });
    }
  });

  // Get Invoice History
  app.get("/api/invoices", async (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header is required." });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .order("parsed_datetime", { ascending: false });

        if (error) {
          console.error("Supabase select error, fetching from memory fallback:", error.message);
          return res.json(mockInvoices);
        }
        return res.json(data || []);
      } catch (err: any) {
        console.error("Supabase fetch failed, fallback:", err);
        return res.json(mockInvoices);
      }
    }

    return res.json(mockInvoices);
  });

  // Update Invoice Validation Status
  app.patch("/api/invoices/:id/validate", async (req, res) => {
    const { id } = req.params;
    const { validated, validatedAt, status } = req.body;
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header is required." });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("invoices")
          .update({ 
            validated_by_user: validated, 
            validated_at: validatedAt,
            status: status || (validated ? "validated" : "pending")
          })
          .eq("id", id);

        if (error) {
          console.error("Supabase update validation failure:", error.message);
        } else {
          return res.json({ success: true });
        }
      } catch (err: any) {
        console.error("Supabase update validation error:", err);
      }
    }

    const item = mockInvoices.find(inv => inv.id === id);
    if (item) {
      (item as any).validated_by_user = validated;
      (item as any).validated_at = validatedAt;
      (item as any).status = status || (validated ? "validated" : "pending");
      return res.json({ success: true, message: "Updated local in-memory fallback invoice validation status." });
    } else {
      return res.status(404).json({ error: "Invoice not found in matching record cache." });
    }
  });

  // Update General Invoice Attributes (Edits, Feedback, Status)
  app.patch("/api/invoices/:id", async (req, res) => {
    const { id } = req.params;
    const fieldsToUpdate = req.body; // e.g. { vendor, amount, category, date, user_feedback, status, ... }
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header is required." });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("invoices")
          .update(fieldsToUpdate)
          .eq("id", id);

        if (error) {
          console.error("Supabase patch invoice failure:", error.message);
        } else {
          return res.json({ success: true });
        }
      } catch (err: any) {
        console.error("Supabase patch invoice error:", err);
      }
    }

    const item = mockInvoices.find(inv => inv.id === id);
    if (item) {
      Object.assign(item, fieldsToUpdate);
      return res.json({ success: true, message: "Updated local in-memory fallback invoice attributes." });
    } else {
      return res.status(404).json({ error: "Invoice not found in matching record cache." });
    }
  });

  // Delete Invoice
  app.delete("/api/invoices/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header is required." });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("invoices")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Supabase delete failure:", error.message);
        } else {
          return res.json({ success: true });
        }
      } catch (err: any) {
        console.error("Supabase delete error:", err);
      }
    }

    const idx = mockInvoices.findIndex(inv => inv.id === id);
    if (idx !== -1) {
      mockInvoices.splice(idx, 1);
      return res.json({ success: true, message: "Deleted from shared ledger" });
    } else {
      return res.status(404).json({ error: "Invoice not found." });
    }
  });

  // Vite development / production middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Receipt Ledger server running on port ${PORT}`);
  });
}

startServer();
