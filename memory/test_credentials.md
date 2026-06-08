# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## Restored 2026-06-08 (all three had been hard-deleted from the User table)
Password for all three: Demo@1234 (bcrypt, 10 rounds)

| Email                              | role  | staffRole          | Dashboard        |
|------------------------------------|-------|--------------------|------------------|
| admin@elios.in                     | ADMIN | —                  | /admin           |
| sourcing.staff@elioswholesale.in   | STAFF | sourcing-logistics | /staff/sourcing  |
| warehouse.staff@elioswholesale.in  | STAFF | warehouse-qc       | /staff/warehouse |

Auth is custom JWT + bcrypt via the Express backend (server/), Prisma model `User`.
NOT Supabase Auth — the Postgres DB is merely hosted on Supabase. To re-create
these users: upsert into the Prisma `User` table (see server/prisma/addStaffUsers.ts
for the staff pattern; that script creates 4 staff, two more than these three).
