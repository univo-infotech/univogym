# Univo Gym Management — Project Structure

## Tech Stack
- **Frontend**: React 18 + Vite + JSX
- **Styling**: Tailwind CSS + Custom glassmorphism
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **Charts**: Recharts
- **Forms**: React Hook Form
- **PDF**: jsPDF + html2canvas

## Directory Structure

```
univogym/
├── public/
│   ├── logo-icon.png          # U-shaped gym icon
│   └── logo-full.png          # Full UNIVO GYM MANAGEMENT logo
│
├── src/
│   ├── assets/                # Additional static assets
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx         # Multi-variant button component
│   │   │   ├── Card.jsx           # Glass card components
│   │   │   ├── Badge.jsx          # Status badge component
│   │   │   ├── Modal.jsx          # Headless UI modal
│   │   │   ├── Input.jsx          # Dark-themed input + select
│   │   │   ├── Table.jsx          # DataTable with loading states
│   │   │   ├── StatCard.jsx       # Dashboard metric cards
│   │   │   ├── Avatar.jsx         # Photo or initials avatar
│   │   │   ├── SearchBar.jsx      # Search with clear button
│   │   │   ├── Loader.jsx         # Full-screen branded loader
│   │   │   └── EmptyState.jsx     # Empty state placeholder
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx        # Role-based navigation sidebar
│   │   │   ├── Topbar.jsx         # Top navigation with notifications
│   │   │   └── Layout.jsx         # Main layout wrapper (Sidebar+Topbar+Content)
│   │   │
│   │   └── shared/
│   │       ├── SignaturePad.jsx   # Canvas digital signature
│   │       ├── ImageUpload.jsx    # Drag & drop image uploader
│   │       ├── WhatsAppButton.jsx # WA contact button
│   │       └── PhotoCapture.jsx   # Photo input with preview
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx        # Auth state + role + gymId provider
│   │
│   ├── firebase/
│   │   ├── firebase.js            # Firebase app init, auth, db, storage exports
│   │   ├── auth.js                # Login, logout, getUserRole, createStaffUser
│   │   ├── members.js             # CRUD + invite token (5-min expiry) logic
│   │   ├── trainers.js            # Trainer CRUD + before/after management
│   │   ├── plans.js               # Membership plan CRUD
│   │   ├── payments.js            # Payment recording (cash/online/bank/mixed)
│   │   ├── expenses.js            # One-time + recurring expense tracking
│   │   ├── stock.js               # Equipment inventory + service reminders
│   │   ├── staff.js               # Staff management + attendance
│   │   ├── notifications.js       # Notifications + expiring member queries
│   │   ├── visits.js              # Visit/demo lead management
│   │   ├── reports.js             # Daily/monthly/custom report queries
│   │   └── attendance.js          # Member attendance tracking
│   │
│   ├── hooks/
│   │   └── useRealtime.js         # Firestore onSnapshot real-time hook
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx              # Branded login page (owner/trainer/member)
│   │   │   └── MemberSelfRegister.jsx # 5-step WhatsApp link self-registration
│   │   │
│   │   ├── owner/
│   │   │   ├── Dashboard.jsx          # Main KPI dashboard with charts
│   │   │   ├── Members.jsx            # Members list + invite link generator
│   │   │   ├── MemberDetail.jsx       # Full member profile with tabs
│   │   │   ├── Trainers.jsx           # Trainer grid + management
│   │   │   ├── TrainerDetail.jsx      # Trainer profile with members & results
│   │   │   ├── Staff.jsx              # Staff management + salary tracking
│   │   │   ├── Memberships.jsx        # Plan builder with features & pricing
│   │   │   ├── Services.jsx           # Gym services management
│   │   │   ├── Stock.jsx              # Equipment inventory + service alerts
│   │   │   ├── Payments.jsx           # Payment recording + history (multi-mode)
│   │   │   ├── Expenses.jsx           # One-time & recurring expense tracker
│   │   │   ├── Reports.jsx            # Daily/monthly/custom reports + export
│   │   │   ├── Visits.jsx             # Walk-in visits & demo management
│   │   │   ├── Offers.jsx             # Offers creator + WA broadcast system
│   │   │   └── Settings.jsx           # Gym profile, widgets, WA templates
│   │   │
│   │   ├── trainer/
│   │   │   ├── Dashboard.jsx          # Trainer home with today's schedule
│   │   │   ├── MyMembers.jsx          # Trainer's assigned members
│   │   │   ├── WorkoutPlans.jsx       # Create/manage workout plans
│   │   │   ├── BeforeAfter.jsx        # Upload before/after results
│   │   │   └── Attendance.jsx         # Mark member attendance
│   │   │
│   │   └── member/
│   │       ├── Dashboard.jsx          # Member home with plan & trainer info
│   │       ├── Profile.jsx            # Editable personal profile
│   │       ├── MyPlan.jsx             # Current plan + history
│   │       ├── MyTrainer.jsx          # Trainer profile + my progress
│   │       └── Payments.jsx           # Payment history + receipts
│   │
│   ├── routes/
│   │   ├── OwnerRoutes.jsx            # All owner page routes under /owner/*
│   │   ├── TrainerRoutes.jsx          # Trainer routes under /trainer/*
│   │   └── MemberRoutes.jsx           # Member routes under /member/*
│   │
│   ├── utils/
│   │   ├── whatsapp.js               # WA link generator + message templates
│   │   ├── linkExpiry.js             # 5-min token generation + validation
│   │   └── pdf.js                    # Waiver PDF, receipt PDF, report PDF
│   │
│   ├── App.jsx                        # Root app with role-based routing
│   ├── main.jsx                       # React root + providers
│   └── index.css                      # Tailwind + custom CSS
│
├── .env                               # Firebase config (DO NOT COMMIT)
├── .gitignore
├── vite.config.js                     # Vite + React plugin config
├── tailwind.config.js                 # Tailwind with brand colors
├── postcss.config.js
├── package.json
├── structure.md                       # This file
└── README.md
```

## Firestore Data Model

```
/gyms/{gymId}/
  /members/{memberId}
    name, phone, altPhone, email, gender, dob, address
    photo (storage URL), planId, planName, trainerId
    joinDate, expiryDate, status (active/expired/inactive)
    preferredTime, healthNotes, waiverSigned, signatureUrl
    createdAt, updatedAt

  /trainers/{trainerId}
    name, phone, email, photo, bio, specializations[]
    experience, salary, joinDate, isActive, userId
    
  /staff/{staffId}
    name, role, phone, email, photo, salary, joinDate, isActive
    
  /plans/{planId}
    name, duration (days), price, features[], color
    ptAddon (bool), ptAddonPrice, isActive, services[]
    
  /services/{serviceId}
    name, description, type (included/addon), price, icon, isActive
    
  /payments/{paymentId}
    memberId, memberName, planId, planName, amount
    paidAmount, dueAmount, status (paid/partial/pending)
    paymentMode (cash/online/bank/mixed)
    cashAmount, onlineAmount, bankAmount, reference
    date, notes, receiptGenerated
    
  /expenses/{expenseId}
    title, amount, category, type (onetime/monthly)
    date, isRecurring, description
    
  /stock/{stockId}
    name, type, quantity, condition
    purchaseDate, purchasePrice
    lastServiceDate, serviceIntervalDays
    notes
    
  /visits/{visitId}
    name, phone, source, interestedIn
    visitDate, demoDate, followUpDate
    status (new/demo_done/converted/lost)
    notes, convertedMemberId
    
  /offers/{offerId}
    title, type (percent/flat/free_month/extra_days)
    value, validFrom, validTo, applicablePlans[], description
    
  /inviteTokens/{token}
    whatsappNo, expiresAt, used, createdAt, gymId
    
  /waivers/{waiverId}
    memberId, signatureUrl, signedAt
    clause1Accepted, clause2Accepted, clause3Accepted
    typedName
    
  /notifications/{notifId}
    title, message, type, targetRole, isRead, createdAt
    
  /settings/{doc}
    gymName, tagline, address, phone, email, logo
    workingHours, widgetSettings, waTemplates, notifPrefs

/users/{uid}
  role: "owner" | "trainer" | "member"
  gymId: string
  profileId: string (trainer/member doc ID)
  email, name, createdAt
```

## Environment Variables (.env)
```
VITE_FIREBASE_API_KEY=AIzaSyB8cqhVDzFlD4qHrqitQIP2A_dW_Mc_7wE
VITE_FIREBASE_AUTH_DOMAIN=gym-mangement-df239.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gym-mangement-df239
VITE_FIREBASE_STORAGE_BUCKET=gym-mangement-df239.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=733992687536
VITE_FIREBASE_APP_ID=1:733992687536:web:fca8e22764b961b4ec2875
VITE_FIREBASE_MEASUREMENT_ID=G-RFCDTMECX4
VITE_BASE_URL=http://localhost:5173
```

## Key Features

### Member WhatsApp Link Flow
1. Owner inputs member WhatsApp number
2. System generates unique 32-char token stored in Firestore with 5-min expiry
3. Link: `{BASE_URL}/register/{gymId}/{token}`
4. Owner sends via WhatsApp (wa.me link pre-populated)
5. Member opens link → 5-step registration form
6. On submit: token marked used, member doc created
7. Token auto-expires after 5 minutes regardless

### Multi-Mode Payments
- Cash: direct amount entry
- Online: UPI/QR with transaction ID
- Bank: bank name + reference number
- Mixed: split amounts (e.g., ₹2000 cash + ₹3000 online) with respective IDs

### Liability Waiver (3 clauses)
1. Awareness of health risks and voluntary participation
2. Release from liability for injury/illness during physical activity
3. Disclosure agreement of physical limitations

### Equipment Service Reminders
- Each item has `lastServiceDate` + `serviceIntervalDays`
- Dashboard shows overdue items in red
- 'Log Service' updates date and logs history

## Role Permissions

| Feature | Owner | Trainer | Member |
|---------|-------|---------|--------|
| Full Dashboard | ✅ | ❌ | ❌ |
| All Members | ✅ | ❌ | ❌ |
| Own Members | ✅ | ✅ | ❌ |
| Financial Data | ✅ | ❌ | Own only |
| Reports | ✅ | ❌ | ❌ |
| Staff Mgmt | ✅ | ❌ | ❌ |
| Stock/Equipment | ✅ | ❌ | ❌ |
| Workout Plans | ✅ | ✅ | View only |
| Before/After | ✅ | ✅ | Own only |
| Broadcasts | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | Profile only |
