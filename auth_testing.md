# Auth-Gated App Testing Playbook (Emergent Google Auth + email/password)

Email/password accounts (preferred for automated testing):
- Admin: admin@collegepredict.ai / Admin@123
- Student: student@demo.com / Student@123
POST /api/auth/login returns {"user":..., "token":...} and sets httpOnly cookie `session_token`.
Protected APIs accept either the cookie or `Authorization: Bearer <token>`.

Step 1 (Google-auth simulation, only if needed): Create Test User & Session
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', role: 'student', provider: 'google', onboarded: false, plan: 'free', created_at: new Date().toISOString() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(), created_at: new Date().toISOString() });
print('Session token: ' + sessionToken);
"

Step 2: curl -H "Authorization: Bearer <token>" $API/api/auth/me

Step 3: Browser — add cookie {name: session_token, value, domain: <app host>, path: /, httpOnly: true, secure: true, sameSite: None} then goto app.
