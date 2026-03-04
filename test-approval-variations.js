const fs = require('fs');

const API_BASE = 'http://127.0.0.1:15000/apiservice/api';

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = options.headers || {};
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    try {
        const json = JSON.parse(text);
        if (json.success === false) {
            console.error(`  [API ERROR] ${options.method || 'GET'} ${path}: ${json.message || 'Unknown error'}`);
        }
        return json;
    } catch {
        return { success: false, data: text };
    }
}

async function createDefinition(token, definition) {
    const res = await request('/workflows', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: definition
    });
    if (!res.data) {
        throw new Error(`Failed to create definition: ${JSON.stringify(res)}`);
    }
    return res.data.id || res.data;
}

async function startWorkflow(token, definitionId) {
    const docRes = await request('/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { title: "测试公文", content: "这是测试公文的内容..." }
    });
    if (!docRes.data) throw new Error("Failed to create document");
    const docId = docRes.data.id;
    const res = await request(`/workflows/${definitionId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { documentId: docId }
    });
    if (!res.data) throw new Error("Failed to start workflow");
    return res.data.id || res.data;
}

async function getInstance(token, instanceId) {
    const res = await request(`/workflows/instances/${instanceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const instance = res.data;
    // Map numerical status to string
    const statusMap = { 0: 'running', 1: 'completed', 2: 'cancelled', 3: 'rejected' };
    instance.statusIdx = instance.status;
    instance.status = statusMap[instance.status] || instance.status;
    return instance;
}

async function runTests() {
    console.log('1. Logging in as admin...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'admin123', autoLogin: false }
    });

    const token = loginRes.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    const myProfileRes = await request('/auth/current-user', { headers });
    const profile = myProfileRes.data || {};
    const adminId = profile.id;
    let companyId = profile.currentCompanyId;

    // Ensure admin is in the company
    try {
        // First, get a list of companies to ensure companyId is valid if not already set
        if (!companyId) {
            const companiesRes = await request('/company/list', { method: 'POST', headers, body: { page: 1, pageSize: 1 } });
            if (companiesRes.data && companiesRes.data.list && companiesRes.data.list.length > 0) {
                companyId = companiesRes.data.list[0].id;
                console.log(`Setting current company to ${companyId}...`);
                await request('/auth/profile', {
                    method: 'PUT',
                    headers,
                    body: { currentCompanyId: companyId }
                });
            }
        }

        if (companyId) {
            await request('/users', {
                method: 'POST',
                headers,
                body: {
                    userId: adminId,
                    username: 'admin', // Added username
                    roleIds: [],
                    isAdmin: true,
                    companyId: companyId // Explicitly add to the company
                }
            });
            console.log(`Admin added to company ${companyId}`);
        } else {
            console.warn('Could not determine companyId, skipping admin-to-company check.');
        }
    } catch (e) {
        // Might already be in it, or companyId might be null if no companies exist
        console.warn(`Could not add admin to company (might already be in it or no company exists): ${e.message}`);
    }

    console.log(`Current Admin ID: ${adminId}`);
    console.log(`Initial Company ID: ${companyId}`);

    if (!companyId) {
        console.log('No current company, searching for companies...');
        const companiesRes = await request('/company/list', { method: 'POST', headers, body: { page: 1, pageSize: 1 } });
        if (companiesRes.data && companiesRes.data.list && companiesRes.data.list.length > 0) {
            companyId = companiesRes.data.list[0].id;
            console.log(`Setting current company to ${companyId}...`);
            await request('/auth/profile', {
                method: 'PUT',
                headers,
                body: { currentCompanyId: companyId }
            });
        }
    }

    // Discover other users for multi-approver tests
    let allUsersRes = await request('/users/all', { headers });
    let users = allUsersRes.data ? (allUsersRes.data.users || []) : [];
    let otherUser = users.find(u => u.username === 'testuser');

    if (!otherUser) {
        console.log('Creating test user for multi-approver scenarios...');
        // Try global registration first
        const regRes = await request('/auth/register', {
            method: 'POST',
            body: {
                username: 'testuser',
                password: 'testuser123',
                email: 'test@example.com'
            }
        });

        // Then add to company via management API (now it should work since it exists globally)
        const createRes = await request('/users', {
            method: 'POST',
            headers,
            body: {
                username: 'testuser',
                password: 'testuser123',
                email: 'test@example.com',
                isActive: true
            }
        });

        if (createRes.success) {
            otherUser = createRes.data;
            console.log(`Test user created and added to company: ${otherUser.id}`);
        } else {
            // Check if regRes worked even if createRes failed (maybe already added?)
            if (regRes.success) {
                otherUser = regRes.data;
                console.log(`Test user registered globally: ${otherUser.id}`);
            } else {
                console.error('Failed to create test user, will fallback to admin for some tests.');
            }
        }
    }

    let user2Id = otherUser ? otherUser.id : adminId;
    console.log(`User 1 (Admin): ${adminId}`);
    console.log(`User 2: ${user2Id}${otherUser ? '' : ' (FALLBACK TO ADMIN)'}`);

    // Scenario A: Simple Reject
    await runScenarioA(token, adminId, companyId);

    // Scenario B: Return to Node
    await runScenarioB(token, adminId, companyId);

    // Scenario C: Delegate Task
    await runScenarioC(token, adminId, companyId, user2Id);

    // Scenario D: Sequential (Need 2 approvers)
    await runScenarioD(token, adminId, user2Id, companyId);

    // Scenario E: Multisign All (Need 2 approvers)
    await runScenarioE(token, adminId, user2Id, companyId);

    // Scenario F: Or-sign Any
    await runScenarioF(token, adminId, user2Id, companyId);

    console.log('\n--- All Tests Completed ---');
}

async function runScenarioA(token, adminId, companyId) {
    console.log('\n--- Running Scenario A: Simple Reject ---');
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "测试驳回流程",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                { id: "app1", type: "approval", name: "审批节点", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "end" }
            ]
        }
    };

    const defId = await createDefinition(token, definition);
    const instanceId = await startWorkflow(token, defId);
    console.log(`Instance ID: ${instanceId}`);

    const res = await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'reject', comment: '测试驳回' }
    });

    console.log(`  Performing REJECT action on node app1...`);
    if (res.success) {
        console.log(`  Action Result: SUCCESS `);
    } else {
        console.error(`  Action Result: FAILED`, JSON.stringify(res));
    }

    const instance = await getInstance(token, instanceId);
    console.log(`  Final Status: ${instance.status}`);
    if (instance.status === 'rejected') {
        console.log(`  ✅ Status test passed.`);
    } else {
        console.error(`  ❌ Status test FAILED. Expected rejected, got ${instance.status}`);
    }
}

async function runScenarioB(token, adminId, companyId) {
    console.log('\n--- Running Scenario B: Return to Start ---');
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "测试退回流程",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                { id: "app1", type: "approval", name: "第一级审批", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "app2", type: "approval", name: "第二级审批", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "app2" },
                { id: "e3", source: "app2", target: "end" }
            ]
        }
    };

    const defId = await createDefinition(token, definition);
    const instanceId = await startWorkflow(token, defId);
    console.log(`Instance ID: ${instanceId}`);

    // Approve app1 first
    console.log(`  Approving app1 first...`);
    await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'approve' }
    });

    // Return from app2 to start
    console.log(`  Performing RETURN to 'start' from app2...`);
    const res = await request(`/workflows/instances/${instanceId}/nodes/app2/action`, {
        method: 'POST',
        headers,
        body: { action: 'return', targetNodeId: 'start', comment: '退回到开始节点' }
    });

    if (res.success) {
        console.log(`  Action Result: SUCCESS `);
    } else {
        console.error(`  Action Result: FAILED`, JSON.stringify(res));
    }

    const instance = await getInstance(token, instanceId);
    console.log(`  Final Status: ${instance.status}`);
    console.log(`  Current Node: ${instance.currentNodeId}`);

    if (instance.currentNodeId === 'app1') {
        console.log(`  ✅ Node position test passed (Landed on app1).`);
    } else {
        console.error(`  ❌ Node position test FAILED. Expected app1, got ${instance.currentNodeId}`);
    }
}

async function runScenarioC(token, adminId, companyId, user2Id) {
    console.log('\n--- Running Scenario C: Delegate Task ---');
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "测试转办流程",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                { id: "app1", type: "approval", name: "转办审批", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "end" }
            ]
        }
    };

    const defId = await createDefinition(token, definition);
    const instanceId = await startWorkflow(token, defId);
    console.log(`Instance ID: ${instanceId}`);

    console.log(`  Performing DELEGATE to ${user2Id}...`);
    const res = await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'delegate', delegateToUserId: user2Id, comment: '转办任务给 User2' }
    });

    if (res.success) {
        console.log(`  Action Result: SUCCESS `);
    } else {
        console.error(`  Action Result: FAILED`, JSON.stringify(res));
    }

    const instance = await getInstance(token, instanceId);
    console.log(`  Final Status: ${instance.status}`);
    if (instance.status === 'running') {
        console.log(`  ✅ Status test passed.`);
    } else {
        console.error(`  ❌ Status test FAILED. Expected running, got ${instance.status}`);
    }
}

async function runScenarioD(token, adminId, user2Id, companyId) {
    if (adminId === user2Id) {
        console.log('\n--- Skipping Scenario D: Sequential (Need 2 unique users) ---');
        return;
    }
    console.log('\n--- Running Scenario D: Sequential Approval ---');
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "测试串行审批",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                {
                    id: "app1", type: "approval", name: "顺序审批节点", config: {
                        approval: {
                            type: 2,
                            approvers: [
                                { type: 0, userId: adminId },
                                { type: 0, userId: user2Id }
                            ]
                        }
                    }
                },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "end" }
            ]
        }
    };

    const defId = await createDefinition(token, definition);
    const instanceId = await startWorkflow(token, defId);

    console.log(`  First approval by Admin...`);
    const res1 = await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'approve' }
    });
    console.log(`  First action Result: ${res1.success ? 'SUCCESS' : 'FAILED'}, Response: ${JSON.stringify(res1)}`);

    // Log status and approvers
    const afterFirst = await getInstance(token, instanceId);
    console.log(`  Current node after first approval: ${afterFirst.currentNodeId}`);
    console.log(`  Current approvers: ${JSON.stringify(afterFirst.currentApproverIds)}`);
    
    // Fetch real history
    const historyRes = await request(`/workflows/instances/${instanceId}/history`, { headers });
    const history = historyRes.data || [];
    console.log(`  Actual history records count: ${history.length}`);
    if (history.length > 0) {
        const last = history[history.length - 1];
        console.log(`  Last record: Node=${last.nodeId}, Approver=${last.approverId}, Action=${last.action}`);
    }
    
    // Step 2: Admin tries to approve again (should fail)
    if (afterFirst.currentNodeId === 'app1' && afterFirst.currentApproverIds.includes(user2Id)) {
        console.log(`  ✅ Step 1 passed: Still on app1, now waiting for User 2.`);
    } else {
        console.error(`  ❌ Step 1 FAILED.`);
    }

    console.log(`  Waiting for 2 seconds before second approval...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`  Admin trying to approve again (should fail)...`);
    const failRes = await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'approve' }
    });

    if (!failRes.success) {
        console.log(`  ✅ Step 2 passed: Admin blocked from duplicate approval.`);
    } else {
        console.error(`  ❌ Step 2 FAILED: Admin allowed to approve again!`);
        console.error(`  Response: ${JSON.stringify(failRes)}`);
    }
}

async function runScenarioE(token, adminId, user2Id, companyId) {
    if (adminId === user2Id) {
        console.log('\n--- Skipping Scenario E: Multisign All (Need 2 unique users) ---');
        return;
    }
    console.log('\n--- Running Scenario E: Multisign (All) ---');
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "测试会签流程",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                {
                    id: "app1", type: "approval", name: "会签节点", config: {
                        approval: {
                            type: 0,
                            approvers: [
                                { type: 0, userId: adminId },
                                { type: 0, userId: user2Id }
                            ]
                        }
                    }
                },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "end" }
            ]
        }
    };

    const defId = await createDefinition(token, definition);
    const instanceId = await startWorkflow(token, defId);

    console.log(`  First approval by Admin...`);
    await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'approve' }
    });

    let instance = await getInstance(token, instanceId);
    if (instance.currentNodeId === 'app1') {
        console.log(`  ✅ Passed: Still on app1 (Waiting for others).`);
    } else {
        console.error(`  ❌ FAILED: Moved prematurely.`);
    }
}

async function runScenarioF(token, adminId, user2Id, companyId) {
    console.log('\n--- Running Scenario F: Or-sign (Any) ---');
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "测试或签流程",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                {
                    id: "app1", type: "approval", name: "或签节点", config: {
                        approval: {
                            type: 1,
                            approvers: [
                                { type: 0, userId: adminId },
                                { type: 0, userId: user2Id }
                            ]
                        }
                    }
                },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "end" }
            ]
        }
    };

    const defId = await createDefinition(token, definition);
    const instanceId = await startWorkflow(token, defId);

    console.log(`  Approval by Admin...`);
    await request(`/workflows/instances/${instanceId}/nodes/app1/action`, {
        method: 'POST',
        headers,
        body: { action: 'approve' }
    });

    let instance = await getInstance(token, instanceId);
    if (instance.currentNodeId === 'end') {
        console.log(`  ✅ Passed: Moved to end after one approval.`);
    } else {
        console.error(`  ❌ FAILED: Still on ${instance.currentNodeId}`);
    }
}

runTests().catch(console.error);
