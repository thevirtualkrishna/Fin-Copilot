import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Save,
  Printer,
  FileText,
  Package,
  Users,
  Settings,
  Calculator,
  Eye,
  Download,
  Building,
  ShoppingCart,
  TrendingUp,
  Calendar,
  BarChart2,
  PieChart,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  CreditCard
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPieChart, Cell
} from 'recharts';

// Reusable Modal Component
const Modal = ({ show, onClose, children, title }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const BillingSystem = () => {
  // Main state management for Billing System
  const [activeTab, setActiveTab] = useState('dashboard');
  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // State for modals (Billing System)
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState({
    id: '',
    customerId: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    subTotal: 0,
    discount: 0,
    taxRate: 0.18,
    taxAmount: 0,
    total: 0,
    status: 'Pending',
    notes: '',
    paidAmount: 0, // Added for payment tracking
    currency: '₹' // Added for multi-currency
  });

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [invoiceToPay, setInvoiceToPay] = useState(null); // The invoice being paid

  // Search and filter states (Billing System)
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState([]);

  // Firebase App and Firestore instance states
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // User authentication states
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // AI Assistant states
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('Your AI-driven insights will appear here.');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInvoicePrompt, setAiInvoicePrompt] = useState('');
  const [showAiInvoiceModal, setShowAiInvoiceModal] = useState(false);
  const [aiParsedInvoice, setAiParsedInvoice] = useState(null);
  const [aiInvoiceMessage, setAiInvoiceMessage] = useState('');

  // Charting states
  const [selectedChartType, setSelectedChartType] = useState('line');
  const [chartData, setChartData] = useState([]);
  const [chartTitle, setChartTitle] = useState('Select a Chart Type');
  const [chartDescription, setChartDescription] = useState('Data will load here after selection.');
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Transaction Entry States
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState('expense'); // 'income' or 'expense'
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionMessage, setTransactionMessage] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Loading states for billing data
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Inventory Management states
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const LOW_STOCK_THRESHOLD = 10; // Define low stock threshold

  // Currency State
  const [currencySymbol, setCurrencySymbol] = useState('₹'); // Default to Indian Rupee

  // Available Currencies
  const currencies = [
    { symbol: '₹', name: 'INR - Indian Rupee' },
    { symbol: '$', name: 'USD - US Dollar' },
    { symbol: '€', name: 'EUR - Euro' },
    { symbol: '£', name: 'GBP - British Pound' },
    { symbol: '¥', name: 'JPY - Japanese Yen' },
  ];

  // Colors for Pie Chart (adjusted for dark theme)
  const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Ref for AI response scrolling
  const aiResponseEndRef = useRef(null);

  // State for advanced reports
  const [reportType, setReportType] = useState('income'); // 'income', 'expense', 'profit_loss'
  const [reportFilteredTransactions, setReportFilteredTransactions] = useState([]);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if (aiResponseEndRef.current) {
      aiResponseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiResponse]);

  useEffect(() => {
    setFilteredInvoices(
      invoices.filter(invoice =>
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [invoices, searchQuery]);

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined'
        ? JSON.parse(__firebase_config)
        : {};

      if (!Object.keys(firebaseConfig).length) {
        console.error("Firebase config not found. Please ensure __firebase_config is defined.");
        return;
      }

      const firebaseApp = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setApp(firebaseApp);
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        setCurrentUser(user);
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
          setAuthMessage('');
          console.log("User signed in:", user.uid);
        } else {
          try {
            if (!currentUser && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              await signInWithCustomToken(firebaseAuth, __initial_auth_token);
              console.log("Signed in with custom token.");
            } else if (!currentUser) {
              await signInAnonymously(firebaseAuth);
              console.log("Signed in anonymously.");
            }
          } catch (authError) {
            setAuthMessage(`Authentication failed: ${authError.message}`);
            console.error("Authentication error:", authError);
            setIsAuthReady(true);
          }
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Firebase Initialization Error:", err);
    }
  }, []);

  // Fetch user-specific data from Firestore
  useEffect(() => {
    if (db && userId && isAuthReady) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      // Fetch Companies
      setLoadingCompanies(true);
      const companiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/companies`);
      const unsubscribeCompanies = onSnapshot(companiesCollectionRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCompanies(data);
          setLoadingCompanies(false);
        },
        (err) => {
          console.error("Error fetching companies:", err);
          setLoadingCompanies(false);
        }
      );

      // Fetch Customers
      setLoadingCustomers(true);
      const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
      const unsubscribeCustomers = onSnapshot(customersCollectionRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCustomers(data);
          setLoadingCustomers(false);
        },
        (err) => {
          console.error("Error fetching customers:", err);
          setLoadingCustomers(false);
        }
      );

      // Fetch Products
      setLoadingProducts(true);
      const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);
      const unsubscribeProducts = onSnapshot(productsCollectionRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProducts(data);
          setLoadingProducts(false);
        },
        (err) => {
          console.error("Error fetching products:", err);
          setLoadingProducts(false);
        }
      );

      // Fetch Invoices
      setLoadingInvoices(true);
      const invoicesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/invoices`);
      const unsubscribeInvoices = onSnapshot(invoicesCollectionRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            items: doc.data().items || [],
            date: doc.data().date instanceof Timestamp ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date,
            paidAmount: doc.data().paidAmount || 0, // Ensure paidAmount is initialized
            currency: doc.data().currency || '₹' // Ensure currency is initialized
          }));
          setInvoices(data);
          setLoadingInvoices(false);
        },
        (err) => {
          console.error("Error fetching invoices:", err);
          setLoadingInvoices(false);
        }
      );

      return () => {
        unsubscribeCompanies();
        unsubscribeCustomers();
        unsubscribeProducts();
        unsubscribeInvoices();
      };
    } else if (isAuthReady && !userId) {
      setLoadingCompanies(false);
      setLoadingCustomers(false);
      setLoadingProducts(false);
      setLoadingInvoices(false);
    }
  }, [db, userId, isAuthReady]);


  // Fetch user-specific transactions from Firestore
  useEffect(() => {
    if (db && userId && isAuthReady) {
      setLoadingTransactions(true);

      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const transactionsCollectionPath = `artifacts/${appId}/users/${userId}/transactions`;
      const transactionsCollectionRef = collection(db, transactionsCollectionPath);

      const q = query(transactionsCollectionRef, orderBy("date", "asc"));

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          const transactionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date(doc.data().date),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
          }));
          setTransactions(transactionsData);
          setLoadingTransactions(false);
        },
        (err) => {
          console.error("Firestore fetch error (transactions):", err);
          setLoadingTransactions(false);
        }
      );

      return () => unsubscribe();
    } else if (isAuthReady && !userId) {
      setLoadingTransactions(false);
    }
  }, [db, userId, isAuthReady]);

  // Effect for Low Stock Alerts
  useEffect(() => {
    if (products.length > 0) {
      const lowStock = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
      setLowStockProducts(lowStock);
    } else {
      setLowStockProducts([]);
    }
  }, [products]);

  // Handle user logout
  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUserId(null);
        setCurrentUser(null);
        setAuthMessage('Logged out successfully.');
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
  };

  // Handle Email/Password Registration
  const handleRegister = async () => {
    setAuthMessage('');
    if (!email || !password) {
      setAuthMessage('Please enter both email and password.');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthMessage('Registration successful! You are now logged in.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthMessage(`Registration failed: ${err.message}`);
      console.error("Registration error:", err);
    }
  };

  // Handle Email/Password Login
  const handleLogin = async () => {
    setAuthMessage('');
    if (!email || !password) {
      setAuthMessage('Please enter both email and password.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthMessage('Login successful!');
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthMessage(`Login failed: ${err.message}`);
      console.error("Login error:", err);
    }
  };

  // Handle Google Sign-in (Placeholder for Tally.so-like social login)
  const handleGoogleSignIn = async () => {
    setAuthMessage('Google Sign-in is not fully implemented in this environment, but this button demonstrates the UI.');
  };

  // Handle adding a new transaction
  const handleAddTransaction = async (newTransaction) => {
    if (!db || !userId) {
      setTransactionMessage("Database or user not ready. Please wait for authentication.");
      return;
    }
    if (!newTransaction.date || !newTransaction.description || !newTransaction.amount || !newTransaction.type || !newTransaction.category) {
      setTransactionMessage("Please fill all transaction fields.");
      return;
    }
    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      setTransactionMessage("Please enter a valid positive amount.");
      return;
    }

    setTransactionMessage('Adding transaction...');

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const transactionsCollectionPath = `artifacts/${appId}/users/${userId}/transactions`;
      const transactionsCollectionRef = collection(db, transactionsCollectionPath);

      await addDoc(transactionsCollectionRef, {
        date: Timestamp.fromDate(new Date(newTransaction.date)),
        description: newTransaction.description,
        amount: amount,
        type: newTransaction.type,
        category: newTransaction.category,
        createdAt: serverTimestamp(),
      });

      setTransactionMessage('Transaction added successfully!');
      // Reset form fields only if it's from the manual entry form
      if (newTransaction.isManualEntry) {
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setTransactionDescription('');
        setTransactionAmount('');
        setTransactionType('expense');
        setTransactionCategory('');
      }

    } catch (err) {
      console.error("Firestore add transaction error:", err);
      setTransactionMessage(`Failed to add transaction: ${err.message}`);
    }
  };

  // Helper function to aggregate transactions based on timeframe and date range
  const aggregateTransactions = useCallback((data, timeframe, startDate, endDate) => {
    const aggregated = {};
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    data.forEach(transaction => {
      const date = transaction.date;

      // Filter by date range if provided
      if ((start && date < start) || (end && date > end)) {
        return;
      }

      let key;
      let categoryKey = transaction.category;

      if (timeframe === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (timeframe === 'weekly') {
        const year = date.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const diff = date.getTime() - startOfYear.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const weekNumber = Math.ceil(dayOfYear / 7);
        key = `Week ${weekNumber} ${year}`;
      } else if (timeframe === 'monthly') {
        key = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
      } else if (timeframe === 'yearly') {
        key = `${date.getFullYear()}`;
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          income: 0,
          expense: 0,
          categories: {}
        };
      }

      const amount = transaction.amount || 0;
      if (transaction.type === 'income') {
        aggregated[key].income += amount;
      } else if (transaction.type === 'expense') {
        aggregated[key].expense += amount;
      }

      if (!aggregated[key].categories[categoryKey]) {
        aggregated[key].categories[categoryKey] = 0;
      }
      aggregated[key].categories[categoryKey] += (transaction.type === 'income' ? amount : -amount);
    });

    let formattedChartData = [];
    let pieChartData = [];
    let barChartData = [];

    const sortedKeys = Object.keys(aggregated).sort((a, b) => {
      if (timeframe === 'daily') return new Date(a).getTime() - new Date(b).getTime();
      if (timeframe === 'monthly') {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
      }
      if (timeframe === 'yearly') return parseInt(a) - parseInt(b);
      return a.localeCompare(b);
    });


    sortedKeys.forEach(key => {
      const data = aggregated[key];
      formattedChartData.push({
        name: key,
        Sales: data.income,
        Profit: data.income - data.expense
      });

      Object.keys(data.categories).forEach(category => {
        const existingCategory = pieChartData.find(item => item.name === category);
        if (existingCategory) {
          existingCategory.value += data.categories[category];
        } else {
          pieChartData.push({ name: category, value: data.categories[category] });
        }

        const existingBarCategory = barChartData.find(item => item.name === category);
        if (existingBarCategory) {
          existingBarCategory.value += data.categories[category];
        } else {
          barChartData.push({ name: category, value: data.categories[category] });
        }
      });
    });

    pieChartData = pieChartData.filter(item => item.value > 0);
    barChartData = barChartData.filter(item => item.value !== 0);


    return { formattedChartData, pieChartData, barChartData };
  }, []);

  // Handle chart type selection and fetch data from Firestore transactions
  const updateChartVisualization = useCallback(async () => {
    if (!currentUser || !isAuthReady || !db) {
      setChartError("Please log in to view charts.");
      return;
    }

    setIsChartLoading(true);
    setChartError('');
    setChartData([]);

    try {
      const { formattedChartData, pieChartData, barChartData } = aggregateTransactions(transactions, selectedTimeframe, reportStartDate, reportEndDate);

      let dataToSet = [];
      let title = "";
      let description = "";

      if (selectedChartType === "line") {
        dataToSet = formattedChartData;
        title = `Sales and Profit Trends (${selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)})`;
        description = `Shows the aggregated income (Sales) and net profit (Income - Expenses) over time, based on your ${selectedTimeframe} transactions.`;
      } else if (selectedChartType === "bar_region_sales") {
        dataToSet = barChartData;
        title = `Net Financial Performance by Category (${selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)})`;
        description = `Compares net financial performance (Income - Expenses) across different transaction categories.`;
      } else if (selectedChartType === "pie_profit_share") {
        dataToSet = pieChartData;
        title = `Positive Net Profit Share by Category (${selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)})`;
        description = `Illustrates the proportional contribution of each category to overall positive net profit.`;
      }

      setChartData(dataToSet);
      setChartTitle(title);
      setChartDescription(description);

    } catch (err) {
      setChartError(`Failed to load chart data: ${err instanceof Error ? err.message : String(err)}. Check your transactions or try again.`);
      console.error("Chart data processing error:", err);
    } finally {
      setIsChartLoading(false);
    }
  }, [currentUser, isAuthReady, db, transactions, selectedChartType, selectedTimeframe, reportStartDate, reportEndDate, aggregateTransactions]);

  // Effect to fetch initial chart data when component mounts or auth/transactions change
  useEffect(() => {
    if (isAuthReady && userId && transactions.length > 0) {
      updateChartVisualization();
    } else if (isAuthReady && userId && transactions.length === 0) {
      setChartData([]);
      setChartTitle("No Transaction Data Yet");
      setChartDescription("Add some transactions to see your financial visualizations here!");
      setIsChartLoading(false);
    }
  }, [isAuthReady, userId, transactions, selectedChartType, selectedTimeframe, reportStartDate, reportEndDate, updateChartVisualization]);

  // Function to generate and filter reports
  const generateReport = useCallback(() => {
    if (!currentUser || !isAuthReady || !db) {
      setReportError("Please log in to generate reports.");
      return;
    }

    setReportError('');
    let filtered = [];
    const start = reportStartDate ? new Date(reportStartDate) : null;
    const end = reportEndDate ? new Date(reportEndDate) : null;

    if (reportType === 'income') {
      filtered = transactions.filter(t => t.type === 'income' &&
        (!start || t.date >= start) && (!end || t.date <= end)
      );
    } else if (reportType === 'expense') {
      filtered = transactions.filter(t => t.type === 'expense' &&
        (!start || t.date >= start) && (!end || t.date <= end)
      );
    } else if (reportType === 'profit_loss') {
      // For profit/loss, we need to aggregate income and expense for the period
      const incomeForPeriod = transactions
        .filter(t => t.type === 'income' && (!start || t.date >= start) && (!end || t.date <= end))
        .reduce((sum, t) => sum + t.amount, 0);
      const expenseForPeriod = transactions
        .filter(t => t.type === 'expense' && (!start || t.date >= start) && (!end || t.date <= end))
        .reduce((sum, t) => sum + t.amount, 0);

      filtered = [
        { id: 'income_summary', date: start || new Date(), description: 'Total Income', amount: incomeForPeriod, type: 'income', category: 'Summary' },
        { id: 'expense_summary', date: start || new Date(), description: 'Total Expense', amount: expenseForPeriod, type: 'expense', category: 'Summary' },
        { id: 'profit_loss_summary', date: start || new Date(), description: 'Net Profit/Loss', amount: incomeForPeriod - expenseForPeriod, type: (incomeForPeriod - expenseForPeriod) >= 0 ? 'income' : 'expense', category: 'Summary' }
      ];
    }
    setReportFilteredTransactions(filtered);
  }, [currentUser, isAuthReady, db, transactions, reportType, reportStartDate, reportEndDate]);

  // Effect to generate report when relevant states change
  useEffect(() => {
    if (isAuthReady && userId && transactions.length > 0) {
      generateReport();
    } else if (isAuthReady && userId && transactions.length === 0) {
      setReportFilteredTransactions([]);
      setReportError("No transactions to generate reports.");
    }
  }, [isAuthReady, userId, transactions, reportType, reportStartDate, reportEndDate, generateReport]);


  // Handle AI query submission
  const handleAiQuery = async () => {
    if (!aiQuery.trim()) {
      setAiResponse("Please enter a question for the AI.");
      return;
    }
    if (!userId || !isAuthReady) {
      setAiResponse("Please log in to use the AI assistant.");
      return;
    }

    setIsAiLoading(true);
    setAiResponse('Thinking...');

    try {
      // Prepare data for AI: recent transactions, and summaries of companies, customers, products, invoices
      const recentTransactionsSummary = transactions.slice(-20).map(t =>
        `${t.date.toLocaleDateString()}: ${t.type === 'income' ? '+' : '-'}${currencySymbol}${t.amount} (${t.category}) - ${t.description}`
      ).join('\n');

      const companiesSummary = companies.map(c => `Company: ${c.name}, Type: ${c.type}, Email: ${c.email}`).join('\n');
      const customersSummary = customers.map(c => `Customer: ${c.name}, Balance: ${currencySymbol}${c.balance}, Credit Limit: ${currencySymbol}${c.creditLimit}`).join('\n');
      const productsSummary = products.map(p => `Product: ${p.name}, Price: ${currencySymbol}${p.price}, Stock: ${p.stock}, Category: ${p.category}`).join('\n');
      const invoicesSummary = invoices.slice(-10).map(inv => `Invoice: ${inv.id}, Customer: ${inv.customerName}, Total: ${inv.currency}${inv.total}, Status: ${inv.status}, Currency: ${inv.currency}`).join('\n');


      const prompt = `
        As a financial data analyst AI, analyze the provided business data and answer the user's question.
        Provide insights, trends, or predictions based on this data. If no data is available, state that.
        All monetary values are in the currency specified by the user or default to Indian Rupees (₹).

        --- Business Data ---
        Recent Transactions:
        ${recentTransactionsSummary || 'No recent transactions available.'}

        Companies:
        ${companiesSummary || 'No companies data available.'}

        Customers:
        ${customersSummary || 'No customers data available.'}

        Products:
        ${productsSummary || 'No products data available.'}

        Recent Invoices:
        ${invoicesSummary || 'No invoices data available.'}
        --- End Business Data ---

        User's Question: ${aiQuery}

        For questions about business growth or improvement, provide data-driven decision strategies.
      `;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setAiResponse(text);
      } else {
        setAiResponse('No valid response from AI. Please try again.');
        console.warn('Unexpected AI response structure:', result);
      }

    } catch (err) {
      setAiResponse(`AI query failed: ${err.message}. Please check your internet connection or try again.`);
      console.error("AI query error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle AI-driven invoice creation
  const handleAiGenerateInvoice = async () => {
    if (!aiInvoicePrompt.trim()) {
      setAiInvoiceMessage("Please describe the invoice you want to create.");
      return;
    }
    if (!userId || !isAuthReady) {
      setAiInvoiceMessage("Please log in to use the AI assistant.");
      return;
    }

    setAiInvoiceMessage('Generating invoice draft...');
    setIsAiLoading(true);
    setAiParsedInvoice(null);

    try {
      const productsList = products.map(p => `ID: ${p.id}, Name: ${p.name}, Price: ${p.price}, Stock: ${p.stock}`).join('; ');
      const customersList = customers.map(c => `ID: ${c.id}, Name: ${c.name}`).join('; ');

      const prompt = `
        Parse the following natural language request into a JSON object for an invoice.
        The JSON should have fields: customerId (string), items (array of objects with productId (string), quantity (number)), notes (string, optional), currency (string, e.g., '₹', '$', '€').
        Match product and customer IDs from the provided lists. If a product or customer cannot be identified by ID or name, use a placeholder or indicate it's missing.
        Ensure quantities are positive numbers. Default currency to '₹' if not specified in the prompt.

        Available Products: ${productsList}
        Available Customers: ${customersList}

        Natural Language Request: "${aiInvoicePrompt}"

        JSON Output:
      `;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              customerId: { type: "STRING" },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    productId: { type: "STRING" },
                    quantity: { type: "NUMBER" }
                  },
                  required: ["productId", "quantity"]
                }
              },
              notes: { type: "STRING" },
              currency: { type: "STRING", enum: currencies.map(c => c.symbol) } // Ensure currency is one of the allowed symbols
            },
            required: ["customerId", "items"]
          }
        }
      };

      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonText = result.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonText);

        // Validate and enrich parsed data
        const customer = customers.find(c => c.id === parsedData.customerId || c.name.toLowerCase() === parsedData.customerId.toLowerCase());
        if (!customer) {
          setAiInvoiceMessage("AI could not identify a valid customer. Please try again or create manually.");
          return;
        }

        const invoiceItems = [];
        let validationError = false;
        for (const item of parsedData.items) {
          const product = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productId.toLowerCase());
          if (!product || item.quantity <= 0) {
            setAiInvoiceMessage(`AI suggested invalid product (${item.productId}) or quantity (${item.quantity}). Please refine prompt.`);
            validationError = true;
            break;
          }
          invoiceItems.push({
            productId: product.id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.price,
            total: item.quantity * product.price
          });
        }

        if (validationError) return;

        const newInvoiceDraft = {
          id: '', // Will be generated by Firestore on save
          customerId: customer.id,
          customerName: customer.name,
          date: new Date().toISOString().split('T')[0],
          items: invoiceItems,
          subTotal: 0,
          discount: 0,
          taxRate: 0.18,
          taxAmount: 0,
          total: 0,
          status: 'Pending',
          notes: parsedData.notes || 'Generated by AI assistant.',
          paidAmount: 0, // Initialize paidAmount for AI drafted invoice
          currency: parsedData.currency || currencySymbol // Use AI suggested or current default
        };

        const { subTotal, taxAmount, total } = calculateInvoiceTotals(newInvoiceDraft);
        setAiParsedInvoice({ ...newInvoiceDraft, subTotal, taxAmount, total });
        setAiInvoiceMessage('Invoice draft generated successfully! Review and save.');

      } else {
        setAiInvoiceMessage('No valid JSON response from AI. Please try again with a clearer prompt.');
        console.warn('Unexpected AI response structure:', result);
      }

    } catch (err) {
      setAiInvoiceMessage(`AI invoice generation failed: ${err.message}. Ensure your prompt is clear and data exists.`);
      console.error("AI invoice generation error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAiInvoiceToForm = () => {
    if (aiParsedInvoice) {
      setCurrentInvoice(aiParsedInvoice);
      setShowInvoiceModal(true);
      setShowAiInvoiceModal(false);
      setAiInvoicePrompt('');
      setAiParsedInvoice(null);
      setAiInvoiceMessage('');
    }
  };

  // Function to export data to CSV
  const exportToCsv = (filename, data) => {
    if (!data || data.length === 0) {
      alert("No data to export!");
      return;
    }

    const replacer = (key, value) => value === null ? '' : value; // Handle null values
    const header = Object.keys(data[0]);
    let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  // --- Company Management ---
  const handleAddCompany = () => {
    setCurrentCompany({
      name: '',
      address: '',
      phone: '',
      email: '',
      gst: '',
      type: 'Wholesale'
    });
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company) => {
    setCurrentCompany({ ...company });
    setShowCompanyModal(true);
  };

  const saveCompany = async () => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const companiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/companies`);

    try {
      if (currentCompany.id) {
        // Update existing company
        const companyDocRef = doc(db, `artifacts/${appId}/users/${userId}/companies`, currentCompany.id);
        await setDoc(companyDocRef, { ...currentCompany, updatedAt: serverTimestamp() }, { merge: true });
        console.log("Company updated successfully!");
      } else {
        // Add new company
        await addDoc(companiesCollectionRef, { ...currentCompany, createdAt: serverTimestamp() });
        console.log("Company added successfully!");
      }
      setShowCompanyModal(false);
    } catch (e) {
      console.error("Error saving company: ", e);
    }
  };

  const deleteCompany = async (id) => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this company?')) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const companyDocRef = doc(db, `artifacts/${appId}/users/${userId}/companies`, id);
      try {
        await deleteDoc(companyDocRef);
        console.log("Company deleted successfully!");
      } catch (e) {
        console.error("Error deleting company: ", e);
      }
    }
  };

  // --- Customer Management ---
  const handleAddCustomer = () => {
    setCurrentCustomer({
      name: '',
      address: '',
      phone: '',
      email: '',
      gst: '',
      creditLimit: 0,
      balance: 0
    });
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer) => {
    setCurrentCustomer({ ...customer });
    setShowCustomerModal(true);
  };

  const saveCustomer = async () => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);

    try {
      if (currentCustomer.id) {
        const customerDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, currentCustomer.id);
        await setDoc(customerDocRef, { ...currentCustomer, updatedAt: serverTimestamp() }, { merge: true });
        console.log("Customer updated successfully!");
      } else {
        await addDoc(customersCollectionRef, { ...currentCustomer, createdAt: serverTimestamp() });
        console.log("Customer added successfully!");
      }
      setShowCustomerModal(false);
    } catch (e) {
      console.error("Error saving customer: ", e);
    }
  };

  const deleteCustomer = async (id) => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this customer?')) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const customerDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, id);
      try {
        await deleteDoc(customerDocRef);
        console.log("Customer deleted successfully!");
      } catch (e) {
        console.error("Error deleting customer: ", e);
      }
    }
  };

  // --- Product Management ---
  const handleAddProduct = () => {
    setCurrentProduct({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: ''
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setCurrentProduct({ ...product });
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);

    try {
      if (currentProduct.id) {
        const productDocRef = doc(db, `artifacts/${appId}/users/${userId}/products`, currentProduct.id);
        await setDoc(productDocRef, { ...currentProduct, updatedAt: serverTimestamp() }, { merge: true });
        console.log("Product updated successfully!");
      } else {
        await addDoc(productsCollectionRef, { ...currentProduct, createdAt: serverTimestamp() });
        console.log("Product added successfully!");
      }
      setShowProductModal(false);
    } catch (e) {
      console.error("Error saving product: ", e);
    }
  };

  const deleteProduct = async (id) => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this product?')) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const productDocRef = doc(db, `artifacts/${appId}/users/${userId}/products`, id);
      try {
        await deleteDoc(productDocRef);
        console.log("Product deleted successfully!");
      } catch (e) {
        console.error("Error deleting product: ", e);
      }
    }
  };

  // --- Invoice Management ---
  const calculateInvoiceTotals = (invoice) => {
    const subTotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subTotal * invoice.taxRate;
    const total = subTotal + taxAmount - invoice.discount;
    return { subTotal, taxAmount, total };
  };

  useEffect(() => {
    if (currentInvoice && currentInvoice.items) {
      const { subTotal, taxAmount, total } = calculateInvoiceTotals(currentInvoice);
      setCurrentInvoice(prev => ({ ...prev, subTotal, taxAmount, total }));
    }
  }, [currentInvoice?.items, currentInvoice?.discount, currentInvoice?.taxRate]);

  const handleAddInvoice = () => {
    setCurrentInvoice({
      id: '',
      customerId: '',
      customerName: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      subTotal: 0,
      discount: 0,
      taxRate: 0.18,
      taxAmount: 0,
      total: 0,
      status: 'Pending',
      notes: '',
      paidAmount: 0, // Reset paidAmount for new invoice
      currency: currencySymbol // Set default currency for new invoice
    });
    setShowInvoiceModal(true);
  };

  const handleEditInvoice = (invoice) => {
    setCurrentInvoice({ ...invoice });
    setShowInvoiceModal(true);
  };

  const deleteInvoice = async (id) => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const invoiceDocRef = doc(db, `artifacts/${appId}/users/${userId}/invoices`, id);
      try {
        await deleteDoc(invoiceDocRef);
        console.log("Invoice deleted successfully!");
      } catch (e) {
        console.error("Error deleting invoice: ", e);
      }
    }
  };

  const saveInvoice = async () => {
    if (!db || !userId) {
      console.error("Database or user not ready.");
      return;
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const invoicesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/invoices`);

    try {
      const { subTotal, taxAmount, total } = calculateInvoiceTotals(currentInvoice);

      const invoiceToSave = {
        ...currentInvoice,
        subTotal,
        taxAmount,
        total,
        date: Timestamp.fromDate(new Date(currentInvoice.date)),
        updatedAt: serverTimestamp()
      };

      if (currentInvoice.id) {
        const invoiceDocRef = doc(db, `artifacts/${appId}/users/${userId}/invoices`, currentInvoice.id);
        await setDoc(invoiceDocRef, invoiceToSave, { merge: true });
        console.log("Invoice updated successfully!");
      } else {
        const newDocRef = await addDoc(invoicesCollectionRef, { ...invoiceToSave, createdAt: serverTimestamp() });
        // After adding, if status is 'Paid', update product stock
        if (invoiceToSave.status === 'Paid') {
          await updateProductStockForInvoice(invoiceToSave.items);
        }
        console.log("Invoice added successfully with ID:", newDocRef.id);
      }
      setShowInvoiceModal(false);
    } catch (e) {
      console.error("Error saving invoice: ", e);
    }
  };

  // Function to update product stock when an invoice is paid
  const updateProductStockForInvoice = async (items) => {
    if (!db || !userId) {
      console.error("Database or user not ready for stock update.");
      return;
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    for (const item of items) {
      const productDocRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId);
      try {
        await runTransaction(db, async (transaction) => {
          const productDoc = await transaction.get(productDocRef);
          if (!productDoc.exists()) {
            throw "Product does not exist!";
          }
          const newStock = productDoc.data().stock - item.quantity;
          if (newStock < 0) {
            console.warn(`Attempted to reduce stock below zero for product ${item.name}. Stock not updated.`);
          } else {
            transaction.update(productDocRef, { stock: newStock, updatedAt: serverTimestamp() });
          }
        });
        console.log(`Stock updated for product ${item.name}`);
      } catch (e) {
        console.error(`Transaction failed for product ${item.name}:`, e);
      }
    }
  };

  const handleAddItemToInvoice = (productIdString, quantity) => {
    const product = products.find(p => p.id === productIdString);
    if (!product) return;

    if (!currentInvoice || !currentInvoice.items) {
      console.error("currentInvoice or currentInvoice.items is null/undefined during item add.");
      return;
    }

    const existingItemIndex = currentInvoice.items.findIndex(item => item.productId === productIdString);

    if (existingItemIndex > -1) {
      const updatedItems = currentInvoice.items.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.unitPrice }
          : item
      );
      setCurrentInvoice(prev => ({ ...prev, items: updatedItems }));
    } else {
      const newItem = {
        productId: product.id,
        name: product.name,
        quantity: quantity,
        unitPrice: product.price,
        total: quantity * product.price
      };
      setCurrentInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
  };

  const handleRemoveItemFromInvoice = (index) => {
    if (!currentInvoice || !currentInvoice.items) {
      console.error("currentInvoice or currentInvoice.items is null/undefined during item removal.");
      return;
    }
    const updatedItems = currentInvoice.items.filter((_, i) => i !== index);
    setCurrentInvoice(prev => ({ ...prev, items: updatedItems }));
  };

  const handleInvoiceItemQuantityChange = (index, newQuantity) => {
    if (!currentInvoice || !currentInvoice.items) {
      console.error("currentInvoice or currentInvoice.items is null/undefined during quantity change.");
      return;
    }
    const updatedItems = currentInvoice.items.map((item, i) =>
      i === index
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    );
    setCurrentInvoice(prev => ({ ...prev, items: updatedItems }));
  };

  const handleCustomerSelect = (customerIdString) => {
    const customer = customers.find(c => c.id === customerIdString);
    if (customer) {
      setCurrentInvoice(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name
      }));
    }
  };

  // --- Payment Processing ---
  const openPaymentModal = (invoice) => {
    setInvoiceToPay(invoice);
    setPaymentAmount((invoice.total - invoice.paidAmount).toFixed(2)); // Pre-fill with remaining balance
    setPaymentMessage('');
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!db || !userId || !invoiceToPay) {
      setPaymentMessage("System error: Database, user, or invoice not ready.");
      return;
    }

    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      setPaymentMessage("Please enter a valid positive amount.");
      return;
    }

    const remainingBalance = invoiceToPay.total - invoiceToPay.paidAmount;
    if (amountToPay > remainingBalance + 0.01) { // Allow for tiny floating point discrepancies
      setPaymentMessage("Payment amount exceeds remaining balance.");
      return;
    }

    setPaymentMessage('Processing payment...');
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const invoiceDocRef = doc(db, `artifacts/${appId}/users/${userId}/invoices`, invoiceToPay.id);

    try {
      await runTransaction(db, async (transaction) => {
        const invoiceDoc = await transaction.get(invoiceDocRef);
        if (!invoiceDoc.exists()) {
          throw "Invoice does not exist!";
        }

        const currentPaidAmount = invoiceDoc.data().paidAmount || 0;
        const newPaidAmount = currentPaidAmount + amountToPay;
        let newStatus = invoiceDoc.data().status;

        if (newPaidAmount >= invoiceDoc.data().total) {
          newStatus = 'Paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'Partially Paid';
        } else {
          newStatus = 'Pending'; // Should not happen if amountToPay > 0
        }

        transaction.update(invoiceDocRef, {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        // Add an income transaction for the payment
        const transactionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
        await addDoc(transactionsCollectionRef, {
          date: Timestamp.fromDate(new Date()),
          description: `Payment for Invoice #${invoiceToPay.id} from ${invoiceToPay.customerName}`,
          amount: amountToPay,
          type: 'income',
          category: 'Invoice Payment',
          invoiceId: invoiceToPay.id, // Link payment to invoice
          createdAt: serverTimestamp(),
        });
      });

      setPaymentMessage('Payment processed successfully!');
      setTimeout(() => setShowPaymentModal(false), 1500); // Close after a short delay
    } catch (e) {
      console.error("Error processing payment: ", e);
      setPaymentMessage(`Payment failed: ${e.message || e}`);
    }
  };


  // Dashboard data (simplified)
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCustomers = customers.length;
  const totalProducts = products.length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
  const partiallyPaidInvoices = invoices.filter(inv => inv.status === 'Partially Paid').length;


  // Render functions for each tab
  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <ShoppingCart className="text-blue-500 text-3xl" />
        <div>
          <h3 className="text-gray-500 text-sm">Total Sales</h3>
          <p className="text-2xl font-semibold">{currencySymbol}{totalSales.toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <Users className="text-green-500 text-3xl" />
        <div>
          <h3 className="text-gray-500 text-sm">Total Customers</h3>
          <p className="text-2xl font-semibold">{totalCustomers}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <Package className="text-purple-500 text-3xl" />
        <div>
          <h3 className="text-gray-500 text-sm">Total Products</h3>
          <p className="text-2xl font-semibold">{totalProducts}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <FileText className="text-orange-500 text-3xl" />
        <div>
          <h3 className="text-gray-500 text-sm">Pending Invoices</h3>
          <p className="text-2xl font-semibold">{pendingInvoices}</p>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="lg:col-span-4 bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg shadow-md flex items-center space-x-3">
          <AlertCircle size={24} className="text-yellow-600" />
          <div>
            <h3 className="font-bold">Low Stock Alert!</h3>
            <p className="text-sm">The following products are running low on stock (below {LOW_STOCK_THRESHOLD} units):</p>
            <ul className="list-disc list-inside mt-1 text-sm">
              {lowStockProducts.map(p => (
                <li key={p.id}>{p.name} (Stock: {p.stock})</li>
              ))}
            </ul>
            <p className="text-xs mt-2">Consider generating purchase orders.</p>
          </div>
        </div>
      )}

      <div className="lg:col-span-4 bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Recent Invoices</h3>
        {loadingInvoices ? (
          <p className="text-gray-600">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="text-gray-600">No invoices found. Create one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Invoice ID</th>
                  <th className="py-3 px-6 text-left">Customer</th>
                  <th className="py-3 px-6 text-left">Date</th>
                  <th className="py-3 px-6 text-right">Total</th>
                  <th className="py-3 px-6 text-left">Status</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {invoices.slice(0, 5).map(invoice => ( // Show only top 5 recent invoices
                  <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{invoice.id}</td>
                    <td className="py-3 px-6 text-left">{invoice.customerName}</td>
                    <td className="py-3 px-6 text-left">{invoice.date}</td>
                    <td className="py-3 px-6 text-right">{invoice.currency}{invoice.total.toFixed(2)}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`py-1 px-3 rounded-full text-xs ${invoice.status === 'Paid' ? 'bg-green-200 text-green-600' : invoice.status === 'Partially Paid' ? 'bg-blue-200 text-blue-600' : 'bg-orange-200 text-orange-600'}`}>
                        {invoice.status}
                        {invoice.status === 'Partially Paid' && ` (${((invoice.paidAmount / invoice.total) * 100).toFixed(0)}%)`}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center">
                        <button onClick={() => handleEditInvoice(invoice)} className="w-4 mr-2 transform hover:text-blue-500 hover:scale-110">
                          <Eye />
                        </button>
                        {invoice.status !== 'Paid' && (
                          <button onClick={() => openPaymentModal(invoice)} className="w-4 mr-2 transform hover:text-green-500 hover:scale-110">
                            <CreditCard />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompanies = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Companies</h2>
        <button
          onClick={handleAddCompany}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Company</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loadingCompanies ? (
          <p className="text-gray-600">Loading companies...</p>
        ) : companies.length === 0 ? (
          <p className="text-gray-600">No companies found. Add one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">Address</th>
                  <th className="py-3 px-6 text-left">Phone</th>
                  <th className="py-3 px-6 text-left">Email</th>
                  <th className="py-3 px-6 text-left">GSTIN</th>
                  <th className="py-3 px-6 text-left">Type</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {companies.map(company => (
                  <tr key={company.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{company.name}</td>
                    <td className="py-3 px-6 text-left">{company.address}</td>
                    <td className="py-3 px-6 text-left">{company.phone}</td>
                    <td className="py-3 px-6 text-left">{company.email}</td>
                    <td className="py-3 px-6 text-left">{company.gst}</td>
                    <td className="py-3 px-6 text-left">{company.type}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center">
                        <button onClick={() => handleEditCompany(company)} className="w-4 mr-2 transform hover:text-blue-500 hover:scale-110">
                          <Edit3 />
                        </button>
                        <button onClick={() => deleteCompany(company.id)} className="w-4 mr-2 transform hover:text-red-500 hover:scale-110">
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showCompanyModal} onClose={() => setShowCompanyModal(false)} title={currentCompany?.id ? 'Edit Company' : 'Add New Company'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              value={currentCompany?.name || ''}
              onChange={(e) => setCurrentCompany({ ...currentCompany, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., Tech Solutions Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={currentCompany?.address || ''}
              onChange={(e) => setCurrentCompany({ ...currentCompany, address: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., 123 Main St, Anytown"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              value={currentCompany?.phone || ''}
              onChange={(e) => setCurrentCompany({ ...currentCompany, phone: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., +91-9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={currentCompany?.email || ''}
              onChange={(e) => setCurrentCompany({ ...currentCompany, email: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., info@techsolutions.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GSTIN</label>
            <input
              type="text"
              value={currentCompany?.gst || ''}
              onChange={(e) => setCurrentCompany({ ...currentCompany, gst: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., 29ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={currentCompany?.type || 'Wholesale'}
              onChange={(e) => setCurrentCompany({ ...currentCompany, type: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="Wholesale">Wholesale</option>
              <option value="Retail">Retail</option>
              <option value="Service">Service</option>
            </select>
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              onClick={saveCompany}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Save Company
            </button>
            <button
              onClick={() => setShowCompanyModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  const renderCustomers = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Customers</h2>
        <button
          onClick={handleAddCustomer}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loadingCustomers ? (
          <p className="text-gray-600">Loading customers...</p>
        ) : customers.length === 0 ? (
          <p className="text-gray-600">No customers found. Add one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">Address</th>
                  <th className="py-3 px-6 text-left">Phone</th>
                  <th className="py-3 px-6 text-left">Email</th>
                  <th className="py-3 px-6 text-left">GSTIN</th>
                  <th className="py-3 px-6 text-right">Credit Limit</th>
                  <th className="py-3 px-6 text-right">Balance</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {customers.map(customer => (
                  <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{customer.name}</td>
                    <td className="py-3 px-6 text-left">{customer.address}</td>
                    <td className="py-3 px-6 text-left">{customer.phone}</td>
                    <td className="py-3 px-6 text-left">{customer.email}</td>
                    <td className="py-3 px-6 text-left">{customer.gst}</td>
                    <td className="py-3 px-6 text-right">{currencySymbol}{customer.creditLimit.toFixed(2)}</td>
                    <td className="py-3 px-6 text-right">{currencySymbol}{customer.balance.toFixed(2)}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center">
                        <button onClick={() => handleEditCustomer(customer)} className="w-4 mr-2 transform hover:text-blue-500 hover:scale-110">
                          <Edit3 />
                        </button>
                        <button onClick={() => deleteCustomer(customer.id)} className="w-4 mr-2 transform hover:text-red-500 hover:scale-110">
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showCustomerModal} onClose={() => setShowCustomerModal(false)} title={currentCustomer?.id ? 'Edit Customer' : 'Add New Customer'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <input
              type="text"
              value={currentCustomer?.name || ''}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., Retail Store B"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={currentCustomer?.address || ''}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, address: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., 789 Commerce Rd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              value={currentCustomer?.phone || ''}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., +91-9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={currentCustomer?.email || ''}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., contact@retailb.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GSTIN</label>
            <input
              type="text"
              value={currentCustomer?.gst || ''}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, gst: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., 29ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Credit Limit</label>
            <input
              type="number"
              value={currentCustomer?.creditLimit || 0}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, creditLimit: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Balance</label>
            <input
              type="number"
              value={currentCustomer?.balance || 0}
              onChange={(e) => setCurrentCustomer({ ...currentCustomer, balance: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              onClick={saveCustomer}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Save Customer
            </button>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  const renderProducts = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Products</h2>
        <button
          onClick={handleAddProduct}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loadingProducts ? (
          <p className="text-gray-600">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-600">No products found. Add one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">Description</th>
                  <th className="py-3 px-6 text-right">Price ({currencySymbol})</th>
                  <th className="py-3 px-6 text-right">Stock</th>
                  <th className="py-3 px-6 text-left">Category</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {products.map(product => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{product.name}</td>
                    <td className="py-3 px-6 text-left">{product.description}</td>
                    <td className="py-3 px-6 text-right">{currencySymbol}{product.price.toFixed(2)}</td>
                    <td className="py-3 px-6 text-right">{product.stock}</td>
                    <td className="py-3 px-6 text-left">{product.category}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center">
                        <button onClick={() => handleEditProduct(product)} className="w-4 mr-2 transform hover:text-blue-500 hover:scale-110">
                          <Edit3 />
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="w-4 mr-2 transform hover:text-red-500 hover:scale-110">
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showProductModal} onClose={() => setShowProductModal(false)} title={currentProduct?.id ? 'Edit Product' : 'Add New Product'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name</label>
            <input
              type="text"
              value={currentProduct?.name || ''}
              onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., Ultra HD Monitor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={currentProduct?.description || ''}
              onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
              className="w-full p-2 border rounded-lg"
              rows="2"
              placeholder="e.g., 27-inch 4K monitor with HDR support"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ({currencySymbol})</label>
            <input
              type="number"
              value={currentProduct?.price || 0}
              onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input
              type="number"
              value={currentProduct?.stock || 0}
              onChange={(e) => setCurrentProduct({ ...currentProduct, stock: parseInt(e.target.value) || 0 })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={currentProduct?.category || ''}
              onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="e.g., Peripherals"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              onClick={saveProduct}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Save Product
            </button>
            <button
              onClick={() => setShowProductModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  const renderInvoices = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Invoices</h2>
        <button
          onClick={handleAddInvoice}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Invoice</span>
        </button>
      </div>

      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search invoices by ID or Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <button
          onClick={() => exportToCsv('invoices.csv', invoices)}
          className="bg-gray-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-gray-700 flex items-center space-x-2 justify-center"
        >
          <Download size={20} />
          <span>Export to CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loadingInvoices ? (
          <p className="text-gray-600">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="text-gray-600">No invoices found. Create one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Invoice ID</th>
                  <th className="py-3 px-6 text-left">Customer</th>
                  <th className="py-3 px-6 text-left">Date</th>
                  <th className="py-3 px-6 text-right">Total ({currencySymbol})</th>
                  <th className="py-3 px-6 text-left">Status</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{invoice.id}</td>
                    <td className="py-3 px-6 text-left">{invoice.customerName}</td>
                    <td className="py-3 px-6 text-left">{invoice.date}</td>
                    <td className="py-3 px-6 text-right">{invoice.currency}{invoice.total.toFixed(2)}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`py-1 px-3 rounded-full text-xs ${invoice.status === 'Paid' ? 'bg-green-200 text-green-600' : invoice.status === 'Partially Paid' ? 'bg-blue-200 text-blue-600' : 'bg-orange-200 text-orange-600'}`}>
                        {invoice.status}
                        {invoice.status === 'Partially Paid' && ` (${((invoice.paidAmount / invoice.total) * 100).toFixed(0)}%)`}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center">
                        <button onClick={() => handleEditInvoice(invoice)} className="w-4 mr-2 transform hover:text-blue-500 hover:scale-110">
                          <Eye />
                        </button>
                        <button onClick={() => deleteInvoice(invoice.id)} className="w-4 mr-2 transform hover:text-red-500 hover:scale-110">
                          <Trash2 />
                        </button>
                        <button className="w-4 transform hover:text-purple-500 hover:scale-110">
                          <Printer />
                        </button>
                        {invoice.status !== 'Paid' && (
                          <button onClick={() => openPaymentModal(invoice)} className="w-4 ml-2 transform hover:text-green-500 hover:scale-110">
                            <CreditCard />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render function for Financial Dashboard
  const renderFinancialDashboard = () => (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Financial Overview & Analytics</h2>
      {/* Transaction Entry Section */}
      <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-white shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Daily Transaction Entry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="transaction-date" className="block text-gray-700 text-sm font-semibold mb-1">Date:</label>
            <input
              type="date"
              id="transaction-date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="transaction-amount" className="block text-gray-700 text-sm font-semibold mb-1">Amount ({currencySymbol}):</label>
            <input
              type="number"
              id="transaction-amount"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              placeholder="e.g., 150.75"
              className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="transaction-type" className="block text-gray-700 text-sm font-semibold mb-1">Type:</label>
            <select
              id="transaction-type"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label htmlFor="transaction-category" className="block text-gray-700 text-sm font-semibold mb-1">Category:</label>
            <input
              type="text"
              id="transaction-category"
              value={transactionCategory}
              onChange={(e) => setTransactionCategory(e.target.value)}
              placeholder="e.g., Groceries, Salary, Rent"
              className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="transaction-description" className="block text-gray-700 text-sm font-semibold mb-1">Description:</label>
          <textarea
            id="transaction-description"
            value={transactionDescription}
            onChange={(e) => setTransactionDescription(e.target.value)}
            placeholder="e.g., Coffee at Starbucks, Monthly paycheck"
            rows="2"
            className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          ></textarea>
        </div>
        <button
          onClick={() => handleAddTransaction({
            date: transactionDate,
            description: transactionDescription,
            amount: transactionAmount,
            type: transactionType,
            category: transactionCategory,
            isManualEntry: true // Indicate manual entry to reset form
          })}
          disabled={!currentUser || !isAuthReady}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </button>
        {transactionMessage && (
          <p className={`mt-4 text-sm ${transactionMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'} font-medium`}>{transactionMessage}</p>
        )}
      </div>

      {/* Recent Transactions List */}
      <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-white shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Your Recent Transactions</h3>
        {loadingTransactions ? (
          <p className="text-gray-600">Loading your transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-600">No transactions recorded yet. Add some above!</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.slice().reverse().map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {t.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {t.description}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {t.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {t.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={() => exportToCsv('transactions.csv', transactions.map(t => ({
            Date: t.date.toLocaleDateString(),
            Description: t.description,
            Amount: t.amount,
            Type: t.type,
            Category: t.category
          })))}
          className="mt-4 bg-gray-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-gray-700 flex items-center space-x-2 justify-center w-full"
        >
          <Download size={20} />
          <span>Export Transactions to CSV</span>
        </button>
      </div>

      {/* Dynamic Chart Section */}
      <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-white shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Dynamic Data Visualization</h3>
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <label htmlFor="chart-type-select" className="block text-gray-700 font-semibold">Chart Type:</label>
          <select
            id="chart-type-select"
            value={selectedChartType}
            onChange={(e) => setSelectedChartType(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady || isChartLoading}
          >
            <option value="line">Line Chart (Sales & Profit)</option>
            <option value="bar_region_sales">Bar Chart (Net by Category)</option>
            <option value="pie_profit_share">Pie Chart (Positive Net by Category)</option>
          </select>

          <label htmlFor="timeframe-select" className="block text-gray-700 font-semibold md:ml-4">Timeframe:</label>
          <select
            id="timeframe-select"
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady || isChartLoading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <label htmlFor="report-start-date" className="block text-gray-700 font-semibold">Start Date:</label>
          <input
            type="date"
            id="report-start-date"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady || isChartLoading}
          />
          <label htmlFor="report-end-date" className="block text-gray-700 font-semibold md:ml-4">End Date:</label>
          <input
            type="date"
            id="report-end-date"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady || isChartLoading}
          />
          <button
            onClick={updateChartVisualization}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 justify-center w-full md:w-auto"
            disabled={!userId || !isAuthReady || isChartLoading}
          >
            <BarChart2 size={20} />
            <span>Update Chart</span>
          </button>
        </div>

        {chartError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Chart Error: </strong>
            <span className="block sm:inline">{chartError}</span>
          </div>
        )}

        {isChartLoading ? (
          <div className="flex justify-center items-center h-80">
            <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-3 text-gray-600">Loading chart data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{chartTitle}</h3>
            <p className="text-sm text-gray-600 mb-4">{chartDescription}</p>
            <div className="w-full h-80 bg-gray-50 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                {selectedChartType === 'line' && (
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#ccc' }} stroke="#666" />
                    <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} tickLine={false} axisLine={{ stroke: '#ccc' }} stroke="#666" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0px 2px 8px rgba(0,0,0,0.1)', color: '#333' }}
                      labelStyle={{ color: '#333', fontWeight: 'bold' }}
                      itemStyle={{ color: '#555' }}
                      formatter={(value) => `${currencySymbol}${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#666' }} />
                    <Line type="monotone" dataKey="Sales" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Profit" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                )}
                {selectedChartType === 'bar_region_sales' && (
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#ccc' }} stroke="#666" />
                    <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} tickLine={false} axisLine={{ stroke: '#ccc' }} stroke="#666" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0px 2px 8px rgba(0,0,0,0.1)', color: '#333' }}
                      labelStyle={{ color: '#333', fontWeight: 'bold' }}
                      itemStyle={{ color: '#555' }}
                      formatter={(value) => `${currencySymbol}${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#666' }} />
                    <Bar dataKey="value" fill="#4299e1" />
                  </BarChart>
                )}
                {selectedChartType === 'pie_profit_share' && (
                  <RechartsPieChart>
                    <RechartsPieChart
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </RechartsPieChart>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0px 2px 8px rgba(0,0,0,0.1)', color: '#333' }}
                      labelStyle={{ color: '#333', fontWeight: 'bold' }}
                      itemStyle={{ color: '#555' }}
                      formatter={(value) => `${currencySymbol}${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#666' }} />
                  </RechartsPieChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-center py-10">No chart data available for the selected timeframe or type. Add some transactions!</p>
        )}
      </div>

      {/* Advanced Reporting Section */}
      <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-white shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Advanced Reports</h3>
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <label htmlFor="report-type-select" className="block text-gray-700 font-semibold">Report Type:</label>
          <select
            id="report-type-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady}
          >
            <option value="income">Income Report</option>
            <option value="expense">Expense Report</option>
            <option value="profit_loss">Profit & Loss Statement</option>
          </select>

          <label htmlFor="report-start-date-filter" className="block text-gray-700 font-semibold md:ml-4">Start Date:</label>
          <input
            type="date"
            id="report-start-date-filter"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady}
          />
          <label htmlFor="report-end-date-filter" className="block text-gray-700 font-semibold md:ml-4">End Date:</label>
          <input
            type="date"
            id="report-end-date-filter"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
            className="block w-full md:w-auto p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 transition duration-200"
            disabled={!userId || !isAuthReady}
          />
          <button
            onClick={generateReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 justify-center w-full md:w-auto"
            disabled={!userId || !isAuthReady}
          >
            <Calendar size={20} />
            <span>Generate Report</span>
          </button>
        </div>

        {reportError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Report Error: </strong>
            <span className="block sm:inline">{reportError}</span>
          </div>
        )}

        {reportFilteredTransactions.length > 0 ? (
          <>
            <div className="overflow-x-auto mb-4 border border-gray-300 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount ({currencySymbol})
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportFilteredTransactions.map((t, index) => (
                    <tr key={t.id || `report-row-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {t.date instanceof Date ? t.date.toLocaleDateString() : new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {t.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {t.category}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {t.type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => exportToCsv(`${reportType}_report.csv`, reportFilteredTransactions.map(t => ({
                Date: t.date instanceof Date ? t.date.toLocaleDateString() : new Date(t.date).toLocaleDateString(),
                Description: t.description,
                Category: t.category,
                Amount: t.amount,
                Type: t.type
              })))}
              className="bg-gray-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-gray-700 flex items-center space-x-2 justify-center w-full"
            >
              <Download size={20} />
              <span>Export Report to CSV</span>
            </button>
          </>
        ) : (
          <p className="text-gray-600 text-center py-10">Select a report type and date range, then click "Generate Report".</p>
        )}
      </div>
    </div>
  );

  // Render function for AI Copilot
  const renderAICopilot = () => (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">AI Business Assistant</h2>
      <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-inner mb-8">
        <div className="mb-4">
          <label htmlFor="ai-query" className="block text-gray-700 text-sm font-semibold mb-2">
            Ask a question about your data or business:
          </label>
          <textarea
            id="ai-query"
            className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200 resize-y min-h-[80px]"
            rows="3"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="e.g., 'What are the key trends in sales for Q2?', 'Suggest strategies to increase profit margins.', 'Identify any unusual expenses last month.'"
            disabled={isAiLoading || !userId || !isAuthReady}
          ></textarea>
        </div>
        <div className="flex justify-center mb-6">
          <button
            onClick={handleAiQuery}
            disabled={isAiLoading || !aiQuery.trim() || !userId || !isAuthReady}
            className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isAiLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v18m9-9H3"></path>
              </svg>
            )}
            {isAiLoading ? 'Getting Insight...' : 'Get AI Insight'}
          </button>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-inner min-h-[100px] whitespace-pre-wrap text-gray-800">
          {aiResponse}
          <div ref={aiResponseEndRef} />
        </div>
      </div>

      {/* AI-powered Invoice Creation */}
      <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">AI-Powered Invoice Draft</h3>
        <div className="mb-4">
          <label htmlFor="ai-invoice-prompt" className="block text-gray-700 text-sm font-semibold mb-2">
            Describe the invoice you want to create (e.g., "Invoice for Retail Store A for 3 Laptop Pro X and 10 Wireless Mouse Z"):
          </label>
          <textarea
            id="ai-invoice-prompt"
            className="shadow-inner appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 bg-gray-50 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 resize-y min-h-[80px]"
            rows="2"
            value={aiInvoicePrompt}
            onChange={(e) => setAiInvoicePrompt(e.target.value)}
            placeholder="e.g., 'Invoice for John Doe for 2 widgets and 5 gadgets with a note about express delivery.'"
            disabled={isAiLoading || !userId || !isAuthReady}
          ></textarea>
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={handleAiGenerateInvoice}
            disabled={isAiLoading || !aiInvoicePrompt.trim() || !userId || !isAuthReady}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isAiLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Plus size={20} className="mr-2" />
            )}
            {isAiLoading ? 'Drafting...' : 'Draft Invoice with AI'}
          </button>
        </div>
        {aiInvoiceMessage && (
          <p className={`mt-2 text-sm ${aiInvoiceMessage.includes('successfully') ? 'text-green-600' : aiInvoiceMessage.includes('failed') ? 'text-red-600' : 'text-gray-600'} font-medium`}>{aiInvoiceMessage}</p>
        )}
        {aiParsedInvoice && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
            <h4 className="text-lg font-semibold text-blue-800 mb-2">AI Drafted Invoice:</h4>
            <p><strong>Customer:</strong> {aiParsedInvoice.customerName}</p>
            <p><strong>Items:</strong></p>
            <ul className="list-disc list-inside ml-4">
              {aiParsedInvoice.items.map((item, idx) => (
                <li key={idx}>{item.name} (Qty: {item.quantity}) - {aiParsedInvoice.currency}{item.total.toFixed(2)}</li>
              ))}
            </ul>
            <p><strong>Total:</strong> {aiParsedInvoice.currency}{aiParsedInvoice.total.toFixed(2)}</p>
            <p><strong>Notes:</strong> {aiParsedInvoice.notes}</p>
            <button
              onClick={applyAiInvoiceToForm}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <CheckCircle size={18} />
              <span>Apply to Invoice Form</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render function for Privacy Policy
  const renderPrivacy = () => (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h2>
      <div className="prose max-w-none text-gray-700">
        <p>Your privacy is important to us. This policy explains how we handle your data.</p>
        <h3>Data Collection</h3>
        <p>We collect personal information that you voluntarily provide to us when you register on the App, express an interest in obtaining information about us or our products and Services, when you participate in activities on the App (such as posting messages in our online forums or entering competitions), or otherwise when you contact us.</p>
        <p>The personal information that we collect depends on the context of your interactions with us and the App, the choices you make and the products and features you use. The personal information we collect may include the following:</p>
        <ul>
          <li>Email addresses</li>
          <li>Passwords</li>
          <li>Financial transaction data (amounts, descriptions, categories, dates)</li>
        </ul>
        <h3>How We Use Your Information</h3>
        <p>We use personal information collected via our App for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
        <p>We use the information we collect or receive:</p>
        <ul>
          <li>To facilitate account creation and logon process.</li>
          <li>To send you marketing and promotional communications.</li>
          <li>To post testimonials.</li>
          <li>To manage user accounts.</li>
          <li>To deliver services to the user.</li>
          <li>To respond to user inquiries/offer support to users.</li>
          <li>To enable user-to-user communications.</li>
          <li>To run and manage our App.</li>
          <li>To enforce our terms, conditions and policies.</li>
          <li>To respond to legal requests and prevent harm.</li>
        </ul>
        <h3>Data Security</h3>
        <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.</p>
        <h3>Your Rights</h3>
        <p>You have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information. To make such a request, please contact us using the contact details provided below.</p>
        <p>This Privacy Policy was last updated on July 23, 2025.</p>
      </div>
    </div>
  );

  // Render function for About Us
  const renderAbout = () => (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">About FinCopilot</h2>
      <div className="prose max-w-none text-gray-700">
        <p>FinCopilot is designed to be your ultimate financial companion, blending robust billing functionalities with cutting-edge financial analytics and AI-driven insights.</p>
        <p>Our mission is to empower businesses and individuals to make smarter, data-driven financial decisions. We believe that understanding your financial landscape shouldn't be complicated or time-consuming. With FinCopilot, you get a clear, comprehensive view of your income, expenses, and overall financial health, all in one intuitive platform.</p>
        <h3>Our Vision</h3>
        <p>To revolutionize financial management by providing accessible, intelligent, and actionable insights that foster growth and stability for every user.</p>
        <h3>Key Features</h3>
        <ul>
          <li><strong>Billing Management:</strong> Streamline your invoicing, customer, product, and company records.</li>
          <li><strong>Transaction Tracking:</strong> Effortlessly log and categorize your daily financial movements.</li>
          <li><strong>Interactive Visualizations:</strong> Transform raw data into compelling charts and graphs (daily, weekly, monthly, yearly).</li>
          <li><strong>AI-Powered Analysis:</strong> Get predictive summaries, identify trends, and receive strategic recommendations from our integrated AI assistant.</li>
          <li><strong>Secure & Reliable:</strong> Built on Firebase for real-time data synchronization and robust security.</li>
        </ul>
        <p>We are continuously working to enhance FinCopilot, adding new features and improving existing ones to meet your evolving financial needs. Thank you for choosing FinCopilot!</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `}
      </style>
      <script src="https://cdn.tailwindcss.com"></script>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-gray-800 text-white p-6 min-h-screen shadow-lg">
          <div className="text-2xl font-bold mb-8 text-blue-300">FinCopilot</div>
          <nav>
            <ul>
              {/* Billing System Tabs */}
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <TrendingUp size={20} />
                  <span>Billing Dashboard</span>
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'invoices' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <FileText size={20} />
                  <span>Invoices</span>
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <Package size={20} />
                  <span>Products</span>
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <Users size={20} />
                  <span>Customers</span>
                </button>
              </li>
              <li className="mb-4">
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'companies' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <Building size={20} />
                  <span>Companies</span>
                </button>
              </li>

              {/* Financial Analysis Tabs */}
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('financialDashboard')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'financialDashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <BarChart2 size={20} />
                  <span>Financial Analytics</span>
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('aiCopilot')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'aiCopilot' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <Calculator size={20} />
                  <span>AI Copilot</span>
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'privacy' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <Settings size={20} />
                  <span>Privacy Policy</span>
                </button>
              </li>
              <li className="mb-4">
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${activeTab === 'about' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                >
                  <Info size={20} />
                  <span>About Us</span>
                </button>
              </li>

              {/* Authentication Section in Sidebar */}
              <li className="mt-8 pt-4 border-t border-gray-700">
                {!userId ? (
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4 text-center">
                      {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={authMode === 'login' ? handleLogin : handleRegister}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                      >
                        {authMode === 'login' ? 'Login' : 'Register'}
                      </button>
                      <button
                        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                        className="w-full text-blue-300 text-sm hover:underline mt-2"
                      >
                        {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
                      </button>
                      {authMessage && <p className="text-sm text-center mt-2">{authMessage}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-700 rounded-lg text-center">
                    <p className="text-white text-sm mb-2">Logged in as:</p>
                    <p className="text-blue-300 font-semibold break-words mb-4">{userId}</p>
                    <button
                      onClick={handleLogout}
                      className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 bg-gray-100">
          {/* Global Currency Selector */}
          <div className="flex justify-end mb-4">
            <label htmlFor="currency-selector" className="sr-only">Select Currency</label>
            <select
              id="currency-selector"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 transition duration-200"
            >
              {currencies.map(c => (
                <option key={c.symbol} value={c.symbol}>{c.name}</option>
              ))}
            </select>
          </div>

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'companies' && renderCompanies()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'invoices' && renderInvoices()}
          {activeTab === 'financialDashboard' && renderFinancialDashboard()}
          {activeTab === 'aiCopilot' && renderAICopilot()}
          {activeTab === 'privacy' && renderPrivacy()}
          {activeTab === 'about' && renderAbout()}
        </main>
      </div>

      {/* Invoice Modal (remains the same) */}
      <Modal show={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title={currentInvoice?.id ? `Edit Invoice #${currentInvoice.id}` : 'Create New Invoice'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice ID</label>
              <input
                type="text"
                value={currentInvoice?.id || ''}
                className="w-full p-2 border rounded-lg bg-gray-100"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={currentInvoice?.date || ''}
                onChange={(e) => setCurrentInvoice({ ...currentInvoice, date: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select
              value={currentInvoice?.customerId || ''}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Select a Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Items</h3>
            {currentInvoice?.items?.length === 0 && <p className="text-gray-500">No items added yet.</p>}
            {currentInvoice?.items?.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 mb-2">
                <span className="flex-1">{item.name}</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleInvoiceItemQuantityChange(index, parseInt(e.target.value) || 0)}
                  className="w-20 p-1 border rounded-lg text-center"
                  min="1"
                />
                <span>x {currentInvoice.currency}{item.unitPrice.toFixed(2)}</span>
                <span className="font-semibold">{currentInvoice.currency}{(item.quantity * item.unitPrice).toFixed(2)}</span>
                <button onClick={() => handleRemoveItemFromInvoice(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Add Product</label>
              <div className="flex space-x-2">
                <select
                  id="product-select"
                  className="flex-1 p-2 border rounded-lg"
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name} ({currencySymbol}{product.price.toFixed(2)})</option>
                  ))}
                </select>
                <input
                  type="number"
                  id="product-quantity"
                  defaultValue="1"
                  min="1"
                  className="w-20 p-2 border rounded-lg"
                />
                <button
                  onClick={() => {
                    const productId = document.getElementById('product-select').value;
                    const quantity = parseInt(document.getElementById('product-quantity').value);
                    if (productId && quantity > 0) {
                      handleAddItemToInvoice(productId, quantity);
                    }
                  }}
                  className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{currentInvoice.currency}{currentInvoice?.subTotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <input
                  type="number"
                  value={currentInvoice?.discount || 0}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, discount: parseFloat(e.target.value) || 0 })}
                  className="w-24 p-1 border rounded-lg text-right"
                />
              </div>
              <div className="flex justify-between">
                <span>Tax Rate ({((currentInvoice?.taxRate || 0) * 100)}%):</span>
                <input
                  type="number"
                  value={currentInvoice?.taxRate || 0}
                  onChange={(e) => setCurrentInvoice({ ...currentInvoice, taxRate: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  className="w-24 p-1 border rounded-lg text-right"
                />
              </div>
              <div className="flex justify-between">
                <span>Tax Amount:</span>
                <span>{currentInvoice.currency}{currentInvoice?.taxAmount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{currentInvoice.currency}{currentInvoice?.total?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>{currentInvoice.currency}{currentInvoice?.paidAmount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600">
                <span>Balance Due:</span>
                <span>{currentInvoice.currency}{(currentInvoice?.total - currentInvoice?.paidAmount)?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={currentInvoice?.status || 'Pending'}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, status: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Invoice Currency</label>
            <select
              value={currentInvoice?.currency || currencySymbol}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, currency: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              {currencies.map(c => (
                <option key={c.symbol} value={c.symbol}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={currentInvoice?.notes || ''}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })}
              className="w-full p-2 border rounded-lg"
              rows="2"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              onClick={saveInvoice}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              disabled={!currentInvoice?.customerId || currentInvoice?.items?.length === 0}
            >
              Save Invoice
            </button>
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`Process Payment for Invoice #${invoiceToPay?.id}`}>
        {invoiceToPay && (
          <div className="space-y-4">
            <p className="text-lg">
              **Customer:** {invoiceToPay.customerName}
            </p>
            <p className="text-lg">
              **Total Due:** {invoiceToPay.currency}{invoiceToPay.total.toFixed(2)}
            </p>
            <p className="text-lg">
              **Amount Paid So Far:** {invoiceToPay.currency}{invoiceToPay.paidAmount.toFixed(2)}
            </p>
            <p className="text-xl font-bold text-red-600">
              **Remaining Balance:** {invoiceToPay.currency}{(invoiceToPay.total - invoiceToPay.paidAmount).toFixed(2)}
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Amount ({invoiceToPay.currency})</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Enter amount to pay"
                min="0.01"
                step="0.01"
              />
            </div>

            {paymentMessage && (
              <p className={`text-sm ${paymentMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'} font-medium`}>{paymentMessage}</p>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                onClick={processPayment}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                disabled={parseFloat(paymentAmount) <= 0 || isNaN(parseFloat(paymentAmount))}
              >
                <CreditCard size={20} />
                <span>Process Payment</span>
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillingSystem;
