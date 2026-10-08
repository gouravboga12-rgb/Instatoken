# AWS RDS to EC2 PostgreSQL Migration & Cost Reduction Plan
**Project:** InstaToken  
**Target:** Eliminate AWS RDS billing by migrating PostgreSQL to EC2 (Local DB + S3 Media)  
**Date Created:** September 28, 2026  
**Status:** Ready for Execution  

---

## 1. Executive Summary & Objective

- **Goal:** Reduce AWS monthly costs significantly by removing the managed **AWS RDS PostgreSQL** instance (`instatoken-db-restored.c1gqoogyq5b6.ap-south-2.rds.amazonaws.com`) and running PostgreSQL directly on the existing **AWS EC2** instance (`16.113.52.235`).
- **Target Architecture:**
  - **AWS EC2:** Runs Nginx + Frontend SPA + Node.js Backend API + Local PostgreSQL Database (`127.0.0.1:5432`).
  - **AWS S3:** Retains media storage (`instatoken-media-prod`) + stores daily automated database backups.
  - **AWS RDS:** **Terminated** (after taking a permanent manual snapshot).
- **Data Safety:** Zero data loss guarantee. All live tables and sequences verified prior to migration.

---

## 2. Current State & Live Data Audit

Verified on September 28, 2026 via `server/scripts/inspect_rds.js`:

| Table Name | Live Rows | Description |
| :--- | :---: | :--- |
| `tokens` | 27 | Active & historical patient OPD tokens |
| `appointments` | 26 | Patient appointment bookings & status |
| `hospital_departments` | 25 | Hospital clinical departments |
| `hospital_doctors` | 11 | Doctor profiles, specializations & fees |
| `hospitals` | 3 | Registered hospital accounts |
| `hospital_profiles` | 3 | Hospital operational profiles & branding |
| `hospital_schedules` | 1 | Hospital OPD session configurations |
| `sync_store` | 1 | Synchronized multi-panel state cache |
| `customers` | 0 | Master customer records |
| `hospital_patients` | 0 | Hospital patient directory |
| `location_banners` | 0 | Location advertisement banners |
| **Total** | **96 rows** | All live data verified intact |

- **Current RDS Host:** `instatoken-db-restored.c1gqoogyq5b6.ap-south-2.rds.amazonaws.com`
- **Database Name:** `instatoken_prod`
- **EC2 Instance IP:** `16.113.52.235`
- **SSH Key Pair:** `instatoken-ec2-key.pem`

---

## 3. End-to-End Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: RDS Export                                         │
│ • Export complete SQL dump (schema + 96 rows) to backup file│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: EC2 PostgreSQL Setup                              │
│ • Install PostgreSQL 16 on EC2 (sudo apt install postgresql)│
│ • Create database `instatoken_prod` & set user credentials  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Database Restore & Verification                    │
│ • Import SQL dump into EC2 local PostgreSQL                 │
│ • Validate row counts (verify tokens: 27, appointments: 26) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Backend Configuration Update                       │
│ • Update server/.env: DB_HOST=127.0.0.1, DB_SSL=false        │
│ • Update server/config/db.js to toggle SSL dynamically       │
│ • Restart backend with PM2 (`pm2 restart instatoken-api`)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Live Functional Testing                            │
│ • Test booking a token, queue advancement, and API response │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6: AWS RDS Final Snapshot & Deletion                  │
│ • Take permanent snapshot in AWS Console                    │
│ • Delete RDS instance -> Billing stops immediately          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 7: Automated Nightly Backup to S3                     │
│ • Setup daily 02:00 AM cron to dump DB & sync to S3         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Step-by-Step Execution Guide

### Phase 1: Export Complete Data from RDS
Run the dedicated data exporter script from the workspace to create `instatoken_dump.sql`:
```bash
node server/scripts/dump_rds.js
```
*(This script will be generated to export all DDL schemas, tables, constraints, and INSERT statements for all 96 rows).*

---

### Phase 2: Connect to EC2 & Install PostgreSQL

1. **SSH into the EC2 Instance:**
   ```bash
   ssh -i instatoken-ec2-key.pem ubuntu@16.113.52.235
   ```

2. **Install PostgreSQL:**
   ```bash
   sudo apt update
   sudo apt install -y postgresql postgresql-contrib

   # Enable and start the service
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   ```

3. **Initialize Database & User:**
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE instatoken_prod;"
   sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'YOUR_POSTGRES_PASSWORD';"
   ```

---

### Phase 3: Restore Data into EC2 PostgreSQL

1. **Upload Dump to EC2:**
   From your local terminal:
   ```bash
   scp -i instatoken-ec2-key.pem instatoken_dump.sql ubuntu@16.113.52.235:/home/ubuntu/
   ```

2. **Import Data on EC2:**
   ```bash
   sudo -u postgres psql -d instatoken_prod -f /home/ubuntu/instatoken_dump.sql
   ```

3. **Verify Table Row Counts:**
   ```bash
   sudo -u postgres psql -d instatoken_prod -c "
     SELECT 'tokens' AS table, count(*) FROM tokens
     UNION ALL
     SELECT 'appointments', count(*) FROM appointments
     UNION ALL
     SELECT 'hospital_doctors', count(*) FROM hospital_doctors
     UNION ALL
     SELECT 'hospital_departments', count(*) FROM hospital_departments
     UNION ALL
     SELECT 'hospitals', count(*) FROM hospitals;
   "
   ```
   *Expected counts: tokens=27, appointments=26, doctors=11, departments=25, hospitals=3.*

---

### Phase 4: Update Backend Configuration on EC2

1. **Update `server/.env` on EC2 (`/home/ubuntu/Instatoken/server/.env`):**
   ```env
   PORT=5000
   NODE_ENV=production

   # Local PostgreSQL on EC2
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=instatoken_prod
   DB_USER=postgres
   DB_PASSWORD="YOUR_POSTGRES_PASSWORD"
   DB_SSL=false
   DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/instatoken_prod"

   # AWS S3 Storage & Region
   AWS_REGION=ap-south-2
   AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
   AWS_S3_BUCKET_NAME=instatoken-media-prod

   # SMTP Mailer
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=YOUR_SMTP_USER
   SMTP_PASSWORD=YOUR_SMTP_PASSWORD
   SMTP_FROM="InstaToken.in <token.in1999@gmail.com>"

   # Google Maps & Razorpay
   GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
   RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
   ```

2. **Adjust Database Connection in `server/config/db.js`:**
   Ensure SSL is only active when `DB_SSL=true` (for local connections, SSL is disabled).

3. **Restart the PM2 Service:**
   ```bash
   pm2 restart instatoken-api
   pm2 logs instatoken-api --lines 30
   ```

---

### Phase 5: Verification & End-to-End Testing

1. Test API endpoint:
   ```bash
   curl http://127.0.0.1:5000/api/hospitals
   ```
2. Open the web browser: `http://16.113.52.235` (or domain).
3. Test actions:
   - Load hospital profile and doctors.
   - Book a test token with Razorpay test checkout.
   - Advance queue in the hospital panel.
   - Verify changes persist across page refresh.

---

### Phase 6: Safely Decommission AWS RDS (Stop Billing)

Once live testing on EC2 PostgreSQL is confirmed:
1. Log in to the **AWS Management Console** $\to$ Navigate to **Amazon RDS**.
2. Go to **Databases** $\to$ Select `instatoken-db-restored`.
3. Click **Actions** $\to$ **Take snapshot**:
   - Snapshot Name: `instatoken-final-rds-snapshot`
   - Wait until status changes to *Available* (this serves as a permanent cold backup in AWS).
4. Click **Actions** $\to$ **Delete**:
   - Uncheck create final snapshot (already done in step 3).
   - Acknowledge deletion and type `delete me`.
5. **RDS billing ceases immediately.**

---

### Phase 7: Automated Nightly S3 Backup (Zero Cost Safety)

To replace RDS automated backups with free S3 storage:
1. On the EC2 instance, create a backup script `/home/ubuntu/backup_db.sh`:
   ```bash
   #!/bin/bash
   DATE=$(date +%Y-%m-%d_%H%M%S)
   BACKUP_FILE="/tmp/instatoken_db_${DATE}.sql.gz"

   # Dump & Compress
   PGPASSWORD="InstaToken#2026Secure" pg_dump -h 127.0.0.1 -U postgres instatoken_prod | gzip > $BACKUP_FILE

   # Upload to S3
   aws s3 cp $BACKUP_FILE s3://instatoken-media-prod/db-backups/instatoken_db_${DATE}.sql.gz

   # Clean up local file
   rm -f $BACKUP_FILE
   ```
2. Make it executable:
   ```bash
   chmod +x /home/ubuntu/backup_db.sh
   ```
3. Add to root cron (`sudo crontab -e`):
   ```cron
   0 2 * * * /home/ubuntu/backup_db.sh > /dev/null 2>&1
   ```

---

## 5. Rollback Plan (If Needed)

If any unexpected issue arises prior to deleting RDS:
1. Simply revert `server/.env` `DB_HOST` back to `instatoken-db-restored.c1gqoogyq5b6.ap-south-2.rds.amazonaws.com` and `DB_SSL=true`.
2. Restart backend: `pm2 restart instatoken-api`.
3. The system returns instantly to AWS RDS without any interruption.
