import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// Debug: check env vars BEFORE supabase client loads
console.log("ENV check:", {
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  mode: import.meta.env.MODE,
  allEnv: JSON.stringify(import.meta.env),
});

// Dynamic import so env logging happens first
import("./App").then(({ default: App }) => {
  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}).catch(err => {
  console.error("App failed to load:", err);
  document.getElementById("root")!.innerHTML = `<pre style="padding:2rem;color:red;">${err.message}</pre>`;
});
