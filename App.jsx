import { useState } from "react";

const STORES_DB = [
  { id: 1, name: "Walmart Supercenter", type: "Big Box", address: "1234 Main St", distance: "0.8 mi", lat: 0, lng: 0 },
  { id: 2, name: "Target", type: "Big Box", address: "5678 Oak Ave", distance: "1.2 mi", lat: 0, lng: 0 },
  { id: 3, name: "Kroger", type: "Grocery", address: "910 Elm Blvd", distance: "1.5 mi", lat: 0, lng: 0 },
  { id: 4, name: "Whole Foods Market", type: "Grocery", address: "2345 Pine Rd", distance: "2.1 mi", lat: 0, lng: 0 },
  { id: 5, name: "Home Depot", type: "Home Improvement", address: "3456 Cedar Ln", distance: "2.4 mi", lat: 0, lng: 0 },
  { id: 6, name: "Lowe's", type: "Home Improvement", address: "7890 Birch Way", distance: "3.0 mi", lat: 0, lng: 0 },
  { id: 7, name: "Safeway", type: "Grocery", address: "1122 Maple Dr", distance: "3.3 mi", lat: 0, lng: 0 },
  { id: 8, name: "Costco", type: "Big Box", address: "4455 Walnut Blvd", distance: "4.1 mi", lat: 0, lng: 0 },
];

const storeIcon = (type) => {
  if (type === "Grocery") return "🛒";
  if (type === "Big Box") return "🏪";
  if (type === "Home Improvement") return "🔨";
  return "🏬";
};

export default function App() {
  const [step, setStep] = useState("home"); // home | locating | stores | searching | result
  const [locationMode, setLocationMode] = useState(null);
  const [address, setAddress] = useState("");
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchItem, setSearchItem] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("All");

  const handleUseLocation = () => {
    setLocationMode("gps");
    setStep("locating");
    setTimeout(() => setStep("stores"), 1500);
  };

  const handleAddressSubmit = () => {
    if (!address.trim()) return;
    setLocationMode("address");
    setStep("locating");
    setTimeout(() => setStep("stores"), 1200);
  };

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    setStep("searching");
  };

  const handleSearch = async () => {
    if (!searchItem.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const prompt = `A user is shopping at ${selectedStore.name} (${selectedStore.type} store) and is looking for: "${searchItem}".

Please provide:
1. Whether this item is typically carried at ${selectedStore.name}
2. The most likely aisle number or section/department where it would be found
3. Any helpful tips (e.g., check near X, might also be in Y section)
4. A confidence level: High, Medium, or Low based on how certain you are

Format your response as JSON only, no markdown, like:
{
  "inStock": true,
  "aisle": "Aisle 12",
  "section": "Cleaning Supplies",
  "department": "Household",
  "tips": "Usually found near laundry detergent. May also have an endcap display near the entrance.",
  "confidence": "High",
  "alternatives": "If not found, check the dollar section near the front of the store."
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const textBlock = data.content?.find(b => b.type === "text");
      if (!textBlock) throw new Error("No response");

      const raw = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      setResult(parsed);
      setStep("result");
    } catch (e) {
      setError("Couldn't get location info. Try a different search term.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("home");
    setSelectedStore(null);
    setSearchItem("");
    setResult(null);
    setAddress("");
    setError("");
    setFilterType("All");
  };

  const filteredStores = filterType === "All" ? STORES_DB : STORES_DB.filter(s => s.type === filterType);

  const confidenceColor = (c) => {
    if (c === "High") return "#22c55e";
    if (c === "Medium") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)", padding: "20px 16px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {step !== "home" && (
            <button onClick={reset} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 10px", color: "white", cursor: "pointer", fontSize: 16 }}>←</button>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>📍 Item Locator</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Find anything, anywhere</div>
          </div>
        </div>
        {selectedStore && (
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
            {storeIcon(selectedStore.type)} {selectedStore.name} · {selectedStore.distance}
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>

        {/* HOME */}
        {step === "home" && (
          <div>
            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
              <div style={{ fontSize: 56 }}>🗺️</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginTop: 8 }}>Where do you want to shop?</div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>We'll find nearby stores and locate your items</div>
            </div>

            <button
              onClick={handleUseLocation}
              style={{ width: "100%", padding: "14px", background: "#1e40af", color: "white", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              📡 Use My Current Location
            </button>

            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>— or enter an address —</div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddressSubmit()}
                placeholder="123 Main St, City, State"
                style={{ flex: 1, padding: "12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none" }}
              />
              <button
                onClick={handleAddressSubmit}
                style={{ padding: "12px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 10, fontSize: 16, cursor: "pointer" }}
              >→</button>
            </div>
          </div>
        )}

        {/* LOCATING */}
        {step === "locating" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, animation: "pulse 1s infinite" }}>📡</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", marginTop: 16 }}>Finding stores near you…</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Searching grocery, big box & home improvement</div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", opacity: 0.4 + i * 0.3 }} />
              ))}
            </div>
          </div>
        )}

        {/* STORE LIST */}
        {step === "stores" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
              {locationMode === "gps" ? "📍 Stores near your location" : `📍 Stores near "${address}"`}
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
              {["All", "Grocery", "Big Box", "Home Improvement"].map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{
                  padding: "6px 12px", borderRadius: 20, border: "1.5px solid",
                  borderColor: filterType === t ? "#1e40af" : "#e2e8f0",
                  background: filterType === t ? "#1e40af" : "white",
                  color: filterType === t ? "white" : "#64748b",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
                }}>{t}</button>
              ))}
            </div>

            {filteredStores.map(store => (
              <div key={store.id} onClick={() => handleStoreSelect(store)}
                style={{ background: "white", borderRadius: 12, padding: "14px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, border: "1.5px solid transparent" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
              >
                <div style={{ fontSize: 28 }}>{storeIcon(store.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{store.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{store.address}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{store.type}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{store.distance}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>away</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEARCH */}
        {step === "searching" && (
          <div>
            <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Searching at</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{storeIcon(selectedStore.type)} {selectedStore.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{selectedStore.address}</div>
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 10 }}>What are you looking for?</div>

            <input
              value={searchItem}
              onChange={e => setSearchItem(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Tide Pods, 2x4 lumber, almond milk..."
              style={{ width: "100%", padding: "13px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
              autoFocus
            />

            <button
              onClick={handleSearch}
              disabled={loading || !searchItem.trim()}
              style={{ width: "100%", padding: "14px", background: loading ? "#93c5fd" : "#1e40af", color: "white", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "🔍 Searching…" : "🔍 Find It"}
            </button>

            {error && <div style={{ marginTop: 12, color: "#ef4444", fontSize: 13, textAlign: "center" }}>{error}</div>}

            {loading && (
              <div style={{ textAlign: "center", marginTop: 24, color: "#64748b", fontSize: 13 }}>
                <div style={{ fontSize: 32 }}>🤖</div>
                <div style={{ marginTop: 8 }}>Checking {selectedStore.name} for <strong>{searchItem}</strong>…</div>
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {step === "result" && result && (
          <div>
            <div style={{ background: result.inStock ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${result.inStock ? "#bbf7d0" : "#fecaca"}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: result.inStock ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                {result.inStock ? "✅ Likely in stock" : "❌ May not be available"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginTop: 6 }}>{searchItem}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>at {selectedStore.name}</div>
            </div>

            {/* Location card */}
            <div style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 10 }}>📍 WHERE TO FIND IT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px" }}>
                  <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>AISLE</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 2 }}>{result.aisle || "—"}</div>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px" }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>SECTION</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{result.section || "—"}</div>
                </div>
              </div>
              {result.department && (
                <div style={{ marginTop: 10, background: "#fafafa", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#475569" }}>
                  🏬 Department: <strong>{result.department}</strong>
                </div>
              )}
            </div>

            {/* Tips */}
            {result.tips && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>💡 HELPFUL TIPS</div>
                <div style={{ fontSize: 13, color: "#78350f" }}>{result.tips}</div>
              </div>
            )}

            {result.alternatives && (
              <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>🔄 IF YOU CAN'T FIND IT</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{result.alternatives}</div>
              </div>
            )}

            {/* Confidence */}
            <div style={{ background: "white", borderRadius: 12, padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>AI Confidence</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: confidenceColor(result.confidence) }}>
                {result.confidence === "High" ? "🟢" : result.confidence === "Medium" ? "🟡" : "🔴"} {result.confidence}
              </div>
            </div>

            <button onClick={() => { setStep("searching"); setResult(null); setSearchItem(""); }}
              style={{ width: "100%", padding: "13px", background: "#1e40af", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
              🔍 Search Another Item
            </button>
            <button onClick={() => { setStep("stores"); setSelectedStore(null); setResult(null); setSearchItem(""); }}
              style={{ width: "100%", padding: "13px", background: "white", color: "#1e40af", border: "1.5px solid #1e40af", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              🏪 Change Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
