const http = require('http');

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const bodyContent = options.body ? JSON.stringify(options.body) : null;
        const req = http.request({
            hostname: 'localhost',
            port: 15000,
            path: '/apiservice/api' + path,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(bodyContent ? { 'Content-Length': Buffer.byteLength(bodyContent) } : {}),
                ...options.headers
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        if (bodyContent) req.write(bodyContent);
        req.end();
    });
}

(async () => {
    try {
        const login = await request('/auth/login', { method: 'POST', body: { username: 'admin', password: 'password1' } });
        if (!login.success) {
            console.error('Login failed:', login);
            return;
        }
        const headers = { 'Authorization': 'Bearer ' + login.data.token };

        const wfRes = await request('/workflows/instances?skip=0&take=1', { headers });
        const wf = wfRes.data.list[0];
        console.log('Instance ID:', wf.id);

        const pendingRes = await request('/workflows/pending-approvals?skip=0&take=10', { headers });
        console.log('Pending Approvals:', JSON.stringify(pendingRes.data, null, 2));

        const historyRes = await request('/workflows/' + wf.id + '/history', { headers });
        console.log('WF History:', JSON.stringify(historyRes.data, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
