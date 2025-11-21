# Seeder Maintenance Guide

## 📋 Overview

The unified seeder is designed to be **low-maintenance** with automatic schema synchronization. However, certain changes require attention.

---

## 🔄 When Service Schemas Change

### User Service (Prisma/PostgreSQL)

**What happens when `services/user-service/prisma/schema.prisma` changes:**

1. ✅ **Automatically handled by CI/CD**
   - GitHub Actions detects Prisma schema changes
   - Dockerfile copies updated schema at build time
   - `npx prisma generate` runs with new schema
   - New seeder image built and pushed

2. ⚠️ **Manual updates needed IF:**
   - Field names change (update `seedUsers()` in seed.js)
   - Field types change (update dataset.json format)
   - Relations change (update seeding logic)

**Example: Adding a new field to User**

```prisma
model User {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  // NEW FIELD:
  phoneNumber String?
}
```

**Update seeder:**
```javascript
// services/seeder/seed.js - seedUsers() function
// No changes needed if field is optional!
// Just add to dataset.json if you want to seed it:
```

```json
// seed-data/dataset.json
{
  "users": [
    {
      "key": "emma-rodriguez",
      "name": "Emma Rodriguez",
      "email": "emma.rodriguez@example.com",
      "phoneNumber": "+1-555-0123"  // NEW
    }
  ]
}
```

### Itinerary Service (Prisma/PostgreSQL)

**Same process as User Service.**

**Common changes:**
- Adding fields to Itinerary model
- Adding fields to Location model
- Changing relations (rare, requires seeder logic update)

### Social Service (MongoDB/Mongoose)

**What happens when schemas change:**

1. ❌ **NOT automatically handled** (no code generation)
2. ⚠️ **REQUIRES MANUAL UPDATE** to seed.js

**Field Naming Convention: CRITICAL!**

MongoDB uses **camelCase** (enforced by Mongoose/NestJS):
```typescript
// Comment Schema (correct)
userId: string       // NOT user_id
itineraryId: string  // NOT itinerary_id
text: string         // NOT content
createdAt: Date      // NOT created_at
updatedAt: Date      // NOT updated_at

// Like Schema (correct)
userId: string       // NOT user_id
itineraryId: string  // NOT itinerary_id
createdAt: Date      // NOT created_at
```

**WRONG (snake_case) - DO NOT USE:**
```javascript
await db.collection('comments').insertOne({
  user_id: userId,           // ❌ WRONG
  itinerary_id: itineraryId, // ❌ WRONG
  content: comment.text,     // ❌ WRONG
});
```

**CORRECT (camelCase):**
```javascript
await db.collection('comments').insertOne({
  userId: userId,            // ✅ CORRECT
  itineraryId: itineraryId,  // ✅ CORRECT
  text: comment.text,        // ✅ CORRECT
  createdAt: new Date(),     // ✅ CORRECT
  updatedAt: new Date(),     // ✅ CORRECT
});
```

---

## 🧪 Testing Schema Changes

### Local Testing Workflow

```bash
# 1. Make schema changes in service
cd services/user-service
npx prisma migrate dev --name add_phone_number
npx prisma generate

# 2. Update seeder if field mappings changed
cd ../seeder
# Edit seed.js if needed

# 3. Update seed data
cd ../../seed-data
# Edit dataset.json

# 4. Test seeding locally
cd ../services/seeder
npm run seed

# 5. Verify data was seeded correctly
# PostgreSQL:
psql "$USER_DATABASE_URL" -c "SELECT * FROM \"User\" LIMIT 1;"

# MongoDB:
mongosh "$SOCIAL_MONGODB_URI" --eval "db.comments.findOne()"
```

### Container Testing

```bash
# Build seeder image locally
docker build -f services/seeder/Dockerfile -t seeder-test .

# Run with local databases
docker run --rm \
  --network host \
  -e USER_DATABASE_URL="postgresql://appuser:devpass123@localhost:5433/users_db" \
  -e ITINERARY_DATABASE_URL="postgresql://appuser:devpass123@localhost:5434/itineraries_db" \
  -e SOCIAL_MONGODB_URI="mongodb://admin:mongopass123@localhost:27017/social_db" \
  seeder-test
```

---

## 🚨 Common Pitfalls & Solutions

### Issue 1: Field Name Mismatches (MongoDB)

**Symptom:**
```
✅ Created 4 comments and 11 likes
# But social-service can't find them!
db.comments.countDocuments({ itineraryId: 1 }) // returns 0
```

**Cause:** Field names don't match schema
```javascript
// Seeder inserted:
{ user_id: 1, itinerary_id: 1, content: "Great!" }

// Service expects:
{ userId: 1, itineraryId: 1, text: "Great!" }
```

**Solution:** Update seed.js to use **exact field names** from schema

### Issue 2: Prisma Client Generation Missing

**Symptom:**
```
Error: Cannot find module '../user-service/node_modules/.prisma/client'
```

**Cause:** Prisma client not generated in service directories

**Solution:**
```bash
cd services/user-service && npx prisma generate
cd services/itinerary-service && npx prisma generate
```

### Issue 3: Dataset Path Not Found (Local)

**Symptom:**
```
ENOENT: no such file or directory, open '/app/seed-data/dataset.json'
```

**Cause:** Running locally but path resolver tries container path first

**Solution:** This is now fixed! Path resolver automatically falls back to local path.

If still failing:
```bash
# Set explicit path
export SEED_DATA_PATH="$(pwd)/seed-data/dataset.json"
cd services/seeder && npm run seed
```

---

## 📊 Checklist: Making Schema Changes

### User/Itinerary Service (Prisma)

- [ ] Update schema in `services/{service}/prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name your_migration`
- [ ] Run `npx prisma generate`
- [ ] Update `seed.js` if field names/types changed
- [ ] Update `dataset.json` with new fields (if applicable)
- [ ] Test locally: `cd services/seeder && npm run seed`
- [ ] Verify data: `psql` or query via service API
- [ ] Commit and push (CI/CD rebuilds seeder automatically)
- [ ] Re-run seeding job in Kubernetes

### Social Service (MongoDB)

- [ ] Update schema in `services/social-service/src/schemas/*.schema.ts`
- [ ] **CRITICAL:** Match field names exactly in `seed.js`
- [ ] Update `dataset.json` if structure changed
- [ ] Test locally: `cd services/seeder && npm run seed`
- [ ] Verify data: `mongosh` or query via service API
- [ ] Commit and push (seeder image needs rebuild)
- [ ] Re-run seeding job in Kubernetes

---

## 🔐 Security Considerations

### Never Commit:

❌ Actual database credentials  
❌ Production database URLs  
❌ Real user passwords (use bcrypt hashes if needed)  

### Safe to Commit:

✅ Seed data with fake/example values  
✅ Example environment variables (`.env.example`)  
✅ Test credentials clearly marked as development-only  

---

## 🎯 Best Practices

1. **Test locally before pushing**
   - Always run `npm run seed` locally after schema changes
   - Verify data appears correctly in databases

2. **Use meaningful seed data**
   - Real-world-like data helps catch edge cases
   - Include edge cases (null values, empty strings, max lengths)

3. **Keep seed data in sync with schemas**
   - Review dataset.json after any schema change
   - Add new fields with reasonable defaults

4. **Document breaking changes**
   - If seeder logic changes significantly, update README.md
   - If dataset.json format changes, document migration path

5. **CI/CD is your friend**
   - Trust the automation for Prisma schemas
   - Only manual updates needed for MongoDB or logic changes

---

## 📞 Need Help?

If you encounter issues not covered here:

1. Check logs: `kubectl logs job/cloudappdev-seeder`
2. Verify schemas match: Compare service schemas with seed.js
3. Test locally first: Isolate whether it's a local or Kubernetes issue
4. Check CI/CD: Review GitHub Actions logs

**Common Debug Commands:**

```bash
# PostgreSQL: Check if data exists
psql "$USER_DATABASE_URL" -c "SELECT COUNT(*) FROM \"User\";"

# MongoDB: Check collections
mongosh "$SOCIAL_MONGODB_URI" --eval "db.getCollectionNames()"
mongosh "$SOCIAL_MONGODB_URI" --eval "db.comments.find().pretty()"

# Kubernetes: Check seeder logs
kubectl logs job/cloudappdev-seeder --tail=50

# Kubernetes: Describe job for events
kubectl describe job cloudappdev-seeder
```

---

## 📚 Related Documentation

- **QUICKSTART.md** - Local testing and deployment
- **README.md** - Architecture and overview
- **SEEDING_FINAL.md** (repo root) - Comprehensive implementation guide
- **`.github/workflows/build-and-push-seeder.yml`** - CI/CD automation

---

**Last Updated:** 2025-11-21  
**Version:** 1.1 (Fixed MongoDB field names)
