

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- npm or yarn

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Configure database
cp config.env .env
# Edit .env with your database credentials

# 3. Create upload directories
mkdir -p uploads/events

# 4. Start the server
npm run dev

# 5. Seed the database (optional)
npm run seed
```

### Environment Configuration
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=membership_db
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-secret-key
```

## 📱 Usage Examples

### Admin Operations
```bash
# Get dashboard stats
curl http://localhost:3000/app/dashboard/stats

# Create a new member
curl -X POST http://localhost:3000/app/members \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "email=john@example.com" \
  -F "membership_type=premium"

# Get member QR code
curl http://localhost:3000/app/members/1/qr-code
```

### Member Operations
```bash
# Member login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "john@example.com", "password": "password123"}'

# Get member home data
curl "http://localhost:3000/api/members/home?member_id=1"

# Renew membership
curl -X POST http://localhost:3000/api/members/renewal \
  -H "Content-Type: application/json" \
  -d '{"member_id": 1, "membership_type": "premium", "amount": 99.99}'
```


### Test Credentials
```
Email: john.doe@example.com
Password: password123
Member ID: MEM1001
```


