# Membership Management System

A comprehensive backend system for managing memberships, events, payments, and notifications for organizations, clubs, or non-profits.

## Features

### Admin Web App (`/app` routes)
- **Dashboard Analytics**: Total members, active members, pending renewals, revenue stats
- **Member Management**: CRUD operations, filtering, search, QR code generation
- **Event Management**: Create/edit events, attendance tracking, payment tracking
- **File Upload**: Profile images and event images
- **Comprehensive Reporting**: Zone-wise stats, membership distribution

### Mobile App (`/api` routes)
- **Authentication**: Login/Register with email/phone, OTP login
- **Member Dashboard**: Member card, next events, quick actions
- **Membership Renewal**: Renew with payment integration
- **Event Registration**: Register for events, view event history
- **Notifications**: Event reminders, expiry notices, announcements
- **Payment History**: View transaction history

## Technical Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (jsonwebtoken)
- **QR Code**: qrcode library
- **File Upload**: multer
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: helmet, cors, rate limiting

## Database Schema

### Core Tables
- **zones**: Geographic zones/regions
- **members**: Member information with QR codes
- **payments**: Payment transactions
- **events**: Event management
- **event_attendances**: Event registration and attendance
- **notifications**: Member notifications and announcements

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd membership-management
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb membership_db

# Or using psql
psql -U postgres
CREATE DATABASE membership_db;
```

### 3. Environment Configuration
```bash
# Copy and edit the configuration file
cp config.env .env

# Update the following variables in .env:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET (use a strong secret)
# - Other configuration as needed
```

### 4. Create Upload Directories
```bash
mkdir -p uploads/events
```

### 5. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Swagger Documentation
Access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

### API Endpoints Overview

#### Admin Web App (`/app`)
- `GET /app/dashboard/stats` - Dashboard statistics
- `GET /app/dashboard/zone-stats` - Zone-wise statistics
- `GET /app/dashboard/revenue-stats` - Revenue analytics
- `GET /app/members` - List members with filtering
- `POST /app/members` - Create new member
- `PUT /app/members/:id` - Update member
- `GET /app/members/:id/qr-code` - Get member QR code
- `GET /app/events` - List events
- `POST /app/events` - Create event
- `POST /app/events/:id/attendance` - Record attendance

#### Mobile App (`/api`)
- `POST /api/auth/login` - Member login
- `POST /api/auth/register` - Member registration
- `POST /api/auth/otp-login` - OTP-based login
- `GET /api/members/home` - Member home page
- `GET /api/members/card` - Member card with QR
- `POST /api/members/renewal` - Renew membership
- `GET /api/members/events` - Member's events
- `POST /api/members/register-event` - Register for event
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read

## Usage Examples

### 1. Create a New Member (Admin)
```bash
curl -X POST http://localhost:3000/app/members \
  -H "Content-Type: multipart/form-data" \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "email=john@example.com" \
  -F "phone=+1234567890" \
  -F "date_of_birth=1990-01-01" \
  -F "address=123 Main St" \
  -F "membership_type=premium" \
  -F "zone_id=1" \
  -F "expiry_date=2024-12-31"
```

### 2. Member Login (Mobile)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "password123"
  }'
```

### 3. Get Member Home Data
```bash
curl -X GET "http://localhost:3000/api/members/home?member_id=1"
```

### 4. Renew Membership
```bash
curl -X POST http://localhost:3000/api/members/renewal \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": 1,
    "membership_type": "premium",
    "payment_method": "card",
    "amount": 99.99
  }'
```

## Database Seeding

### Create Sample Data
```javascript
// You can add this to a seed file or run manually
const { Zone, Member, Event } = require('./models');

// Create zones
await Zone.create({ name: 'North Zone', description: 'Northern region' });
await Zone.create({ name: 'South Zone', description: 'Southern region' });

// Create sample members
await Member.create({
  member_id: 'MEM123456',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  date_of_birth: '1990-01-01',
  address: '123 Main St',
  membership_type: 'premium',
  zone_id: 1,
  expiry_date: '2024-12-31'
});

// Create sample events
await Event.create({
  title: 'Annual Meeting',
  description: 'Annual member meeting',
  event_date: '2024-06-15T10:00:00Z',
  location: 'Community Center',
  event_type: 'meeting',
  max_attendees: 100
});
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **File Upload Security**: File type and size validation

## File Structure

```
membership-management/
├── config/
│   └── database.js          # Database configuration
├── models/
│   ├── index.js             # Model associations
│   ├── Zone.js              # Zone model
│   ├── Member.js            # Member model
│   ├── Payment.js           # Payment model
│   ├── Event.js             # Event model
│   ├── EventAttendance.js   # Event attendance model
│   └── Notification.js      # Notification model
├── middleware/
│   └── auth.js              # Authentication middleware
├── app/
│   └── routes/              # Admin web app routes
│       ├── index.js
│       ├── dashboard.js
│       ├── members.js
│       └── events.js
├── api/
│   └── routes/              # Mobile app routes
│       ├── index.js
│       ├── auth.js
│       ├── members.js
│       └── notifications.js
├── uploads/                 # File upload directory
├── server.js               # Main server file
├── package.json
├── config.env              # Environment configuration
└── README.md
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Database Migrations
The system uses Sequelize with `sync()` for development. For production, consider using migrations:

```bash
# Install sequelize-cli
npm install -g sequelize-cli

# Generate migration
sequelize migration:generate --name create-members-table

# Run migrations
sequelize db:migrate
```

### Testing
```bash
# Add test scripts to package.json
npm test
```

## Production Deployment

### Environment Variables
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production database
- Set up proper file storage (AWS S3, etc.)

### Security Checklist
- [ ] Change default passwords
- [ ] Use HTTPS
- [ ] Configure proper CORS
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] Update dependencies regularly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository. 