const fs = require('fs');
const { spawn } = require('child_process');

/**
 * --- Aspire Admin Unified API Test Suite ---
 * Consolidates:
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
    const workflows = [
        {
            name: "Synergy 1: IO & External (HTTP, SetVar, Log)",
            nodes: [
                { id: "start1", type: "start", label: "Start" },
                { id: "http1", type: "httpRequest", label: "HTTP Node", config: { http: { method: "GET", url: "https://httpbin.org/get", outputVariable: "fetch_res" } } },
                { id: "setVar1", type: "setVariable", label: "Set Variable", config: { variable: { name: "processed_res", value: "HTTP said: {fetch_res}" } } },
                { id: "log1", type: "log", label: "Log Msg", config: { log: { level: "info", message: "Result: {processed_res}" } } },
                { id: "end1", type: "end", label: "End" }
            ],
            edges: [
                { id: "e1", source: "start1", target: "http1" }, { id: "e2", source: "http1", target: "setVar1" },
                { id: "e3", source: "setVar1", target: "log1" }, { id: "e4", source: "log1", target: "end1" }
            ]
        },
        {
            name: "Synergy 2: AI & Timer (AI, Judge, Cond, Timer)",
            nodes: [
                { id: "s1", type: "start", label: "Start" },
                { id: "sv1", type: "setVariable", label: "Inputs", config: { variable: { name: "user_input", value: "Translate 'Hello' to French" } } },
                { id: "ai1", type: "ai", label: "AI", config: { ai: { inputVariable: "user_input", promptTemplate: "Answer: {{inputVariable}}", outputVariable: "translated" } } },
                { id: "aj1", type: "aiJudge", label: "Judge", config: { aiJudge: { inputVariable: "translated", judgePrompt: "Contains Bonjour?", outputVariable: "is_correct" } } },
                { id: "c1", type: "condition", label: "Decision" },
                { id: "t1", type: "timer", label: "Timer", config: { timer: { waitDuration: "00:00:02" } } },
                { id: "e-ok", type: "end", label: "End True" },
                { id: "e-fail", type: "end", label: "End False" }
            ],
            edges: [
                { id: "e1", source: "s1", target: "sv1" }, { id: "e2", source: "sv1", target: "ai1" },
                { id: "e3", source: "ai1", target: "aj1" }, { id: "e4", source: "aj1", target: "c1" },
                { id: "e5", source: "c1", target: "t1", condition: "{is_correct} == 'true'" },
                { id: "e6", source: "c1", target: "e-fail", condition: "default" },
                { id: "e7", source: "t1", target: "e-ok" }
            ]
        }
    ];

    for (const wf of workflows) {
        console.log(`\n- Workflow: ${wf.name}`);
        const body = {
            name: wf.name,
            category: 'Synergy',
            isActive: true,
            graph: {
                nodes: wf.nodes,
                edges: wf.edges
            }
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
        for (let i = 0; i < 30; i++) { // Increased to 60s (30 * 2s) for AI/HTTP latency
            await new Promise(r => setTimeout(r, 2000));
            const instRes = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
            if (!instRes.success) continue;
            // WorkflowStatus enum: Running = 0, Completed = 1, Failed = 2, Terminated = 3
            if (instRes.data.status === 1) {
                status = 'completed';
                break;
            }
            if (instRes.data.status === 2 || instRes.data.status === 3) {
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
        body: { name: "DupID", graph: { nodes: [{ id: "n1", type: "start" }, { id: "n1", type: "end" }], edges: [] } }
    });
    console.log(res1.message.includes("重复") ? "  ✅ Expected Error Caught" : "  ❌ Validation Failed");

    console.log('- Testing Condition Branching (Amount Logic)...');
    const def = {
        name: "Condition Test",
        graph: {
            nodes: [
                { id: "s", type: "start" }, { id: "c", type: "condition" },
                { id: "h", type: "end", label: "High" }, { id: "l", type: "end", label: "Low" }
            ],
            edges: [
                { source: "s", target: "c" },
                { source: "c", target: "h", condition: "amount > 1000" },
                { source: "c", target: "l", condition: "default" }
            ]
        }
    };
    const defRes = await request('/workflows', { method: 'POST', headers: Auth.headers, body: def });
    const defId = defRes.data.id;

    const testCases = [{ amt: 5000, expected: 'h' }, { amt: 100, expected: 'l' }];
    for (const tc of testCases) {
        const docRes = await request('/documents', { method: 'POST', headers: Auth.headers, body: { title: `Branching ${tc.amt}`, content: "." } });
        const startRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: { documentId: docRes.data.id, variables: { amount: tc.amt } } });
        const instId = startRes.data?.id || startRes.data;
        await new Promise(r => setTimeout(r, 2000)); // 等待工作流执行完成
        const instRes = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
        const finalNode = instRes.data?.currentNodeId || '(unknown)';
        console.log(`  Amount ${tc.amt} -> Landed on ${finalNode}: ${finalNode === tc.expected ? '✅' : '❌'}`);
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
        graph: {
            nodes: [
                { id: 's', type: 'start' },
                { id: 'n1', type: 'approval', config: { approval: { type: 'any', approvers: [{ type: 'user', userId: app1.id }] } } },
                { id: 'n2', type: 'approval', config: { approval: { type: 'any', approvers: [{ type: 'user', userId: app2.id }] } } },
                { id: 'e', type: 'end' }
            ],
            edges: [{ source: 's', target: 'n1' }, { source: 'n1', target: 'n2' }, { source: 'n2', target: 'e' }]
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
    const head1 = { 'Authorization': `Bearer ${login1.data.token}` };
    await request('/company/switch', { method: 'POST', headers: head1, body: { targetCompanyId: company.id } });
    await request(`/documents/${docId}/approve`, { method: 'POST', headers: head1, body: { comment: "First OK" } });
    console.log('  Approver 1 approved.');

    // Login and approve as App2
    const login2 = await request('/auth/login', { method: 'POST', body: { username: app2.username, password: 'Password123!', autoLogin: false } });
    if (!login2.success) throw new Error(`App2 login failed: ${login2.message}`);
    const head2 = { 'Authorization': `Bearer ${login2.data.token}` };
    await request('/company/switch', { method: 'POST', headers: head2, body: { targetCompanyId: company.id } });
    await request(`/documents/${docId}/approve`, { method: 'POST', headers: head2, body: { comment: "Second OK" } });
    console.log('  Approver 2 approved.');

    await new Promise(r => setTimeout(r, 2000));
    const finalRes = await request(`/documents/${docId}`, { headers: Auth.headers });
    console.log(`  Document Status: ${finalRes.data.document.status} - ${finalRes.data.document.status === 'approved' ? '✅' : '❌'}`);
}

/**
 * [L3] 全节点组合测试 (All-Components)
 * 将各节点串入单条工作流一次性验证
 */
async function runAllNodesTests() {
     console.log('\n=== RUNNING ALL-COMPONENT WORKFLOW TEST ===');
     // Reuse logic from Synergy but combine into one massive WF
     const workflowDef = {
        name: `All-Components-Master`,
        graph: {
            nodes: [
                { id: 'start', type: 'start' },
                { id: 'log', type: 'log', config: { log: { message: 'Master WF Started' } } },
                { id: 'setVar', type: 'setVariable', config: { variable: { name: 'score', value: '100' } } },
                { id: 'http', type: 'httpRequest', config: { http: { method: 'GET', url: 'https://httpbin.org/get', outputVariable: 'res' } } },
                { id: 'ai', type: 'ai', config: { ai: { promptTemplate: 'Analyze {score}', outputVariable: 'analysis' } } },
                { id: 'end', type: 'end' }
            ],
            edges: [
                { source: 'start', target: 'log' }, { source: 'log', target: 'setVar' },
                { source: 'setVar', target: 'http' }, { source: 'http', target: 'ai' },
                { source: 'ai', target: 'end' }
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
                { id: "start", type: "start", label: "Start", config: { form: { formDefinitionId: formId, target: "Document", required: true } } },
                { id: "approval", type: "approval", label: "Manager Review", config: { 
                    approval: { type: "Any", approvers: [{ type: "User", userId: Auth.userId }] },
                    form: { formDefinitionId: formId, target: "Document" } 
                } },
                { id: "end", type: "end", label: "End" }
            ],
            edges: [
                { id: "e1", source: "start", target: "approval" },
                { id: "e2", source: "approval", target: "end", label: "Approve", condition: "default" }
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
    await request(`/workflows/instances/${instId}/approve`, {
        method: 'POST',
        headers: Auth.headers,
        body: { nodeId: "approval", remark: "OK" }
    });

    // 8. Final check
    await new Promise(r => setTimeout(r, 2000));
    const finalInst = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
    console.log(`  Final Workflow Status: ${finalInst.data.status === 1 ? "✅ COMPLETED" : "❌ " + finalInst.data.status}`);
}

/**
 * [L6] 数据层诊断 (MongoDB)
 * 直连 MongoDB 查询最新文档，验证端到端数据持久化
 */
async function runMongoTests() {
    console.log('\n=== RUNNING MONGODB DIRECT QUERY ===');
    
    // Aspire 动态端口，默认 57428，可通过环境变量覆盖
    const port = process.env.MONGO_PORT || '57428';
    const dbName = 'aspire-admin-db';
    const uri = `mongodb://admin:admin123@localhost:${port}/${dbName}?authSource=admin`;
    
    try {
        const { execSync } = require('child_process');
        console.log(`- Connection to ${uri} via mongosh...`);
        
        const query = 'db.documents.find({}).sort({_id: -1}).limit(3).toArray()';
        const cmd = `mongosh "${uri}" --quiet --eval 'JSON.stringify(${query})'`;
        
        const output = execSync(cmd).toString();
        const docs = JSON.parse(output);
        
        console.log(`  ✅ 查询到 ${docs.length} 条最新文档：`);
        for (const d of docs) {
            console.log(`  - _id: ${d._id.$oid || d._id}, title: ${d.title}, formData keys: ${Object.keys(d.formData || {}).join(', ') || '(empty)'}`);
            if (d.formData) console.log(`    formData: ${JSON.stringify(d.formData)}`);
        }
    } catch (err) {
        console.log(`  ❌ MongoDB 查询失败: ${err.message}`);
        console.log('  (确保系统中安装了 mongosh 且 Aspire 容器正在运行)');
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
        this.proc.stdout.on('data', d => {
            const line = d.toString().trim();
            if (line) process.stdout.write(`  [AppHost] ${line}\n`);
        });
        this.proc.stderr.on('data', d => {
            const line = d.toString().trim();
            if (line) process.stderr.write(`  [AppHost:err] ${line}\n`);
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
    const mode = args[0] || 'all';

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
        //  L6  mongo      数据层诊断                (MongoDB 直查，验证持久化)
        // ─────────────────────────────────────────
        if (mode === 'all' || mode === 'register')  await runRegisterTests();
        if (mode === 'all' || mode === 'design')    await runDesignTests();
        if (mode === 'all' || mode === 'synergy')   await runSynergyTests();
        if (mode === 'all' || mode === 'allnodes')  await runAllNodesTests();
        if (mode === 'all' || mode === 'form')      await runFormIntegratedTests();
        if (mode === 'all' || mode === 'multiuser') await runMultiUserTests();
        if (mode === 'all' || mode === 'mongo')     await runMongoTests();

        console.log('\n🌟 Unified Test Run Finished.');
    } catch (err) {
        console.error('\n💥 FATAL ERROR during test run:', err.message);
        process.exit(1);
    } finally {
        Aspire.shutdown();
    }
}

main();
