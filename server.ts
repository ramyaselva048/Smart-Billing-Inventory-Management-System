import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  'mysql://3He9z1vKBmUQz4d.root:IWJSV5X7KWIVayvU@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/smartbill';

// Create MySQL / TiDB Connection Pool
let pool: mysql.Pool | null = null;

try {
  pool = mysql.createPool({
    uri: DATABASE_URL,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
  console.log('[Database] MySQL / TiDB pool initialized.');
} catch (err) {
  console.error('[Database] Error creating pool:', err);
}

// Fallback in-memory / sample data if database needs seeding
const INITIAL_USERS = [
  {
    id: 'usr-admin-ramya',
    name: 'Ramya Selva',
    email: 'ramyaselva048@gmail.com',
    role: 'admin',
    status: 'active',
    phone: '+91 98765 04800',
    password: 'Ramya@123',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'usr-1',
    name: 'Rajesh Kumar',
    email: 'admin@smartbill.com',
    role: 'admin',
    status: 'active',
    phone: '+91 98765 43210',
    password: 'admin123',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'usr-2',
    name: 'Priya Sharma',
    email: 'staff@smartbill.com',
    role: 'staff',
    status: 'active',
    phone: '+91 98765 12345',
    password: 'staff123',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-02-01T11:30:00Z',
  },
  {
    id: 'usr-3',
    name: 'Arun Varma',
    email: 'arun@smartbill.com',
    role: 'staff',
    status: 'inactive',
    phone: '+91 98401 23456',
    password: 'staff123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-02-15T09:15:00Z',
  },
];

const INITIAL_SETTINGS = {
  id: 'default',
  businessName: 'SMART BILL ENTERPRISES',
  businessAddress: 'Suite 402, Metro Business Park, Anna Salai, Chennai, Tamil Nadu - 600002',
  phone: '+91 98765 43210',
  email: 'billing@smartbill.com',
  gstNumber: '33AAAAA1234A1Z5',
  invoicePrefix: 'INV-2026-',
  logoUrl: '',
};

function getSampleInvoices() {
  const now = new Date();
  const formatD = (offsetDays: number) => {
    const d = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const today = formatD(0);
  const yesterday = formatD(1);
  const threeDaysAgo = formatD(3);
  const fiveDaysAgo = formatD(5);
  const tenDaysAgo = formatD(10);
  const twentyDaysAgo = formatD(20);
  const twoMonthsAgo = formatD(60);
  const fourMonthsAgo = formatD(120);

  return [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-00001',
      date: today,
      customerName: 'Kavitha R',
      customerPhone: '+91 98401 55678',
      customerAddress: 'T Nagar, Chennai',
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      paymentRef: 'UPI-TXN-884210',
      notes: 'Thank you for your business!',
      items: [
        {
          id: 'item-1-1',
          itemName: 'Classmate Notebook (192 pgs)',
          quantity: 2,
          unitPrice: 100,
          discount: 10,
          gst: 18,
          taxableAmount: 190,
          gstAmount: 34.2,
          total: 224.2,
        },
        {
          id: 'item-1-2',
          itemName: 'Ballpoint Pen Set (10 Pack)',
          quantity: 1,
          unitPrice: 150,
          discount: 0,
          gst: 12,
          taxableAmount: 150,
          gstAmount: 18,
          total: 168,
        },
      ],
      subtotal: 350,
      discount: 10,
      gst: 52.2,
      grandTotal: 392.2,
      createdById: 'usr-admin-ramya',
      createdByName: 'Ramya Selva',
      createdAt: `${today}T10:15:00Z`,
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-00002',
      date: today,
      customerName: 'Suresh Kumar',
      customerPhone: '+91 97890 12340',
      customerAddress: 'Velachery, Chennai',
      paymentMethod: 'Cash',
      paymentStatus: 'PAID',
      items: [
        {
          id: 'item-2-1',
          itemName: 'A4 Copier Paper (500 Sheets)',
          quantity: 3,
          unitPrice: 320,
          discount: 60,
          gst: 18,
          taxableAmount: 900,
          gstAmount: 162,
          total: 1062,
        },
      ],
      subtotal: 960,
      discount: 60,
      gst: 162,
      grandTotal: 1062,
      createdById: 'usr-2',
      createdByName: 'Priya Sharma',
      createdAt: `${today}T14:30:00Z`,
    },
    {
      id: 'inv-3',
      invoiceNumber: 'INV-2026-00003',
      date: yesterday,
      customerName: 'Venkatesh S',
      customerPhone: '+91 99402 77890',
      customerAddress: 'Adyar, Chennai',
      paymentMethod: 'Card',
      paymentStatus: 'PAID',
      paymentRef: 'POS-AUTH-9912',
      items: [
        {
          id: 'item-3-1',
          itemName: 'Wireless Desk Mouse',
          quantity: 1,
          unitPrice: 750,
          discount: 50,
          gst: 18,
          taxableAmount: 700,
          gstAmount: 126,
          total: 826,
        },
        {
          id: 'item-3-2',
          itemName: 'Desk Organizer Tray',
          quantity: 2,
          unitPrice: 200,
          discount: 20,
          gst: 12,
          taxableAmount: 380,
          gstAmount: 45.6,
          total: 425.6,
        },
      ],
      subtotal: 1150,
      discount: 70,
      gst: 171.6,
      grandTotal: 1251.6,
      createdById: 'usr-2',
      createdByName: 'Priya Sharma',
      createdAt: `${yesterday}T16:00:00Z`,
    },
    {
      id: 'inv-4',
      invoiceNumber: 'INV-2026-00004',
      date: threeDaysAgo,
      customerName: 'Anitha Murugan',
      customerPhone: '+91 94441 33456',
      customerAddress: 'Anna Nagar, Chennai',
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      paymentRef: 'UPI-TXN-552109',
      items: [
        {
          id: 'item-4-1',
          itemName: 'LED Desk Reading Lamp',
          quantity: 2,
          unitPrice: 650,
          discount: 100,
          gst: 18,
          taxableAmount: 1200,
          gstAmount: 216,
          total: 1416,
        },
      ],
      subtotal: 1300,
      discount: 100,
      gst: 216,
      grandTotal: 1416,
      createdById: 'usr-1',
      createdByName: 'Rajesh Kumar',
      createdAt: `${threeDaysAgo}T11:45:00Z`,
    },
    {
      id: 'inv-5',
      invoiceNumber: 'INV-2026-00005',
      date: fiveDaysAgo,
      customerName: 'Karthik N',
      paymentMethod: 'Cash',
      paymentStatus: 'PAID',
      items: [
        {
          id: 'item-5-1',
          itemName: 'Highlighter Pen Pack (Set of 4)',
          quantity: 4,
          unitPrice: 120,
          discount: 30,
          gst: 12,
          taxableAmount: 450,
          gstAmount: 54,
          total: 504,
        },
      ],
      subtotal: 480,
      discount: 30,
      gst: 54,
      grandTotal: 504,
      createdById: 'usr-2',
      createdByName: 'Priya Sharma',
      createdAt: `${fiveDaysAgo}T12:20:00Z`,
    },
    {
      id: 'inv-6',
      invoiceNumber: 'INV-2026-00006',
      date: tenDaysAgo,
      customerName: 'Deepa Lakshmi',
      customerPhone: '+91 98840 99012',
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      items: [
        {
          id: 'item-6-1',
          itemName: 'SanDisk 64GB USB Drive 3.0',
          quantity: 2,
          unitPrice: 499,
          discount: 50,
          gst: 18,
          taxableAmount: 948,
          gstAmount: 170.64,
          total: 1118.64,
        },
      ],
      subtotal: 998,
      discount: 50,
      gst: 170.64,
      grandTotal: 1118.64,
      createdById: 'usr-1',
      createdByName: 'Rajesh Kumar',
      createdAt: `${tenDaysAgo}T15:10:00Z`,
    },
    {
      id: 'inv-7',
      invoiceNumber: 'INV-2026-00007',
      date: twentyDaysAgo,
      customerName: 'Saravanan B',
      customerPhone: '+91 97910 44556',
      paymentMethod: 'Card',
      paymentStatus: 'PAID',
      paymentRef: 'POS-AUTH-4102',
      items: [
        {
          id: 'item-7-1',
          itemName: 'Logitech Wireless Keyboard & Mouse Combo',
          quantity: 1,
          unitPrice: 1650,
          discount: 150,
          gst: 18,
          taxableAmount: 1500,
          gstAmount: 270,
          total: 1770,
        },
      ],
      subtotal: 1650,
      discount: 150,
      gst: 270,
      grandTotal: 1770,
      createdById: 'usr-admin-ramya',
      createdByName: 'Ramya Selva',
      createdAt: `${twentyDaysAgo}T17:30:00Z`,
    },
    {
      id: 'inv-8',
      invoiceNumber: 'INV-2026-00008',
      date: twoMonthsAgo,
      customerName: 'Metro Academy',
      customerPhone: '+91 98410 88231',
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      paymentRef: 'UPI-TXN-110294',
      items: [
        {
          id: 'item-8-1',
          itemName: 'Office Document Shredder Machine',
          quantity: 1,
          unitPrice: 3800,
          discount: 300,
          gst: 18,
          taxableAmount: 3500,
          gstAmount: 630,
          total: 4130,
        },
      ],
      subtotal: 3800,
      discount: 300,
      gst: 630,
      grandTotal: 4130,
      createdById: 'usr-1',
      createdByName: 'Rajesh Kumar',
      createdAt: `${twoMonthsAgo}T11:00:00Z`,
    },
    {
      id: 'inv-9',
      invoiceNumber: 'INV-2026-00009',
      date: fourMonthsAgo,
      customerName: 'Apex Tech Solutions',
      customerPhone: '+91 98841 22334',
      paymentMethod: 'Cash',
      paymentStatus: 'PAID',
      items: [
        {
          id: 'item-9-1',
          itemName: 'Thermal POS Bill Printer (80mm USB)',
          quantity: 1,
          unitPrice: 4200,
          discount: 250,
          gst: 18,
          taxableAmount: 3950,
          gstAmount: 711,
          total: 4661,
        },
      ],
      subtotal: 4200,
      discount: 250,
      gst: 711,
      grandTotal: 4661,
      createdById: 'usr-2',
      createdByName: 'Priya Sharma',
      createdAt: `${fourMonthsAgo}T14:15:00Z`,
    },
  ];
}

// Database schema migration & initialization
async function initDatabase() {
  if (!pool) return;
  try {
    const conn = await pool.getConnection();
    try {
      console.log('[Database] Checking schema & tables...');

      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(32) NOT NULL DEFAULT 'staff',
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          phone VARCHAR(64),
          avatar TEXT,
          password VARCHAR(255),
          createdAt VARCHAR(64) NOT NULL
        );
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
          businessName VARCHAR(255) NOT NULL,
          businessAddress TEXT NOT NULL,
          phone VARCHAR(64) NOT NULL,
          email VARCHAR(255) NOT NULL,
          gstNumber VARCHAR(64) NOT NULL,
          invoicePrefix VARCHAR(32) NOT NULL,
          logoUrl TEXT,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id VARCHAR(64) PRIMARY KEY,
          invoiceNumber VARCHAR(64) NOT NULL UNIQUE,
          date VARCHAR(32) NOT NULL,
          customerName VARCHAR(255),
          customerPhone VARCHAR(64),
          customerAddress TEXT,
          paymentMethod VARCHAR(32) NOT NULL DEFAULT 'Cash',
          paymentStatus VARCHAR(32) NOT NULL DEFAULT 'PAID',
          paymentRef VARCHAR(128),
          notes TEXT,
          items JSON,
          subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
          discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          gst DECIMAL(12, 2) NOT NULL DEFAULT 0,
          grandTotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
          createdById VARCHAR(64),
          createdByName VARCHAR(255),
          createdAt VARCHAR(64) NOT NULL
        );
      `);

      // Seed Users if empty
      const [userCountRows]: any = await conn.query('SELECT COUNT(*) as count FROM users');
      if (userCountRows[0].count === 0) {
        console.log('[Database] Seeding initial users into TiDB...');
        for (const u of INITIAL_USERS) {
          await conn.query(
            'INSERT INTO users (id, name, email, role, status, phone, avatar, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [u.id, u.name, u.email, u.role, u.status, u.phone, u.avatar, u.password, u.createdAt]
          );
        }
      }

      // Seed Settings if empty
      const [settingsCountRows]: any = await conn.query('SELECT COUNT(*) as count FROM settings');
      if (settingsCountRows[0].count === 0) {
        console.log('[Database] Seeding initial settings into TiDB...');
        await conn.query(
          'INSERT INTO settings (id, businessName, businessAddress, phone, email, gstNumber, invoicePrefix, logoUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            INITIAL_SETTINGS.id,
            INITIAL_SETTINGS.businessName,
            INITIAL_SETTINGS.businessAddress,
            INITIAL_SETTINGS.phone,
            INITIAL_SETTINGS.email,
            INITIAL_SETTINGS.gstNumber,
            INITIAL_SETTINGS.invoicePrefix,
            INITIAL_SETTINGS.logoUrl,
          ]
        );
      }

      // Seed Invoices if empty
      const [invCountRows]: any = await conn.query('SELECT COUNT(*) as count FROM invoices');
      if (invCountRows[0].count === 0) {
        console.log('[Database] Seeding sample invoices into TiDB...');
        const samples = getSampleInvoices();
        for (const inv of samples) {
          await conn.query(
            `INSERT INTO invoices 
             (id, invoiceNumber, date, customerName, customerPhone, customerAddress, paymentMethod, paymentStatus, paymentRef, notes, items, subtotal, discount, gst, grandTotal, createdById, createdByName, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inv.id,
              inv.invoiceNumber,
              inv.date,
              inv.customerName || null,
              inv.customerPhone || null,
              inv.customerAddress || null,
              inv.paymentMethod,
              inv.paymentStatus,
              inv.paymentRef || null,
              inv.notes || null,
              JSON.stringify(inv.items),
              inv.subtotal,
              inv.discount,
              inv.gst,
              inv.grandTotal,
              inv.createdById || null,
              inv.createdByName || null,
              inv.createdAt,
            ]
          );
        }
      }

      console.log('[Database] Schema verification and seeding completed successfully!');
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[Database] Failed to initialize database:', err);
  }
}

// Helper to format invoice rows returned from database
function formatInvoiceRow(row: any) {
  if (!row) return null;
  let parsedItems = [];
  try {
    parsedItems = typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [];
  } catch (e) {
    parsedItems = [];
  }

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    date: row.date,
    customerName: row.customerName || '',
    customerPhone: row.customerPhone || '',
    customerAddress: row.customerAddress || '',
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus || 'PAID',
    paymentRef: row.paymentRef || '',
    notes: row.notes || '',
    items: parsedItems.map((it: any) => ({
      ...it,
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      discount: Number(it.discount || 0),
      gst: Number(it.gst || 0),
      taxableAmount: Number(it.taxableAmount || 0),
      gstAmount: Number(it.gstAmount || 0),
      total: Number(it.total || 0),
    })),
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    gst: Number(row.gst || 0),
    grandTotal: Number(row.grandTotal || 0),
    createdById: row.createdById || '',
    createdByName: row.createdByName || '',
    createdAt: row.createdAt,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize DB asynchronously
  await initDatabase();

  // --------------------------------------------------------------------------
  // API Routes
  // --------------------------------------------------------------------------

  // 1. Health & Database Status
  app.get('/api/health', async (req, res) => {
    const t0 = Date.now();
    try {
      if (!pool) {
        return res.json({
          status: 'error',
          connected: false,
          error: 'No pool created',
        });
      }
      const [rows]: any = await pool.query('SELECT DATABASE() as db, VERSION() as version');
      const ping = Date.now() - t0;

      const [userCount]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      const [invoiceCount]: any = await pool.query('SELECT COUNT(*) as count FROM invoices');

      res.json({
        status: 'ok',
        connected: true,
        database: rows[0]?.db || 'smartbill',
        version: rows[0]?.version,
        pingMs: ping,
        engine: 'TiDB Cloud Serverless (MySQL Compatible)',
        host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000',
        counts: {
          users: userCount[0]?.count || 0,
          invoices: invoiceCount[0]?.count || 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        connected: false,
        error: err.message,
      });
    }
  });

  // 2. Authentication APIs
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({ error: 'Account is deactivated. Contact Administrator.' });
      }

      const { password: _, ...userWithoutPass } = user;
      res.json({
        user: userWithoutPass,
        token: `jwt-token-${user.id}-${Date.now()}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  app.post('/api/auth/profile', async (req, res) => {
    try {
      const { userId, name, email, phone, avatar } = req.body;
      if (!userId || !name || !email) {
        return res.status(400).json({ error: 'Missing required profile fields' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      await pool.query(
        'UPDATE users SET name = ?, email = ?, phone = ?, avatar = ? WHERE id = ?',
        [name, email.trim().toLowerCase(), phone || null, avatar || null, userId]
      );

      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });

      const { password: _, ...userWithoutPass } = rows[0];
      res.json(userWithoutPass);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
  });

  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const { userId, currentPass, newPass } = req.body;
      if (!userId || !currentPass || !newPass) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });

      if (rows[0].password !== currentPass) {
        return res.status(400).json({ error: 'Current password does not match' });
      }

      await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPass, userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to change password' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { userId, newPass } = req.body;
      if (!userId || !newPass) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPass, userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
  });

  app.post('/api/auth/reset-by-email', async (req, res) => {
    try {
      const { email, newPass } = req.body;
      if (!email || !newPass) {
        return res.status(400).json({ error: 'Email and new password are required' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
      if (!rows[0]) return res.status(404).json({ error: 'No account registered with this email' });

      await pool.query('UPDATE users SET password = ? WHERE email = ?', [newPass, email.trim().toLowerCase()]);

      const { password: _, ...userWithoutPass } = rows[0];
      res.json(userWithoutPass);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
  });

  // 3. Users Management APIs
  app.get('/api/users', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });
      const [rows]: any = await pool.query('SELECT * FROM users ORDER BY createdAt ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { name, email, role, status, phone, avatar, password } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const newId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = new Date().toISOString();

      await pool.query(
        'INSERT INTO users (id, name, email, role, status, phone, avatar, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newId,
          name,
          email.trim().toLowerCase(),
          role || 'staff',
          status || 'active',
          phone || null,
          avatar || null,
          password || 'staff123',
          createdAt,
        ]
      );

      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
      res.status(201).json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const fields: string[] = [];
      const values: any[] = [];

      for (const [key, val] of Object.entries(updates)) {
        if (['name', 'email', 'role', 'status', 'phone', 'avatar', 'password'].includes(key)) {
          fields.push(`${key} = ?`);
          values.push(key === 'email' && typeof val === 'string' ? val.trim().toLowerCase() : val);
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  // 4. Invoices APIs
  app.get('/api/invoices', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });
      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const invoices = rows.map(formatInvoiceRow);
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/invoices/next-number', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [settingsRows]: any = await pool.query('SELECT invoicePrefix FROM settings WHERE id = "default"');
      const prefix = settingsRows[0]?.invoicePrefix || 'INV-2026-';

      const [invRows]: any = await pool.query(
        'SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY invoiceNumber DESC',
        [`${prefix}%`]
      );

      let nextSerial = 1;
      for (const row of invRows) {
        const numPart = row.invoiceNumber.replace(prefix, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextSerial) {
          nextSerial = parsed + 1;
        }
      }

      const nextNumber = `${prefix}${String(nextSerial).padStart(5, '0')}`;
      res.json({ nextInvoiceNumber: nextNumber });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
      res.json(formatInvoiceRow(rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    try {
      const data = req.body;
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return res.status(400).json({ error: 'Invoice must contain at least one item' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      // Calculate totals
      let subtotal = 0;
      let totalDiscount = 0;
      let totalGst = 0;

      const processedItems = data.items.map((it: any, index: number) => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.unitPrice) || 0;
        const disc = Number(it.discount) || 0;
        const gstRate = Number(it.gst) || 0;

        const baseTotal = qty * price;
        const taxable = Math.max(0, baseTotal - disc);
        const gstVal = Number(((taxable * gstRate) / 100).toFixed(2));
        const lineTotal = Number((taxable + gstVal).toFixed(2));

        subtotal += baseTotal;
        totalDiscount += disc;
        totalGst += gstVal;

        return {
          id: it.id || `item-${Date.now()}-${index}`,
          itemName: it.itemName,
          quantity: qty,
          unitPrice: price,
          discount: disc,
          gst: gstRate,
          taxableAmount: Number(taxable.toFixed(2)),
          gstAmount: gstVal,
          total: lineTotal,
        };
      });

      const grandTotal = Number((subtotal - totalDiscount + totalGst).toFixed(2));

      // Generate invoice number if not provided
      let invoiceNumber = data.invoiceNumber;
      if (!invoiceNumber) {
        const [st]: any = await pool.query('SELECT invoicePrefix FROM settings WHERE id = "default"');
        const prefix = st[0]?.invoicePrefix || 'INV-2026-';
        const [invs]: any = await pool.query(
          'SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY invoiceNumber DESC',
          [`${prefix}%`]
        );
        let maxSerial = 0;
        for (const row of invs) {
          const numPart = row.invoiceNumber.replace(prefix, '');
          const p = parseInt(numPart, 10);
          if (!isNaN(p) && p > maxSerial) maxSerial = p;
        }
        invoiceNumber = `${prefix}${String(maxSerial + 1).padStart(5, '0')}`;
      }

      const id = data.id || `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date();
      const createdAt = data.createdAt || now.toISOString();
      const date = data.date || createdAt.split('T')[0];

      await pool.query(
        `INSERT INTO invoices 
         (id, invoiceNumber, date, customerName, customerPhone, customerAddress, paymentMethod, paymentStatus, paymentRef, notes, items, subtotal, discount, gst, grandTotal, createdById, createdByName, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          invoiceNumber,
          date,
          data.customerName || null,
          data.customerPhone || null,
          data.customerAddress || null,
          data.paymentMethod || 'Cash',
          data.paymentStatus || 'PAID',
          data.paymentRef || null,
          data.notes || null,
          JSON.stringify(processedItems),
          subtotal,
          totalDiscount,
          Number(totalGst.toFixed(2)),
          grandTotal,
          data.createdById || null,
          data.createdByName || null,
          createdAt,
        ]
      );

      const [createdRows]: any = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
      res.status(201).json(formatInvoiceRow(createdRows[0]));
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      res.status(500).json({ error: err.message || 'Failed to create invoice' });
    }
  });

  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      await pool.query('DELETE FROM invoices WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete invoice' });
    }
  });

  app.post('/api/invoices/delete-multiple', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Ids array is required' });
      }

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const placeholders = ids.map(() => '?').join(',');
      await pool.query(`DELETE FROM invoices WHERE id IN (${placeholders})`, ids);
      res.json({ success: true, count: ids.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete invoices' });
    }
  });

  app.post('/api/invoices/reset-sales', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      await pool.query('DELETE FROM invoices');
      const samples = getSampleInvoices();
      for (const inv of samples) {
        await pool.query(
          `INSERT INTO invoices 
           (id, invoiceNumber, date, customerName, customerPhone, customerAddress, paymentMethod, paymentStatus, paymentRef, notes, items, subtotal, discount, gst, grandTotal, createdById, createdByName, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inv.id,
            inv.invoiceNumber,
            inv.date,
            inv.customerName || null,
            inv.customerPhone || null,
            inv.customerAddress || null,
            inv.paymentMethod,
            inv.paymentStatus,
            inv.paymentRef || null,
            inv.notes || null,
            JSON.stringify(inv.items),
            inv.subtotal,
            inv.discount,
            inv.gst,
            inv.grandTotal,
            inv.createdById || null,
            inv.createdByName || null,
            inv.createdAt,
          ]
        );
      }

      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      res.json(rows.map(formatInvoiceRow));
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset sales data' });
    }
  });

  // 5. Dashboard & Analytics APIs
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const invoices = rows.map(formatInvoiceRow);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const currentYearPrefix = `${now.getFullYear()}-`;
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const todayInvoices = invoices.filter((inv: any) => inv.date === todayStr);
      const todaySales = todayInvoices.reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const weeklySales = invoices
        .filter((inv: any) => inv.date >= sevenDaysAgoStr && inv.date <= todayStr)
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const monthlySales = invoices
        .filter((inv: any) => inv.date.startsWith(currentMonthPrefix))
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const yearlySales = invoices
        .filter((inv: any) => inv.date.startsWith(currentYearPrefix))
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const totalSales = invoices.reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      res.json({
        todaySales: Number(todaySales.toFixed(2)),
        todayBills: todayInvoices.length,
        weeklySales: Number(weeklySales.toFixed(2)),
        monthlySales: Number(monthlySales.toFixed(2)),
        yearlySales: Number(yearlySales.toFixed(2)),
        totalSales: Number(totalSales.toFixed(2)),
        totalBills: invoices.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/dashboard/daily-sales', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const invoices = rows.map(formatInvoiceRow);

      const days: { [dateStr: string]: { day: string; dayName: string; date: string; sales: number; bills: number } } = {};
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        days[dateStr] = { day: dayName, dayName, date: dateStr, sales: 0, bills: 0 };
      }

      for (const inv of invoices) {
        if (days[inv.date]) {
          days[inv.date].sales = Number((days[inv.date].sales + inv.grandTotal).toFixed(2));
          days[inv.date].bills += 1;
        }
      }

      res.json(Object.values(days));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/dashboard/monthly-sales', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const invoices = rows.map(formatInvoiceRow);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();

      const data = months.map((monthName, idx) => {
        const monthPrefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
        const monthInvoices = invoices.filter((inv: any) => inv.date.startsWith(monthPrefix));
        const sales = monthInvoices.reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);
        return {
          month: monthName,
          sales: Number(sales.toFixed(2)),
          bills: monthInvoices.length,
        };
      });

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Reports APIs
  app.get('/api/reports/summary', async (req, res) => {
    try {
      const range = (req.query.range as string) || 'all';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const invoices = rows.map(formatInvoiceRow);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentYear = now.getFullYear();
      const currentYearPrefix = `${currentYear}-`;
      const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let filtered = invoices;
      if (range === 'today') {
        filtered = invoices.filter((inv: any) => inv.date === todayStr);
      } else if (range === 'week') {
        filtered = invoices.filter((inv: any) => inv.date >= sevenDaysAgoStr && inv.date <= todayStr);
      } else if (range === 'month') {
        filtered = invoices.filter((inv: any) => inv.date.startsWith(currentMonthPrefix));
      } else if (range === 'year') {
        filtered = invoices.filter((inv: any) => inv.date.startsWith(currentYearPrefix));
      } else if (range === 'custom') {
        filtered = invoices.filter((inv: any) => {
          if (startDate && inv.date < startDate) return false;
          if (endDate && inv.date > endDate) return false;
          return true;
        });
      }

      const totalRevenue = filtered.reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);
      const totalBills = filtered.length;

      const todaySales = invoices
        .filter((inv: any) => inv.date === todayStr)
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const weeklySales = invoices
        .filter((inv: any) => inv.date >= sevenDaysAgoStr && inv.date <= todayStr)
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const monthlySales = invoices
        .filter((inv: any) => inv.date.startsWith(currentMonthPrefix))
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      const yearlySales = invoices
        .filter((inv: any) => inv.date.startsWith(currentYearPrefix))
        .reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);

      res.json({
        todaySales: Number(todaySales.toFixed(2)),
        weeklySales: Number(weeklySales.toFixed(2)),
        monthlySales: Number(monthlySales.toFixed(2)),
        yearlySales: Number(yearlySales.toFixed(2)),
        totalBills,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        filteredInvoices: filtered,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reports/payment-summary', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const invoices = rows.map(formatInvoiceRow);

      let cashTotal = 0;
      let cashCount = 0;
      let upiTotal = 0;
      let upiCount = 0;
      let cardTotal = 0;
      let cardCount = 0;
      let allTotal = 0;

      for (const inv of invoices) {
        allTotal += inv.grandTotal;
        if (inv.paymentMethod === 'Cash') {
          cashTotal += inv.grandTotal;
          cashCount += 1;
        } else if (inv.paymentMethod === 'UPI') {
          upiTotal += inv.grandTotal;
          upiCount += 1;
        } else if (inv.paymentMethod === 'Card') {
          cardTotal += inv.grandTotal;
          cardCount += 1;
        }
      }

      const list = [
        {
          method: 'Cash',
          total: Number(cashTotal.toFixed(2)),
          count: cashCount,
          percentage: allTotal > 0 ? Number(((cashTotal / allTotal) * 100).toFixed(1)) : 0,
        },
        {
          method: 'UPI',
          total: Number(upiTotal.toFixed(2)),
          count: upiCount,
          percentage: allTotal > 0 ? Number(((upiTotal / allTotal) * 100).toFixed(1)) : 0,
        },
        {
          method: 'Card',
          total: Number(cardTotal.toFixed(2)),
          count: cardCount,
          percentage: allTotal > 0 ? Number(((cardTotal / allTotal) * 100).toFixed(1)) : 0,
        },
      ];

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Business Settings APIs
  app.get('/api/settings', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const [rows]: any = await pool.query('SELECT * FROM settings WHERE id = "default"');
      if (rows[0]) {
        res.json({
          businessName: rows[0].businessName,
          businessAddress: rows[0].businessAddress,
          phone: rows[0].phone,
          email: rows[0].email,
          gstNumber: rows[0].gstNumber,
          invoicePrefix: rows[0].invoicePrefix,
          logoUrl: rows[0].logoUrl || '',
        });
      } else {
        res.json(INITIAL_SETTINGS);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const updates = req.body;
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      const fields: string[] = [];
      const values: any[] = [];

      for (const [key, val] of Object.entries(updates)) {
        if (['businessName', 'businessAddress', 'phone', 'email', 'gstNumber', 'invoicePrefix', 'logoUrl'].includes(key)) {
          fields.push(`${key} = ?`);
          values.push(val);
        }
      }

      if (fields.length > 0) {
        await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE id = "default"`, values);
      }

      const [rows]: any = await pool.query('SELECT * FROM settings WHERE id = "default"');
      res.json({
        businessName: rows[0].businessName,
        businessAddress: rows[0].businessAddress,
        phone: rows[0].phone,
        email: rows[0].email,
        gstNumber: rows[0].gstNumber,
        invoicePrefix: rows[0].invoicePrefix,
        logoUrl: rows[0].logoUrl || '',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  app.post('/api/settings/reset', async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: 'Database not connected' });

      await pool.query(
        'UPDATE settings SET businessName = ?, businessAddress = ?, phone = ?, email = ?, gstNumber = ?, invoicePrefix = ?, logoUrl = ? WHERE id = "default"',
        [
          INITIAL_SETTINGS.businessName,
          INITIAL_SETTINGS.businessAddress,
          INITIAL_SETTINGS.phone,
          INITIAL_SETTINGS.email,
          INITIAL_SETTINGS.gstNumber,
          INITIAL_SETTINGS.invoicePrefix,
          INITIAL_SETTINGS.logoUrl,
        ]
      );
      res.json(INITIAL_SETTINGS);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset settings' });
    }
  });

  // --------------------------------------------------------------------------
  // Vite Middleware (Dev) or Static Assets (Prod)
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartBill Server] Running on http://0.0.0.0:${PORT} with TiDB Cloud MySQL`);
  });
}

startServer().catch(err => {
  console.error('[SmartBill Server] Startup fatal error:', err);
  process.exit(1);
});
