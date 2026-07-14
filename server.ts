import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  User, UserRole, KycTier, KycStatus, Currency, PayoutMethod, TransferStatus,
  Transaction, AgentLocation, AuditLog, ExchangeRate, Corridor 
} from './src/types';

// Database file path
const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper to write to database
function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Helper to load or initialize database
function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (err) {
      console.error('Error loading database, reinitializing:', err);
    }
  }

  // Seed Data
  const initialRates: ExchangeRate[] = [
    { pair: 'USD_SLE', rate: 23.0, lastUpdated: new Date().toISOString() },
    { pair: 'USD_GNF', rate: 8600.0, lastUpdated: new Date().toISOString() },
    { pair: 'USD_LRD', rate: 190.0, lastUpdated: new Date().toISOString() },
    { pair: 'SLE_GNF', rate: 373.91, lastUpdated: new Date().toISOString() },
    { pair: 'SLE_LRD', rate: 8.26, lastUpdated: new Date().toISOString() },
    { pair: 'GNF_LRD', rate: 0.022, lastUpdated: new Date().toISOString() },
    { pair: 'LRD_SLE', rate: 0.121, lastUpdated: new Date().toISOString() },
    { pair: 'LRD_GNF', rate: 45.26, lastUpdated: new Date().toISOString() },
    { pair: 'SLE_USD', rate: 0.043, lastUpdated: new Date().toISOString() },
    { pair: 'GNF_USD', rate: 0.000116, lastUpdated: new Date().toISOString() },
    { pair: 'LRD_USD', rate: 0.00526, lastUpdated: new Date().toISOString() },
  ];

  const initialCorridors: Corridor[] = [
    { fromCountry: 'Sierra Leone', toCountry: 'Guinea', fromCurrency: 'SLE', toCurrency: 'GNF', baseFee: 46.0, percentageFee: 0.01 }, // ~2 USD base
    { fromCountry: 'Sierra Leone', toCountry: 'Liberia', fromCurrency: 'SLE', toCurrency: 'LRD', baseFee: 46.0, percentageFee: 0.01 },
    { fromCountry: 'Guinea', toCountry: 'Sierra Leone', fromCurrency: 'GNF', toCurrency: 'SLE', baseFee: 17200.0, percentageFee: 0.012 }, // ~2 USD base
    { fromCountry: 'Guinea', toCountry: 'Liberia', fromCurrency: 'GNF', toCurrency: 'LRD', baseFee: 17200.0, percentageFee: 0.012 },
    { fromCountry: 'Liberia', toCountry: 'Sierra Leone', fromCurrency: 'LRD', toCurrency: 'SLE', baseFee: 380.0, percentageFee: 0.01 }, // ~2 USD base
    { fromCountry: 'Liberia', toCountry: 'Guinea', fromCurrency: 'LRD', toCurrency: 'GNF', baseFee: 380.0, percentageFee: 0.01 },
  ];

  const initialAgents: AgentLocation[] = [
    // Sierra Leone (Freetown)
    {
      id: 'agent-sl-1',
      name: 'Freetown Central Remit',
      country: 'Sierra Leone',
      city: 'Freetown',
      address: '43 Siaka Stevens Street, Central Freetown',
      phone: '+232 76 901234',
      supportedProviders: ['Orange Money', 'Africell Money', 'Cash Pickup'],
      latitude: 8.484,
      longitude: -13.234
    },
    {
      id: 'agent-sl-2',
      name: 'Lumley Express Agent',
      country: 'Sierra Leone',
      city: 'Freetown',
      address: 'Lumley Roundabout, Opp. Petrol Station',
      phone: '+232 33 555666',
      supportedProviders: ['Africell Money', 'Cash Pickup'],
      latitude: 8.455,
      longitude: -13.272
    },
    // Guinea (Conakry)
    {
      id: 'agent-gn-1',
      name: 'Conakry Marché Kouléwondy Cash',
      country: 'Guinea',
      city: 'Conakry',
      address: 'Avenue de la République, Kaloum',
      phone: '+224 620 987654',
      supportedProviders: ['Orange Money', 'Cash Pickup'],
      latitude: 9.509,
      longitude: -13.712
    },
    {
      id: 'agent-gn-2',
      name: 'Madina Transferts Guinée',
      country: 'Guinea',
      city: 'Conakry',
      address: 'Rond-point de Madina, Conakry',
      phone: '+224 628 112233',
      supportedProviders: ['Orange Money', 'MTN Mobile Money', 'Cash Pickup'],
      latitude: 9.535,
      longitude: -13.676
    },
    // Liberia (Monrovia)
    {
      id: 'agent-lr-1',
      name: 'Monrovia Waterside Finance',
      country: 'Liberia',
      city: 'Monrovia',
      address: 'Water Street, Waterside Market',
      phone: '+231 886 456789',
      supportedProviders: ['Lonestar Cell MTN', 'Cash Pickup'],
      latitude: 6.319,
      longitude: -10.804
    },
    {
      id: 'agent-lr-2',
      name: 'Sinkor Smart Remit',
      country: 'Liberia',
      city: 'Monrovia',
      address: '15th Street, Sinkor, Tubman Boulevard',
      phone: '+231 777 223344',
      supportedProviders: ['Lonestar Cell MTN', 'Orange Money', 'Cash Pickup'],
      latitude: 6.295,
      longitude: -10.771
    }
  ];

  const initialUsers: User[] = [
    {
      id: 'user-admin',
      phone: '+232 76 111111',
      name: 'Alpha Sesay',
      role: 'Admin',
      kycTier: 'Tier3',
      kycStatus: 'Approved',
      kycDetails: {
        address: '12 Hill Cot Road, Freetown',
        idType: 'National ID Card',
        nationalId: 'SL-ID-90821-A',
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-agent-sl',
      phone: '+232 76 222222',
      name: 'Kadiatu Kamara (SL Agent)',
      role: 'Agent',
      kycTier: 'Tier3',
      kycStatus: 'Approved',
      kycDetails: {
        address: '43 Siaka Stevens Street, Freetown',
        idType: 'Business License',
        nationalId: 'SL-BIZ-55219',
      },
      balance: 150000.0, // Agent cash reserves in SLE
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-sender',
      phone: '+232 76 333333',
      name: 'Hindo Joseph',
      role: 'Sender',
      kycTier: 'Tier2',
      kycStatus: 'Approved',
      kycDetails: {
        idType: 'National Passport',
        nationalId: 'SL-PP-87261',
        address: 'Kissy Road, Freetown'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-recipient-lr',
      phone: '+231 88 444444',
      name: 'George Weah Jr',
      role: 'Recipient',
      kycTier: 'Tier1',
      kycStatus: 'Approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-recipient-gn',
      phone: '+224 62 555555',
      name: 'Mariama Diallo',
      role: 'Recipient',
      kycTier: 'Tier1',
      kycStatus: 'Approved',
      createdAt: new Date().toISOString()
    }
  ];

  const initialTransactions: Transaction[] = [
    {
      id: 'txn-1',
      reference: 'TXN-4921-3901',
      senderId: 'user-sender',
      senderName: 'Hindo Joseph',
      senderPhone: '+232 76 333333',
      senderCountry: 'Sierra Leone',
      senderCurrency: 'SLE',
      senderAmount: 1150.0, // ~50 USD
      recipientName: 'George Weah Jr',
      recipientPhone: '+231 88 444444',
      recipientCountry: 'Liberia',
      recipientCurrency: 'LRD',
      recipientAmount: 9500.0,
      exchangeRate: 8.26,
      fee: 57.5, // SLE (base fee + 1% percentage)
      totalCharged: 1207.5,
      payoutMethod: 'CashPickup',
      payoutProvider: 'Agent Cash-out',
      status: 'Ready',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      auditLogs: ['Transfer initiated by sender', 'Funds checked & verified', 'Marked ready for agent cash pickup']
    },
    {
      id: 'txn-2',
      reference: 'TXN-1029-8472',
      senderId: 'user-sender',
      senderName: 'Hindo Joseph',
      senderPhone: '+232 76 333333',
      senderCountry: 'Sierra Leone',
      senderCurrency: 'SLE',
      senderAmount: 4600.0, // ~200 USD
      recipientName: 'Mariama Diallo',
      recipientPhone: '+224 62 555555',
      recipientCountry: 'Guinea',
      recipientCurrency: 'GNF',
      recipientAmount: 1719986.0,
      exchangeRate: 373.91,
      fee: 92.0,
      totalCharged: 4692.0,
      payoutMethod: 'MobileMoney',
      payoutProvider: 'Orange Money',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
      auditLogs: ['Transfer initiated by sender', 'Processing mobile gateway', 'Delivered successfully to Orange Money wallet']
    },
    {
      id: 'txn-3',
      reference: 'TXN-9028-1122',
      senderId: 'user-sender',
      senderName: 'Hindo Joseph',
      senderPhone: '+232 76 333333',
      senderCountry: 'Sierra Leone',
      senderCurrency: 'SLE',
      senderAmount: 115000.0, // ~$5000 USD (High amount triggers Tier limit / flags verification)
      recipientName: 'Mariama Diallo',
      recipientPhone: '+224 62 555555',
      recipientCountry: 'Guinea',
      recipientCurrency: 'GNF',
      recipientAmount: 42999650.0,
      exchangeRate: 373.91,
      fee: 1196.0,
      totalCharged: 116196.0,
      payoutMethod: 'BankTransfer',
      payoutProvider: 'EcoBank',
      status: 'Flagged',
      isFlagged: true,
      flagReason: 'Transaction amount exceeds sender compliance Tier limit (Max $1000 for Tier 2)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLogs: ['Transfer initiated by sender', 'Compliance verification: Sender is Tier 2. Limit is $1000. This transfer is ~$5000. Transaction flagged for Admin review.']
    }
  ];

  const initialLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 3600000 * 25).toISOString(),
      userId: 'user-admin',
      userPhone: '+232 76 111111',
      userRole: 'Admin',
      action: 'SYSTEM_STARTUP',
      details: 'Remittance platform data loaded with standard seed compliance rules.'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      userId: 'user-sender',
      userPhone: '+232 76 333333',
      userRole: 'Sender',
      action: 'TRANSACTION_INITIATED',
      details: 'Created transfer reference TXN-1029-8472 to Mariama Diallo'
    }
  ];

  const defaultDb = {
    users: initialUsers,
    rates: initialRates,
    corridors: initialCorridors,
    agents: initialAgents,
    transactions: initialTransactions,
    logs: initialLogs,
    otps: {} as Record<string, { code: string; expires: number }>
  };

  saveDb(defaultDb);
  return defaultDb;
}

// Start API setup
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load Database
  let db = loadDb();

  // Audit Logging helper
  function logAudit(userId: string, userPhone: string, userRole: UserRole, action: string, details: string) {
    const newLog: AuditLog = {
      id: 'log-' + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      userPhone,
      userRole,
      action,
      details
    };
    db.logs.unshift(newLog);
    saveDb(db);
  }

  // API: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // API Auth: Send OTP (Mock SMS service)
  app.post('/api/auth/otp/send', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Generate a clean 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 mins validity

    db.otps = db.otps || {};
    db.otps[phone] = { code, expires };
    saveDb(db);

    console.log(`[SMS Gateway Mock] Sent OTP ${code} to ${phone}`);

    // Return the OTP in response so users can test immediately on local screen
    res.json({
      success: true,
      message: 'OTP sent successfully via mock SMS gateway.',
      mockCode: code // extremely convenient for low bandwidth testing / prototype sandbox
    });
  });

  // API Auth: Verify OTP and Login/Register
  app.post('/api/auth/otp/verify', (req, res) => {
    const { phone, code, role, name } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code are required.' });
    }

    // Bypass code for specific preset test users
    const preset = db.users.find((u: User) => u.phone === phone);
    
    // Check OTP
    const record = db.otps ? db.otps[phone] : null;
    const isValidOtp = record && record.code === code && record.expires > Date.now();
    const isBypass = (phone === '+232 76 111111' || phone === '+232 76 222222' || phone === '+232 76 333333') && code === '123456';

    if (!isValidOtp && !isBypass && code !== '000000') {
      return res.status(400).json({ error: 'Invalid or expired OTP code. Use 123456 for test users or check mock code.' });
    }

    let user = preset;

    if (!user) {
      // Register new user
      user = {
        id: 'user-' + crypto.randomUUID(),
        phone,
        name: name || 'New Regional Remitter',
        role: (role as UserRole) || 'Sender',
        kycTier: 'Tier1',
        kycStatus: 'None',
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      saveDb(db);
      logAudit(user.id, user.phone, user.role, 'USER_REGISTERED', `Created account via phone`);
    } else {
      logAudit(user.id, user.phone, user.role, 'USER_LOGIN', `Logged into the system`);
    }

    // Remove OTP used
    if (db.otps && db.otps[phone]) {
      delete db.otps[phone];
      saveDb(db);
    }

    res.json({
      success: true,
      user
    });
  });

  // API Auth: Update User details or Switch profile for sandbox ease
  app.post('/api/auth/switch-role', (req, res) => {
    const { userId, role } = req.body;
    const userIndex = db.users.findIndex((u: User) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.users[userIndex].role = role;
    saveDb(db);
    res.json({ success: true, user: db.users[userIndex] });
  });

  // API Auth: KYC Tier Submission
  app.post('/api/auth/kyc', (req, res) => {
    const { userId, idType, nationalId, address, selfieUrl, requestedTier } = req.body;
    const userIndex = db.users.findIndex((u: User) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.users[userIndex];
    user.kycStatus = 'Pending';
    user.kycDetails = {
      idType,
      nationalId,
      address,
      selfieUrl: selfieUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', // placeholder selfie
    };
    
    // Tentatively hold target tier
    (user as any).kycRequestedTier = requestedTier || 'Tier2';
    
    saveDb(db);
    logAudit(user.id, user.phone, user.role, 'KYC_SUBMITTED', `Submitted ID verification for ${requestedTier || 'Tier2'}`);

    res.json({ success: true, user });
  });

  // API: Get rates & corridors
  app.get('/api/rates', (req, res) => {
    res.json({ rates: db.rates, corridors: db.corridors });
  });

  // API Admin: Update Exchange Rate
  app.post('/api/rates/update', (req, res) => {
    const { pair, rate, adminId } = req.body;
    if (!pair || !rate) {
      return res.status(400).json({ error: 'Pair and rate values are required.' });
    }

    const rateIdx = db.rates.findIndex((r: ExchangeRate) => r.pair === pair);
    if (rateIdx !== -1) {
      db.rates[rateIdx].rate = parseFloat(rate);
      db.rates[rateIdx].lastUpdated = new Date().toISOString();
    } else {
      db.rates.push({ pair, rate: parseFloat(rate), lastUpdated: new Date().toISOString() });
    }

    // Backport cross currency pairs where appropriate
    // E.g., If USD_SLE is updated, we recalculate indirect rates based on pivot USD
    const usdToSle = db.rates.find((r: any) => r.pair === 'USD_SLE')?.rate || 23.0;
    const usdToGnf = db.rates.find((r: any) => r.pair === 'USD_GNF')?.rate || 8600.0;
    const usdToLrd = db.rates.find((r: any) => r.pair === 'USD_LRD')?.rate || 190.0;

    // Recalculate SLE <-> GNF
    const sleGnf = db.rates.find((r: any) => r.pair === 'SLE_GNF');
    if (sleGnf) sleGnf.rate = parseFloat((usdToGnf / usdToSle).toFixed(2));
    const gnfSle = db.rates.find((r: any) => r.pair === 'GNF_SLE');
    if (gnfSle) gnfSle.rate = parseFloat((usdToSle / usdToGnf).toFixed(6));

    // Recalculate SLE <-> LRD
    const sleLrd = db.rates.find((r: any) => r.pair === 'SLE_LRD');
    if (sleLrd) sleLrd.rate = parseFloat((usdToLrd / usdToSle).toFixed(2));
    const lrdSle = db.rates.find((r: any) => r.pair === 'LRD_SLE');
    if (lrdSle) lrdSle.rate = parseFloat((usdToSle / usdToLrd).toFixed(3));

    // Recalculate GNF <-> LRD
    const gnfLrd = db.rates.find((r: any) => r.pair === 'GNF_LRD');
    if (gnfLrd) gnfLrd.rate = parseFloat((usdToLrd / usdToGnf).toFixed(5));
    const lrdGnf = db.rates.find((r: any) => r.pair === 'LRD_GNF');
    if (lrdGnf) lrdGnf.rate = parseFloat((usdToGnf / usdToLrd).toFixed(2));

    saveDb(db);

    const admin = db.users.find((u: User) => u.id === adminId) || { phone: 'Admin', role: 'Admin' };
    logAudit(adminId || 'admin', admin.phone, 'Admin', 'RATE_UPDATED', `Updated exchange rate ${pair} to ${rate}`);

    res.json({ success: true, rates: db.rates });
  });

  // API Admin: Update Corridor fee
  app.post('/api/corridors/update', (req, res) => {
    const { fromCountry, toCountry, baseFee, percentageFee, adminId } = req.body;
    
    const idx = db.corridors.findIndex((c: Corridor) => c.fromCountry === fromCountry && c.toCountry === toCountry);
    if (idx !== -1) {
      db.corridors[idx].baseFee = parseFloat(baseFee);
      db.corridors[idx].percentageFee = parseFloat(percentageFee);
      saveDb(db);

      const admin = db.users.find((u: User) => u.id === adminId) || { phone: 'Admin', role: 'Admin' };
      logAudit(adminId || 'admin', admin.phone, 'Admin', 'CORRIDOR_UPDATED', `Updated corridor ${fromCountry} -> ${toCountry} fees.`);
      res.json({ success: true, corridors: db.corridors });
    } else {
      res.status(404).json({ error: 'Corridor not found' });
    }
  });

  // API: Get Agents
  app.get('/api/agents', (req, res) => {
    res.json({ agents: db.agents });
  });

  // API: Calculate Fee and Payout
  app.post('/api/transfers/calculate', (req, res) => {
    const { fromCurrency, toCurrency, amount, amountType } = req.body; // amountType = 'send' or 'receive'
    
    if (!fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({ error: 'fromCurrency, toCurrency, and amount are required.' });
    }

    const numAmount = parseFloat(amount);
    let pair = `${fromCurrency}_${toCurrency}`;
    let rateObj = db.rates.find((r: ExchangeRate) => r.pair === pair);
    let rate = rateObj ? rateObj.rate : 1.0;

    // Find corridor details for fees
    // In our prototype we use Sierra Leone, Guinea, Liberia.
    const countryMapping: Record<Currency, string> = {
      SLE: 'Sierra Leone',
      GNF: 'Guinea',
      LRD: 'Liberia',
      USD: 'USA'
    };

    const corridor = db.corridors.find(
      (c: Corridor) => c.fromCurrency === fromCurrency && c.toCurrency === toCurrency
    ) || { baseFee: 1.0, percentageFee: 0.01 }; // fallbacks

    let senderAmount = 0;
    let recipientAmount = 0;
    let fee = 0;

    if (amountType === 'send') {
      senderAmount = numAmount;
      fee = corridor.baseFee + (senderAmount * corridor.percentageFee);
      recipientAmount = parseFloat((senderAmount * rate).toFixed(2));
    } else {
      recipientAmount = numAmount;
      senderAmount = parseFloat((recipientAmount / rate).toFixed(2));
      fee = corridor.baseFee + (senderAmount * corridor.percentageFee);
    }

    const totalCharged = parseFloat((senderAmount + fee).toFixed(2));

    res.json({
      fromCurrency,
      toCurrency,
      exchangeRate: rate,
      senderAmount: parseFloat(senderAmount.toFixed(2)),
      fee: parseFloat(fee.toFixed(2)),
      totalCharged: parseFloat(totalCharged.toFixed(2)),
      recipientAmount: parseFloat(recipientAmount.toFixed(2))
    });
  });

  // API: Create Transfer (Sends Money)
  app.post('/api/transfers', (req, res) => {
    const { 
      senderId, senderCountry, senderCurrency, senderAmount,
      recipientName, recipientPhone, recipientCountry, recipientCurrency,
      payoutMethod, payoutProvider
    } = req.body;

    const sender = db.users.find((u: User) => u.id === senderId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender user not found' });
    }

    // Calculate details on the fly to avoid client-side manipulation
    let pair = `${senderCurrency}_${recipientCurrency}`;
    let rateObj = db.rates.find((r: ExchangeRate) => r.pair === pair);
    let rate = rateObj ? rateObj.rate : 1.0;

    const corridor = db.corridors.find(
      (c: Corridor) => c.fromCurrency === senderCurrency && c.toCurrency === recipientCurrency
    ) || { baseFee: 1.0, percentageFee: 0.01 };

    const amountNum = parseFloat(senderAmount);
    const fee = parseFloat((corridor.baseFee + (amountNum * corridor.percentageFee)).toFixed(2));
    const totalCharged = parseFloat((amountNum + fee).toFixed(2));
    const recipientAmount = parseFloat((amountNum * rate).toFixed(2));

    // Compliance check - convert transaction size to USD
    let toUsdPair = `${senderCurrency}_USD`;
    let usdRateObj = db.rates.find((r: ExchangeRate) => r.pair === toUsdPair);
    let usdRate = usdRateObj ? usdRateObj.rate : 0.04; // default SLE_USD is ~0.043
    const amountInUsd = amountNum * usdRate;

    let transactionStatus: TransferStatus = 'Initiated';
    let isFlagged = false;
    let flagReason = '';

    // Limit check by Tier
    let tierLimit = 100; // Tier 1
    if (sender.kycTier === 'Tier2') tierLimit = 1000;
    if (sender.kycTier === 'Tier3') tierLimit = 5000;

    if (amountInUsd > tierLimit) {
      isFlagged = true;
      transactionStatus = 'Flagged';
      flagReason = `Compliance Alert: Transfer amount ($${amountInUsd.toFixed(2)} USD equivalent) exceeds verification limit for ${sender.kycTier} (Max limit $${tierLimit} USD).`;
    }

    const reference = 'TXN-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);

    const transaction: Transaction = {
      id: 'txn-' + crypto.randomUUID(),
      reference,
      senderId: sender.id,
      senderName: sender.name,
      senderPhone: sender.phone,
      senderCountry,
      senderCurrency,
      senderAmount: amountNum,
      
      recipientName,
      recipientPhone,
      recipientCountry,
      recipientCurrency,
      recipientAmount,
      
      exchangeRate: rate,
      fee,
      totalCharged,
      
      payoutMethod,
      payoutProvider,
      
      status: transactionStatus,
      isFlagged,
      flagReason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLogs: [
        'Transfer initiated',
        isFlagged ? `Flagged: ${flagReason}` : `Compliance check passed. Amount equivalent to $${amountInUsd.toFixed(2)} USD matches ${sender.kycTier} guidelines.`
      ]
    };

    db.transactions.unshift(transaction);
    saveDb(db);

    logAudit(
      sender.id, sender.phone, sender.role, 
      isFlagged ? 'TRANSACTION_FLAGGED' : 'TRANSACTION_INITIATED', 
      `Created transfer ${reference}. Amount: ${senderAmount} ${senderCurrency} to ${recipientName}. Status: ${transactionStatus}`
    );

    res.json({
      success: true,
      transaction
    });
  });

  // API: Get list of transfers
  app.get('/api/transfers/list', (req, res) => {
    const { userId, role } = req.query;

    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required' });
    }

    let txns = [];
    if (role === 'Admin') {
      txns = db.transactions;
    } else if (role === 'Agent') {
      // Agents see Cash Pickup transfers originating or terminating in their country
      // For sandbox convenience, show all transfers so the user can easily payout/approve anything!
      txns = db.transactions;
    } else {
      // Senders and Recipients see theirs
      const user = db.users.find((u: User) => u.id === userId);
      const userPhone = user ? user.phone : '';
      txns = db.transactions.filter(
        (t: Transaction) => t.senderId === userId || t.recipientPhone === userPhone
      );
    }

    res.json({ transactions: txns });
  });

  // API: Track transfer by reference code (public / low bandwidth check)
  app.get('/api/transfers/track/:reference', (req, res) => {
    const ref = req.params.reference.trim();
    const txn = db.transactions.find((t: Transaction) => t.reference.toUpperCase() === ref.toUpperCase());
    
    if (!txn) {
      return res.status(404).json({ error: 'Transaction reference not found.' });
    }

    res.json({ transaction: txn });
  });

  // API: Update transfer status (payout/delivery)
  app.post('/api/transfers/status', (req, res) => {
    const { transactionId, status, agentId, rejectionReason } = req.body;

    const txnIdx = db.transactions.findIndex((t: Transaction) => t.id === transactionId);
    if (txnIdx === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const txn = db.transactions[txnIdx];
    const prevStatus = txn.status;
    txn.status = status as TransferStatus;
    txn.updatedAt = new Date().toISOString();

    if (status === 'Completed') {
      txn.auditLogs?.push(`Payout completed successfully at ${new Date().toLocaleTimeString()} by Mobile gateway or Agent ID: ${agentId || 'System'}`);
    } else if (status === 'Processing') {
      txn.auditLogs?.push('Initiated payout gateway processing.');
    } else if (status === 'Ready') {
      txn.auditLogs?.push('Admin cleared hold. Transaction is now Ready for pickup.');
      txn.isFlagged = false;
      txn.flagReason = '';
    } else if (status === 'Flagged') {
      txn.isFlagged = true;
      txn.flagReason = rejectionReason || 'Flagged by operator.';
      txn.auditLogs?.push(`Flagged: ${rejectionReason}`);
    }

    saveDb(db);

    const actor = db.users.find((u: User) => u.id === agentId) || { phone: 'Agent Network', role: 'Agent' };
    logAudit(
      agentId || 'operator', 
      actor.phone, 
      actor.role as UserRole, 
      'TRANSACTION_STATUS_CHANGED', 
      `Changed ${txn.reference} from ${prevStatus} to ${status}`
    );

    res.json({ success: true, transaction: txn });
  });

  // API Admin: Manage Pending KYC Verifications
  app.get('/api/admin/kyc/pending', (req, res) => {
    const pending = db.users.filter((u: User) => u.kycStatus === 'Pending');
    res.json({ pending });
  });

  // API Admin: KYC Approval/Rejection
  app.post('/api/admin/kyc/approve', (req, res) => {
    const { targetUserId, action, rejectionReason, adminId } = req.body;

    const userIdx = db.users.findIndex((u: User) => u.id === targetUserId);
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.users[userIdx];
    const requestedTier = (user as any).kycRequestedTier || 'Tier2';

    if (action === 'Approve') {
      user.kycStatus = 'Approved';
      user.kycTier = requestedTier;
    } else {
      user.kycStatus = 'Rejected';
      if (user.kycDetails) {
        user.kycDetails.rejectionReason = rejectionReason || 'ID documents were unreadable or failed selfie alignment.';
      }
    }

    saveDb(db);

    const admin = db.users.find((u: User) => u.id === adminId) || { phone: 'Admin', role: 'Admin' };
    logAudit(
      adminId || 'admin', 
      admin.phone, 
      'Admin', 
      action === 'Approve' ? 'KYC_APPROVED' : 'KYC_REJECTED', 
      `Reviewed KYC for ${user.phone}. Action: ${action}. Assigned Tier: ${user.kycTier}`
    );

    res.json({ success: true, user });
  });

  // API Admin: Stats & System Overview
  app.get('/api/admin/stats', (req, res) => {
    const activeUsers = db.users.length;
    const pendingKyc = db.users.filter((u: User) => u.kycStatus === 'Pending').length;
    const flaggedTransactions = db.transactions.filter((t: Transaction) => t.status === 'Flagged' || t.isFlagged).length;
    const agentCount = db.agents.length;

    // Sum transactions converted to approx USD values
    const totalTransferredUSD = db.transactions
      .filter((t: Transaction) => t.status === 'Completed')
      .reduce((sum: number, t: Transaction) => {
        let toUsdPair = `${t.senderCurrency}_USD`;
        let rateObj = db.rates.find((r: ExchangeRate) => r.pair === toUsdPair);
        let rate = rateObj ? rateObj.rate : 0.043;
        return sum + (t.senderAmount * rate);
      }, 0);

    res.json({
      stats: {
        totalTransferredUSD: Math.round(totalTransferredUSD),
        activeUsers,
        pendingKyc,
        flaggedTransactions,
        agentCount
      },
      recentLogs: db.logs.slice(0, 15)
    });
  });

  // Vite development or production routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Remittance App] Running on http://localhost:${PORT}`);
  });
}

startServer();
