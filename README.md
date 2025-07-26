# 📊 FinCopilot: Integrated Billing & Financial Analysis System

FinCopilot is a powerful and intuitive web application designed to streamline billing operations, provide deep financial insights through analytics, and leverage artificial intelligence to assist with business decisions and task automation. Built with **React** and **Firebase**, it offers real-time data management, secure user authentication, and a responsive user interface.

---

## 🌟 Features

### 📑 Billing Management
- **Companies**: Manage multiple company profiles with details like name, address, phone, email, GSTIN, and type (Wholesale, Retail, Service).
- **Customers**: Maintain a customer database with contact info, GSTIN, credit limits, and balances.
- **Products**: Catalog products with details such as name, description, price, stock, and category.
- **Invoices**:
  - Create, edit, and delete invoices with multiple line items.
  - Auto-calculate subtotal, tax, and total with support for discounts and tax rates.
  - Invoice status tracking: `Pending`, `Partially Paid`, `Paid`, `Cancelled`.
  - **Multi-currency Support**: View invoice amounts in INR, USD, EUR, GBP, JPY.
  - **Mock Payment Processing**: Simulate invoice payments and status updates.

---

### 💰 Financial Transaction Tracking
- **Daily Transaction Entry**: Record income and expenses with date, amount, type, and category.
- **Recent Transactions List**: Chronologically view recent financial activity.

---

### 📈 Dynamic Data Visualization
- **Interactive Charts**:
  - **Line Chart**: Track sales and profit trends (daily, weekly, monthly, yearly).
  - **Bar Chart**: Compare net financial performance by category.
  - **Pie Chart**: Visualize contribution of each category to net profit.
- **Custom Date Filtering**: Analyze trends over specific periods.

---

### 📄 Advanced Reporting
- **Custom Reports**:
  - **Income Report**: View income by date range.
  - **Expense Report**: View expenses by date range.
  - **Profit & Loss Statement**: See income, expenses, and net profit/loss.
- **CSV Export**: Download reports (Invoices, Transactions, etc.) for offline analysis.

---

### 🧠 AI Copilot (Powered by Google Gemini)
- **AI-Driven Insights**: Ask natural language questions about your business data and get strategic, data-informed responses.
- **AI-Powered Invoice Draft**: Describe an invoice like:
  > _"Invoice for Retail Store A for 3 Laptop Pro X and 10 Wireless Mouse Z"_
  and get a ready-to-review invoice draft from your database.

---

### 📦 Inventory Management
- **Low Stock Alerts**: View real-time alerts for products below threshold.
- **Automatic Stock Deduction**: Stock updates automatically on paid invoices (with Firestore transactions).

---

### 🔒 Authentication & Data Persistence
- **User Authentication**: Email/password registration + anonymous sign-in for exploring.
- **Firebase Firestore**: Secure, real-time data storage for all entities.

---

### ✨ User Interface
- **Responsive Design**: Built with **Tailwind CSS** for seamless use across devices.
- **Intuitive Navigation**: Sidebar layout for quick access to all sections.

---

## 🚀 Tech Stack

### Frontend
- **React** – Modern UI development
- **Tailwind CSS** – Utility-first styling
- **Recharts** – React-based data visualizations
- **Lucide React** – Icon set for modern interfaces

### Backend / Database / Auth
- **Firebase**:
  - Firestore (Real-time NoSQL DB)
  - Authentication (Secure login and user management)

### AI Integration
- **Google Gemini API (gemini-2.0-flash)** – AI assistant for insights and invoice generation

---

## 📂 Folder Structure (Suggested)

```plaintext
src/
│
├── components/          # Reusable UI components
├── pages/               # Page-level components
├── services/            # Firebase and API logic
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── assets/              # Icons, images, etc.
└── styles/              # Global and Tailwind styles
