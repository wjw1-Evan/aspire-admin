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
        return json;
    } catch {
        return text;
    }
}

async function runTests() {
    console.log('1. Logging in as admin...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'admin123', autoLogin: false }
    });

    if (!loginRes.success) {
        console.error('Login failed:', loginRes);
        return;
    }
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');

    const headers = { 'Authorization': `Bearer ${token}` };

    const userRes = await request('/auth/current-user', { headers });
    if (!userRes.success) {
        console.error('Failed to get current user:', userRes);
        return;
    }
    const userId = userRes.data.id;
    console.log(`Current user ID for approvals: ${userId}`);

    // Create a dummy company binding if not exists so approval resolvers match.
    // In many multi-tenant apps, the admin user might not have a strong binding to the generated company testing scope.
    // Try hitting an API indicating we want to be part of the created scopes.
    console.log(`Verifying/Adding user to active company scope...`);
    const myProfileRes = await request('/users/me', { headers });
    if (myProfileRes.success && myProfileRes.data.tenantId) {
        console.log(`  Current Tenant ID: ${myProfileRes.data.tenantId}`);
        // ensure we have user-company binding
        await request(`/user-companies`, {
            method: 'POST',
            headers,
            body: {
                userId: userId,
                companyId: myProfileRes.data.tenantId,
                status: 'active',
                isDefault: true
            }
        });
    }

    // Create 3 random workflows
    const workflows = [
        {
            name: "Test Synergy 1: Core IO & External (HTTP, SetVar, Log)",
            nodes: [
                { id: "start1", type: "start", label: "Start", x: 0, y: 0, config: {} },
                { id: "http1", type: "httpRequest", label: "HTTP Node", x: 200, y: 0, config: { http: { method: "GET", url: "https://httpbin.org/get", outputVariable: "fetch_res" } } },
                { id: "setVar1", type: "setVariable", label: "Set Variable", x: 400, y: 0, config: { variable: { name: "processed_res", value: "HTTP said: {fetch_res}" } } },
                { id: "log1", type: "log", label: "Log Msg", x: 600, y: 0, config: { log: { level: "info", message: "Result: {processed_res}" } } },
                { id: "end1", type: "end", label: "End", x: 800, y: 0, config: {} }
            ],
            edges: [
                { id: "e1", source: "start1", target: "http1" },
                { id: "e2", source: "http1", target: "setVar1" },
                { id: "e3", source: "setVar1", target: "log1" },
                { id: "e4", source: "log1", target: "end1" }
            ]
        },
        {
            name: "Test Synergy 2: AI Logic & Time (AI, AI Judge, Cond, Timer)",
            nodes: [
                { id: "start1", type: "start", label: "Start", x: 0, y: 0, config: {} },
                { id: "setVar1", type: "setVariable", label: "Inputs", x: 200, y: 0, config: { variable: { name: "user_input", value: "Translate 'Hello' to French" } } },
                { id: "ai1", type: "ai", label: "AI Translator", x: 400, y: 0, config: { ai: { inputVariable: "user_input", promptTemplate: "Please answer: {{inputVariable}}", outputVariable: "translated" } } },
                { id: "aiJudge1", type: "aiJudge", label: "AI Judge", x: 600, y: 0, config: { aiJudge: { inputVariable: "translated", judgePrompt: "这句翻译里是否包含 Bonjour？", outputVariable: "is_correct" } } },
                { id: "cond1", type: "condition", label: "Is Correct?", x: 800, y: 0, config: {} },
                // Use a short timer so we don't wait long
                { id: "timer1", type: "timer", label: "Timer", x: 1000, y: 0, config: { timer: { waitDuration: "00:00:03" } } },
                { id: "end1", type: "end", label: "End True", x: 1200, y: 0, config: {} },
                { id: "end2", type: "end", label: "End False", x: 1000, y: 200, config: {} }
            ],
            edges: [
                { id: "e1", source: "start1", target: "setVar1" },
                { id: "e2", source: "setVar1", target: "ai1" },
                { id: "e3", source: "ai1", target: "aiJudge1" },
                { id: "e4", source: "aiJudge1", target: "cond1" },
                { id: "e5", source: "cond1", target: "timer1", condition: "{is_correct} == 'true'" },
                { id: "e6", source: "cond1", target: "end2", condition: "default" },
                { id: "e7", source: "timer1", target: "end1" }
            ]
        },
        {
            name: "Test Synergy 3: Human & Structure (Approval, Parallel, Notify)",
            nodes: [
                { id: "start1", type: "start", label: "Start", x: 0, y: 0, config: {} },
                { id: "para_split", type: "parallel", label: "Split", x: 200, y: 0, config: {} },

                // Branch 1: Auto Approval assigned to current user explicitly
                { id: "approval1", type: "approval", label: "Manual Approve", x: 400, y: -100, config: { approval: { type: process.env.APPROVE_TYPE || 0 /* All */, timeoutHours: 1, approvers: [{ type: 0 /* User */, userId: userId }] } } },

                // Branch 2: Notification sent to current user explicitly
                { id: "notify1", type: "notification", label: "Notify", x: 400, y: 100, config: { notification: { actionType: "info", recipients: [{ type: 0 /* User */, userId: userId }], remarksTemplate: "Parallel branch running" } } },

                { id: "para_join", type: "parallel", label: "Join", x: 600, y: 0, config: {} },
                { id: "end1", type: "end", label: "End", x: 800, y: 0, config: {} }
            ],
            edges: [
                { id: "e1", source: "start1", target: "para_split" },
                { id: "e2", source: "para_split", target: "approval1" },
                { id: "e3", source: "para_split", target: "notify1" },
                { id: "e4", source: "approval1", target: "para_join" },
                { id: "e5", source: "notify1", target: "para_join" },
                { id: "e6", source: "para_join", target: "end1" }
            ]
        }
    ];

    for (const [i, wf] of workflows.entries()) {
        console.log(`\n--- Running Workflow ${i + 1}: ${wf.name} ---`);
        let createRes = await request('/workflows', {
            method: 'POST',
            headers,
            body: {
                name: wf.name,
                description: "Auto generated test",
                category: "Test",
                isActive: true,
                graph: { nodes: wf.nodes, edges: wf.edges }
            }
        });

        if (!createRes.success) {
            console.error("Failed to create workflow:", createRes);
            continue;
        }

        const definitionId = createRes.data.id || createRes.data;
        console.log(`Created Definition ID: ${definitionId}`);

        console.log(`Creating a blank document for the workflow...`);
        const docRes = await request('/documents', {
            method: 'POST',
            headers,
            body: { title: `Test Document for ${wf.name}`, content: "Auto-generated test document" }
        });

        let docId = '';
        if (docRes.success && docRes.data && docRes.data.id) {
            docId = docRes.data.id;
            console.log(`Created Document ID: ${docId}, CompanyId: ${docRes.data.companyId}`);
        } else {
            console.error("Failed to create document:", docRes);
            continue;
        }

        console.log(`Starting workflow instance...`);
        const startRes = await request(`/workflows/${definitionId}/start`, {
            method: 'POST',
            headers,
            body: { documentId: docId }
        });

        if (!startRes.success && startRes.message !== 'Workflow started') {
            if (startRes.data?.id) { } else {
                console.error("Failed to start:", startRes);
                continue;
            }
        }

        const instanceId = startRes.data ? (startRes.data.id || startRes.data) : null;
        if (!instanceId) {
            console.error("Could not extract instance ID from response:", startRes);
            continue;
        }

        console.log(`Workflow Instance ID: ${instanceId}`);

        // Polling and automatic approval specifically for Synergy 3 workflow where we requested it
        if (i === 2) {
            console.log(`  Waiting and polling for pending approvals...`);
            let pendingTaskFound = false;
            // Pole a few times for the notification of pending approval
            for (let p = 0; p < 8; p++) {
                await new Promise(r => setTimeout(r, 2000));

                const pendingRes = await request(`/workflows/instances/todo?current=1&pageSize=10`, { headers });
                if (pendingRes.success && pendingRes.data && pendingRes.data.list) {
                    const task = pendingRes.data.list.find(x => x.id === instanceId);
                    if (task && task.currentNode) {
                        console.log(`  Found pending approval task at Node [${task.currentNode.id}]`);
                        pendingTaskFound = true;

                        // Perform the actual approval simulating user action
                        console.log(`  Submitting approval decision...`);
                        const approveRes = await request(`/workflows/instances/${instanceId}/nodes/${task.currentNode.id}/action`, {
                            method: 'POST',
                            headers,
                            body: { action: "approve", comment: "I manually approve this! Tests passed!" }
                        });
                        console.log(`  Approve result: ${approveRes.success}`);
                        break;
                    }
                }
                console.log(`    poll ${p + 1}: not found yet...`);
            }
            if (!pendingTaskFound) {
                console.log(`  Warning: Could not find pending approval in the specified time. It might be blocked or completed.`);
            }
        }

        console.log(`Waiting for completion (Polling status)...`);

        let status = 'Running';
        for (let j = 0; j < 15; j++) {
            await new Promise(r => setTimeout(r, 2000));

            const listRes = await request(`/workflows/instances?skip=0&take=10&definitionId=${definitionId}`, { headers });

            if (listRes.success && listRes.data && listRes.data.list) {
                const instance = listRes.data.list.find(x => x.id === instanceId);
                if (instance) {
                    status = instance.status === 0 ? 'running' : instance.status === 1 ? 'completed' : instance.status === 2 ? 'cancelled' : instance.status === 4 ? 'waiting' : instance.status;
                    console.log(`  [Poll ${j + 1}] Status: ${status}`);
                    if (status === 'completed' || status === 'cancelled') {
                        break;
                    }
                } else {
                    console.log(`  [Poll ${j + 1}] Could not find instance in list.`);
                }
            } else {
                console.log(`  [Poll ${j + 1}] List API error`, listRes);
            }
        }

        console.log(`Workflow ${i + 1} finished with status: ${status}`);

        // If it got stuck, dump history for debugging
        if (status === 'running') {
            const statusResEnd = await request(`/workflows/instances/${instanceId}`, { headers });
            console.log(`\n--- Workflow stuck. Instance State ---`);
            console.log(JSON.stringify(statusResEnd.data, null, 2));

            console.log(`\n--- Workflow stuck. Dumping history ---`);
            const historyRes = await request(`/workflows/instances/${instanceId}/history`, { headers });
            console.log(JSON.stringify(historyRes, null, 2));
        }
    }
}

runTests().catch(console.error);
