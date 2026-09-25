// test/api.test.js
const http = require('http');
const app = require('../src/app');
const database = require('../src/database');
const manager = require('../src/services/discord/tokenManager');

const PORT = 8089;
let server;
let adminPass = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    const isFormData = reqHeaders['Content-Type'] === 'application/x-www-form-urlencoded';
    let payload = '';

    if (body) {
      if (isFormData) {
        payload = new URLSearchParams(body).toString();
      } else {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path,
        headers: reqHeaders,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(resData);
          } catch (e) {
            // Not JSON
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text: resData,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n=============================================');
  console.log('       STARTING VOICE CORD BACKEND TESTS     ');
  console.log('=============================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` \x1b[32m✔\x1b[0m ${message}`);
      passed++;
    } else {
      console.error(` \x1b[31m✖\x1b[0m ${message}`);
      failed++;
    }
  }

  // Backup original tokens before test
  const originalTokens = { ...database.loadTokens() };

  // Start server
  await new Promise((res) => {
    server = app.listen(PORT, '127.0.0.1', res);
  });

  try {
    const config = database.loadConfig();
    adminPass = config.admin_pass;
    const adminUser = config.admin_user;

    // 1. Health check
    {
      const res = await request('GET', '/api/health');
      assert(res.status === 200 && res.json?.status === 'ok', 'GET /api/health returns 200 OK');
    }

    // 2. Static Pages
    {
      const resDash = await request('GET', '/');
      assert(resDash.status === 200 && resDash.text.includes('Voicecord'), 'GET / serves dashboard HTML');

      const resLogin = await request('GET', '/login_page');
      assert(resLogin.status === 200 && resLogin.text.includes('Voicecord'), 'GET /login_page serves login HTML');

      const resCss = await request('GET', '/static/style.css');
      assert(resCss.status === 200 && resCss.text.includes('--blurple'), 'GET /static/style.css serves CSS');
    }

    // 3. Auth Tests
    let token = '';
    {
      // Missing fields
      const resMissing = await request('POST', '/login', {});
      assert(resMissing.status === 400, 'POST /login with missing fields returns 400');

      // Invalid password
      const resInvalid = await request('POST', '/login', { username: adminUser, password: 'wrong_password' });
      assert(resInvalid.status === 400, 'POST /login with invalid password returns 400');

      // Valid login via JSON
      const resValid = await request('POST', '/login', { username: adminUser, password: adminPass });
      assert(resValid.status === 200 && resValid.json?.access_token === adminPass, 'POST /login with JSON credentials returns access_token');
      token = resValid.json?.access_token;

      // Valid login via Form URL-Encoded
      const resForm = await request('POST', '/login', { username: adminUser, password: adminPass }, {
        'Content-Type': 'application/x-www-form-urlencoded'
      });
      assert(resForm.status === 200 && resForm.json?.access_token === adminPass, 'POST /login with Form-Data credentials returns access_token');
    }

    // 4. Unauthorized Access Check
    {
      const resNoAuth = await request('GET', '/api/tokens');
      assert(resNoAuth.status === 401, 'GET /api/tokens without token returns 401');

      const resBadAuth = await request('GET', '/api/tokens', null, { Authorization: 'Bearer bad_token' });
      assert(resBadAuth.status === 401, 'GET /api/tokens with bad token returns 401');
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 5. Token CRUD Operations
    const testTokenKey = 'TEST_DISCORD_TOKEN_12345';
    {
      // Get initial tokens
      const resGet = await request('GET', '/api/tokens', null, authHeaders);
      assert(resGet.status === 200 && typeof resGet.json === 'object', 'GET /api/tokens returns tokens map');

      // Add token
      const resAdd = await request('POST', '/api/tokens', {
        token: testTokenKey,
        config: {
          status: 'online',
          platform: 'pc',
          status_text: 'Testing',
          rpc: { name: 'Minecraft', activity_type: 'playing' },
          voice: { guild_id: '123456789', channel_id: '987654321', self_mute: true }
        }
      }, authHeaders);
      assert(resAdd.status === 200 && resAdd.json?.message === 'Token added successfully', 'POST /api/tokens adds token');

      // Verify token exists
      const resGetAfter = await request('GET', '/api/tokens', null, authHeaders);
      assert(resGetAfter.json && resGetAfter.json[testTokenKey] !== undefined, 'Added token appears in GET /api/tokens');

      // Update token
      const resUpdate = await request('PUT', `/api/tokens/${encodeURIComponent(testTokenKey)}`, {
        new_token: testTokenKey,
        config: {
          status: 'dnd',
          status_text: 'Updated Status',
          rpc: { name: 'VS Code' }
        }
      }, authHeaders);
      assert(resUpdate.status === 200 && resUpdate.json?.message === 'Token updated', 'PUT /api/tokens/:id updates token');

      // Restart token
      const resRestart = await request('POST', `/api/tokens/${encodeURIComponent(testTokenKey)}/restart`, null, authHeaders);
      assert(resRestart.status === 200 && resRestart.json?.message === 'Token restarted', 'POST /api/tokens/:id/restart restarts token');

      // Bulk status update
      const resBulkStatus = await request('POST', '/api/tokens/bulk/status', { status: 'idle' }, authHeaders);
      assert(resBulkStatus.status === 200, 'POST /api/tokens/bulk/status updates all tokens status');

      // Bulk restart
      const resBulkRestart = await request('POST', '/api/tokens/bulk/restart', null, authHeaders);
      assert(resBulkRestart.status === 200, 'POST /api/tokens/bulk/restart restarts all tokens');

      // Bulk disconnect VC
      const resBulkDisc = await request('POST', '/api/tokens/bulk/disconnect-vc', null, authHeaders);
      assert(resBulkDisc.status === 200, 'POST /api/tokens/bulk/disconnect-vc clears all VCs');
    }

    // 6. Voice Operations
    {
      // GET VC states
      const resVc = await request('GET', '/api/vc-states', null, authHeaders);
      assert(resVc.status === 200 && typeof resVc.json === 'object', 'GET /api/vc-states returns VC states');

      // VC Join
      const resJoin = await request('POST', '/api/vc/join', {
        token: testTokenKey,
        guild_id: '123456789',
        channel_id: '987654321',
        self_mute: true,
        self_deaf: true
      }, authHeaders);
      assert(resJoin.status === 200 && resJoin.json?.message === 'Join command sent', 'POST /api/vc/join sends join request');

      // VC Disconnect
      const resDisc = await request('POST', '/api/vc/disconnect', {
        token: testTokenKey,
        guild_id: '123456789'
      }, authHeaders);
      assert(resDisc.status === 200 && resDisc.json?.message === 'Disconnect command sent', 'POST /api/vc/disconnect sends disconnect request');
    }

    // 7. Lookup APIs
    {
      const resGuild = await request('GET', `/api/lookup/guild/${encodeURIComponent(testTokenKey)}/123456789`, null, authHeaders);
      assert(resGuild.status === 200 && resGuild.json?.name !== undefined, 'GET /api/lookup/guild returns guild object');

      const resChannel = await request('GET', `/api/lookup/channel/${encodeURIComponent(testTokenKey)}/987654321`, null, authHeaders);
      assert(resChannel.status === 200 && resChannel.json?.name !== undefined, 'GET /api/lookup/channel returns channel object');
    }

    // 8. Delete Token
    {
      const resDelete = await request('DELETE', `/api/tokens/${encodeURIComponent(testTokenKey)}`, null, authHeaders);
      assert(resDelete.status === 200 && resDelete.json?.message === 'Token deleted', 'DELETE /api/tokens/:id deletes token');

      const resNonExistent = await request('DELETE', `/api/tokens/${encodeURIComponent(testTokenKey)}`, null, authHeaders);
      assert(resNonExistent.status === 404, 'DELETE non-existent token returns 404');
    }

    // 9. 404 Not Found Handling
    {
      const res404 = await request('GET', '/api/some-random-unknown-endpoint');
      assert(res404.status === 404, 'GET unknown route returns 404');
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Restore original tokens
    database.saveTokens(originalTokens);
    await manager.stopAll();
    server.close();
  }

  console.log('\n=============================================');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('=============================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
