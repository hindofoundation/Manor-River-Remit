export type UserRole = 'Sender' | 'Recipient' | 'Agent' | 'Admin';

export type KycTier = 'Tier1' | 'Tier2' | 'Tier3';

export type KycStatus = 'Pending' | 'Approved' | 'Rejected' | 'None';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  kycTier: KycTier;
  kycStatus: KycStatus;
  kycDetails?: {
    nationalId?: string;
    idType?: string;
    selfieUrl?: string;
    address?: string;
    rejectionReason?: string;
  };
  balance?: number; // Optional, useful for agents or mock bank/mobile wallets
  createdAt: string;
}

export type Currency = 'SLE' | 'GNF' | 'LRD' | 'USD';

export type TransferStatus = 'Initiated' | 'Processing' | 'Ready' | 'Completed' | 'Flagged';

export type PayoutMethod = 'MobileMoney' | 'BankTransfer' | 'CashPickup';

export interface Corridor {
  fromCountry: string;
  toCountry: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  baseFee: number; // in USD or equivalent percentage
  percentageFee: number; // e.g. 0.01 for 1%
}

export interface ExchangeRate {
  pair: string; // e.g., "USD_SLE", "SLE_GNF"
  rate: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  reference: string; // Unique human-readable code e.g., TXN-9281-2819
  senderId: string;
  senderName: string;
  senderPhone: string;
  senderCountry: string;
  senderCurrency: Currency;
  senderAmount: number;
  
  recipientName: string;
  recipientPhone: string;
  recipientCountry: string;
  recipientCurrency: Currency;
  recipientAmount: number;
  
  exchangeRate: number;
  fee: number; // in sender's currency
  totalCharged: number; // senderAmount + fee
  
  payoutMethod: PayoutMethod;
  payoutProvider: string; // e.g. "Orange Money", "Africell", "Lonestar", "MTN", "EcoBank", "Agent Cash-out"
  payoutAgentId?: string;
  
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
  
  auditLogs?: string[];
  isFlagged?: boolean;
  flagReason?: string;
}

export interface AgentLocation {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  supportedProviders: string[];
  latitude: number;
  longitude: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userPhone: string;
  userRole: UserRole;
  action: string;
  details: string;
}

export interface SystemStats {
  totalTransferredUSD: number;
  activeUsers: number;
  pendingKyc: number;
  flaggedTransactions: number;
  agentCount: number;
}
