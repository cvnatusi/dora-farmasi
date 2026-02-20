const STORAGE_KEY = "dora-farmasi-data-v1";

const initialData = {
  suppliers: [
    { id: crypto.randomUUID(), name: "PT Sehat Sentosa", phone: "021-555123", address: "Jakarta" },
    { id: crypto.randomUUID(), name: "CV Medika Jaya", phone: "022-888777", address: "Bandung" },
  ],
  purchases: [],
  sales: [],
  returns: [],
  opnames: [],
};

const state = loadData();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialData);
  return { ...structuredClone(initialData), ...JSON.parse(raw) };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getStockByItem() {
  const stock = {};
  const add = (item, qty) => {
    const key = item.trim().toLowerCase();
    if (!stock[key]) stock[key] = { item: item.trim(), qty: 0 };
    stock[key].qty += Number(qty || 0);
  };

  state.purchases.forEach((p) => add(p.item, p.qty));
  state.sales.forEach((s) => add(s.item, -s.qty));
  state.returns.forEach((r) => add(r.item, r.type === "pasien" ? r.qty : -r.qty));
  state.opnames.forEach((o) => {
    const key = o.item.trim().toLowerCase();
    if (!stock[key]) stock[key] = { item: o.item.trim(), qty: 0 };
    stock[key].qty = o.actualQty;
  });

  return Object.values(stock).sort((a, b) => a.item.localeCompare(b.item));
}

function findSupplierName(supplierId) {
  return state.suppliers.find((s) => s.id === supplierId)?.name || "-";
}

function renderMenu() {
  const items = [
    ["master-supplier", "Master Supplier"],
    ["pembelian-obat", "Pembelian"],
    ["stok-opname", "Stok Opname"],
    ["laporan-pembelian", "Laporan Pembelian"],
    ["laporan-penjualan", "Laporan Penjualan"],
    ["retur-obat", "Retur"],
    ["stok-realtime", "Stok Realtime"],
  ];

  const menu = document.getElementById("menu");
  menu.innerHTML = items
    .map(([id, label]) => `<button data-target="${id}">${label}</button>`)
    .join("");

  menu.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderSuppliers() {
  document.getElementById("supplier-table").innerHTML = state.suppliers
    .map((s) => `<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.address}</td></tr>`)
    .join("");

  const supplierOptions =
    '<option value="">Pilih supplier</option>' +
    state.suppliers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");

  document.querySelector('select[name="supplierId"]').innerHTML = supplierOptions;
  document.getElementById("purchase-supplier-filter").innerHTML =
    '<option value="">Semua supplier</option>' + supplierOptions;
}

function renderPurchases() {
  document.getElementById("purchase-table").innerHTML = state.purchases
    .slice()
    .reverse()
    .map(
      (p) =>
        `<tr><td>${p.date}</td><td>${findSupplierName(p.supplierId)}</td><td>${p.item}</td><td>${p.qty}</td><td>${formatCurrency(
          p.price
        )}</td><td>${formatCurrency(p.qty * p.price)}</td></tr>`
    )
    .join("");
  renderPurchaseReport();
}

function renderPurchaseReport() {
  const itemFilter = document.getElementById("purchase-item-filter").value.trim().toLowerCase();
  const supplierFilter = document.getElementById("purchase-supplier-filter").value;
  const periodFilter = document.getElementById("purchase-period-filter").value;

  const filtered = state.purchases.filter((p) => {
    const byItem = !itemFilter || p.item.toLowerCase().includes(itemFilter);
    const bySupplier = !supplierFilter || p.supplierId === supplierFilter;
    const byPeriod = !periodFilter || p.date.startsWith(periodFilter);
    return byItem && bySupplier && byPeriod;
  });

  document.getElementById("purchase-report-table").innerHTML = filtered
    .slice()
    .reverse()
    .map(
      (p) =>
        `<tr><td>${p.date}</td><td>${findSupplierName(p.supplierId)}</td><td>${p.item}</td><td>${p.qty}</td><td>${formatCurrency(
          p.qty * p.price
        )}</td></tr>`
    )
    .join("");
}

function renderSalesReport() {
  const itemFilter = document.getElementById("sales-item-filter").value.trim().toLowerCase();
  const periodFilter = document.getElementById("sales-period-filter").value;

  const filtered = state.sales.filter((s) => {
    const byItem = !itemFilter || s.item.toLowerCase().includes(itemFilter);
    const byPeriod = !periodFilter || s.date.startsWith(periodFilter);
    return byItem && byPeriod;
  });

  document.getElementById("sales-table").innerHTML = filtered
    .slice()
    .reverse()
    .map((s) => `<tr><td>${s.date}</td><td>${s.item}</td><td>${s.qty}</td><td>${formatCurrency(s.qty * s.price)}</td></tr>`)
    .join("");
}

function renderReturns() {
  document.getElementById("return-table").innerHTML = state.returns
    .slice()
    .reverse()
    .map(
      (r) =>
        `<tr><td>${r.date}</td><td>${r.type === "supplier" ? "Ke Supplier" : "Dari Pasien"}</td><td>${r.item}</td><td>${
          r.qty
        }</td><td>${r.party}</td></tr>`
    )
    .join("");
}

function renderOpnames() {
  document.getElementById("opname-table").innerHTML = state.opnames
    .slice()
    .reverse()
    .map(
      (o) =>
        `<tr><td>${o.date}</td><td>${o.item}</td><td>${o.systemQty}</td><td>${o.actualQty}</td><td>${o.actualQty -
          o.systemQty}</td><td><small class="muted">${o.note || "-"}</small></td></tr>`
    )
    .join("");
}

function renderStock() {
  const now = new Date().toLocaleString("id-ID");
  document.getElementById("stock-table").innerHTML = getStockByItem()
    .map((s) => `<tr><td>${s.item}</td><td>${s.qty}</td><td>${now}</td></tr>`)
    .join("");
}

function registerForms() {
  document.getElementById("supplier-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    state.suppliers.push({
      id: crypto.randomUUID(),
      name: form.get("name").trim(),
      phone: form.get("phone").trim(),
      address: form.get("address").trim(),
    });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById("purchase-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    state.purchases.push({
      date: form.get("date"),
      supplierId: form.get("supplierId"),
      item: form.get("item").trim(),
      qty: Number(form.get("qty")),
      price: Number(form.get("price")),
    });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById("sales-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    state.sales.push({
      date: form.get("date"),
      item: form.get("item").trim(),
      qty: Number(form.get("qty")),
      price: Number(form.get("price")),
    });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById("return-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    state.returns.push({
      date: form.get("date"),
      type: form.get("type"),
      item: form.get("item").trim(),
      qty: Number(form.get("qty")),
      party: form.get("party").trim(),
    });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById("opname-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const item = form.get("item").trim();
    const current = getStockByItem().find((s) => s.item.toLowerCase() === item.toLowerCase())?.qty || 0;
    state.opnames.push({
      date: form.get("date"),
      item,
      systemQty: current,
      actualQty: Number(form.get("actualQty")),
      note: form.get("note").trim(),
    });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById("apply-purchase-filter").addEventListener("click", renderPurchaseReport);
  document.getElementById("apply-sales-filter").addEventListener("click", renderSalesReport);
}

function persistAndRender() {
  saveData();
  renderSuppliers();
  renderPurchases();
  renderSalesReport();
  renderReturns();
  renderOpnames();
  renderStock();
}

renderMenu();
registerForms();
persistAndRender();
