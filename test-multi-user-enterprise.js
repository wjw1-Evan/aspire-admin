const fs = require('fs');

const API_BASE = 'http://127.0.0.1:15000/apiservice/api';

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = options.headers || {};
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, { ...options, headers });
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            return { success: false, message: 'Invalid JSON response', detail: text, status: response.status };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function runTest() {
    console.log('--- Step 1: System Admin Login ---');
    console.log('Logging in as admin...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password1', autoLogin: false }
    });

    if (!loginRes.success) {
        console.error('FAILED: Admin login failed', loginRes);
        process.exit(1);
    }
    const adminToken = loginRes.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
    console.log('Admin login successful.');

    console.log('\n--- Step 2: Create a unique enterprise ---');
    const companyRes = await request('/company/create', {
        method: 'POST',
        headers: adminHeaders,
        body: { name: `Collaborative Lab ${Date.now().toString().slice(-4)}` }
    });

    if (!companyRes.success) {
        console.error('FAILED: Company creation failed', companyRes);
        process.exit(1);
    }
    const companyId = companyRes.data.id;
    const companyCode = companyRes.data.code;
    console.log(`Company created. ID: ${companyId}, Code: ${companyCode}`);

    console.log('Switching admin context to the new company...');
    await request('/company/switch', {
        method: 'POST',
        headers: adminHeaders,
        body: { targetCompanyId: companyId }
    });

    // Fetch the auto-created Admin role ID for this company
    console.log('Fetching available roles for the new company...');
    const rolesRes = await request('/role', { headers: adminHeaders });
    if (!rolesRes.success) {
        console.error('FAILED: roles fetch failed', rolesRes);
        process.exit(1);
    }
    const adminRole = rolesRes.data.roles.find(r => r.name === '管理员');
    if (!adminRole) {
        console.error('FAILED: could not find "管理员" role', rolesRes.data);
        process.exit(1);
    }
    console.log(`Found Admin Role ID: ${adminRole.id}`);

    console.log('\n--- Step 3: Register and Provision members ---');
    const shortCode = companyCode.slice(-6); // Last 6 chars of company code
    const userProfiles = [
        { username: `u1_${shortCode}`, name: 'Approver One', email: `u1_${shortCode}@example.com`, phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}` },
        { username: `u2_${shortCode}`, name: 'Approver Two', email: `u2_${shortCode}@example.com`, phone: `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}` },
        { username: `s1_${shortCode}`, name: 'Workflow Submitter', email: `s1_${shortCode}@example.com`, phone: `137${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}` }
    ];

    const provisionedUsers = [];
    for (const u of userProfiles) {
        console.log(`Registering user globally: ${u.username}...`);
        const regRes = await request('/auth/register', {
            method: 'POST',
            body: {
                username: u.username,
                password: 'password123',
                email: u.email,
                phoneNumber: u.phone
            }
        });
        // Ignore if already exists (can happen if script is re-run)
        if (!regRes.success && !regRes.message.includes('已存在')) {
            console.warn(`Registration for ${u.username} failed (might already exist):`, regRes);
        }

        console.log(`Adding user to company: ${u.username}...`);
        const addRes = await request('/users', {
            method: 'POST',
            headers: adminHeaders,
            body: {
                username: u.username,
                roleIds: [adminRole.id], // Assign Admin role so they have all permissions
                isActive: true
            }
        });

        if (!addRes.success) {
            console.error(`FAILED: Adding user ${u.username} to company failed:`, JSON.stringify(addRes));
            process.exit(1);
        }
        provisionedUsers.push({ ...u, id: addRes.data.id });
    }

    console.log('\n--- Step 4: Design a sequential double-approval workflow ---');
    // Design a graph: start -> node1 (app1) -> node2 (app2) -> end
    const workflowDef = {
        name: `Sequential Approval ${companyCode}`,
        category: 'Document',
        graph: {
            nodes: [
                { id: 'start', type: 'start', label: 'Start' },
                {
                    id: 'node1',
                    type: 'approval',
                    label: 'First Approval',
                    config: {
                        approval: {
                            type: 'any',
                            approvers: [{ type: 'user', userId: provisionedUsers[0].id }]
                        }
                    }
                },
                {
                    id: 'node2',
                    type: 'approval',
                    label: 'Second Approval',
                    config: {
                        approval: {
                            type: 'any',
                            approvers: [{ type: 'user', userId: provisionedUsers[1].id }]
                        }
                    }
                },
                { id: 'end', type: 'end', label: 'End' }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'node1' },
                { id: 'e2', source: 'node1', target: 'node2' },
                { id: 'e3', source: 'node2', target: 'end' }
            ]
        }
    };

    const designRes = await request('/workflows', {
        method: 'POST',
        headers: adminHeaders,
        body: workflowDef
    });

    if (!designRes.success) {
        console.error('FAILED: Workflow design failed', designRes);
        process.exit(1);
    }
    const defId = designRes.data.id;
    console.log(`Workflow designed. ID: ${defId}`);

    console.log('\n--- Step 5: Start workflow as Submitter ---');
    console.log(`Logging in as ${provisionedUsers[2].username}...`);
    const subLoginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: provisionedUsers[2].username, password: 'password123', autoLogin: false }
    });
    if (!subLoginRes.success) {
        console.error('FAILED: Submitter login failed', subLoginRes);
        process.exit(1);
    }
    const subHeaders = { 'Authorization': `Bearer ${subLoginRes.data.token}` };

    console.log(`Switching context for user ${provisionedUsers[2].username}...`);
    await request('/company/switch', {
        method: 'POST',
        headers: subHeaders,
        body: { targetCompanyId: companyId }
    });

    console.log('Creating document for approval...');
    const docRes = await request('/documents', {
        method: 'POST',
        headers: subHeaders,
        body: { title: `Lab Report ${companyCode}`, content: "Collaboration test document" }
    });
    if (!docRes.success) {
        console.error('FAILED: Document creation failed', docRes);
        process.exit(1);
    }
    const docId = docRes.data.id;
    console.log(`Document created. ID: ${docId}`);

    console.log('Submitting document to start workflow...');
    const startRes = await request(`/documents/${docId}/submit`, {
        method: 'POST',
        headers: subHeaders,
        body: { workflowDefinitionId: defId, variables: { urgency: 'high' } }
    });
    if (!startRes.success) {
        console.error('FAILED: Workflow submission failed', startRes);
        process.exit(1);
    }
    console.log('Workflow instance started successfully.');

    console.log('\n--- Step 6: First Approval (Approver One) ---');
    console.log(`Logging in as ${provisionedUsers[0].username}...`);
    const app1LoginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: provisionedUsers[0].username, password: 'password123', autoLogin: false }
    });
    const app1Headers = { 'Authorization': `Bearer ${app1LoginRes.data.token}` };

    console.log(`Switching context for user ${provisionedUsers[0].username}...`);
    await request('/company/switch', {
        method: 'POST',
        headers: app1Headers,
        body: { targetCompanyId: companyId }
    });

    console.log('Approving at Node 1...');
    const app1Res = await request(`/documents/${docId}/approve`, {
        method: 'POST',
        headers: app1Headers,
        body: { comment: "Looks good to me (First)" }
    });
    if (!app1Res.success) {
        console.error('FAILED: First approval failed', app1Res);
        process.exit(1);
    }
    console.log('Node 1 Approved.');

    console.log('\n--- Step 7: Second Approval (Approver Two) ---');
    console.log(`Logging in as ${provisionedUsers[1].username}...`);
    const app2LoginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: provisionedUsers[1].username, password: 'password123', autoLogin: false }
    });
    const app2Headers = { 'Authorization': `Bearer ${app2LoginRes.data.token}` };

    console.log(`Switching context for user ${provisionedUsers[1].username}...`);
    await request('/company/switch', {
        method: 'POST',
        headers: app2Headers,
        body: { targetCompanyId: companyId }
    });

    console.log('Approving at Node 2...');
    const app2Res = await request(`/documents/${docId}/approve`, {
        method: 'POST',
        headers: app2Headers,
        body: { comment: "Final check passed (Second)" }
    });
    if (!app2Res.success) {
        console.error('FAILED: Second approval failed', app2Res);
        process.exit(1);
    }
    console.log('Node 2 Approved.');

    console.log('\n--- Step 8: Verify Completion ---');
    const finalDocRes = await request(`/documents/${docId}`, { headers: subHeaders });
    const status = finalDocRes.data.document.status;
    console.log(`Document Status: ${status}`);

    if (status === 'approved' || status === 'completed' || finalDocRes.data.workflowInstance.status === 'completed') {
        console.log('\n✅ COLLABORATION TEST PASSED SUCCESSFULLY!');
    } else {
        console.log(`\n❌ TEST COMPLETED BUT STATUS WAS: ${status}`);
        console.log('Workflow Instance Status:', finalDocRes.data.workflowInstance.status);
    }
}

runTest().catch(err => {
    console.error('Unexpected error during test:', err);
    process.exit(1);
});
