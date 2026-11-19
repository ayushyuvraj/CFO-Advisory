// Automated verification script for Persona Dashboard Access Guard
// Tests Port 3000 (master)

async function testPort(port) {
  console.log(`\n========================================`);
  console.log(`Testing Server on Port ${port}...`);
  console.log(`========================================`);

  const baseUrl = `http://localhost:${port}`;

  // Helper to login client persona
  async function loginClient(email, passcode) {
    const res = await fetch(`${baseUrl}/api/auth/client-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passcode }),
    });
    const cookie = res.headers.get('set-cookie');
    const data = await res.json().catch(() => ({}));
    return { status: res.status, cookie, user: data.user };
  }

  // Helper to login KPMG Admin
  async function loginKpmg() {
    const res = await fetch(`${baseUrl}/api/auth/kpmg-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kpmg.lead@kpmg.com', passcode: 'KPMG#Lead2026!' }),
    });
    const cookie = res.headers.get('set-cookie');
    return { status: res.status, cookie };
  }

  // 1. Test admin@apex.com (canManageDashboards: false)
  console.log('1. Testing admin@apex.com (canManageDashboards: false)...');
  const apex = await loginClient('admin@apex.com', 'apex@123');
  if (apex.status !== 200 || !apex.cookie) {
    throw new Error(`Failed to log in as admin@apex.com: ${apex.status}`);
  }
  console.log('   - Logged in successfully. Permissions:', apex.user?.permissions);

  const apexDashRes = await fetch(`${baseUrl}/api/dashboards`, {
    headers: { Cookie: apex.cookie },
  });
  console.log(`   - GET /api/dashboards status: ${apexDashRes.status} (expected 403)`);
  if (apexDashRes.status !== 403) {
    throw new Error(`Expected 403 for admin@apex.com /api/dashboards, got ${apexDashRes.status}`);
  }

  const apexDataRes = await fetch(`${baseUrl}/api/dashboards/datasets`, {
    headers: { Cookie: apex.cookie },
  });
  console.log(`   - GET /api/dashboards/datasets status: ${apexDataRes.status} (expected 403)`);
  if (apexDataRes.status !== 403) {
    throw new Error(`Expected 403 for admin@apex.com /api/dashboards/datasets, got ${apexDataRes.status}`);
  }

  // 2. Test cfo@abc.com (canManageDashboards: false)
  console.log('2. Testing cfo@abc.com (canManageDashboards: false)...');
  const abc = await loginClient('cfo@abc.com', 'abcl@123');
  if (abc.status !== 200 || !abc.cookie) {
    throw new Error(`Failed to log in as cfo@abc.com: ${abc.status}`);
  }
  const abcDashRes = await fetch(`${baseUrl}/api/dashboards`, {
    headers: { Cookie: abc.cookie },
  });
  console.log(`   - GET /api/dashboards status: ${abcDashRes.status} (expected 403)`);
  if (abcDashRes.status !== 403) {
    throw new Error(`Expected 403 for cfo@abc.com /api/dashboards, got ${abcDashRes.status}`);
  }

  // 3. Test cfo@xyz.com (cro xyz, canManageDashboards: true)
  console.log('3. Testing cfo@xyz.com (canManageDashboards: true)...');
  const xyz = await loginClient('cfo@xyz.com', 'CFO@123');
  if (xyz.status !== 200 || !xyz.cookie) {
    throw new Error(`Failed to log in as cfo@xyz.com: ${xyz.status}`);
  }
  const xyzDashRes = await fetch(`${baseUrl}/api/dashboards`, {
    headers: { Cookie: xyz.cookie },
  });
  console.log(`   - GET /api/dashboards status: ${xyzDashRes.status} (expected 200)`);
  if (xyzDashRes.status !== 200) {
    throw new Error(`Expected 200 for cfo@xyz.com /api/dashboards, got ${xyzDashRes.status}`);
  }
  const xyzDataRes = await fetch(`${baseUrl}/api/dashboards/datasets`, {
    headers: { Cookie: xyz.cookie },
  });
  console.log(`   - GET /api/dashboards/datasets status: ${xyzDataRes.status} (expected 200)`);
  if (xyzDataRes.status !== 200) {
    throw new Error(`Expected 200 for cfo@xyz.com /api/dashboards/datasets, got ${xyzDataRes.status}`);
  }

  // 4. Test KPMG Lead
  console.log('4. Testing KPMG Lead (Full access)...');
  const kpmg = await loginKpmg();
  const kpmgDashRes = await fetch(`${baseUrl}/api/dashboards`, {
    headers: { Cookie: kpmg.cookie },
  });
  console.log(`   - GET /api/dashboards status: ${kpmgDashRes.status} (expected 200)`);
  if (kpmgDashRes.status !== 200) {
    throw new Error(`Expected 200 for KPMG Lead /api/dashboards, got ${kpmgDashRes.status}`);
  }

  console.log(`[PASS] Server on Port ${port} verified successfully.`);
}

async function main() {
  await testPort(3000);
  console.log('\n========================================');
  console.log('ALL API SECURITY GATES PASSED (Port 3000)');
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('\n[FAIL]', err.message);
  process.exit(1);
});
