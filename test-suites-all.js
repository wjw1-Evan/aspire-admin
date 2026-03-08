const fs = require('fs');
const { spawn } = require('child_process');

/**
 * --- Aspire Admin Unified API Test Suite ---
 * Consolidates: 运行测试并检查后端有没有异常
 * - test-workflows.js (Synergy)
 * - test-workflow-all-nodes.js (All-Components)
 * - test-workflow-design.js (Design/Validation)
 * - test-multi-user-enterprise.js (Multi-User)
 * - test-approval-variations.js (Approval Logic)
 * - test-workflow-debug.js (Parallel/Join)
 */

const API_BASE = 'http://127.0.0.1:15000/apiservice/api';

// --- Common Utilities ---

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = options.headers || {};
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
    }

    try {
        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch {
            json = { success: res.status < 400, data: text };
        }
        return { status: res.status, success: json.success !== false && res.status < 400, ...json };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

const Auth = {
    token: '',
    userId: '',
    tenantId: '',
    headers: {},

    async login(username = 'admin', password = 'admin123') {
        console.log(`Locking in as ${username}...`);
        const res = await request('/auth/login', {
            method: 'POST',
            body: { username, password, autoLogin: false }
        });
        if (!res.success) throw new Error(`Login failed for ${username}: ${res.message || JSON.stringify(res)}`);
        
        this.token = res.data.token;
        this.headers = { 'Authorization': `Bearer ${this.token}` };
        
        const userRes = await request('/auth/current-user', { headers: this.headers });
        this.userId = userRes.data.id;
        this.tenantId = userRes.data.currentCompanyId;
        console.log(`Logged in. UserID: ${this.userId}, TenantID: ${this.tenantId}`);
        return res;
    },

    async switchCompany(companyId) {
        const res = await request('/company/switch', {
            method: 'POST',
            headers: this.headers,
            body: { targetCompanyId: companyId }
        });
        if (res.success) {
            this.tenantId = companyId;
            console.log(`Switched to company: ${companyId}`);
        }
        return res;
    }
};

/** 将 API 返回的 variables（数组或对象）转为 key-value 对象 */
function varsToObj(vars) {
    if (!vars) return {};
    if (Array.isArray(vars)) {
        const obj = {};
        for (const e of vars) {
            if (e && e.key != null) {
                try { obj[e.key] = (e.valueJson != null || e.value != null) ? JSON.parse(e.valueJson ?? e.value ?? 'null') : undefined; } catch { obj[e.key] = e.valueJson ?? e.value; }
            }
        }
        return obj;
    }
    return typeof vars === 'object' ? vars : {};
}

const Utils = {
    async createCompany(name) {
        console.log(`Creating company: ${name}...`);
        const res = await request('/company/create', {
            method: 'POST',
            headers: Auth.headers,
            body: { name }
        });
        if (!res.success) throw new Error(`Failed to create company: ${res.message}`);
        console.log(`Company created. ID: ${res.data.id}, Code: ${res.data.code}`);
        return res.data;
    },

    async registerUser(username, roleName) {
        const password = 'Password123!';
        const email = `${username}@example.com`;
        const phone = '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        process.stdout.write(`Registering user ${username} (phone: ${phone})... `);
        const res = await request('/auth/register', {
            method: 'POST',
            body: { username, password, email, phoneNumber: phone }
        });
        if (!res.success) {
            console.log(`❌ Error: ${res.message || JSON.stringify(res)}`);
            return null;
        }
        console.log("Done");
        return { username, password, userId: res.data.id || res.data };
    },

    async createForm(name, fields = []) {
        console.log(`Creating form definition: ${name}...`);
        const res = await request('/forms', {
            method: 'POST',
            headers: Auth.headers,
            body: { name, key: `form_${Date.now()}`, fields }
        });
        if (!res.success) throw new Error(`Failed to create form: ${res.message}`);
        console.log(`Form created. ID: ${res.data.id}`);
        return res.data;
    },

    async submitNodeForm(instanceId, nodeId, values) {
        process.stdout.write(`  Submitting form for node ${nodeId}... `);
        const res = await request(`/workflows/instances/${instanceId}/nodes/${nodeId}/form`, {
            method: 'POST',
            headers: Auth.headers,
            body: values
        });
        if (!res.success) {
            console.log(`❌ Error: ${res.message}`);
            return res;
        }
        console.log("Done");
        return res;
    },

    async waitForInstanceStatus(instanceId, expectedStatus, maxRetries = 180) {
        for (let i = 0; i < maxRetries; i++) {
            const res = await request(`/workflows/instances/${instanceId}`, { headers: Auth.headers });
            if (res.success) {
                const currentStatus = res.data.status.toLowerCase();
                const targetStatus = expectedStatus.toString().toLowerCase();
                if (currentStatus === targetStatus || 
                    (targetStatus === 'running' && currentStatus === 'completed') ||
                    (targetStatus === '1' && currentStatus === 'completed') ||
                    (targetStatus === 'completed' && currentStatus === '1')) {
                    return res.data;
                }
                if (currentStatus === 'rejected' || currentStatus === 'cancelled' || currentStatus === 'failed') {
                    if (currentStatus !== targetStatus) {
                        throw new Error(`Workflow failed/terminated: ${res.data.status}`);
                    }
                }
            }
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 2000));
        }
        throw new Error(`Timeout waiting for workflow instance ${instanceId} status ${expectedStatus}`);
    },

    async waitForDocumentStatus(docId, expectedStatus, maxRetries = 60) {
        for (let i = 0; i < maxRetries; i++) {
            const res = await request(`/documents/${docId}`, { headers: Auth.headers });
            if (res.success && res.data.document.status === expectedStatus) return res.data;
            process.stdout.write(".");
            await new Promise(r => setTimeout(r, 2000));
        }
        throw new Error(`Timeout waiting for document ${docId} status ${expectedStatus}`);
    }
};

// --- Test Suites (L0 → L6: 从基础到应用) ---

/**
 * [L0] 用户注册测试 (Register)
 * 注册 → 登录 → 用户信息验证 → 重复注册拦截
 */
async function runRegisterTests() {
    console.log('\n=== RUNNING USER REGISTRATION TESTS ===');

    const ts = Date.now().toString().slice(-6);
    const username = `testuser_${ts}`;
    const password = 'Password123!';
    const email = `${username}@example.com`;
    const phone = '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

    // 1. 注册新用户
    console.log(`- Registering user: ${username}...`);
    const regRes = await request('/auth/register', {
        method: 'POST',
        body: { username, password, email, phoneNumber: phone }
    });
    if (!regRes.success) throw new Error(`Registration failed: ${regRes.message || JSON.stringify(regRes)}`);
    const userId = regRes.data.id || regRes.data;
    console.log(`  ✅ Registered. UserID: ${userId}`);

    // 2. 用新用户登录
    console.log('- Logging in with new user...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: { username, password, autoLogin: false }
    });
    if (!loginRes.success) throw new Error(`Login failed: ${loginRes.message}`);
    console.log('  ✅ Login successful.');

    // 3. 获取当前用户信息
    const userHeaders = { 'Authorization': `Bearer ${loginRes.data.token}` };
    const meRes = await request('/auth/current-user', { headers: userHeaders });
    if (!meRes.success) throw new Error(`Get current-user failed: ${meRes.message}`);
    const match = meRes.data.username === username || meRes.data.userName === username;
    console.log(`  ${match ? '✅' : '❌'} current-user.username === '${username}'`);

    // 4. 重复注册应失败
    console.log('- Testing duplicate registration...');
    const dupRes = await request('/auth/register', {
        method: 'POST',
        body: { username, password, email, phoneNumber: phone }
    });
    console.log(`  ${!dupRes.success ? '✅ Duplicate rejected' : '❌ Duplicate NOT rejected'}: ${dupRes.message || ''}`);
}

/**
 * [L2] 原子节点能力验证 (Atomic Nodes)
 * IO / HTTP / SetVar / Log / Timer / Answer
 */
async function runAtomicNodeTests() {
    console.log('\n=== RUNNING ATOMIC NODE TESTS ===');
    const nodesToTest = [
        { 
            name: "HTTP & Variable", 
            nodes: [
                { id: "h", type: "httpRequest", data: { nodeType: "httpRequest", config: { http: { method: "GET", url: "https://httpbin.org/get", outputVariable: "res" } } } },
                { id: "s", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "v", value: "Code: {{res.headers.Host}}" } } } }
            ],
            edges: [{ source: "start", target: "h" }, { source: "h", target: "s" }, { source: "s", target: "end" }]
        },
        {
            name: "Answer & Timer",
            nodes: [
                { id: "t", type: "timer", data: { nodeType: "timer", config: { timer: { waitDuration: "00:00:01" } } } },
                { id: "a", type: "answer", data: { nodeType: "answer", config: { answer: { answer: "Timer done!" } } } }
            ],
            edges: [{ source: "start", target: "t" }, { source: "t", target: "a" }, { source: "a", target: "end" }]
        }
    ];

    for (const test of nodesToTest) {
        console.log(`- Testing scenario: ${test.name}`);
        const workflowDef = {
            name: `Atomic: ${test.name}`,
            isActive: true,
            graph: {
                nodes: [{ id: "start", type: "start", data: { nodeType: "start" } }, ...test.nodes, { id: "end", type: "end", data: { nodeType: "end" } }],
                edges: test.edges.map((e, idx) => ({ id: `e${idx}`, ...e, sourceHandle: "source", data: { condition: "" } }))
            }
        };

        const createRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
        if (!createRes.success) {
            console.error(`  ❌ Failed to create workflow: ${createRes.message}`);
            console.error(`  Details: ${JSON.stringify(createRes.errors || createRes.data)}`);
            throw new Error("Workflow creation failed");
        }
        const defId = createRes.data.id;
        const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: {} });
        if (!startRes.success) {
            console.error(`  ❌ Failed to start workflow: ${startRes.message}`);
            throw new Error("Workflow start failed");
        }
        const instId = startRes.data?.id || startRes.data;

        await Utils.waitForInstanceStatus(instId, 'completed');
        console.log(`  ✅ Passed.`);
    }
}

/**
 * [L1] 图结构验证 & 条件分支 (Design)
 * 纯定义校验，无运行时依赖
 */
async function runDesignTests() {
    console.log('\n=== RUNNING DESIGN & VALIDATION TESTS ===');
    
    // 1. 重复节点 ID
    console.log('- Testing Duplicate Node IDs...');
    const res1 = await request('/workflows', {
        method: 'POST', headers: Auth.headers,
        body: { name: "DupID", graph: { nodes: [{ id: "n1", type: "start", data: { nodeType: "start" } }, { id: "n1", type: "end", data: { nodeType: "end" } }], edges: [] } }
    });
    const msg1 = res1.message || (typeof res1.data === 'string' ? res1.data : '') || '';
    if (!res1.success && msg1.includes("重复")) {
        console.log("  ✅ Expected Error Caught: Duplicate Node IDs");
    } else {
        throw new Error(`Validation Failed: expected !success and "重复", got success=${res1.success}, message=${msg1}`);
    }

    // 2. 空图
    console.log('- Testing Empty Graph...');
    const res2 = await request('/workflows', { method: 'POST', headers: Auth.headers, body: { name: "EmptyGraph", graph: { nodes: [], edges: [] } } });
    if (!res2.success) console.log("  ✅ Empty graph rejected");
    else console.log("  ⚠️ Empty graph unexpectedly accepted");

    // 3. 缺少开始节点
    console.log('- Testing Missing Start Node...');
    const res3 = await request('/workflows', {
        method: 'POST', headers: Auth.headers,
        body: { name: "NoStart", graph: { nodes: [{ id: "e1", type: "end", data: { nodeType: "end" } }], edges: [] } }
    });
    if (!res3.success) console.log("  ✅ Missing start rejected");
    else console.log("  ⚠️ Missing start unexpectedly accepted");

    // 4. 缺少结束节点
    console.log('- Testing Missing End Node...');
    const res4 = await request('/workflows', {
        method: 'POST', headers: Auth.headers,
        body: { name: "NoEnd", graph: { nodes: [{ id: "s1", type: "start", data: { nodeType: "start" } }], edges: [] } }
    });
    if (!res4.success) console.log("  ✅ Missing end rejected");
    else console.log("  ⚠️ Missing end unexpectedly accepted");

    // 5. 审批节点无 approvers
    console.log('- Testing Approval Node Without Approvers...');
    const res5 = await request('/workflows', {
        method: 'POST', headers: Auth.headers,
        body: {
            name: "NoApprovers",
            graph: {
                nodes: [
                    { id: "s", type: "start", data: { nodeType: "start" } },
                    { id: "a", type: "approval", data: { nodeType: "approval", config: { approval: { type: "any", approvers: [] } } } },
                    { id: "e", type: "end", data: { nodeType: "end" } }
                ],
                edges: [
                    { source: "s", target: "a", data: { condition: "" } },
                    { source: "a", target: "e", data: { condition: "" } }
                ]
            }
        }
    });
    if (!res5.success) console.log("  ✅ Approval without approvers rejected");
    else console.log("  ⚠️ Approval without approvers unexpectedly accepted");

    // 6. 并行节点仅 1 条出边
    console.log('- Testing Parallel Node With Single Outgoing Edge...');
    const res6 = await request('/workflows', {
        method: 'POST', headers: Auth.headers,
        body: {
            name: "ParallelSingle",
            graph: {
                nodes: [
                    { id: "s", type: "start", data: { nodeType: "start" } },
                    { id: "p", type: "parallel", data: { nodeType: "parallel" } },
                    { id: "v1", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "x", value: "1" } } } },
                    { id: "e", type: "end", data: { nodeType: "end" } }
                ],
                edges: [
                    { source: "s", target: "p", data: { condition: "" } },
                    { source: "p", target: "v1", data: { condition: "" } },
                    { source: "v1", target: "e", data: { condition: "" } }
                ]
            }
        }
    });
    if (!res6.success) console.log("  ✅ Parallel with single branch rejected");
    else console.log("  ⚠️ Parallel with single branch unexpectedly accepted");

    console.log('- Testing Condition Branching (Amount Logic)...');
    const def = {
        name: "Condition Test",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "c", type: "condition", data: { nodeType: "condition", config: { condition: { 
                    conditions: [{ variable: "amount", operator: "greater_than", value: "1000" }],
                    logicalOperator: "and"
                } } } },
                { id: "h", type: "end", data: { nodeType: "end", label: "High" } },
                { id: "l", type: "end", data: { nodeType: "end", label: "Low" } }
            ],
            edges: [
                { source: "s", target: "c", sourceHandle: "source", data: { condition: "" } },
                { source: "c", target: "h", sourceHandle: "true", data: { condition: "amount > 1000" } },
                { source: "c", target: "l", sourceHandle: "false", data: { condition: "default" } }
            ]
        }
    };
    const defRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: def });
    const defId = defRes.data.id;

    const testCases = [{ amt: 5000, expected: 'h' }, { amt: 100, expected: 'l' }];
    for (const tc of testCases) {
        const docRes = await request('/documents', { method: 'POST', headers: Auth.headers, body: { title: `Branching ${tc.amt}`, content: "." } });
        const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: { documentId: docRes.data.id, variables: { amount: tc.amt } } });
        console.log(`  Starting workflow for amount ${tc.amt}. Instance ID: ${startRes.data?.id || startRes.data}`);
        const instId = startRes.data?.id || startRes.data;
        await Utils.waitForInstanceStatus(instId, 'completed');
        const instRes = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
        const finalNode = instRes.data?.currentNodeId || '(unknown)';
        console.log(`  Amount ${tc.amt} -> Landed on ${finalNode}: ${finalNode === tc.expected ? '✅' : '❌'}`);
    if (finalNode !== tc.expected) {
        // Log more details to debug why it failed
        console.log(`    [DEBUG] Instance ID: ${instId}, Status: ${instRes.data.status}`);
    }
}
}

/**
 * [L5] 多用户协作测试 (Multi-User)
 * 租户隔离 / 角色分配 / 多人审批
 */
async function runMultiUserTests() {
    console.log('\n=== RUNNING MULTI-USER COLLABORATION TESTS ===');
    const company = await Utils.createCompany(`Enterprise-${Date.now().toString().slice(-4)}`);
    const app1 = await Utils.registerUser(`approver1_${company.code.slice(-4)}`);
    const app2 = await Utils.registerUser(`approver2_${company.code.slice(-4)}`);
    if (!app1 || !app2) {
        console.error("  ❌ Multi-user tests aborted due to registration failure.");
        throw new Error("Registration failed");
    }
    
    // Switch admin to the new company to ensure correct context for roles and user additions
    await Auth.switchCompany(company.id);
    
    // Add them to company
    const rolesRes = await request('/role', { headers: Auth.headers });
    if (!rolesRes.success) throw new Error("Failed to get roles");
    const adminRole = rolesRes.data.roles.find(r => r.name === '管理员');
    if (!adminRole) throw new Error("Admin role not found in new company");
    
    for (const u of [app1, app2]) {
        await request('/users', { method: 'POST', headers: Auth.headers, body: { username: u.username, roleIds: [adminRole.id], isActive: true } });
    }

    const workflowDef = {
        name: `Collaboration WF ${company.code}`,
        category: 'Test',
        isActive: true,
        graph: {
            nodes: [
                { id: 's', type: 'start', data: { nodeType: 'start' } },
                { id: 'n1', type: 'approval', data: { nodeType: 'approval', config: { approval: { type: 'any', approvers: [{ type: 'user', userId: app1.userId }] } } } },
                { id: 'n2', type: 'approval', data: { nodeType: 'approval', config: { approval: { type: 'any', approvers: [{ type: 'user', userId: app2.userId }] } } } },
                { id: 'e', type: 'end', data: { nodeType: 'end' } }
            ],
            edges: [
                { source: 's', target: 'n1', data: { condition: '' } },
                { source: 'n1', target: 'n2', data: { condition: '' } },
                { source: 'n2', target: 'e', data: { condition: '' } }
            ]
        }
    };
    const defRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = defRes.data.id;
    
    console.log('Starting collaborative workflow...');
    const docRes = await request('/documents', { method: 'POST', headers: Auth.headers, body: { title: "Joint Report", content: "." } });
    const docId = docRes.data.id;
    await request(`/documents/${docId}/submit`, { method: 'POST', headers: Auth.headers, body: { workflowDefinitionId: defId } });

    // Login and approve as App1
    const login1 = await request('/auth/login', { method: 'POST', body: { username: app1.username, password: 'Password123!', autoLogin: false } });
    if (!login1.success) throw new Error(`App1 login failed: ${login1.message}`);
    let head1 = { 'Authorization': `Bearer ${login1.data.token}` };
    const switch1 = await request('/company/switch', { method: 'POST', headers: head1, body: { targetCompanyId: company.id } });
    if (switch1.data && switch1.data.token) head1 = { 'Authorization': `Bearer ${switch1.data.token}` };
    
    // We get instance ID for node-level approval as well to be safe
    const listRes1 = await request(`/documents/${docId}`, { headers: head1 });
    const instId = listRes1.data?.workflowInstance?.id;
    
    // Approve
    const app1Res = await request(`/workflows/instances/${instId}/nodes/n1/action`, { method: 'POST', headers: head1, body: { action: "approve", comment: "First OK" } });
    if (!app1Res.success) throw new Error(`App1 approve failed: ${app1Res.message || JSON.stringify(app1Res)}`);
    console.log('  Approver 1 approved.');

    // Login and approve as App2
    const login2 = await request('/auth/login', { method: 'POST', body: { username: app2.username, password: 'Password123!', autoLogin: false } });
    if (!login2.success) throw new Error(`App2 login failed: ${login2.message}`);
    let head2 = { 'Authorization': `Bearer ${login2.data.token}` };
    const switch2 = await request('/company/switch', { method: 'POST', headers: head2, body: { targetCompanyId: company.id } });
    if (switch2.data && switch2.data.token) head2 = { 'Authorization': `Bearer ${switch2.data.token}` };
    
    const app2Res = await request(`/workflows/instances/${instId}/nodes/n2/action`, { method: 'POST', headers: head2, body: { action: "approve", comment: "Second OK" } });
    if (!app2Res.success) throw new Error(`App2 approve failed: ${app2Res.message || JSON.stringify(app2Res)}`);
    console.log('  Approver 2 approved.');

    process.stdout.write('  Waiting for approval completion ');
    await Utils.waitForDocumentStatus(docId, 'approved');
    const finalRes = await request(`/documents/${docId}`, { headers: Auth.headers });
    console.log(`\n  Document Status: ${finalRes.data.document.status} - ${finalRes.data.document.status === 'approved' ? '✅' : '❌'}`);
}

// AllNodes removed (redundant)

/**
 * [L4] 表单集成测试 (Form)
 * 表单定义 ➜ 字段校验 ➜ 工作流绑定 ➜ 数据持久化
 */
async function runFormIntegratedTests() {
    console.log('\n=== RUNNING FORM INTEGRATED TESTS ===');

    // 1. Create a Form Definition with various fields
    const fields = [
        { label: "Title", dataKey: "title", type: "Text", required: true },
        { label: "Amount", dataKey: "amount", type: "Number", required: true, rules: [{ type: "min", min: 100, message: "Min 100" }] },
        { label: "Reason", dataKey: "reason", type: "TextArea", required: false }
    ];
    const formDefRaw = await Utils.createForm("Reimbursement Form", fields);
    const formDef = await request(`/forms/${formDefRaw.id}`, { headers: Auth.headers });
    console.log(`Form created and re-fetched. ID: ${formDef.data.id}`);
    console.log("Form Fields from direct GET:", JSON.stringify(formDef.data.fields || []));
    if (!formDef.data.fields || formDef.data.fields.length === 0) {
        console.warn("  ⚠️ Warning: Form created with no fields! Check field naming conventions.");
    }
    const formId = formDef.data.id;

    // 2. Create Workflow with Form Binding on Start and Approval nodes
    console.log("- Creating Workflow with Form Binding...");
    const wfBody = {
        name: "Form-Driven-Workflow",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "start", type: "start", data: { nodeType: "start", label: "Start", config: { form: { formDefinitionId: formId, target: "Document", required: true } } } },
                { id: "approval", type: "approval", data: { nodeType: "approval", label: "Manager Review", config: { 
                    approval: { type: "Any", approvers: [{ type: "User", userId: Auth.userId }] },
                    form: { formDefinitionId: formId, target: "Document" } 
                } } },
                { id: "end", type: "end", data: { nodeType: "end", label: "End" } }
            ],
            edges: [
                { id: "e1", source: "start", target: "approval", data: { condition: "" } },
                { id: "e2", source: "approval", target: "end", data: { label: "Approve", condition: "default" } }
            ]
        }
    };
    const wfRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: wfBody });
    const wfDefId = wfRes.data.id;

    // 3. Test Validation Failure (Missing Required Field)
    console.log("- Testing Form Validation (Missing Required Field)...");
    const createDocFailRes = await request(`/workflows/${wfDefId}/documents`, {
        method: 'POST',
        headers: Auth.headers,
        body: { values: { reason: "Budget excess" } } // Using camelCase 'values'
    });
    const errorMsg = createDocFailRes.message || (typeof createDocFailRes.data === 'string' ? createDocFailRes.data : '');
    if (!createDocFailRes.success && errorMsg.includes("必填字段缺失")) { // Correctly using back-end error message
        console.log("  ✅ Validation Intercepted: Missing required fields (PASS)");
    } else {
        console.log("  ❌ Validation Failed to intercept missing fields.", JSON.stringify(createDocFailRes));
    }

    // 4. Create Document with Correct Form Data
    console.log("- Creating Document with valid Form Data...");
    const validData = { title: "Trip Reimbursement", amount: 250, reason: "Client Visit" };
    const createDocRes = await request(`/workflows/${wfDefId}/documents`, {
        method: 'POST',
        headers: Auth.headers,
        body: { values: validData } // Using camelCase 'values'
    });
    console.log("  Document creation response:", JSON.stringify(createDocRes));
    if (!createDocRes.success) throw new Error("Document creation failed with form data: " + (createDocRes.message || JSON.stringify(createDocRes)));
    console.log("  Document created:", createDocRes.data.id, "FormData:", JSON.stringify(createDocRes.data.formData));
    const docId = createDocRes.data.id;
    console.log(`  Document created: ${docId}`);

    // 5. Submit Document to Start Workflow
    console.log("- Submitting Document to start workflow...");
    const submitRes = await request(`/documents/${docId}/submit`, {
        method: 'POST',
        headers: Auth.headers,
        body: { workflowDefinitionId: wfDefId }
    });
    console.log("  Submit Document Response:", JSON.stringify(submitRes));
    if (!submitRes.success) throw new Error("Workflow start failed: " + (submitRes.message || JSON.stringify(submitRes)));
    const instId = submitRes.data.id;
    console.log(`  Workflow started. Instance ID: ${instId}`);

    // 6. Verify Form Data Persistence in Node 
    console.log("- Verifying Form Data at Approval Node...");
    const nodeFormRes = await request(`/workflows/instances/${instId}/nodes/approval/form`, { headers: Auth.headers });
    console.log("  Node Form Response initialValues:", JSON.stringify(nodeFormRes.data?.initialValues || {}));
    if (nodeFormRes.success && nodeFormRes.data.initialValues && nodeFormRes.data.initialValues.title === "Trip Reimbursement") {
        console.log("  ✅ Form Data persisted to workflow node (PASS)");
    } else {
        console.log("  ❌ Form Data missing or incorrect at node.", JSON.stringify(nodeFormRes));
    }

    // 7. Complete Approval with Additional Form Data (manager_feedback)
    console.log("- Submitting additional data at Approval Node...");
    const feedback = { title: "TR Updated", amount: 250, manager_comment: "Approved" };
    const submitNodeRes = await Utils.submitNodeForm(instId, "approval", feedback);
    
    // Complete the node
    console.log("- Executing Approval Action...");
    const approveRes = await request(`/workflows/instances/${instId}/nodes/approval/action`, {
        method: 'POST',
        headers: Auth.headers,
        body: { action: "approve", comment: "OK" }
    });
    if (!approveRes.success) throw new Error("Approval action failed: " + (approveRes.message || JSON.stringify(approveRes)));
    console.log("  ✅ Approval action submitted.");

    // 8. Final check
    process.stdout.write('  Waiting for final workflow completion ');
    await Utils.waitForInstanceStatus(instId, 'completed');
    const finalInst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`\n  Final Workflow Status: ${finalInst.data.status === 'completed' ? "✅ COMPLETED" : "❌ " + finalInst.data.status}`);
}

// ExtendedComponents removed (merged into atomic/master)

/**
 * [L9] 循环/迭代测试 (Iteration)
 */
async function runIterationTests() {
    console.log('\n=== RUNNING ITERATION TESTS ===');
    const workflowDef = {
        name: "Iteration Test Workflow",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "iter", type: "iteration", data: { nodeType: "iteration", config: { iteration: { iteratorVariable: "list", outputVariable: "final_results" } } } },
                { id: "log", type: "log", data: { nodeType: "log", parentId: "iter", config: { log: { message: "Processing item: {{item}}" } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "iter", data: { condition: "" } },
                { source: "iter", target: "log", data: { condition: "" }, sourceHandle: "loop" },
                { source: "log", target: "iter", data: { condition: "" } }, // 闭环
                { source: "iter", target: "e", data: { condition: "" }, sourceHandle: "done" }
            ]
        }
    };

    const res = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    if (!res.success) throw new Error("Iteration WF creation failed: " + res.message);
    const defId = res.data.id;

    console.log("  Starting iteration with ['A', 'B', 'C']...");
    const startRes = await request(`/workflows/${defId}/start`, { 
        method: 'POST', headers: Auth.headers, 
        body: { variables: { list: ["A", "B", "C"] } } 
    });
    const instId = startRes.data.id || startRes.data;

    await Utils.waitForInstanceStatus(instId, 'completed');
    const inst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Final List: ${JSON.stringify(inst.data.variables.final_results || [])}`);
    if (inst.data.variables.final_results && inst.data.variables.final_results.length === 3) {
        console.log("  ✅ Iteration completed and collected all results.");
    } else {
        console.log("  ❌ Iteration results mismatch.");
    }
}

// QuestionClassifier and CodeNode removed (merged into master / atomic)

/**
 * [L12] 并行汇聚测试 (Parallel/Join)
 */
async function runParallelJoinTests() {
    console.log('\n=== RUNNING PARALLEL & JOIN TESTS ===');
    const workflowDef = {
        name: "Parallel Join Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "p", type: "parallel", data: { nodeType: "parallel", label: "Split" } },
                { id: "v1", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "res1", value: "Branch 1 Done" } } } },
                { id: "v2", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "res2", value: "Branch 2 Done" } } } },
                { id: "agg", type: "variableAggregator", data: { nodeType: "variableAggregator", config: { variableAggregator: { 
                    inputVariables: ["res1", "res2"],
                    outputVariable: "combined"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "p", data: { condition: "" } },
                { source: "p", target: "v1", data: { condition: "" } },
                { source: "p", target: "v2", data: { condition: "" } },
                { source: "v1", target: "agg", data: { condition: "" } },
                { source: "v2", target: "agg", data: { condition: "" } },
                { source: "agg", target: "e", data: { condition: "" } }
            ]
        }
    };

    const res = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = res.data.id;
    const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: {} });
    const instId = startRes.data.id || startRes.data;

    await Utils.waitForInstanceStatus(instId, 'completed');
    const inst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Combined Result: ${JSON.stringify(inst.data.variables.combined)}`);
    if (inst.data.variables.combined && inst.data.variables.combined.res1 && inst.data.variables.combined.res2) {
        console.log("  ✅ Parallel paths joined and aggregated successfully.");
    }
}

// Reject removed (merged into master)

/**
 * [L11] 新增小组件测试 (VariableAssigner, ListOperator, DocumentExtractor)
 */
async function runNewComponentTests() {
    console.log('\n=== RUNNING NEW COMPONENT TESTS ===');

    // 1. VariableAssigner - 多变量赋值
    console.log('- Testing VariableAssigner...');
    const vaWf = {
        name: "VariableAssigner Test",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "va", type: "variableAssigner", data: { nodeType: "variableAssigner", config: { variableAssigner: {
                    assignments: [
                        { variable: "a", value: "100" },
                        { variable: "b", value: "{{a}}" }
                    ],
                    outputVariable: "assigned"
                } } } },
                { id: "tmpl", type: "template", data: { nodeType: "template", config: { template: {
                    template: "a={{a}}, b={{b}}",
                    outputVariable: "out"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "va", data: { condition: "" } },
                { source: "va", target: "tmpl", data: { condition: "" } },
                { source: "tmpl", target: "e", data: { condition: "" } }
            ]
        }
    };
    const vaRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: vaWf });
    if (!vaRes.success) throw new Error(`VariableAssigner WF create failed: ${vaRes.message}`);
    const vaStart = await request(`/workflows/${vaRes.data.id}/start`, { method: 'POST', headers: Auth.headers, body: {} });
    const vaInstId = vaStart.data?.id || vaStart.data;
    await Utils.waitForInstanceStatus(vaInstId, 'completed', 30);
    const vaInst = await request(`/workflows/instances/${vaInstId}`, { headers: Auth.headers });
    const vaVars = varsToObj(vaInst.data?.variables);
    const vaOut = String(vaVars.out ?? vaVars.rendered ?? '');
    const vaPass = vaOut.includes('a=100') && vaOut.includes('b=100');
    console.log(`  Result: "${vaOut}" - ${vaPass ? '✅' : '❌'}`);
    if (!vaPass) throw new Error(`VariableAssigner failed: expected a=100, b=100`);

    // 2. ListOperator - 列表操作
    console.log('- Testing ListOperator...');
    const loWf = {
        name: "ListOperator Test",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "sv", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "input", value: "[1,2,3]" } } } },
                { id: "lo", type: "listOperator", data: { nodeType: "listOperator", config: { listOperator: {
                    inputVariable: "input",
                    outputVariable: "list_result"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "sv", data: { condition: "" } },
                { source: "sv", target: "lo", data: { condition: "" } },
                { source: "lo", target: "e", data: { condition: "" } }
            ]
        }
    };
    const loRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: loWf });
    if (!loRes.success) throw new Error(`ListOperator WF create failed: ${loRes.message}`);
    const loStart = await request(`/workflows/${loRes.data.id}/start`, { method: 'POST', headers: Auth.headers, body: {} });
    const loInstId = loStart.data?.id || loStart.data;
    await Utils.waitForInstanceStatus(loInstId, 'completed', 30);
    const loInst = await request(`/workflows/instances/${loInstId}`, { headers: Auth.headers });
    const loVars = varsToObj(loInst.data?.variables);
    const loResult = loVars.list_result;
    const loPass = Array.isArray(loResult) && loResult.length === 3;
    console.log(`  list_result: ${JSON.stringify(loResult)} - ${loPass ? '✅' : '❌'}`);
    if (!loPass) throw new Error(`ListOperator failed: expected array [1,2,3]`);

    // 3. DocumentExtractor - 文档字段提取
    console.log('- Testing DocumentExtractor...');
    const deWf = {
        name: "DocumentExtractor Test",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "de", type: "documentExtractor", data: { nodeType: "documentExtractor", config: { documentExtractor: {
                    variable: "document",
                    extractions: [
                        { field: "title", type: "text" },
                        { field: "count", type: "number" }
                    ],
                    outputVariable: "extracted"
                } } } },
                { id: "tmpl2", type: "template", data: { nodeType: "template", config: { template: {
                    template: "title={{extracted.title}} count={{extracted.count}}",
                    outputVariable: "summary"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "de", data: { condition: "" } },
                { source: "de", target: "tmpl2", data: { condition: "" } },
                { source: "tmpl2", target: "e", data: { condition: "" } }
            ]
        }
    };
    const deRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: deWf });
    if (!deRes.success) throw new Error(`DocumentExtractor WF create failed: ${deRes.message}`);
    const deStart = await request(`/workflows/${deRes.data.id}/start`, {
        method: 'POST', headers: Auth.headers,
        body: { variables: { document: { title: "Test Doc", count: 42 } } }
    });
    const deInstId = deStart.data?.id || deStart.data;
    await Utils.waitForInstanceStatus(deInstId, 'completed', 30);
    const deInst = await request(`/workflows/instances/${deInstId}`, { headers: Auth.headers });
    const deVars = varsToObj(deInst.data?.variables);
    const deExtracted = deVars.extracted;
    const dePass = deExtracted != null && (deExtracted.title === 'Test Doc' || String(deExtracted?.title ?? '').includes('Test Doc'));
    console.log(`  extracted: ${JSON.stringify(deExtracted)} - ${dePass ? '✅' : '❌'}`);
    if (!dePass) throw new Error(`DocumentExtractor failed: expected title "Test Doc"`);

    console.log('  ✅ New Component Tests Passed.');
}

/**
 * [L10] 流程设计小组件串联测试 (Process Design Components)
 * 覆盖 start, setVariable, condition, timer, template, end 等小组件串联
 */
async function runProcessDesignComponentTests() {
    console.log('\n=== RUNNING PROCESS DESIGN COMPONENT TESTS ===');
    
    const workflowDef = {
        name: "Process Design Components Flow",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "cond", type: "condition", data: { nodeType: "condition", config: { condition: {
                    conditions: [{ variable: "amount", operator: "greater_than", value: "100" }],
                    logicalOperator: "and"
                } } } },
                { id: "sv_high", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "branch", value: "high" } } } },
                { id: "sv_low", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "branch", value: "low" } } } },
                { id: "tmpl", type: "template", data: { nodeType: "template", config: { template: {
                    template: "Branch result: {{branch}}",
                    outputVariable: "rendered"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { id: "e1", source: "s", target: "cond", data: { condition: "" } },
                { id: "e2", source: "cond", target: "sv_high", sourceHandle: "true", data: { condition: "true" } },
                { id: "e3", source: "cond", target: "sv_low", sourceHandle: "false", data: { condition: "false" } },
                { id: "e4", source: "sv_high", target: "tmpl", data: { condition: "" } },
                { id: "e5", source: "sv_low", target: "tmpl", data: { condition: "" } },
                { id: "e6", source: "tmpl", target: "e", data: { condition: "" } }
            ]
        }
    };

    const createRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    if (!createRes.success) throw new Error(`Failed to create process design workflow: ${createRes.message}`);
    const defId = createRes.data.id;
    console.log(`  Workflow created: ${defId}`);

    // 场景 1: amount=150 > 100 -> true -> sv_high -> template (branch=high)
    console.log('- Scenario 1: amount=150 (true branch)...');
    const start1 = await request(`/workflows/${defId}/start`, {
        method: 'POST', headers: Auth.headers,
        body: { variables: { amount: 150 } }
    });
    const inst1Id = start1.data?.id || start1.data;
    await Utils.waitForInstanceStatus(inst1Id, 'completed');
    const inst1 = await request(`/workflows/instances/${inst1Id}`, { headers: Auth.headers });
    const vars1 = varsToObj(inst1.data?.variables);
    const rendered1 = String(vars1.rendered ?? vars1.template_result ?? '');
    const pass1 = rendered1.includes('high');
    console.log(`  Result: "${rendered1}" - ${pass1 ? '✅' : '❌'}`);
    if (!pass1) throw new Error(`Scenario 1 failed: expected "high", got "${rendered1}"`);

    // 场景 2: amount=50 <= 100 -> false -> sv_low -> template (branch=low)
    console.log('- Scenario 2: amount=50 (false branch)...');
    const start2 = await request(`/workflows/${defId}/start`, {
        method: 'POST', headers: Auth.headers,
        body: { variables: { amount: 50 } }
    });
    const inst2Id = start2.data?.id || start2.data;
    await Utils.waitForInstanceStatus(inst2Id, 'completed');
    const inst2 = await request(`/workflows/instances/${inst2Id}`, { headers: Auth.headers });
    const vars2 = varsToObj(inst2.data?.variables);
    const rendered2 = String(vars2.rendered ?? vars2.template_result ?? '');
    const pass2 = rendered2.includes('low');
    console.log(`  Result: "${rendered2}" - ${pass2 ? '✅' : '❌'}`);
    if (!pass2) throw new Error(`Scenario 2 failed: expected "low", got "${rendered2}"`);

    console.log('  ✅ All Process Design Component Tests Passed.');
}

/**
 * [L8] 变量解析与错误边界测试 (Variable Resolution & Error Boundary)
 * 验证: 默认值 {{var || 'def'}}, 过滤器 {{var | json}}, 深层路径 {{item.0.name}}, 错误捕获 nodes.id.error
 */
async function runVariableResolutionTests() {
    console.log('\n=== RUNNING VARIABLE RESOLUTION & ERROR BOUNDARY TESTS ===');
    
    // 1. 测试高级变量解析
    console.log('- Testing Advanced Variable Resolution (Defaults, Filters, Deep Paths)...');
    const resolutionWf = {
        name: "Variable resolution test",
        category: "Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "v", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { name: "input_obj", value: "{\"items\": [{\"name\": \"item1\"}], \"status\": \"ok\"}" } } } },
                { id: "tmpl", type: "template", data: { nodeType: "template", config: { template: { 
                    template: "Default: {{missing || 'FALLBACK'}}, JSON: {{input_obj | json}}, Deep: {{input_obj.items.0.name}}, Mixed: Hello {{user.name || 'Guest'}}, count: {{input_obj.items.length}}", 
                    outputVariable: "rendered" 
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [{ source: "s", target: "v", data: { condition: "" } }, { source: "v", target: "tmpl", data: { condition: "" } }, { source: "tmpl", target: "e", data: { condition: "" } }]
        }
    };
    const res1 = await request('/workflows', { method: 'POST', headers: Auth.headers, body: resolutionWf });
    if (!res1.success) throw new Error(`Failed to create resolution workflow: ${res1.message}`);
    const defId1 = res1.data.id;
    const startRes1 = await request(`/workflows/${defId1}/start`, { method: 'POST', headers: Auth.headers, body: {} });
    if (!startRes1.success) throw new Error(`Failed to start resolution workflow: ${startRes1.message}`);
    const instId1 = startRes1.data?.id || startRes1.data;
    
    await Utils.waitForInstanceStatus(instId1, 'completed');
    const inst1 = await request(`/workflows/instances/${instId1}`, { headers: Auth.headers });
    const vars = varsToObj(inst1.data?.variables);
    const rendered = String(vars.rendered ?? vars.template_result ?? vars['nodes.tmpl.output'] ?? '');
    console.log(`  Rendered Result: "${rendered}"`);
    
    const passDefault = rendered.includes('FALLBACK');
    const passJson = rendered.includes('"status":"ok"') || rendered.includes('"status": "ok"');
    const passDeep = rendered.includes('item1');
    const passMixed = rendered.includes('Guest'); // user.name || 'Guest' 默认值生效
    console.log(`  Default Value: ${passDefault ? '✅' : '❌'}`);
    console.log(`  JSON Filter: ${passJson ? '✅' : '❌'}`);
    console.log(`  Deep Path: ${passDeep ? '✅' : '❌'}`);
    console.log(`  Mixed Resolution: ${passMixed ? '✅' : '❌'}`);

    // 2. 测试错误边界捕获
    console.log('\n- Testing Error Boundary Capture...');
    const errorWf = {
        name: "Error boundary test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "err_node", type: "httpRequest", data: { nodeType: "httpRequest", config: { http: { method: "GET", url: "http://invalid-domain-that-does-not-exist.local", outputVariable: "res" } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "err_node", data: { condition: "" } },
                { source: "err_node", target: "e", data: { condition: "default" } }
            ]
        }
    };
    const res2 = await request('/workflows', { method: 'POST', headers: Auth.headers, body: errorWf });
    const defId2 = res2.data.id;
    const startRes2 = await request(`/workflows/${defId2}/start`, { method: 'POST', headers: Auth.headers, body: {} });
    const instId2 = startRes2.data.id;
    
    await new Promise(r => setTimeout(r, 5000)); // 等待执行失败
    const inst2 = await request(`/workflows/instances/${instId2}`, { headers: Auth.headers });
    const nodeError = inst2.data.variables[`nodes.err_node.error`];
    const nodeStatus = inst2.data.variables[`nodes.err_node.status`];
    
    console.log(`  Node Status: ${nodeStatus}`);
    console.log(`  Error Message: ${nodeError ? (nodeError.substring(0, 50) + '...') : 'NULL'}`);
    console.log(`  Error Captured: ${nodeError && nodeStatus === 'failed' ? '✅' : '❌'}`);
}

/**
 * [L13] 全链路集成测试 (Master Integration)
 * 场景: 启动(输入) -> 参数提取 -> 意图分类 -> 条件分支 -> 审批 -> 代码脚本 -> 结束
 */
async function runAdvancedIntegrationTests() {
    console.log('\n=== RUNNING MASTER INTEGRATION TESTS ===');

    // 获取管理员角色 ID（ApproverRule 仅支持 roleId，不支持 roleName）
    const rolesRes = await request('/role', { headers: Auth.headers });
    const adminRole = rolesRes.success && rolesRes.data?.roles
        ? rolesRes.data.roles.find(r => r.name === '管理员')
        : null;
    const approverRule = adminRole
        ? { type: 'role', roleId: adminRole.id }
        : { type: 'user', userId: Auth.userId };
    
    const workflowDef = {
        name: "Master Integration Workflow",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "p", type: "parameterExtractor", data: { nodeType: "parameterExtractor", config: { parameterExtractor: {
                    input: "{{workflow.start.variables.input}}",
                    parameters: [
                        { name: "count", type: "number", description: "数量" },
                        { name: "item", type: "string", description: "项目名称" }
                    ],
                    outputVariable: "params"
                } } } },
                { id: "c", type: "questionClassifier", data: { nodeType: "questionClassifier", config: { questionClassifier: {
                    input: "{{workflow.start.variables.input}}",
                    classes: [
                        { id: "purchase", name: "Purchase" },
                        { id: "inquiry", name: "Inquiry" }
                    ],
                    outputVariable: "intent"
                } } } },
                { id: "cond", type: "condition", data: { nodeType: "condition", config: { condition: {
                    conditions: [{ variable: "workflow.p.params.count", operator: "greater_than", value: "20" }],
                    logicalOperator: "and"
                } } } },
                { id: "approv", type: "approval", data: { nodeType: "approval", config: { approval: { 
                    type: "any", 
                    approvers: [approverRule],
                    allowReject: true
                } } } },
                { id: "auto", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { 
                    name: "final_status", 
                    value: "Auto Approved for {{workflow.p.params.item}}" 
                } } } },
                { id: "code", type: "code", data: { nodeType: "code", config: { code: {
                    language: "javascript",
                    code: "const p = variables['workflow.p.params']; return { result: `Calculated result based on inputs: ${p?.item || ''}` };",
                    outputVariable: "res"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { id: "e1", source: "s", target: "p", data: { condition: "" } },
                { id: "e2", source: "p", target: "c", data: { condition: "" } },
                { id: "e3", source: "c", target: "cond", data: { condition: "" } },
                { id: "e4", source: "cond", target: "approv", sourceHandle: "true", data: { label: "High Value", condition: "true" } },
                { id: "e5", source: "cond", target: "auto", sourceHandle: "false", data: { label: "Low Value/Other", condition: "false" } },
                { id: "e6", source: "approv", target: "code", sourceHandle: "default", data: { label: "Approved", condition: "default" } },
                { id: "e7", source: "auto", target: "code", data: { condition: "" } },
                { id: "e8", source: "code", target: "e", data: { condition: "" } }
            ]
        }
    };

    console.log("- Creating master workflow...");
    const res = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = res.data.id;

    // --- SCENARIO 1: APPROVE (同意) ---
    console.log("\n[Scenario 1] Approve High Value Request");
    const s1Start = await request(`/workflows/${defId}/start`, { 
        method: 'POST', headers: Auth.headers, 
        body: { variables: { input: "I want to buy 30 Macbook Pro laptops for the team" } } 
    });
    const inst1Id = s1Start.data.id || s1Start.data;
    process.stdout.write('  Executing ');
    await Utils.waitForInstanceStatus(inst1Id, 'running'); 
    console.log(" -> Reached Approval Node.");
    
    await request(`/workflows/instances/${inst1Id}/nodes/approv/action`, {
        method: 'POST', headers: Auth.headers, body: { action: "approve", comment: "Looks good" }
    });
    console.log("  - Action: APPROVE sent.");
    await Utils.waitForInstanceStatus(inst1Id, 'completed');
    console.log("  ✅ Scenario 1 Passed (Status: completed)");

    // --- SCENARIO 2: RETURN (退回) ---
    console.log("\n[Scenario 2] Return to Start Request");
    const s2Start = await request(`/workflows/${defId}/start`, { 
        method: 'POST', headers: Auth.headers, 
        body: { variables: { input: "I want to buy 50 iPads" } } 
    });
    const inst2Id = s2Start.data.id || s2Start.data;
    process.stdout.write('  Executing ');
    await Utils.waitForInstanceStatus(inst2Id, 'running');
    console.log(" -> Reached Approval Node.");

    console.log("  - Action: RETURN to Node 's' (Start)");
    await request(`/workflows/instances/${inst2Id}/nodes/approv/action`, {
        method: 'POST', headers: Auth.headers, body: { 
            action: "return", 
            targetNodeId: "s", 
            comment: "Please check the quantity again" 
        }
    });

    // 退回到 start 后，因为没有表单，它会立即重新执行到 approv
    process.stdout.write('  Looping back ');
    await Utils.waitForInstanceStatus(inst2Id, 'running'); 
    console.log(" -> Reached Approval Node again (after return).");

    await request(`/workflows/instances/${inst2Id}/nodes/approv/action`, {
        method: 'POST', headers: Auth.headers, body: { action: "approve", comment: "Final approval" }
    });
    await Utils.waitForInstanceStatus(inst2Id, 'completed');
    console.log("  ✅ Scenario 2 Passed (Returned and then Approved)");

    // --- SCENARIO 3: REJECT (拒绝) ---
    console.log("\n[Scenario 3] Reject Request");
    const s3Start = await request(`/workflows/${defId}/start`, { 
        method: 'POST', headers: Auth.headers, 
        body: { variables: { input: "Buy 1000 iPhones" } } 
    });
    const inst3Id = s3Start.data.id || s3Start.data;
    process.stdout.write('  Executing ');
    await Utils.waitForInstanceStatus(inst3Id, 'running');
    console.log(" -> Reached Approval Node.");

    await request(`/workflows/instances/${inst3Id}/nodes/approv/action`, {
        method: 'POST', headers: Auth.headers, body: { action: "reject", comment: "Too expensive!" }
    });
    console.log("  - Action: REJECT sent.");
    await Utils.waitForInstanceStatus(inst3Id, 'rejected');
    console.log("  ✅ Scenario 3 Passed (Status: rejected)");

    console.log("\n🌟 All Master Integration Tests Passed.");
}


// --- Aspire Service Manager ---

const Aspire = {
    proc: null,
    APPHOST_DIR: 'Platform.AppHost',
    HEALTH_URL: 'http://127.0.0.1:15000/apiservice/api/auth/current-user',
    MAX_WAIT_SEC: 90,

    /** 检测 API 是否已可用 */
    async isApiReady() {
        try {
            const res = await fetch(this.HEALTH_URL, { signal: AbortSignal.timeout(3000) });
            return res.status < 500; // 401 也算就绪
        } catch {
            return false;
        }
    },

    /** 启动 AppHost 并等待 API 就绪 */
    async ensureRunning() {
        if (await this.isApiReady()) {
            console.log('✅ Aspire API 已在运行，跳过启动。');
            return;
        }

        console.log('🚀 启动 Aspire AppHost...');
        this.proc = spawn('dotnet', ['run', '--project', this.APPHOST_DIR], {
            cwd: process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        // 收集日志用于调试
        this.lastLogs = '';
        this.proc.stdout.on('data', d => {
            const line = d.toString().trim();
            if (line) {
                process.stdout.write(`  [AppHost] ${line}\n`);
                this.lastLogs += line + '\n';
            }
        });
        this.proc.stderr.on('data', d => {
            const line = d.toString().trim();
            if (line) {
                process.stderr.write(`  [AppHost:err] ${line}\n`);
                this.lastLogs += line + '\n';
            }
        });
        this.proc.on('exit', code => {
            if (code && code !== 0) console.error(`  ⚠️ AppHost exited with code ${code}`);
        });

        // 轮询等待 API 就绪
        const start = Date.now();
        while ((Date.now() - start) / 1000 < this.MAX_WAIT_SEC) {
            process.stdout.write('.');
            await new Promise(r => setTimeout(r, 3000));
            if (await this.isApiReady()) {
                console.log('\n✅ Aspire API 就绪！');
                return;
            }
        }
        throw new Error(`Aspire API 在 ${this.MAX_WAIT_SEC}s 内未就绪，请检查 AppHost 日志。`);
    },

    /** 关闭 AppHost 进程 */
    shutdown() {
        if (this.proc) {
            console.log('🛑 关闭 Aspire AppHost...');
            this.proc.kill('SIGTERM');
            this.proc = null;
        }
    }
};

// --- Main Runner ---

async function main() {
    const args = process.argv.slice(2);
    const shouldRun = (m) => args.length === 0 || args.some(a => m.toLowerCase().includes(a.toLowerCase()));

    try {
        await Aspire.ensureRunning();
        await Auth.login();

        if (shouldRun('register'))  await runRegisterTests();
        if (shouldRun('design'))    await runDesignTests();
        if (shouldRun('atomic'))    await runAtomicNodeTests();
        if (shouldRun('multiuser')) await runMultiUserTests();
        if (shouldRun('form'))      await runFormIntegratedTests();
        if (shouldRun('variable'))  await runVariableResolutionTests();
        if (shouldRun('iteration')) await runIterationTests();
        if (shouldRun('parallel'))  await runParallelJoinTests();
        if (shouldRun('process') || shouldRun('component')) await runProcessDesignComponentTests();
        if (shouldRun('newcomponent') || shouldRun('new')) await runNewComponentTests();
        if (shouldRun('master'))    await runAdvancedIntegrationTests();

        console.log('\n🌟 Unified Test Run Finished.');
    } catch (err) {
        console.error('\n💥 FATAL ERROR during test run:', err.message);
        process.exit(1);
    } finally {
        Aspire.shutdown();
    }
}

main();
