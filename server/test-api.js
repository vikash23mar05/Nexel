
const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Nexel API Endpoint Tests...\n');

  try {
    const statusRes = await fetch(`${API_BASE}/status`);
    const statusData = await statusRes.json();
    console.log(`✅ [GET /api/status]: HTTP ${statusRes.status}`, statusData);
  } catch (err) {
    console.error('❌ [GET /api/status] Failed. Is the server running on port 5000?', err.message);
    return;
  }

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testUsername = 'testuser';
  let token = null;

  try {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, email: testEmail, password: testPassword }),
    });
    const regData = await regRes.json();
    console.log(`✅ [POST /api/auth/register]: HTTP ${regRes.status}`, regRes.ok ? 'Success (User Created)' : regData);
  } catch (err) {
    console.error('❌ [POST /api/auth/register] Failed:', err.message);
  }

  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    console.log(`✅ [POST /api/auth/login]: HTTP ${loginRes.status}`, loginRes.ok ? 'Success (JWT Issued)' : loginData);
    if (loginRes.ok && loginData.token) {
      token = loginData.token;
    }
  } catch (err) {
    console.error('❌ [POST /api/auth/login] Failed:', err.message);
  }

  if (token) {
    try {
      const docRes = await fetch(`${API_BASE}/documents`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const docData = await docRes.json();
      console.log(`✅ [GET /api/documents (Protected)]: HTTP ${docRes.status} (Total Docs: ${docData.length})`);
    } catch (err) {
      console.error('❌ [GET /api/documents] Failed:', err.message);
    }
  } else {
    console.log('⚠️ Skipping protected route tests since login token wasn\'t obtained.');
  }

  console.log('\n🏁 Tests Completed.');
}

runTests();