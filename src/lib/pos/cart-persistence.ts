const STORAGE_KEY_PREFIX = 'smartstock_pos_cart_';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedCart {
  items: unknown[];
  clienteId: string;
  tipoComprobante: string;
  timestamp: number;
}

function getKey(tenantId: string) {
  return `${STORAGE_KEY_PREFIX}${tenantId}`;
}

export function saveCart(tenantId: string, cart: Omit<PersistedCart, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const data: PersistedCart = { ...cart, timestamp: Date.now() };
    localStorage.setItem(getKey(tenantId), JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadCart(tenantId: string): PersistedCart | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getKey(tenantId));
    if (!raw) return null;

    const data = JSON.parse(raw) as PersistedCart;

    if (Date.now() - data.timestamp > MAX_AGE_MS) {
      clearCart(tenantId);
      return null;
    }

    if (!data.items?.length) return null;

    return data;
  } catch {
    return null;
  }
}

export function clearCart(tenantId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getKey(tenantId));
  } catch {
    // ignore
  }
}
