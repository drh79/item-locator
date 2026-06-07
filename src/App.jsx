import * as React from "react";
import { useState } from "react";

const STORES_DB = [
{ id: 1, name: "Walmart Supercenter", type: "Big Box", address: "1234 Main St", distance: "0.8 mi", phone: "555-100-1000" },
{ id: 2, name: "Target", type: "Big Box", address: "5678 Oak Ave", distance: "1.2 mi", phone: "555-200-2000" },
{ id: 3, name: "Kroger", type: "Grocery", address: "910 Elm Blvd", distance: "1.5 mi", phone: "555-300-3000" },
{ id: 4, name: "Whole Foods Market", type: "Grocery", address: "2345 Pine Rd", distance: "2.1 mi", phone: "555-400-4000" },
{ id: 5, name: "Home Depot", type: "Home Improvement", address: "3456 Cedar Ln", distance: "2.4 mi", phone: "555-500-5000" },
{ id: 6, name: "Lowe's", type: "Home Improvement", address: "7890 Birch Way", distance: "3.0 mi", phone: "555-600-6000" },
{ id: 7, name: "Safeway", type: "Grocery", address: "1122 Maple Dr", distance: "3.3 mi", phone: "555-700-7000" },
{ id: 8, name: "Costco", type: "Big Box", address: "4455 Walnut Blvd", distance: "4.1 mi", phone: "555-800-8000" },
];

const API_HEADERS = {
"Content-Type": "application/json",
"x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
"anthropic-dangerous-direct-browser-access": "true"
};

const storeIcon = t => t === "Grocery" ? "🛒" : t === "Big Box" ? "🏪" : t === "Home Improvement" ? "🔨" : "🏬";
const storeType = name => {
const n = name.toLowerCase();
if (["walmart","target","costco","sam's club","bj's"].some(s => n.includes(s))) return "Big Box";
if (["home depot","lowe's","lowes","menards","ace hardware"].some(s => n.includes(s))) return "Home Improvement";
return "Grocery";
};

function distKm(lat1, lon1, lat2, lon2) {
const R = 6371, dLat = (lat2-lat1)Math.PI/180, dLon = (lon2-lon1)Math.PI/180;
const a = Math.sin(dLat/2)**2 + Math.cos(lat1Math.PI/180)Math.cos(lat2Math.PI/180)Math.sin(dLon/2) 2;
return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
const kmToMi = km => (km * 0.621371).toFixed(1);

export default function App() {
const [step, setStep] = useState("home");
const [locationMode, setLocationMode] = useState(null);
const [address, setAddress] = useState("");
const [userCoords, setUserCoords] = useState(null);
const [stores, setStores] = useState([]);
const [loadingStores, setLoadingStores] = useState(false);
const [selectedStore, setSelectedStore] = useState(null);
const [searchItem, setSearchItem] = useState("");
const [result, setResult] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [filterType, setFilterType] = useState("All");
const [history, setHistory] = useState(() => {
try { return JSON.parse(localStorage.getItem("itemLocatorHistory") || "[]"); } catch { return []; }
});
const [showHistory, setShowHistory] = useState(false);

const saveHistory = (store, item, res) => {
const entry = { id: Date.now(), store: store.name, storeType: store.type, item, aisle: res.aisle, section: res.section, confidence: res.confidence, ts: new Date().toLocaleString() };
const updated = [entry, ...history].slice(0, 20);
setHistory(updated);
try { localStorage.setItem("itemLocatorHistory", JSON.stringify(updated)); } catch {}
};

const clearHistory = () => {
setHistory([]);
try { localStorage.removeItem("itemLocatorHistory"); } catch {}
};

const fetchNearbyStores = async (lat, lng) => {
setLoadingStores(true);
try {
const res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: API_HEADERS,
body: JSON.stringify({
model: "claude-sonnet-4-20250514",
max_tokens: 1000,
tools: [{ type: "web_search_20250305", name: "web_search" }],
messages: [{
role: "user",
content: Find real grocery stores, big box stores (Walmart, Target, Costco), and home improvement stores (Home Depot, Lowe's) near coordinates ${lat}, ${lng}. Return ONLY a JSON array (no markdown) of up to 10 stores with fields: name, address, phone (or empty string), lat, lng. Example: [{"name":"Walmart","address":"123 Main St","phone":"555-111-2222","lat":40.1,"lng":-75.2}]
}]
})
});
const data = await res.json();
const textBlock = data.content?.find(b => b.type === "text");
if (!textBlock) throw new Error();
const raw = textBlock.text.replace(/json|/g, "").trim();
const parsed = JSON.parse(raw);
const mapped = parsed.map((s, i) => {
const dist = s.lat && s.lng ? kmToMi(distKm(lat, lng, s.lat, s.lng)) : "?";
return { id: i+1, name: s.name, type: storeType(s.name), address: s.address, distance: ${dist} mi`, phone: s.phone || "", lat: s.lat, lng: s.lng };
}).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
setStores(mapped);
} catch {
setStores(STORES_DB);
} finally {
setLoadingStores(false);
}
};

const handleUseLocation = () => {
setLocationMode("gps");
setStep("locating");
if (navigator.geolocation) {
navigator.geolocation.getCurrentPosition(
pos => {
setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
fetchNearbyStores(pos.coords.latitude, pos.coords.longitude).then(() => setStep("stores"));
},
() => { setStores(STORES_DB); setLoadingStores(false); setStep("stores"); }
);
} else {
setStores(STORES_DB); setStep("stores");
}
};

const handleAddressSubmit = async () => {
if (!address.trim()) return;
setLocationMode("address");
setStep("locating");
try {
const res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: API_HEADERS,
body: JSON.stringify({
model: "claude-sonnet-4-20250514",
max_tokens: 200,
messages: [{ role: "user", content: Return ONLY a JSON object with lat and lng for this address: "${address}". No markdown. Example: {"lat":40.7128,"lng":-74.0060}` }]
})
});
const data = await res.json();
const txt = data.content?.find(b => b.type === "text")?.text || "";
const coords = JSON.parse(txt.replace(/json|/g, "").trim());
setUserCoords(coords);
await fetchNearbyStores(coords.lat, coords.lng);
} catch {
setStores(STORES_DB);
}
setStep("stores");
};

const handleStoreSelect = (store) => { setSelectedStore(store); setStep("searching"); };

const handleSearch = async () => {
if (!searchItem.trim()) return;
setLoading(true); setError(""); setResult(null);
try {
const res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: API_HEADERS,
body: JSON.stringify({
model: "claude-sonnet-4-20250514",
max_tokens: 1000,
tools: [{ type: "web_search_20250305", name: "web_search" }],
messages: [{
role: "user",
content: A shopper at ${selectedStore.name} (${selectedStore.type}) is looking for: "${searchItem}". Provide: 1) inStock (bool), 2) aisle number/name, 3) section, 4) department, 5) tips, 6) confidence (High/Medium/Low), 7) alternatives if not found. Return ONLY JSON, no markdown:
{"inStock":true,"aisle":"Aisle 12","section":"Cleaning Supplies","department":"Household","tips":"Near laundry detergent.","confidence":"High","alternatives":"Check dollar section."}`
}]
})
});
const data = await res.json();
const txt = data.content?.find(b => b.type === "text")?.text || "";
const parsed = JSON.parse(txt.replace(/json|/g, "").trim());
setResult(parsed);
saveHistory(selectedStore, searchItem, parsed);
setStep("result");
} catch {
setError("Couldn't get location info. Try rephrasing your search.");
} finally { setLoading(false); }
};

const handleCall = (phone) => {
if (phone) window.location.href = tel:${phone.replace(/\D/g,"")}`;
};

const reset = () => {
setStep("home"); setSelectedStore(null); setSearchItem(""); setResult(null);
setAddress(""); setError(""); setFilterType("All"); setStores([]);
};

const confidenceColor = c => c === "High" ? "#22c55e" : c === "Medium" ? "#f59e0b" : "#ef4444";
const filteredStores = filterType === "All" ? stores : stores.filter(s => s.type === filterType);

return (
<div style={{ fontFamily:"'Segoe UI',sans-serif", maxWidth:420, margin:"0 auto", minHeight:"100vh", background:"#f8fafc" }}>
<div style={{ background:"linear-gradient(135deg,#1e40af,#3b82f6)", padding:"20px 16px 16px", color:"white" }}>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
{step !== "home" && <button onClick={reset} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, padding:"6px 10px", color:"white", cursor:"pointer", fontSize:16 }}>←</button>}
<div style={{ flex:1 }}>
<div style={{ fontSize:20, fontWeight:700 }}>📍 Item Locator</div>
<div style={{ fontSize:12, opacity:0.85 }}>Find anything, anywhere</div>
</div>
<button onClick={() => setShowHistory(!showHistory)} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, padding:"6px 10px", color:"white", cursor:"pointer", fontSize:16, position:"relative" }}>
🕑 {history.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#ef4444", borderRadius:"50%", width:16, height:16, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>{history.length > 9 ? "9+" : history.length}</span>}
</button>
</div>
{selectedStore && (
<div style={{ marginTop:10, background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"8px 10px", fontSize:13, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
<span>{storeIcon(selectedStore.type)} {selectedStore.name} · {selectedStore.distance}</span>
{selectedStore.phone && (
<button onClick={() => handleCall(selectedStore.phone)} style={{ background:"rgba(255,255,255,0.25)", border:"none", borderRadius:6, padding:"4px 8px", color:"white", cursor:"pointer", fontSize:12, fontWeight:600 }}>📞 Call</button>
)}
</div>
)}
</div>

{showHistory && (
<div style={{ background:"white", borderBottom:"1.5px solid #e2e8f0", padding:16, maxHeight:300, overflowY:"auto" }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
<div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>🕑 Search History</div>
<div style={{ display:"flex", gap:8 }}>
{history.length > 0 && <button onClick={clearHistory} style={{ fontSize:11, color:"#ef4444", background:"none", border:"1px solid #fecaca", borderRadius:6, padding:"3px 8px", cursor:"pointer" }}>Clear all</button>}
<button onClick={() => setShowHistory(false)} style={{ fontSize:11, color:"#64748b", background:"none", border:"1px solid #e2e8f0", borderRadius:6, padding:"3px 8px", cursor:"pointer" }}>Close</button>
</div>
</div>
{history.length === 0 ? (
<div style={{ color:"#94a3b8", fontSize:13, textAlign:"center", padding:"16px 0" }}>No searches yet</div>
) : history.map(h => (
<div key={h.id} style={{ padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
<div>
<div style={{ fontWeight:600, fontSize:14, color:"#1e293b" }}>{h.item}</div>
<div style={{ fontSize:12, color:"#64748b" }}>{storeIcon(h.storeType)} {h.store}</div>
<div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{h.aisle} · {h.section}</div>
</div>
<div style={{ fontSize:11, fontWeight:700, color:confidenceColor(h.confidence), textAlign:"right" }}>
{h.confidence}<br/><span style={{ color:"#94a3b8", fontWeight:400 }}>{h.ts}</span>
</div>
</div>
</div>
))}
</div>
)}

<div style={{ padding:16 }}>
{step === "home" && (
<div>
<div style={{ textAlign:"center", padding:"24px 0 16px" }}>
<div style={{ fontSize:56 }}>🗺️</div>
<div style={{ fontSize:20, fontWeight:700, color:"#1e293b", marginTop:8 }}>Where do you want to shop?</div>
<div style={{ fontSize:14, color:"#64748b", marginTop:4 }}>Find real nearby stores & locate your items</div>
</div>
<button onClick={handleUseLocation} style={{ width:"100%", padding:"14px", background:"#1e40af", color:"white", border:"none", borderRadius:12, fontSize:16, fontWeight:600, cursor:"pointer", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
📡 Use My Current Location
</button>
<div style={{ textAlign:"center", color:"#94a3b8", fontSize:13, marginBottom:12 }}>— or enter an address —</div>
<div style={{ display:"flex", gap:8 }}>
<input value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key==="Enter" && handleAddressSubmit()} placeholder="123 Main St, City, State" style={{ flex:1, padding:"12px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none" }} />
<button onClick={handleAddressSubmit} style={{ padding:"12px 16px", background:"#3b82f6", color:"white", border:"none", borderRadius:10, fontSize:16, cursor:"pointer" }}>→</button>
</div>
</div>
)}

{step === "locating" && (
<div style={{ textAlign:"center", padding:"60px 0" }}>
<div style={{ fontSize:48 }}>📡</div>
<div style={{ fontSize:18, fontWeight:600, color:"#1e293b", marginTop:16 }}>Finding real stores near you…</div>
<div style={{ fontSize:13, color:"#64748b", marginTop:6 }}>Searching grocery, big box & home improvement</div>
</div>
)}

{step === "stores" && (
<div>
<div style={{ fontSize:15, fontWeight:600, color:"#1e293b", marginBottom:12 }}>
{locationMode === "gps" ? "📍 Stores near your location" : 📍 Stores near "${address}"`}
</div>
{loadingStores ? (
<div style={{ textAlign:"center", padding:"40px 0", color:"#64748b" }}>Loading real stores…</div>
) : (
<>
<div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto" }}>
{["All","Grocery","Big Box","Home Improvement"].map(t => (
<button key={t} onClick={() => setFilterType(t)} style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid", borderColor:filterType===t?"#1e40af":"#e2e8f0", background:filterType===t?"#1e40af":"white", color:filterType===t?"white":"#64748b", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>{t}</button>
))}
</div>
{filteredStores.map(store => (
<div key={store.id} style={{ background:"white", borderRadius:12, padding:"14px", marginBottom:10, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", border:"1.5px solid transparent" }}>
<div style={{ display:"flex", alignItems:"center", gap:12 }} onClick={() => handleStoreSelect(store)}>
<div style={{ fontSize:28 }}>{storeIcon(store.type)}</div>
<div style={{ flex:1, cursor:"pointer" }}>
<div style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>{store.name}</div>
<div style={{ fontSize:12, color:"#64748b" }}>{store.address}</div>
<div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{store.type}</div>
</div>
<div style={{ textAlign:"right" }}>
<div style={{ fontSize:13, fontWeight:700, color:"#3b82f6" }}>{store.distance}</div>
</div>
</div>
<div style={{ display:"flex", gap:8, marginTop:10 }}>
<button onClick={() => handleStoreSelect(store)} style={{ flex:1, padding:"8px", background:"#1e40af", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>🔍 Search Items</button>
{store.phone && (
<button onClick={() => handleCall(store.phone)} style={{ padding:"8px 14px", background:"#f0fdf4", color:"#16a34a", border:"1.5px solid #bbf7d0", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>📞 Call</button>
)}
</div>
</div>
))}
</>
)}
</div>
)}

{step === "searching" && (
<div>
<div style={{ background:"white", borderRadius:12, padding:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
<div style={{ fontSize:13, color:"#64748b" }}>Searching at</div>
<div style={{ fontSize:16, fontWeight:700, color:"#1e293b" }}>{storeIcon(selectedStore.type)} {selectedStore.name}</div>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div style={{ fontSize:12, color:"#94a3b8" }}>{selectedStore.address}</div>
{selectedStore.phone && (
<button onClick={() => handleCall(selectedStore.phone)} style={{ padding:"5px 10px", background:"#f0fdf4", color:"#16a34a", border:"1.5px solid #bbf7d0", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>📞 Call Store</button>
)}
</div>
</div>

{history.length > 0 && (
<div style={{ marginBottom:14 }}>
<div style={{ fontSize:12, fontWeight:600, color:"#64748b", marginBottom:6 }}>🕑 Recent searches</div>
<div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
{[...new Set(history.map(h => h.item))].slice(0,6).map(item => (
<button key={item} onClick={() => setSearchItem(item)} style={{ padding:"5px 10px", background:"#eff6ff", color:"#1e40af", border:"1.5px solid #bfdbfe", borderRadius:20, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>{item}</button>
))}
</div>
</div>
)}

<div style={{ fontSize:15, fontWeight:600, color:"#1e293b", marginBottom:10 }}>What are you looking for?</div>
<input value={searchItem} onChange={e => setSearchItem(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSearch()} placeholder="e.g. Tide Pods, 2x4 lumber, almond milk…" style={{ width:"100%", padding:"13px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:12 }} autoFocus />
<button onClick={handleSearch} disabled={loading || !searchItem.trim()} style={{ width:"100%", padding:"14px", background:loading?"#93c5fd":"#1e40af", color:"white", border:"none", borderRadius:12, fontSize:16, fontWeight:600, cursor:loading?"not-allowed":"pointer" }}>
{loading ? "🔍 Searching…" : "🔍 Find It"}
</button>
{error && <div style={{ marginTop:12, color:"#ef4444", fontSize:13, textAlign:"center" }}>{error}</div>}
{loading && <div style={{ textAlign:"center", marginTop:24, color:"#64748b", fontSize:13 }}><div style={{ fontSize:32 }}>🤖</div><div style={{ marginTop:8 }}>Checking {selectedStore.name} for <strong>{searchItem}</strong>…</div></div>}
</div>
)}

{step === "result" && result && (
<div>
<div style={{ background:result.inStock?"#f0fdf4":"#fef2f2", border:1.5px solid${result.inStock?"#bbf7d0":"#fecaca"}`, borderRadius:12, padding:16, marginBottom:14 }}>
<div style={{ fontSize:13, color:result.inStock?"#16a34a":"#dc2626", fontWeight:700 }}>{result.inStock?"✅ Likely in stock":"❌ May not be available"}</div>
<div style={{ fontSize:22, fontWeight:800, color:"#1e293b", marginTop:6 }}>{searchItem}</div>
<div style={{ fontSize:13, color:"#64748b" }}>at {selectedStore.name}</div>
</div>

<div style={{ background:"white", borderRadius:12, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", marginBottom:12 }}>
<div style={{ fontSize:13, color:"#64748b", fontWeight:600, marginBottom:10 }}>📍 WHERE TO FIND IT</div>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
<div style={{ background:"#eff6ff", borderRadius:10, padding:"12px" }}>
<div style={{ fontSize:11, color:"#3b82f6", fontWeight:700 }}>AISLE</div>
<div style={{ fontSize:20, fontWeight:800, color:"#1e293b", marginTop:2 }}>{result.aisle||"—"}</div>
</div>
<div style={{ background:"#f0fdf4", borderRadius:10, padding:"12px" }}>
<div style={{ fontSize:11,
