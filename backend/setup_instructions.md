# Shiv Furniture Works ERP - Setup & Migration Instructions

This document provides step-by-step instructions to initialize the PostgreSQL database, execute migrations, seed initial data, and run the development backend environment.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
1. **Node.js** (v18.x or later)
2. **npm** (v9.x or later)
3. **PostgreSQL** (v14.x or later)

---

## 🛠️ Installation & Setup

### Step 1: Start PostgreSQL Server
Ensure that your local PostgreSQL instance is running. By default, Prisma will attempt to connect to:
`postgresql://postgres:postgres@localhost:5432/shiv_erp`

If your credentials or port numbers differ, please update the connection string inside `backend/.env`:
```env
DATABASE_URL="postgresql://<username>:<password>@localhost:<port>/shiv_erp"
```

### Step 2: Install Backend Dependencies
In the `/backend` directory, run:
```bash
npm install
```

### Step 3: Run Database Migrations
We have generated the initial migration file at `prisma/migrations/20260614000000_init/migration.sql`. Apply this migration schema to your PostgreSQL database by running:
```bash
npx prisma migrate dev --name init
```
This command will create all the tables, relations, and indexes in your local PostgreSQL database.

### Step 4: Seed the Database
Populate the database with default configuration, user roles, product categories, units of measure, sample suppliers, customers, products, and realistic initial inventory levels:
```bash
npx prisma db seed
```

---

## 🚀 Running the Services

### Start Backend Developer Server
In the `/backend` directory, launch the REST API:
```bash
npm run dev
```
The server runs on **`http://localhost:5000`**. You can verify that it is online by visiting:
`http://localhost:5000/health` (if implemented) or check the console logs.

---

## 👥 Seeded User Accounts

The database contains the following test credentials (all accounts use the password **`Password123`**):

| Role | Email |
| :--- | :--- |
| **Admin** | `admin@shivfurniture.com` |
| **Sales User** | `sales@shivfurniture.com` |
| **Purchase User** | `purchase@shivfurniture.com` |
| **Manufacturing User** | `manufacturing@shivfurniture.com` |
| **Inventory Manager** | `inventory@shivfurniture.com` |
| **Business Owner** | `owner@shivfurniture.com` |

---

## 📦 Seeded Product Inventory

The Main Warehouse (`WH-MAIN`) has been stocked with the following starting quantities:

| Product SKU | Product Name | Category | UoM | Cost Price | Sales Price | Starting Stock |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `RAW-LEG-01` | Wooden Legs | Raw Material | PCS | $15.00 | $25.00 | **200** |
| `RAW-TOP-01` | Wooden Top | Raw Material | PCS | $40.00 | $60.00 | **50** |
| `RAW-SCR-01` | Screws | Consumables | PCS | $0.10 | $0.20 | **1000** |
| `FG-TBL-01` | Wooden Table | Finished Goods | PCS | $110.00 | $220.00 | **5** |
| `FG-CHR-01` | Office Chair | Finished Goods | PCS | $80.00 | $160.00 | **10** |
