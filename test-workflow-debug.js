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
        return { status: res.status, json: json };
    } catch {
        return { status: res.status, text: text };
    }
}

async function runTests() {
    console.log('1. Logging in as admin...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password1', autoLogin: false }
    });
    const token = loginRes.json.data.token;
    const adminId = loginRes.json.data.user?.id || '69a7f8cdd60e6dc6a3668856';
    const headers = { 'Authorization': `Bearer ${token}` };

    const definition = {
        name: "并行同步测试 Debug",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                { id: "fork", type: "parallel", name: "并行分发" },
                { id: "p1", type: "approval", name: "并行分支1", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "p2", type: "approval", name: "并行分支2", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "join", type: "parallel", name: "并行汇聚" },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "fork" },
                { id: "e2", source: "fork", target: "p1" },
                { id: "e3", source: "fork", target: "p2" },
                { id: "e4", source: "p1", target: "join" },
                { id: "e5", source: "p2", target: "join" },
                { id: "e6", source: "join", target: "end" }
            ]
        }
    };

    const defRes = await request('/workflows', { method: 'POST', headers, body: definition });
    const defId = defRes.json.data.id;
    const docRes = await request('/documents', { method: 'POST', headers, body: { title: "并行测试", content: "..." } });
    const instRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes.json.data.id } });
    const instanceId = instRes.json.data.id;

    console.log('测试 3.1: 审批第一个分支 p1');
    const res1 = await request(`/workflows/instances/${instanceId}/nodes/p1/action`, { method: 'POST', headers, body: { action: 'approve' } });
    console.log('RES1:', JSON.stringify(res1));

    console.log('测试 3.2: 审批第一个分支 p2');
    const res2 = await request(`/workflows/instances/${instanceId}/nodes/p2/action`, { method: 'POST', headers, body: { action: 'approve' } });
    console.log('RES2:', JSON.stringify(res2));

    let inst = await request(`/workflows/instances/${instanceId}`, { headers });
    console.log('Inst status:', inst.json.data.status);
    console.log('Inst parallelBranches:', inst.json.data.parallelBranches);
}

runTests().catch(console.error);
