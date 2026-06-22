export type Role = "super_admin" | "admin" | "cajero";
export type BusinessStatus = "active" | "inactive" | "deleted";
export type UserStatus = "active" | "inactive";
export type InvitationStatus = "pending" | "accepted" | "expired";
export type TableStatus = "libre" | "ocupada" | "esperando_pago" | "bloqueada";
export type TableShape = "square" | "rectangle" | "circle";
export type OrderType = "mesa" | "pickup" | "delivery";
export type OrderStatus = "abierta" | "comandada" | "esperando_pago" | "pagada" | "cancelada" | "anulada";
export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "ATH" | "Zelle" | "otro";
export type ReceiptSize = "58mm" | "80mm";
export type KitchenSize = "58mm" | "80mm";
export type PrintType = "browser";
export type ShiftStatus = "abierto" | "cerrado";

export type Category = {
  id: string;
  businessId?: string;
  name: string;
};

export type Product = {
  id: string;
  businessId?: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  active: boolean;
};

export type Addition = {
  id: string;
  businessId?: string;
  name: string;
  price: number;
  productIds: string[];
};

export type RestaurantTable = {
  id: string;
  businessId?: string;
  name: string;
  status: TableStatus;
  sortOrder: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shape?: TableShape;
  zone?: string;
};

export type OrderItemAddition = {
  id: string;
  additionId: string;
  name: string;
  price: number;
};

export type OrderItem = {
  id: string;
  testMode?: boolean;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string;
  additions: OrderItemAddition[];
};

export type AuditEvent = {
  id: string;
  createdAt: string;
  user: string;
  action: string;
  reason?: string;
};

export type Order = {
  id: string;
  businessId?: string;
  number: number;
  type: OrderType;
  tableId?: string;
  tableName?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tip: number;
  total: number;
  paymentMethod?: PaymentMethod;
  cashier?: string;
  shiftId?: string;
  testMode?: boolean;
  audit: AuditEvent[];
  createdAt: string;
  closedAt?: string;
};

export type Business = {
  id: string;
  name: string;
  commercialName: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  nit?: string;
  status: BusinessStatus;
  testMode: boolean;
  demo: boolean;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  currency: string;
  timezone: string;
  createdAt?: string;
  lastActivityAt?: string;
};

export type ReceiptSettings = {
  showLogo: boolean;
  businessName: string;
  nit?: string;
  address: string;
  phone: string;
  footerMessage: string;
  socialText: string;
  showTip: boolean;
  showCashier: boolean;
  showOrderSource: boolean;
  showItemNotes: boolean;
  size: KitchenSize;
};

export type KitchenSettings = {
  showBusinessName: boolean;
  showLogo: boolean;
  showTime: boolean;
  showOrderNumber: boolean;
  showOrderSource: boolean;
  showCashier: boolean;
  groupByCategory: boolean;
  highlightNotes: boolean;
  showAdditions: boolean;
  internalMessage?: string;
  size: KitchenSize;
};

export type PaymentMethodConfig = {
  id: string;
  name: string;
  method: PaymentMethod;
  active: boolean;
};

export type CashierPermissions = {
  viewTables: boolean;
  createOrders: boolean;
  confirmKitchen: boolean;
  chargeOrders: boolean;
  openShift: boolean;
  closeShift: boolean;
  viewOrders: boolean;
  applyDiscounts: boolean;
  cancelOrders: boolean;
  removeOrderItems: boolean;
  editAfterKitchen: boolean;
  viewReports: boolean;
  modifyMenu: boolean;
  modifySettings: boolean;
};

export type AppSettings = {
  receipt: ReceiptSettings;
  kitchen: KitchenSettings;
  printing: PrintingSettings;
  checkout: CheckoutSettings;
  paymentMethods: PaymentMethodConfig[];
  cashierPermissions: CashierPermissions;
};

export type PrintingSettings = {
  type: PrintType;
  receiptPaperSize: KitchenSize;
  kitchenPaperSize: KitchenSize;
};

export type TipMode = "manual" | "suggested" | "none";

export type CheckoutSettings = {
  tipEnabled: boolean;
  tipMode: TipMode;
  suggestedTips: number[];
};

export type ShiftCount = {
  cash: number;
  card: number;
  transfer: number;
  other: number;
};

export type ShiftExpected = ShiftCount & {
  totalSales: number;
  expectedCash: number;
  difference: number;
};

export type CashShift = {
  id: string;
  businessId?: string;
  cashier: string;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  openingNote?: string;
  status: ShiftStatus;
  testMode?: boolean;
  expected?: ShiftExpected;
  counted?: ShiftCount;
  closingNote?: string;
  closedBy?: string;
};

export type BusinessUser = {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  permissions: CashierPermissions;
  createdAt: string;
};

export type Invitation = {
  id: string;
  businessId: string;
  email: string;
  role: Role;
  permissions: CashierPermissions;
  status: InvitationStatus;
  invitedBy: string;
  createdAt: string;
};
