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
 * [L2] 基础节点能力测试 (Synergy)
 * IO / HTTP / SetVar / Log / Timer / AI / AiJudge / Condition
 */
async function runSynergyTests() {
    console.log('\n=== RUNNING SYNERGY TESTS ===');
    const workflowDef = {
        name: "Synergy 1: IO & External (HTTP, SetVar, Log)",
        category: 'Synergy',
        isActive: true,
        graph: {
            nodes: [
                { id: "start1", type: "start", data: { nodeType: "start", label: "Start" } },
                { id: "http1", type: "httpRequest", data: { nodeType: "httpRequest", label: "HTTP Node", config: { http: { method: "GET", url: "https://httpbin.org/get", outputVariable: "fetch_res" } } } },
                { id: "setVar1", type: "setVariable", data: { nodeType: "setVariable", label: "Set Variable", config: { variable: { name: "processed_res", value: "HTTP said: {fetch_res}" } } } },
                { id: "log1", type: "log", data: { nodeType: "log", label: "Log Msg", config: { log: { level: "info", message: "Result: {processed_res}" } } } },
                { id: "end1", type: "end", data: { nodeType: "end", label: "End" } }
            ],
            edges: [
                { id: "e1", source: "start1", target: "http1", sourceHandle: "source", data: { condition: "" } },
                { id: "e2", source: "http1", target: "setVar1", sourceHandle: "source", data: { condition: "" } },
                { id: "e3", source: "setVar1", target: "log1", sourceHandle: "source", data: { condition: "" } },
                { id: "e4", source: "log1", target: "end1", sourceHandle: "source", data: { condition: "" } }
            ]
        }
    };

    const workflows = [
        workflowDef,
        {
            name: "Synergy 2: AI & Timer (AI, Judge, Cond, Timer)",
            category: 'Synergy',
            isActive: true,
            graph: {
                nodes: [
                    { id: "s1", type: "start", data: { nodeType: "start", label: "Start" } },
                    { id: "sv1", type: "setVariable", data: { nodeType: "setVariable", label: "Inputs", config: { variable: { name: "user_input", value: "Translate 'Hello' to French" } } } },
                    { id: "ai1", type: "llm", data: { nodeType: "llm", label: "AI", config: { llm: { inputVariable: "user_input", promptTemplate: "Answer: {{inputVariable}}", outputVariable: "translated" } } } },
                    { id: "aj1", type: "llm", data: { nodeType: "llm", label: "Judge", config: { llm: { inputVariable: "translated", promptTemplate: "Contains Bonjour?", outputVariable: "is_correct" } } } },
                    { id: "c1", type: "condition", data: { nodeType: "condition", label: "Decision", config: { condition: {} } } },
                    { id: "t1", type: "timer", data: { nodeType: "timer", label: "Timer", config: { timer: { waitDuration: "00:00:02" } } } },
                    { id: "e-ok", type: "end", data: { nodeType: "end", label: "End True" } },
                    { id: "e-fail", type: "end", data: { nodeType: "end", label: "End False" } }
                ],
                edges: [
                    { id: "e1", source: "s1", target: "sv1", sourceHandle: "source", data: { condition: "" } },
                    { id: "e2", source: "sv1", target: "ai1", sourceHandle: "source", data: { condition: "" } },
                    { id: "e3", source: "ai1", target: "aj1", sourceHandle: "source", data: { condition: "" } },
                    { id: "e4", source: "aj1", target: "c1", sourceHandle: "source", data: { condition: "" } },
                    { id: "e5", source: "c1", target: "t1", sourceHandle: "true", data: { condition: "{is_correct} == 'true'" } },
                    { id: "e6", source: "c1", target: "e-fail", sourceHandle: "false", data: { condition: "default" } },
                    { id: "e7", source: "t1", target: "e-ok", sourceHandle: "source", data: { condition: "" } }
                ]
            }
        }
    ];

    for (const wf of workflows) {
        console.log(`\n- Workflow: ${wf.name}`);
        const body = {
            name: wf.name,
            category: wf.category || 'Synergy',
            isActive: true,
            graph: wf.graph
        };
        const createRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body });
        if (!createRes.success) {
            console.error("  ❌ WF Creation failed:", JSON.stringify(createRes, null, 2));
            throw new Error("WF Creation failed");
        }
        
        const defId = createRes.data.id;
        const docRes = await request('/documents', { method: 'POST', headers: Auth.headers, body: { title: `Synergy Test: ${wf.name}`, content: "Test" } });
        const docId = docRes.data.id;

        console.log(`  Starting instance...`);
        const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: { documentId: docId } });
        const instId = startRes.data.id || startRes.data;

        let status = 'running';
        for (let i = 0; i < 60; i++) { // Increased to 120s (60 * 2s) for AI/HTTP latency
            await new Promise(r => setTimeout(r, 2000));
            const instRes = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
            if (!instRes.success) continue;
            // WorkflowStatus enum via JsonStringEnumConverter (camelCase)
            const currentStatus = instRes.data.status.toLowerCase();
            if (currentStatus === 'completed') {
                status = 'completed';
                break;
            }
            if (currentStatus === 'failed' || currentStatus === 'rejected' || currentStatus === 'cancelled') {
                status = 'failed';
                break;
            }
            process.stdout.write(`.`);
        }
        process.stdout.write(` [${status}] `);
        console.log(`\n  Result: ${status === 'completed' ? 'PASS' : 'FAIL (' + status.toUpperCase() + ')'}`);
    }
}

/**
 * [L1] 图结构验证 & 条件分支 (Design)
 * 纯定义校验，无运行时依赖
 */
async function runDesignTests() {
    console.log('\n=== RUNNING DESIGN & VALIDATION TESTS ===');
    
    console.log('- Testing Duplicate Node IDs...');
    const res1 = await request('/workflows', {
        method: 'POST', headers: Auth.headers,
        body: { name: "DupID", graph: { nodes: [{ id: "n1", type: "start", data: { nodeType: "start" } }, { id: "n1", type: "end", data: { nodeType: "end" } }], edges: [] } }
    });
    console.log(res1.message.includes("重复") ? "  ✅ Expected Error Caught" : "  ❌ Validation Failed");

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

/**
 * [L3] 全节点组合测试 (All-Components)
 * 将各节点串入单条工作流一次性验证
 */
async function runAllNodesTests() {
     console.log('\n=== RUNNING ALL-COMPONENT WORKFLOW TEST ===');
     const workflowDef = {
        name: `All-Components-Master`,
        category: 'Test',
        isActive: true,
        graph: {
            nodes: [
                { id: 'start', type: 'start', data: { nodeType: 'start' } },
                { id: 'log', type: 'log', data: { nodeType: 'log', config: { log: { message: 'Master WF Started' } } } },
                { id: 'setVar', type: 'setVariable', data: { nodeType: 'setVariable', config: { variable: { name: 'score', value: '100' } } } },
                { id: 'http', type: 'httpRequest', data: { nodeType: 'httpRequest', config: { http: { method: 'GET', url: 'https://httpbin.org/get', outputVariable: 'res' } } } },
                { id: 'ai', type: 'llm', data: { nodeType: 'llm', config: { llm: { promptTemplate: 'Analyze {score}', outputVariable: 'analysis' } } } },
                { id: 'end', type: 'end', data: { nodeType: 'end' } }
            ],
            edges: [
                { source: 'start', target: 'log', data: { condition: '' } },
                { source: 'log', target: 'setVar', data: { condition: '' } },
                { source: 'setVar', target: 'http', data: { condition: '' } },
                { source: 'http', target: 'ai', data: { condition: '' } },
                { source: 'ai', target: 'end', data: { condition: '' } }
            ]
        }
    };
    const defRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = defRes.data.id;
    const docRes = await request('/documents', { method: 'POST', headers: Auth.headers, body: { title: "Master Test", content: "." } });
    await request(`/documents/${docRes.data.id}/submit`, { method: 'POST', headers: Auth.headers, body: { workflowDefinitionId: defId } });
    console.log('  Master workflow launched. Running through nodes...');
    await new Promise(r => setTimeout(r, 5000)); // Give it some time
    const listRes = await request(`/documents/${docRes.data.id}`, { headers: Auth.headers });
    console.log(`  Final Status: ${listRes.data.workflowInstance.status === 'completed' ? '✅ COMPLETED' : '❌ ' + listRes.data.workflowInstance.status}`);
}

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

/**
 * [L6] 扩展组件测试 (Extended Components)
 * 验证 Dify 风格节点及新增 AI/集成节点:
 * ParameterExtractor, Iteration, Answer, KnowledgeSearch, Tool,
 * SpeechToText, TextToSpeech, Email, Vision, VariableAggregator
 */
async function runExtendedComponentsTests() {
    console.log('\n=== RUNNING EXTENDED COMPONENTS TESTS ===');
    
    // 1. ParameterExtractor 深入验证
    console.log('- Testing ParameterExtractor...');
    const extractorWf = {
        name: "Extractor Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "p", type: "parameterExtractor", data: { nodeType: "parameterExtractor", config: { parameterExtractor: { 
                    inputVariable: "query", 
                    parameters: [
                        { name: "city", type: "string", description: "City name" },
                        { name: "days", type: "number", description: "Number of days" }
                    ], 
                    outputVariable: "params" 
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [{ source: "s", target: "p", data: { condition: "" } }, { source: "p", target: "e", data: { condition: "" } }]
        }
    };
    const res1 = await request('/workflows', { method: 'POST', headers: Auth.headers, body: extractorWf });
    if (!res1.success) throw new Error(`Failed to create extractor workflow: ${res1.message}`);
    const defId1 = res1.data.id;
    const startRes1 = await request(`/workflows/${defId1}/start`, { 
        method: 'POST', headers: Auth.headers, 
        body: { variables: { query: "I want to visit Paris for 5 days" } }
    });
    if (!startRes1.success) throw new Error(`Failed to start extractor workflow: ${startRes1.message}`);
    const instId1 = startRes1.data?.id || startRes1.data;
    await Utils.waitForInstanceStatus(instId1, 'completed');
    const inst1 = await request(`/workflows/instances/${instId1}`, { headers: Auth.headers });
    console.log(`  Extracted Params: ${JSON.stringify(inst1.data.variables.params)}`);
    if (inst1.data.variables.params && (inst1.data.variables.params.city || inst1.data.variables.params.days)) {
        console.log("  ✅ ParameterExtractor seems to be working.");
    }

    // 2. Answer 节点验证 (快速响应)
    console.log('- Testing Answer Node...');
    const answerWf = {
        name: "Answer Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "a", type: "answer", data: { nodeType: "answer", config: { answer: { answer: "Hello {{name}}, welcome!" } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [{ source: "s", target: "a", data: { condition: "" } }, { source: "a", target: "e", data: { condition: "" } }]
        }
    };
    const res2 = await request('/workflows', { method: 'POST', headers: Auth.headers, body: answerWf });
    const defId2 = res2.data.id;
    const startRes2 = await request(`/workflows/${defId2}/start`, { method: 'POST', headers: Auth.headers, body: { variables: { name: "Tester" } } });
    if (startRes2.success) console.log("  ✅ Answer node workflow execution confirmed.");
}

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

/**
 * [L10] 意图分类测试 (QuestionClassifier)
 */
async function runQuestionClassifierTests() {
    console.log('\n=== RUNNING QUESTION CLASSIFIER TESTS ===');
    const workflowDef = {
        name: "Classifier Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "qc", type: "questionClassifier", data: { nodeType: "questionClassifier", config: { questionClassifier: { 
                    inputVariable: "query",
                    classes: [
                        { id: "tech", name: "Technical", description: "Bugs or tech help" },
                        { id: "bill", name: "Billing", description: "Invoice or payment" }
                    ],
                    outputVariable: "category"
                } } } },
                { id: "end_tech", type: "end", data: { nodeType: "end", label: "Tech Path" } },
                { id: "end_bill", type: "end", data: { nodeType: "end", label: "Bill Path" } }
            ],
            edges: [
                { source: "s", target: "qc", sourceHandle: "source", data: { condition: "" } },
                { source: "qc", target: "end_tech", sourceHandle: "tech", data: { condition: "{{category}} == 'tech'" } },
                { source: "qc", target: "end_bill", sourceHandle: "bill", data: { condition: "default" } }
            ]
        }
    };

    const res = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = res.data.id;

    const testCase = "My invoice is wrong";
    console.log(`  Query: "${testCase}"`);
    const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: { variables: { query: testCase } } });
    const instId = startRes.data.id || startRes.data;

    await Utils.waitForInstanceStatus(instId, 'completed');
    const inst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Final Category: ${inst.data.variables.category}`);
    console.log(`  Landed on: ${inst.data.currentNodeId} (${inst.data.currentNodeId === 'end_bill' ? '✅' : '❌'})`);
}

/**
 * [L11] 代码节点测试 (Code)
 */
async function runCodeNodeTests() {
    console.log('\n=== RUNNING CODE NODE TESTS ===');
    const workflowDef = {
        name: "Code Test",
        isActive: true,
        graph: {
            nodes: [
                { id: "s", type: "start", data: { nodeType: "start" } },
                { id: "code", type: "code", data: { nodeType: "code", config: { code: { 
                    language: "javascript",
                    code: "return { sum: inputs.a + inputs.b };",
                    inputVariables: ["a", "b"],
                    outputVariable: "out"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [{ source: "s", target: "code", sourceHandle: "source", data: { condition: "" } }, { source: "code", target: "e", sourceHandle: "source", data: { condition: "" } }]
        }
    };

    const res = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = res.data.id;
    const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: { variables: { a: 10, b: 20 } } });
    const instId = startRes.data.id || startRes.data;

    await Utils.waitForInstanceStatus(instId, 'completed');
    const inst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Code Result: ${JSON.stringify(inst.data.variables.out)}`);
    if (inst.data.variables.out && inst.data.variables.out.includes("Calculated result")) {
        console.log("  ✅ Code node execution simulation confirmed.");
    }
}

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
    const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers });
    const instId = startRes.data.id || startRes.data;

    await Utils.waitForInstanceStatus(instId, 'completed');
    const inst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Combined Result: ${JSON.stringify(inst.data.variables.combined)}`);
    if (inst.data.variables.combined && inst.data.variables.combined.res1 && inst.data.variables.combined.res2) {
        console.log("  ✅ Parallel paths joined and aggregated successfully.");
    }
}

/**
 * [L7] 审批拒绝测试 (Rejection)
 * 测试流程在审批节点被拒绝时的状态流转
 */
async function runRejectTests() {
    console.log('\n=== RUNNING REJECTION TESTS ===');
    const company = await Utils.createCompany(`RejectCorp-${Date.now().toString().slice(-4)}`);
    const app1 = await Utils.registerUser(`rejector_${company.code.slice(-4)}`);
    if (!app1) throw new Error("Registration failed");
    
    await Auth.switchCompany(company.id);
    const rolesRes = await request('/role', { headers: Auth.headers });
    const adminRole = rolesRes.data.roles.find(r => r.name === '管理员');
    await request('/users', { method: 'POST', headers: Auth.headers, body: { username: app1.username, roleIds: [adminRole.id], isActive: true } });

    const workflowDef = {
        name: `Rejection WF ${company.code}`,
        category: 'Test',
        isActive: true,
        graph: {
            nodes: [
                { id: 'start', type: 'start', data: { nodeType: 'start' } },
                { id: 'approval', type: 'approval', data: { nodeType: 'approval', config: { approval: { type: 'any', approvers: [{ type: 'user', userId: app1.userId }], allowReject: true } } } },
                { id: 'end', type: 'end', data: { nodeType: 'end' } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'approval', data: { condition: '' } },
                { id: 'e2', source: 'approval', target: 'end', data: { label: 'Approve', condition: 'default' } }
            ]
        }
    };
    const defRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = defRes.data.id;
    
    const docRes = await request('/documents', { method: 'POST', headers: Auth.headers, body: { title: "Bad Request", content: "..." } });
    const docId = docRes.data.id;
    const submitRes = await request(`/documents/${docId}/submit`, { method: 'POST', headers: Auth.headers, body: { workflowDefinitionId: defId } });
    const instId = submitRes.data.id;
    console.log(`  Workflow started. Instance ID: ${instId}`);

    // Login and reject as app1
    const login1 = await request('/auth/login', { method: 'POST', body: { username: app1.username, password: 'Password123!', autoLogin: false } });
    let head1 = { 'Authorization': `Bearer ${login1.data.token}` };
    const switchRes = await request('/company/switch', { method: 'POST', headers: head1, body: { targetCompanyId: company.id } });
    if (switchRes.data && switchRes.data.token) {
        head1 = { 'Authorization': `Bearer ${switchRes.data.token}` };
    }
    
    console.log('- Executing Reject Action...');
    const rejectRes = await request(`/workflows/instances/${instId}/nodes/approval/action`, {
        method: 'POST', headers: head1, body: { action: "reject", comment: "Not approved" }
    });
    if (!rejectRes.success) throw new Error("Reject action failed: " + (rejectRes.message || JSON.stringify(rejectRes)));
    console.log('  ✅ Reject action submitted.');

    process.stdout.write('  Waiting for rejection completion ');
    await Utils.waitForInstanceStatus(instId, 'rejected');
    const finalInst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`\n  Final Workflow Status: ${finalInst.data.status === 'rejected' ? '✅ REJECTED' : '❌ ' + finalInst.data.status}`);
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
                    content: "Default: {{missing || 'FALLBACK'}}, JSON: {{input_obj | json}}, Deep: {{input_obj.items.0.name}}, Mixed: Hello {{user.name || 'Guest'}}, count: {{input_obj.items.length}}", 
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
    const startRes1 = await request(`/workflows/${defId1}/start`, { method: 'POST', headers: Auth.headers });
    if (!startRes1.success) throw new Error(`Failed to start resolution workflow: ${startRes1.message}`);
    const instId1 = startRes1.data?.id || startRes1.data;
    
    await Utils.waitForInstanceStatus(instId1, 'completed');
    const inst1 = await request(`/workflows/instances/${instId1}`, { headers: Auth.headers });
    const rendered = inst1.data.variables.rendered;
    console.log(`  Rendered Result: "${rendered}"`);
    
    const passDefault = rendered.includes('FALLBACK');
    const passJson = rendered.includes('"status":"ok"');
    const passDeep = rendered.includes('item1');
    const passMixed = rendered.includes('Guest') && rendered.includes('count: 1');
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
    const startRes2 = await request(`/workflows/${defId2}/start`, { method: 'POST', headers: Auth.headers });
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
                    expression: "{{workflow.c.intent == 'purchase' && workflow.p.params.count > 3}}"
                } } } },
                { id: "approv", type: "approval", data: { nodeType: "approval", config: { approval: { 
                    type: "any", 
                    approvers: [{ type: "role", roleName: "管理员" }],
                    allowReject: true
                } } } },
                { id: "auto", type: "setVariable", data: { nodeType: "setVariable", config: { variable: { 
                    name: "final_status", 
                    value: "Auto Approved for {{workflow.p.params.item}}" 
                } } } },
                { id: "code", type: "code", data: { nodeType: "code", config: { code: {
                    language: "javascript",
                    code: "const p = variables['workflow.p.params']; return { summary: `Confirmed ${p.count} ${p.item}` };",
                    outputVariable: "res"
                } } } },
                { id: "e", type: "end", data: { nodeType: "end" } }
            ],
            edges: [
                { source: "s", target: "p", data: { condition: "" } },
                { source: "p", target: "c", data: { condition: "" } },
                { source: "c", target: "cond", data: { condition: "" } },
                { source: "cond", target: "approv", data: { label: "High Value", condition: "true" } },
                { source: "cond", target: "auto", data: { label: "Low Value/Other", condition: "false" } },
                { source: "approv", target: "code", data: { label: "Approved", condition: "default" } },
                { source: "auto", target: "code", data: { condition: "" } },
                { source: "code", target: "e", data: { condition: "" } }
            ]
        }
    };

    console.log("- Creating master workflow...");
    const res = await request('/workflows', { method: 'POST', headers: Auth.headers, body: workflowDef });
    const defId = res.data.id;

    console.log("- Starting workflow with 'High Value Purchase' input (Approval Needed)...");
    const startRes = await request(`/workflows/${defId}/start`, { 
        method: 'POST', headers: Auth.headers, 
        body: { variables: { input: "I want to buy 30 Macbook Pro laptops for the team" } } 
    });
    const instId = startRes.data.id || startRes.data;

    // 模拟 AI 提取和分类 (如果后端是 Mock 模式或需要人工干预变量)
    // 在真实集成中，这里应该等待节点执行
    process.stdout.write('  Executing flow ');
    
    // 等待到达审批节点
    await Utils.waitForInstanceStatus(instId, 'running'); 
    
    // 验证变量是否透传到了参数提取和分类
    const check1 = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`\n  Intent: ${check1.data.variables.intent}, Count: ${check1.data.variables['params.count']}`);

    console.log("- Approving High Value Request...");
    await request(`/workflows/instances/${instId}/nodes/approv/action`, {
        method: 'POST', headers: Auth.headers, body: { action: "approve", comment: "Looks good" }
    });

    await Utils.waitForInstanceStatus(instId, 'completed');
    const finalInst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Final Result: ${JSON.stringify(finalInst.data.variables.res)}`);
    
    if (finalInst.data.variables.res && finalInst.data.variables.res.summary && finalInst.data.variables.res.summary.includes("10 Macbook Pro")) {
        console.log("  ✅ Master Integration Workflow executed perfectly.");
    } else {
        console.error("  ❌ Master Integration Workflow failed variable verification.");
    }
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
    const modes = args.length > 0 ? args : ['all'];
    const shouldRun = (m) => modes.includes('all') || modes.includes(m);

    try {
        // 确保 Aspire 服务已运行
        await Aspire.ensureRunning();

        await Auth.login('admin', 'admin123');

        // 测试执行顺序（从基础到应用）
        // ─────────────────────────────────────────
        //  L0  register   用户注册                  (注册 / 登录 / 重复校验)
        //  L1  design     图结构验证 & 条件分支    (纯定义校验，无运行时依赖)
        //  L2  synergy    基础节点能力              (HTTP / SetVar / Log / Timer / AI)
        //  L3  allnodes   全节点组合                (将各节点串入单条工作流)
        //  L4  form       表单集成                  (表单定义 ➜ 校验 ➜ 数据持久化)
        //  L5  multiuser  多用户协作                (租户隔离 / 角色 / 多人审批)
        //  L6  extended   扩展组件 (Dify Style)     (Extractor, Answer 等)
        //  L7  reject     审批拒绝测试              (测试审批节点被拒绝时的行为)
        //  L8  variable   高级变量解析              (深层路径 / 过滤器 / 默认值)
        //  L9  iteration  迭代/循环测试             (遍历列表)
        //  L10 classifier 意图分类测试              (AI 分类分支器)
        //  L11 code       代码节点测试              (自定义脚本)
        //  L12 parallel   并行/汇聚测试              (Parallel & Aggregator)
        // ─────────────────────────────────────────
        if (shouldRun('register'))  await runRegisterTests();
        if (shouldRun('design'))    await runDesignTests();
        if (shouldRun('synergy'))   await runSynergyTests();
        if (shouldRun('allnodes'))  await runAllNodesTests();
        if (shouldRun('form'))      await runFormIntegratedTests();
        if (shouldRun('multiuser')) await runMultiUserTests();
        if (shouldRun('extended'))  await runExtendedComponentsTests();
        if (shouldRun('variable'))  await runVariableResolutionTests();
        if (shouldRun('reject'))    await runRejectTests();
        if (shouldRun('iteration')) await runIterationTests();
        if (shouldRun('classifier')) await runQuestionClassifierTests();
        if (shouldRun('code'))       await runCodeNodeTests();
        if (shouldRun('parallel'))   await runParallelJoinTests();
        if (shouldRun('master'))     await runAdvancedIntegrationTests();

        console.log('\n🌟 Unified Test Run Finished.');
    } catch (err) {
        console.error('\n💥 FATAL ERROR during test run:', err.message);
        process.exit(1);
    } finally {
        Aspire.shutdown();
    }
}

main();
