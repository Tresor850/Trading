import { UserAccessKey, UserProfile, UserRole } from '../types/trading';

const STORAGE_KEYS_LIST = 'tradngbot_access_keys_v2';
const STORAGE_CURRENT_USER = 'tradngbot_current_user_v2';

export const MASTER_ADMIN_KEY = 'TRD-ADMIN-MASTER-2025';

// Default seeded keys for instant testing and security bootstrap
const DEFAULT_INITIAL_KEYS: UserAccessKey[] = [
  {
    id: 'key_admin_master',
    key: MASTER_ADMIN_KEY,
    label: 'Administrateur Principal (Master)',
    email: 'admin@tradngbot.local',
    role: 'admin',
    createdAt: Date.now() - 30 * 86400000,
    expiresAt: null,
    status: 'active',
    canTradeLive: true,
    canUseTestnet: true,
    maxAllocatedBudgetUsd: 100000,
    createdByAdmin: 'SYSTEM',
    notes: 'Clé maître disposant de tous les privilèges et de la génération des clés.',
  },
  {
    id: 'key_trader_demo',
    key: 'TRD-USER-DEMO-7721',
    label: 'Trader Partenaire (Compte Spot)',
    email: 'trader@tradngbot.local',
    role: 'trader',
    createdAt: Date.now() - 7 * 86400000,
    expiresAt: Date.now() + 90 * 86400000,
    status: 'active',
    canTradeLive: true,
    canUseTestnet: true,
    maxAllocatedBudgetUsd: 5000,
    createdByAdmin: 'Administrateur Principal',
    notes: 'Accès autorisé aux transactions réelles Binance et au Testnet.',
  },
  {
    id: 'key_viewer_demo',
    key: 'TRD-USER-VIEW-4412',
    label: 'Auditeur / Analyste (Lecture Seule)',
    email: 'analyst@tradngbot.local',
    role: 'viewer',
    createdAt: Date.now() - 2 * 86400000,
    expiresAt: Date.now() + 30 * 86400000,
    status: 'active',
    canTradeLive: false,
    canUseTestnet: false,
    maxAllocatedBudgetUsd: 0,
    createdByAdmin: 'Administrateur Principal',
    notes: 'Mode observation uniquement.',
  },
];

/**
 * Retrieve all access keys managed by the Administrator
 */
export function getStoredAccessKeys(): UserAccessKey[] {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_KEYS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_LIST);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS_LIST, JSON.stringify(DEFAULT_INITIAL_KEYS));
      return DEFAULT_INITIAL_KEYS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_INITIAL_KEYS;
  } catch {
    return DEFAULT_INITIAL_KEYS;
  }
}

/**
 * Persist access keys
 */
export function saveAccessKeys(keys: UserAccessKey[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS_LIST, JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save access keys to localStorage:', err);
  }
}

/**
 * Format an access key code: TRD-USER-XXXX-XXXX
 */
export function generateRandomKeyCode(role: UserRole): string {
  const prefix = role === 'admin' ? 'TRD-ADMIN' : 'TRD-USER';
  const chunk1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const chunk2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${chunk1}-${chunk2}`;
}

/**
 * Validate an access key string
 */
export function validateAccessKey(keyStr: string): {
  valid: boolean;
  key?: UserAccessKey;
  error?: string;
} {
  const cleanKey = keyStr.trim().toUpperCase();
  if (!cleanKey) {
    return { valid: false, error: 'Veuillez saisir une clé d’accès.' };
  }

  const allKeys = getStoredAccessKeys();
  const matched = allKeys.find((k) => k.key.toUpperCase() === cleanKey);

  if (!matched) {
    return {
      valid: false,
      error:
        'Clé d’accès introuvable. Seul l’administrateur est habilité à générer une clé valide.',
    };
  }

  if (matched.status === 'revoked') {
    return {
      valid: false,
      error: 'Cette clé d’accès a été révoquée par l’administrateur.',
    };
  }

  if (matched.status === 'suspended') {
    return {
      valid: false,
      error: 'Cette clé d’accès est temporairement suspendue.',
    };
  }

  if (matched.expiresAt && matched.expiresAt < Date.now()) {
    return {
      valid: false,
      error: 'Cette clé d’accès a expiré. Contactez l’administrateur.',
    };
  }

  return { valid: true, key: matched };
}

/**
 * Administrator creates a brand new user access key
 */
export function generateNewAccessKey(params: {
  label: string;
  email?: string;
  role: UserRole;
  canTradeLive: boolean;
  canUseTestnet: boolean;
  maxBudgetUsd: number;
  expiresDays?: number | null;
  assignedBinanceApiKey?: string;
  assignedBinanceApiSecret?: string;
  notes?: string;
  adminName: string;
}): UserAccessKey {
  const newKey: UserAccessKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: generateRandomKeyCode(params.role),
    label: params.label.trim() || 'Utilisateur Invité',
    email: params.email?.trim() || undefined,
    role: params.role,
    createdAt: Date.now(),
    expiresAt:
      params.expiresDays && params.expiresDays > 0
        ? Date.now() + params.expiresDays * 86400000
        : null,
    status: 'active',
    canTradeLive: params.canTradeLive,
    canUseTestnet: params.canUseTestnet,
    maxAllocatedBudgetUsd: params.maxBudgetUsd || 1000,
    assignedBinanceApiKey: params.assignedBinanceApiKey?.trim() || undefined,
    assignedBinanceApiSecret: params.assignedBinanceApiSecret?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
    createdByAdmin: params.adminName,
  };

  const existing = getStoredAccessKeys();
  const updated = [newKey, ...existing];
  saveAccessKeys(updated);

  return newKey;
}

/**
 * Update key status (e.g. toggle active / suspended / revoked)
 */
export function updateAccessKeyStatus(
  id: string,
  newStatus: 'active' | 'suspended' | 'revoked'
): boolean {
  const keys = getStoredAccessKeys();
  const index = keys.findIndex((k) => k.id === id);
  if (index === -1) return false;

  // Protect master admin key from being revoked
  if (keys[index].key === MASTER_ADMIN_KEY && newStatus !== 'active') {
    return false;
  }

  keys[index] = { ...keys[index], status: newStatus };
  saveAccessKeys(keys);
  return true;
}

/**
 * Delete key permanently
 */
export function deleteAccessKey(id: string): boolean {
  const keys = getStoredAccessKeys();
  const filtered = keys.filter((k) => k.id !== id || k.key === MASTER_ADMIN_KEY);
  saveAccessKeys(filtered);
  return true;
}

/**
 * Get current session user
 */
export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER);
    if (!raw) {
      // Default to auto-login as Admin Master for premier preview experience, but full multi-user switcher available
      const defaultAdmin: UserProfile = {
        id: 'admin_initial',
        name: 'Administrateur Principal',
        email: 'admin@tradngbot.local',
        role: 'admin',
        accessKey: MASTER_ADMIN_KEY,
        canTradeLive: true,
        canUseTestnet: true,
        maxAllocatedBudgetUsd: 100000,
        hasCustomBinanceKeys: false,
        createdAt: Date.now(),
      };
      localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Set current session user
 */
export function setCurrentUser(profile: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER);
    }
  } catch (err) {
    console.error('Failed to set current user:', err);
  }
}

/**
 * Login with access key
 */
export function loginWithAccessKey(keyStr: string): {
  success: boolean;
  user?: UserProfile;
  error?: string;
} {
  const val = validateAccessKey(keyStr);
  if (!val.valid || !val.key) {
    return { success: false, error: val.error || 'Clé invalide' };
  }

  // Update lastUsedAt
  const allKeys = getStoredAccessKeys();
  const updatedKeys = allKeys.map((k) =>
    k.id === val.key!.id ? { ...k, lastUsedAt: Date.now() } : k
  );
  saveAccessKeys(updatedKeys);

  const profile: UserProfile = {
    id: val.key.id,
    name: val.key.label,
    email: val.key.email,
    role: val.key.role,
    accessKey: val.key.key,
    canTradeLive: val.key.canTradeLive,
    canUseTestnet: val.key.canUseTestnet,
    maxAllocatedBudgetUsd: val.key.maxAllocatedBudgetUsd,
    hasCustomBinanceKeys: !!val.key.assignedBinanceApiKey,
    binanceApiKey: val.key.assignedBinanceApiKey,
    binanceApiSecret: val.key.assignedBinanceApiSecret,
    createdAt: val.key.createdAt,
  };

  setCurrentUser(profile);
  return { success: true, user: profile };
}

/**
 * Logout
 */
export function logoutUser(): void {
  setCurrentUser(null);
}
