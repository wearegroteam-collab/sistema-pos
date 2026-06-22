"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  BarChart3,
  CalendarDays,
  ChefHat,
  CreditCard,
  Eye,
  Home,
  LayoutDashboard,
  Link2,
  LogIn,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Utensils,
  X
} from "lucide-react";
import type {
  Addition,
  AppSettings,
  AuditEvent,
  Business,
  BusinessUser,
  CashShift,
  CashierPermissions,
  Category,
  KitchenSettings,
  Order,
  OrderItem,
  OrderItemAddition,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentMethodConfig,
  Product,
  ReceiptSettings,
  RestaurantTable,
  Role,
  TableStatus,
  Invitation
} from "@/lib/types";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { printService } from "@/lib/printing/printService";

const now = () => new Date().toISOString();
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
type MainTab = "dashboard" | "vender" | "ventas" | "menu" | "reportes" | "ajustes";
type SuperAdminTab = "businesses" | "invitations" | "checklist";
type BusinessFilter = "all" | "real" | "demo" | "active" | "inactive" | "deleted";
type MenuTab = "categorias" | "productos" | "adiciones" | "vinculos";
type SettingsTab = "negocio" | "recibo" | "comanda" | "pagos" | "usuarios" | "impresion" | "cobro";
type PrintMode = "comanda" | "precuenta" | "recibo" | "detalle" | null;
type DatePreset = "hoy" | "ayer" | "semana" | "mes" | "anio" | "rango";

const permissionLabels: Record<keyof CashierPermissions, string> = {
  viewTables: "Ver mesas",
  createOrders: "Puede crear ordenes",
  confirmKitchen: "Puede confirmar comandas",
  chargeOrders: "Puede cobrar",
  openShift: "Puede abrir turno",
  closeShift: "Puede cerrar turno",
  viewOrders: "Puede ver ordenes",
  applyDiscounts: "Puede aplicar descuentos",
  cancelOrders: "Puede cancelar ordenes",
  removeOrderItems: "Puede eliminar productos de una orden",
  editAfterKitchen: "Puede modificar productos despues de confirmar comanda",
  viewReports: "Puede ver reportes",
  modifyMenu: "Puede modificar menu",
  modifySettings: "Puede modificar ajustes"
};

const initialBusiness: Business = {
  id: "business-demo",
  name: "Mi Restaurante",
  commercialName: "Mi Restaurante",
  address: "Calle Principal #123",
  phone: "787-000-0000",
  email: "hola@mirestaurante.com",
  nit: "",
  status: "active",
  testMode: true,
  demo: true,
  onboardingCompleted: true,
  onboardingSkipped: false,
  currency: "COP",
  timezone: "America/Bogota"
};

const initialCategories: Category[] = [
  { id: "cat-1", businessId: "business-demo", name: "Burgers" },
  { id: "cat-2", businessId: "business-demo", name: "Tacos" },
  { id: "cat-3", businessId: "business-demo", name: "Bebidas" }
];

const initialProducts: Product[] = [
  { id: "prod-1", businessId: "business-demo", categoryId: "cat-1", name: "Burger clasica", price: 25000, description: "Carne, queso, lechuga", active: true },
  { id: "prod-2", businessId: "business-demo", categoryId: "cat-2", name: "Taco al pastor", price: 12000, description: "Cerdo, pina, cilantro", active: true },
  { id: "prod-3", businessId: "business-demo", categoryId: "cat-2", name: "Quesadilla", price: 18000, description: "Queso, tortilla, pico", active: true },
  { id: "prod-4", businessId: "business-demo", categoryId: "cat-3", name: "Agua fresca", price: 6000, description: "16 oz", active: true }
];

const initialAdditions: Addition[] = [
  { id: "add-1", businessId: "business-demo", name: "Extra queso", price: 3000, productIds: ["prod-1", "prod-3"] },
  { id: "add-2", businessId: "business-demo", name: "Tocineta", price: 5000, productIds: ["prod-1"] },
  { id: "add-3", businessId: "business-demo", name: "Papas", price: 6000, productIds: ["prod-1"] },
  { id: "add-4", businessId: "business-demo", name: "Salsa extra", price: 1000, productIds: ["prod-1", "prod-2", "prod-3"] }
];

const initialTables: RestaurantTable[] = [
  { id: "table-1", businessId: "business-demo", name: "Mesa 1", status: "libre", sortOrder: 1, x: 40, y: 40, width: 120, height: 90, shape: "rectangle", zone: "Salon" },
  { id: "table-2", businessId: "business-demo", name: "Mesa 2", status: "libre", sortOrder: 2, x: 210, y: 40, width: 92, height: 92, shape: "circle", zone: "Salon" },
  { id: "table-3", businessId: "business-demo", name: "Barra", status: "libre", sortOrder: 3, x: 40, y: 190, width: 230, height: 70, shape: "rectangle", zone: "Barra" },
  { id: "table-4", businessId: "business-demo", name: "Terraza", status: "libre", sortOrder: 4, x: 340, y: 150, width: 110, height: 110, shape: "square", zone: "Terraza" }
];

const superAdminPermissions: CashierPermissions = {
  viewTables: true,
  createOrders: true,
  confirmKitchen: true,
  chargeOrders: true,
  openShift: true,
  closeShift: true,
  viewOrders: true,
  applyDiscounts: true,
  cancelOrders: true,
  removeOrderItems: true,
  editAfterKitchen: true,
  viewReports: true,
  modifyMenu: true,
  modifySettings: true
};

const defaultCashierPermissions: CashierPermissions = {
  viewTables: true,
  createOrders: true,
  confirmKitchen: true,
  chargeOrders: true,
  openShift: true,
  closeShift: false,
  viewOrders: false,
  applyDiscounts: false,
  cancelOrders: false,
  removeOrderItems: true,
  editAfterKitchen: false,
  viewReports: false,
  modifyMenu: false,
  modifySettings: false
};

const initialBusinessUsers: BusinessUser[] = [];

const initialSettings: AppSettings = {
  receipt: {
    showLogo: true,
    businessName: "Mi Restaurante",
    nit: "",
    address: "Calle Principal #123",
    phone: "787-000-0000",
    footerMessage: "Gracias por tu compra",
    socialText: "@mirestaurante",
    showTip: true,
    showCashier: true,
    showOrderSource: true,
    showItemNotes: true,
    size: "80mm"
  },
  kitchen: {
    showBusinessName: true,
    showLogo: false,
    showTime: true,
    showOrderNumber: true,
    showOrderSource: true,
    showCashier: false,
    groupByCategory: false,
    highlightNotes: true,
    showAdditions: true,
    internalMessage: "",
    size: "80mm"
  },
  printing: {
    type: "browser",
    receiptPaperSize: "80mm",
    kitchenPaperSize: "80mm"
  },
  checkout: {
    tipEnabled: true,
    tipMode: "manual",
    suggestedTips: [0.05, 0.1, 0.15]
  },
  paymentMethods: [
    { id: "pay-1", name: "Efectivo", method: "efectivo", active: true },
    { id: "pay-2", name: "Tarjeta", method: "tarjeta", active: true },
    { id: "pay-3", name: "Transferencia", method: "transferencia", active: true },
    { id: "pay-4", name: "ATH", method: "ATH", active: true },
    { id: "pay-5", name: "Zelle", method: "Zelle", active: true },
    { id: "pay-6", name: "Otro", method: "otro", active: true }
  ],
  cashierPermissions: defaultCashierPermissions
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("es-CO", { timeZone: "America/Bogota" });
}

function audit(user: string, action: string, reason?: string): AuditEvent {
  return { id: createId("audit"), createdAt: now(), user, action, reason };
}

function itemUnitTotal(item: OrderItem) {
  return item.price + item.additions.reduce((sum, addition) => sum + addition.price, 0);
}

function calculateOrder(items: OrderItem[], tip: number) {
  const subtotal = items.reduce((sum, item) => sum + itemUnitTotal(item) * item.quantity, 0);
  return { subtotal, tip, total: subtotal + tip };
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getPresetRange(preset: DatePreset) {
  const today = startOfDay(new Date());
  if (preset === "ayer") {
    const day = new Date(today);
    day.setDate(day.getDate() - 1);
    return { from: toDateInput(day), to: toDateInput(day) };
  }
  if (preset === "semana") {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    return { from: toDateInput(start), to: toDateInput(today) };
  }
  if (preset === "mes") return { from: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), to: toDateInput(today) };
  if (preset === "anio") return { from: toDateInput(new Date(today.getFullYear(), 0, 1)), to: toDateInput(today) };
  return { from: toDateInput(today), to: toDateInput(today) };
}

function inDateRange(value: string, from?: string, to?: string) {
  const date = new Date(value);
  if (from && date < startOfDay(new Date(`${from}T00:00:00`))) return false;
  if (to && date > endOfDay(new Date(`${to}T00:00:00`))) return false;
  return true;
}

function normalizeOrders(orders: Order[]) {
  return orders.map((order) => ({
    ...order,
    status: String(order.status) === "en_cocina" ? "comandada" : order.status,
    cashier: order.cashier ?? "Sistema",
    audit: order.audit ?? [],
    items: order.items.map((item) => ({ ...item, additions: item.additions ?? [] }))
  }));
}

function normalizeTables(tables: RestaurantTable[]) {
  return tables.map((table, index) => ({
    ...table,
    sortOrder: table.sortOrder ?? index + 1,
    x: table.x ?? 40 + (index % 4) * 140,
    y: table.y ?? 40 + Math.floor(index / 4) * 130,
    width: table.width ?? 110,
    height: table.height ?? 90,
    shape: table.shape ?? "rectangle",
    zone: table.zone ?? "Salon"
  }));
}

function normalizeSettings(settings?: Partial<AppSettings>): AppSettings {
  return {
    ...initialSettings,
    ...settings,
    receipt: { ...initialSettings.receipt, ...settings?.receipt },
    kitchen: { ...initialSettings.kitchen, ...settings?.kitchen },
    printing: { ...initialSettings.printing, ...settings?.printing },
    checkout: { ...initialSettings.checkout, ...settings?.checkout },
    paymentMethods: settings?.paymentMethods ?? initialSettings.paymentMethods,
    cashierPermissions: { ...initialSettings.cashierPermissions, ...settings?.cashierPermissions }
  };
}

function normalizeBusiness(business: Partial<Business>): Business {
  const isDemo = business.demo ?? business.id === initialBusiness.id;
  return {
    ...initialBusiness,
    ...business,
    currency: "COP",
    timezone: "America/Bogota",
    onboardingCompleted: business.onboardingCompleted ?? isDemo,
    onboardingSkipped: business.onboardingSkipped ?? false
  };
}

function methodBucket(method?: PaymentMethod) {
  if (method === "efectivo") return "cash";
  if (method === "tarjeta") return "card";
  if (method === "transferencia" || method === "ATH" || method === "Zelle") return "transfer";
  return "other";
}

function getShiftSummary(shift: CashShift, orders: Order[]) {
  const paidOrders = orders.filter((order) => order.shiftId === shift.id && order.status === "pagada");
  const totals = paidOrders.reduce(
    (acc, order) => {
      const key = methodBucket(order.paymentMethod);
      acc[key] += order.total;
      acc.totalSales += order.total;
      return acc;
    },
    { cash: 0, card: 0, transfer: 0, other: 0, totalSales: 0 }
  );
  return {
    ...totals,
    expectedCash: shift.openingAmount + totals.cash,
    difference: 0
  };
}

function normalizeRole(role?: string | null): Role | null {
  if (role === "super_admin" || role === "admin" || role === "supervisor" || role === "cajero") return role;
  if (role === "cashier") return "cajero";
  return null;
}

function normalizePermissions(role: Role, permissions?: Partial<CashierPermissions> | null): CashierPermissions {
  if (role === "super_admin" || role === "admin" || role === "supervisor") return superAdminPermissions;
  return { ...defaultCashierPermissions, ...(permissions ?? {}) };
}

function mapBusinessRow(row: Record<string, unknown>): Business {
  return normalizeBusiness({
    id: String(row.id),
    name: String(row.name ?? "Negocio"),
    commercialName: String(row.commercial_name ?? row.name ?? "Negocio"),
    logoUrl: row.logo_url ? String(row.logo_url) : undefined,
    address: String(row.address ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    nit: row.nit ? String(row.nit) : "",
    status: row.status === "deleted" ? "deleted" : row.status === "inactive" ? "inactive" : "active",
    testMode: Boolean(row.test_mode),
    demo: Boolean(row.demo),
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingSkipped: Boolean(row.onboarding_skipped),
    createdAt: String(row.created_at ?? now()),
    lastActivityAt: row.last_activity_at ? String(row.last_activity_at) : undefined
  });
}

function mapBusinessUserRow(row: Record<string, unknown>, fallbackEmail: string): BusinessUser | null {
  const role = normalizeRole(String(row.role ?? ""));
  if (!role) return null;
  return {
    id: String(row.id),
    businessId: row.business_id ? String(row.business_id) : "system",
    userId: row.user_id ? String(row.user_id) : undefined,
    email: String(row.email ?? fallbackEmail).toLowerCase(),
    name: String(row.full_name ?? row.email ?? fallbackEmail),
    role,
    status: row.status === "inactive" ? "inactive" : "active",
    permissions: normalizePermissions(role, row.permissions as Partial<CashierPermissions> | null),
    forcePasswordChange: Boolean(row.force_password_change),
    createdAt: String(row.created_at ?? now())
  };
}

function mapInvitationRow(row: Record<string, unknown>): Invitation | null {
  const role = normalizeRole(String(row.role ?? ""));
  if (!role || !row.business_id) return null;
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    email: String(row.email ?? "").toLowerCase(),
    role,
    permissions: normalizePermissions(role, row.permissions as Partial<CashierPermissions> | null),
    status: row.status === "accepted" || row.status === "expired" ? row.status : "pending",
    invitedBy: row.invited_by ? String(row.invited_by) : "",
    createdAt: String(row.created_at ?? now())
  };
}

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: Response })?.context;
  if (context?.json) {
    try {
      const body = await context.json();
      const code = body?.code ? `${body.code}: ` : "";
      return `${code}${body?.error ?? body?.message ?? fallback}`;
    } catch {
      return (error as { message?: string })?.message ?? fallback;
    }
  }
  return (error as { message?: string })?.message ?? fallback;
}

async function postAdminApi(path: string, body: Record<string, unknown>) {
  if (!supabase) throw new Error("Supabase no esta configurado.");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sesion expirada.");
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Error en el servidor.");
  return payload;
}

function mapApiBusinessUser(row: Record<string, unknown>, fallbackEmail = ""): BusinessUser {
  return {
    id: String(row.id),
    businessId: String(row.businessId ?? row.business_id),
    userId: row.userId || row.user_id ? String(row.userId ?? row.user_id) : undefined,
    email: String(row.email ?? fallbackEmail).toLowerCase(),
    name: String(row.name ?? row.full_name ?? row.email ?? fallbackEmail),
    role: normalizeRole(String(row.role ?? "")) ?? "cajero",
    status: row.status === "inactive" ? "inactive" : "active",
    permissions: normalizePermissions((normalizeRole(String(row.role ?? "")) ?? "cajero"), row.permissions as Partial<CashierPermissions> | null),
    forcePasswordChange: Boolean(row.forcePasswordChange ?? row.force_password_change),
    createdAt: String(row.createdAt ?? row.created_at ?? now())
  };
}

export function PosApp() {
  const initialPath = typeof window === "undefined" ? "/" : window.location.pathname;
  const [businesses, setBusinesses] = useState<Business[]>([initialBusiness]);
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>(initialBusinessUsers);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState(initialBusiness.id);
  const [business, setBusiness] = useState<Business>(initialBusiness);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [additions, setAdditions] = useState<Addition[]>(initialAdditions);
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [tab, setTab] = useState<MainTab>(initialPath.includes("reports") ? "reportes" : initialPath.includes("orders") ? "ventas" : initialPath.includes("settings") || initialPath.includes("admin") ? "ajustes" : initialPath.includes("mesas") ? "vender" : "dashboard");
  const [role, setRole] = useState<Role>("admin");
  const [session, setSession] = useState<{ email: string; userId?: string } | null>(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [supportBusinessId, setSupportBusinessId] = useState<string | null>(null);

  const currentUser = session?.email ?? "Usuario";
  const isSuperAdminRoute = initialPath.startsWith("/super-admin");
  const currentBusinessUser = businessUsers.find((user) => user.email === currentUser && (role === "super_admin" || user.businessId === activeBusinessId));
  const can = (permission: keyof CashierPermissions) => role === "super_admin" || role === "admin" || Boolean(currentBusinessUser?.permissions[permission] ?? settings.cashierPermissions[permission]);
  const activeShift = shifts.find((shift) => shift.businessId === activeBusinessId && shift.status === "abierto" && !shift.testMode) ?? null;
  const currentBusiness = normalizeBusiness(businesses.find((item) => item.id === activeBusinessId) ?? business);
  const isSupportMode = role === "super_admin" && Boolean(supportBusinessId);

  useEffect(() => {
    if (initialPath === "/change-password") return;
    if (window.sessionStorage.getItem("force_password_change") === "true") {
      window.location.replace("/change-password");
      return;
    }
    if (initialPath === "/set-password") return;
    if (window.sessionStorage.getItem("require_password_setup") === "true") {
      window.location.replace("/set-password");
    }
  }, [initialPath]);

  useEffect(() => {
    const saved = window.localStorage.getItem("simple-pos-state");
    if (!saved) return;
    const parsed = JSON.parse(saved);
    setBusinesses((parsed.businesses ?? [parsed.business ? { ...initialBusiness, ...parsed.business } : initialBusiness]).map((item: Partial<Business>) => normalizeBusiness(item)));
    setBusiness(normalizeBusiness(parsed.business ?? initialBusiness));
    setBusinessUsers(parsed.businessUsers ?? initialBusinessUsers);
    setInvitations(parsed.invitations ?? []);
    setActiveBusinessId(parsed.activeBusinessId ?? initialBusiness.id);
    setCategories(parsed.categories ?? initialCategories);
    setProducts(parsed.products ?? initialProducts);
    setAdditions(parsed.additions ?? initialAdditions);
    setTables(normalizeTables(parsed.tables ?? initialTables));
    setOrders(normalizeOrders(parsed.orders ?? []));
    setSettings(normalizeSettings(parsed.settings));
    setShifts(parsed.shifts ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      if (!supabase) {
        if (mounted) setAuthLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await loadAuthenticatedUser(data.session.user, { redirect: initialPath === "/" });
      } else if (mounted) {
        setAuthLoading(false);
      }
    }
    restoreSession();
    const { data } = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession?.user) {
        setSession(null);
        setAuthLoading(false);
      }
    }) ?? { data: { subscription: null } };
    return () => {
      mounted = false;
      data.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("simple-pos-state", JSON.stringify({ businesses, business, businessUsers, invitations, activeBusinessId, categories, products, additions, tables, orders, settings, shifts }));
  }, [businesses, business, businessUsers, invitations, activeBusinessId, business, categories, products, additions, tables, orders, settings, shifts]);

  useEffect(() => {
    if (!supabase || !session || role === "super_admin" || activeBusinessId === "system") return;
    const client = supabase;
    const timer = window.setTimeout(() => {
      void client.from("settings").upsert({
        business_id: activeBusinessId,
        receipt_settings: settings.receipt,
        kitchen_settings: settings.kitchen,
        kitchen_ticket_settings: settings.kitchen,
        printing_settings: settings.printing,
        checkout_settings: settings.checkout,
        payment_methods: settings.paymentMethods,
        cashier_permissions: settings.cashierPermissions
      }, { onConflict: "business_id" });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [settings, activeBusinessId, session, role]);

  const businessCategories = categories.filter((item) => (item.businessId ?? activeBusinessId) === activeBusinessId);
  const businessProducts = products.filter((item) => (item.businessId ?? activeBusinessId) === activeBusinessId);
  const businessAdditions = additions.filter((item) => (item.businessId ?? activeBusinessId) === activeBusinessId);
  const businessTables = tables.filter((item) => (item.businessId ?? activeBusinessId) === activeBusinessId);
  const businessOrders = orders.filter((item) => (item.businessId ?? activeBusinessId) === activeBusinessId);
  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null;
  const openBusinessOrders = businessOrders.filter((order) => !["pagada", "cancelada", "anulada"].includes(order.status));
  const orderedTables = useMemo(() => [...businessTables].sort((a, b) => a.sortOrder - b.sortOrder), [businessTables]);

  function updateOrder(orderId: string, updater: (order: Order) => Order) {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;
        const updated = updater(order);
        return { ...updated, ...calculateOrder(updated.items, settings.checkout.tipEnabled ? updated.tip : 0) };
      })
    );
  }

  function appendAudit(orderId: string, action: string, reason?: string) {
    updateOrder(orderId, (order) => ({ ...order, audit: [...order.audit, audit(currentUser, action, reason)] }));
  }

  function makeOrder(type: OrderType, table?: RestaurantTable): Order {
    return {
      id: createId("order"),
      businessId: activeBusinessId,
      number: orders.length + 1,
      type,
      tableId: table?.id,
      tableName: table?.name,
      status: "abierta",
      items: [],
      subtotal: 0,
      tip: 0,
      total: 0,
      cashier: currentUser,
      shiftId: currentBusiness.testMode ? undefined : activeShift?.id,
      testMode: currentBusiness.testMode,
      audit: [audit(currentUser, `Orden ${type} creada`)],
      createdAt: now()
    };
  }

  function openOrderForTable(table: RestaurantTable) {
    if (!can("createOrders")) return;
    if (table.status === "bloqueada") return;
    if (!activeShift && !currentBusiness.testMode) return;
    const existing = orders.find((order) => order.tableId === table.id && !["pagada", "cancelada", "anulada"].includes(order.status));
    if (existing) return setActiveOrderId(existing.id);
    const order = makeOrder("mesa", table);
    setOrders((current) => [order, ...current]);
    setTables((current) => current.map((item) => (item.id === table.id ? { ...item, status: "ocupada" } : item)));
    setActiveOrderId(order.id);
  }

  function createDirectOrder(type: Exclude<OrderType, "mesa">) {
    if (!can("createOrders")) return;
    if (!activeShift && !currentBusiness.testMode) return;
    const order = makeOrder(type);
    setOrders((current) => [order, ...current]);
    setActiveOrderId(order.id);
  }

  function addProductToActiveOrder(product: Product) {
    if (!activeOrder || activeOrder.status === "pagada" || activeOrder.status === "cancelada") return;
    const item: OrderItem = { id: createId("item"), productId: product.id, productName: product.name, price: product.price, quantity: 1, notes: "", additions: [] };
    updateOrder(activeOrder.id, (order) => ({ ...order, items: [...order.items, item], audit: [...order.audit, audit(currentUser, `Producto agregado: ${product.name}`)] }));
  }

  function confirmKitchen(order: Order) {
    if (!can("confirmKitchen")) return;
    if (!activeShift && !currentBusiness.testMode) return;
    updateOrder(order.id, (current) => ({ ...current, status: "comandada", audit: [...current.audit, audit(currentUser, "Orden confirmada y comanda generada")] }));
    setPrintMode("comanda");
  }

  function printPrecheck(order: Order) {
    updateOrder(order.id, (current) => ({ ...current, status: ["pagada", "cancelada", "anulada"].includes(current.status) ? current.status : "esperando_pago", audit: [...current.audit, audit(currentUser, "Precuenta generada")] }));
    if (order.tableId) setTables((current) => current.map((table) => (table.id === order.tableId ? { ...table, status: "esperando_pago" } : table)));
    setPrintMode("precuenta");
  }

  function closeOrder(order: Order, method: PaymentMethod) {
    if (!can("chargeOrders")) return;
    if (!activeShift && !currentBusiness.testMode) return;
    updateOrder(order.id, (current) => ({ ...current, status: "pagada", shiftId: currentBusiness.testMode ? undefined : activeShift?.id, testMode: currentBusiness.testMode, paymentMethod: method, closedAt: now(), audit: [...current.audit, audit(currentUser, `Pago registrado: ${method}`)] }));
    if (order.tableId) setTables((current) => current.map((table) => (table.id === order.tableId ? { ...table, status: "libre" } : table)));
    setPrintMode("recibo");
  }

  function openShift(openingAmount: number, openingNote?: string) {
    setShifts((current) => [
      {
        id: createId("shift"),
        businessId: activeBusinessId,
        cashier: currentUser,
        openedAt: now(),
        openingAmount,
        openingNote,
        status: "abierto",
        testMode: false
      },
      ...current
    ]);
  }

  function closeShift(counted: CashShift["counted"], closingNote: string) {
    if (!activeShift || !counted) return;
    const expected = getShiftSummary(activeShift, orders);
    const countedTotal = counted.cash + counted.card + counted.transfer + counted.other;
    const expectedTotal = expected.expectedCash + expected.card + expected.transfer + expected.other;
    setShifts((current) =>
      current.map((shift) =>
        shift.id === activeShift.id
          ? {
              ...shift,
              status: "cerrado",
              closedAt: now(),
              closedBy: currentUser,
              expected: { ...expected, difference: countedTotal - expectedTotal },
              counted,
              closingNote
            }
          : shift
      )
    );
    setShowCloseShift(false);
  }

  function cancelOrder(order: Order, reason: string) {
    if (!can("cancelOrders")) return;
    updateOrder(order.id, (current) => ({ ...current, status: "cancelada", closedAt: now(), audit: [...current.audit, audit(currentUser, "Orden cancelada", reason)] }));
    if (order.tableId) setTables((current) => current.map((table) => (table.id === order.tableId ? { ...table, status: "libre" } : table)));
    setActiveOrderId(null);
  }

  async function loadAuthenticatedUser(authUser: { id: string; email?: string | null }, options: { redirect: boolean }) {
    if (!supabase) {
      setLoginError("Supabase Auth no esta configurado.");
      setAuthLoading(false);
      return false;
    }
    const email = (authUser.email ?? "").toLowerCase();
    setAuthLoading(true);
    const { data: rows, error } = await supabase
      .from("business_users")
      .select("id,business_id,user_id,email,full_name,role,status,permissions,force_password_change,created_at")
      .eq("user_id", authUser.id)
      .eq("status", "active");

    if (error || !rows?.length) {
      await supabase.auth.signOut();
      setSession(null);
      setLoginError("No tienes un usuario activo asignado a un negocio.");
      setAuthLoading(false);
      return false;
    }

    const mappedUsers = rows
      .map((row) => mapBusinessUserRow(row as Record<string, unknown>, email))
      .filter((user): user is BusinessUser => Boolean(user));
    const selectedUser = mappedUsers.find((user) => user.role === "super_admin")
      ?? mappedUsers.find((user) => user.role === "admin")
      ?? mappedUsers[0];

    if (!selectedUser) {
      await supabase.auth.signOut();
      setLoginError("Tu rol no esta configurado correctamente.");
      setAuthLoading(false);
      return false;
    }

    setBusinessUsers((current) => {
      const remaining = current.filter((user) => !mappedUsers.some((mapped) => mapped.id === user.id));
      return [...mappedUsers, ...remaining];
    });
    setRole(selectedUser.role);
    setSession({ email: selectedUser.email, userId: authUser.id });
    if (selectedUser.forcePasswordChange && typeof window !== "undefined" && initialPath !== "/change-password") {
      window.sessionStorage.setItem("force_password_change", "true");
      setAuthLoading(false);
      window.location.assign("/change-password");
      return true;
    }
    window.sessionStorage.removeItem("force_password_change");

    if (selectedUser.role === "super_admin") {
      const { data: businessRows } = await supabase
        .from("businesses")
        .select("id,name,commercial_name,logo_url,address,phone,email,nit,status,test_mode,demo,onboarding_completed,onboarding_skipped,currency,timezone")
        .order("created_at", { ascending: false });
      if (businessRows) setBusinesses(businessRows.map((row) => mapBusinessRow(row as Record<string, unknown>)));

      const { data: userRows } = await supabase
        .from("business_users")
        .select("id,business_id,user_id,email,full_name,role,status,permissions,force_password_change,created_at")
        .order("created_at", { ascending: false });
      if (userRows) {
        const users = userRows
          .map((row) => mapBusinessUserRow(row as Record<string, unknown>, email))
          .filter((user): user is BusinessUser => Boolean(user));
        setBusinessUsers(users);
      }

      const { data: invitationRows } = await supabase
        .from("invitations")
        .select("id,business_id,email,role,status,permissions,invited_by,created_at")
        .order("created_at", { ascending: false });
      if (invitationRows) {
        setInvitations(invitationRows.map((row) => mapInvitationRow(row as Record<string, unknown>)).filter((invite): invite is Invitation => Boolean(invite)));
      }
    } else {
      setActiveBusinessId(selectedUser.businessId);
      const { data: businessRow } = await supabase
        .from("businesses")
        .select("id,name,commercial_name,logo_url,address,phone,email,nit,status,test_mode,demo,onboarding_completed,onboarding_skipped,currency,timezone")
        .eq("id", selectedUser.businessId)
        .maybeSingle();
      if (businessRow) {
        const mappedBusiness = mapBusinessRow(businessRow as Record<string, unknown>);
        setBusinesses((current) => [mappedBusiness, ...current.filter((item) => item.id !== mappedBusiness.id)]);
      }
      const { data: businessUserRows } = await supabase
        .from("business_users")
        .select("id,business_id,user_id,email,full_name,role,status,permissions,force_password_change,created_at")
        .eq("business_id", selectedUser.businessId)
        .order("created_at", { ascending: false });
      if (businessUserRows) {
        const users = businessUserRows
          .map((row) => mapBusinessUserRow(row as Record<string, unknown>, email))
          .filter((user): user is BusinessUser => Boolean(user));
        setBusinessUsers(users);
      }
      setInvitations((current) => current.map((invite) => invite.businessId === selectedUser.businessId && invite.email === selectedUser.email && invite.role === selectedUser.role ? { ...invite, status: "accepted" } : invite));
    }

    setLoginError("");
    setAuthLoading(false);

    if (options.redirect && typeof window !== "undefined") {
      if (selectedUser.role === "super_admin") window.location.assign("/super-admin");
      else if (!initialPath.startsWith("/super-admin")) window.location.assign(selectedUser.role === "cajero" ? "/pos/mesas" : "/pos");
    }
    return true;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setLoginError("Supabase Auth no esta configurado.");
      return;
    }
    setLoginError("");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: login.email.trim().toLowerCase(),
      password: login.password
    });
    if (error || !data.user) {
      setLoginError("Email o contrasena incorrectos.");
      setAuthLoading(false);
      return;
    }
    await loadAuthenticatedUser(data.user, { redirect: true });
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    window.sessionStorage.removeItem("require_password_setup");
    window.sessionStorage.removeItem("force_password_change");
    setSession(null);
    setRole("admin");
    setActiveBusinessId(initialBusiness.id);
    setSupportBusinessId(null);
    setLogin({ email: "", password: "" });
  }

  async function enterSupportMode(businessId: string) {
    if (role !== "super_admin") return;
    setActiveBusinessId(businessId);
    setSupportBusinessId(businessId);
    setTab("vender");
    if (supabase && session?.userId) {
      await supabase.from("audit_logs").insert({
        business_id: businessId,
        user_id: session.userId,
        user_name: session.email,
        action: "super_admin_support_entered",
        metadata: { email: session.email }
      });
    }
  }

  function exitSupportMode() {
    setSupportBusinessId(null);
    setActiveBusinessId(initialBusiness.id);
  }

  const forcePasswordChangeRequired = typeof window !== "undefined" && initialPath !== "/change-password" && window.sessionStorage.getItem("force_password_change") === "true";
  const passwordSetupRequired = typeof window !== "undefined" && initialPath !== "/set-password" && window.sessionStorage.getItem("require_password_setup") === "true";

  if (forcePasswordChangeRequired) {
    window.location.replace("/change-password");
    return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-xl font-black">Redirigiendo para cambiar contrasena...</h1></section></main>;
  }

  if (passwordSetupRequired) {
    window.location.replace("/set-password");
    return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-xl font-black">Redirigiendo para crear contrasena...</h1></section></main>;
  }

  if (authLoading && !session) {
    return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-xl font-black">Cargando acceso...</h1></section></main>;
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface px-4">
        <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-md bg-brand text-white"><Utensils size={24} /></div>
            <div><p className="text-sm font-bold text-brand">Sistema POS</p><h1 className="text-2xl font-black">Entrar al punto de venta</h1></div>
          </div>
          <form className="mt-6 space-y-3" onSubmit={handleLogin}>
            <input className="min-h-12 w-full rounded-md border border-line px-3" type="email" placeholder="Email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} />
            <input className="min-h-12 w-full rounded-md border border-line px-3" type="password" placeholder="Contrasena" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
            {loginError && <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-800">{loginError}</p>}
            <button disabled={authLoading || !login.email.trim() || !login.password} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 font-bold text-white disabled:opacity-50">
              <LogIn size={20} /> {authLoading ? "Validando..." : "Iniciar sesion"}
            </button>
          </form>
          {!hasSupabaseConfig && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-800">Supabase Auth no esta configurado.</p>}
        </section>
      </main>
    );
  }

  if (isSuperAdminRoute && role !== "super_admin") {
    return <main className="grid min-h-screen place-items-center bg-surface p-4"><NoPermission /></main>;
  }

  if (role === "super_admin" && !isSupportMode) {
    if (!isSuperAdminRoute && typeof window !== "undefined") {
      window.location.replace("/super-admin");
      return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-xl font-black">Redirigiendo...</h1></section></main>;
    }
    return <SuperAdminPanelV4 businesses={businesses} setBusinesses={setBusinesses} users={businessUsers} setUsers={setBusinessUsers} orders={orders} onSupport={enterSupportMode} onLogout={handleLogout} />;
  }

  if (!isSupportMode && currentBusiness.status === "inactive") {
    return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="max-w-md rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-2xl font-black">Negocio inactivo</h1><p className="mt-2 text-slate-600">Este negocio esta desactivado. Contacta al administrador del sistema.</p><button className="mt-4 rounded-md border border-line px-4 py-2 font-bold" onClick={handleLogout}>Salir</button></section></main>;
  }

  if (currentBusiness.status === "deleted") {
    return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="max-w-md rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-2xl font-black">Negocio eliminado</h1><p className="mt-2 text-slate-600">Este negocio esta marcado como eliminado y no puede operar.</p><button className="mt-4 rounded-md border border-line px-4 py-2 font-bold" onClick={isSupportMode ? exitSupportMode : handleLogout}>Volver</button></section></main>;
  }

  if (!isSupportMode && !currentBusiness.onboardingCompleted && !currentBusiness.onboardingSkipped) {
    if (role !== "admin") {
      return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="max-w-md rounded-md border border-line bg-white p-6 text-center shadow-soft"><h1 className="text-2xl font-black">Configuracion pendiente</h1><p className="mt-2 text-slate-600">El admin debe completar o saltar el onboarding antes de operar el POS.</p><button className="mt-4 rounded-md border border-line px-4 py-2 font-bold" onClick={handleLogout}>Salir</button></section></main>;
    }
    return <OnboardingWizard business={currentBusiness} setBusiness={(updater) => setBusinesses((current) => current.map((item) => item.id === activeBusinessId ? (typeof updater === "function" ? updater(item) : updater) : item))} settings={settings} setSettings={setSettings} categories={businessCategories} setCategories={setCategories} products={businessProducts} setProducts={setProducts} tables={businessTables} setTables={setTables} activeBusinessId={activeBusinessId} onLogout={handleLogout} />;
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            {currentBusiness.logoUrl && <img src={currentBusiness.logoUrl} alt="Logo" className="size-12 rounded-md object-cover" />}
            <div><p className="text-sm font-semibold text-brand">POS MVP</p><h1 className="text-2xl font-black">{currentBusiness.name}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentBusiness.testMode && <span className="rounded-md bg-yellow-100 px-3 py-2 text-sm font-bold text-yellow-900">Modo prueba activo: las ordenes no afectaran reportes reales.</span>}
            {isSupportMode && <span className="rounded-md bg-sky-100 px-3 py-2 text-sm font-bold text-sky-900">Estas viendo este negocio como Super Admin</span>}
            {!currentBusiness.testMode && activeShift && <span className="rounded-md bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800">Turno abierto · {activeShift.cashier}</span>}
            {!currentBusiness.testMode && can("closeShift") && <button className="rounded-md border border-line bg-white px-3 py-2 font-semibold" onClick={() => setShowCloseShift(true)}>Cerrar turno</button>}
            {role === "admin" && <button className="rounded-md border border-line bg-white px-3 py-2 font-semibold" onClick={() => setBusinesses((current) => current.map((item) => item.id === activeBusinessId ? { ...item, testMode: !item.testMode } : item))}>{currentBusiness.testMode ? "Apagar prueba" : "Modo prueba"}</button>}
            {role === "admin" && <button className="rounded-md border border-line bg-white px-3 py-2 font-semibold" onClick={() => { setOrders((current) => current.filter((order) => !(order.businessId === activeBusinessId && order.testMode))); setShifts((current) => current.filter((shift) => !(shift.businessId === activeBusinessId && shift.testMode))); }}>Limpiar prueba</button>}
            <span className="rounded-md border border-line bg-surface px-3 py-2 text-sm">{session.email}</span>
            <span className="rounded-md border border-line bg-surface px-3 py-2 text-sm">{hasSupabaseConfig ? "Supabase configurado" : "Modo local"}</span>
            {isSupportMode && <button className="rounded-md bg-brand px-3 py-2 font-semibold text-white" onClick={exitSupportMode}>Volver a Super Admin</button>}
            <button className="rounded-md border border-line bg-white px-3 py-2 font-semibold" onClick={handleLogout}>Salir</button>
          </div>
        </div>
      </header>

      <div className="no-print sticky top-0 z-10 border-b border-line bg-white">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
          {can("viewTables") && <TabButton icon={<LayoutDashboard size={18} />} label="Dashboard" tab="dashboard" current={tab} onClick={setTab} />}
          {can("viewTables") && <TabButton icon={<Home size={18} />} label="Vender" tab="vender" current={tab} onClick={setTab} />}
          {can("viewOrders") && <TabButton icon={<ShoppingBag size={18} />} label="Ventas" tab="ventas" current={tab} onClick={setTab} />}
          {can("modifyMenu") && <TabButton icon={<Utensils size={18} />} label="Productos" tab="menu" current={tab} onClick={setTab} />}
          {can("viewReports") && <TabButton icon={<BarChart3 size={18} />} label="Reportes" tab="reportes" current={tab} onClick={setTab} />}
          {can("modifySettings") && <TabButton icon={<Settings size={18} />} label="Configuracion" tab="ajustes" current={tab} onClick={setTab} />}
        </nav>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-5">
        {tab === "dashboard" && (can("viewTables") ? <DashboardView orders={businessOrders} products={businessProducts} /> : <NoPermission />)}
        {tab === "vender" && (can("viewTables") ? <TablesView role={role} tables={orderedTables} openOrders={openBusinessOrders} setTables={setTables} activeBusinessId={activeBusinessId} activeShift={activeShift} testMode={currentBusiness.testMode} canOpenShift={can("openShift")} openShift={openShift} openOrderForTable={openOrderForTable} createDirectOrder={createDirectOrder} openExistingOrder={setActiveOrderId} /> : <NoPermission />)}
        {tab === "ventas" && (can("viewOrders") ? <SalesView orders={businessOrders} shifts={shifts.filter((shift) => (shift.businessId ?? activeBusinessId) === activeBusinessId)} setActiveOrderId={setActiveOrderId} setPrintMode={setPrintMode} /> : <NoPermission />)}
        {tab === "menu" && (can("modifyMenu") ? <MenuManager canEdit={can("modifyMenu")} activeBusinessId={activeBusinessId} categories={businessCategories} setCategories={setCategories} products={businessProducts} setProducts={setProducts} additions={businessAdditions} setAdditions={setAdditions} /> : <NoPermission />)}
        {tab === "reportes" && (can("viewReports") ? <ReportsView orders={businessOrders.filter((order) => order.status === "pagada")} shifts={shifts.filter((shift) => (shift.businessId ?? activeBusinessId) === activeBusinessId)} /> : <NoPermission />)}
        {tab === "ajustes" && (can("modifySettings") ? <SettingsView business={currentBusiness} setBusiness={(updater) => setBusinesses((current) => current.map((item) => item.id === activeBusinessId ? (typeof updater === "function" ? updater(item) : updater) : item))} settings={settings} setSettings={setSettings} users={businessUsers.filter((user) => user.businessId === activeBusinessId)} setUsers={setBusinessUsers} invitations={invitations.filter((invitation) => invitation.businessId === activeBusinessId)} setInvitations={setInvitations} activeBusinessId={activeBusinessId} currentUser={currentUser} /> : <NoPermission />)}
      </section>

      {activeOrder && (
        <OrderDrawer
          business={currentBusiness}
          settings={settings}
          activeShift={activeShift}
          role={role}
          can={can}
          currentUser={currentUser}
          order={activeOrder}
          categories={businessCategories}
          products={businessProducts}
          additions={businessAdditions}
          printMode={printMode}
          setPrintMode={setPrintMode}
          onClose={() => { setActiveOrderId(null); setPrintMode(null); }}
          addProduct={addProductToActiveOrder}
          updateOrder={updateOrder}
          appendAudit={appendAudit}
          confirmKitchen={confirmKitchen}
          printPrecheck={printPrecheck}
          closeOrder={closeOrder}
          cancelOrder={cancelOrder}
        />
      )}
      {showCloseShift && activeShift && <CloseShiftModal shift={activeShift} orders={orders} onClose={() => setShowCloseShift(false)} onConfirm={closeShift} />}
    </main>
  );
}

function TabButton({ icon, label, tab, current, onClick, disabled }: { icon: ReactNode; label: string; tab: MainTab; current: MainTab; onClick: (tab: MainTab) => void; disabled?: boolean }) {
  const active = tab === current;
  return (
    <button disabled={disabled} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-4 py-2 font-semibold disabled:opacity-40 ${active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"}`} onClick={() => onClick(tab)}>
      {icon}{label}
    </button>
  );
}

function DashboardView({ orders, products }: { orders: Order[]; products: Product[] }) {
  const realPaid = orders.filter((order) => order.status === "pagada" && !order.testMode);
  const today = getPresetRange("hoy");
  const week = getPresetRange("semana");
  const month = getPresetRange("mes");
  const year = getPresetRange("anio");
  const totalFor = (range: { from: string; to: string }) => realPaid.filter((order) => inDateRange(order.closedAt ?? order.createdAt, range.from, range.to)).reduce((sum, order) => sum + order.total, 0);
  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const day = startOfDay(new Date());
    day.setDate(day.getDate() - (6 - index));
    const key = toDateInput(day);
    const total = realPaid.filter((order) => inDateRange(order.closedAt ?? order.createdAt, key, key)).reduce((sum, order) => sum + order.total, 0);
    return { key, label: day.toLocaleDateString("es-CO", { weekday: "short", timeZone: "America/Bogota" }), total };
  });
  const last30Days = Array.from({ length: 30 }, (_, index) => {
    const day = startOfDay(new Date());
    day.setDate(day.getDate() - (29 - index));
    const key = toDateInput(day);
    const total = realPaid.filter((order) => inDateRange(order.closedAt ?? order.createdAt, key, key)).reduce((sum, order) => sum + order.total, 0);
    return { key, label: String(day.getDate()), total };
  });
  const maxDay = Math.max(1, ...last7Days.map((day) => day.total));
  const max30Day = Math.max(1, ...last30Days.map((day) => day.total));
  const monthOrders = realPaid.filter((order) => inDateRange(order.closedAt ?? order.createdAt, month.from, month.to));
  const topProducts = Object.entries(monthOrders.flatMap((order) => order.items).reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.productName]: (acc[item.productName] ?? 0) + item.quantity }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: monthOrders.filter((order) => new Date(order.closedAt ?? order.createdAt).getHours() === hour).length }));
  const maxHour = Math.max(1, ...ordersByHour.map((row) => row.count));
  const knownProducts = products.length;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h1 className="text-2xl font-black">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Vision rapida del negocio con datos reales. Los datos de prueba no se incluyen.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Ventas del dia" value={money.format(totalFor(today))} />
        <Metric title="Ventas de la semana" value={money.format(totalFor(week))} />
        <Metric title="Ventas del mes" value={money.format(totalFor(month))} />
        <Metric title="Ventas del ano" value={money.format(totalFor(year))} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Facturacion ultimos 7 dias</h2>
            <span className="rounded-md bg-surface px-3 py-2 text-sm font-bold">{realPaid.length} ventas reales</span>
          </div>
          <div className="mt-5 flex h-64 items-end gap-3">
            {last7Days.map((day) => (
              <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-48 w-full items-end rounded-md bg-surface p-1">
                  <div className="w-full rounded-md bg-brand" style={{ height: `${Math.max(6, (day.total / maxDay) * 100)}%` }} />
                </div>
                <span className="text-xs font-bold uppercase">{day.label}</span>
                <span className="text-xs text-slate-600">{money.format(day.total)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Top 5 productos del mes</h2>
            <span className="rounded-md bg-surface px-3 py-2 text-sm font-bold">{knownProducts} productos</span>
          </div>
          <div className="mt-4 space-y-3">
            {topProducts.length === 0 && <p className="rounded-md bg-surface p-3 text-sm text-slate-600">Sin productos vendidos este mes.</p>}
            {topProducts.map(([name, quantity], index) => (
              <div key={name} className="rounded-md bg-surface p-3">
                <div className="flex justify-between gap-3 font-bold"><span>{index + 1}. {name}</span><span>{quantity}</span></div>
                <div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(8, (quantity / Math.max(1, topProducts[0]?.[1] ?? 1)) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-xl font-bold">Facturacion ultimos 30 dias</h2>
          <div className="mt-5 flex h-56 items-end gap-1">
            {last30Days.map((day) => (
              <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end rounded bg-surface">
                  <div className="w-full rounded bg-brand" title={`${day.key}: ${money.format(day.total)}`} style={{ height: `${Math.max(4, (day.total / max30Day) * 100)}%` }} />
                </div>
                <span className="text-[10px] font-bold">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-xl font-bold">Pedidos por hora</h2>
          <div className="mt-4 space-y-2">
            {ordersByHour.filter((row) => row.count > 0).length === 0 && <p className="rounded-md bg-surface p-3 text-sm text-slate-600">Sin pedidos pagados este mes.</p>}
            {ordersByHour.filter((row) => row.count > 0).map((row) => (
              <div key={row.hour} className="grid grid-cols-[52px_1fr_36px] items-center gap-2 text-sm">
                <span className="font-bold">{String(row.hour).padStart(2, "0")}:00</span>
                <div className="h-3 rounded-full bg-surface"><div className="h-3 rounded-full bg-accent" style={{ width: `${Math.max(8, (row.count / maxHour) * 100)}%` }} /></div>
                <span className="text-right font-bold">{row.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function OnboardingWizard({
  business,
  setBusiness,
  settings,
  setSettings,
  categories,
  setCategories,
  products,
  setProducts,
  tables,
  setTables,
  activeBusinessId,
  onLogout
}: {
  business: Business;
  setBusiness: React.Dispatch<React.SetStateAction<Business>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  tables: RestaurantTable[];
  setTables: React.Dispatch<React.SetStateAction<RestaurantTable[]>>;
  activeBusinessId: string;
  onLogout: () => void;
}) {
  const steps = ["Datos", "Logo", "Propina", "Categorias", "Productos", "Mesas", "Finalizar"];
  const [step, setStep] = useState(0);
  const [categoryName, setCategoryName] = useState("");
  const [productDraft, setProductDraft] = useState({ name: "", price: "", categoryId: categories[0]?.id ?? "", description: "" });
  const [tableName, setTableName] = useState("");
  const progress = Math.round(((step + 1) / steps.length) * 100);

  async function uploadLogo(file?: File) {
    if (!file) return;
    if (supabase) {
      const path = `logos/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
        setBusiness((current) => ({ ...current, logoUrl: data.publicUrl }));
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = () => setBusiness((current) => ({ ...current, logoUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  function finish(skipped = false) {
    setBusiness((current) => ({ ...current, onboardingCompleted: !skipped, onboardingSkipped: skipped }));
  }

  function addCategory() {
    if (!categoryName.trim()) return;
    const category = { id: createId("cat"), businessId: activeBusinessId, name: categoryName.trim() };
    setCategories((current) => [...current, category]);
    setCategoryName("");
    if (!productDraft.categoryId) setProductDraft((current) => ({ ...current, categoryId: category.id }));
  }

  function addProduct() {
    if (!productDraft.name.trim()) return;
    const categoryId = productDraft.categoryId || categories[0]?.id || "";
    if (!categoryId) return;
    setProducts((current) => [...current, { id: createId("prod"), businessId: activeBusinessId, categoryId, name: productDraft.name.trim(), price: Number(productDraft.price) || 0, description: productDraft.description.trim(), active: true }]);
    setProductDraft({ name: "", price: "", categoryId, description: "" });
  }

  function addTable() {
    if (!tableName.trim()) return;
    setTables((current) => [...current, { id: createId("table"), businessId: activeBusinessId, name: tableName.trim(), status: "libre", sortOrder: current.filter((table) => table.businessId === activeBusinessId).length + 1 }]);
    setTableName("");
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-bold text-brand">Configuracion inicial</p>
            <h1 className="text-2xl font-black">{business.name}</h1>
          </div>
          <button className="rounded-md border border-line px-3 py-2 font-bold" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong>Paso {step + 1} de {steps.length}: {steps[step]}</strong>
            <button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => finish(true)}>Saltar onboarding</button>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          {step === 0 && <div className="grid gap-3 md:grid-cols-2"><TextField label="Nombre del negocio" value={business.name} onChange={(value) => setBusiness((current) => ({ ...current, name: value, commercialName: value }))} /><TextField label="NIT opcional" value={business.nit ?? ""} onChange={(value) => setBusiness((current) => ({ ...current, nit: value }))} /><TextField label="Direccion" value={business.address} onChange={(value) => setBusiness((current) => ({ ...current, address: value }))} /><TextField label="Telefono" value={business.phone} onChange={(value) => setBusiness((current) => ({ ...current, phone: value }))} /><TextField label="Email" value={business.email} onChange={(value) => setBusiness((current) => ({ ...current, email: value }))} /><div className="rounded-md bg-surface p-3 text-sm font-bold">COP · America/Bogota</div></div>}
          {step === 1 && <div className="space-y-4"><div className="flex flex-wrap items-center gap-3">{business.logoUrl && <img src={business.logoUrl} alt="Logo" className="size-24 rounded-md border border-line object-cover" />}<label className="min-h-11 cursor-pointer rounded-md border border-line bg-white px-4 py-3 font-bold">Subir logo<input className="hidden" type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>{business.logoUrl && <button className="min-h-11 rounded-md border border-line px-4 font-bold" onClick={() => setBusiness((current) => ({ ...current, logoUrl: undefined }))}>Quitar logo</button>}</div><p className="text-sm text-slate-600">El logo puede mostrarse en header y recibos.</p></div>}
          {step === 2 && <div className="grid gap-3 md:grid-cols-2"><Toggle label="Propina activa" checked={settings.checkout.tipEnabled} onChange={(value) => setSettings((current) => ({ ...current, checkout: { ...current.checkout, tipEnabled: value, tipMode: value ? current.checkout.tipMode : "none" }, receipt: { ...current.receipt, showTip: value } }))} /><label className="space-y-1"><span className="text-sm font-bold">Modo de propina</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={settings.checkout.tipMode} onChange={(event) => setSettings((current) => ({ ...current, checkout: { ...current.checkout, tipMode: event.target.value as AppSettings["checkout"]["tipMode"] } }))}><option value="manual">Manual</option><option value="suggested">Sugeridas: 5%, 10%, 15%</option><option value="none">Sin propina</option></select></label></div>}
          {step === 3 && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nueva categoria" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><button className="rounded-md bg-brand px-4 font-bold text-white" onClick={addCategory}>Agregar</button></div><div className="grid gap-2 md:grid-cols-2">{categories.map((category) => <div key={category.id} className="rounded-md bg-surface p-3 font-semibold">{category.name}</div>)}</div></div>}
          {step === 4 && <div className="space-y-4"><div className="grid gap-3 md:grid-cols-[1fr_140px_180px_1fr_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Producto" value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Precio" type="number" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={productDraft.categoryId || categories[0]?.id || ""} onChange={(event) => setProductDraft({ ...productDraft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input className="min-h-11 rounded-md border border-line px-3" placeholder="Descripcion" value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /><button className="rounded-md bg-brand px-4 font-bold text-white" onClick={addProduct}>Agregar</button></div><div className="grid gap-2 md:grid-cols-2">{products.map((product) => <div key={product.id} className="rounded-md bg-surface p-3 font-semibold">{product.name} · {money.format(product.price)}</div>)}</div></div>}
          {step === 5 && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Mesa 1, Barra, Terraza..." value={tableName} onChange={(event) => setTableName(event.target.value)} /><button className="rounded-md bg-brand px-4 font-bold text-white" onClick={addTable}>Agregar</button></div><div className="grid gap-2 md:grid-cols-3">{tables.map((table) => <div key={table.id} className="rounded-md bg-surface p-3 font-semibold">{table.name}</div>)}</div></div>}
          {step === 6 && <div className="space-y-3"><h2 className="text-xl font-black">Todo listo para operar</h2><p className="text-slate-600">Puedes terminar la configuracion inicial y entrar al POS. Luego podras ajustar menu, mesas, recibo, comanda e impresion desde Ajustes.</p><div className="grid gap-2 md:grid-cols-3"><Metric title="Categorias" value={String(categories.length)} /><Metric title="Productos" value={String(products.length)} /><Metric title="Mesas" value={String(tables.length)} /></div></div>}
        </section>

        <div className="flex flex-wrap justify-between gap-3">
          <button disabled={step === 0} className="min-h-11 rounded-md border border-line bg-white px-4 font-bold disabled:opacity-40" onClick={() => setStep((current) => Math.max(0, current - 1))}>Anterior</button>
          {step < steps.length - 1 ? <button className="min-h-11 rounded-md bg-brand px-4 font-bold text-white" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Continuar</button> : <button className="min-h-11 rounded-md bg-ink px-4 font-bold text-white" onClick={() => finish(false)}>Finalizar configuracion</button>}
        </div>
      </section>
    </main>
  );
}

function SuperAdminPanel({ businesses, setBusinesses, users, setUsers, invitations, setInvitations, onSupport, onLogout }: { businesses: Business[]; setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; invitations: Invitation[]; setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>; onSupport: (businessId: string) => void; onLogout: () => void }) {
  const [tab, setTab] = useState<SuperAdminTab>("businesses");
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", kind: "real" as "real" | "demo" });
  const [detailId, setDetailId] = useState<string | null>(null);
  function createBusiness() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    const businessId = createId("business");
    const business: Business = { ...initialBusiness, id: businessId, name: draft.name.trim(), commercialName: draft.name.trim(), phone: draft.phone, email: draft.email, status: "active", testMode: true, demo: draft.kind === "demo", onboardingCompleted: false, onboardingSkipped: false };
    const adminUser: BusinessUser = { id: createId("user"), businessId, email: draft.email.trim(), name: draft.email.trim(), role: "admin", status: "active", permissions: superAdminPermissions, createdAt: now() };
    const invite: Invitation = { id: createId("invite"), businessId, email: draft.email.trim(), role: "admin", permissions: superAdminPermissions, status: "pending", invitedBy: "super_admin", createdAt: now() };
    setBusinesses((current) => [business, ...current]);
    setUsers((current) => [adminUser, ...current]);
    setInvitations((current) => [invite, ...current]);
    setDraft({ name: "", email: "", phone: "", kind: "real" });
  }
  const detail = businesses.find((business) => business.id === detailId);
  return <main className="min-h-screen bg-surface"><header className="border-b border-line bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><p className="text-sm font-bold text-brand">Super Admin</p><h1 className="text-2xl font-black">Panel del sistema</h1></div><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={onLogout}>Salir</button></div></header><section className="mx-auto max-w-7xl space-y-4 px-4 py-5"><InnerTabs current={tab} onChange={setTab} tabs={[{ id: "businesses", label: "Negocios" }, { id: "invitations", label: "Invitaciones" }, { id: "checklist", label: "Checklist" }]} />{tab === "businesses" && <><SettingsCard title="Crear negocio"><div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_160px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre del negocio" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo admin" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Telefono" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as "real" | "demo" })}><option value="real">Real</option><option value="demo">Demo</option></select><button className="rounded-md bg-brand px-4 font-bold text-white" onClick={createBusiness}>Crear</button></div><p className="mt-2 text-sm text-slate-600">En produccion, este flujo debe llamar Supabase Auth para enviar magic link/reset password al admin.</p></SettingsCard><SettingsCard title="Negocios"><div className="space-y-2">{businesses.map((business) => <div key={business.id} className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[1fr_110px_140px_auto_auto] md:items-center"><div><p className="font-bold">{business.name}</p><p className="text-sm text-slate-600">{business.email} · {business.phone || "Sin telefono"}</p></div><span className={`rounded-md px-3 py-2 text-sm font-bold ${business.demo ? "bg-yellow-100 text-yellow-900" : "bg-sky-100 text-sky-900"}`}>{business.demo ? "Demo" : "Real"}</span><button className={`rounded-md px-3 py-2 font-bold ${business.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`} onClick={() => setBusinesses((current) => current.map((item) => item.id === business.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))}>{business.status === "active" ? "Activo" : "Inactivo"}</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => setDetailId(business.id)}>Detalle</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => onSupport(business.id)}>Soporte</button></div>)}</div></SettingsCard>{detail && <SettingsCard title="Detalle del negocio"><div className="grid gap-2 text-sm md:grid-cols-2"><SummaryRow label="Nombre" value={detail.name} /><SummaryRow label="Tipo" value={detail.demo ? "Demo" : "Real"} /><SummaryRow label="Estado" value={detail.status} /><SummaryRow label="Usuarios" value={String(users.filter((user) => user.businessId === detail.id).length)} /><SummaryRow label="Invitaciones" value={String(invitations.filter((invite) => invite.businessId === detail.id).length)} /></div></SettingsCard>}</>}{tab === "invitations" && <SettingsCard title="Invitaciones"><div className="space-y-2">{invitations.length === 0 && <p className="rounded-md bg-surface p-3 text-sm">Sin invitaciones.</p>}{invitations.map((invite) => <div key={invite.id} className="grid gap-2 rounded-md bg-surface p-3 text-sm md:grid-cols-[1fr_120px_auto]"><span>{invite.email} · {invite.role} · {businesses.find((business) => business.id === invite.businessId)?.name}</span><strong>{invite.status}</strong><button className="rounded-md border border-line bg-white px-3 py-2 font-bold" onClick={() => setInvitations((current) => current.map((item) => item.id === invite.id ? { ...item, status: "pending", createdAt: now() } : item))}>Reenviar</button></div>)}</div></SettingsCard>}{tab === "checklist" && <AccessChecklist />}</section></main>;
}

function SuperAdminPanelV2({ businesses, setBusinesses, users, setUsers, invitations, setInvitations, orders, onSupport, onLogout }: { businesses: Business[]; setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; invitations: Invitation[]; setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>; orders: Order[]; onSupport: (businessId: string) => void; onLogout: () => void }) {
  const [tab, setTab] = useState<SuperAdminTab>("businesses");
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", kind: "real" as "real" | "demo" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BusinessFilter>("all");
  const [search, setSearch] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [inviteStatus, setInviteStatus] = useState<{ tone: "ok" | "error" | "info"; message: string } | null>(null);

  async function createBusiness() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    if (!supabase) {
      setInviteStatus({ tone: "error", message: "Supabase no esta configurado. No se puede enviar la invitacion." });
      return;
    }
    setInviteStatus({ tone: "info", message: "Enviando invitacion..." });
    const data = await postAdminApi("/api/admin/create-business", { name: draft.name.trim(), admin_email: draft.email.trim().toLowerCase(), phone: draft.phone.trim() || null, demo: draft.kind === "demo" });
    const error: Error | null = null;
    if (error || data?.error) {
      setInviteStatus({ tone: "error", message: data?.error ?? "Error creando usuario directo." });
      return;
    }
    const businessId = data.business.id as string;
    const business = mapBusinessRow(data.business as Record<string, unknown>);
    const adminUser: BusinessUser = { id: createId("user"), businessId, email: draft.email.trim().toLowerCase(), name: draft.email.trim().toLowerCase(), role: "admin", status: "active", permissions: superAdminPermissions, createdAt: now() };
    const invite: Invitation = { id: data.invitation_id ?? createId("invite"), businessId, email: draft.email.trim().toLowerCase(), role: "admin", permissions: superAdminPermissions, status: "pending", invitedBy: "super_admin", createdAt: now() };
    setBusinesses((current) => [business, ...current]);
    setUsers((current) => [adminUser, ...current]);
    setInvitations((current) => [invite, ...current]);
    setDraft({ name: "", email: "", phone: "", kind: "real" });
    setInviteStatus({ tone: "ok", message: data.invite_status === "reset_sent" ? "El usuario ya existia. Se envio correo para restablecer contrasena." : "Invitacion enviada al admin." });
  }

  async function resendAdminInvitation(businessId: string) {
    if (!supabase) {
      setInviteStatus({ tone: "error", message: "Supabase no esta configurado. No se puede reenviar la invitacion." });
      return;
    }
    setInviteStatus({ tone: "info", message: "Reenviando invitacion..." });
    const adminUser = users.find((user) => user.businessId === businessId && user.role === "admin");
    const data = adminUser ? await postAdminApi("/api/admin/users", { action: "reset_password", business_id: businessId, business_user_id: adminUser.id }) : null;
    const error = adminUser ? null : new Error("Admin no encontrado.");
    if (error || data?.error) {
      setInviteStatus({ tone: "error", message: data?.error ?? error?.message ?? "Error reseteando contrasena." });
      return;
    }
    setInvitations((current) => current.map((invite) => invite.businessId === businessId && invite.role === "admin" ? { ...invite, status: "pending", createdAt: now() } : invite));
    setInviteStatus({ tone: "ok", message: data.invite_status === "reset_sent" ? "El usuario ya existia. Se envio correo para restablecer contrasena." : "Invitacion reenviada." });
  }

  const updateBusiness = (businessId: string, patch: Partial<Business>) => {
    setBusinesses((current) => current.map((item) => item.id === businessId ? { ...item, ...patch } : item));
    if (supabase) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.commercialName !== undefined) dbPatch.commercial_name = patch.commercialName;
      if (patch.phone !== undefined) dbPatch.phone = patch.phone;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (Object.keys(dbPatch).length) void supabase.from("businesses").update(dbPatch).eq("id", businessId);
    }
  };
  const toggleBusiness = (business: Business) => updateBusiness(business.id, { status: business.status === "active" ? "inactive" : "active" });
  const detail = businesses.find((business) => business.id === detailId);
  const detailUsers = detail ? users.filter((user) => user.businessId === detail.id) : [];
  const detailInvitations = detail ? invitations.filter((invite) => invite.businessId === detail.id) : [];
  const detailOrders = detail ? orders.filter((order) => order.businessId === detail.id) : [];
  const detailPaidOrders = detailOrders.filter((order) => order.status === "pagada");
  const detailTotal = detailPaidOrders.reduce((sum, order) => sum + order.total, 0);
  const detailLastActivity = [...detailOrders.map((order) => order.closedAt ?? order.createdAt), ...(detail?.lastActivityAt ? [detail.lastActivityAt] : [])].sort().at(-1);
  const statusClass = (status: Business["status"]) => status === "active" ? "bg-emerald-100 text-emerald-800" : status === "deleted" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700";
  const visibleBusinesses = businesses.filter((business) => {
    const admin = users.find((user) => user.businessId === business.id && user.role === "admin");
    const text = `${business.name} ${business.email} ${admin?.email ?? ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesFilter = filter === "all" ? business.status !== "deleted" : filter === "real" ? !business.demo && business.status !== "deleted" : filter === "demo" ? business.demo && business.status !== "deleted" : filter === "active" ? business.status === "active" : filter === "inactive" ? business.status === "inactive" : business.status === "deleted";
    return matchesSearch && matchesFilter;
  });

  return <main className="min-h-screen bg-surface"><header className="border-b border-line bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><p className="text-sm font-bold text-brand">Super Admin</p><h1 className="text-2xl font-black">Panel del sistema</h1></div><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={onLogout}>Salir</button></div></header><section className="mx-auto max-w-7xl space-y-4 px-4 py-5"><InnerTabs current={tab} onChange={setTab} tabs={[{ id: "businesses", label: "Negocios" }, { id: "invitations", label: "Invitaciones" }, { id: "checklist", label: "Checklist" }]} />{tab === "businesses" && <><SettingsCard title="Crear negocio"><div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_160px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre del negocio" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo admin" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Telefono" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as "real" | "demo" })}><option value="real">Real</option><option value="demo">Demo</option></select><button className="rounded-md bg-brand px-4 font-bold text-white" onClick={createBusiness}>Crear</button></div><p className="mt-2 text-sm text-slate-600">En produccion, este flujo debe llamar Supabase Auth para enviar magic link/reset password al admin.</p></SettingsCard><SettingsCard title="Negocios"><div className="grid gap-3 lg:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Buscar por negocio o correo admin" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="flex gap-2 overflow-x-auto">{(["all", "real", "demo", "active", "inactive", "deleted"] as BusinessFilter[]).map((item) => <button key={item} className={`min-h-11 shrink-0 rounded-md border px-3 font-bold ${filter === item ? "border-brand bg-brand text-white" : "border-line bg-white"}`} onClick={() => setFilter(item)}>{item === "all" ? "Todos" : item === "real" ? "Reales" : item === "demo" ? "Demo" : item === "active" ? "Activos" : item === "inactive" ? "Inactivos" : "Eliminados"}</button>)}</div></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{visibleBusinesses.map((business) => { const admin = users.find((user) => user.businessId === business.id && user.role === "admin"); return <article key={business.id} className="rounded-md border border-line bg-white p-4 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{business.name}</h2><p className="text-sm text-slate-600">{business.email || admin?.email || "Sin correo"} · {business.phone || "Sin telefono"}</p><p className="mt-1 text-sm text-slate-600">Admin: {admin?.email ?? "Pendiente"}</p></div><div className="flex gap-2"><span className={`rounded-md px-3 py-2 text-sm font-bold ${business.demo ? "bg-yellow-100 text-yellow-900" : "bg-sky-100 text-sky-900"}`}>{business.demo ? "Demo" : "Real"}</span><span className={`rounded-md px-3 py-2 text-sm font-bold ${statusClass(business.status)}`}>{business.status}</span></div></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => { setDetailId(business.id); setDeleteText(""); }}>Detalle</button><button disabled={business.status === "deleted"} className="rounded-md bg-brand px-3 py-2 font-bold text-white disabled:opacity-40" onClick={() => onSupport(business.id)}>Soporte</button><button disabled={business.status === "deleted"} className="rounded-md border border-line px-3 py-2 font-bold disabled:opacity-40" onClick={() => toggleBusiness(business)}>{business.status === "active" ? "Desactivar" : "Activar"}</button></div></article>; })}{visibleBusinesses.length === 0 && <p className="rounded-md bg-surface p-3 text-sm text-slate-600">No hay negocios con esos filtros.</p>}</div></SettingsCard>{detail && <SettingsCard title="Detalle del negocio"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{detail.name}</h2><p className="text-sm text-slate-600">{detail.demo ? "Demo" : "Real"} · {detail.status}</p></div><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => setDetailId(null)}>Cerrar detalle</button></div><div className="mt-4 grid gap-3 md:grid-cols-2"><TextField label="Nombre" value={detail.name} onChange={(value) => updateBusiness(detail.id, { name: value, commercialName: value })} /><TextField label="Telefono" value={detail.phone} onChange={(value) => updateBusiness(detail.id, { phone: value })} /><SummaryRow label="Correo" value={detail.email || "-"} /><SummaryRow label="Estado" value={detail.status} /><SummaryRow label="Tipo" value={detail.demo ? "Demo" : "Real"} /><SummaryRow label="Creado" value={detail.createdAt ? formatDateTime(detail.createdAt) : "-"} /><SummaryRow label="Total ordenes" value={String(detailOrders.length)} /><SummaryRow label="Total vendido" value={money.format(detailTotal)} /><SummaryRow label="Ultima actividad" value={detailLastActivity ? formatDateTime(detailLastActivity) : "-"} /><SummaryRow label="Admin asignado" value={detailUsers.find((user) => user.role === "admin")?.email ?? "Pendiente"} /></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={detail.status === "deleted"} className="rounded-md border border-line px-3 py-2 font-bold disabled:opacity-40" onClick={() => toggleBusiness(detail)}>{detail.status === "active" ? "Desactivar negocio" : "Activar negocio"}</button><button disabled={detail.status === "deleted"} className="rounded-md bg-brand px-3 py-2 font-bold text-white disabled:opacity-40" onClick={() => onSupport(detail.id)}>Entrar en soporte</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => setInvitations((current) => current.map((invite) => invite.businessId === detail.id && invite.role === "admin" ? { ...invite, status: "pending", createdAt: now() } : invite))}>Reenviar invitacion admin</button></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="font-black">Usuarios y cajeros</h3><div className="mt-2 space-y-2">{detailUsers.map((user) => <div key={user.id} className="grid gap-2 rounded-md bg-surface p-3 text-sm md:grid-cols-[1fr_100px_auto] md:items-center"><span>{user.name} · {user.email}</span><strong>{user.role}</strong><button className="rounded-md border border-line bg-white px-3 py-2 font-bold" onClick={() => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))}>{user.status === "active" ? "Desactivar" : "Activar"}</button></div>)}{detailUsers.length === 0 && <p className="rounded-md bg-surface p-3 text-sm">Sin usuarios.</p>}</div></div><div><h3 className="font-black">Invitaciones</h3><div className="mt-2 space-y-2">{detailInvitations.map((invite) => <div key={invite.id} className="rounded-md bg-surface p-3 text-sm">{invite.email} · {invite.role} · <strong>{invite.status}</strong></div>)}{detailInvitations.length === 0 && <p className="rounded-md bg-surface p-3 text-sm">Sin invitaciones.</p>}</div></div></div><div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4"><h3 className="font-black text-red-900">Eliminar negocio</h3><p className="mt-1 text-sm text-red-800">Soft delete: se marcara como eliminado y se ocultara del listado principal. No se borran datos fisicos.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-red-200 px-3" placeholder="Escribe ELIMINAR para confirmar" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} /><button disabled={deleteText !== "ELIMINAR"} className="rounded-md bg-red-700 px-4 font-bold text-white disabled:opacity-40" onClick={() => { updateBusiness(detail.id, { status: "deleted" }); setDetailId(null); setDeleteText(""); }}>Eliminar negocio</button></div></div></SettingsCard>}</>}{tab === "invitations" && <SettingsCard title="Invitaciones"><div className="space-y-2">{invitations.length === 0 && <p className="rounded-md bg-surface p-3 text-sm">Sin invitaciones.</p>}{invitations.map((invite) => <div key={invite.id} className="grid gap-2 rounded-md bg-surface p-3 text-sm md:grid-cols-[1fr_120px_auto]"><span>{invite.email} · {invite.role} · {businesses.find((business) => business.id === invite.businessId)?.name}</span><strong>{invite.status}</strong><button className="rounded-md border border-line bg-white px-3 py-2 font-bold" onClick={() => setInvitations((current) => current.map((item) => item.id === invite.id ? { ...item, status: "pending", createdAt: now() } : item))}>Reenviar</button></div>)}</div></SettingsCard>}{tab === "checklist" && <AccessChecklist />}</section></main>;
}

function SuperAdminPanelV3({ businesses, setBusinesses, users, setUsers, invitations, setInvitations, orders, onSupport, onLogout }: { businesses: Business[]; setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; invitations: Invitation[]; setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>; orders: Order[]; onSupport: (businessId: string) => void; onLogout: () => void }) {
  const [tab, setTab] = useState<SuperAdminTab>("businesses");
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", kind: "real" as "real" | "demo" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BusinessFilter>("all");
  const [search, setSearch] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [inviteStatus, setInviteStatus] = useState<{ tone: "ok" | "error" | "info"; message: string } | null>(null);

  async function createBusiness() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    if (!supabase) return setInviteStatus({ tone: "error", message: "Supabase no esta configurado. No se puede enviar la invitacion." });
    setInviteStatus({ tone: "info", message: "Enviando invitacion..." });
    const data = await postAdminApi("/api/admin/create-business", { name: draft.name.trim(), admin_email: draft.email.trim().toLowerCase(), phone: draft.phone.trim() || null, demo: draft.kind === "demo" });
    const error: Error | null = null;
    if (error) return setInviteStatus({ tone: "error", message: await getFunctionErrorMessage(error, "Error enviando invitacion.") });
    if (data?.error) return setInviteStatus({ tone: "error", message: `${data.code ? `${data.code}: ` : ""}${data.error}` });
    const businessId = data.business.id as string;
    const business = mapBusinessRow(data.business as Record<string, unknown>);
    setBusinesses((current) => [business, ...current]);
    setUsers((current) => [{ id: createId("user"), businessId, email: draft.email.trim().toLowerCase(), name: draft.email.trim().toLowerCase(), role: "admin", status: "active", permissions: superAdminPermissions, createdAt: now() }, ...current]);
    setInvitations((current) => [{ id: data.invitation_id ?? createId("invite"), businessId, email: draft.email.trim().toLowerCase(), role: "admin", permissions: superAdminPermissions, status: "pending", invitedBy: "super_admin", createdAt: now() }, ...current]);
    setDraft({ name: "", email: "", phone: "", kind: "real" });
    setInviteStatus({ tone: "ok", message: data.invite_status === "reset_sent" ? "El usuario ya existia. Se envio correo para restablecer contrasena." : "Invitacion enviada al admin." });
  }

  async function resendAdminInvitation(businessId: string) {
    if (!supabase) return setInviteStatus({ tone: "error", message: "Supabase no esta configurado. No se puede reenviar la invitacion." });
    setInviteStatus({ tone: "info", message: "Reenviando invitacion..." });
    const adminUser = users.find((user) => user.businessId === businessId && user.role === "admin");
    const data = adminUser ? await postAdminApi("/api/admin/users", { action: "reset_password", business_id: businessId, business_user_id: adminUser.id }) : null;
    const error = adminUser ? null : new Error("Admin no encontrado.");
    if (error) return setInviteStatus({ tone: "error", message: await getFunctionErrorMessage(error, "Error reenviando invitacion.") });
    if (data?.error) return setInviteStatus({ tone: "error", message: `${data.code ? `${data.code}: ` : ""}${data.error}` });
    setInvitations((current) => current.map((invite) => invite.businessId === businessId && invite.role === "admin" ? { ...invite, status: "pending", createdAt: now() } : invite));
    setInviteStatus({ tone: "ok", message: data.invite_status === "reset_sent" ? "El usuario ya existia. Se envio correo para restablecer contrasena." : "Invitacion reenviada." });
  }

  const updateBusiness = (businessId: string, patch: Partial<Business>) => {
    setBusinesses((current) => current.map((item) => item.id === businessId ? { ...item, ...patch } : item));
    if (supabase) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.phone !== undefined) dbPatch.phone = patch.phone;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (Object.keys(dbPatch).length) void supabase.from("businesses").update(dbPatch).eq("id", businessId);
    }
  };
  const detail = businesses.find((business) => business.id === detailId);
  const visibleBusinesses = businesses.filter((business) => {
    const admin = users.find((user) => user.businessId === business.id && user.role === "admin");
    const text = `${business.name} ${business.email} ${admin?.email ?? ""}`.toLowerCase();
    const matchesFilter = filter === "all" ? business.status !== "deleted" : filter === "real" ? !business.demo && business.status !== "deleted" : filter === "demo" ? business.demo && business.status !== "deleted" : filter === "active" ? business.status === "active" : filter === "inactive" ? business.status === "inactive" : business.status === "deleted";
    return matchesFilter && text.includes(search.toLowerCase());
  });
  const detailUsers = detail ? users.filter((user) => user.businessId === detail.id) : [];
  const detailInvitations = detail ? invitations.filter((invite) => invite.businessId === detail.id) : [];
  const detailOrders = detail ? orders.filter((order) => order.businessId === detail.id) : [];
  const detailTotal = detailOrders.filter((order) => order.status === "pagada").reduce((sum, order) => sum + order.total, 0);
  const detailLastActivity = [...detailOrders.map((order) => order.closedAt ?? order.createdAt), ...(detail?.lastActivityAt ? [detail.lastActivityAt] : [])].sort().at(-1);
  const statusClass = (status: Business["status"]) => status === "active" ? "bg-emerald-100 text-emerald-800" : status === "deleted" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700";

  return <main className="min-h-screen bg-surface"><header className="border-b border-line bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><p className="text-sm font-bold text-brand">Super Admin</p><h1 className="text-2xl font-black">Panel del sistema</h1></div><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={onLogout}>Salir</button></div></header><section className="mx-auto max-w-7xl space-y-4 px-4 py-5"><InnerTabs current={tab} onChange={setTab} tabs={[{ id: "businesses", label: "Negocios" }, { id: "invitations", label: "Invitaciones" }, { id: "checklist", label: "Checklist" }]} />{tab === "businesses" && <><SettingsCard title="Crear negocio"><div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_160px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre del negocio" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo admin" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Telefono" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as "real" | "demo" })}><option value="real">Real</option><option value="demo">Demo</option></select><button className="rounded-md bg-brand px-4 font-bold text-white" onClick={createBusiness}>Crear</button></div>{inviteStatus && <p className={`mt-2 rounded-md p-3 text-sm font-bold ${inviteStatus.tone === "ok" ? "bg-emerald-50 text-emerald-800" : inviteStatus.tone === "error" ? "bg-red-50 text-red-800" : "bg-sky-50 text-sky-800"}`}>{inviteStatus.message}</p>}</SettingsCard><SettingsCard title="Negocios"><div className="grid gap-3 lg:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Buscar por negocio o correo admin" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="flex gap-2 overflow-x-auto">{(["all", "real", "demo", "active", "inactive", "deleted"] as BusinessFilter[]).map((item) => <button key={item} className={`min-h-11 shrink-0 rounded-md border px-3 font-bold ${filter === item ? "border-brand bg-brand text-white" : "border-line bg-white"}`} onClick={() => setFilter(item)}>{item === "all" ? "Todos" : item === "real" ? "Reales" : item === "demo" ? "Demo" : item === "active" ? "Activos" : item === "inactive" ? "Inactivos" : "Eliminados"}</button>)}</div></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{visibleBusinesses.map((business) => { const admin = users.find((user) => user.businessId === business.id && user.role === "admin"); return <article key={business.id} className="rounded-md border border-line bg-white p-4 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{business.name}</h2><p className="text-sm text-slate-600">{business.email || admin?.email || "Sin correo"} · {business.phone || "Sin telefono"}</p><p className="mt-1 text-sm text-slate-600">Admin: {admin?.email ?? "Pendiente"}</p></div><div className="flex gap-2"><span className={`rounded-md px-3 py-2 text-sm font-bold ${business.demo ? "bg-yellow-100 text-yellow-900" : "bg-sky-100 text-sky-900"}`}>{business.demo ? "Demo" : "Real"}</span><span className={`rounded-md px-3 py-2 text-sm font-bold ${statusClass(business.status)}`}>{business.status}</span></div></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => { setDetailId(business.id); setDeleteText(""); }}>Detalle</button><button disabled={business.status === "deleted"} className="rounded-md bg-brand px-3 py-2 font-bold text-white disabled:opacity-40" onClick={() => onSupport(business.id)}>Soporte</button><button disabled={business.status === "deleted"} className="rounded-md border border-line px-3 py-2 font-bold disabled:opacity-40" onClick={() => updateBusiness(business.id, { status: business.status === "active" ? "inactive" : "active" })}>{business.status === "active" ? "Desactivar" : "Activar"}</button></div></article>; })}</div></SettingsCard>{detail && <SettingsCard title="Detalle del negocio"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{detail.name}</h2><p className="text-sm text-slate-600">{detail.demo ? "Demo" : "Real"} · {detail.status}</p></div><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => setDetailId(null)}>Cerrar detalle</button></div><div className="mt-4 grid gap-3 md:grid-cols-2"><TextField label="Nombre" value={detail.name} onChange={(value) => updateBusiness(detail.id, { name: value, commercialName: value })} /><TextField label="Telefono" value={detail.phone} onChange={(value) => updateBusiness(detail.id, { phone: value })} /><SummaryRow label="Correo" value={detail.email || "-"} /><SummaryRow label="Estado" value={detail.status} /><SummaryRow label="Tipo" value={detail.demo ? "Demo" : "Real"} /><SummaryRow label="Creado" value={detail.createdAt ? formatDateTime(detail.createdAt) : "-"} /><SummaryRow label="Total ordenes" value={String(detailOrders.length)} /><SummaryRow label="Total vendido" value={money.format(detailTotal)} /><SummaryRow label="Ultima actividad" value={detailLastActivity ? formatDateTime(detailLastActivity) : "-"} /><SummaryRow label="Admin asignado" value={detailUsers.find((user) => user.role === "admin")?.email ?? "Pendiente"} /></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={detail.status === "deleted"} className="rounded-md bg-brand px-3 py-2 font-bold text-white disabled:opacity-40" onClick={() => onSupport(detail.id)}>Entrar en soporte</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => resendAdminInvitation(detail.id)}>Reenviar invitacion admin</button></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="font-black">Usuarios y cajeros</h3><div className="mt-2 space-y-2">{detailUsers.map((user) => <div key={user.id} className="grid gap-2 rounded-md bg-surface p-3 text-sm md:grid-cols-[1fr_100px_auto] md:items-center"><span>{user.name} · {user.email}</span><strong>{user.role}</strong><button className="rounded-md border border-line bg-white px-3 py-2 font-bold" onClick={() => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))}>{user.status === "active" ? "Desactivar" : "Activar"}</button></div>)}</div></div><div><h3 className="font-black">Invitaciones</h3><div className="mt-2 space-y-2">{detailInvitations.map((invite) => <div key={invite.id} className="rounded-md bg-surface p-3 text-sm">{invite.email} · {invite.role} · <strong>{invite.status}</strong></div>)}</div></div></div><div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4"><h3 className="font-black text-red-900">Eliminar negocio</h3><p className="mt-1 text-sm text-red-800">Soft delete: se marcara como eliminado y se ocultara del listado principal. No se borran datos fisicos.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-red-200 px-3" placeholder="Escribe ELIMINAR para confirmar" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} /><button disabled={deleteText !== "ELIMINAR"} className="rounded-md bg-red-700 px-4 font-bold text-white disabled:opacity-40" onClick={() => { updateBusiness(detail.id, { status: "deleted" }); setDetailId(null); setDeleteText(""); }}>Eliminar negocio</button></div></div></SettingsCard>}</>}{tab === "invitations" && <SettingsCard title="Invitaciones"><div className="space-y-2">{invitations.map((invite) => <div key={invite.id} className="grid gap-2 rounded-md bg-surface p-3 text-sm md:grid-cols-[1fr_120px_auto]"><span>{invite.email} · {invite.role} · {businesses.find((business) => business.id === invite.businessId)?.name}</span><strong>{invite.status}</strong><button className="rounded-md border border-line bg-white px-3 py-2 font-bold" onClick={() => invite.role === "admin" ? resendAdminInvitation(invite.businessId) : setInviteStatus({ tone: "info", message: "Reenvio disponible para invitaciones admin desde este panel." })}>Reenviar</button></div>)}</div></SettingsCard>}{tab === "checklist" && <AccessChecklist />}</section></main>;
}

function SuperAdminPanelV4({ businesses, setBusinesses, users, setUsers, orders, onSupport, onLogout }: { businesses: Business[]; setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; orders: Order[]; onSupport: (businessId: string) => void; onLogout: () => void }) {
  type Tab = "businesses" | "users" | "subscriptions" | "deleted" | "checklist";
  const [tab, setTab] = useState<Tab>("businesses");
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", kind: "real" as "real" | "demo" });
  const [userDraft, setUserDraft] = useState({ businessId: businesses[0]?.id ?? "", email: "", name: "", role: "cajero" as Role });
  const [search, setSearch] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error" | "info"; message: string } | null>(null);
  const [credentials, setCredentials] = useState<null | { email: string; password: string; label: string }>(null);
  const activeBusinesses = businesses.filter((business) => business.status !== "deleted");
  const deletedBusinesses = businesses.filter((business) => business.status === "deleted");
  const visibleBusinesses = activeBusinesses.filter((business) => `${business.name} ${business.email} ${users.find((user) => user.businessId === business.id && user.role === "admin")?.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) ?? null;

  async function createBusiness() {
    try {
      setStatus({ tone: "info", message: "Creando negocio y usuario admin..." });
      const payload = await postAdminApi("/api/admin/create-business", { name: draft.name, admin_email: draft.email, phone: draft.phone, demo: draft.kind === "demo" });
      const business = mapBusinessRow(payload.business as Record<string, unknown>);
      const user = mapApiBusinessUser(payload.user as Record<string, unknown>, draft.email);
      setBusinesses((current) => [business, ...current.filter((item) => item.id !== business.id)]);
      setUsers((current) => [user, ...current.filter((item) => item.id !== user.id)]);
      setCredentials({ email: user.email, password: String(payload.temporary_password), label: `Admin de ${business.name}` });
      setDraft({ name: "", email: "", phone: "", kind: "real" });
      setStatus({ tone: "ok", message: "Negocio creado. Entrega las credenciales temporales al admin." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "No se pudo crear el negocio." });
    }
  }

  async function createUser() {
    try {
      setStatus({ tone: "info", message: "Creando usuario..." });
      const payload = await postAdminApi("/api/admin/users", { action: "create_user", business_id: userDraft.businessId, email: userDraft.email, full_name: userDraft.name, role: userDraft.role, permissions: defaultCashierPermissions });
      const user = mapApiBusinessUser(payload.user as Record<string, unknown>, userDraft.email);
      setUsers((current) => [user, ...current.filter((item) => item.id !== user.id)]);
      setCredentials({ email: user.email, password: String(payload.temporary_password), label: user.name });
      setUserDraft({ businessId: userDraft.businessId, email: "", name: "", role: "cajero" });
      setStatus({ tone: "ok", message: "Usuario creado con contrasena temporal." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "No se pudo crear usuario." });
    }
  }

  async function resetUserPassword(user: BusinessUser) {
    try {
      const payload = await postAdminApi("/api/admin/users", { action: "reset_password", business_id: user.businessId, business_user_id: user.id });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, forcePasswordChange: true } : item));
      setCredentials({ email: user.email, password: String(payload.temporary_password), label: user.name });
      setStatus({ tone: "ok", message: "Contrasena temporal generada." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "No se pudo resetear contrasena." });
    }
  }

  async function updateUser(user: BusinessUser, patch: Partial<BusinessUser>) {
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...patch } : item));
    try {
      await postAdminApi("/api/admin/users", { action: "update_user", business_id: user.businessId, business_user_id: user.id, full_name: patch.name, role: patch.role, status: patch.status, permissions: patch.permissions });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "No se pudo actualizar usuario." });
    }
  }

  async function deleteUser(user: BusinessUser) {
    if (!window.confirm(`Eliminar usuario ${user.email}?`)) return;
    try {
      await postAdminApi("/api/admin/users", { action: "delete_user", business_id: user.businessId, business_user_id: user.id });
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "No se pudo eliminar usuario." });
    }
  }

  async function deleteBusinessForever(business: Business) {
    try {
      await postAdminApi("/api/admin/delete-business", { business_id: business.id, confirmation: deleteText });
      setBusinesses((current) => current.filter((item) => item.id !== business.id));
      setUsers((current) => current.filter((user) => user.businessId !== business.id));
      setSelectedBusinessId(null);
      setDeleteText("");
      setStatus({ tone: "ok", message: "Negocio eliminado definitivamente." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "No se pudo eliminar negocio." });
    }
  }

  function copyCredentials() {
    if (!credentials) return;
    void navigator.clipboard.writeText(`Correo: ${credentials.email}\nContrasena temporal: ${credentials.password}`);
  }

  return <main className="min-h-screen bg-surface"><header className="border-b border-line bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><p className="text-sm font-bold text-brand">Super Admin</p><h1 className="text-2xl font-black">Panel del sistema</h1></div><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={onLogout}>Salir</button></div></header><section className="mx-auto max-w-7xl space-y-4 px-4 py-5"><InnerTabs current={tab} onChange={setTab} tabs={[{ id: "businesses", label: "Negocios" }, { id: "users", label: "Usuarios" }, { id: "subscriptions", label: "Suscripciones" }, { id: "deleted", label: "Eliminados" }, { id: "checklist", label: "Checklist" }]} />{status && <p className={`rounded-md p-3 text-sm font-bold ${status.tone === "ok" ? "bg-emerald-50 text-emerald-800" : status.tone === "error" ? "bg-red-50 text-red-800" : "bg-sky-50 text-sky-800"}`}>{status.message}</p>}{credentials && <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><h2 className="text-lg font-black">Credenciales temporales: {credentials.label}</h2><p className="mt-2 font-bold">Correo: {credentials.email}</p><p className="font-bold">Contrasena temporal: {credentials.password}</p><button className="mt-3 min-h-11 rounded-md bg-emerald-700 px-4 font-bold text-white" onClick={copyCredentials}>Copiar credenciales</button></section>}{tab === "businesses" && <><SettingsCard title="Crear negocio"><div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_160px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre negocio" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo admin" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Telefono" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as "real" | "demo" })}><option value="real">Real</option><option value="demo">Demo</option></select><button disabled={!draft.name.trim() || !draft.email.trim()} className="rounded-md bg-brand px-4 font-bold text-white disabled:opacity-40" onClick={createBusiness}>Crear</button></div></SettingsCard><SettingsCard title="Negocios"><input className="mb-4 min-h-11 w-full rounded-md border border-line px-3" placeholder="Buscar negocio o admin" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="grid gap-3 lg:grid-cols-2">{visibleBusinesses.map((business) => { const admin = users.find((user) => user.businessId === business.id && user.role === "admin"); const total = orders.filter((order) => order.businessId === business.id && order.status === "pagada").reduce((sum, order) => sum + order.total, 0); return <article key={business.id} className="rounded-md border border-line bg-white p-4 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{business.name}</h2><p className="text-sm text-slate-600">{business.phone || "Sin telefono"} · Admin: {admin?.email ?? business.email}</p><p className="mt-1 text-sm font-bold">{business.demo ? "Demo" : "Real"} · {business.status} · Vendido: {money.format(total)}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => setSelectedBusinessId(business.id)}>Editar negocio</button><button className="rounded-md bg-brand px-3 py-2 font-bold text-white" onClick={() => onSupport(business.id)}>Entrar como soporte</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => onSupport(business.id)}>Entrar como admin</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => setBusinesses((current) => current.map((item) => item.id === business.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))}>{business.status === "active" ? "Desactivar" : "Activar"}</button></div></article>; })}</div></SettingsCard>{selectedBusiness && <SettingsCard title="Editar negocio"><div className="grid gap-3 md:grid-cols-2"><TextField label="Nombre" value={selectedBusiness.name} onChange={(value) => setBusinesses((current) => current.map((item) => item.id === selectedBusiness.id ? { ...item, name: value, commercialName: value } : item))} /><TextField label="Telefono" value={selectedBusiness.phone} onChange={(value) => setBusinesses((current) => current.map((item) => item.id === selectedBusiness.id ? { ...item, phone: value } : item))} /><SummaryRow label="Tipo" value={selectedBusiness.demo ? "Demo" : "Real"} /><SummaryRow label="Usuarios" value={String(users.filter((user) => user.businessId === selectedBusiness.id).length)} /></div><div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4"><h3 className="font-black text-red-900">Eliminar definitivamente</h3><p className="mt-1 text-sm text-red-800">Borra negocio, usuarios relacionados y datos operativos. Esta accion no es soft delete.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input className="min-h-11 rounded-md border border-red-200 px-3" placeholder="ELIMINAR DEFINITIVAMENTE" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} /><button disabled={deleteText !== "ELIMINAR DEFINITIVAMENTE"} className="rounded-md bg-red-700 px-4 font-bold text-white disabled:opacity-40" onClick={() => deleteBusinessForever(selectedBusiness)}>Eliminar</button></div></div></SettingsCard>}</>}{tab === "users" && <><SettingsCard title="Crear usuario"><div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_160px_auto]"><select className="min-h-11 rounded-md border border-line px-3" value={userDraft.businessId} onChange={(event) => setUserDraft({ ...userDraft, businessId: event.target.value })}>{activeBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo" value={userDraft.email} onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre" value={userDraft.name} onChange={(event) => setUserDraft({ ...userDraft, name: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={userDraft.role} onChange={(event) => setUserDraft({ ...userDraft, role: event.target.value as Role })}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="cajero">Cajero</option></select><button disabled={!userDraft.businessId || !userDraft.email.trim()} className="rounded-md bg-brand px-4 font-bold text-white disabled:opacity-40" onClick={createUser}>Crear</button></div></SettingsCard><SettingsCard title="Usuarios"><div className="space-y-2">{users.filter((user) => user.role !== "super_admin").map((user) => <div key={user.id} className="grid gap-3 rounded-md border border-line p-3 lg:grid-cols-[1fr_180px_150px_auto] lg:items-center"><div><p className="font-bold">{user.name}</p><p className="text-sm text-slate-600">{user.email} · {businesses.find((business) => business.id === user.businessId)?.name ?? "Sin negocio"}{user.forcePasswordChange ? " · debe cambiar contrasena" : ""}</p></div><select className="min-h-10 rounded-md border border-line px-3" value={user.role} onChange={(event) => updateUser(user, { role: event.target.value as Role })}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="cajero">Cajero</option></select><button className={`rounded-md px-3 py-2 font-bold ${user.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`} onClick={() => updateUser(user, { status: user.status === "active" ? "inactive" : "active" })}>{user.status === "active" ? "Activo" : "Inactivo"}</button><div className="flex flex-wrap gap-2"><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => resetUserPassword(user)}>Resetear contrasena</button><IconButton title="Eliminar usuario" onClick={() => deleteUser(user)}><Trash2 size={18} /></IconButton></div></div>)}</div></SettingsCard></>}{tab === "subscriptions" && <SettingsCard title="Suscripciones"><div className="grid gap-3 lg:grid-cols-2">{activeBusinesses.map((business) => <div key={business.id} className="rounded-md border border-line p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{business.name}</p><p className="text-sm text-slate-600">{business.demo ? "Demo" : "Real"}</p></div><select className="min-h-10 rounded-md border border-line px-3" defaultValue={business.demo ? "demo" : "basico"}><option value="demo">Demo</option><option value="basico">Basico</option><option value="pro">Pro</option></select></div></div>)}</div></SettingsCard>}{tab === "deleted" && <SettingsCard title="Eliminados"><div className="space-y-2">{deletedBusinesses.length === 0 && <p className="rounded-md bg-surface p-3 text-sm">No hay negocios eliminados.</p>}{deletedBusinesses.map((business) => <div key={business.id} className="rounded-md bg-surface p-3 font-bold">{business.name}</div>)}</div></SettingsCard>}{tab === "checklist" && <AccessChecklist />}</section></main>;
}

function InnerTabs<T extends string>({ tabs, current, onChange }: { tabs: { id: T; label: string; icon?: ReactNode }[]; current: T; onChange: (tab: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-md border border-line bg-white p-2">
      {tabs.map((tab) => (
        <button key={tab.id} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md px-4 font-bold ${current === tab.id ? "bg-brand text-white" : "bg-surface text-ink"}`} onClick={() => onChange(tab.id)}>
          {tab.icon}{tab.label}
        </button>
      ))}
    </div>
  );
}

function TablesView({ role, tables, openOrders, setTables, activeBusinessId, activeShift, testMode, canOpenShift, openShift, openOrderForTable, createDirectOrder, openExistingOrder }: { role: Role; tables: RestaurantTable[]; openOrders: Order[]; setTables: React.Dispatch<React.SetStateAction<RestaurantTable[]>>; activeBusinessId: string; activeShift: CashShift | null; testMode: boolean; canOpenShift: boolean; openShift: (openingAmount: number, openingNote?: string) => void; openOrderForTable: (table: RestaurantTable) => void; createDirectOrder: (type: Exclude<OrderType, "mesa">) => void; openExistingOrder: (orderId: string) => void }) {
  const [configMode, setConfigMode] = useState(false);
  const [name, setName] = useState("");
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canEdit = role === "admin";
  const canSell = Boolean(activeShift) || testMode;
  const zones = ["Salon", "Terraza", "Barra", "Patio"];
  const updateTable = (id: string, patch: Partial<RestaurantTable>) => setTables((current) => current.map((table) => table.id === id ? { ...table, ...patch } : table));
  const tryOpenTable = (table: RestaurantTable) => {
    if (!canSell) return setShowOpenShift(true);
    openOrderForTable(table);
  };
  const tryCreateOrder = (type: Exclude<OrderType, "mesa">) => {
    if (!canSell) return setShowOpenShift(true);
    createDirectOrder(type);
  };
  const startDrag = (event: MouseEvent<HTMLDivElement>, table: RestaurantTable) => {
    if (!configMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDragging({ id: table.id, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top });
  };
  const dragTable = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    updateTable(dragging.id, { x: Math.max(0, event.clientX - rect.left - dragging.offsetX), y: Math.max(0, event.clientY - rect.top - dragging.offsetY) });
  };
  const statusClass = (status: TableStatus) => status === "libre" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : status === "ocupada" ? "bg-orange-100 text-orange-800 border-orange-300" : status === "esperando_pago" ? "bg-sky-100 text-sky-800 border-sky-300" : "bg-slate-200 text-slate-600 border-slate-300";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-white p-4 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-bold">Vender</h1><p className="mt-1 text-sm text-slate-600">Operacion diaria desde mesas, pickup, delivery y ordenes abiertas.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="flex min-h-12 items-center gap-2 rounded-md bg-accent px-4 py-2 font-bold text-white" onClick={() => tryCreateOrder("pickup")}><ShoppingBag size={20} /> Pickup</button>
          <button className="flex min-h-12 items-center gap-2 rounded-md bg-ink px-4 py-2 font-bold text-white" onClick={() => tryCreateOrder("delivery")}><PackagePlus size={20} /> Delivery</button>
          <button disabled={!canEdit} className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-white px-4 py-2 font-bold disabled:opacity-40" onClick={() => setConfigMode((value) => !value)}><Settings size={20} /> {configMode ? "Cerrar config." : "Configurar mapa"}</button>
        </div>
      </div>
      {!canSell && <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-900"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">No hay turno abierto. Abre turno para comenzar a vender.</p><button disabled={!canOpenShift} className="rounded-md bg-ink px-4 py-2 font-bold text-white disabled:opacity-40" onClick={() => setShowOpenShift(true)}>Abrir turno</button></div></div>}
      {showOpenShift && <div className="rounded-md border border-line bg-white p-4 shadow-soft"><OpenShiftPanel cashier="Caja" onOpen={(amount, note) => { openShift(amount, note); setShowOpenShift(false); }} /></div>}
      {openOrders.length > 0 && (
        <section className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Ordenes abiertas</h2>
            <span className="rounded-md bg-surface px-3 py-2 text-sm font-bold">{openOrders.length} activas</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {openOrders.map((order) => (
              <button key={order.id} className="rounded-md border border-line bg-surface p-3 text-left hover:border-brand" onClick={() => openExistingOrder(order.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black">Orden #{order.number}</p><p className="text-sm text-slate-600">{order.tableName ?? order.type}</p></div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-bold">{order.status.replace("_", " ")}</span>
                </div>
                <p className="mt-3 text-lg font-black text-brand">{money.format(order.total)}</p>
              </button>
            ))}
          </div>
        </section>
      )}
      {configMode && (
        <div className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-soft sm:grid-cols-[1fr_auto]">
          <input className="min-h-12 rounded-md border border-line px-3" placeholder="Nombre o numero de mesa" value={name} onChange={(event) => setName(event.target.value)} />
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand px-4 font-bold text-white" onClick={() => { if (!name.trim()) return; setTables((current) => [...current, { id: createId("table"), businessId: activeBusinessId, name: name.trim(), status: "libre", sortOrder: current.length + 1, x: 60, y: 60, width: 110, height: 90, shape: "rectangle", zone: "Salon" }]); setName(""); }}><Plus size={20} /> Crear mesa</button>
        </div>
      )}
      <div className="hidden overflow-auto rounded-md border border-line bg-white p-4 shadow-soft md:block">
        <div className="relative h-[560px] min-w-[760px] rounded-md bg-surface" onMouseMove={dragTable} onMouseUp={() => setDragging(null)} onMouseLeave={() => setDragging(null)}>
          {tables.map((table) => {
            const shape = table.shape ?? "rectangle";
            return <div key={table.id} className={`absolute border-2 p-2 shadow-soft ${configMode ? "cursor-move" : ""} ${statusClass(table.status)} ${shape === "circle" ? "rounded-full" : "rounded-md"}`} style={{ left: table.x ?? 40, top: table.y ?? 40, width: table.width ?? 110, height: table.height ?? 90 }} onMouseDown={(event) => startDrag(event, table)}>
              <button className="flex h-full w-full flex-col items-center justify-center text-center" onClick={() => !configMode && tryOpenTable(table)}>
                {configMode ? <input className="w-full rounded-md border border-line bg-white px-2 py-1 text-center font-black" value={table.name} onChange={(event) => updateTable(table.id, { name: event.target.value })} /> : <strong>{table.name}</strong>}
                <span className="mt-1 text-xs font-bold">{table.zone ?? "Salon"}</span>
              </button>
              {configMode && <div className="absolute left-0 top-full z-10 mt-2 grid w-64 gap-2 rounded-md border border-line bg-white p-2 text-xs shadow-soft">
                <div className="grid grid-cols-4 gap-1">
                  <input className="rounded border px-1 py-1" type="number" value={table.x ?? 0} onChange={(event) => updateTable(table.id, { x: Number(event.target.value) || 0 })} />
                  <input className="rounded border px-1 py-1" type="number" value={table.y ?? 0} onChange={(event) => updateTable(table.id, { y: Number(event.target.value) || 0 })} />
                  <input className="rounded border px-1 py-1" type="number" value={table.width ?? 110} onChange={(event) => updateTable(table.id, { width: Math.max(60, Number(event.target.value) || 60) })} />
                  <input className="rounded border px-1 py-1" type="number" value={table.height ?? 90} onChange={(event) => updateTable(table.id, { height: Math.max(50, Number(event.target.value) || 50) })} />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <select className="rounded border px-1 py-1" value={table.shape ?? "rectangle"} onChange={(event) => updateTable(table.id, { shape: event.target.value as RestaurantTable["shape"] })}><option value="square">Cuadrada</option><option value="rectangle">Rectangular</option><option value="circle">Redonda</option></select>
                  <select className="rounded border px-1 py-1" value={table.zone ?? "Salon"} onChange={(event) => updateTable(table.id, { zone: event.target.value })}>{zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select>
                  <select className="rounded border px-1 py-1" value={table.status} onChange={(event) => updateTable(table.id, { status: event.target.value as TableStatus })}><option value="libre">Libre</option><option value="ocupada">Ocupada</option><option value="esperando_pago">Esperando pago</option><option value="bloqueada">Bloqueada</option></select>
                </div>
                <button className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-bold text-red-800" onClick={() => setTables((current) => current.filter((item) => item.id !== table.id))}>Eliminar</button>
              </div>}
            </div>;
          })}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {tables.map((table) => (
          <article key={table.id} className="rounded-md border border-line bg-white p-4 shadow-soft">
            <button className="w-full text-left" onClick={() => !configMode && tryOpenTable(table)}>
              <div className="flex items-start justify-between gap-3">
                {configMode ? <input className="w-full rounded-md border border-line bg-surface px-2 py-2 text-xl font-bold outline-none" value={table.name} onChange={(event) => setTables((current) => current.map((item) => item.id === table.id ? { ...item, name: event.target.value } : item))} /> : <h2 className="text-xl font-bold">{table.name}</h2>}
                <span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusClass(table.status)}`}>{table.status.replace("_", " ")}</span>
              </div>
              <p className="mt-8 text-sm font-semibold text-slate-600">{configMode ? "Editando mapa" : "Tocar para abrir orden"}</p>
            </button>
            {configMode && <div className="mt-3 flex gap-2">
              <IconButton title="Mover izquierda" onClick={() => updateTable(table.id, { x: (table.x ?? 0) - 20 })}><ArrowUp size={18} /></IconButton>
              <IconButton title="Mover derecha" onClick={() => updateTable(table.id, { x: (table.x ?? 0) + 20 })}><ArrowDown size={18} /></IconButton>
              <IconButton title="Eliminar mesa" onClick={() => setTables((current) => current.filter((item) => item.id !== table.id).map((item, index) => ({ ...item, sortOrder: index + 1 })))}><Trash2 size={18} /></IconButton>
            </div>}
          </article>
        ))}
      </div>
    </div>
  );
}

function MenuManager({ canEdit, activeBusinessId, categories, setCategories, products, setProducts, additions, setAdditions }: { canEdit: boolean; activeBusinessId: string; categories: Category[]; setCategories: React.Dispatch<React.SetStateAction<Category[]>>; products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; additions: Addition[]; setAdditions: React.Dispatch<React.SetStateAction<Addition[]>> }) {
  const [tab, setTab] = useState<MenuTab>("categorias");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { type: "category" | "product" | "addition"; id?: string }>(null);
  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));
  const filteredAdditions = additions.filter((addition) => addition.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <InnerTabs current={tab} onChange={setTab} tabs={[
        { id: "categorias", label: "Categorias" },
        { id: "productos", label: "Productos" },
        { id: "adiciones", label: "Adiciones / Extras" },
        { id: "vinculos", label: "Vinculacion de extras", icon: <Link2 size={18} /> }
      ]} />
      {tab !== "vinculos" && <SearchBar value={search} onChange={setSearch} />}
      {tab === "categorias" && (
        <AdminList title="Categorias" addLabel="Crear categoria" canEdit={canEdit} onAdd={() => setModal({ type: "category" })}>
          {categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase())).map((category) => (
            <AdminRow key={category.id} title={category.name} detail={`${products.filter((product) => product.categoryId === category.id).length} productos`} canEdit={canEdit} onEdit={() => setModal({ type: "category", id: category.id })} onDelete={() => setCategories((current) => current.filter((item) => item.id !== category.id))} />
          ))}
        </AdminList>
      )}
      {tab === "productos" && (
        <AdminList title="Productos" addLabel="Crear producto" canEdit={canEdit} onAdd={() => setModal({ type: "product" })}>
          {filteredProducts.map((product) => (
            <AdminRow key={product.id} title={`${product.name} · ${money.format(product.price)}`} detail={`${categories.find((category) => category.id === product.categoryId)?.name ?? "Sin categoria"} · ${product.active ? "Activo" : "Inactivo"}`} canEdit={canEdit} onEdit={() => setModal({ type: "product", id: product.id })} onDelete={() => setProducts((current) => current.filter((item) => item.id !== product.id))} />
          ))}
        </AdminList>
      )}
      {tab === "adiciones" && (
        <AdminList title="Adiciones / Extras" addLabel="Crear extra" canEdit={canEdit} onAdd={() => setModal({ type: "addition" })}>
          {filteredAdditions.map((addition) => (
            <AdminRow key={addition.id} title={`${addition.name} · ${money.format(addition.price)}`} detail={`${addition.productIds.length} productos vinculados`} canEdit={canEdit} onEdit={() => setModal({ type: "addition", id: addition.id })} onDelete={() => setAdditions((current) => current.filter((item) => item.id !== addition.id))} />
          ))}
        </AdminList>
      )}
      {tab === "vinculos" && <ExtraLinks canEdit={canEdit} products={products} additions={additions} setAdditions={setAdditions} />}
      {modal?.type === "category" && <CategoryModal category={categories.find((item) => item.id === modal.id)} onClose={() => setModal(null)} onSave={(category) => { setCategories((current) => modal.id ? current.map((item) => item.id === modal.id ? { ...item, ...category } : item) : [...current, { id: createId("cat"), businessId: activeBusinessId, name: category.name }]); setModal(null); }} />}
      {modal?.type === "product" && <ProductModal product={products.find((item) => item.id === modal.id)} categories={categories} onClose={() => setModal(null)} onSave={(product) => { setProducts((current) => modal.id ? current.map((item) => item.id === modal.id ? { ...item, ...product } : item) : [...current, { id: createId("prod"), businessId: activeBusinessId, ...product }]); setModal(null); }} />}
      {modal?.type === "addition" && <AdditionModal addition={additions.find((item) => item.id === modal.id)} onClose={() => setModal(null)} onSave={(addition) => { setAdditions((current) => modal.id ? current.map((item) => item.id === modal.id ? { ...item, ...addition } : item) : [...current, { id: createId("add"), businessId: activeBusinessId, productIds: [], ...addition }]); setModal(null); }} />}
    </div>
  );
}

function ExtraLinks({ canEdit, products, additions, setAdditions }: { canEdit: boolean; products: Product[]; additions: Addition[]; setAdditions: React.Dispatch<React.SetStateAction<Addition[]>> }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId);
  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <div className="grid gap-3 md:grid-cols-[320px_1fr]">
        <select className="min-h-12 rounded-md border border-line px-3" value={productId} onChange={(event) => setProductId(event.target.value)}>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <div className="rounded-md bg-surface p-3 text-sm font-semibold">Selecciona los extras permitidos para {product?.name ?? "el producto"}.</div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {additions.map((addition) => {
          const checked = addition.productIds.includes(productId);
          return (
            <label key={addition.id} className={`flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 font-semibold ${checked ? "border-brand bg-emerald-50 text-brand" : "border-line bg-surface"}`}>
              <span>{addition.name} · {money.format(addition.price)}</span>
              <input disabled={!canEdit} type="checkbox" checked={checked} onChange={() => setAdditions((current) => current.map((item) => item.id === addition.id ? { ...item, productIds: checked ? item.productIds.filter((id) => id !== productId) : [...item.productIds, productId] } : item))} />
            </label>
          );
        })}
      </div>
    </section>
  );
}

function OrderDrawer({ business, settings, activeShift, role, can, currentUser, order, categories, products, additions, printMode, setPrintMode, onClose, addProduct, updateOrder, appendAudit, confirmKitchen, printPrecheck, closeOrder, cancelOrder }: { business: Business; settings: AppSettings; activeShift: CashShift | null; role: Role; can: (permission: keyof CashierPermissions) => boolean; currentUser: string; order: Order; categories: Category[]; products: Product[]; additions: Addition[]; printMode: PrintMode; setPrintMode: (mode: PrintMode) => void; onClose: () => void; addProduct: (product: Product) => void; updateOrder: (orderId: string, updater: (order: Order) => Order) => void; appendAudit: (orderId: string, action: string, reason?: string) => void; confirmKitchen: (order: Order) => void; printPrecheck: (order: Order) => void; closeOrder: (order: Order, method: PaymentMethod) => void; cancelOrder: (order: Order, reason: string) => void }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [paying, setPaying] = useState(false);
  const [reasonRequest, setReasonRequest] = useState<null | { itemId?: string; action: "remove" | "cancel" }>(null);
  const canEdit = !["pagada", "cancelada", "anulada"].includes(order.status);
  const filteredProducts = products.filter((product) => product.active && (categoryId === "all" || product.categoryId === categoryId) && product.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 z-30 bg-ink/40">
      <aside className="no-print ml-auto flex h-full w-full max-w-6xl flex-col bg-surface shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div><h2 className="text-2xl font-black">Orden #{order.number}</h2><p className="text-sm text-slate-600">{order.tableName ?? order.type} · {order.status.replace("_", " ")} · {order.cashier}</p></div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!order.items.length || !canEdit || !can("confirmKitchen")} className="flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 font-bold text-white disabled:bg-slate-400" onClick={() => confirmKitchen(order)}><ChefHat size={18} /> Confirmar</button>
            <button disabled={!order.items.length || !canEdit} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-4 font-bold disabled:opacity-40" onClick={() => printPrecheck(order)}><Printer size={18} /> Precuenta</button>
            <button disabled={!activeShift || !order.items.length || !canEdit || !can("chargeOrders")} className="flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 font-bold text-white disabled:bg-slate-400" onClick={() => setPaying((value) => !value)}><Banknote size={18} /> Cobrar</button>
            <IconButton title="Cerrar" onClick={onClose}><X size={20} /></IconButton>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_440px]">
          <section className="min-h-0 overflow-y-auto rounded-md border border-line bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <SearchBar value={search} onChange={setSearch} />
              <select className="min-h-12 rounded-md border border-line px-3" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="all">Todas las categorias</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button disabled={!canEdit || ((order.status === "comandada" || order.status === "esperando_pago") && !can("editAfterKitchen"))} key={product.id} className="min-h-28 rounded-md border border-line bg-surface p-4 text-left hover:border-brand disabled:opacity-50" onClick={() => addProduct(product)}>
                  <div className="flex items-start justify-between gap-2"><span className="text-lg font-bold">{product.name}</span><span className="font-bold text-brand">{money.format(product.price)}</span></div>
                  <p className="mt-2 text-sm text-slate-600">{product.description}</p>
                </button>
              ))}
            </div>
          </section>
          <section className="min-h-0 overflow-y-auto rounded-md border border-line bg-white p-4">
            {order.items.length === 0 && <p className="rounded-md border border-dashed border-line p-4 text-center text-slate-500">Agrega productos del menu.</p>}
            <div className="space-y-3">
              {order.items.map((item) => (
                <OrderItemEditor key={item.id} currentUser={currentUser} order={order} item={item} additions={additions.filter((addition) => addition.productIds.includes(item.productId))} updateOrder={updateOrder} appendAudit={appendAudit} disabled={!canEdit} canRemove={can("removeOrderItems")} canEditAfterKitchen={can("editAfterKitchen")} tipEnabled={settings.checkout.tipEnabled} requestReason={() => setReasonRequest({ itemId: item.id, action: "remove" })} />
              ))}
            </div>
            <Totals order={order} receipt={settings.receipt} />
            {canEdit && <button disabled={!can("cancelOrders")} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 font-bold text-red-800 disabled:opacity-40" onClick={() => setReasonRequest({ action: "cancel" })}><Trash2 size={18} /> Cancelar orden</button>}
            {paying && <PaymentBox settings={settings} order={order} updateOrder={updateOrder} closeOrder={closeOrder} />}
            {order.status === "pagada" && <button className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 font-bold text-white" onClick={() => setPrintMode("recibo")}><ReceiptText size={20} /> Ver recibo</button>}
          </section>
        </div>
      </aside>
      {reasonRequest && <ReasonModal onClose={() => setReasonRequest(null)} onConfirm={(reason) => {
        if (reasonRequest.action === "remove" && reasonRequest.itemId) updateOrder(order.id, (current) => ({ ...current, items: current.items.filter((item) => item.id !== reasonRequest.itemId), audit: [...current.audit, audit(currentUser, "Producto eliminado despues de comanda", reason)] }));
        if (reasonRequest.action === "cancel") cancelOrder(order, reason);
        setReasonRequest(null);
      }} />}
      {printMode && <PrintModal business={business} settings={settings} order={order} mode={printMode} role={role} onClose={() => setPrintMode(null)} onPrint={(label) => appendAudit(order.id, label)} />}
    </div>
  );
}

function OrderItemEditor({ currentUser, order, item, additions, updateOrder, appendAudit, disabled, canRemove, canEditAfterKitchen, requestReason }: { currentUser: string; order: Order; item: OrderItem; additions: Addition[]; updateOrder: (orderId: string, updater: (order: Order) => Order) => void; appendAudit: (orderId: string, action: string, reason?: string) => void; disabled: boolean; canRemove: boolean; canEditAfterKitchen: boolean; tipEnabled?: boolean; requestReason: () => void }) {
  const needsKitchenReason = order.status === "comandada" || order.status === "esperando_pago";
  const locked = needsKitchenReason && !canEditAfterKitchen;
  const changeQty = (quantity: number) => updateOrder(order.id, (current) => ({ ...current, items: current.items.map((row) => row.id === item.id ? { ...row, quantity: Math.max(1, quantity) } : row), audit: [...current.audit, audit(currentUser, `Cantidad modificada: ${item.productName}`)] }));
  const toggleAddition = (addition: Addition) => updateOrder(order.id, (current) => ({ ...current, items: current.items.map((row) => {
    if (row.id !== item.id) return row;
    const exists = row.additions.some((selected) => selected.additionId === addition.id);
    const selectedAddition: OrderItemAddition = { id: createId("item-add"), additionId: addition.id, name: addition.name, price: addition.price };
    return { ...row, additions: exists ? row.additions.filter((selected) => selected.additionId !== addition.id) : [...row.additions, selectedAddition] };
  }), audit: [...current.audit, audit(currentUser, `Extra modificado: ${item.productName}`)] }));
  return (
    <article className="rounded-md border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-bold">{item.productName}</p><p className="text-sm text-slate-600">{money.format(itemUnitTotal(item))} c/u</p></div>
        <div className="flex items-center gap-2">
          <IconButton disabled={disabled || locked} title="Restar" onClick={() => changeQty(item.quantity - 1)}><Minus size={16} /></IconButton>
          <span className="w-8 text-center font-bold">{item.quantity}</span>
          <IconButton disabled={disabled || locked} title="Sumar" onClick={() => changeQty(item.quantity + 1)}><Plus size={16} /></IconButton>
        </div>
      </div>
      {additions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{additions.map((addition) => {
        const selected = item.additions.some((selectedAddition) => selectedAddition.additionId === addition.id);
        return <button disabled={disabled || locked} key={addition.id} className={`rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${selected ? "border-brand bg-emerald-50 text-brand" : "border-line bg-surface"}`} onClick={() => toggleAddition(addition)}>{addition.name} +{money.format(addition.price)}</button>;
      })}</div>}
      <textarea disabled={disabled || locked} className="mt-3 min-h-20 w-full rounded-md border border-line p-2 disabled:bg-slate-100" placeholder="Nota: sin cebolla, extra queso..." value={item.notes ?? ""} onChange={(event) => updateOrder(order.id, (current) => ({ ...current, items: current.items.map((row) => row.id === item.id ? { ...row, notes: event.target.value } : row), audit: [...current.audit, audit(currentUser, `Nota modificada: ${item.productName}`)] }))} />
      <button disabled={disabled || !canRemove} className="mt-2 flex min-h-10 items-center gap-2 rounded-md border border-line px-3 font-semibold disabled:opacity-40" onClick={() => needsKitchenReason ? requestReason() : updateOrder(order.id, (current) => ({ ...current, items: current.items.filter((row) => row.id !== item.id), audit: [...current.audit, audit(currentUser, `Producto eliminado: ${item.productName}`)] }))}><Trash2 size={16} /> Quitar</button>
    </article>
  );
}

function PaymentBox({ settings, order, updateOrder, closeOrder }: { settings: AppSettings; order: Order; updateOrder: (orderId: string, updater: (order: Order) => Order) => void; closeOrder: (order: Order, method: PaymentMethod) => void }) {
  return (
    <div className="mt-4 rounded-md border border-line bg-surface p-3">
      {settings.checkout.tipEnabled && (
        <>
          <label className="block text-sm font-bold">Propina opcional</label>
          {settings.checkout.tipMode === "suggested" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {settings.checkout.suggestedTips.map((tip) => (
                <button key={tip} className="min-h-10 rounded-md border border-line bg-white px-3 font-bold" onClick={() => updateOrder(order.id, (current) => ({ ...current, tip: current.subtotal * tip }))}>
                  {Math.round(tip * 100)}%
                </button>
              ))}
              <button className="min-h-10 rounded-md border border-line bg-white px-3 font-bold" onClick={() => updateOrder(order.id, (current) => ({ ...current, tip: 0 }))}>Sin propina</button>
            </div>
          )}
          {settings.checkout.tipMode !== "none" && <input className="mt-2 min-h-12 w-full rounded-md border border-line px-3" type="number" value={order.tip} onChange={(event) => updateOrder(order.id, (current) => ({ ...current, tip: Number(event.target.value) || 0 }))} />}
        </>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {settings.paymentMethods.filter((method) => method.active).map((method) => (
          <button key={method.id} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 font-bold hover:border-brand" onClick={() => closeOrder(order, method.method)}>
            {method.method === "tarjeta" ? <CreditCard size={18} /> : <Banknote size={18} />}{method.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function SalesView({ orders, shifts, setActiveOrderId, setPrintMode }: { orders: Order[]; shifts: CashShift[]; setActiveOrderId: (id: string) => void; setPrintMode: (mode: PrintMode) => void }) {
  const [tab, setTab] = useState<"cuadres" | "pedidos" | "recibos">("cuadres");
  const paidOrders = orders.filter((order) => order.status === "pagada");
  return (
    <div className="space-y-4">
      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h1 className="text-2xl font-black">Ventas</h1>
        <p className="mt-1 text-sm text-slate-600">Historial, cuadres de caja y documentos finales. La toma de pedidos vive en Vender.</p>
        <InnerTabs current={tab} onChange={setTab} tabs={[
          { id: "cuadres", label: "Cuadres de caja" },
          { id: "pedidos", label: "Pedidos" },
          { id: "recibos", label: "Facturas finales / Recibos" }
        ]} />
      </section>
      {tab === "cuadres" && <ShiftHistory shifts={shifts} orders={orders} />}
      {tab === "pedidos" && <OrdersHistory orders={orders} setActiveOrderId={setActiveOrderId} setPrintMode={setPrintMode} />}
      {tab === "recibos" && <ReceiptsHistory orders={paidOrders} setActiveOrderId={setActiveOrderId} setPrintMode={setPrintMode} />}
    </div>
  );
}

function ReceiptsHistory({ orders, setActiveOrderId, setPrintMode }: { orders: Order[]; setActiveOrderId: (id: string) => void; setPrintMode: (mode: PrintMode) => void }) {
  const [preset, setPreset] = useState<DatePreset>("hoy");
  const [range, setRange] = useState(getPresetRange("hoy"));
  const activeRange = preset === "rango" ? range : getPresetRange(preset);
  const filtered = orders.filter((order) => inDateRange(order.closedAt ?? order.createdAt, activeRange.from, activeRange.to));
  return (
    <div className="space-y-4">
      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="text-xl font-bold">Facturas finales / Recibos</h2>
        <DatePresetButtons preset={preset} setPreset={setPreset} />
        {preset === "rango" && <DateRangeInputs range={range} setRange={setRange} />}
      </section>
      <section className="overflow-x-auto rounded-md border border-line bg-white shadow-soft">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-surface text-left"><tr>{["Recibo", "Fecha", "Cliente", "Mesa/tipo", "Total", "Metodo", ""].map((head) => <th key={head} className="p-3">{head}</th>)}</tr></thead>
          <tbody>{filtered.map((order) => <tr key={order.id} className="border-t border-line">
            <td className="p-3 font-bold">R-{String(order.number).padStart(5, "0")}</td>
            <td className="p-3">{formatDateTime(order.closedAt ?? order.createdAt)}</td>
            <td className="p-3">-</td>
            <td className="p-3">{order.tableName ?? order.type}</td>
            <td className="p-3 font-bold">{money.format(order.total)}</td>
            <td className="p-3">{order.paymentMethod ?? "-"}</td>
            <td className="p-3"><button className="min-h-10 rounded-md border border-line px-3 font-bold" onClick={() => { setActiveOrderId(order.id); setPrintMode("recibo"); }}>Reimprimir recibo</button></td>
          </tr>)}</tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-600">Sin recibos en este periodo.</p>}
      </section>
    </div>
  );
}

function OrdersHistory({ orders, setActiveOrderId, setPrintMode }: { orders: Order[]; setActiveOrderId: (id: string) => void; setPrintMode: (mode: PrintMode) => void }) {
  const [preset, setPreset] = useState<DatePreset>("hoy");
  const today = getPresetRange("hoy");
  const [range, setRange] = useState(today);
  const [filters, setFilters] = useState({ status: "all", type: "all", method: "all" });
  const activeRange = preset === "rango" ? range : getPresetRange(preset);
  const filtered = orders.filter((order) => inDateRange(order.createdAt, activeRange.from, activeRange.to) && (filters.status === "all" || order.status === filters.status) && (filters.type === "all" || order.type === filters.type) && (filters.method === "all" || order.paymentMethod === filters.method));
  return (
    <div className="space-y-4">
      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h1 className="text-2xl font-bold">Historial de ordenes</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["hoy", "ayer", "semana", "mes", "anio", "rango"] as DatePreset[]).map((value) => <button key={value} className={`min-h-11 rounded-md border px-4 font-bold ${preset === value ? "border-brand bg-brand text-white" : "border-line bg-white"}`} onClick={() => setPreset(value)}>{presetLabel(value)}</button>)}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          {preset === "rango" ? <><input className="min-h-11 rounded-md border border-line px-3" type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} /></> : <div className="rounded-md bg-surface px-3 py-3 text-sm font-bold md:col-span-2">{activeRange.from} / {activeRange.to}</div>}
          <select className="min-h-11 rounded-md border border-line px-3" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">Todos los estados</option>{(["abierta", "comandada", "esperando_pago", "pagada", "cancelada"] as OrderStatus[]).map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select>
          <select className="min-h-11 rounded-md border border-line px-3" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="all">Todos los tipos</option><option value="mesa">Mesa</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select>
          <select className="min-h-11 rounded-md border border-line px-3" value={filters.method} onChange={(event) => setFilters({ ...filters, method: event.target.value })}><option value="all">Todos los pagos</option>{["efectivo", "tarjeta", "transferencia", "ATH", "Zelle", "otro"].map((method) => <option key={method} value={method}>{method}</option>)}</select>
        </div>
      </section>
      <section className="overflow-x-auto rounded-md border border-line bg-white shadow-soft">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-surface text-left"><tr>{["Orden", "Fecha/hora", "Mesa/tipo", "Estado", "Total", "Metodo", "Usuario", ""].map((head) => <th key={head} className="p-3">{head}</th>)}</tr></thead>
          <tbody>{filtered.map((order) => <tr key={order.id} className="border-t border-line">
            <td className="p-3 font-bold">#{order.number}</td><td className="p-3">{formatDateTime(order.createdAt)}</td><td className="p-3">{order.tableName ?? order.type}</td><td className="p-3">{order.status.replace("_", " ")}</td><td className="p-3 font-bold">{money.format(order.total)}</td><td className="p-3">{order.paymentMethod ?? "-"}</td><td className="p-3">{order.cashier ?? "-"}</td>
            <td className="p-3"><div className="flex gap-2"><IconButton title="Ver detalle" onClick={() => { setActiveOrderId(order.id); setPrintMode("detalle"); }}><Eye size={18} /></IconButton><IconButton title="Reimprimir comanda" onClick={() => { setActiveOrderId(order.id); setPrintMode("comanda"); }}><ChefHat size={18} /></IconButton><IconButton title="Reimprimir precuenta" onClick={() => { setActiveOrderId(order.id); setPrintMode("precuenta"); }}><Printer size={18} /></IconButton>{order.status === "pagada" && <IconButton title="Reimprimir recibo" onClick={() => { setActiveOrderId(order.id); setPrintMode("recibo"); }}><ReceiptText size={18} /></IconButton>}</div></td>
          </tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}

function SettingsView({ business, setBusiness, settings, setSettings, users, setUsers, invitations, setInvitations, activeBusinessId, currentUser }: { business: Business; setBusiness: React.Dispatch<React.SetStateAction<Business>>; settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>>; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; invitations: Invitation[]; setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>; activeBusinessId: string; currentUser: string }) {
  const [tab, setTab] = useState<SettingsTab>("negocio");
  return (
    <div className="space-y-4">
      <InnerTabs current={tab} onChange={setTab} tabs={[
        { id: "negocio", label: "Negocio" }, { id: "cobro", label: "Cobro" }, { id: "recibo", label: "Recibo" }, { id: "comanda", label: "Comanda" }, { id: "impresion", label: "Impresion" }, { id: "pagos", label: "Metodos de pago" }, { id: "usuarios", label: "Usuarios y permisos" }
      ]} />
      {tab === "negocio" && <BusinessSettings business={business} setBusiness={setBusiness} />}
      {tab === "cobro" && <CheckoutSettingsView settings={settings.checkout} setSettings={(checkout) => setSettings((current) => ({ ...current, checkout, receipt: { ...current.receipt, showTip: checkout.tipEnabled } }))} />}
      {tab === "recibo" && <ReceiptSettingsView business={business} setBusiness={setBusiness} settings={settings.receipt} setSettings={(receipt) => setSettings((current) => ({ ...current, receipt }))} />}
      {tab === "comanda" && <KitchenSettingsView settings={settings.kitchen} setSettings={(kitchen) => setSettings((current) => ({ ...current, kitchen }))} />}
      {tab === "impresion" && <PrintingSettingsView settings={settings} setSettings={setSettings} />}
      {tab === "pagos" && <PaymentSettings methods={settings.paymentMethods} setMethods={(paymentMethods) => setSettings((current) => ({ ...current, paymentMethods }))} />}
      {tab === "usuarios" && <BusinessUsersSettings businessId={activeBusinessId} users={users} setUsers={setUsers} defaultPermissions={settings.cashierPermissions} setDefaultPermissions={(cashierPermissions) => setSettings((current) => ({ ...current, cashierPermissions }))} />}
    </div>
  );
}

function BusinessSettings({ business, setBusiness }: { business: Business; setBusiness: React.Dispatch<React.SetStateAction<Business>> }) {
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (supabase) {
      const path = `logos/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
        setBusiness((current) => ({ ...current, logoUrl: data.publicUrl }));
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = () => setBusiness((current) => ({ ...current, logoUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  return <SettingsCard title="Negocio"><div className="mb-4 flex flex-wrap items-center gap-3">{business.logoUrl && <img src={business.logoUrl} alt="Logo" className="size-20 rounded-md border border-line object-cover" />}<label className="min-h-11 cursor-pointer rounded-md border border-line bg-white px-4 py-3 font-bold">Subir logo<input className="hidden" type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>{business.logoUrl && <button className="min-h-11 rounded-md border border-line px-4 font-bold" onClick={() => setBusiness((current) => ({ ...current, logoUrl: undefined }))}>Quitar logo</button>}<span className="rounded-md bg-surface px-3 py-2 text-sm font-bold">COP · America/Bogota</span></div><div className="grid gap-3 md:grid-cols-2">{[
    ["name", "Nombre del negocio"], ["commercialName", "Nombre comercial"], ["nit", "NIT opcional"], ["logoUrl", "Logo opcional"], ["address", "Direccion"], ["phone", "Telefono"], ["email", "Email"]
  ].map(([key, label]) => <label key={key} className="space-y-1"><span className="text-sm font-bold">{label}</span><input className="min-h-11 w-full rounded-md border border-line px-3" value={String(business[key as keyof Business] ?? "")} onChange={(event) => setBusiness((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
  </div></SettingsCard>;
}

function CheckoutSettingsView({ settings, setSettings }: { settings: AppSettings["checkout"]; setSettings: (settings: AppSettings["checkout"]) => void }) {
  return <SettingsCard title="Cobro"><div className="grid gap-3 md:grid-cols-2">
    <Toggle label="Propina activa" checked={settings.tipEnabled} onChange={(value) => setSettings({ ...settings, tipEnabled: value, tipMode: value ? settings.tipMode : "none" })} />
    <label className="space-y-1"><span className="text-sm font-bold">Modo de propina</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={settings.tipMode} onChange={(event) => setSettings({ ...settings, tipMode: event.target.value as AppSettings["checkout"]["tipMode"] })}><option value="manual">Manual</option><option value="suggested">Sugeridas: 5%, 10%, 15%</option><option value="none">Sin propina</option></select></label>
  </div></SettingsCard>;
}

function PrintingSettingsView({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  return <SettingsCard title="Impresion"><div className="grid gap-5 lg:grid-cols-[1fr_360px_360px]"><div className="space-y-3">
    <label className="space-y-1"><span className="text-sm font-bold">Tipo de impresion</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={settings.printing.type} onChange={(event) => setSettings((current) => ({ ...current, printing: { ...current.printing, type: event.target.value as AppSettings["printing"]["type"] } }))}><option value="browser">Navegador</option></select></label>
    <label className="space-y-1"><span className="text-sm font-bold">Tamano de papel</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={settings.printing.receiptPaperSize} onChange={(event) => setSettings((current) => ({ ...current, printing: { ...current.printing, receiptPaperSize: event.target.value as AppSettings["printing"]["receiptPaperSize"], kitchenPaperSize: event.target.value as AppSettings["printing"]["kitchenPaperSize"] }, receipt: { ...current.receipt, size: event.target.value as ReceiptSettings["size"] }, kitchen: { ...current.kitchen, size: event.target.value as KitchenSettings["size"] } }))}><option value="58mm">58mm</option><option value="80mm">80mm</option></select></label>
    <p className="rounded-md bg-surface p-3 text-sm text-slate-700">Para imprimir, instala tu impresora termica en el computador y seleccionala en el cuadro de impresion del navegador.</p>
    <button className="min-h-11 rounded-md bg-ink px-4 font-bold text-white" onClick={() => printService({ type: "browser", label: "Recibo de prueba" })}>Imprimir recibo de prueba</button>
    <button className="min-h-11 rounded-md border border-line bg-white px-4 font-bold" onClick={() => printService({ type: "browser", label: "Comanda de prueba" })}>Imprimir comanda de prueba</button>
  </div><PreviewReceipt settings={settings.receipt} /><PreviewKitchen settings={settings.kitchen} /></div></SettingsCard>;
}

function ReceiptSettingsView({ business, setBusiness, settings, setSettings }: { business: Business; setBusiness: React.Dispatch<React.SetStateAction<Business>>; settings: ReceiptSettings; setSettings: (settings: ReceiptSettings) => void }) {
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (supabase) {
      const path = `logos/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
        setBusiness((current) => ({ ...current, logoUrl: data.publicUrl }));
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = () => setBusiness((current) => ({ ...current, logoUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  return <SettingsCard title="Recibo"><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="grid gap-3 md:grid-cols-2">
    <Toggle label="Mostrar logo" checked={settings.showLogo} onChange={(value) => setSettings({ ...settings, showLogo: value })} />
    <Toggle label="Mostrar propina" checked={settings.showTip} onChange={(value) => setSettings({ ...settings, showTip: value })} />
    <Toggle label="Mostrar cajero" checked={settings.showCashier} onChange={(value) => setSettings({ ...settings, showCashier: value })} />
    <Toggle label="Mostrar mesa/tipo" checked={settings.showOrderSource} onChange={(value) => setSettings({ ...settings, showOrderSource: value })} />
    <Toggle label="Mostrar notas de productos" checked={settings.showItemNotes} onChange={(value) => setSettings({ ...settings, showItemNotes: value })} />
    <label className="min-h-11 cursor-pointer rounded-md border border-line bg-white px-4 py-3 font-bold">Subir/reemplazar logo<input className="hidden" type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>
    {business.logoUrl && <button className="min-h-11 rounded-md border border-line bg-white px-4 font-bold" onClick={() => setBusiness((current) => ({ ...current, logoUrl: undefined }))}>Quitar logo</button>}
    <TextField label="Nombre comercial" value={settings.businessName} onChange={(value) => setSettings({ ...settings, businessName: value })} />
    <TextField label="NIT opcional" value={settings.nit ?? ""} onChange={(value) => setSettings({ ...settings, nit: value })} />
    <TextField label="Direccion" value={settings.address} onChange={(value) => setSettings({ ...settings, address: value })} />
    <TextField label="Telefono" value={settings.phone} onChange={(value) => setSettings({ ...settings, phone: value })} />
    <TextField label="Mensaje final" value={settings.footerMessage} onChange={(value) => setSettings({ ...settings, footerMessage: value })} />
    <TextField label="Texto de redes sociales" value={settings.socialText} onChange={(value) => setSettings({ ...settings, socialText: value })} />
    <label className="space-y-1"><span className="text-sm font-bold">Tamano de recibo</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={settings.size} onChange={(event) => setSettings({ ...settings, size: event.target.value as ReceiptSettings["size"] })}><option value="58mm">58mm</option><option value="80mm">80mm</option></select></label>
    <button className="min-h-11 rounded-md bg-ink px-4 font-bold text-white" onClick={() => printService({ type: "browser", label: "Recibo de prueba" })}>Imprimir prueba</button>
  </div><PreviewReceipt settings={settings} /></div></SettingsCard>;
}

function KitchenSettingsView({ settings, setSettings }: { settings: KitchenSettings; setSettings: (settings: KitchenSettings) => void }) {
  return <SettingsCard title="Comanda"><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="grid gap-3 md:grid-cols-2">
    {(["showBusinessName", "showLogo", "showTime", "showOrderNumber", "showOrderSource", "showCashier", "groupByCategory", "highlightNotes", "showAdditions"] as const).map((key) => <Toggle key={key} label={{ showBusinessName: "Mostrar negocio", showLogo: "Mostrar logo", showTime: "Mostrar hora", showOrderNumber: "Mostrar numero", showOrderSource: "Mostrar mesa/tipo", showCashier: "Mostrar cajero", groupByCategory: "Agrupar por categoria", highlightNotes: "Resaltar notas", showAdditions: "Mostrar adiciones" }[key]} checked={Boolean(settings[key])} onChange={(value) => setSettings({ ...settings, [key]: value })} />)}
    <TextField label="Mensaje interno opcional" value={settings.internalMessage ?? ""} onChange={(value) => setSettings({ ...settings, internalMessage: value })} />
    <label className="space-y-1"><span className="text-sm font-bold">Tamano de tirilla</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={settings.size} onChange={(event) => setSettings({ ...settings, size: event.target.value as KitchenSettings["size"] })}><option value="58mm">58mm</option><option value="80mm">80mm</option></select></label>
    <button className="min-h-11 rounded-md bg-ink px-4 font-bold text-white" onClick={() => printService({ type: "browser", label: "Comanda de prueba" })}>Imprimir prueba</button>
  </div><PreviewKitchen settings={settings} /></div></SettingsCard>;
}

function PaymentSettings({ methods, setMethods }: { methods: PaymentMethodConfig[]; setMethods: (methods: PaymentMethodConfig[]) => void }) {
  const [name, setName] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("otro");
  return <SettingsCard title="Metodos de pago"><div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} /><select className="min-h-11 rounded-md border border-line px-3" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>{["efectivo", "tarjeta", "transferencia", "ATH", "Zelle", "otro"].map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="min-h-11 rounded-md bg-brand px-4 font-bold text-white" onClick={() => { if (!name.trim()) return; setMethods([...methods, { id: createId("pay"), name, method, active: true }]); setName(""); }}>Crear</button></div><div className="mt-4 space-y-2">{methods.map((item) => <div key={item.id} className="grid gap-2 rounded-md border border-line p-3 md:grid-cols-[1fr_160px_120px_auto]"><input className="min-h-10 rounded-md border border-line px-3 font-semibold" value={item.name} onChange={(event) => setMethods(methods.map((row) => row.id === item.id ? { ...row, name: event.target.value } : row))} /><span className="rounded-md bg-surface px-3 py-2 text-sm font-bold">{item.method}</span><button className={`rounded-md px-3 font-bold ${item.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`} onClick={() => setMethods(methods.map((row) => row.id === item.id ? { ...row, active: !row.active } : row))}>{item.active ? "Activo" : "Inactivo"}</button><IconButton title="Eliminar" onClick={() => setMethods(methods.filter((row) => row.id !== item.id))}><Trash2 size={18} /></IconButton></div>)}</div></SettingsCard>;
}

function UsersPermissionsSettings({ businessId, users, setUsers, invitations, setInvitations, invitedBy, defaultPermissions, setDefaultPermissions }: { businessId: string; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; invitations: Invitation[]; setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>; invitedBy: string; defaultPermissions: CashierPermissions; setDefaultPermissions: (permissions: CashierPermissions) => void }) {
  const [draft, setDraft] = useState({ email: "", name: "", role: "cajero" as Role });
  function inviteUser() {
    if (!draft.email.trim()) return;
    const permissions = draft.role === "admin" ? superAdminPermissions : defaultPermissions;
    setInvitations((current) => [...current, { id: createId("invite"), businessId, email: draft.email.trim(), role: draft.role, permissions, status: "pending", invitedBy, createdAt: now() }]);
    setUsers((current) => [...current, { id: createId("user"), businessId, email: draft.email.trim(), name: draft.name.trim() || draft.email.trim(), role: draft.role, status: "active", permissions, createdAt: now() }]);
    setDraft({ email: "", name: "", role: "cajero" });
  }
  return <div className="space-y-4"><SettingsCard title="Invitar usuario"><div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}><option value="admin">Admin</option><option value="cajero">Cajero</option></select><button className="min-h-11 rounded-md bg-brand px-4 font-bold text-white" onClick={inviteUser}>Invitar</button></div><p className="mt-3 text-sm text-slate-600">Con Supabase Auth conectado, esta accion debe llamar inviteUserByEmail/magic link para que el usuario cree su contrasena.</p></SettingsCard><SettingsCard title="Usuarios"><div className="space-y-3">{users.map((user) => <div key={user.id} className="rounded-md border border-line p-3"><div className="grid gap-2 md:grid-cols-[1fr_140px_130px]"><div><p className="font-bold">{user.name}</p><p className="text-sm text-slate-600">{user.email}</p></div><select className="min-h-10 rounded-md border border-line px-3" value={user.role} onChange={(event) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role: event.target.value as Role } : item))}><option value="admin">Admin</option><option value="cajero">Cajero</option></select><button className={`rounded-md px-3 font-bold ${user.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`} onClick={() => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))}>{user.status === "active" ? "Activo" : "Inactivo"}</button></div>{user.role === "cajero" && <div className="mt-3 grid gap-2 md:grid-cols-2">{(Object.keys(permissionLabels) as (keyof CashierPermissions)[]).map((key) => <Toggle key={key} label={permissionLabels[key]} checked={user.permissions[key]} onChange={(value) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, permissions: { ...item.permissions, [key]: value } } : item))} />)}</div>}</div>)}</div></SettingsCard><SettingsCard title="Permisos predeterminados de cajero"><div className="grid gap-3 md:grid-cols-2">{(Object.keys(permissionLabels) as (keyof CashierPermissions)[]).map((key) => <Toggle key={key} label={permissionLabels[key]} checked={defaultPermissions[key]} onChange={(value) => setDefaultPermissions({ ...defaultPermissions, [key]: value })} />)}</div></SettingsCard><SettingsCard title="Invitaciones"><div className="space-y-2">{invitations.length === 0 && <p className="rounded-md bg-surface p-3 text-sm">Sin invitaciones.</p>}{invitations.map((invite) => <div key={invite.id} className="flex justify-between rounded-md bg-surface p-3 text-sm"><span>{invite.email} · {invite.role}</span><strong>{invite.status}</strong></div>)}</div></SettingsCard></div>;
}

function BusinessUsersSettings({ businessId, users, setUsers, defaultPermissions, setDefaultPermissions }: { businessId: string; users: BusinessUser[]; setUsers: React.Dispatch<React.SetStateAction<BusinessUser[]>>; defaultPermissions: CashierPermissions; setDefaultPermissions: (permissions: CashierPermissions) => void }) {
  const [draft, setDraft] = useState({ email: "", name: "", role: "cajero" as Role });
  const [credentials, setCredentials] = useState<null | { email: string; password: string }>(null);
  const [status, setStatus] = useState("");
  async function createUser() {
    try {
      const payload = await postAdminApi("/api/admin/users", { action: "create_user", business_id: businessId, email: draft.email, full_name: draft.name, role: draft.role, permissions: defaultPermissions });
      const user = mapApiBusinessUser(payload.user as Record<string, unknown>, draft.email);
      setUsers((current) => [user, ...current.filter((item) => item.id !== user.id)]);
      setCredentials({ email: user.email, password: String(payload.temporary_password) });
      setDraft({ email: "", name: "", role: "cajero" });
      setStatus("Usuario creado. Entrega la contrasena temporal.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear usuario.");
    }
  }
  async function resetPassword(user: BusinessUser) {
    try {
      const payload = await postAdminApi("/api/admin/users", { action: "reset_password", business_id: businessId, business_user_id: user.id });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, forcePasswordChange: true } : item));
      setCredentials({ email: user.email, password: String(payload.temporary_password) });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo resetear contrasena.");
    }
  }
  return <div className="space-y-4"><SettingsCard title="Crear usuario"><div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"><input className="min-h-11 rounded-md border border-line px-3" placeholder="Correo" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" placeholder="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><select className="min-h-11 rounded-md border border-line px-3" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="cajero">Cajero</option></select><button disabled={!draft.email.trim()} className="min-h-11 rounded-md bg-brand px-4 font-bold text-white disabled:opacity-40" onClick={createUser}>Crear</button></div>{status && <p className="mt-3 rounded-md bg-surface p-3 text-sm font-bold">{status}</p>}{credentials && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900"><p>Correo: {credentials.email}</p><p>Contrasena temporal: {credentials.password}</p><button className="mt-2 rounded-md bg-emerald-700 px-3 py-2 text-white" onClick={() => navigator.clipboard.writeText(`Correo: ${credentials.email}\nContrasena temporal: ${credentials.password}`)}>Copiar credenciales</button></div>}</SettingsCard><SettingsCard title="Usuarios"><div className="space-y-3">{users.map((user) => <div key={user.id} className="rounded-md border border-line p-3"><div className="grid gap-2 md:grid-cols-[1fr_150px_130px_auto]"><div><p className="font-bold">{user.name}</p><p className="text-sm text-slate-600">{user.email}{user.forcePasswordChange ? " · debe cambiar contrasena" : ""}</p></div><select className="min-h-10 rounded-md border border-line px-3" value={user.role} onChange={(event) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role: event.target.value as Role } : item))}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="cajero">Cajero</option></select><button className={`rounded-md px-3 font-bold ${user.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`} onClick={() => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))}>{user.status === "active" ? "Activo" : "Inactivo"}</button><button className="rounded-md border border-line px-3 py-2 font-bold" onClick={() => resetPassword(user)}>Resetear</button></div>{user.role === "cajero" && <div className="mt-3 grid gap-2 md:grid-cols-2">{(Object.keys(permissionLabels) as (keyof CashierPermissions)[]).map((key) => <Toggle key={key} label={permissionLabels[key]} checked={user.permissions[key]} onChange={(value) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, permissions: { ...item.permissions, [key]: value } } : item))} />)}</div>}</div>)}</div></SettingsCard><SettingsCard title="Permisos predeterminados de cajero"><div className="grid gap-3 md:grid-cols-2">{(Object.keys(permissionLabels) as (keyof CashierPermissions)[]).map((key) => <Toggle key={key} label={permissionLabels[key]} checked={defaultPermissions[key]} onChange={(value) => setDefaultPermissions({ ...defaultPermissions, [key]: value })} />)}</div></SettingsCard></div>;
}

function ReportsView({ orders, shifts }: { orders: Order[]; shifts: CashShift[] }) {
  const [preset, setPreset] = useState<DatePreset>("hoy");
  const [mode, setMode] = useState<"real" | "test" | "both">("real");
  const [range, setRange] = useState(getPresetRange("hoy"));
  const activeRange = preset === "rango" ? range : getPresetRange(preset);
  const filtered = orders.filter((order) => inDateRange(order.closedAt ?? order.createdAt, activeRange.from, activeRange.to) && (mode === "both" || (mode === "test" ? order.testMode : !order.testMode)));
  const report = useMemo(() => {
    const total = filtered.reduce((sum, order) => sum + order.total, 0);
    const byMethod = groupTotals(filtered, (order) => order.paymentMethod ?? "sin metodo", (order) => order.total);
    const byType = groupTotals(filtered, (order) => order.type, (order) => order.total);
    const byDay = groupTotals(filtered, (order) => (order.closedAt ?? order.createdAt).slice(0, 10), (order) => order.total);
    const products = filtered.flatMap((order) => order.items).reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.productName]: (acc[item.productName] ?? 0) + item.quantity }), {});
    return { total, count: filtered.length, average: filtered.length ? total / filtered.length : 0, byMethod, byType, byDay, products: Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 8) };
  }, [filtered]);
  return <div className="space-y-5"><section className="rounded-md border border-line bg-white p-4 shadow-soft"><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays size={24} /> Reportes</h1><DatePresetButtons preset={preset} setPreset={setPreset} /><div className="mt-3 flex flex-wrap gap-2"><button className={`min-h-10 rounded-md border px-4 font-bold ${mode === "real" ? "border-brand bg-brand text-white" : "border-line"}`} onClick={() => setMode("real")}>Datos reales</button><button className={`min-h-10 rounded-md border px-4 font-bold ${mode === "test" ? "border-brand bg-brand text-white" : "border-line"}`} onClick={() => setMode("test")}>Datos de prueba</button><button className={`min-h-10 rounded-md border px-4 font-bold ${mode === "both" ? "border-brand bg-brand text-white" : "border-line"}`} onClick={() => setMode("both")}>Ambos</button></div>{preset === "rango" && <DateRangeInputs range={range} setRange={setRange} />}</section><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Ventas totales" value={money.format(report.total)} /><Metric title="Numero de ordenes" value={String(report.count)} /><Metric title="Ticket promedio" value={money.format(report.average)} /><Metric title="Periodo" value={`${activeRange.from} / ${activeRange.to}`} /></div><div className="grid gap-5 lg:grid-cols-2"><ReportList title="Ventas por metodo de pago" rows={Object.entries(report.byMethod).map(([name, total]) => [name, money.format(total)])} /><ReportList title="Ventas por dia" rows={Object.entries(report.byDay).map(([name, total]) => [name, money.format(total)])} /><ReportList title="Productos mas vendidos" rows={report.products.map(([name, quantity]) => [name, String(quantity)])} /><ReportList title="Ventas por tipo de orden" rows={Object.entries(report.byType).map(([name, total]) => [name, money.format(total)])} /></div><ShiftHistory shifts={shifts.filter((shift) => mode === "both" || (mode === "test" ? shift.testMode : !shift.testMode))} orders={orders} /></div>;
}

function PrintModal({ business, settings, order, mode, role, onClose, onPrint }: { business: Business; settings: AppSettings; order: Order; mode: Exclude<PrintMode, null>; role: Role; onClose: () => void; onPrint: (label: string) => void }) {
  const isKitchen = mode === "comanda";
  const isPrecheck = mode === "precuenta";
  return <div className="fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4"><div className="w-full max-w-md"><TicketShell title={isKitchen ? "Comanda de cocina" : isPrecheck ? "Precuenta" : mode === "detalle" ? "Detalle de orden" : settings.receipt.businessName} size={isKitchen ? settings.kitchen.size : settings.receipt.size}>
    {!isKitchen && settings.receipt.showLogo && business.logoUrl && <img src={business.logoUrl} alt="Logo" className="mx-auto mb-3 max-h-16" />}
    {isKitchen && settings.kitchen.showLogo && business.logoUrl && <img src={business.logoUrl} alt="Logo" className="mx-auto mb-3 max-h-14" />}
    {isKitchen && settings.kitchen.showBusinessName && <p className="text-center text-sm font-black">{business.name}</p>}
    {!isKitchen && <div className="text-center text-xs"><p>{settings.receipt.nit ? `NIT: ${settings.receipt.nit}` : business.nit ? `NIT: ${business.nit}` : ""}</p><p>{settings.receipt.address}</p><p>{settings.receipt.phone}</p></div>}
    <TicketHeader order={order} settings={settings} mode={mode} />
    <div className="mt-4 space-y-3">{order.items.map((item) => <div key={item.id} className="border-t border-dashed border-slate-400 pt-3"><div className="flex justify-between gap-3"><p className="font-black">{item.quantity} x {item.productName}</p>{!isKitchen && <p>{money.format(itemUnitTotal(item) * item.quantity)}</p>}</div>{!isKitchen && <p className="text-xs">Unitario: {money.format(item.price)}</p>}{(!isKitchen || settings.kitchen.showAdditions) && item.additions.map((addition) => <p key={addition.id} className="text-sm">+ {addition.name} {!isKitchen ? money.format(addition.price) : ""}</p>)}{item.notes && (!isKitchen ? settings.receipt.showItemNotes : true) && <p className={`mt-1 text-sm ${isKitchen && settings.kitchen.highlightNotes ? "font-black" : "font-bold"}`}>Nota: {item.notes}</p>}</div>)}</div>
    {isPrecheck && <p className="mt-4 rounded-md border border-dashed border-slate-500 p-2 text-center text-sm font-black">Precuenta / No valido como recibo final</p>}
    {!isKitchen && <><Totals order={order} receipt={settings.receipt} />{!isPrecheck && <p className="mt-3 text-sm font-bold">Pago: {order.paymentMethod ?? "Pendiente"}</p>}<p className="mt-2 text-center text-sm">{isPrecheck ? "Total estimado" : settings.receipt.footerMessage}</p>{!isPrecheck && <p className="text-center text-xs">{settings.receipt.socialText}</p>}</>}
    {isKitchen && settings.kitchen.internalMessage && <p className="mt-3 border-t border-dashed border-slate-400 pt-2 text-center text-sm font-bold">{settings.kitchen.internalMessage}</p>}
    {mode === "detalle" && role === "admin" && <AuditTrail events={order.audit} />}
  </TicketShell><div className="no-print mt-3 flex gap-2"><button className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-ink px-4 font-bold text-white" onClick={() => { onPrint(isKitchen ? "Comanda impresa" : isPrecheck ? "Precuenta impresa" : "Recibo impreso"); printService({ type: settings.printing.type, label: isKitchen ? "Comanda" : isPrecheck ? "Precuenta" : "Recibo" }); }}><Printer size={20} /> {isKitchen ? "Imprimir comanda" : isPrecheck ? "Imprimir precuenta" : "Reimprimir recibo"}</button><IconButton title="Cerrar" onClick={onClose}><X size={20} /></IconButton></div></div></div>;
}

function AuditTrail({ events }: { events: AuditEvent[] }) {
  return <div className="mt-4 border-t border-line pt-3"><h3 className="font-black">Historial de cambios</h3><div className="mt-2 space-y-2 text-xs">{events.map((event) => <div key={event.id}><strong>{formatDateTime(event.createdAt)}</strong> · {event.user} · {event.action}{event.reason ? ` · Razon: ${event.reason}` : ""}</div>)}</div></div>;
}

function ReasonModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return <Modal title="Razon obligatoria" onClose={onClose}><textarea className="min-h-28 w-full rounded-md border border-line p-3" placeholder="Escribe la razon del cambio" value={reason} onChange={(event) => setReason(event.target.value)} /><button disabled={!reason.trim()} className="mt-3 min-h-11 w-full rounded-md bg-brand px-4 font-bold text-white disabled:bg-slate-400" onClick={() => onConfirm(reason.trim())}>Guardar razon</button></Modal>;
}

function CategoryModal({ category, onClose, onSave }: { category?: Category; onClose: () => void; onSave: (category: Omit<Category, "id">) => void }) {
  const [name, setName] = useState(category?.name ?? "");
  return <Modal title={category ? "Editar categoria" : "Crear categoria"} onClose={onClose}><TextField label="Nombre" value={name} onChange={setName} /><SaveButton disabled={!name.trim()} onClick={() => onSave({ name })} /></Modal>;
}

function ProductModal({ product, categories, onClose, onSave }: { product?: Product; categories: Category[]; onClose: () => void; onSave: (product: Omit<Product, "id">) => void }) {
  const [draft, setDraft] = useState({ categoryId: product?.categoryId ?? categories[0]?.id ?? "", name: product?.name ?? "", price: String(product?.price ?? ""), description: product?.description ?? "", active: product?.active ?? true });
  return <Modal title={product ? "Editar producto" : "Crear producto"} onClose={onClose}><div className="space-y-3"><TextField label="Nombre" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} /><TextField label="Precio" type="number" value={draft.price} onChange={(value) => setDraft({ ...draft, price: value })} /><label className="space-y-1"><span className="text-sm font-bold">Categoria</span><select className="min-h-11 w-full rounded-md border border-line px-3" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><TextField label="Descripcion" value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} /><Toggle label="Activo" checked={draft.active} onChange={(value) => setDraft({ ...draft, active: value })} /><SaveButton disabled={!draft.name.trim()} onClick={() => onSave({ ...draft, price: Number(draft.price) || 0 })} /></div></Modal>;
}

function AdditionModal({ addition, onClose, onSave }: { addition?: Addition; onClose: () => void; onSave: (addition: Omit<Addition, "id" | "productIds">) => void }) {
  const [draft, setDraft] = useState({ name: addition?.name ?? "", price: String(addition?.price ?? "") });
  return <Modal title={addition ? "Editar extra" : "Crear extra"} onClose={onClose}><TextField label="Nombre" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} /><TextField label="Precio" type="number" value={draft.price} onChange={(value) => setDraft({ ...draft, price: value })} /><SaveButton disabled={!draft.name.trim()} onClick={() => onSave({ name: draft.name, price: Number(draft.price) || 0 })} /></Modal>;
}

function AdminList({ title, addLabel, canEdit, onAdd, children }: { title: string; addLabel: string; canEdit: boolean; onAdd: () => void; children: ReactNode }) {
  return <section className="rounded-md border border-line bg-white p-4 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{title}</h2><button disabled={!canEdit} className="flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 font-bold text-white disabled:bg-slate-400" onClick={onAdd}><Plus size={18} /> {addLabel}</button></div><div className="mt-4 space-y-2">{children}</div></section>;
}

function AdminRow({ title, detail, canEdit, onEdit, onDelete }: { title: string; detail: string; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  return <div className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-bold">{title}</p><p className="text-sm text-slate-600">{detail}</p></div><button disabled={!canEdit} className="min-h-10 rounded-md border border-line px-4 font-bold disabled:opacity-40" onClick={onEdit}>Editar</button><IconButton disabled={!canEdit} title="Eliminar" onClick={onDelete}><Trash2 size={18} /></IconButton></div>;
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="relative block"><Search className="absolute left-3 top-3 text-slate-500" size={20} /><input className="min-h-12 w-full rounded-md border border-line pl-10 pr-3" placeholder="Buscar" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"><section className="w-full max-w-lg rounded-md border border-line bg-white p-5 shadow-soft"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-black">{title}</h2><IconButton title="Cerrar" onClick={onClose}><X size={20} /></IconButton></div>{children}</section></div>;
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-1"><span className="text-sm font-bold">{label}</span><input className="min-h-11 w-full rounded-md border border-line px-3" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-line bg-white px-3 font-semibold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function SaveButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return <button disabled={disabled} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 font-bold text-white disabled:bg-slate-400" onClick={onClick}><Save size={18} /> Guardar</button>;
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-md border border-line bg-white p-4 shadow-soft"><h2 className="mb-4 text-xl font-bold">{title}</h2>{children}</section>;
}

function PreviewReceipt({ settings }: { settings: ReceiptSettings }) {
  return <TicketShell title={settings.businessName} size={settings.size}><p className="text-center text-xs">{settings.nit ? `NIT: ${settings.nit}` : ""}</p><p className="text-center text-sm">{settings.address}</p><p className="text-center text-sm">{settings.phone}</p><div className="mt-3 space-y-1 border-t border-dashed border-slate-400 pt-3 text-sm"><p>Recibo: R-00123</p><p>Orden: #123</p><p>Cajero: demo@pos.com</p><p>Mesa 4</p><p>{formatDate(new Date())} · {formatTime(new Date())}</p><p className="pt-2">2 x Burger clasica <span className="float-right">{money.format(25000)}</span></p><p className="text-xs">Unitario: {money.format(10000)}</p><p className="text-xs">+ Bacon {money.format(2500)}</p>{settings.showTip && <p>Propina <span className="float-right">{money.format(2500)}</span></p>}<p className="font-black">Total <span className="float-right">{money.format(settings.showTip ? 27500 : 25000)}</span></p></div><p className="mt-3 text-center text-sm">{settings.footerMessage}</p><p className="text-center text-xs">{settings.socialText}</p></TicketShell>;
}

function PreviewKitchen({ settings }: { settings: KitchenSettings }) {
  return <TicketShell title={settings.showBusinessName ? "Mi Restaurante" : "Comanda"} size={settings.size}>{settings.showOrderNumber && <p>Orden: #123</p>}{settings.showOrderSource && <p>Mesa 4</p>}{settings.showCashier && <p>Cajero: demo@pos.com</p>}{settings.showTime && <p>{formatTime(new Date())}</p>}<div className="mt-3 border-t border-dashed border-slate-400 pt-3"><p className="font-black">2 x Burger clasica</p>{settings.showAdditions && <p>+ Bacon</p>}<p className={settings.highlightNotes ? "font-black" : ""}>Nota: sin cebolla</p></div>{settings.internalMessage && <p className="mt-2 text-center text-sm font-bold">{settings.internalMessage}</p>}</TicketShell>;
}

function TicketShell({ title, size, children }: { title: string; size?: string; children: ReactNode }) {
  const width = size === "58mm" ? "max-w-[280px]" : "max-w-sm";
  const printSize = size === "58mm" ? "print-58" : "print-80";
  return <section className={`print-area ${printSize} mx-auto rounded-md border border-line bg-white p-5 font-mono shadow-soft ${width}`}><h1 className="text-center text-xl font-black">{title}</h1>{children}</section>;
}

function TicketHeader({ order, settings, mode }: { order: Order; settings: AppSettings; mode: Exclude<PrintMode, null> }) {
  const isKitchen = mode === "comanda";
  const isPrecheck = mode === "precuenta";
  const date = order.closedAt ?? order.createdAt;
  return <div className="mt-4 space-y-1 text-sm">{!isKitchen && !isPrecheck && <p>Recibo: R-{String(order.number).padStart(5, "0")}</p>}{(!isKitchen || settings.kitchen.showOrderNumber) && <p>Orden: #{order.number}</p>}{!isKitchen && settings.receipt.showCashier && <p>Cajero: {order.cashier ?? "-"}</p>}{isKitchen && settings.kitchen.showCashier && <p>Cajero: {order.cashier ?? "-"}</p>}{((!isKitchen && settings.receipt.showOrderSource) || (isKitchen && settings.kitchen.showOrderSource)) && <p>{order.tableName ?? order.type}</p>}{!isKitchen && <p>Fecha: {formatDate(date)}</p>}{!isKitchen && <p>Hora: {formatTime(date)}</p>}{isKitchen && settings.kitchen.showTime && <p>{formatDateTime(date)}</p>}</div>;
}

function Totals({ order, receipt = initialSettings.receipt }: { order: Order; receipt?: ReceiptSettings }) {
  return <div className="mt-5 space-y-2 border-t border-line pt-4"><div className="flex justify-between"><span>Subtotal</span><strong>{money.format(order.subtotal)}</strong></div>{receipt.showTip && order.tip > 0 && <div className="flex justify-between"><span>Propina</span><strong>{money.format(order.tip)}</strong></div>}<div className="flex justify-between text-xl font-black"><span>Total</span><span>{money.format(order.total)}</span></div></div>;
}

function presetLabel(value: DatePreset) {
  if (value === "semana") return "Semana";
  if (value === "mes") return "Mes";
  if (value === "anio") return "Ano";
  if (value === "rango") return "Rango personalizado";
  return value;
}

function DatePresetButtons({ preset, setPreset }: { preset: DatePreset; setPreset: (preset: DatePreset) => void }) {
  return <div className="mt-4 flex flex-wrap gap-2">{(["hoy", "ayer", "semana", "mes", "anio", "rango"] as DatePreset[]).map((value) => <button key={value} className={`min-h-11 rounded-md border px-4 font-bold ${preset === value ? "border-brand bg-brand text-white" : "border-line bg-white"}`} onClick={() => setPreset(value)}>{presetLabel(value)}</button>)}</div>;
}

function DateRangeInputs({ range, setRange }: { range: { from: string; to: string }; setRange: (range: { from: string; to: string }) => void }) {
  return <div className="mt-3 grid gap-3 sm:grid-cols-2"><input className="min-h-11 rounded-md border border-line px-3" type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} /><input className="min-h-11 rounded-md border border-line px-3" type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} /></div>;
}

function IconButton({ title, onClick, children, disabled }: { title: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button disabled={disabled} className="grid size-10 place-items-center rounded-md border border-line bg-white disabled:opacity-40" title={title} onClick={onClick}>{children}</button>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <section className="rounded-md border border-line bg-white p-4 shadow-soft"><p className="text-sm font-bold text-slate-600">{title}</p><p className="mt-2 break-words text-2xl font-black">{value}</p></section>;
}

function ReportList({ title, rows }: { title: string; rows: string[][] }) {
  return <section className="rounded-md border border-line bg-white p-4 shadow-soft"><h2 className="text-xl font-bold">{title}</h2><div className="mt-4 space-y-2">{rows.length === 0 && <p className="rounded-md bg-surface p-3 text-sm text-slate-600">Sin datos en este periodo.</p>}{rows.map(([name, value]) => <div key={`${title}-${name}`} className="flex justify-between gap-3 rounded-md bg-surface p-3 font-semibold"><span>{name}</span><span>{value}</span></div>)}</div></section>;
}

function OpenShiftPanel({ cashier, onOpen }: { cashier: string; onOpen: (openingAmount: number, openingNote?: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return <section className="rounded-md border border-line bg-white p-5 shadow-soft"><h1 className="text-2xl font-black">Abrir turno</h1><p className="mt-1 text-sm text-slate-600">Cajero: {cashier}</p><div className="mt-5 space-y-3"><TextField label="Monto base inicial en caja" type="number" value={amount} onChange={setAmount} /><label className="space-y-1"><span className="text-sm font-bold">Nota opcional</span><textarea className="min-h-24 w-full rounded-md border border-line p-3" value={note} onChange={(event) => setNote(event.target.value)} /></label><button disabled={amount === ""} className="min-h-12 w-full rounded-md bg-brand px-4 font-bold text-white disabled:bg-slate-400" onClick={() => onOpen(Number(amount) || 0, note.trim())}>Abrir turno</button></div></section>;
}

function CloseShiftModal({ shift, orders, onClose, onConfirm }: { shift: CashShift; orders: Order[]; onClose: () => void; onConfirm: (counted: NonNullable<CashShift["counted"]>, note: string) => void }) {
  const expected = getShiftSummary(shift, orders);
  const [counted, setCounted] = useState({ cash: String(expected.expectedCash), card: String(expected.card), transfer: String(expected.transfer), other: String(expected.other) });
  const [note, setNote] = useState("");
  const countedValues = { cash: Number(counted.cash) || 0, card: Number(counted.card) || 0, transfer: Number(counted.transfer) || 0, other: Number(counted.other) || 0 };
  const countedTotal = countedValues.cash + countedValues.card + countedValues.transfer + countedValues.other;
  const expectedTotal = expected.expectedCash + expected.card + expected.transfer + expected.other;
  const difference = countedTotal - expectedTotal;
  const hasDifference = Math.abs(difference) > 0.009;
  return <Modal title="Cerrar turno" onClose={onClose}><div className="space-y-4"><div className="grid gap-2 rounded-md bg-surface p-3 text-sm"><SummaryRow label="Monto inicial" value={money.format(shift.openingAmount)} /><SummaryRow label="Ventas efectivo" value={money.format(expected.cash)} /><SummaryRow label="Ventas tarjeta" value={money.format(expected.card)} /><SummaryRow label="Ventas transferencia" value={money.format(expected.transfer)} /><SummaryRow label="Otros metodos" value={money.format(expected.other)} /><SummaryRow label="Total vendido" value={money.format(expected.totalSales)} /><SummaryRow label="Total esperado en caja" value={money.format(expectedTotal)} /></div><div className="grid gap-3 sm:grid-cols-2"><TextField label="Efectivo contado" type="number" value={counted.cash} onChange={(value) => setCounted({ ...counted, cash: value })} /><TextField label="Tarjeta reportada" type="number" value={counted.card} onChange={(value) => setCounted({ ...counted, card: value })} /><TextField label="Transferencias reportadas" type="number" value={counted.transfer} onChange={(value) => setCounted({ ...counted, transfer: value })} /><TextField label="Otros reportados" type="number" value={counted.other} onChange={(value) => setCounted({ ...counted, other: value })} /></div><div className={`rounded-md p-3 font-black ${hasDifference ? difference > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" : "bg-slate-100 text-slate-800"}`}>{hasDifference ? difference > 0 ? `Sobrante: ${money.format(difference)}` : `Faltante: ${money.format(Math.abs(difference))}` : "Cuadrado"}</div><label className="space-y-1"><span className="text-sm font-bold">Nota {hasDifference ? "obligatoria" : "opcional"}</span><textarea className="min-h-24 w-full rounded-md border border-line p-3" value={note} onChange={(event) => setNote(event.target.value)} /></label><button disabled={hasDifference && !note.trim()} className="min-h-12 w-full rounded-md bg-ink px-4 font-bold text-white disabled:bg-slate-400" onClick={() => onConfirm(countedValues, note.trim())}>Cerrar turno</button></div></Modal>;
}

function ShiftHistory({ shifts, orders, compact = false }: { shifts: CashShift[]; orders: Order[]; compact?: boolean }) {
  const [cashier, setCashier] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const cashiers = Array.from(new Set(shifts.map((shift) => shift.cashier)));
  const filtered = shifts.filter((shift) => (cashier === "all" || shift.cashier === cashier) && (status === "all" || shift.status === status) && (!date || shift.openedAt.slice(0, 10) === date));
  return <section className={`rounded-md border border-line bg-white p-4 shadow-soft ${compact ? "mt-5" : ""}`}><h2 className="text-xl font-bold">Turnos</h2>{!compact && <div className="mt-3 grid gap-3 md:grid-cols-3"><input className="min-h-11 rounded-md border border-line px-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select className="min-h-11 rounded-md border border-line px-3" value={cashier} onChange={(event) => setCashier(event.target.value)}><option value="all">Todos los cajeros</option>{cashiers.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className="min-h-11 rounded-md border border-line px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="abierto">Abierto</option><option value="cerrado">Cerrado</option></select></div>}<div className="mt-4 space-y-3">{filtered.length === 0 && <p className="rounded-md bg-surface p-3 text-sm text-slate-600">Sin turnos registrados.</p>}{filtered.map((shift) => { const expected = shift.expected ?? getShiftSummary(shift, orders); const shiftOrders = orders.filter((order) => order.shiftId === shift.id && order.status === "pagada"); return <details key={shift.id} className="rounded-md border border-line p-3"><summary className="cursor-pointer font-bold">{shift.status.toUpperCase()} · {shift.cashier} · {formatDateTime(shift.openedAt)}</summary><div className="mt-3 grid gap-2 text-sm md:grid-cols-2"><SummaryRow label="Abierto por" value={shift.cashier} /><SummaryRow label="Cerrado por" value={shift.closedBy ?? "-"} /><SummaryRow label="Apertura" value={formatDateTime(shift.openedAt)} /><SummaryRow label="Cierre" value={shift.closedAt ? formatDateTime(shift.closedAt) : "-"} /><SummaryRow label="Monto inicial" value={money.format(shift.openingAmount)} /><SummaryRow label="Total vendido" value={money.format(expected.totalSales)} /><SummaryRow label="Esperado caja" value={money.format(expected.expectedCash + expected.card + expected.transfer + expected.other)} /><SummaryRow label="Diferencia" value={money.format(shift.expected?.difference ?? 0)} /></div><p className="mt-3 text-sm"><strong>Notas:</strong> {shift.closingNote || shift.openingNote || "-"}</p><div className="mt-3 rounded-md bg-surface p-3 text-sm"><strong>Ventas asociadas:</strong> {shiftOrders.length}<div className="mt-2 space-y-1">{shiftOrders.map((order) => <div key={order.id}>#{order.number} · {order.tableName ?? order.type} · {order.paymentMethod} · {money.format(order.total)}</div>)}</div></div></details>; })}</div></section>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span>{label}</span><strong>{value}</strong></div>;
}

function NoPermission() {
  return <section className="rounded-md border border-line bg-white p-6 text-center shadow-soft"><Settings className="mx-auto text-brand" size={42} /><h1 className="mt-3 text-xl font-black">No tienes permiso para acceder a esta seccion</h1></section>;
}

function AccessChecklist() {
  const items = [
    "Super Admin puede crear negocio",
    "Admin queda invitado y vinculado al business_id",
    "Admin entra solo a su negocio",
    "Admin puede invitar cajeros",
    "Cajero solo ve permisos asignados",
    "Datos operativos se filtran por business_id",
    "Cuenta demo esta marcada como demo y separada",
    "Modo prueba usa testMode y no afecta reportes reales",
    "Super Admin no aparece en login principal",
    "Ruta /super-admin bloquea usuarios no super_admin"
  ];
  return <SettingsCard title="Checklist multi-negocio"><div className="grid gap-2 md:grid-cols-2">{items.map((item) => <div key={item} className="rounded-md bg-emerald-50 p-3 font-semibold text-emerald-900">✓ {item}</div>)}</div></SettingsCard>;
}

function groupTotals<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + getValue(item);
    return acc;
  }, {});
}
