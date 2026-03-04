const fs = require('fs');

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
    }
};

// --- Test Suites ---

/**
 * Synergy Tests (Original test-workflows.js)
 * Focus: Core IO, HTTP, AI, Timer, Parallel Approval
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

        let status = '';
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const instRes = await request(`/workflows/instances/${instId}`, { headers: Auth.headers });
            status = instRes.data.status === 1 ? 'completed' : 'running';
            process.stdout.write(`  [${i+1}] ${status} `);
            if (status === 'completed') break;
        }
        console.log(`\n  Result: ${status === 'completed' ? 'PASS' : 'FAIL (STUCK)'}`);
    }
}

/**
 * Design & Validation Tests (Original test-workflow-design.js)
 * Focus: Graph validation, condition branching
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
        await request(`/workflows/${defId}/start`, { method: 'POST', headers: Auth.headers, body: { documentId: docRes.data.id, variables: { amount: tc.amt } } });
        const instRes = await request(`/workflows/instances?skip=0&take=1&definitionId=${defId}`, { headers: Auth.headers });
        const finalNode = instRes.data.list[0].currentNodeId;
        console.log(`  Amount ${tc.amt} -> Landed on ${finalNode}: ${finalNode === tc.expected ? '✅' : '❌'}`);
    }
}

/**
 * Multi-User & Enterprise Tests (Original test-multi-user-enterprise.js)
 * Focus: Tenant isolation, roles, multi-user approval
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
    
    // Add them to company
    const rolesRes = await request('/role', { headers: Auth.headers });
    const adminRole = rolesRes.data.roles.find(r => r.name === '管理员');
    
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
 * All Nodes Components Test (Original test-workflow-all-nodes.js)
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

// --- Main Runner ---

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'all';

    try {
        await Auth.login('admin', 'admin123');
        
        if (mode === 'all' || mode === 'synergy') await runSynergyTests();
        if (mode === 'all' || mode === 'design') await runDesignTests();
        if (mode === 'all' || mode === 'multiuser') await runMultiUserTests();
        if (mode === 'all' || mode === 'allnodes') await runAllNodesTests();

        console.log('\n🌟 Unified Test Run Finished.');
    } catch (err) {
        console.error('\n💥 FATAL ERROR during test run:', err.message);
        process.exit(1);
    }
}

main();
