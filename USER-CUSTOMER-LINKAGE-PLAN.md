# User-Customer Linkage Implementation Plan

**Date:** 2026-02-11  
**Priority:** HIGH  
**Status:** Planning Complete → Implementation Ready

---

## 🎯 Problem Statement

Currently, the system has:
1. **Users** with roles (ADMIN, STAFF, CUSTOMER)
2. **Customers** as separate entities (for POS/business management)
3. **Orders** that require a `customerId`

**Gap:** When a User with role CUSTOMER tries to checkout, there's no automatic linkage to a Customer record.

---

## 📊 Current Schema Analysis

### User Model
```prisma
model User {
  id         Int      @id @default(autoincrement())
  businessId Int
  name       String
  phone      String   @unique
  email      String?  @unique
  passwordHash String?
  role       Role     // ADMIN, STAFF, CUSTOMER
  ...
}
```

### Customer Model
```prisma
model Customer {
  id              Int @id @default(autoincrement())
  businessId      Int
  createdByUserId Int  // Who created this customer (ADMIN/STAFF)
  name            String
  phone           String
  balance         Int @default(0)
  ...
  
  @@unique([businessId, phone])
}
```

### Order Model
```prisma
model Order {
  id Int @id
  businessId Int
  customerId Int  // Required!
  ...
}
```

---

## 🔧 Solution Options

### Option 1: Add userId to Customer (Recommended)
**Pros:**
- Clean separation of concerns
- Maintains current structure
- Flexible (customers can exist without users)
- One user can have ONE customer record

**Cons:**
- Requires schema migration
- Need to handle existing customers

```prisma
model Customer {
  id              Int @id @default(autoincrement())
  businessId      Int
  createdByUserId Int
  userId          Int? @unique  // NEW: Link to User account
  name            String
  phone           String
  balance         Int @default(0)
  ...
}
```

### Option 2: Find/Create Pattern (Quick Fix)
**Pros:**
- No schema change required
- Can implement immediately
- Works with existing data

**Cons:**
- Relies on phone matching
- Potential duplicates if phone changes
- Less explicit relationship

**Implementation:**
```typescript
// When user checks out:
// 1. Find customer by phone
// 2. If not found, create customer
// 3. Link to order
```

---

## ✅ Recommended Approach: Option 1 + Migration Strategy

### Phase 1: Schema Update
1. Add optional `userId` field to Customer model
2. Add unique constraint (one user = one customer)
3. Create migration
4. Run migration

### Phase 2: Service Layer
1. Create `findOrCreateCustomerForUser()` method
2. Update checkout flow to use this method
3. Add endpoint for users to view "their" customer record

### Phase 3: Frontend Integration
1. Update checkout to call new endpoint
2. Show customer info in profile
3. Display order history

---

## 📝 Implementation Steps

### Step 1: Update Prisma Schema
```prisma
model Customer {
  id              Int      @id @default(autoincrement())
  businessId      Int
  createdByUserId Int
  userId          Int?     @unique  // Add this field
  name            String
  phone           String
  balance         Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  business  Business @relation(fields: [businessId], references: [id])\n  createdBy User     @relation(\"CustomerCreatedBy\", fields: [createdByUserId], references: [id])
  user      User?    @relation(\"UserCustomer\", fields: [userId], references: [id])  // Add this relation
  orders    Order[]
  appointments Appointment[]

  @@unique([businessId, phone])
  @@index([businessId])
  @@index([userId])  // Add this index
}

model User {
  ...
  customerRecord Customer? @relation(\"UserCustomer\")  // Add this relation
  ...
}
```

### Step 2: Create Migration
```bash
npx prisma migrate dev --name add_user_customer_link
```

### Step 3: Add Service Method
```typescript
// In customers.service.ts
async findOrCreateForUser(
  currentUser: JwtPayload
): Promise<CustomerSummary> {
  const businessId = Number(currentUser.businessId);
  const userId = Number(currentUser.userId);

  // Check if user already has a customer record
  let customer = await this.prisma.customer.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
    },
  });

  if (customer) {
    return customer;
  }

  // Get user data
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Create customer record
  customer = await this.prisma.customer.create({
    data: {
      businessId,
      createdByUserId: userId,  // Self-created
      userId,
      name: user.name,
      phone: user.phone,
      balance: 0,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
    },
  });

  return customer;
}
```

### Step 4: Add Controller Endpoint
```typescript
// In customers.controller.ts
@Get('me')
@Roles('CUSTOMER', 'STAFF', 'ADMIN')
@ApiOperation({
  summary: 'Get or create customer record for current user',
  description: 'Returns the customer record linked to the authenticated user. Creates one if it doesn\'t exist.',
})
@ApiOkResponse({ description: 'Customer record for the current user.' })
getMyCustomerRecord(@Req() req: { user: JwtPayload }) {
  return this.customersService.findOrCreateForUser(req.user);
}
```

### Step 5: Update Orders Service
```typescript
// In orders.service.ts - when creating order
async create(currentUser: JwtPayload, payload: CreateOrderDto) {
  let customerId: number;

  if (currentUser.role === 'CUSTOMER') {
    // For CUSTOMER users, find or create their customer record
    const customer = await this.customersService.findOrCreateForUser(currentUser);
    customerId = customer.id;
  } else {
    // For ADMIN/STAFF, they specify the customer
    customerId = payload.customerId;
  }

  // Create order with customerId
  const order = await this.prisma.order.create({
    data: {
      businessId: Number(currentUser.businessId),
      customerId,
      createdByUserId: Number(currentUser.userId),
      statusId: payload.statusId,
      totalAmountCents: payload.totalAmountCents,
      source: OrderSource.WEB,
      notes: payload.notes,
    },
  });

  return order;
}
```

### Step 6: Frontend Integration

#### Update Checkout Service
```typescript
// services/api.ts or checkout service
export const getOrCreateCustomer = async () => {
  const response = await api.get('/customers/me');
  return response.data;
};
```

#### Update Checkout Flow
```typescript
// In checkout page/component
const handleCheckout = async () => {
  try {
    // Ensure customer record exists
    const customer = await getOrCreateCustomer();
    
    // Create order
    const order = await createOrder({
      items: cartItems,
      // customerId is handled by backend based on authenticated user
    });
    
    // Proceed to payment
    router.push(`/orders/${order.id}/payment`);
  } catch (error) {
    toast.error('Checkout failed');
  }
};
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] User with CUSTOMER role can get/create customer record
- [ ] Customer record is created with correct data
- [ ] Subsequent calls return existing customer (no duplicates)
- [ ] Orders are created with correct customerId
- [ ] ADMIN/STAFF can still create customers manually
- [ ] Phone uniqueness is maintained per business

### Frontend Tests
- [ ] Checkout flow works for authenticated users
- [ ] Customer info displayed in profile
- [ ] Order history shows correctly
- [ ] Guest checkout handled (if applicable)
- [ ] Error states displayed properly

### Edge Cases
- [ ] User changes phone number
- [ ] User with existing customer (migration scenario)
- [ ] Concurrent requests (race conditions)
- [ ] Different businesses (multi-tenant)

---

## 🚀 Deployment Plan

### Phase 1: Database
1. Review schema changes
2. Create migration
3. Test migration on dev database
4. Backup production database
5. Run migration on production

### Phase 2: Backend
1. Deploy new service methods
2. Deploy new endpoints
3. Update orders service
4. Monitor logs for errors

### Phase 3: Frontend
1. Deploy checkout updates
2. Test end-to-end flow
3. Monitor checkout completion rates

---

## 📋 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration fails | HIGH | Test thoroughly, have rollback plan |
| Duplicate customers | MEDIUM | Unique constraint on userId, data cleanup script |
| Phone number changes break link | LOW | userId is primary link, phone is secondary |
| Performance impact | LOW | Proper indexing on userId |

---

## 🎯 Success Criteria

1. ✅ CUSTOMER role users can checkout without manual customer creation
2. ✅ No duplicate customer records for same user
3. ✅ Order history displays correctly in user profile
4. ✅ ADMIN/STAFF workflows remain unchanged
5. ✅ Zero downtime deployment
6. ✅ All tests passing

---

## 📚 Documentation Updates Needed

1. API documentation (Swagger)
2. Database schema documentation
3. Developer guide for checkout flow
4. User guide for account/orders

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create Prisma migration** for schema update
3. **Implement service methods** in customers.service.ts
4. **Add controller endpoints** in customers.controller.ts
5. **Update orders service** to use new linkage
6. **Test thoroughly** on development environment
7. **Update frontend** checkout flow
8. **Deploy to staging** for QA
9. **Deploy to production** with monitoring

---

Ready to proceed with implementation? 🚀
