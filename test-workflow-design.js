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
        return { success: false, data: text };
    }
}

async function runTests() {
    console.log('1. Logging in as admin...');
    const loginRes = await request('/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password1', autoLogin: false }
    });

    if (!loginRes.success) {
        console.error('Login failed:', JSON.stringify(loginRes));
        return;
    }

    const token = loginRes.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    const myProfileRes = await request('/auth/current-user', { headers });
    const profile = myProfileRes.data || {};
    const adminId = profile.id;

    console.log('\n--- 阶段 1: 设计校验测试 (Negative Cases) ---');

    // 1.1 重复节点 ID
    console.log('测试 1.1: 重复节点 ID');
    const res11 = await request('/workflows', {
        method: 'POST',
        headers,
        body: {
            name: "重复ID测试",
            graph: {
                nodes: [
                    { id: "node1", type: "start", name: "开始" },
                    { id: "node1", type: "end", name: "结束" }
                ],
                edges: [{ id: "e1", source: "node1", target: "node1" }]
            }
        }
    });
    checkError(res11, "存在重复的节点ID");

    // 1.2 缺少开始节点
    console.log('测试 1.2: 缺少开始节点');
    const res12 = await request('/workflows', {
        method: 'POST',
        headers,
        body: {
            name: "无开始节点测试",
            graph: {
                nodes: [{ id: "end", type: "end", name: "结束" }],
                edges: []
            }
        }
    });
    checkError(res12, "流程必须包含开始节点");

    // 1.3 存在不可达节点
    console.log('测试 1.3: 存在不可达节点');
    const res13 = await request('/workflows', {
        method: 'POST',
        headers,
        body: {
            name: "不可达节点测试",
            graph: {
                nodes: [
                    { id: "start", type: "start", name: "开始" },
                    { id: "app1", type: "approval", name: "审批", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                    { id: "isolated", type: "approval", name: "孤立节点", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                    { id: "end", type: "end", name: "结束" }
                ],
                edges: [
                    { id: "e1", source: "start", target: "app1" },
                    { id: "e2", source: "app1", target: "end" }
                ]
            }
        }
    });
    checkError(res13, "存在从开始节点不可达的节点");

    console.log('\n--- 阶段 2: 运行时分支测试 (Condition Branching) ---');
    await testConditionBranching(token, adminId);

    console.log('\n--- 阶段 3: 并行网关同步测试 (Parallel Gateway Join) ---');
    await testParallelJoin(token, adminId);

    console.log('\n--- 阶段 4: 顺序多签审批测试 (Sequential Approval) ---');
    await testSequentialApproval(token, adminId);

    console.log('\n--- 阶段 5: 退回与拒绝测试 (Return and Reject) ---');
    await testRejectAndReturn(token, adminId);

    console.log('\n--- 所有设计测试完成 ---');
}

function checkError(res, expectedPart) {
    if (!res.success && res.message && res.message.includes(expectedPart)) {
        console.log(`  ✅ 预期错误拦截成功: ${res.message}`);
    } else {
        console.error(`  ❌ 错误拦截失败! 得到: ${JSON.stringify(res)}`);
    }
}

async function testConditionBranching(token, adminId) {
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "条件分支测试-金额校验",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                { id: "cond1", type: "condition", name: "金额判断" },
                { id: "high", type: "approval", name: "高额审批", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "low", type: "approval", name: "低额审批", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "cond1" },
                { id: "e2", source: "cond1", target: "high", condition: "amount > 1000" },
                { id: "e3", source: "cond1", target: "low", condition: "default" },
                { id: "e4", source: "high", target: "end" },
                { id: "e5", source: "low", target: "end" }
            ]
        }
    };

    const defRes = await request('/workflows', { method: 'POST', headers, body: definition });
    const defId = defRes.data.id;

    // 情况 A: Amount = 5000 (应该走 high)
    console.log('测试 2.1: 金额 5000 -> 应该进入 high 节点');
    const docRes1 = await request('/documents', { method: 'POST', headers, body: { title: "高额申请", content: "...", formData: { amount: 5000 } } });
    const instRes1 = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes1.data.id, variables: { amount: 5000 } } });
    const inst1 = await request(`/workflows/instances/${instRes1.data.id}`, { headers });
    console.log(`  当前节点: ${inst1.data.currentNodeId}`);
    if (inst1.data.currentNodeId === 'high') console.log('  ✅ 分支正确'); else console.error('  ❌ 分支错误');

    // 情况 B: Amount = 100 (应该走 low/default)
    console.log('测试 2.2: 金额 100 -> 应该进入 low 节点');
    const docRes2 = await request('/documents', { method: 'POST', headers, body: { title: "低额申请", content: "...", formData: { amount: 100 } } });
    const instRes2 = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes2.data.id, variables: { amount: 100 } } });
    const inst2 = await request(`/workflows/instances/${instRes2.data.id}`, { headers });
    console.log(`  当前节点: ${inst2.data.currentNodeId}`);
    if (inst2.data.currentNodeId === 'low') console.log('  ✅ 分支正确'); else console.error('  ❌ 分支错误');
}

async function testParallelJoin(token, adminId) {
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "并行同步测试",
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
    const defId = defRes.data.id;
    const docRes = await request('/documents', { method: 'POST', headers, body: { title: "并行测试", content: "..." } });
    const instRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes.data.id } });
    const instanceId = instRes.data.id;

    console.log('测试 3.1: 审批第一个分支 p1');
    await request(`/workflows/instances/${instanceId}/nodes/p1/action`, { method: 'POST', headers, body: { action: 'approve' } });
    let inst = await request(`/workflows/instances/${instanceId}`, { headers });
    console.log(`  当前状态: ${inst.data.status}, 汇聚点分支已完成列表: ${JSON.stringify(inst.data.parallelBranches?.join || [])}`);

    if (inst.data.status !== 1) { // 1 = Completed, it should NOT be completed yet
        console.log('  ✅ 流程未结束，符合预期（等待 p2）');
    } else {
        console.error('  ❌ 流程意外结束！');
    }

    console.log('测试 3.2: 审批第二个分支 p2');
    await request(`/workflows/instances/${instanceId}/nodes/p2/action`, { method: 'POST', headers, body: { action: 'approve' } });
    inst = await request(`/workflows/instances/${instanceId}`, { headers });
    console.log(`  当前状态: ${inst.data.status}`);
    if (inst.data.status === 1 || inst.data.status === 'completed') {
        console.log('  ✅ 流程顺利通过汇聚点并结束');
    } else {
        console.error('  ❌ 流程未能结束');
        console.log(JSON.stringify(inst.data, null, 2));
    }
}

async function testSequentialApproval(token, adminId) {
    const headers = { 'Authorization': `Bearer ${token}` };

    // Create or login as second user for sequential test
    let secondToken = '';
    let secondUserId = '';
    const regRes = await request('/auth/register', { method: 'POST', body: { username: 'wf_tester', password: 'password1', email: 'test@wf.com' } });

    const loginRes2 = await request('/auth/login', { method: 'POST', body: { username: 'wf_tester', password: 'password1', autoLogin: false } });
    if (loginRes2.success) {
        secondToken = loginRes2.data.token;
        const profile2 = await request('/auth/current-user', { headers: { 'Authorization': `Bearer ${secondToken}` } });
        secondUserId = profile2.data?.id;
    }

    if (!secondUserId || secondUserId === adminId) {
        console.log('  ⚠️ 无法获取第二个独立用户，跳过顺序审批真实多签测试');
        return;
    }

    const definition = {
        name: "顺序审批测试",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                {
                    id: "seq1",
                    type: "approval",
                    name: "顺序多签",
                    config: {
                        approval: {
                            type: 2, // Sequential
                            approvers: [
                                { type: 0, userId: adminId },
                                { type: 0, userId: secondUserId }
                            ]
                        }
                    }
                },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "seq1" },
                { id: "e2", source: "seq1", target: "end" }
            ]
        }
    };

    const defRes = await request('/workflows', { method: 'POST', headers, body: definition });
    const defId = defRes.data.id;
    const docRes = await request('/documents', { method: 'POST', headers, body: { title: "顺序审批", content: "..." } });
    const instRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes.data.id } });
    const instanceId = instRes.data.id;

    console.log('测试 4.1: 第一人次审批 (Admin)');
    await request(`/workflows/instances/${instanceId}/nodes/seq1/action`, { method: 'POST', headers, body: { action: 'approve' } });
    let inst = await request(`/workflows/instances/${instanceId}`, { headers });

    if (inst.data.status !== 'completed' && inst.data.status !== 1) {
        console.log('  ✅ 流程未结束，正在等待第二人次审批');
    } else {
        console.error('  ❌ 流程意外结束！');
        return;
    }

    console.log('测试 4.2: 第二人次审批 (WF_Tester)');
    const headers2 = { 'Authorization': `Bearer ${secondToken}` };
    await request(`/workflows/instances/${instanceId}/nodes/seq1/action`, { method: 'POST', headers: headers2, body: { action: 'approve' } });
    inst = await request(`/workflows/instances/${instanceId}`, { headers });
    if (inst.data.status === 'completed' || inst.data.status === 1) {
        console.log('  ✅ 流程顺利完成全部顺序审批阶段并结束');
    } else {
        console.error('  ❌ 流程未能结束:', inst.data.status);
    }
}

async function testRejectAndReturn(token, adminId) {
    const headers = { 'Authorization': `Bearer ${token}` };
    const definition = {
        name: "退回与拒绝测试",
        graph: {
            nodes: [
                { id: "start", type: "start", name: "开始" },
                { id: "app1", type: "approval", name: "第一环节", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "app2", type: "approval", name: "第二环节", config: { approval: { type: 1, approvers: [{ type: 0, userId: adminId }] } } },
                { id: "end", type: "end", name: "结束" }
            ],
            edges: [
                { id: "e1", source: "start", target: "app1" },
                { id: "e2", source: "app1", target: "app2" },
                { id: "e3", source: "app2", target: "end" }
            ]
        }
    };

    const defRes = await request('/workflows', { method: 'POST', headers, body: definition });
    const defId = defRes.data.id;

    // Case 1: Return
    console.log('测试 5.1: 退回节点');
    let docRes = await request('/documents', { method: 'POST', headers, body: { title: "退回测试", content: "..." } });
    let instRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes.data.id } });
    let instanceId = instRes.data.id;

    await request(`/workflows/instances/${instanceId}/nodes/app1/action`, { method: 'POST', headers, body: { action: 'approve' } }); // pass app1

    const returnRes = await request(`/workflows/instances/${instanceId}/nodes/app2/action`, { method: 'POST', headers, body: { action: 'return', comment: '打回重做', targetNodeId: 'app1' } });
    let inst = await request(`/workflows/instances/${instanceId}`, { headers });
    if (inst.data.currentNodeId === 'app1') {
        console.log('  ✅ 流程成功退回到第一环节');
    } else {
        console.error('  ❌ 退回失败，当前节点:', inst.data.currentNodeId);
    }

    // Case 2: Reject
    console.log('测试 5.2: 拒绝流程');
    docRes = await request('/documents', { method: 'POST', headers, body: { title: "拒绝测试", content: "..." } });
    instRes = await request(`/workflows/${defId}/start`, { method: 'POST', headers, body: { documentId: docRes.data.id } });
    instanceId = instRes.data.id;

    const rejectRes = await request(`/workflows/instances/${instanceId}/nodes/app1/action`, { method: 'POST', headers, body: { action: 'reject', comment: '不同意' } });
    inst = await request(`/workflows/instances/${instanceId}`, { headers });
    if (inst.data.status === 'rejected' || inst.data.status === 2) {
        console.log('  ✅ 流程成功变为拒绝状态');
    } else {
        console.error('  ❌ 拒绝失败，当前状态:', inst.data.status);
    }
}

runTests().catch(console.error);
