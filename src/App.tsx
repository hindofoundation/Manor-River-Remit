import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Search, 
  MapPin, 
  User as UserIcon, 
  ShieldAlert, 
  History, 
  TrendingUp, 
  Globe, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Loader2, 
  RotateCcw, 
  Sliders, 
  Percent, 
  Activity, 
  ChevronRight,
  Fingerprint,
  Sparkles,
  Download,
  Camera,
  QrCode
} from 'lucide-react';
import jsQR from 'jsqr';
import { translations, Language } from './translations';
import { User, Transaction, AgentLocation, ExchangeRate, Corridor, PayoutMethod, TransferStatus, Currency } from './types';

export default function App() {
  // Locale State
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Global Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'Sender' | 'Recipient' | 'Agent' | 'Admin'>('Sender');
  const [otpCode, setOtpCode] = useState('');
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Active View State
  const [activeTab, setActiveTab] = useState<'send' | 'track' | 'agents' | 'kyc' | 'agent-portal' | 'admin'>('send');

  // Exchange Rates & Corridors state
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [agents, setAgents] = useState<AgentLocation[]>([]);

  // Transfer Calculator state
  const [sendCountry, setSendCountry] = useState<string>('Sierra Leone');
  const [receiveCountry, setReceiveCountry] = useState<string>('Guinea');
  const [sendCurrency, setSendCurrency] = useState<Currency>('SLE');
  const [receiveCurrency, setReceiveCurrency] = useState<Currency>('GNF');
  const [amountType, setAmountType] = useState<'send' | 'receive'>('send');
  const [calcAmount, setCalcAmount] = useState<string>('1000');
  
  // Calculated outputs
  const [calcResults, setCalcResults] = useState<{
    exchangeRate: number;
    senderAmount: number;
    fee: number;
    totalCharged: number;
    recipientAmount: number;
  } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Recipient details input
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('MobileMoney');
  const [payoutProvider, setPayoutProvider] = useState('Orange Money');

  // Submitted transfer success
  const [createdTxn, setCreatedTxn] = useState<Transaction | null>(null);
  const [transferSubmitLoading, setTransferSubmitLoading] = useState(false);

  // Tracking transfer state
  const [trackRef, setTrackRef] = useState('');
  const [trackedTxn, setTrackedTxn] = useState<Transaction | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  // KYC Submission state
  const [kycIdType, setKycIdType] = useState('National ID');
  const [kycIdNum, setKycIdNum] = useState('');
  const [kycAddress, setKycAddress] = useState('');
  const [kycRequestedTier, setKycRequestedTier] = useState<'Tier2' | 'Tier3'>('Tier2');
  const [kycSuccessMsg, setKycSuccessMsg] = useState('');
  const [kycErrorMsg, setKycErrorMsg] = useState('');

  // Agent Locator search state
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null);

  // Agent Portal release cash transaction reference query
  const [agentSearchRef, setAgentSearchRef] = useState('');
  const [agentFoundTxn, setAgentFoundTxn] = useState<Transaction | null>(null);
  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState('');

  // QR Code Scanner State variables & refs
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [qrScanError, setQrScanError] = useState('');
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animationFrameIdRef = React.useRef<number | null>(null);

  // Admin Dashboard stats
  const [adminStats, setAdminStats] = useState({
    totalTransferredUSD: 0,
    activeUsers: 0,
    pendingKyc: 0,
    flaggedTransactions: 0,
    agentCount: 0
  });
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [pendingKycUsers, setPendingKycUsers] = useState<User[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // Rate override sliders/inputs
  const [selectedPairToOverride, setSelectedPairToOverride] = useState('USD_SLE');
  const [overrideValue, setOverrideValue] = useState('23.0');

  // Corridor base fee overrides
  const [selectedFeeCorridorIndex, setSelectedFeeCorridorIndex] = useState(0);
  const [newBaseFeeValue, setNewBaseFeeValue] = useState('46');
  const [newPercentageFeeValue, setNewPercentageFeeValue] = useState('0.01');

  // Active Transaction Feed for User
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);

  // Automatically update currencies when countries change
  useEffect(() => {
    if (sendCountry === 'Sierra Leone') setSendCurrency('SLE');
    if (sendCountry === 'Guinea') setSendCurrency('GNF');
    if (sendCountry === 'Liberia') setSendCurrency('LRD');

    if (receiveCountry === 'Sierra Leone') setReceiveCurrency('SLE');
    if (receiveCountry === 'Guinea') setReceiveCurrency('GNF');
    if (receiveCountry === 'Liberia') setReceiveCurrency('LRD');
  }, [sendCountry, receiveCountry]);

  // Load basic exchange rate metadata on init
  useEffect(() => {
    fetchRatesAndCorridors();
    fetchAgents();
  }, []);

  // Fetch functions
  const fetchRatesAndCorridors = async () => {
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      if (data.rates) {
        setRates(data.rates);
        setCorridors(data.corridors);
      }
    } catch (e) {
      console.error('Failed to load rates:', e);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  };

  const fetchUserTransactions = async (user: User) => {
    try {
      const res = await fetch(`/api/transfers/list?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      if (data.transactions) {
        setUserTransactions(data.transactions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminData = async () => {
    try {
      const resStats = await fetch('/api/admin/stats');
      const dataStats = await resStats.json();
      if (dataStats.stats) {
        setAdminStats(dataStats.stats);
        setAdminLogs(dataStats.recentLogs || []);
      }

      const resKyc = await fetch('/api/admin/kyc/pending');
      const dataKyc = await resKyc.json();
      if (dataKyc.pending) setPendingKycUsers(dataKyc.pending);

      const resAllTxns = await fetch('/api/transfers/list?userId=admin&role=Admin');
      const dataAll = await resAllTxns.json();
      if (dataAll.transactions) setAllTransactions(dataAll.transactions);
    } catch (e) {
      console.error(e);
    }
  };

  // Recalculate transaction calculator on input change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      calculateFees();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [calcAmount, sendCurrency, receiveCurrency, amountType]);

  const calculateFees = async () => {
    if (!calcAmount || isNaN(parseFloat(calcAmount)) || parseFloat(calcAmount) <= 0) {
      return;
    }
    setCalcLoading(true);
    try {
      const res = await fetch('/api/transfers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCurrency: sendCurrency,
          toCurrency: receiveCurrency,
          amount: calcAmount,
          amountType
        })
      });
      const data = await res.json();
      if (!data.error) {
        setCalcResults({
          exchangeRate: data.exchangeRate,
          senderAmount: data.senderAmount,
          fee: data.fee,
          totalCharged: data.totalCharged,
          recipientAmount: data.recipientAmount
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCalcLoading(false);
    }
  };

  // Trigger Rate update
  const handleRateOverride = async () => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
      const res = await fetch('/api/rates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: selectedPairToOverride,
          rate: overrideValue,
          adminId: currentUser.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setRates(data.rates);
        calculateFees();
        fetchAdminData();
        alert('Exchange rate overridden successfully on compliance gateway!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Corridor fee updates
  const handleCorridorFeeUpdate = async () => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const targetCorridor = corridors[selectedFeeCorridorIndex];
    try {
      const res = await fetch('/api/corridors/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCountry: targetCorridor.fromCountry,
          toCountry: targetCorridor.toCountry,
          baseFee: newBaseFeeValue,
          percentageFee: newPercentageFeeValue,
          adminId: currentUser.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setCorridors(data.corridors);
        calculateFees();
        fetchAdminData();
        alert('Corridor operational baseline fees applied!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Functions
  const requestOtp = async () => {
    if (!authPhone) {
      setAuthError('Please enter a phone number.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: authPhone })
      });
      const data = await res.json();
      if (data.success) {
        setMockOtp(data.mockCode);
      }
    } catch (err: any) {
      setAuthError('Error requesting SMS simulation.');
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!authPhone || !otpCode) {
      setAuthError('Phone number and verification OTP code are required.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: authPhone,
          code: otpCode,
          role: authRole,
          name: authName
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        fetchUserTransactions(data.user);
        // Pre-select view based on role
        if (data.user.role === 'Admin') {
          setActiveTab('admin');
          fetchAdminData();
        } else if (data.user.role === 'Agent') {
          setActiveTab('agent-portal');
        } else {
          setActiveTab('send');
        }
        setMockOtp(null);
        setOtpCode('');
      } else {
        setAuthError(data.error || 'Validation error');
      }
    } catch (err: any) {
      setAuthError('Authentication verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setAuthPhone('');
    setAuthName('');
    setCreatedTxn(null);
    setUserTransactions([]);
    setActiveTab('send');
  };

  // Switch role inside sandbox for instant testing
  const switchSandboxRole = async (newRole: 'Sender' | 'Recipient' | 'Agent' | 'Admin') => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        const updated = data.user;
        setCurrentUser(updated);
        fetchUserTransactions(updated);
        if (newRole === 'Admin') {
          setActiveTab('admin');
          fetchAdminData();
        } else if (newRole === 'Agent') {
          setActiveTab('agent-portal');
        } else {
          setActiveTab('send');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Money Transfer
  const handleAuthorizeTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please register or log in with your phone first.');
      return;
    }
    if (!recipientName || !recipientPhone) {
      alert('Recipient information is required.');
      return;
    }
    if (!calcResults) {
      alert('Wait for calculator rate confirmation.');
      return;
    }

    setTransferSubmitLoading(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderCountry: sendCountry,
          senderCurrency: sendCurrency,
          senderAmount: calcResults.senderAmount,
          recipientName,
          recipientPhone,
          recipientCountry: receiveCountry,
          recipientCurrency: receiveCurrency,
          payoutMethod,
          payoutProvider
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreatedTxn(data.transaction);
        // Add to tracking view automatically
        setTrackRef(data.transaction.reference);
        setTrackedTxn(data.transaction);
        fetchUserTransactions(currentUser);
        // Reset state
        setRecipientName('');
        setRecipientPhone('');
      } else {
        alert(data.error || 'Failed to submit transfer');
      }
    } catch (err) {
      console.error(err);
      alert('Gateway timeout. Check connection.');
    } finally {
      setTransferSubmitLoading(false);
    }
  };

  // Trace transfer status
  const handleTrackTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackRef) return;
    
    setTrackLoading(true);
    setTrackError('');
    setTrackedTxn(null);

    try {
      const res = await fetch(`/api/transfers/track/${trackRef.trim()}`);
      const data = await res.json();
      if (data.transaction) {
        setTrackedTxn(data.transaction);
      } else {
        setTrackError(data.error || 'Transaction reference code not found on regional ledger.');
      }
    } catch (err) {
      setTrackError('Offline error or server link broken.');
    } finally {
      setTrackLoading(false);
    }
  };

  // Submit KYC Verification
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!kycIdNum || !kycAddress) {
      setKycErrorMsg('All verification fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          idType: kycIdType,
          nationalId: kycIdNum,
          address: kycAddress,
          requestedTier: kycRequestedTier
        })
      });
      const data = await res.json();
      if (data.success) {
        setKycSuccessMsg('KYC documents received. The compliance officers are reviewing your documents.');
        setCurrentUser(data.user);
        setKycIdNum('');
        setKycAddress('');
      }
    } catch (e) {
      setKycErrorMsg('Verification engine error.');
    }
  };

  // Admin Approve KYC
  const handleAdminReviewKyc = async (targetUserId: string, action: 'Approve' | 'Reject') => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          action,
          rejectionReason: 'ID scan did not pass edge detection filters.',
          adminId: currentUser.id
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
        alert(`User KYC ${action}d successfully.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin and Agent release cash pickup
  const handleSearchTransactionInPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentSearchRef) return;
    setAgentActionLoading(true);
    setAgentFeedback('');
    setAgentFoundTxn(null);

    try {
      const res = await fetch(`/api/transfers/track/${agentSearchRef.trim()}`);
      const data = await res.json();
      if (data.transaction) {
        setAgentFoundTxn(data.transaction);
      } else {
        setAgentFeedback('No cash release voucher matched this code.');
      }
    } catch (err) {
      setAgentFeedback('Error finding voucher.');
    } finally {
      setAgentActionLoading(false);
    }
  };

  const handleUpdateTransferStatus = async (txnId: string, nextStatus: TransferStatus) => {
    setAgentActionLoading(true);
    setAgentFeedback('');
    try {
      const res = await fetch('/api/transfers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txnId,
          status: nextStatus,
          agentId: currentUser?.id || 'agent-sl'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAgentFeedback(`Transaction successfully marked as ${nextStatus}! Gateway synced.`);
        setAgentFoundTxn(data.transaction);
        if (currentUser) {
          fetchUserTransactions(currentUser);
          if (currentUser.role === 'Admin') {
            fetchAdminData();
          }
        }
      }
    } catch (err) {
      setAgentFeedback('Failed to update status.');
    } finally {
      setAgentActionLoading(false);
    }
  };

  // --- QR Code Scanner Functions ---
  const startQrScanner = async () => {
    setIsScanningQr(true);
    setQrScanError('');
    setQrScanSuccess(false);
    
    // Give state updates a moment to render elements in the DOM
    setTimeout(async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera device access is not supported by this browser or secure context.');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
          videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
        
        // Start decoding loop
        animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        console.error('Camera access failed:', err);
        setQrScanError(err.message || 'Could not acquire camera stream. Please ensure frame permissions are allowed.');
      }
    }, 100);
  };

  const stopQrScanner = () => {
    setIsScanningQr(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Also clean up if they navigate away from agent portal
  useEffect(() => {
    if (activeTab !== 'agent-portal') {
      stopQrScanner();
    }
  }, [activeTab]);

  const handleQrCodeFound = async (code: string) => {
    setQrScanSuccess(true);
    setAgentSearchRef(code);
    
    // Beep / audio feedback using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // high pitch beep
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08); // short beep
    } catch (e) {
      // AudioContext blocked or unsupported
    }

    // Retrieve voucher automatically
    setAgentActionLoading(true);
    setAgentFeedback('');
    setAgentFoundTxn(null);
    
    try {
      const res = await fetch(`/api/transfers/track/${code.trim()}`);
      const data = await res.json();
      if (data.transaction) {
        setAgentFoundTxn(data.transaction);
        setAgentFeedback(`QR Code verified successfully! Auto-retrieved voucher.`);
      } else {
        setAgentFeedback(`Voucher match failed for scanned code "${code}".`);
      }
    } catch (err) {
      setAgentFeedback('Error verifying voucher connection.');
    } finally {
      setAgentActionLoading(false);
      // Close camera after 1 second of success display
      setTimeout(() => {
        stopQrScanner();
      }, 1000);
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanningQr) {
      if (isScanningQr) {
        animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          
          if (decoded && decoded.data) {
            const scannedCode = decoded.data.trim();
            handleQrCodeFound(scannedCode);
            return; // Stop scanning loop on success
          }
        } catch (e) {
          // ignore parsing error in intermediate frame
        }
      }
    }
    
    if (isScanningQr) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const simulateQrScan = (code: string) => {
    handleQrCodeFound(code);
  };

  // Generate mock printable receipt
  const triggerPrintReceipt = () => {
    window.print();
  };

  // Quick preset test login bypass
  const quickTestLogin = (phone: string, role: 'Sender' | 'Recipient' | 'Agent' | 'Admin') => {
    setAuthPhone(phone);
    setAuthRole(role);
    setOtpCode('123456');
    setMockOtp('123456 (Auto Preset code)');
  };

  // Filter agents list
  const filteredAgents = agents.filter(agent => {
    const q = agentSearchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.city.toLowerCase().includes(q) ||
      agent.country.toLowerCase().includes(q) ||
      agent.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col justify-between">
      
      {/* Sandbox Header Helper Info Bar */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-2 flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 relative z-50">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md text-[10px] tracking-wide">SANDBOX SIMULATOR</span>
          <span className="text-slate-300">Fast-switch roles to test the full remittance pipeline on one screen:</span>
        </div>
        
        {/* Quick Account Swappers */}
        <div className="flex flex-wrap items-center gap-2">
          {!currentUser ? (
            <div className="flex items-center gap-1">
              <span className="text-slate-400 mr-1">Quick Login:</span>
              <button 
                onClick={() => quickTestLogin('+232 76 333333', 'Sender')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-slate-700 transition"
              >
                🇸🇱 Hindo (Sender)
              </button>
              <button 
                onClick={() => quickTestLogin('+232 76 222222', 'Agent')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-slate-700 transition"
              >
                🇸🇱 Kadiatu (SL Agent)
              </button>
              <button 
                onClick={() => quickTestLogin('+232 76 111111', 'Admin')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-slate-700 transition"
              >
                👑 Alpha (Admin)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Active User: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Force Role Toggle:</span>
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5">
                {(['Sender', 'Agent', 'Admin'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => switchSandboxRole(r)}
                    className={`px-2 py-0.5 text-[9px] rounded font-semibold transition ${
                      currentUser.role === r 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lang Selector */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700 ml-2">
            <button 
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('fr')}
              className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${lang === 'fr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              FR
            </button>
          </div>
        </div>
      </div>

      {/* Main Beautiful Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 shadow-xs px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-indigo-100">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">{t.appTitle}</span>
                <span className="bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                  Active Gateway
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{t.tagline}</p>
            </div>
          </div>

          {/* Tab Navigation links */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setActiveTab('send')}
              id="tab-send"
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'send' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {t.sendView}
            </button>

            <button
              onClick={() => {
                setActiveTab('track');
                if (createdTxn && !trackRef) {
                  setTrackRef(createdTxn.reference);
                }
              }}
              id="tab-track"
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'track' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {t.trackView}
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              id="tab-agents"
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'agents' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {t.agentView}
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setActiveTab('kyc');
                  setKycSuccessMsg('');
                  setKycErrorMsg('');
                }}
                id="tab-kyc"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'kyc' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                KYC Limits
              </button>
            )}

            {currentUser && (currentUser.role === 'Agent' || currentUser.role === 'Admin') && (
              <button
                onClick={() => {
                  setActiveTab('agent-portal');
                  setAgentFeedback('');
                  setAgentFoundTxn(null);
                }}
                id="tab-agent-portal"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'agent-portal' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                🔑 {t.agentPortalView}
              </button>
            )}

            {currentUser && currentUser.role === 'Admin' && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  fetchAdminData();
                }}
                id="tab-admin"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'admin' 
                    ? 'bg-rose-600 text-white shadow-sm' 
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                👑 {t.dashboardView}
              </button>
            )}
          </div>

          {/* Right Session Panel */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                  <div className="flex items-center justify-end gap-1">
                    <span className={`w-2 h-2 rounded-full ${currentUser.kycStatus === 'Approved' ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-tight">
                      {currentUser.kycTier} • {currentUser.kycStatus}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <div className="text-slate-500 text-xs font-medium">
                🔒 Secured with Regional KYC/AML
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* Primary Alert Context bar */}
      <div className="bg-indigo-50 border-y border-indigo-100 py-2.5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase text-[9px]">Optimized Low-Bandwidth</span>
            <p className="font-medium hidden sm:inline">{t.lowBandwidthAlert}</p>
            <p className="font-medium sm:hidden">Fast network cache enabled</p>
          </div>
          <div className="font-semibold text-slate-600">
            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column / Dynamic View Area (Occupies 8 cols of 12) */}
        <section className="col-span-1 lg:col-span-8 flex flex-col gap-6">
          
          {/* USER IS NOT LOGGED IN OVERLAY & INTERACTIVE PORTAL WELCOME */}
          {!currentUser && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col gap-6" id="auth-panel">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.phoneLogin}</h2>
                <p className="text-sm text-slate-500 mt-1">{t.appSubtitle}</p>
              </div>

              {authError && (
                <div className="bg-rose-50 text-rose-800 text-xs p-4 rounded-2xl border border-rose-200 font-medium">
                  ⚠️ {authError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Form to log in with custom phone */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder={t.phonePlaceholder}
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Full Legal Name (For new registrations)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Amadou Jalloh"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desired Registration Role</label>
                    <select 
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value as any)}
                      className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition"
                    >
                      <option value="Sender">Sender (Envoyer de l'argent)</option>
                      <option value="Agent">Remittance Payout Cashier (Agent)</option>
                      <option value="Admin">Compliance Manager (Admin)</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={requestOtp}
                      disabled={authLoading}
                      className="flex-1 bg-slate-900 text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-slate-800 transition disabled:opacity-50 text-xs"
                    >
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t.sendOtp}
                    </button>
                  </div>
                </div>

                {/* Simulated SMS Box */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col gap-4 justify-between">
                  <div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                      Regional SMS Gateway Emulator
                    </span>
                    <h3 className="text-xs font-bold text-slate-700 mt-2">Mock Mobile Device View:</h3>
                    
                    {mockOtp ? (
                      <div className="mt-4 p-4 bg-slate-900 rounded-xl text-indigo-400 font-mono text-center border border-indigo-900">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{t.otpSentMsg}</p>
                        <p className="text-2xl font-black text-white tracking-widest">{mockOtp}</p>
                        <p className="text-[9px] text-slate-400 mt-2">No actual SMS rates charged. Copy code to continue.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">
                        Input your phone number or click any of the preset simulation swappers at the top of the page to auto-fill verified accounts for Hindo, Kadiatu or Alpha.
                      </p>
                    )}
                  </div>

                  {mockOtp && (
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.enterOtp}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder={t.otpPlaceholder}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="border border-slate-300 rounded-xl p-3 bg-white text-center font-bold text-lg tracking-widest w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={verifyOtp}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl transition text-xs whitespace-nowrap"
                        >
                          {t.verifyOtpBtn}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Developer notice on limits */}
              <div className="flex gap-3 items-start bg-indigo-50/50 p-4 rounded-xl text-[11px] text-indigo-900/80 leading-relaxed border border-indigo-100/40">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <p>
                  <strong>Sandbox Integration Notice:</strong> This prototype is built with persistent client local state proxies. Regulatory compliance thresholds (Tier 1: $100 limit, Tier 2: $1000 limit, Tier 3: $5000 limit) are enforced automatically on all transaction routes.
                </p>
              </div>
            </div>
          )}

          {/* VIEW 1: SEND MONEY (CALCULATOR & TRANSFER AUTHORIZATION) */}
          {currentUser && activeTab === 'send' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col gap-6" id="send-money-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.sendView}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t.calculatorTitle}</p>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[11px] font-bold text-slate-600">
                  {currentUser.kycTier === 'Tier1' ? 'Tier 1 Limit: $100 USD' : currentUser.kycTier === 'Tier2' ? 'Tier 2 Limit: $1,000 USD' : 'Tier 3 Limit: $5,000 USD'}
                </div>
              </div>

              {/* Recipient successfully created alert */}
              {createdTxn && (
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-6 rounded-2xl flex flex-col gap-3 relative overflow-hidden animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h4 className="font-bold text-sm text-emerald-800">{t.transferSuccess}</h4>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-emerald-100/60 shadow-xs">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(createdTxn.reference)}`}
                      alt="Remittance QR Code"
                      className="w-24 h-24 bg-white p-1 border border-slate-100 rounded-lg shrink-0 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-left text-xs space-y-1 font-medium">
                      <p>{t.refCode} <strong className="font-mono text-emerald-900 text-sm tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">{createdTxn.reference}</strong></p>
                      <p className="text-slate-600">Recipient: <strong>{createdTxn.recipientName}</strong> ({createdTxn.recipientPhone})</p>
                      <p className="text-slate-600">Delivered via: <strong>{createdTxn.payoutProvider} ({createdTxn.recipientCountry})</strong></p>
                      <p className="text-[10px] text-indigo-600 font-semibold pt-1">
                        📲 Present this QR code to any authorized cashier for instant scanning!
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => {
                        setTrackRef(createdTxn.reference);
                        setActiveTab('track');
                        handleTrackTransaction();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition"
                    >
                      {t.trackView} →
                    </button>
                    <button 
                      onClick={() => setCreatedTxn(null)}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1: Corridor Selection */}
              <form onSubmit={handleAuthorizeTransfer} className="flex flex-col gap-6">
                
                {/* From / To Countries Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.sendCountry}</label>
                    <select
                      value={sendCountry}
                      onChange={(e) => {
                        setSendCountry(e.target.value);
                        // Prevent sending to self country for cross-border logic
                        if (e.target.value === receiveCountry) {
                          setReceiveCountry(e.target.value === 'Sierra Leone' ? 'Guinea' : 'Sierra Leone');
                        }
                      }}
                      className="border border-slate-200 bg-slate-50 rounded-2xl p-3.5 font-semibold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      <option value="Sierra Leone">Sierra Leone 🇸🇱</option>
                      <option value="Guinea">Guinea (Guinée) 🇬🇳</option>
                      <option value="Liberia">Liberia 🇱🇷</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.receiveCountry}</label>
                    <select
                      value={receiveCountry}
                      onChange={(e) => {
                        setReceiveCountry(e.target.value);
                        if (e.target.value === sendCountry) {
                          setSendCountry(e.target.value === 'Sierra Leone' ? 'Guinea' : 'Sierra Leone');
                        }
                      }}
                      className="border border-slate-200 bg-slate-50 rounded-2xl p-3.5 font-semibold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      <option value="Sierra Leone">Sierra Leone 🇸🇱</option>
                      <option value="Guinea">Guinea (Guinée) 🇬🇳</option>
                      <option value="Liberia">Liberia 🇱🇷</option>
                    </select>
                  </div>
                </div>

                {/* Input Amounts and Currencies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t.sendAmount} ({sendCurrency})
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-2xl p-3.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                      <input 
                        type="number"
                        min="1"
                        step="any"
                        placeholder="0.00"
                        value={amountType === 'send' ? calcAmount : (calcResults?.senderAmount || '')}
                        onChange={(e) => {
                          setAmountType('send');
                          setCalcAmount(e.target.value);
                        }}
                        className="bg-transparent text-lg font-bold w-full outline-none text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-inner-spin-button]:margin-0"
                      />
                      <span className="font-bold text-slate-400 ml-2">{sendCurrency}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">
                      {sendCurrency === 'SLE' ? 'Sierra Leonean Leone' : sendCurrency === 'GNF' ? 'Guinean Franc' : 'Liberian Dollar'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t.receiveAmount} ({receiveCurrency})
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-2xl p-3.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                      <input 
                        type="number"
                        min="1"
                        step="any"
                        placeholder="0.00"
                        value={amountType === 'receive' ? calcAmount : (calcResults?.recipientAmount || '')}
                        onChange={(e) => {
                          setAmountType('receive');
                          setCalcAmount(e.target.value);
                        }}
                        className="bg-transparent text-lg font-bold w-full outline-none text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-inner-spin-button]:margin-0"
                      />
                      <span className="font-bold text-slate-400 ml-2">{receiveCurrency}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">
                      {receiveCurrency === 'SLE' ? 'Sierra Leonean Leone' : receiveCurrency === 'GNF' ? 'Guinean Franc' : 'Liberian Dollar'}
                    </span>
                  </div>
                </div>

                {/* Guaranteed Exchange Rates summary Box */}
                <div className="bg-indigo-50/75 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div>
                      {calcLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <p className="text-xs text-indigo-900 font-semibold">Updating regional rates...</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-indigo-950">
                            {t.exRate}: 1 {sendCurrency} = {calcResults?.exchangeRate} {receiveCurrency}
                          </p>
                          <p className="text-[11px] text-indigo-700">
                            {t.fee}: {calcResults?.fee} {sendCurrency} • Total Cost: {calcResults?.totalCharged} {sendCurrency}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-200">
                    Sovereign Ref: USD
                  </div>
                </div>

                {/* Choice of Payout / Wallet Provider Method */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.payoutMethod}</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutMethod('MobileMoney');
                        // Set standard mobile provider based on destination country
                        if (receiveCountry === 'Sierra Leone') setPayoutProvider('Orange Money');
                        if (receiveCountry === 'Guinea') setPayoutProvider('Orange Money');
                        if (receiveCountry === 'Liberia') setPayoutProvider('Lonestar Cell MTN');
                      }}
                      className={`border-2 rounded-2xl p-4 bg-white flex flex-col items-center justify-center gap-1.5 text-center transition ${
                        payoutMethod === 'MobileMoney' 
                          ? 'border-indigo-600 ring-2 ring-indigo-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                        M
                      </div>
                      <span className="text-xs font-bold text-slate-800">{t.payoutMethodMobile}</span>
                      <span className="text-[10px] text-slate-500">Instant deposit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPayoutMethod('CashPickup');
                        setPayoutProvider('Agent Cash-out');
                      }}
                      className={`border-2 rounded-2xl p-4 bg-white flex flex-col items-center justify-center gap-1.5 text-center transition ${
                        payoutMethod === 'CashPickup' 
                          ? 'border-indigo-600 ring-2 ring-indigo-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                        C
                      </div>
                      <span className="text-xs font-bold text-slate-800">{t.payoutMethodCash}</span>
                      <span className="text-[10px] text-slate-500">Agent Network</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPayoutMethod('BankTransfer');
                        setPayoutProvider('EcoBank');
                      }}
                      className={`border-2 rounded-2xl p-4 bg-white flex flex-col items-center justify-center gap-1.5 text-center transition ${
                        payoutMethod === 'BankTransfer' 
                          ? 'border-indigo-600 ring-2 ring-indigo-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                        B
                      </div>
                      <span className="text-xs font-bold text-slate-800">{t.payoutMethodBank}</span>
                      <span className="text-[10px] text-slate-500">Next-day settlement</span>
                    </button>

                  </div>
                </div>

                {/* Sub-provider networks dependent on choice */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.payoutProvider}</label>
                  
                  {payoutMethod === 'MobileMoney' ? (
                    <select
                      value={payoutProvider}
                      onChange={(e) => setPayoutProvider(e.target.value)}
                      className="border border-slate-200 bg-white rounded-xl p-3 font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {receiveCountry === 'Sierra Leone' && (
                        <>
                          <option value="Orange Money">Orange Money 🇸🇱</option>
                          <option value="Africell Money">Africell Money 🇸🇱</option>
                        </>
                      )}
                      {receiveCountry === 'Guinea' && (
                        <>
                          <option value="Orange Money Guinée">Orange Money 🇬🇳</option>
                          <option value="MTN Mobile Money Guinée">MTN Mobile Money 🇬🇳</option>
                        </>
                      )}
                      {receiveCountry === 'Liberia' && (
                        <>
                          <option value="Lonestar Cell MTN">Lonestar Cell MTN 🇱🇷</option>
                          <option value="Orange Money Liberia">Orange Money 🇱🇷</option>
                        </>
                      )}
                    </select>
                  ) : payoutMethod === 'CashPickup' ? (
                    <div className="text-xs font-bold text-slate-800 p-2 bg-white rounded-xl border border-slate-100 flex justify-between items-center">
                      <span>🏦 Authorized Regional Cash Out Agents</span>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab('agents')} 
                        className="text-indigo-600 underline text-[10px]"
                      >
                        View Locations Map
                      </button>
                    </div>
                  ) : (
                    <select
                      value={payoutProvider}
                      onChange={(e) => setPayoutProvider(e.target.value)}
                      className="border border-slate-200 bg-white rounded-xl p-3 font-semibold text-sm text-slate-800 focus:outline-none"
                    >
                      <option value="EcoBank">EcoBank Plc (Guaranty Trust Network)</option>
                      <option value="Sierra Leone Commercial Bank">Sierra Leone Commercial Bank</option>
                      <option value="FIBank Guinea">FIBank Guinea (Guinée)</option>
                      <option value="International Bank of Liberia">International Bank of Liberia (IB)</option>
                    </select>
                  )}
                </div>

                {/* Recipient Personal Information */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">{t.recipientInfo}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.recipientName}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Moussa Camara"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        required
                        className="border border-slate-200 bg-white rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.recipientPhone}</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. +224 620 112233"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        required
                        className="border border-slate-200 bg-white rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* AML Compliance Alert message */}
                <div className="bg-amber-50 text-amber-950 p-4 rounded-2xl border border-amber-200 flex gap-3 text-xs leading-relaxed">
                  <Sliders className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <strong>Sovereign Mano River AML Directives Applied:</strong>
                    <p className="text-slate-700 mt-1">
                      By authorizing, you declare this is non-commercial support. Senders at <strong>{currentUser.kycTier}</strong> are capped at <strong>
                        {currentUser.kycTier === 'Tier1' ? '$100' : currentUser.kycTier === 'Tier2' ? '$1,000' : '$5,000'} USD
                      </strong> equivalent per transfer. High-value transactions are subject to immediate administrative review.
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={transferSubmitLoading}
                  className="w-full bg-indigo-600 text-white font-black py-4.5 rounded-2xl shadow-md hover:bg-indigo-700 transition disabled:opacity-50 text-sm tracking-wide"
                >
                  {transferSubmitLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> {t.transferProcessing}
                    </span>
                  ) : t.confirmTransfer}
                </button>

              </form>
            </div>
          )}

          {/* VIEW 2: TRACK STATUS / PRINTABLE RECEIPTS */}
          {activeTab === 'track' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col gap-6" id="track-money-card">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.trackTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.trackSubtitle}</p>
              </div>

              {/* Trace search Form */}
              <form onSubmit={handleTrackTransaction} className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={t.refPlaceholder}
                    value={trackRef}
                    onChange={(e) => setTrackRef(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold tracking-wider placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="bg-slate-900 text-white font-bold px-6 rounded-2xl hover:bg-slate-800 transition text-xs whitespace-nowrap"
                >
                  {trackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.trackBtn}
                </button>
              </form>

              {trackError && (
                <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-xl text-xs font-medium">
                  ⚠️ {trackError}
                </div>
              )}

              {/* Tracked Transaction result details */}
              {trackedTxn ? (
                <div className="flex flex-col gap-6 pt-4 border-t border-slate-100" id="receipt-section">
                  
                  {/* Step Progress Visualizer */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Gateway Pipeline Status</span>
                      
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        trackedTxn.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        trackedTxn.status === 'Flagged' ? 'bg-rose-100 text-rose-800' :
                        trackedTxn.status === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {trackedTxn.status === 'Initiated' && t.statusInitiated}
                        {trackedTxn.status === 'Processing' && t.statusProcessing}
                        {trackedTxn.status === 'Ready' && t.statusReady}
                        {trackedTxn.status === 'Completed' && t.statusCompleted}
                        {trackedTxn.status === 'Flagged' && t.statusFlagged}
                      </span>
                    </div>

                    {/* Step Visualizer Circles */}
                    <div className="grid grid-cols-4 gap-2 relative mt-6">
                      <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-200 -z-0"></div>
                      
                      {/* Step 1: Initiated */}
                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          ['Initiated', 'Processing', 'Ready', 'Completed'].includes(trackedTxn.status) 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          1
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 mt-1">Initiated</span>
                      </div>

                      {/* Step 2: Processing */}
                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          ['Processing', 'Ready', 'Completed'].includes(trackedTxn.status) 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          2
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 mt-1">Gateway Hold</span>
                      </div>

                      {/* Step 3: Ready */}
                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          ['Ready', 'Completed'].includes(trackedTxn.status) 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          3
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 mt-1">Disbursement Ready</span>
                      </div>

                      {/* Step 4: Completed */}
                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          trackedTxn.status === 'Completed' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          ✓
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 mt-1">Settled</span>
                      </div>
                    </div>

                    {trackedTxn.isFlagged && (
                      <div className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                        <strong className="block">⚠️ Suspicious Regulatory Flag Status Triggered:</strong>
                        <p className="mt-1">{trackedTxn.flagReason}</p>
                        <p className="text-slate-500 mt-2 font-medium">Please verify your sender profile has Tier 2 or Tier 3 credentials loaded to release holds.</p>
                      </div>
                    )}
                  </div>

                  {/* Official Remittance Receipt styled elegantly */}
                  <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-xs relative print:border-none">
                    
                    {/* Header receipt info with QR Code */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t.receiptTitle}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">REFERENCE: {trackedTxn.reference}</p>
                        <p className="text-[10px] text-indigo-600 font-bold mt-1">✓ Scan-ready Voucher</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackedTxn.reference)}`}
                          alt="Receipt QR Code"
                          className="w-16 h-16 bg-white p-1 border border-slate-200 rounded-lg shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left hidden sm:block">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AGENT SCAN VOUCHER</p>
                          <span className="text-[10px] text-slate-500 font-medium block max-w-[140px] leading-tight">Present to any agent for quick camera payouts.</span>
                        </div>
                      </div>
                    </div>

                    {/* Sender and Recipient cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">SENDER DETAILS</p>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                          <p className="font-bold text-slate-900">{trackedTxn.senderName}</p>
                          <p className="text-slate-500 font-mono">{trackedTxn.senderPhone}</p>
                          <p className="text-slate-500">Origin: <strong>{trackedTxn.senderCountry}</strong></p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">RECIPIENT BENEFICIARY</p>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                          <p className="font-bold text-slate-900">{trackedTxn.recipientName}</p>
                          <p className="text-slate-500 font-mono">{trackedTxn.recipientPhone}</p>
                          <p className="text-slate-500">Destination: <strong>{trackedTxn.recipientCountry}</strong></p>
                        </div>
                      </div>
                    </div>

                    {/* Financial details Grid */}
                    <div className="border-y border-slate-200 py-4 text-xs space-y-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500">Principal Sent:</span>
                        <span className="font-bold text-slate-900">{trackedTxn.senderAmount} {trackedTxn.senderCurrency}</span>
                      </div>
                      
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500">Mano River Baseline Fee:</span>
                        <span className="text-slate-900 font-bold">+ {trackedTxn.fee} {trackedTxn.senderCurrency}</span>
                      </div>

                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500">Guaranteed Conversion Rate:</span>
                        <span className="text-indigo-600 font-bold">1 {trackedTxn.senderCurrency} = {trackedTxn.exchangeRate} {trackedTxn.recipientCurrency}</span>
                      </div>

                      <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-100">
                        <span className="text-slate-800">Total Paid by Sender:</span>
                        <span className="text-slate-950 underline decoration-indigo-500 decoration-2">{trackedTxn.totalCharged} {trackedTxn.senderCurrency}</span>
                      </div>

                      <div className="flex justify-between text-sm font-black text-green-700 bg-green-50 p-2.5 rounded-xl mt-3">
                        <span>Recipient Delivery Amount:</span>
                        <span>{trackedTxn.recipientAmount} {trackedTxn.recipientCurrency}</span>
                      </div>
                    </div>

                    {/* Payout Mechanism detail */}
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Payout Network:</span>
                      <span className="text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                        {trackedTxn.payoutMethod} - {trackedTxn.payoutProvider}
                      </span>
                    </div>

                    {/* Timeline logs */}
                    {trackedTxn.auditLogs && (
                      <div className="text-[10px] text-slate-500 space-y-1 pt-3 border-t border-slate-100">
                        <p className="font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ledger Integrity Proof Logs:</p>
                        {trackedTxn.auditLogs.map((log, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="text-indigo-600">•</span>
                            <span className="font-mono">{log}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 print:hidden justify-end">
                      <button 
                        onClick={triggerPrintReceipt}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t.downloadReceipt}
                      </button>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center text-slate-500 flex flex-col items-center gap-2">
                  <Search className="w-10 h-10 text-slate-300" />
                  <p className="text-xs leading-relaxed">
                    Enter the generated reference (e.g., <strong>TXN-4921-3901</strong> or your custom created transfer) to view instant status tracking, compliance levels, audit trails, and official receipts.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* VIEW 3: AGENTS LOCATOR */}
          {activeTab === 'agents' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col gap-6" id="agent-locator-card">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.agentTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">Find designated local mobile cash-out points & partner desks in Sierra Leone, Guinea, and Liberia</p>
              </div>

              {/* Locator Search */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t.agentSearch}
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-2xl py-3 pl-12 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Map & List container */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Simulated map graphic (Desktop Left) */}
                <div className="md:col-span-7 bg-slate-900 rounded-2xl overflow-hidden min-h-[250px] relative flex flex-col justify-between p-6 text-white border border-slate-800">
                  <div className="absolute inset-0 opacity-15 pointer-events-none select-none">
                    {/* Simulated abstract geographical coordinates vector */}
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white blur-xl animate-pulse"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full bg-indigo-500 blur-2xl"></div>
                    <div className="absolute top-1/3 right-1/3 text-[8px] font-mono whitespace-pre text-white leading-3">
                      SL: 8.484, -13.234 {"\n"}
                      GN: 9.509, -13.712 {"\n"}
                      LR: 6.319, -10.804
                    </div>
                  </div>

                  <div className="relative z-10">
                    <span className="bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">
                      Ledger Ground Locations
                    </span>
                    <h4 className="text-sm font-bold mt-2">Mano River Border Depot Hubs</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Showing verified agent locations providing physical currency disbursement.</p>
                  </div>

                  {/* Active Selected Agent Overlay */}
                  {selectedAgent ? (
                    <div className="relative z-10 bg-slate-850 p-3.5 rounded-xl border border-slate-700 text-xs animate-fade-in mt-4">
                      <p className="font-bold text-indigo-400">{selectedAgent.name}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{selectedAgent.address}, {selectedAgent.city}</p>
                      <p className="text-[9px] text-indigo-300 font-semibold mt-1">📞 {selectedAgent.phone}</p>
                    </div>
                  ) : (
                    <div className="relative z-10 p-3.5 bg-slate-800/40 rounded-xl text-[10px] text-slate-400 italic">
                      Click any agent card on the right to focus coordinates on GPS ledger
                    </div>
                  )}

                  <div className="relative z-10 text-[9px] font-mono text-slate-400 mt-2">
                    System precision SLA: 99.8% • Network refresh: 5 mins
                  </div>
                </div>

                {/* Agents list scroll area (Desktop Right) */}
                <div className="md:col-span-5 flex flex-col gap-3.5 max-h-[350px] overflow-y-auto">
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map(agent => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgent(agent)}
                        className={`text-left p-4 rounded-xl border transition flex flex-col gap-1.5 ${
                          selectedAgent?.id === agent.id 
                            ? 'border-indigo-600 bg-indigo-50/20' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="text-xs font-bold text-slate-800">{agent.name}</span>
                          <span className="bg-slate-100 text-slate-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {agent.country}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">{agent.address}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.supportedProviders.map((p, i) => (
                            <span key={i} className="bg-indigo-50 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-4">No matching agents found.</p>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* VIEW 4: KYC VERIFICATION TAB */}
          {currentUser && activeTab === 'kyc' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col gap-6" id="kyc-verification-card">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.kycTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.kycInfo}</p>
              </div>

              {/* Status Banner */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{t.kycTierBadge}</span>
                  <p className="text-lg font-black text-indigo-600">{currentUser.kycTier} ({currentUser.kycStatus === 'None' ? 'Not Verified' : currentUser.kycStatus})</p>
                </div>
                <div className="text-xs space-y-1 font-medium">
                  <p className="text-slate-600">{t.currentLimit}</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {currentUser.kycTier === 'Tier1' ? '$100' : currentUser.kycTier === 'Tier2' ? '$1,000' : '$5,000'} USD Per Single Corridor Transfer
                  </p>
                </div>
              </div>

              {currentUser.kycStatus === 'Pending' ? (
                <div className="bg-amber-50 text-amber-900 border border-amber-200 p-6 rounded-2xl text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
                  <h4 className="font-bold text-sm">{t.kycPendingApproval}</h4>
                  <p className="text-xs text-slate-600">The platform administrative team usually approves document verification in minutes.</p>
                </div>
              ) : currentUser.kycStatus === 'Approved' ? (
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-6 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-sm">{t.kycApproved} {currentUser.kycTier}!</h4>
                  <p className="text-xs text-slate-600">Your profile has no outstanding compliance constraints. Happy sending!</p>
                </div>
              ) : (
                <form onSubmit={handleKycSubmit} className="flex flex-col gap-4">
                  
                  {kycSuccessMsg && (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-xs font-medium">
                      ✓ {kycSuccessMsg}
                    </div>
                  )}

                  {kycErrorMsg && (
                    <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl text-xs font-medium">
                      ⚠️ {kycErrorMsg}
                    </div>
                  )}

                  {currentUser.kycDetails?.rejectionReason && (
                    <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl text-xs font-medium">
                      ❌ {t.kycRejected} {currentUser.kycDetails.rejectionReason}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.idType}</label>
                      <select
                        value={kycIdType}
                        onChange={(e) => setKycIdType(e.target.value)}
                        className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      >
                        <option value="National Passport">Mano River Sovereign Passport</option>
                        <option value="National ID">ECOWAS ID Smart Card</option>
                        <option value="Voters Card">National Electoral Registration Voucher</option>
                        <option value="Driving License">Regional Digital Drivers Permit</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.idNum}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. SL-ID-8291-0"
                        value={kycIdNum}
                        onChange={(e) => setKycIdNum(e.target.value)}
                        required
                        className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.homeAddress}</label>
                    <input 
                      type="text" 
                      placeholder="Street, District/City, Country"
                      value={kycAddress}
                      onChange={(e) => setKycAddress(e.target.value)}
                      required
                      className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Level Goal</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="kyc_tier" 
                            checked={kycRequestedTier === 'Tier2'} 
                            onChange={() => setKycRequestedTier('Tier2')}
                            className="text-indigo-600 focus:ring-indigo-500" 
                          />
                          Tier 2 (Up to $1000)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="kyc_tier" 
                            checked={kycRequestedTier === 'Tier3'} 
                            onChange={() => setKycRequestedTier('Tier3')}
                            className="text-indigo-600 focus:ring-indigo-500" 
                          />
                          Tier 3 (Up to $5000)
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Document Scan URL</label>
                      <input 
                        type="text" 
                        placeholder="https://example.com/id_scan.jpg (Preloaded placeholder)"
                        disabled
                        className="border border-slate-200 bg-slate-150 rounded-xl p-3 text-xs focus:outline-none text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 bg-indigo-600 text-white font-black py-4.5 rounded-2xl shadow-sm hover:bg-indigo-700 transition text-xs tracking-wider"
                  >
                    {t.submitKycBtn}
                  </button>

                </form>
              )}

            </div>
          )}

          {/* VIEW 5: AGENT CASHIER PORTAL */}
          {currentUser && (currentUser.role === 'Agent' || currentUser.role === 'Admin') && activeTab === 'agent-portal' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col gap-6" id="agent-portal-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.agentPortalTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">Disburse physical cash-out or mobile wallets settlements & verify vouchers</p>
                </div>
                <div className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black">
                  💰 SLA Authorized Depot
                </div>
              </div>

              {/* Reserves & Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{t.agentReserves}</span>
                  <p className="text-xl font-bold text-slate-800">120,500.00 SLE / $5,000 USD Equiv</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{t.commissionEarned}</span>
                  <p className="text-xl font-bold text-indigo-600">+480.00 SLE (Claimable)</p>
                </div>
              </div>

              {/* QR Code Scanner & Manual Search Tabs */}
              <div className="flex flex-col gap-4">
                <div className="border border-slate-200 rounded-2xl p-1.5 flex gap-1.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsScanningQr(false);
                      stopQrScanner();
                    }}
                    className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      !isScanningQr 
                        ? 'bg-white text-indigo-600 shadow-xs border border-slate-200' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⌨️ Manual Code Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => startQrScanner()}
                    className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      isScanningQr 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> {t.tapToScan}
                  </button>
                </div>

                {!isScanningQr ? (
                  /* Manual search voucher code input */
                  <form onSubmit={handleSearchTransactionInPortal} className="flex gap-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-widest mb-1">{t.cashierSearch}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. TXN-4921-3901"
                        value={agentSearchRef}
                        onChange={(e) => setAgentSearchRef(e.target.value)}
                        className="w-full border border-indigo-200 bg-white rounded-xl py-3 px-4 font-mono font-bold tracking-widest text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={agentActionLoading}
                      className="bg-slate-900 text-white font-bold px-6 rounded-xl hover:bg-slate-800 transition text-xs mt-5"
                    >
                      Retrieve Voucher
                    </button>
                  </form>
                ) : (
                  /* Camera stream view with Scanner frame animation */
                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex flex-col items-center gap-4 relative overflow-hidden">
                    
                    {/* Scanner video box */}
                    <div className="relative w-full max-w-sm aspect-video bg-black rounded-xl overflow-hidden border border-slate-700">
                      {/* Glowing scanning line */}
                      <div className="absolute left-0 right-0 top-0 h-0.5 bg-indigo-500 opacity-70 animate-bounce shadow-[0_0_8px_rgba(99,102,241,0.8)] z-20"></div>
                      
                      {/* Targeting corner lines */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl z-10"></div>
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr z-10"></div>
                      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl z-10"></div>
                      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br z-10"></div>

                      {/* Camera active video stream */}
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover animate-fade-in"
                        playsInline
                        muted
                      />

                      {/* Hidden canvas for image decoding */}
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Overlay states */}
                      {qrScanSuccess && (
                        <div className="absolute inset-0 bg-indigo-900/95 flex flex-col items-center justify-center gap-2 z-30 animate-fade-in text-center p-4">
                          <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-pulse" />
                          <span className="text-sm font-bold text-emerald-300">{t.scanSuccess}</span>
                          <span className="text-[10px] font-mono text-indigo-200 uppercase bg-indigo-800 px-2 py-0.5 rounded">{agentSearchRef}</span>
                        </div>
                      )}

                      {qrScanError && (
                        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center gap-2 z-30 animate-fade-in">
                          <AlertTriangle className="w-10 h-10 text-amber-500" />
                          <span className="text-xs font-bold text-slate-200 font-sans">Device/Permission Notice</span>
                          <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs font-sans">{t.scanError}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center font-sans">
                      <p className="text-xs font-bold text-slate-300 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                        {t.scanningActive}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">Accept camera prompt when asked to use terminal scanner.</p>
                    </div>

                    {/* Simulator option - essential for iframe runtimes */}
                    <div className="w-full border-t border-slate-800 pt-4 mt-2 font-sans">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 text-center">💻 Sandbox Scanning Simulator</p>
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] text-slate-500 text-center">
                          Select a pending voucher in sandbox to instantly simulate scanning its receipt:
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {/* Option 1: Preloaded valid transaction */}
                          <button
                            type="button"
                            onClick={() => simulateQrScan('TXN-4921-3901')}
                            className="text-left bg-slate-800 hover:bg-indigo-950 hover:border-indigo-800 transition p-2 rounded-lg border border-slate-700 flex flex-col gap-0.5 text-[10px] cursor-pointer"
                          >
                            <span className="font-mono font-bold text-indigo-400">TXN-4921-3901 (Preloaded)</span>
                            <span className="text-slate-400 text-[9px]">Sender: Hindo Joseph • SLE 1,000</span>
                          </button>

                          {/* Option 2: Newly created user transactions if they exist */}
                          {userTransactions.filter(txn => txn.status !== 'Completed').slice(0, 5).map(txn => (
                            <button
                              type="button"
                              key={txn.id}
                              onClick={() => simulateQrScan(txn.reference)}
                              className="text-left bg-slate-800 hover:bg-indigo-950 hover:border-indigo-800 transition p-2 rounded-lg border border-slate-700 flex flex-col gap-0.5 text-[10px] cursor-pointer"
                            >
                              <span className="font-mono font-bold text-emerald-400">{txn.reference}</span>
                              <span className="text-slate-400 text-[9px]">Sender: {txn.senderName} • {txn.senderCurrency} {txn.senderAmount.toLocaleString()}</span>
                            </button>
                          ))}
                          
                          {userTransactions.filter(txn => txn.status !== 'Completed').length === 0 && (
                            <div className="col-span-full py-2 text-center text-[10px] text-slate-600 font-medium">
                              No other pending transfers found. Create a transfer to see it list here!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stop button */}
                    <button
                      type="button"
                      onClick={() => stopQrScanner()}
                      className="mt-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-[11px] transition cursor-pointer"
                    >
                      {t.stopScan}
                    </button>
                  </div>
                )}
              </div>

              {agentFeedback && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 p-4 rounded-xl text-xs font-bold font-mono">
                  💡 {agentFeedback}
                </div>
              )}

              {/* Retrieved voucher action pane */}
              {agentFoundTxn ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Voucher matched</p>
                      <h4 className="text-sm font-mono font-black text-slate-900">{agentFoundTxn.reference}</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      agentFoundTxn.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      agentFoundTxn.status === 'Flagged' ? 'bg-rose-100 text-rose-800' :
                      agentFoundTxn.status === 'Ready' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {agentFoundTxn.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400">Recipient Name:</p>
                      <p className="font-bold text-slate-800 text-sm">{agentFoundTxn.recipientName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Recipient Contact Phone:</p>
                      <p className="font-bold text-slate-800 font-mono text-sm">{agentFoundTxn.recipientPhone}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Total Cash to Pay:</p>
                      <p className="text-lg font-black text-slate-950">{agentFoundTxn.recipientAmount} {agentFoundTxn.recipientCurrency}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Funding Method:</p>
                      <p className="font-bold text-slate-800">{agentFoundTxn.payoutMethod} ({agentFoundTxn.payoutProvider})</p>
                    </div>
                  </div>

                  {agentFoundTxn.isFlagged && (
                    <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200 text-xs">
                      <strong>🚨 COMPLIANCE BLOCKED:</strong> This transfer is flagged. Only compliance managers with role 'Admin' can approve the release of flagged funds.
                    </div>
                  )}

                  {/* Operational cashier controls */}
                  <div className="flex gap-2">
                    {agentFoundTxn.status === 'Ready' && !agentFoundTxn.isFlagged && (
                      <button
                        onClick={() => handleUpdateTransferStatus(agentFoundTxn.id, 'Completed')}
                        disabled={agentActionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 px-4 rounded-xl text-xs transition"
                      >
                        ✓ {t.releaseBtn}
                      </button>
                    )}

                    {agentFoundTxn.status === 'Initiated' && (
                      <button
                        onClick={() => handleUpdateTransferStatus(agentFoundTxn.id, 'Processing')}
                        disabled={agentActionLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition"
                      >
                        Acquire Voucher & process Gateway
                      </button>
                    )}

                    {agentFoundTxn.status === 'Processing' && (
                      <button
                        onClick={() => handleUpdateTransferStatus(agentFoundTxn.id, 'Ready')}
                        disabled={agentActionLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition"
                      >
                        Set Status to Ready for pickup
                      </button>
                    )}

                    {agentFoundTxn.status === 'Completed' && (
                      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs text-center font-bold w-full">
                        💰 Voucher successfully disbursed. SLA verified.
                      </div>
                    )}
                  </div>

                </div>
              ) : null}

            </div>
          )}

          {/* VIEW 6: COMPLIANCE ADMIN DASHBOARD */}
          {currentUser && currentUser.role === 'Admin' && activeTab === 'admin' && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col gap-8 animate-fade-in" id="admin-panel-card">
              
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.adminTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">Override sovereign exchange rate pairs, inspect audit trail, and approve pending KYC submissions</p>
                </div>
                <button 
                  onClick={fetchAdminData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refresh Gateway
                </button>
              </div>

              {/* High level operational cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">{t.totalVolume}</span>
                  <p className="text-lg font-black text-slate-900 mt-1">${adminStats.totalTransferredUSD} USD</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">{t.activeUsers}</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">{adminStats.activeUsers}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 bg-amber-50/50">
                  <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider block">{t.pendingVerifs}</span>
                  <p className="text-lg font-bold text-amber-900 mt-1">{adminStats.pendingKyc}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 bg-rose-50/50">
                  <span className="text-[9px] uppercase font-bold text-rose-700 tracking-wider block">{t.flaggedTxns}</span>
                  <p className="text-lg font-bold text-rose-900 mt-1">{adminStats.flaggedTransactions}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">{t.agentNodes}</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">{adminStats.agentCount}</p>
                </div>

              </div>

              {/* Rate Override Panel & Baseline Fee Modifiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Exchange rates modifiers */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">💰 Exchange rates ledger Override</h3>
                    <span className="text-[10px] font-mono text-slate-400">Live Sync</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Choose Pair Corridor</label>
                    <select
                      value={selectedPairToOverride}
                      onChange={(e) => {
                        setSelectedPairToOverride(e.target.value);
                        const match = rates.find(r => r.pair === e.target.value);
                        if (match) setOverrideValue(match.rate.toString());
                      }}
                      className="border border-slate-300 bg-white rounded-xl p-2.5 text-xs font-semibold text-slate-800"
                    >
                      {rates.map(r => (
                        <option key={r.pair} value={r.pair}>{r.pair} (Current: {r.rate})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">New Spot Rate Value</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        step="any"
                        placeholder="e.g. 23.5"
                        value={overrideValue}
                        onChange={(e) => setOverrideValue(e.target.value)}
                        className="border border-slate-300 bg-white rounded-xl p-2 px-3 text-xs font-bold w-full"
                      />
                      <button
                        onClick={handleRateOverride}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-xl text-xs whitespace-nowrap"
                      >
                        {t.updateRateBtn}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal">
                      Note: Overriding a core USD pair will automatically recalculate secondary corridors (SLE, GNF, LRD cross rates).
                    </span>
                  </div>
                </div>

                {/* 2. Corridor operational fee modifiers */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">⚡ Baseline Corridor Fees</h3>
                    <span className="text-[10px] font-mono text-slate-400">Fixed & %</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Select Corridor</label>
                    <select
                      value={selectedFeeCorridorIndex}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        setSelectedFeeCorridorIndex(idx);
                        setNewBaseFeeValue(corridors[idx].baseFee.toString());
                        setNewPercentageFeeValue(corridors[idx].percentageFee.toString());
                      }}
                      className="border border-slate-300 bg-white rounded-xl p-2.5 text-xs font-semibold text-slate-800"
                    >
                      {corridors.map((c, idx) => (
                        <option key={idx} value={idx}>
                          {c.fromCountry} ({c.fromCurrency}) → {c.toCountry} ({c.toCurrency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Base Fee (Native)</label>
                      <input 
                        type="number" 
                        value={newBaseFeeValue}
                        onChange={(e) => setNewBaseFeeValue(e.target.value)}
                        className="border border-slate-300 bg-white rounded-xl p-2 px-3 text-xs font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Percentage (e.g. 0.01 = 1%)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        value={newPercentageFeeValue}
                        onChange={(e) => setNewPercentageFeeValue(e.target.value)}
                        className="border border-slate-300 bg-white rounded-xl p-2 px-3 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCorridorFeeUpdate}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs w-full transition"
                  >
                    {t.saveCorridorBtn}
                  </button>
                </div>

              </div>

              {/* Flagged suspicious high value transactions list */}
              <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200 flex flex-col gap-4">
                <h3 className="text-xs font-black uppercase text-rose-950 tracking-wider">🚨 Flagged suspicious high value transactions list</h3>
                
                <div className="space-y-3.5">
                  {allTransactions.filter(t => t.status === 'Flagged' || t.isFlagged).length > 0 ? (
                    allTransactions.filter(t => t.status === 'Flagged' || t.isFlagged).map((txn) => (
                      <div key={txn.id} className="bg-white p-4 rounded-xl border border-rose-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs shadow-xs">
                        <div className="space-y-1">
                          <p className="font-mono font-bold text-slate-900">{txn.reference} ({txn.senderName} ➔ {txn.recipientName})</p>
                          <p className="text-[10px] text-rose-800 font-semibold">{txn.flagReason}</p>
                          <p className="text-[10px] text-slate-500">Sent Amount: <strong>{txn.senderAmount} {txn.senderCurrency}</strong> ({txn.payoutProvider})</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateTransferStatus(txn.id, 'Ready')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                          >
                            Approve & Release
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Specify rejection compliance violation:');
                              if (reason) {
                                handleUpdateTransferStatus(txn.id, 'Flagged');
                              }
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px]"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2">No suspicious compliance alerts active.</p>
                  )}
                </div>
              </div>

              {/* Pending KYC Approval Panel */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">{t.kycReviewTitle}</h3>
                
                <div className="space-y-3.5">
                  {pendingKycUsers.length > 0 ? (
                    pendingKycUsers.map((pUser) => (
                      <div key={pUser.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{pUser.name}</span>
                            <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              Goal: {(pUser as any).kycRequestedTier || 'Tier2'}
                            </span>
                          </div>
                          <p className="text-slate-500 font-mono">Phone: {pUser.phone}</p>
                          <p className="text-slate-500">
                            ID: <strong>{pUser.kycDetails?.idType} ({pUser.kycDetails?.nationalId})</strong>
                          </p>
                          <p className="text-slate-500">Address: <strong>{pUser.kycDetails?.address}</strong></p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleAdminReviewKyc(pUser.id, 'Approve')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                          >
                            {t.approveBtn}
                          </button>
                          <button
                            onClick={() => handleAdminReviewKyc(pUser.id, 'Reject')}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px]"
                          >
                            {t.rejectBtn}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2">{t.noPendingKyc}</p>
                  )}
                </div>
              </div>

              {/* Audit Logs Trail */}
              <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">{t.auditLogsTitle}</h3>
                
                <div className="font-mono text-[10px] space-y-2 max-h-[250px] overflow-y-auto pr-2 divide-y divide-slate-800">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="pt-2 flex flex-col sm:flex-row sm:justify-between items-start gap-1">
                      <span className="text-indigo-300">[{new Date(log.timestamp).toLocaleTimeString()}] <strong className="text-slate-100">{log.action}</strong>: {log.details}</span>
                      <span className="text-slate-500 whitespace-nowrap">by {log.userPhone} ({log.userRole})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </section>

        {/* Right Column / Sidebar Info Feed (Occupies 4 cols of 12) */}
        <section className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          
          {/* Active Corridor Live Ticker Rates summary */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ledger Corridor Rates</h3>
            
            <div className="space-y-3">
              {rates.slice(0, 8).map((rate) => (
                <div key={rate.pair} className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-700">{rate.pair.replace('_', ' ➔ ')}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">{rate.rate}</span>
                    <span className="text-[9px] text-green-500 font-bold ml-1.5">±0.0%</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              Sovereign rates synchronized automatically with ECOWAS Central Ledger.
            </p>
          </div>

          {/* User's recent Transaction Activity List */}
          {currentUser && (
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Activity Feed</h3>
                  <button 
                    onClick={() => fetchUserTransactions(currentUser)}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Sync Feed
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {userTransactions.length > 0 ? (
                    userTransactions.map((txn) => (
                      <button
                        key={txn.id}
                        type="button"
                        onClick={() => {
                          setTrackRef(txn.reference);
                          setActiveTab('track');
                          handleTrackTransaction();
                        }}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate">{txn.recipientName}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{txn.reference}</p>
                          <p className="text-[9px] text-indigo-600 mt-1 font-bold">{txn.payoutProvider}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900">{txn.senderAmount} {txn.senderCurrency}</p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            txn.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            txn.status === 'Flagged' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {txn.status}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic p-4 text-center">No transfers recorded on this sandbox profile yet.</p>
                  )}
                </div>
              </div>

              {/* Helpful shortcut */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-[11px] text-slate-500 leading-normal">
                  Need custom help? Visit one of our <span className="text-indigo-600 font-bold">450+ physical agents</span> across Mano River border areas for live deposits or cash payouts.
                </p>
                <button 
                  onClick={() => setActiveTab('agents')} 
                  className="mt-2.5 bg-slate-900 text-white font-bold py-2 px-3 rounded-lg text-[10px] w-full hover:bg-slate-800 transition"
                >
                  📍 Find Nearest Agent Depot
                </button>
              </div>

            </div>
          )}

          {/* Clean minimalism brand guidelines info card */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <span className="text-[8px] uppercase font-extrabold text-indigo-400 tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                Mano River Corridor Smart Gateway
              </span>
              <h4 className="text-sm font-bold text-white mt-3">Inter-Sovereign Ledger SLA</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                Settling transactions natively in SLE (New Leone), GNF (Guinean Franc), and LRD (Liberian Dollar). Backed by offline resiliency filters for remote border districts with low bandwidth.
              </p>
              
              <div className="flex gap-4 mt-4 text-[10px] text-slate-400 font-mono">
                <div>
                  <span className="block text-indigo-400 font-bold">SLE / GNF</span>
                  <span>~373.91</span>
                </div>
                <div>
                  <span className="block text-indigo-400 font-bold">SLL / LRD</span>
                  <span>~8.26</span>
                </div>
                <div>
                  <span className="block text-indigo-400 font-bold">USD PIVOT</span>
                  <span>Eco-peg 1.0</span>
                </div>
              </div>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
          </div>

        </section>

      </main>

      {/* Footer Corridor Live Ticker */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black text-slate-400 tracking-widest whitespace-nowrap uppercase">LIVE RATES FEED</div>
          <div className="flex gap-6 overflow-x-auto max-w-md scrollbar-none py-1">
            <div className="flex gap-1.5 items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-700">SLE/GNF</span>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">373.91</span>
              <span className="text-[8px] text-green-500 font-bold">+0.2%</span>
            </div>
            <div className="flex gap-1.5 items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-700">SLE/LRD</span>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">8.26</span>
              <span className="text-[8px] text-red-500 font-bold">-0.1%</span>
            </div>
            <div className="flex gap-1.5 items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-700">GNF/LRD</span>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">0.022</span>
              <span className="text-[8px] text-green-500 font-bold">+0.5%</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-medium">
          © 2026 Mano River Remit Inc. Certified regional compliance framework. Sandbox environment only.
        </p>
      </footer>

    </div>
  );
}
