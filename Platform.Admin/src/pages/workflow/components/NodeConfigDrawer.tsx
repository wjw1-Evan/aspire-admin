import React from 'react';
import { Button, Card, Drawer, Form, Input, Select, Switch, Space, Divider, Tabs, Mentions, FormInstance } from 'antd';
import { DeleteOutlined, SaveOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { NODE_CONFIGS } from './WorkflowDesignerConstants';
import { Node } from 'reactflow';
import type { AppUser } from '@/services/user/api';
import type { Role } from '@/services/role/api';
import type { FormDefinition } from '@/services/form/api';

const { Option } = Mentions;

export interface NodeConfigDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  configForm: FormInstance;
  onSaveConfig: () => void;
  onDeleteNode: () => void;
  readOnly?: boolean;
  users: AppUser[];
  roles: Role[];
  forms: FormDefinition[];
  availableVariables: { label: string; value: string }[];
}

const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  visible,
  onClose,
  selectedNode,
  configForm,
  onSaveConfig,
  onDeleteNode,
  readOnly = false,
  users,
  roles,
  forms,
  availableVariables,
}) => {
  const intl = useIntl();

  return (
    <Drawer
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#3b82f6' }} />
          <span>{intl.formatMessage({ id: 'pages.workflow.designer.nodeConfig' })}</span>
        </Space>
      }
      open={visible}
      onClose={onClose}
      size="large"
      className="node-drawer"
      extra={
        <Space>
          {selectedNode?.data.nodeType !== 'start' && !readOnly && (
            <Button danger icon={<DeleteOutlined />} onClick={onDeleteNode}>
              {intl.formatMessage({ id: 'pages.workflow.designer.delete' })}
            </Button>
          )}
          <Button onClick={onClose}>{intl.formatMessage({ id: 'pages.workflow.designer.cancel' })}</Button>
          <Button type="primary" onClick={onSaveConfig} icon={<SaveOutlined />} disabled={readOnly}>
            {intl.formatMessage({ id: 'pages.workflow.designer.save' })}
          </Button>
        </Space>
      }
    >
      <Form form={configForm} layout="vertical" disabled={readOnly}>
        <Tabs
          defaultActiveKey="basic"
          className="config-tabs"
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <>
                  <Form.Item name="nodeType" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeType' })}>
                    <Select disabled>
                      {Object.keys(NODE_CONFIGS).map(key => (
                        <Select.Option key={key} value={key}>
                          {intl.formatMessage({ id: `pages.workflow.designer.add${key.charAt(0).toUpperCase() + key.slice(1)}` })}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="label" label={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} rules={[{ required: true }]}>
                    <Input placeholder={intl.formatMessage({ id: 'pages.workflow.designer.nodeLabel' })} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'business',
              label: '业务规则',
              children: (
                <>
                  {selectedNode?.data.nodeType === 'approval' && (
                    <>
                      <Form.Item
                        name="approvalType"
                        label={intl.formatMessage({ id: 'pages.workflow.designer.approvalType' })}
                      >
                        <Select>
                          <Select.Option value={0}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.all' })}</Select.Option>
                          <Select.Option value={1}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.any' })}</Select.Option>
                          <Select.Option value={2}>{intl.formatMessage({ id: 'pages.workflow.designer.approvalType.sequential' })}</Select.Option>
                        </Select>
                      </Form.Item>

                      <Divider titlePlacement="left" plain>审批人设置</Divider>
                      <Form.Item name="approvers">
                        <Form.List name="approvers">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map(({ key, name, ...restField }) => (
                                <Card size="small" styles={{ body: { marginBottom: 12, background: '#f8fafc' } }} key={key} extra={<DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Form.Item {...restField} name={[name, 'type']} rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                                      <Select placeholder="审批方式">
                                        <Select.Option value={0}>指定用户</Select.Option>
                                        <Select.Option value={1}>指定角色</Select.Option>
                                        <Select.Option value={3}>表单字段</Select.Option>
                                      </Select>
                                    </Form.Item>
                                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.approvers?.[name]?.type !== curr.approvers?.[name]?.type}>
                                      {({ getFieldValue }) => {
                                        const type = getFieldValue(['approvers', name, 'type']);
                                        if (type === 0) return <Form.Item {...restField} name={[name, 'userIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择用户" options={users.map(u => ({ label: u.name || u.username, value: u.id }))} /></Form.Item>;
                                        if (type === 1) return <Form.Item {...restField} name={[name, 'roleIds']} rules={[{ required: true }]}><Select mode="multiple" placeholder="选择角色" options={roles.map(r => ({ label: r.name, value: r.id }))} /></Form.Item>;
                                        if (type === 3) return <Form.Item {...restField} name={[name, 'formFieldKey']} rules={[{ required: true }]}><Input placeholder="输入表单字段 Key" /></Form.Item>;
                                        return null;
                                      }}
                                    </Form.Item>
                                  </div>
                                </Card>
                              ))}
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加审批人</Button>
                            </>
                          )}
                        </Form.List>
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'condition' && (
                    <Form.Item name="expression" label="条件表达式 (C#)">
                      <Input.TextArea rows={4} placeholder="例如: Request.Amount > 1000" />
                    </Form.Item>
                  )}

                  {selectedNode?.data.nodeType === 'ai' && (
                    <>
                      <Form.Item name="aiInputVariable" label="输入变量" tooltip="读取此流程变量作为 AI 的输入上下文">
                        <Input placeholder="例如: form_data, http_result" />
                      </Form.Item>
                      <Form.Item name="systemPrompt" label="系统设定 (System Prompt)">
                        <Mentions rows={3} prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="promptTemplate" label="提示词模板 (User Prompt)">
                        <Mentions rows={5} placeholder="可使用 {{variable}} 引用输入变量" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="outputVariable" label="输出变量" tooltip="将 AI 的输出结果保存到此流程变量" initialValue="ai_result">
                        <Input placeholder="例如: ai_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'llm' && (
                    <>
                      <Form.Item name="llmModel" label="模型" tooltip="选择要使用的 LLM 模型">
                        <Input placeholder="例如: gpt-4o, gpt-4o-mini" />
                      </Form.Item>
                      <Form.Item name="llmProvider" label="模型提供商">
                        <Select placeholder="选择提供商">
                          <Select.Option value="openai">OpenAI</Select.Option>
                          <Select.Option value="azure">Azure OpenAI</Select.Option>
                          <Select.Option value="anthropic">Anthropic</Select.Option>
                          <Select.Option value="custom">自定义</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="llmMode" label="模式">
                        <Select>
                          <Select.Option value="chat">对话</Select.Option>
                          <Select.Option value="completion">补全</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="llmSystemPrompt" label="系统提示词">
                        <Mentions rows={3} placeholder="设定 AI 的角色和行为" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="llmPrompt" label="用户提示词">
                        <Mentions rows={4} placeholder="可使用 {{variable}} 引用变量" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="llmTemperature" label="Temperature" style={{ flex: 1 }}>
                          <Input type="number" step="0.1" min={0} max={2} placeholder="0.7" />
                        </Form.Item>
                        <Form.Item name="llmMaxTokens" label="最大 Token" style={{ flex: 1 }}>
                          <Input type="number" placeholder="2000" />
                        </Form.Item>
                      </div>
                      <Form.Item name="llmResponseFormat" label="响应格式">
                        <Select>
                          <Select.Option value="text">文本</Select.Option>
                          <Select.Option value="json">JSON</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="llmOutputVariable" label="输出变量" initialValue="llm_result">
                        <Input placeholder="llm_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'agent' && (
                    <>
                      <Form.Item name="agentStrategy" label="策略" tooltip="Agent 的推理策略">
                        <Select>
                          <Select.Option value="react">ReAct</Select.Option>
                          <Select.Option value="function_calling">Function Calling</Select.Option>
                          <Select.Option value="cot">Chain of Thought</Select.Option>
                          <Select.Option value="tot">Tree of Thought</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="agentModel" label="模型">
                        <Input placeholder="例如: gpt-4o" />
                      </Form.Item>
                      <Form.Item name="agentSystemPrompt" label="系统提示词">
                        <Mentions rows={4} placeholder="设定 Agent 的角色、目标和行为规则" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="agentMaxIterations" label="最大迭代次数" tooltip="Agent 最大思考和行动次数">
                        <Input type="number" placeholder="10" />
                      </Form.Item>
                      <Divider>记忆设置</Divider>
                      <Form.Item name="agentMemoryEnabled" label="启用记忆" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.agentMemoryEnabled !== curr.agentMemoryEnabled}>
                        {({ getFieldValue }) => getFieldValue('agentMemoryEnabled') && (
                          <Form.Item name="agentMemoryMaxMessages" label="记忆消息数">
                            <Input type="number" placeholder="10" />
                          </Form.Item>
                        )}
                      </Form.Item>
                      <Form.Item name="agentOutputVariable" label="输出变量" initialValue="agent_result">
                        <Input placeholder="agent_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'retrieval' && (
                    <>
                      <Form.Item name="retrievalQuery" label="检索查询" tooltip="搜索词，支持变量引用">
                        <Mentions rows={2} placeholder="{{query}}" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="retrievalKnowledgeBaseId" label="知识库 ID">
                        <Input placeholder="知识库 ID" />
                      </Form.Item>
                      <Form.Item name="retrievalStrategy" label="检索策略">
                        <Select>
                          <Select.Option value="semantic_search">语义搜索</Select.Option>
                          <Select.Option value="full_text_search">全文搜索</Select.Option>
                          <Select.Option value="hybrid_search">混合搜索</Select.Option>
                        </Select>
                      </Form.Item>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="retrievalTopK" label="Top K" initialValue={3} style={{ flex: 1 }}>
                          <Input type="number" />
                        </Form.Item>
                        <Form.Item name="retrievalScoreThreshold" label="分数阈值" initialValue={0.5} style={{ flex: 1 }}>
                          <Input type="number" step="0.1" />
                        </Form.Item>
                      </div>
                      <Form.Item name="retrievalOutputVariable" label="输出变量" initialValue="retrieved_documents">
                        <Input placeholder="retrieved_documents" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'knowledge' && (
                    <>
                      <Form.Item name="knowledgeQuery" label="检索查询" rules={[{ required: true }]}>
                        <Mentions rows={2} placeholder="搜索词，支持变量引用" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="knowledgeQueryVariable" label="查询变量" tooltip="如果不设置，则使用当前输入数据">
                        <Input placeholder="例如: user_query" />
                      </Form.Item>
                      <Form.Item name="knowledgeBaseIds" label="知识库 ID 列表">
                        <Select mode="multiple" placeholder="选择知识库">
                          <Select.Option value="kb1">知识库 1</Select.Option>
                          <Select.Option value="kb2">知识库 2</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="knowledgeRetrievalMode" label="检索模式">
                        <Select>
                          <Select.Option value="semantic_search">语义搜索</Select.Option>
                          <Select.Option value="full_text_search">全文搜索</Select.Option>
                          <Select.Option value="hybrid_search">混合搜索</Select.Option>
                        </Select>
                      </Form.Item>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="knowledgeTopK" label="Top K" initialValue={3} style={{ flex: 1 }}>
                          <Input type="number" />
                        </Form.Item>
                        <Form.Item name="knowledgeScoreThreshold" label="分数阈值" style={{ flex: 1 }}>
                          <Input type="number" step="0.1" />
                        </Form.Item>
                      </div>
                      <Form.Item name="knowledgeOutputVariable" label="输出变量" initialValue="search_results">
                        <Input placeholder="search_results" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'humanInput' && (
                    <>
                      <Form.Item name="humanInputLabel" label="输入标签" initialValue="请输入">
                        <Input placeholder="请输入" />
                      </Form.Item>
                      <Form.Item name="humanInputType" label="输入类型">
                        <Select>
                          <Select.Option value="text">文本</Select.Option>
                          <Select.Option value="textarea">多行文本</Select.Option>
                          <Select.Option value="number">数字</Select.Option>
                          <Select.Option value="select">选择</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="humanInputDescription" label="说明文字">
                        <Input.TextArea rows={2} placeholder="描述输入的用途或要求" />
                      </Form.Item>
                      <Form.Item name="humanInputTimeout" label="超时时间（秒）">
                        <Input type="number" placeholder="不超时" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'speechToText' && (
                    <>
                      <Form.Item name="sttInputVariable" label="输入变量" tooltip="包含音频内容的变量">
                        <Input placeholder="音频文件 URL 或 Base64" />
                      </Form.Item>
                      <Form.Item name="sttProvider" label="服务提供商">
                        <Select defaultValue="openai">
                          <Select.Option value="openai">OpenAI Whisper</Select.Option>
                          <Select.Option value="azure">Azure Speech</Select.Option>
                          <Select.Option value="google">Google Cloud Speech</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="sttLanguage" label="识别语言" tooltip="留空则自动检测">
                        <Input placeholder="例如: zh-CN, en-US" />
                      </Form.Item>
                      <Form.Item name="sttOutputVariable" label="输出变量" initialValue="stt_result">
                        <Input placeholder="stt_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'textToSpeech' && (
                    <>
                      <Form.Item name="ttsInputVariable" label="文本变量" tooltip="需要转音频的文本">
                        <Input placeholder="例如: ai_result" />
                      </Form.Item>
                      <Form.Item name="ttsProvider" label="服务提供商">
                        <Select defaultValue="openai">
                          <Select.Option value="openai">OpenAI TTS</Select.Option>
                          <Select.Option value="azure">Azure Cognitive Speech</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="ttsVoice" label="声音" initialValue="alloy">
                        <Input placeholder="例如: alloy, echo, fable, onyx, nova, shimmer" />
                      </Form.Item>
                      <Form.Item name="ttsLanguage" label="语言" initialValue="zh-CN">
                        <Input placeholder="例如: zh-CN, en-US" />
                      </Form.Item>
                      <Form.Item name="ttsOutputVariable" label="输出变量" initialValue="tts_result">
                        <Input placeholder="tts_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'vision' && (
                    <>
                      <Form.Item name="visionModel" label="模型" initialValue="gpt-4o">
                        <Input placeholder="gpt-4o" />
                      </Form.Item>
                      <Form.Item name="visionImageVariable" label="图像变量" tooltip="包含图像 URL 或 base64 的变量" rules={[{ required: true }]}>
                        <Input placeholder="image_url" />
                      </Form.Item>
                      <Form.Item name="visionPrompt" label="提示词模板" rules={[{ required: true }]}>
                        <Mentions rows={4} placeholder="描述此图像中看到了什么..." prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="visionOutputVariable" label="输出变量" initialValue="vision_result">
                        <Input placeholder="vision_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'email' && (
                    <>
                      <Form.Item name="emailTo" label="收件人" rules={[{ required: true }]}>
                        <Input placeholder="example@mail.com 或 {{user_email}}" />
                      </Form.Item>
                      <Form.Item name="emailCc" label="抄送">
                        <Input placeholder="多个邮箱用分号隔开" />
                      </Form.Item>
                      <Form.Item name="emailSubject" label="邮件主题" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item name="emailBody" label="邮件正文" rules={[{ required: true }]}>
                        <Mentions rows={5} placeholder="支持 HTML 和 {{variable}} 变量" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="emailIsHtml" label="HTML 格式" valuePropName="checked" initialValue={true}>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="emailAttachments" label="附件变量 (可选)">
                        <Input placeholder="file_url1, file_url2" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'variableAggregator' && (
                    <>
                      <Form.Item name="aggregatorInputVariables" label="输入变量列表" rules={[{ required: true }]}>
                        <Select mode="tags" placeholder="输入并回车添加变量名" />
                      </Form.Item>
                      <Form.Item name="aggregatorFormat" label="聚合格式" initialValue="json">
                        <Select>
                          <Select.Option value="json">JSON 对象</Select.Option>
                          <Select.Option value="text">纯文本列表</Select.Option>
                          <Select.Option value="template">自定义模板</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.aggregatorFormat !== curr.aggregatorFormat}>
                        {({ getFieldValue }) => getFieldValue('aggregatorFormat') === 'template' && (
                          <Form.Item name="aggregatorTemplate" label="聚合模板" rules={[{ required: true }]}>
                            <Mentions rows={4} placeholder="例如: 姓名: {{name}}, 分数: {{score}}" prefix={['{{']}>
                              {availableVariables.map(v => (
                                <Option key={v.value} value={v.value}>{v.label}</Option>
                              ))}
                            </Mentions>
                          </Form.Item>
                        )}
                      </Form.Item>
                      <Form.Item name="aggregatorOutputVariable" label="输出变量" initialValue="aggregator_result">
                        <Input placeholder="aggregator_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'code' && (
                    <>
                      <Form.Item name="codeLanguage" label="编程语言">
                        <Select>
                          <Select.Option value="python">Python</Select.Option>
                          <Select.Option value="javascript">JavaScript</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="codeInputVariables" label="输入变量" tooltip="声明需要使用的输入变量名">
                        <Select mode="tags" placeholder="输入变量名">
                        </Select>
                      </Form.Item>
                      <Form.Item name="codeCode" label="代码" rules={[{ required: true }]}>
                        <Input.TextArea rows={8} placeholder="def main(variables):&#10;    # 你的代码&#10;    return {'result': 'output'}" />
                      </Form.Item>
                      <Form.Item name="codeOutputVariable" label="输出变量" initialValue="code_result">
                        <Input placeholder="code_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'template' && (
                    <>
                      <Form.Item name="templateContent" label="模板内容" rules={[{ required: true }]}>
                        <Mentions rows={4} placeholder="你好, {{name}}, 今天是 {{date}}" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="templateOutputVariable" label="输出变量" initialValue="template_result">
                        <Input placeholder="template_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'loop' && (
                    <>
                      <Form.Item name="loopIteratorVariable" label="迭代变量" tooltip="需要遍历的列表变量 (JSON 数组)">
                        <Input placeholder="例如: items_to_process" />
                      </Form.Item>
                      <Form.Item name="loopOutputVariable" label="输出变量" initialValue="iteration_results">
                        <Input placeholder="iteration_results" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'notification' && (
                    <Form.Item name="notificationRemarks" label="通知内容模板">
                      <Mentions rows={4} prefix={['{{']}>
                        {availableVariables.map(v => (
                          <Option key={v.value} value={v.value}>{v.label}</Option>
                        ))}
                      </Mentions>
                    </Form.Item>
                  )}

                  {selectedNode?.data.nodeType === 'httpRequest' && (
                    <>
                      <Form.Item name="httpMethod" label="请求方法" initialValue="GET">
                        <Select>
                          <Select.Option value="GET">GET</Select.Option>
                          <Select.Option value="POST">POST</Select.Option>
                          <Select.Option value="PUT">PUT</Select.Option>
                          <Select.Option value="DELETE">DELETE</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="httpUrl" label="请求 URL" rules={[{ required: true }]}>
                        <Input placeholder="https://api.example.com/v1/..." />
                      </Form.Item>
                      <Form.Item name="httpHeaders" label="请求头 (JSON)">
                        <Input.TextArea rows={3} placeholder='{"Authorization": "BearerToken"}' />
                      </Form.Item>
                      <Form.Item name="httpBody" label="消息体 (Body)">
                        <Input.TextArea rows={4} />
                      </Form.Item>
                      <Form.Item name="httpOutputVariable" label="保存响应到变量" tooltip="将 HTTP 接口的响应结果保存为流程变量，供后续节点使用">
                        <Input placeholder="例如: api_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'timer' && (
                    <>
                      <Form.Item name="timerWaitDuration" label="等待时长 (TimeSpan)" tooltip="如: 00:01:00 表示等待 1 分钟">
                        <Input placeholder="00:00:00" />
                      </Form.Item>
                      <Form.Item name="timerCron" label="Cron 表达式" tooltip="在特定时间点执行">
                        <Input placeholder="0 0/1 * * * ?" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'setVariable' && (
                    <>
                      <Form.Item name="variableName" label="变量名称" rules={[{ required: true }]}>
                        <Input placeholder="my_variable" />
                      </Form.Item>
                      <Form.Item name="variableValue" label="变量值/表达式">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'log' && (
                    <>
                      <Form.Item name="logLevel" label="日志级别" initialValue="Information">
                        <Select>
                          <Select.Option value="Information">Information</Select.Option>
                          <Select.Option value="Warning">Warning</Select.Option>
                          <Select.Option value="Error">Error</Select.Option>
                          <Select.Option value="Debug">Debug</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="logMessage" label="日志消息模板" rules={[{ required: true }]}>
                        <Mentions rows={3} prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'aiJudge' && (
                    <>
                      <Form.Item name="judgeInputVariable" label="输入变量" tooltip="读取此流程变量作为判断依据">
                        <Input placeholder="例如: ai_result, form_data" />
                      </Form.Item>
                      <Form.Item name="judgeSystemPrompt" label="系统设定" tooltip="告诉 AI 判断的角色和规则">
                        <Mentions rows={2} placeholder="你是一个判断引擎，根据输入内容返回 true 或 false" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="judgePrompt" label="判断提示词" rules={[{ required: true, message: '请输入判断提示词' }]}>
                        <Mentions rows={4} placeholder="根据以下内容判断是否符合规定：{{inputVariable}}。符合输出 true，不符合输出 false" prefix={['{{']}>
                          {availableVariables.map(v => (
                            <Option key={v.value} value={v.value}>{v.label}</Option>
                          ))}
                        </Mentions>
                      </Form.Item>
                      <Form.Item name="judgeOutputVariable" label="输出变量" tooltip="保存判断结果 (true/false) 到此变量" initialValue="judge_result">
                        <Input placeholder="judge_result" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'parameterExtractor' && (
                    <>
                      <Form.Item name="extractorInputVariable" label="输入变量" tooltip="从中提取参数的文本变量">
                        <Input placeholder="例如: user_query, email_content" />
                      </Form.Item>
                      <Form.Item name="extractorParameters" label="参数定义 (JSON Array)" tooltip='例如: [{"name": "location", "type": "string", "description": "城市名称"}]'>
                        <Input.TextArea rows={4} placeholder='[{"name": "param1", "type": "string", "description": "..."}]' />
                      </Form.Item>
                      <Form.Item name="extractorOutputVariable" label="输出变量" tooltip="将提取出的参数保存到此变量">
                        <Input placeholder="extracted_params" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'iteration' && (
                    <>
                      <Form.Item name="iterationIteratorVariable" label="迭代变量" tooltip="需要遍历的列表变量 (JSON 数组)">
                        <Input placeholder="例如: items_to_process" />
                      </Form.Item>
                      <Form.Item name="iterationOutputVariable" label="单项变量名" tooltip="在循环内部引用的当前项变量名" initialValue="item">
                        <Input placeholder="item" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'answer' && (
                    <>
                      <Form.Item name="answerContent" label="回答内容" rules={[{ required: true }]}>
                        <Input.TextArea rows={6} placeholder="支持使用 {{variable}} 或 {{#node_id.field#}} 引用变量" />
                      </Form.Item>
                    </>
                  )}

                  {selectedNode?.data.nodeType === 'knowledgeSearch' && (
                    <>
                      <Form.Item name="knowledgeQuery" label="搜索查询" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} placeholder="搜索词，支持变量引用" />
                      </Form.Item>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="knowledgeTopK" label="Top K" initialValue="3" style={{ flex: 1 }}>
                          <Input type="number" />
                        </Form.Item>
                        <Form.Item name="knowledgeScoreThreshold" label="分数阈值" initialValue="0.5" style={{ flex: 1 }}>
                          <Input type="number" step="0.1" />
                        </Form.Item>
                      </div>
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'advanced',
              label: '高级设置',
              children: (
                <>
                  {selectedNode?.data.nodeType === 'approval' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Form.Item name="allowDelegate" label="允许委托申请" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="allowReject" label="允许驳回" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="allowReturn" label="允许退回" valuePropName="checked"><Switch /></Form.Item>
                      <Form.Item name="timeoutHours" label="审批超时设置 (小时)"><Input type="number" /></Form.Item>
                    </div>
                  )}
                  {selectedNode?.data.nodeType === 'start' && (
                    <Form.Item name="formDefinitionId" label="绑定启动表单">
                      <Select placeholder="选择流程启动时需要填写的表单" allowClear options={forms.map(f => ({ label: f.name, value: f.id }))} />
                    </Form.Item>
                  )}
                </>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
};

export default NodeConfigDrawer;
