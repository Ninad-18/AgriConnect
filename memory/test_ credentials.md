# Test Credentials

## Admin (supplier role)
- Email: admin@agribid.com
- Password: admin123

## Test accounts (create via /api/auth/register or use these if seeded by tester)
- Farmer:  farmer1@test.com / test123  (role: farmer)
- Supplier: supplier1@test.com / test123 (role: supplier)
- Customer: customer1@test.com / test123 (role: customer)

## Auth
- Bearer token auth. Login/Register returns { token, user }.
- Send header: Authorization: Bearer <token>
- Endpoints: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me

## Notes
- Roles: farmer | supplier | customer
- All API routes prefixed with /api
