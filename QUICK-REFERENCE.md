# Quick Reference - Nutopiano Updates

## 🚀 Quick Start

### Check Servers
```bash
# Frontend (should be on port 3000)
curl http://localhost:3000

# Backend (should be on port 3001)
curl http://localhost:3001/api
```

### Both Running?
- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:3001
- ✅ API Docs: http://localhost:3001/docs

---

## 🎨 New Design System Tokens

### Usage in Components
```tsx
// Before
className="bg-[#1A3C34] text-[#C5A059] shadow-md"

// After
className="bg-[var(--primary-800)] text-[var(--accent-600)] shadow-[var(--shadow-md)]"
```

### Available Variables
- Colors: `--primary-{50-950}`, `--accent-{100-900}`, `--neutral-{50-950}`
- Spacing: `--spacing-{xs|sm|md|lg|xl|2xl|3xl|4xl}`
- Shadows: `--shadow-{xs|sm|md|lg|xl|2xl}`
- Radius: `--radius-{sm|md|lg|xl|2xl|3xl|full}`
- Transitions: `--transition-{fast|base|slow|slower}`

---

## 🔗 User-Customer Linkage

### Backend Endpoint
```bash
GET /api/customers/me
Authorization: Bearer <token>

# Returns or creates customer record for authenticated user
```

### Frontend Usage
```typescript
import api from '@/services/api';

// In checkout flow
const customer = await api.get('/api/customers/me');
const customerId = customer.data.id;

// Use customerId for order creation
```

### How It Works
1. User authenticates and gets JWT
2. On checkout, call `/api/customers/me`
3. Backend checks if user has linked customer record
4. If not, creates customer with user's data
5. Returns customer (existing or new)
6. Use customer.id for order creation

---

## 📁 Key Files Modified

### Frontend
- `src/app/globals.css` - Design system
- `src/components/Header.tsx` - Enhanced header
- `src/components/ProductCard.tsx` - Improved product cards

### Backend
- `prisma/schema.prisma` - Added userId to Customer
- `src/modules/customers/customers.service.ts` - Added findOrCreateForUser()
- `src/modules/customers/customers.controller.ts` - Added GET /me
- `.env` - Added PORT=3001

---

## 🧪 Quick Tests

### Test Customer Endpoint
```bash
# Login first
POST http://localhost:3001/api/auth/login
{
  "phone": "your_phone",
  "password": "your_password"
}

# Get token from response, then:
GET http://localhost:3001/api/customers/me
Authorization: Bearer <your_token>

# Should return customer object
```

### Test Design System
1. Open http://localhost:3000
2. Check if header has backdrop blur
3. Hover over product cards - should lift and show shadow
4. Check cart badge - should have gold background
5. Search bar should expand smoothly

---

## 📋 Next Steps

### Frontend Integration
1. Update checkout page to call `/api/customers/me`
2. Store customer data in state/context
3. Pass customerId when creating order
4. Display customer info in profile
5. Show order history

### Testing
1. Test complete checkout flow
2. Verify customer is created correctly
3. Check order is linked to customer
4. Test on multiple browsers
5. Mobile testing

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Regenerate Prisma client
cd backend
npx prisma generate

# Restart server
npm run start:dev
```

### Frontend Looks Wrong
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors

### Migration Issues
```bash
# Reset database (DEV ONLY!)
cd backend
npx prisma migrate reset

# Apply migrations
npx prisma migrate deploy
```

---

## 📚 Documentation

- `UI-IMPROVEMENTS.md` - Detailed UI analysis and improvements
- `IMPLEMENTATION-SUMMARY.md` - Implementation details
- `USER-CUSTOMER-LINKAGE-PLAN.md` - Linkage architecture
- `SESSION-SUMMARY.md` - Complete session summary
- `QUICK-REFERENCE.md` - This file

---

## 🎯 Success Checklist

- [ ] Both servers running
- [ ] Design system tokens working
- [ ] Header has backdrop blur
- [ ] Product cards have hover effects
- [ ] Stock badges showing correctly
- [ ] `/api/customers/me` endpoint works
- [ ] Customer creation tested
- [ ] Migration applied successfully
- [ ] No TypeScript errors
- [ ] No console errors

---

## 💡 Quick Tips

### Design System
- Use CSS variables for all colors, never hex codes
- Use design tokens for spacing, shadows, and radius
- Check `globals.css` for all available variables

### API Integration
- Always check if user is authenticated before calling `/me`
- Handle 404 errors gracefully
- Customer creation is automatic, don't need to manually create

### Performance
- Transitions use GPU-accelerated properties
- Images are optimized through Next.js
- Shadows are optimized for rendering

---

**Current Status:** ✅ All systems operational  
**Backend:** http://localhost:3001  
**Frontend:** http://localhost:3000  
**Last Updated:** 2026-02-11 16:10
