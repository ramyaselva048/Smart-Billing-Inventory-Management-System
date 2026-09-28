# SMART BILL – Billing & Invoice Management System

A clean, modern, and professional billing and invoice management system built with React, Vite, Tailwind CSS, Lucide React, and Recharts.

## Core Modules

1. **Authentication & Roles**
   - Admin & Staff login
   - JWT authentication
   - Profile editing & password reset for all users

2. **Dashboard**
   - Today's Total Sales
   - Today's Total Bills
   - Total Sales
   - Total Bills
   - Recent Bills with instant invoice preview
   - Simple daily sales chart

3. **New Bill (POS Billing)**
   - Fast manual line item entry: Item Name, Quantity, Unit Price, Discount, GST
   - Real-time automatic calculation of Subtotal, Discount, GST, and Grand Total
   - Settle payment via Cash, UPI, or Card
   - Automatic status marking as **PAID**
   - Immediate A4 invoice generation & preview

4. **Professional A4 Invoice**
   - Business credentials, address, phone, email, and GST Number
   - Unique invoice number & date
   - Payment method and status (PAID)
   - Itemized breakdown and tax calculations
   - Print Invoice, Download Vector PDF, and Create New Bill

5. **Sales History**
   - Complete ledger of all generated invoices
   - Search by invoice number
   - Filter by date (Today, This Week, This Month, All)
   - View, print, and download PDF for any invoice

6. **Reports**
   - Today's, Weekly, and Monthly sales metrics
   - Total revenue and total bills
   - Cash / UPI / Card distribution summary
   - Interactive charts for daily sales, monthly sales, and payment breakdown
   - Date range filtering, Print report, and Export to CSV

7. **Settings**
   - Business Name, Address, Phone, Email, GST Number, Invoice Prefix, and Logo
   - Auto-populated on all printed and generated invoices

8. **User Management (Admin Only)**
   - Add new staff accounts
   - Edit user profiles & roles
   - Activate / Deactivate staff
   - Delete staff accounts
