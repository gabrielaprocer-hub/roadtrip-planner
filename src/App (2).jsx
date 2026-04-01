import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════
//  ROADTRIP PLANNER AI v3 — UX Redesign
//  Architecture: 5 tabs + FAB AI Chat
//  Home → Roteiro → Explorar → Financeiro → Checklist
// ═══════════════════════════════════════════════════════════════════════

// ─── NAV CONFIG ──────────────────────────────────────────────────────
const TABS = [
  { id: "home", icon: "⬡", label: "Home" },
  { id: "route", icon: "◈", label: "Roteiro" },
  { id: "explore", icon: "◉", label: "Explorar" },
  { id: "finance", icon: "◆", label: "Financeiro" },
  { id: "checklist", icon: "◇", label: "Checklist" },
];

// ─── DATA ────────────────────────────────────────────────────────────
const PROFILES = [
  { id: "economic", label: "Econômico", icon: "💚", desc: "Camping · comida caseira · estradas alternativas", color: "#34D399" },
  { id: "comfort", label: "Confortável", icon: "💛", desc: "Hotéis · restaurantes · rotas diretas", color: "#FBBF24" },
  { id: "adventure", label: "Aventura", icon: "🧡", desc: "Off-road · camping selvagem · trilhas", color: "#F97316" },
];

const EXPENSE_CATS = [
  { id: "fuel", label: "Combustível", icon: "⛽", color: "#F97316" },
  { id: "food", label: "Alimentação", icon: "🍽️", color: "#3B82F6" },
  { id: "lodging", label: "Hospedagem", icon: "🏕️", color: "#A855F7" },
  { id: "activities", label: "Passeios", icon: "🎯", color: "#22C55E" },
  { id: "tolls", label: "Pedágios", icon: "🛣️", color: "#EAB308" },
  { id: "other", label: "Outros", icon: "📦", color: "#6B7280" },
];

const CURRENCIES = [
  { code: "BRL", sym: "R$", name: "Real", flag: "🇧🇷" },
  { code: "ARS", sym: "$", name: "Peso ARG", flag: "🇦🇷" },
  { code: "CLP", sym: "$", name: "Peso CHL", flag: "🇨🇱" },
  { code: "UYU", sym: "$U", name: "Peso URU", flag: "🇺🇾" },
  { code: "USD", sym: "US$", name: "Dólar", flag: "🇺🇸" },
  { code: "EUR", sym: "€", name: "Euro", flag: "🇪🇺" },
  { code: "PYG", sym: "₲", name: "Guaraní", flag: "🇵🇾" },
  { code: "BOB", sym: "Bs", name: "Boliviano", flag: "🇧🇴" },
  { code: "PEN", sym: "S/", name: "Sol", flag: "🇵🇪" },
  { code: "COP", sym: "$", name: "Peso COL", flag: "🇨🇴" },
];

const FALLBACK_RATES = { BRL:1, ARS:220, CLP:170, UYU:7.8, PYG:1450, USD:0.19, EUR:0.17, BOB:1.32, PEN:0.72, COP:760 };

// ─── CURRENCY SERVICE (Frankfurter + ExchangeRate-API fallback — free, no key) ──
async function fetchLiveRates() {
  try {
    const codes = ['ARS','CLP','UYU','USD','EUR','PYG','BOB','PEN','COP'];
    const rates = { BRL: 1 };
    // Primary: ExchangeRate-API open access (has all Mercosul currencies)
    const res = await fetch('https://open.er-api.com/v6/latest/BRL');
    const d = await res.json();
    if (d.rates) {
      codes.forEach(c => { if (d.rates[c]) rates[c] = d.rates[c]; });
    }
    // Fill any missing with fallbacks
    codes.forEach(c => { if (!rates[c]) rates[c] = FALLBACK_RATES[c]; });
    rates._live = true;
    rates._updated = d.time_last_update_utc || '';
    return rates;
  } catch (e) {
    return { ...FALLBACK_RATES, _live: false, _updated: '' };
  }
}

const TRIP = {
  name: "Floripa → Bariloche", origin: "Florianópolis, SC", dest: "Bariloche, ARG",
  days: 12, km: 2180, people: 4, budget: 8000,
  stops: [
    { id:1, name:"Florianópolis", day:1, type:"origin", lat:-27.60, lng:-48.55, notes:"Partida 6h", hours:0, weather:null, tourism:[] },
    { id:2, name:"Lages", day:1, type:"stop", lat:-27.82, lng:-50.33, notes:"Almoço + combustível", hours:3, weather:null, tourism:[{name:"Morro da Igreja",type:"Mirante",time:"1h",free:true}] },
    { id:3, name:"Paso Pehuenche", day:2, type:"border", lat:-35.97, lng:-70.39, notes:"Fronteira — docs obrigatórios", hours:8, weather:null, tourism:[] },
    { id:4, name:"Malargüe", day:2, type:"camping", lat:-35.48, lng:-69.59, notes:"Camping municipal · ARS 5.000", hours:10, weather:null,
      tourism:[{name:"Caverna de las Brujas",type:"Caverna",time:"3h",free:false,price:"ARS 12.000"}],
      camping:{name:"Camping Municipal",price:"ARS 5.000/n",amenities:["🚿","🔌","🚻","🔒"],rating:3.8,reviews:47,review:"Básico mas funcional. Chuveiro frio."} },
    { id:5, name:"San Rafael", day:3, type:"stop", lat:-34.62, lng:-68.33, notes:"Bodega Zuccardi + combustível", hours:4, weather:null,
      tourism:[{name:"Bodega Zuccardi",type:"Vinícola",time:"2h",free:false,price:"ARS 15.000"},{name:"Cañón del Atuel",type:"Natureza",time:"3h",free:true}] },
    { id:6, name:"Mendoza", day:4, type:"city", lat:-32.89, lng:-68.85, notes:"2 noites · Camping Suizo", hours:5, weather:null,
      tourism:[{name:"Cerro de la Gloria",type:"Monumento",time:"1h",free:true},{name:"Parque San Martín",type:"Parque",time:"2h",free:true},{name:"Bodega Catena Zapata",type:"Vinícola",time:"2h",free:false,price:"ARS 20.000"}],
      camping:{name:"Camping Suizo",price:"ARS 8.000/n",amenities:["🚿","🔌","🚻","🏊","📶"],rating:4.2,reviews:123,review:"Excelente! Chuveiro quente, piscina, wifi."} },
    { id:7, name:"Neuquén", day:6, type:"stop", lat:-38.95, lng:-68.06, notes:"Pernoite · Ruta 40", hours:7, weather:null,
      tourism:[{name:"Ruta 40 Patagônica",type:"Rota cênica",time:"Full day",free:true}] },
    { id:8, name:"Villa La Angostura", day:8, type:"camping", lat:-40.76, lng:-71.65, notes:"Camping Correntoso · lago", hours:5, weather:null,
      tourism:[{name:"Bosque de Arrayanes",type:"Natureza",time:"3h",free:false,price:"ARS 5.000"},{name:"Lago Correntoso",type:"Lago",time:"2h",free:true}],
      camping:{name:"Camping Correntoso",price:"ARS 6.000/n",amenities:["🚿","🚻","🌊","🔒","🔥"],rating:4.5,reviews:189,review:"Beira do lago! Vista incrível. Chuveiro 6h-22h."} },
    { id:9, name:"Bariloche", day:9, type:"destination", lat:-41.13, lng:-71.31, notes:"3 noites · Camping Petunia", hours:2, weather:null,
      tourism:[{name:"Circuito Chico",type:"Rota cênica",time:"4h",free:true},{name:"Cerro Campanario",type:"Mirante",time:"1.5h",free:false,price:"ARS 8.000"},{name:"Cerro Catedral",type:"Montanha",time:"5h",free:false,price:"ARS 20.000"}],
      camping:{name:"Camping Petunia",price:"ARS 7.000/n",amenities:["🚿","🔌","🚻","🔒","🏪"],rating:4.1,reviews:256,review:"Bem localizado, minimercado no local."} },
  ],
  expenses: [
    { id:1, cat:"fuel", desc:"Floripa → Lages", amt:180, day:1 },
    { id:2, cat:"food", desc:"Almoço Lages", amt:120, day:1 },
    { id:3, cat:"fuel", desc:"Lages → Pehuenche", amt:350, day:2 },
    { id:4, cat:"lodging", desc:"Camping Malargüe", amt:45, day:2 },
    { id:5, cat:"food", desc:"Jantar Malargüe", amt:90, day:2 },
    { id:6, cat:"fuel", desc:"→ San Rafael", amt:280, day:3 },
    { id:7, cat:"activities", desc:"Bodega Zuccardi", amt:60, day:3 },
    { id:8, cat:"lodging", desc:"Camping Suizo (2n)", amt:120, day:4 },
    { id:9, cat:"food", desc:"Alimentação Mendoza", amt:320, day:4 },
    { id:10, cat:"activities", desc:"Cerro de la Gloria", amt:80, day:5 },
    { id:11, cat:"fuel", desc:"Mendoza → Neuquén", amt:420, day:6 },
    { id:12, cat:"lodging", desc:"Hotel Neuquén", amt:180, day:6 },
    { id:13, cat:"fuel", desc:"→ Villa La Angostura", amt:310, day:7 },
    { id:14, cat:"lodging", desc:"Camping Correntoso (2n)", amt:100, day:8 },
    { id:15, cat:"food", desc:"Alimentação Lagos", amt:450, day:8 },
    { id:16, cat:"fuel", desc:"→ Bariloche", amt:90, day:9 },
    { id:17, cat:"lodging", desc:"Camping Petunia (3n)", amt:180, day:9 },
    { id:18, cat:"food", desc:"Alimentação Bariloche", amt:540, day:9 },
    { id:19, cat:"activities", desc:"Circuito Chico", amt:150, day:10 },
    { id:20, cat:"activities", desc:"Cerro Catedral", amt:60, day:11 },
    { id:21, cat:"tolls", desc:"Pedágios ida+volta", amt:350, day:1 },
    { id:22, cat:"fuel", desc:"Combustível volta", amt:1200, day:12 },
    { id:23, cat:"food", desc:"Alimentação volta", amt:400, day:12 },
  ],
  checklist: {
    docs: [
      { id:1, t:"CNH válida", d:true },{ id:2, t:"RG ou Passaporte (Mercosul)", d:true },
      { id:3, t:"Seguro viagem internacional", d:false },{ id:4, t:"Carta Verde (seguro veicular)", d:false },
      { id:5, t:"CRLV do veículo", d:true },{ id:6, t:"Certificado de bagagem (aduana)", d:false },
    ],
    camping: [
      { id:7, t:"Barraca impermeável", d:true },{ id:8, t:"Saco de dormir (-5°C)", d:false },
      { id:9, t:"Isolante térmico", d:false },{ id:10, t:"Fogareiro + gás", d:true },
      { id:11, t:"Kit cozinha", d:true },{ id:12, t:"Lanterna + pilhas", d:false },
    ],
    car: [
      { id:13, t:"Revisão completa", d:true },{ id:14, t:"Estepe calibrado", d:false },
      { id:15, t:"Macaco + chave roda", d:true },{ id:16, t:"Correntes p/ neve (ARG)", d:false },
      { id:17, t:"Triângulo + colete", d:true },
    ],
    personal: [
      { id:18, t:"Roupas térmicas (camadas)", d:false },{ id:19, t:"Protetor solar + óculos", d:true },
      { id:20, t:"Medicamentos", d:true },{ id:21, t:"Carregador + powerbank", d:false },
      { id:22, t:"Dinheiro ARS + BRL", d:false },
    ],
  },
};

const EXPLORE_DATA = [
  { id:1, name:"Camping Municipal Malargüe", city:"Malargüe", cat:"camping", type:"Camping", price:"ARS 5.000/n", amenities:["🚿","🔌","🚻","🔒"], rating:3.8, reviews:47, review:"Básico mas funcional. Chuveiro frio.", src:"iOverlander", verified:true },
  { id:2, name:"Camping Suizo", city:"Mendoza", cat:"camping", type:"Camping", price:"ARS 8.000/n", amenities:["🚿","🔌","🚻","🏊","📶"], rating:4.2, reviews:123, review:"Chuveiro quente, piscina, wifi fraco.", src:"iOverlander", verified:true },
  { id:3, name:"Camping Correntoso", city:"V. La Angostura", cat:"camping", type:"Camping", price:"ARS 6.000/n", amenities:["🚿","🚻","🌊","🔒","🔥"], rating:4.5, reviews:189, review:"Beira do lago! Vista incrível.", src:"iOverlander", verified:true },
  { id:4, name:"Camping Petunia", city:"Bariloche", cat:"camping", type:"Camping", price:"ARS 7.000/n", amenities:["🚿","🔌","🚻","🔒","🏪"], rating:4.1, reviews:256, review:"Minimercado no local, bem localizado.", src:"iOverlander", verified:true },
  { id:5, name:"Estacionamento YPF", city:"San Rafael", cat:"camping", type:"Informal", price:"Grátis", amenities:["🚻","🔒"], rating:3.2, reviews:31, review:"Seguro pra dormir no carro, banheiro 24h.", src:"iOverlander", verified:true },
  { id:6, name:"Wild Camp Lago Lácar", city:"San Martín", cat:"camping", type:"Selvagem", price:"Grátis", amenities:[], rating:4.0, reviews:18, review:"Lindo e isolado. Sem estrutura. 4x4.", src:"iOverlander", verified:false },
  { id:7, name:"Circuito Chico", city:"Bariloche", cat:"tourism", type:"Rota cênica", rating:4.8, time:"4h", free:true, desc:"60km com vistas dos lagos e montanhas" },
  { id:8, name:"Cerro Campanario", city:"Bariloche", cat:"tourism", type:"Mirante", rating:4.9, time:"1.5h", free:false, price:"ARS 8.000", desc:"Melhor vista — eleito National Geographic" },
  { id:9, name:"Bosque de Arrayanes", city:"V. La Angostura", cat:"tourism", type:"Natureza", rating:4.7, time:"3h", free:false, price:"ARS 5.000", desc:"Bosque único no Parque Nacional" },
  { id:10, name:"Bodega Zuccardi", city:"San Rafael", cat:"tourism", type:"Vinícola", rating:4.7, time:"2h", free:false, price:"ARS 15.000", desc:"Degustação premium com tour vinhedos" },
  { id:11, name:"Cerro de la Gloria", city:"Mendoza", cat:"tourism", type:"Monumento", rating:4.5, time:"1h", free:true, desc:"Monumento com vista panorâmica" },
  { id:12, name:"Caverna de las Brujas", city:"Malargüe", cat:"tourism", type:"Caverna", rating:4.2, time:"3h", free:false, price:"ARS 12.000", desc:"Formações calcárias impressionantes" },
  { id:13, name:"Cañón del Atuel", city:"San Rafael", cat:"tourism", type:"Natureza", rating:4.6, time:"3h", free:true, desc:"Cânion com rio verde-esmeralda" },
  { id:14, name:"Cerro Catedral", city:"Bariloche", cat:"tourism", type:"Montanha", rating:4.6, time:"5h", free:false, price:"ARS 20.000", desc:"Maior centro de ski da América do Sul" },
];

const AMENITY_NAMES = {"🚿":"Chuveiro","🔌":"Energia","🚻":"Banheiro","🔒":"Segurança","🏊":"Piscina","📶":"WiFi","🌊":"Lago","🔥":"Fogueira","🏪":"Mercado"};

// ─── CSS ─────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#06090D;--bg1:#0C1117;--bg2:#121921;--bg3:#1A2230;
  --ac:#F97316;--ac2:#EA580C;--aca:rgba(249,115,22,.10);--acb:rgba(249,115,22,.20);
  --g:#22C55E;--ga:rgba(34,197,94,.10);
  --b:#3B82F6;--ba:rgba(59,130,246,.10);
  --p:#A855F7;--pa:rgba(168,85,247,.10);
  --y:#EAB308;--ya:rgba(234,179,8,.10);
  --r:#EF4444;
  --t1:#EFF2F6;--t2:#8899AB;--t3:#4A5B6D;
  --bd:rgba(255,255,255,.05);--bd2:rgba(255,255,255,.09);
  --R:16px;--Rs:10px;--Rx:6px;
  --f:'Instrument Sans',system-ui,sans-serif;
  --fd:'Fraunces',Georgia,serif;
}
body,#root{font-family:var(--f);background:var(--bg);color:var(--t1);min-height:100vh;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.app{display:flex;flex-direction:column;min-height:100vh}

/* HEADER */
.hd{padding:11px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd);background:rgba(6,9,13,.94);backdrop-filter:blur(20px);position:sticky;top:0;z-index:90}
.lg{display:flex;align-items:center;gap:9px}
.lg-i{width:30px;height:30px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(249,115,22,.2)}
.lg-t{font-family:var(--fd);font-size:17px;font-weight:800;letter-spacing:-.3px}
.hd-tag{font-size:8px;font-weight:700;padding:2px 6px;background:var(--aca);color:var(--ac);border-radius:10px;letter-spacing:1.5px;text-transform:uppercase}

/* BOTTOM NAV — 5 tabs */
.nav{position:fixed;bottom:0;left:0;right:0;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(6,9,13,.96);backdrop-filter:blur(20px);border-top:1px solid var(--bd);z-index:90;padding:6px 0 calc(6px + env(safe-area-inset-bottom))}
.ni{display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 4px;border:none;background:none;color:var(--t3);font-family:var(--f);cursor:pointer;transition:color .15s;position:relative}
.ni.on{color:var(--ac)}
.ni.on::after{content:'';position:absolute;top:-6px;width:18px;height:2.5px;background:var(--ac);border-radius:0 0 3px 3px}
.ni .ic{font-size:16px;line-height:1}
.ni .lb{font-size:9px;font-weight:600;letter-spacing:.3px}

/* MAIN */
.mn{flex:1;padding:16px 16px 88px;max-width:540px;margin:0 auto;width:100%}

/* CARD */
.c{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--R);padding:18px;margin-bottom:14px;transition:border-color .15s}
.c:hover{border-color:var(--bd2)}
.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.ct{font-family:var(--fd);font-size:17px;font-weight:700}
.cs{font-size:11px;color:var(--t2);margin-top:1px}

/* HERO */
.hero{position:relative;padding:34px 22px;border-radius:var(--R);margin-bottom:18px;overflow:hidden;background:linear-gradient(160deg,#0E1520 0%,#0A0E14 40%,#14110D 100%);border:1px solid var(--bd)}
.hero::before{content:'';position:absolute;top:-60%;right:-30%;width:320px;height:320px;background:radial-gradient(circle,rgba(249,115,22,.08) 0%,transparent 60%);pointer-events:none}
.hero::after{content:'';position:absolute;bottom:-50%;left:-20%;width:260px;height:260px;background:radial-gradient(circle,rgba(59,130,246,.06) 0%,transparent 60%);pointer-events:none}
.hero-t{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--ac);margin-bottom:14px;position:relative}
.hero h1{font-family:var(--fd);font-size:28px;font-weight:800;line-height:1.12;margin-bottom:10px;position:relative}
.hero p{font-size:13px;color:var(--t2);line-height:1.55;max-width:320px;position:relative}

/* BTN */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 18px;border:none;border-radius:var(--Rs);font-family:var(--f);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.bp{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 2px 10px rgba(249,115,22,.2)}
.bp:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,.3)}
.bg{background:var(--bg2);color:var(--t2);border:1px solid var(--bd)}
.bg:hover{border-color:var(--bd2);color:var(--t1)}
.bs{padding:7px 12px;font-size:11px}

/* METRICS */
.ms{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.m{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--Rs);padding:12px 8px;text-align:center}
.mv{font-family:var(--fd);font-size:18px;font-weight:700}
.ml{font-size:9px;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-top:1px}

/* FORM */
.fg{margin-bottom:12px}
.fl{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;display:block}
.fi{width:100%;padding:10px 12px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--Rs);color:var(--t1);font-family:var(--f);font-size:13px;outline:none;transition:border-color .15s}
.fi:focus{border-color:var(--ac)}
.fi::placeholder{color:var(--t3)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* PROFILES */
.pf-g{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pf{padding:14px 6px;background:var(--bg2);border:2px solid var(--bd);border-radius:var(--Rs);text-align:center;cursor:pointer;transition:all .15s}
.pf:hover{border-color:var(--bd2)}
.pf.on{border-color:var(--ac);background:var(--aca)}
.pf .pi{font-size:20px;margin-bottom:2px}
.pf .pl{font-size:11px;font-weight:600}
.pf .pd{font-size:8px;color:var(--t3);margin-top:2px;line-height:1.3}

/* MAP */
.map-w{width:100%;height:320px;border-radius:var(--R);overflow:hidden;position:relative;background:var(--bg2);border:1px solid var(--bd);margin-bottom:14px}
.map-svg{width:100%;height:100%}
.map-leg{position:absolute;bottom:8px;left:8px;background:rgba(6,9,13,.92);backdrop-filter:blur(10px);border-radius:var(--Rs);padding:6px 10px;display:flex;gap:10px;font-size:9px;border:1px solid var(--bd)}
.leg-i{display:flex;align-items:center;gap:3px;color:var(--t2)}
.leg-d{width:6px;height:6px;border-radius:50%}

/* TIMELINE STOP CARD */
.stop{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--R);margin-bottom:10px;overflow:hidden;transition:border-color .15s}
.stop:hover{border-color:var(--bd2)}
.stop-top{padding:14px 16px;cursor:pointer}
.stop-row{display:flex;justify-content:space-between;align-items:flex-start}
.stop-name{font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px}
.stop-day{font-size:10px;color:var(--t3);background:var(--bg2);padding:2px 7px;border-radius:4px}
.stop-notes{font-size:11px;color:var(--t2);margin-top:4px}
.stop-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.stop-tag{font-size:8px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:2px 6px;border-radius:3px}
.stop-wx{display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 10px;background:var(--bg2);border-radius:var(--Rs)}
.stop-wx-icon{font-size:22px}
.stop-wx-temp{font-family:var(--fd);font-size:20px;font-weight:700}
.stop-wx-info{flex:1}
.stop-wx-cond{font-size:10px;color:var(--t2)}
.stop-wx-range{font-size:10px;color:var(--t3)}
.stop-wx-wind{font-size:10px;color:var(--t3);text-align:right}
.stop-expand{padding:0 16px 14px}
.stop-section{margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)}
.stop-section-t{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}

/* TOURISM INLINE */
.tour-i{display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg2);border-radius:var(--Rs);margin-bottom:4px;border:1px solid var(--bd)}
.tour-i-name{font-size:12px;font-weight:600;flex:1}
.tour-i-meta{font-size:10px;color:var(--t2);display:flex;gap:6px}

/* CAMPING INLINE */
.camp-i{padding:10px;background:var(--bg2);border-radius:var(--Rs);border:1px solid var(--bd)}
.camp-i-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.camp-i-name{font-size:12px;font-weight:600}
.camp-i-price{font-size:12px;font-weight:700;color:var(--g)}
.camp-i-am{display:flex;gap:4px;margin:4px 0}
.camp-i-am span{font-size:9px;padding:2px 6px;background:var(--bg);border-radius:8px;color:var(--t2)}
.camp-i-review{font-size:10px;color:var(--t2);font-style:italic;margin-top:4px;padding-left:8px;border-left:2px solid var(--ac)}
.camp-i-foot{display:flex;gap:8px;font-size:9px;color:var(--t3);margin-top:6px}

/* EXPLORE PAGE */
.exp-card{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--R);padding:14px;margin-bottom:10px;transition:border-color .15s}
.exp-card:hover{border-color:var(--bd2)}
.exp-h{display:flex;justify-content:space-between;align-items:flex-start}
.exp-name{font-weight:700;font-size:14px}
.exp-city{font-size:10px;color:var(--t2);margin-top:1px}
.exp-badge{font-size:8px;font-weight:700;padding:2px 7px;border-radius:3px;letter-spacing:.3px;text-transform:uppercase}
.exp-desc{font-size:11px;color:var(--t2);line-height:1.4;margin:6px 0}
.exp-tags{display:flex;gap:4px;flex-wrap:wrap}
.exp-tag{font-size:9px;padding:3px 7px;background:var(--bg2);border-radius:8px;color:var(--t2)}
.exp-tag.free{background:var(--ga);color:var(--g)}
.exp-review{font-size:10px;color:var(--t2);font-style:italic;margin:6px 0;padding:6px 8px;background:var(--bg2);border-radius:var(--Rs);border-left:2px solid var(--ac)}

/* TABS */
.tabs{display:flex;gap:4px;margin-bottom:12px;overflow-x:auto;padding-bottom:2px;-ms-overflow-style:none;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:7px 12px;background:var(--bg2);border:1px solid var(--bd);border-radius:14px;font-size:11px;font-weight:500;color:var(--t2);cursor:pointer;white-space:nowrap;font-family:var(--f);transition:all .15s}
.tab.on{background:var(--aca);border-color:var(--ac);color:var(--ac)}

/* EXPENSE ROW */
.ex{display:flex;align-items:center;gap:10px;padding:9px;border-radius:var(--Rs);background:var(--bg2);margin-bottom:4px;border:1px solid var(--bd)}
.ex-ic{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.ex-inf{flex:1;min-width:0}
.ex-d{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-m{font-size:10px;color:var(--t3);margin-top:1px}
.ex-a{font-weight:700;font-size:13px}

/* BUDGET */
.bb{width:100%;height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;margin:8px 0}
.bf{height:100%;border-radius:3px;transition:width .4s}
.cb-r{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.cb-l{font-size:10px;width:84px;color:var(--t2);display:flex;align-items:center;gap:4px}
.cb-bg{flex:1;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden}
.cb-f{height:100%;border-radius:2px}
.cb-a{font-size:10px;font-weight:700;width:68px;text-align:right}

/* CURRENCY */
.cur-sel{flex:1;padding:9px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--Rs);color:var(--t1);font-family:var(--f);font-size:12px;outline:none;appearance:none;cursor:pointer}
.cur-sel:focus{border-color:var(--ac)}
.cur-swap{width:34px;height:34px;border-radius:50%;background:var(--aca);border:1px solid var(--acb);color:var(--ac);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--f);transition:all .15s}
.cur-swap:hover{background:var(--ac);color:#fff}

/* SIMULATOR */
.sim-r{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd)}
.sim-l{font-size:11px;color:var(--t2)}
.sim-v{font-weight:700;font-size:13px}
.sim-in{width:68px;padding:5px 8px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--Rx);color:var(--t1);font-family:var(--f);font-size:12px;text-align:right;outline:none}
.sim-in:focus{border-color:var(--ac)}

/* CHECKLIST */
.ck-i{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--Rs);cursor:pointer;transition:background .1s}
.ck-i:hover{background:var(--bg2)}
.ck-b{width:18px;height:18px;border-radius:4px;border:2px solid var(--bd2);display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.ck-b.on{background:var(--g);border-color:var(--g)}
.ck-t{font-size:12px}.ck-t.on{text-decoration:line-through;color:var(--t3)}

/* ALERT */
.al{display:flex;align-items:center;gap:6px;padding:9px 12px;border-radius:var(--Rs);font-size:10px;margin-bottom:12px;line-height:1.4}
.al.w{background:var(--ya);border:1px solid rgba(234,179,8,.15);color:var(--y)}
.al.i{background:var(--ba);border:1px solid rgba(59,130,246,.15);color:var(--b)}
.al.ok{background:var(--ga);border:1px solid rgba(34,197,94,.15);color:var(--g)}
.al.d{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);color:var(--r)}

/* ROUTE CARD */
.rc{display:flex;align-items:center;gap:10px;padding:11px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--Rs);margin-bottom:6px;cursor:pointer;transition:all .15s}
.rc:hover{border-color:var(--bd2)}
.rc-tag{font-size:8px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:3px 7px;border-radius:3px;white-space:nowrap}
.rc-inf{flex:1}
.rc-n{font-weight:600;font-size:13px}
.rc-m{font-size:10px;color:var(--t3);margin-top:1px}

/* SECTION TITLES */
.st{font-family:var(--fd);font-size:20px;font-weight:700;margin-bottom:12px}
.ss{font-size:12px;color:var(--t2);margin-bottom:16px;margin-top:-6px}

/* COMPARE */
.cmp-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cmp{padding:12px;border-radius:var(--Rs);border:1px solid var(--bd)}
.cmp.eco{background:rgba(34,197,94,.03);border-color:rgba(34,197,94,.12)}
.cmp.cmf{background:rgba(168,85,247,.03);border-color:rgba(168,85,247,.12)}
.cmp-t{font-weight:700;font-size:12px;margin-bottom:6px;display:flex;align-items:center;gap:4px}
.cmp-r{display:flex;justify-content:space-between;padding:4px 0;font-size:10px;border-bottom:1px solid var(--bd)}
.cmp-r:last-child{border:none;font-weight:700;font-size:12px;padding-top:6px}

/* ─── FAB AI CHAT ─── */
.fab{position:fixed;bottom:76px;right:16px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--ac2));border:none;color:#fff;font-size:22px;cursor:pointer;z-index:95;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(249,115,22,.3);transition:all .2s}
.fab:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(249,115,22,.4)}
.fab.open{border-radius:14px;width:50px;height:50px}

.chat-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);z-index:96;opacity:0;pointer-events:none;transition:opacity .25s}
.chat-overlay.open{opacity:1;pointer-events:auto}

.chat-panel{position:fixed;bottom:0;left:0;right:0;max-height:75vh;background:var(--bg1);border-top:1px solid var(--bd);border-radius:var(--R) var(--R) 0 0;z-index:97;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,.32,1);display:flex;flex-direction:column}
.chat-panel.open{transform:translateY(0)}

.chat-hd{padding:12px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}
.chat-hd-t{font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px}
.chat-close{width:28px;height:28px;border-radius:50%;background:var(--bg2);border:1px solid var(--bd);color:var(--t2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--f)}

.chat-body{flex:1;overflow-y:auto;padding:12px 16px;max-height:calc(75vh - 110px)}
.ch-m{margin-bottom:8px;display:flex;gap:8px}
.ch-m.u{flex-direction:row-reverse}
.ch-av{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.ch-av.ai{background:var(--aca)}
.ch-av.us{background:var(--ba)}
.ch-bub{max-width:80%;padding:9px 13px;border-radius:12px;font-size:12px;line-height:1.45}
.ch-m.ai .ch-bub{background:var(--bg2);border:1px solid var(--bd);border-top-left-radius:3px}
.ch-m.u .ch-bub{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-top-right-radius:3px}

.chat-ft{padding:10px 16px;border-top:1px solid var(--bd);display:flex;gap:6px}
.chat-in{flex:1;padding:9px 12px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--Rs);color:var(--t1);font-family:var(--f);font-size:12px;outline:none}
.chat-in:focus{border-color:var(--ac)}
.chat-in::placeholder{color:var(--t3)}
.chat-sn{width:38px;height:38px;border-radius:var(--Rs);background:linear-gradient(135deg,var(--ac),var(--ac2));border:none;color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.qa{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.qb{padding:5px 9px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;color:var(--t2);font-size:10px;cursor:pointer;font-family:var(--f);transition:all .15s}
.qb:hover{border-color:var(--ac);color:var(--ac)}

/* ANIM */
@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu .3s ease forwards}
.f1{animation-delay:.03s;opacity:0}.f2{animation-delay:.06s;opacity:0}.f3{animation-delay:.09s;opacity:0}.f4{animation-delay:.12s;opacity:0}
@keyframes dot{0%,100%{opacity:.3}50%{opacity:1}}
.td{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--t3);margin:0 2px;animation:dot 1s infinite}
.td:nth-child(2){animation-delay:.15s}.td:nth-child(3){animation-delay:.3s}

@keyframes fabPulse{0%,100%{box-shadow:0 4px 20px rgba(249,115,22,.3)}50%{box-shadow:0 4px 30px rgba(249,115,22,.5)}}
.fab:not(.open){animation:fabPulse 3s ease infinite}

::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
`;

// ─── WEATHER SERVICE (Open-Meteo — free, no API key) ─────────────────
const WMO_CODES = {
  0:{icon:"☀️",cond:"Céu limpo"},1:{icon:"🌤️",cond:"Quase limpo"},2:{icon:"⛅",cond:"Parcial nublado"},3:{icon:"☁️",cond:"Nublado"},
  45:{icon:"🌫️",cond:"Neblina"},48:{icon:"🌫️",cond:"Neblina gelada"},
  51:{icon:"🌦️",cond:"Garoa leve"},53:{icon:"🌦️",cond:"Garoa"},55:{icon:"🌧️",cond:"Garoa forte"},
  61:{icon:"🌧️",cond:"Chuva leve"},63:{icon:"🌧️",cond:"Chuva"},65:{icon:"🌧️",cond:"Chuva forte"},
  66:{icon:"🌧️",cond:"Chuva congelante"},67:{icon:"🌧️",cond:"Chuva congelante forte"},
  71:{icon:"🌨️",cond:"Neve leve"},73:{icon:"❄️",cond:"Neve"},75:{icon:"❄️",cond:"Neve forte"},77:{icon:"❄️",cond:"Granizo neve"},
  80:{icon:"🌦️",cond:"Pancadas leves"},81:{icon:"🌧️",cond:"Pancadas"},82:{icon:"⛈️",cond:"Pancadas fortes"},
  85:{icon:"🌨️",cond:"Neve com pancadas"},86:{icon:"❄️",cond:"Neve forte"},
  95:{icon:"⛈️",cond:"Tempestade"},96:{icon:"⛈️",cond:"Tempestade c/ granizo"},99:{icon:"⛈️",cond:"Tempestade forte"},
};

async function fetchWeatherForStops(stops) {
  const results = {};
  const promises = stops.map(async (stop) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${stop.lat}&longitude=${stop.lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      const code = data.current?.weather_code ?? 0;
      const wmo = WMO_CODES[code] || {icon:"🌡️",cond:"--"};
      results[stop.id] = {
        temp: Math.round(data.current?.temperature_2m ?? 0),
        icon: wmo.icon,
        cond: wmo.cond,
        wind: Math.round(data.current?.wind_speed_10m ?? 0),
        hi: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
        lo: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
        live: true,
      };
    } catch (e) {
      results[stop.id] = null;
    }
  });
  await Promise.all(promises);
  return results;
}

// ─── SVG MAP ─────────────────────────────────────────────────────────
function MapViz({ stops }) {
  const lats = stops.map(s=>s.lat), lngs = stops.map(s=>s.lng);
  const pad = 2;
  const mn = { lat: Math.min(...lats)-pad, lng: Math.min(...lngs)-pad };
  const mx = { lat: Math.max(...lats)+pad, lng: Math.max(...lngs)+pad };
  const proj = (lat,lng) => ({ x:((lng-mn.lng)/(mx.lng-mn.lng))*480+30, y:((mx.lat-lat)/(mx.lat-mn.lat))*280+20 });
  const pts = stops.map(s=>proj(s.lat,s.lng));
  const d = pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
  const tc = t=>({origin:'#22C55E',destination:'#F97316',camping:'#3B82F6',border:'#EAB308',stop:'#A855F7',city:'#8899AB'}[t]||'#8899AB');
  return (
    <div className="map-w">
      <svg className="map-svg" viewBox="0 0 540 320">
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22C55E"/><stop offset="50%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#F97316"/></linearGradient>
          <filter id="gl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {Array.from({length:7},(_,i)=><line key={`h${i}`} x1="0" y1={i*50} x2="540" y2={i*50} stroke="rgba(255,255,255,.015)"/>)}
        {Array.from({length:11},(_,i)=><line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="320" stroke="rgba(255,255,255,.015)"/>)}
        <path d={d} fill="none" stroke="rgba(59,130,246,.08)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={d} fill="none" stroke="url(#rg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" filter="url(#gl)"/>
        {stops.map((s,i)=>{const p=pts[i],c=tc(s.type),k=s.type==='origin'||s.type==='destination';return(
          <g key={s.id}><circle cx={p.x} cy={p.y} r={k?9:6} fill={c} opacity=".08"/><circle cx={p.x} cy={p.y} r={k?5:3.5} fill="var(--bg)" stroke={c} strokeWidth="1.5"/>{k&&<circle cx={p.x} cy={p.y} r={2} fill={c}/>}<text x={p.x+(i%2===0?8:-8)} y={p.y+(i<stops.length/2?-7:10)} fill="#8899AB" fontSize="7.5" fontFamily="Instrument Sans" textAnchor={i%2===0?"start":"end"}>{s.name}</text></g>
        )})}
      </svg>
      <div className="map-leg">
        <div className="leg-i"><div className="leg-d" style={{background:'#22C55E'}}/> Origem</div>
        <div className="leg-i"><div className="leg-d" style={{background:'#3B82F6'}}/> Camping</div>
        <div className="leg-i"><div className="leg-d" style={{background:'#EAB308'}}/> Fronteira</div>
        <div className="leg-i"><div className="leg-d" style={{background:'#F97316'}}/> Destino</div>
      </div>
    </div>
  );
}

// ─── STOP CARD (contextual weather + tourism + camping) ──────────────
function StopCard({ stop, isOpen, onToggle }) {
  const tc = t=>({origin:'var(--ga)',destination:'var(--aca)',camping:'var(--ba)',border:'var(--ya)',stop:'var(--pa)',city:'rgba(255,255,255,.04)'}[t]);
  const tcc = t=>({origin:'var(--g)',destination:'var(--ac)',camping:'var(--b)',border:'var(--y)',stop:'var(--p)',city:'var(--t2)'}[t]);
  const w = stop.weather;

  return (
    <div className="stop">
      <div className="stop-top" onClick={onToggle}>
        <div className="stop-row">
          <div className="stop-name">
            <span className="stop-tag" style={{background:tc(stop.type),color:tcc(stop.type)}}>{stop.type}</span>
            {stop.name}
          </div>
          <div className="stop-day">Dia {stop.day}{stop.hours>0?` · ${stop.hours}h 🚗`:''}</div>
        </div>
        <div className="stop-notes">{stop.notes}</div>

        {/* CONTEXTUAL WEATHER — always visible */}
        {w && (
          <div className="stop-wx">
            <div className="stop-wx-icon">{w.icon}</div>
            <div>
              <div className="stop-wx-temp">{w.temp}°</div>
              <div className="stop-wx-cond">{w.cond}{w.live ? ' 🟢' : ''}</div>
            </div>
            <div className="stop-wx-info"/>
            <div>
              <div className="stop-wx-range">↑{w.hi}° ↓{w.lo}°</div>
              <div className="stop-wx-wind">💨 {w.wind} km/h</div>
            </div>
          </div>
        )}
        {!w && (
          <div className="stop-wx" style={{justifyContent:'center',opacity:.5}}>
            <div style={{fontSize:11,color:'var(--t2)'}}>🌡️ Carregando clima...</div>
          </div>
        )}

        {/* Weather alerts */}
        {w && w.temp <= 5 && <div className="al d" style={{marginTop:6,marginBottom:0}}>❄️ Temp. muito baixa — verifique saco de dormir e roupas térmicas</div>}
        {w && w.wind >= 30 && <div className="al w" style={{marginTop:6,marginBottom:0}}>💨 Ventos fortes — cuidado em estradas de montanha</div>}
        {w && w.cond.includes('Neve') && <div className="al d" style={{marginTop:6,marginBottom:0}}>❄️ Neve prevista — correntes obrigatórias na Argentina</div>}
      </div>

      {/* EXPANDED: Tourism + Camping */}
      {isOpen && (
        <div className="stop-expand">
          {stop.tourism && stop.tourism.length > 0 && (
            <div className="stop-section">
              <div className="stop-section-t">🏛️ O que fazer aqui</div>
              {stop.tourism.map((t,i) => (
                <div className="tour-i" key={i}>
                  <div className="tour-i-name">{t.name}</div>
                  <div className="tour-i-meta">
                    <span>⏱ {t.time}</span>
                    {t.free ? <span style={{color:'var(--g)'}}>Grátis</span> : <span>{t.price}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {stop.camping && (
            <div className="stop-section">
              <div className="stop-section-t">🏕️ Camping — iOverlander</div>
              <div className="camp-i">
                <div className="camp-i-h">
                  <div className="camp-i-name">{stop.camping.name}</div>
                  <div className="camp-i-price">{stop.camping.price}</div>
                </div>
                <div className="camp-i-am">
                  {stop.camping.amenities.map((a,i) => <span key={i}>{a} {AMENITY_NAMES[a]}</span>)}
                </div>
                <div className="camp-i-review">"{stop.camping.review}"</div>
                <div className="camp-i-foot">
                  <span>⭐ {stop.camping.rating}</span>
                  <span>💬 {stop.camping.reviews} reviews</span>
                  <span style={{color:'var(--g)'}}>✓ iOverlander</span>
                </div>
              </div>
            </div>
          )}

          {!stop.tourism?.length && !stop.camping && (
            <div style={{fontSize:11,color:'var(--t3)',padding:'8px 0'}}>Nenhuma informação adicional para esta parada.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PAGES ───────────────────────────────────────────────────────────

function HomePage({ go }) {
  const tot = TRIP.expenses.reduce((s,e)=>s+e.amt,0);
  return (
    <div>
      <div className="hero fu">
        <div className="hero-t">RoadTrip Planner AI</div>
        <h1>Sua próxima<br/>aventura<br/>começa aqui.</h1>
        <p>Rotas, clima, camping, pontos turísticos, câmbio e IA — tudo num lugar só.</p>
        <div style={{display:'flex',gap:8,marginTop:16,position:'relative'}}>
          <button className="btn bp" onClick={()=>go('route')}>Planejar rota</button>
          <button className="btn bg" onClick={()=>go('explore')}>Explorar</button>
        </div>
      </div>

      <div className="ms fu f1">
        <div className="m"><div className="mv" style={{color:'var(--ac)'}}>2.180</div><div className="ml">Km</div></div>
        <div className="m"><div className="mv" style={{color:'var(--b)'}}>12</div><div className="ml">Dias</div></div>
        <div className="m"><div className="mv" style={{color:'var(--g)',fontSize:16}}>R${(tot/1000).toFixed(1)}k</div><div className="ml">Total</div></div>
        <div className="m"><div className="mv" style={{color:'var(--p)',fontSize:16}}>R${Math.round(tot/4)}</div><div className="ml">/pessoa</div></div>
      </div>

      <div className="c fu f2">
        <div className="ch"><div><div className="ct">Viagem ativa</div><div className="cs">Floripa → Bariloche · Econômico</div></div><button className="btn bs bg" onClick={()=>go('route')}>Roteiro →</button></div>
        <MapViz stops={TRIP.stops}/>
      </div>

      <div className="c fu f3">
        <div className="ct" style={{marginBottom:8}}>⚡ Eco vs Confort</div>
        <div className="cmp-g">
          <div className="cmp eco"><div className="cmp-t" style={{color:'var(--g)'}}>💚 Econômico</div><div className="cmp-r"><span>Hospedagem</span><span>R$ 445</span></div><div className="cmp-r"><span>Alimentação</span><span>R$ 1.520</span></div><div className="cmp-r"><span>Combustível</span><span>R$ 2.830</span></div><div className="cmp-r"><span style={{color:'var(--g)'}}>Total</span><span style={{color:'var(--g)'}}>R$ 5.495</span></div></div>
          <div className="cmp cmf"><div className="cmp-t" style={{color:'var(--p)'}}>💜 Confortável</div><div className="cmp-r"><span>Hospedagem</span><span>R$ 3.600</span></div><div className="cmp-r"><span>Alimentação</span><span>R$ 3.200</span></div><div className="cmp-r"><span>Combustível</span><span>R$ 2.830</span></div><div className="cmp-r"><span style={{color:'var(--p)'}}>Total</span><span style={{color:'var(--p)'}}>R$ 10.830</span></div></div>
        </div>
      </div>

      <div className="c fu f4">
        <div className="ct" style={{marginBottom:8}}>🗺️ Roteiros populares</div>
        {[{n:"Floripa → Bariloche",d:12,k:2180,tg:"Clássica",tc:"#F97316"},{n:"SP → Jericoacoara",d:10,k:3100,tg:"Nordeste",tc:"#3B82F6"},{n:"Curitiba → Atacama",d:15,k:4200,tg:"Épica",tc:"#A855F7"},{n:"POA → Gramado",d:4,k:600,tg:"Express",tc:"#22C55E"}].map((r,i)=>(
          <div className="rc" key={i}><div className="rc-tag" style={{background:`${r.tc}14`,color:r.tc}}>{r.tg}</div><div className="rc-inf"><div className="rc-n">{r.n}</div><div className="rc-m">{r.d} dias · {r.k.toLocaleString()} km</div></div><span style={{color:'var(--t3)'}}>→</span></div>
        ))}
      </div>
    </div>
  );
}

function RoutePage() {
  const [view, setView] = useState('timeline'); // 'plan' | 'timeline'
  const [profile, setProfile] = useState('economic');
  const [openStop, setOpenStop] = useState(null);
  const [generated, setGenerated] = useState(true);
  const [liveWeather, setLiveWeather] = useState({});

  useEffect(() => {
    fetchWeatherForStops(TRIP.stops).then(data => setLiveWeather(data));
  }, []);

  const stopsWithWeather = TRIP.stops.map(s => ({...s, weather: liveWeather[s.id] || s.weather}));

  return (
    <div>
      <div className="st fu">Roteiro</div>
      <div className="tabs fu f1">
        <button className={`tab ${view==='timeline'?'on':''}`} onClick={()=>setView('timeline')}>📍 Timeline</button>
        <button className={`tab ${view==='plan'?'on':''}`} onClick={()=>setView('plan')}>✏️ Planejar</button>
        <button className={`tab ${view==='map'?'on':''}`} onClick={()=>setView('map')}>🗺️ Mapa</button>
      </div>

      {view === 'plan' && (
        <>
          <div className="c fu f2">
            <div className="ct" style={{marginBottom:12}}>📍 Rota</div>
            <div className="fg"><label className="fl">Origem</label><input className="fi" defaultValue="Florianópolis, SC"/></div>
            <div className="fg"><label className="fl">Destino</label><input className="fi" defaultValue="San Carlos de Bariloche, ARG"/></div>
            <div className="fr"><div className="fg"><label className="fl">Dias</label><input type="number" className="fi" defaultValue={12}/></div><div className="fg"><label className="fl">Pessoas</label><input type="number" className="fi" defaultValue={4}/></div></div>
            <div className="fg"><label className="fl">Orçamento (R$)</label><input type="number" className="fi" defaultValue={8000}/></div>
          </div>
          <div className="c fu f3">
            <div className="ct" style={{marginBottom:8}}>🎯 Perfil</div>
            <div className="pf-g">{PROFILES.map(p=>(<div key={p.id} className={`pf ${profile===p.id?'on':''}`} onClick={()=>setProfile(p.id)}><div className="pi">{p.icon}</div><div className="pl">{p.label}</div><div className="pd">{p.desc}</div></div>))}</div>
          </div>
          <button className="btn bp" style={{width:'100%',padding:13,fontSize:14,marginBottom:12}} onClick={()=>{setGenerated(true);setView('timeline')}}>🤖 Gerar roteiro com IA</button>
        </>
      )}

      {view === 'map' && (
        <>
          <MapViz stops={stopsWithWeather}/>
          <div className="al i fu f2">Toque nas paradas na timeline para ver clima, turismo e camping em contexto.</div>
        </>
      )}

      {view === 'timeline' && (
        <>
          {generated && <div className="al ok fu f1">✅ Roteiro gerado — 12 dias, 9 paradas, 4.5h/dia. {Object.keys(liveWeather).length > 0 ? '🟢 Clima ao vivo via Open-Meteo' : '🔄 Carregando clima...'}</div>}
          <div className="ss" style={{marginTop:0}}>Floripa → Bariloche · {stopsWithWeather.length} paradas · Clima ao vivo + turismo + camping</div>
          {stopsWithWeather.map(s => (
            <StopCard key={s.id} stop={s} isOpen={openStop===s.id} onToggle={()=>setOpenStop(openStop===s.id?null:s.id)}/>
          ))}
        </>
      )}
    </div>
  );
}

function ExplorePage() {
  const [filter, setFilter] = useState('all');
  const filtered = filter==='all' ? EXPLORE_DATA : EXPLORE_DATA.filter(e=>e.cat===filter);

  return (
    <div>
      <div className="st fu">Explorar</div>
      <div className="ss fu">Camping, turismo e experiências ao longo da rota.</div>
      <div className="tabs fu f1">
        <button className={`tab ${filter==='all'?'on':''}`} onClick={()=>setFilter('all')}>Todos ({EXPLORE_DATA.length})</button>
        <button className={`tab ${filter==='camping'?'on':''}`} onClick={()=>setFilter('camping')}>🏕️ Camping ({EXPLORE_DATA.filter(e=>e.cat==='camping').length})</button>
        <button className={`tab ${filter==='tourism'?'on':''}`} onClick={()=>setFilter('tourism')}>🏛️ Turismo ({EXPLORE_DATA.filter(e=>e.cat==='tourism').length})</button>
      </div>

      {filtered.map(item => (
        <div className="exp-card fu f2" key={item.id}>
          <div className="exp-h">
            <div>
              <div className="exp-name">{item.name}</div>
              <div className="exp-city">📍 {item.city}</div>
            </div>
            <span className="exp-badge" style={{
              background: item.cat==='camping' ? 'var(--ba)' : 'var(--pa)',
              color: item.cat==='camping' ? 'var(--b)' : 'var(--p)',
            }}>{item.type}</span>
          </div>

          {item.desc && <div className="exp-desc">{item.desc}</div>}
          {item.review && <div className="exp-review">"{item.review}"</div>}

          <div className="exp-tags">
            <span className="exp-tag">⭐ {item.rating}</span>
            {item.reviews && <span className="exp-tag">💬 {item.reviews}</span>}
            {item.time && <span className="exp-tag">⏱ {item.time}</span>}
            {item.price && <span className="exp-tag">{item.price}</span>}
            {item.free && <span className="exp-tag free">Grátis</span>}
            {item.amenities && item.amenities.map((a,i)=><span className="exp-tag" key={i}>{a} {AMENITY_NAMES[a]}</span>)}
            {item.src && <span className="exp-tag" style={{color:'var(--g)'}}>✓ {item.src}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancePage() {
  const [tab, setTab] = useState('all');
  const [kml, setKml] = useState(10);
  const [ppl, setPpl] = useState(6.2);
  const [fromC, setFromC] = useState('BRL');
  const [toC, setToC] = useState('ARS');
  const [curAmt, setCurAmt] = useState(1000);
  const [rates, setRates] = useState(FALLBACK_RATES);

  useEffect(() => {
    fetchLiveRates().then(r => setRates(r));
  }, []);

  const filtered = tab==='all' ? TRIP.expenses : TRIP.expenses.filter(e=>e.cat===tab);
  const tot = TRIP.expenses.reduce((s,e)=>s+e.amt,0);
  const byCat = EXPENSE_CATS.map(c=>({...c,total:TRIP.expenses.filter(e=>e.cat===c.id).reduce((s,e)=>s+e.amt,0)}));
  const mxCat = Math.max(...byCat.map(c=>c.total));
  const liters = (TRIP.km*2)/kml;
  const fuelCost = liters*ppl;

  const conv = (a,f,t) => (a/rates[f])*rates[t];
  const curResult = conv(curAmt, fromC, toC);
  const curRate = conv(1, fromC, toC);

  return (
    <div>
      <div className="st fu">Financeiro</div>
      {rates._live && <div className="al ok fu" style={{marginBottom:10}}>🟢 Câmbio ao vivo — atualizado via ExchangeRate API</div>}
      {!rates._live && <div className="al w fu" style={{marginBottom:10}}>⚠️ Câmbio offline — usando taxas estimadas</div>}

      <div className="ms fu f1">
        <div className="m"><div className="mv" style={{color:'var(--g)',fontSize:16}}>R${tot.toLocaleString()}</div><div className="ml">Total</div></div>
        <div className="m"><div className="mv" style={{color:'var(--b)',fontSize:16}}>R${Math.round(tot/4)}</div><div className="ml">/pessoa</div></div>
        <div className="m"><div className="mv" style={{color:'var(--p)',fontSize:16}}>R${Math.round(tot/12)}</div><div className="ml">/dia</div></div>
        <div className="m"><div className="mv" style={{color:tot>TRIP.budget?'var(--r)':'var(--g)',fontSize:16}}>{tot<=TRIP.budget?'✓':'⚠'}</div><div className="ml">{tot<=TRIP.budget?'OK':'Estourou'}</div></div>
      </div>

      {/* BUDGET */}
      <div className="c fu f2">
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
          <span style={{color:'var(--t2)'}}>Orçamento</span>
          <span style={{fontWeight:700}}>R$ {tot.toLocaleString()} <span style={{color:'var(--t3)',fontWeight:400}}>/ {TRIP.budget.toLocaleString()}</span></span>
        </div>
        <div className="bb"><div className="bf" style={{width:`${Math.min(tot/TRIP.budget*100,100)}%`,background:tot>TRIP.budget?'var(--r)':tot>TRIP.budget*.8?'var(--y)':'var(--g)'}}/></div>
        {byCat.filter(c=>c.total>0).map(c=>(
          <div className="cb-r" key={c.id}><div className="cb-l">{c.icon} {c.label}</div><div className="cb-bg"><div className="cb-f" style={{width:`${(c.total/mxCat)*100}%`,background:c.color}}/></div><div className="cb-a" style={{color:c.color}}>R$ {c.total.toLocaleString()}</div></div>
        ))}
      </div>

      {/* FUEL SIMULATOR */}
      <div className="c fu f3">
        <div className="ch"><div><div className="ct">⛽ Combustível</div><div className="cs">Ida + volta · {(TRIP.km*2).toLocaleString()} km</div></div></div>
        <div className="sim-r"><span className="sim-l">Consumo (km/l)</span><input type="number" className="sim-in" value={kml} onChange={e=>setKml(Number(e.target.value)||1)}/></div>
        <div className="sim-r"><span className="sim-l">Preço/litro (R$)</span><input type="number" className="sim-in" value={ppl} onChange={e=>setPpl(Number(e.target.value)||.01)} step="0.1"/></div>
        <div className="sim-r"><span className="sim-l">Litros</span><span className="sim-v">{liters.toFixed(0)} L</span></div>
        <div className="sim-r" style={{border:'none'}}><span className="sim-l" style={{fontWeight:700,color:'var(--t1)'}}>Total combustível</span><span className="sim-v" style={{color:'var(--ac)',fontSize:15}}>R$ {fuelCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}</span></div>
      </div>

      {/* CURRENCY CONVERTER */}
      <div className="c fu f4">
        <div className="ct" style={{marginBottom:10}}>💱 Conversor</div>
        <div className="fg"><input type="number" className="fi" value={curAmt} onChange={e=>setCurAmt(Number(e.target.value)||0)} style={{fontSize:18,fontWeight:700,textAlign:'center'}}/></div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
          <select className="cur-sel" value={fromC} onChange={e=>setFromC(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}</select>
          <button className="cur-swap" onClick={()=>{setFromC(toC);setToC(fromC)}}>⇆</button>
          <select className="cur-sel" value={toC} onChange={e=>setToC(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}</select>
        </div>
        <div style={{textAlign:'center',padding:14,background:'var(--bg2)',borderRadius:'var(--Rs)'}}>
          <div style={{fontSize:12,color:'var(--t2)'}}>{CURRENCIES.find(c=>c.code===fromC)?.flag} {curAmt.toLocaleString()} {fromC}</div>
          <div style={{fontFamily:'var(--fd)',fontSize:28,fontWeight:700,color:'var(--ac)',margin:'4px 0'}}>{CURRENCIES.find(c=>c.code===toC)?.flag} {curResult.toLocaleString('pt-BR',{maximumFractionDigits:2})} {toC}</div>
          <div style={{fontSize:10,color:'var(--t3)'}}>1 {fromC} = {curRate.toLocaleString('pt-BR',{maximumFractionDigits:2})} {toC}</div>
        </div>
        {/* Quick rates */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginTop:10}}>
          {CURRENCIES.filter(c=>c.code!=='BRL').slice(0,6).map(c=>(
            <div key={c.code} style={{textAlign:'center',padding:'8px 4px',background:'var(--bg2)',borderRadius:'var(--Rs)',border:'1px solid var(--bd)'}}>
              <div style={{fontSize:16}}>{c.flag}</div>
              <div style={{fontSize:9,fontWeight:600,color:'var(--t3)',marginTop:1}}>{c.code}</div>
              <div style={{fontSize:11,fontWeight:700,marginTop:1}}>{c.sym} {(1000*rates[c.code]).toLocaleString('pt-BR',{maximumFractionDigits:0})}</div>
            </div>
          ))}
        </div>
      </div>

      {/* EXPENSES LIST */}
      <div className="c">
        <div className="ch"><div className="ct">📋 Despesas</div><span style={{fontSize:10,color:'var(--t3)'}}>{filtered.length}</span></div>
        <div className="tabs"><button className={`tab ${tab==='all'?'on':''}`} onClick={()=>setTab('all')}>Todas</button>{EXPENSE_CATS.map(c=><button key={c.id} className={`tab ${tab===c.id?'on':''}`} onClick={()=>setTab(c.id)}>{c.icon}</button>)}</div>
        {filtered.map(e=>{const c=EXPENSE_CATS.find(cc=>cc.id===e.cat);return(
          <div className="ex" key={e.id}><div className="ex-ic" style={{background:`${c.color}14`}}>{c.icon}</div><div className="ex-inf"><div className="ex-d">{e.desc}</div><div className="ex-m">Dia {e.day}</div></div><div className="ex-a" style={{color:c.color}}>R$ {e.amt}</div></div>
        )})}
      </div>
    </div>
  );
}

function ChecklistPage() {
  const [ck, setCk] = useState(TRIP.checklist);
  const toggle = (g,id) => setCk(p=>({...p,[g]:p[g].map(i=>i.id===id?{...i,d:!i.d}:i)}));
  const groups = [{k:'docs',l:'Documentação',i:'📄'},{k:'camping',l:'Camping',i:'🏕️'},{k:'car',l:'Veículo',i:'🚗'},{k:'personal',l:'Pessoal',i:'🎒'}];
  const all = Object.values(ck).flat();
  const done = all.filter(i=>i.d).length;
  const pct = Math.round(done/all.length*100);

  return (
    <div>
      <div className="st fu">Checklist</div>
      <div className="c fu f1">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <span style={{fontWeight:600,fontSize:13}}>Progresso</span>
          <span style={{fontSize:14,fontWeight:700,color:pct===100?'var(--g)':'var(--ac)'}}>{pct}%</span>
        </div>
        <div className="bb"><div className="bf" style={{width:`${pct}%`,background:pct===100?'var(--g)':'linear-gradient(90deg,var(--ac),var(--ac2))'}}/></div>
        <div style={{fontSize:10,color:'var(--t2)'}}>{done}/{all.length} itens prontos</div>
      </div>
      <div className="al ok fu f2">📥 Disponível offline — salva no dispositivo.</div>
      {groups.map((g,gi)=>(
        <div className="c fu f3" key={g.k}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
            {g.i} {g.l} <span style={{fontWeight:400,fontSize:10}}>{ck[g.k].filter(i=>i.d).length}/{ck[g.k].length}</span>
          </div>
          {ck[g.k].map(item=>(
            <div className="ck-i" key={item.id} onClick={()=>toggle(g.k,item.id)}>
              <div className={`ck-b ${item.d?'on':''}`}>{item.d&&<span style={{fontSize:10,color:'#fff'}}>✓</span>}</div>
              <span className={`ck-t ${item.d?'on':''}`}>{item.t}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── FAB AI CHAT ─────────────────────────────────────────────────────
function FABChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{id:1,r:'ai',t:'Oi! 👋 Posso ajudar com paradas, orçamento, camping, clima ou roteiro. Pergunte qualquer coisa!'}]);
  const [inp, setInp] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  const qas = {
    'Parada daqui 2h':'Saindo de Mendoza, em ~2h: San Rafael. Posto YPF + Bodega Bianchi (degustação grátis). Adicionar ao roteiro?',
    'Dormir barato?':'🏕️ Camping Municipal Malargüe — ARS 5.000\n🚗 Estacionamento YPF San Rafael — grátis\n🏨 Hostel Confluencia — ARS 15.000\n\nRecomendo o camping pelo custo-benefício.',
    'Economizar':'1. Abasteça na Argentina (~50% mais barato)\n2. Pneus calibrados (+3-5% consumo)\n3. 100-110km/h constante\n4. Campings municipais\n\nEconomia estimada: ~R$ 400 só em combustível.',
    'Câmbio ARS':'Cotações estimadas:\n🇧🇷→🇦🇷 R$1 = ARS 220\nDica: troque em "cuevas" na Argentina pra taxa 10-15% melhor que o oficial.',
    'Neve Bariloche?':'❄️ Sim! Bariloche está com 6°C e neve leve. Obrigatório: correntes p/ neve, roupas em camadas, saco de dormir -5°C. Tá no checklist?',
  };

  const send = t => {
    if(!t.trim()) return;
    setMsgs(p=>[...p,{id:Date.now(),r:'u',t}]); setInp(''); setTyping(true);
    setTimeout(()=>{
      const resp = qas[t] || 'Boa pergunta! Analisando sua rota Floripa→Bariloche... Com perfil econômico, priorize postos YPF na Argentina e campings municipais com chuveiro. Quer que detalhe algo específico?';
      setMsgs(p=>[...p,{id:Date.now()+1,r:'ai',t:resp}]); setTyping(false);
    },1200);
  };

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,typing]);

  return (
    <>
      {/* FAB Button */}
      <button className={`fab ${open?'open':''}`} onClick={()=>setOpen(!open)}>{open?'✕':'🤖'}</button>

      {/* Overlay */}
      <div className={`chat-overlay ${open?'open':''}`} onClick={()=>setOpen(false)}/>

      {/* Panel */}
      <div className={`chat-panel ${open?'open':''}`}>
        <div className="chat-hd">
          <div className="chat-hd-t">🤖 AI Assistant</div>
          <button className="chat-close" onClick={()=>setOpen(false)}>✕</button>
        </div>

        <div style={{padding:'8px 16px 0'}}>
          <div className="qa">
            {Object.keys(qas).map(q=><button key={q} className="qb" onClick={()=>send(q)}>{q}</button>)}
          </div>
        </div>

        <div className="chat-body">
          {msgs.map(m=>(
            <div key={m.id} className={`ch-m ${m.r==='u'?'u':'ai'}`}>
              <div className={`ch-av ${m.r==='u'?'us':'ai'}`}>{m.r==='u'?'👤':'🤖'}</div>
              <div className="ch-bub" style={{whiteSpace:'pre-wrap'}}>{m.t}</div>
            </div>
          ))}
          {typing && <div className="ch-m ai"><div className="ch-av ai">🤖</div><div className="ch-bub"><span className="td"/><span className="td"/><span className="td"/></div></div>}
          <div ref={endRef}/>
        </div>

        <div className="chat-ft">
          <input className="chat-in" value={inp} onChange={e=>setInp(e.target.value)} placeholder="Pergunte sobre a viagem..." onKeyDown={e=>e.key==='Enter'&&send(inp)}/>
          <button className="chat-sn" onClick={()=>send(inp)}>↑</button>
        </div>
      </div>
    </>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('home');
  const pages = {
    home: <HomePage go={setTab}/>,
    route: <RoutePage/>,
    explore: <ExplorePage/>,
    finance: <FinancePage/>,
    checklist: <ChecklistPage/>,
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="hd">
          <div className="lg"><div className="lg-i">🛣️</div><div className="lg-t">RoadTrip AI</div></div>
          <div className="hd-tag">v3</div>
        </header>
        <main className="mn" key={tab}>{pages[tab]}</main>
        <nav className="nav">
          {TABS.map(t=><button key={t.id} className={`ni ${tab===t.id?'on':''}`} onClick={()=>setTab(t.id)}><span className="ic">{t.icon}</span><span className="lb">{t.label}</span></button>)}
        </nav>
        <FABChat/>
      </div>
    </>
  );
}
