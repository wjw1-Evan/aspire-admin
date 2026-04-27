/**
 * 卡片配置表单
 * 根据卡片类型提供不同的配置表单项
 */
import React, { useMemo, useState } from 'react';
import {
  ModalForm, ProFormText, ProFormSelect, ProFormDigit,
  ProFormTextArea, ProFormSwitch, ProFormGroup,
} from '@ant-design/pro-components';
import { Form, Tabs, Divider, Space, Button, Input, InputNumber, Select, ColorPicker, Typography } from 'antd';
import type { GetProps } from 'antd';

type DividerOrientation = GetProps<typeof Divider>['orientation'];
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DashboardCardDto, StyleConfig, CardType } from './types';
import { CARD_TYPE_GROUPS } from './types';

const { Text } = Typography;

interface CardConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCard: DashboardCardDto | null;
  onFinish: (values: { title: string; cardType: string; styleConfig: string }) => Promise<boolean>;
}

/** 卡片类型选项 */
const CARD_TYPE_OPTIONS = [
  { label: '── 基础 ──', value: '_group_basic', disabled: true },
  { label: '统计指标', value: 'statistic' },
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '看板标题', value: 'header' },
  { label: '时钟', value: 'clock' },
  { label: '状态栏', value: 'statusBar' },
  { label: '── 图表 ──', value: '_group_chart', disabled: true },
  { label: '仪表盘', value: 'gauge' },
  { label: '环形图', value: 'ring' },
  { label: '折线图', value: 'lineChart' },
  { label: '柱状图', value: 'barChart' },
  { label: '面积图', value: 'areaChart' },
  { label: '饼图', value: 'pieChart' },
  { label: '雷达图', value: 'radarChart' },
  { label: '── 复合 ──', value: '_group_complex', disabled: true },
  { label: '状态网格', value: 'statusGrid' },
  { label: '功能模块', value: 'functionModule' },
  { label: '告警列表', value: 'alertList' },
  { label: '进度条', value: 'progressBar' },
  { label: '表格', value: 'table' },
];

/** 解析 styleConfig */
const parseStyle = (config: string): StyleConfig => {
  if (!config) return {};
  try { return JSON.parse(config); } catch { return {}; }
};

/** 通用样式面板 */
const CommonStylePanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>标题颜色</Text>
        <div><ColorPicker value={style.titleColor || '#e0e6f1'} onChange={(_, hex) => update('titleColor', hex)} size="small" /></div>
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>标题字号</Text>
        <InputNumber value={style.titleFontSize || 14} onChange={(v) => update('titleFontSize', v)} size="small" min={10} max={32} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>背景色</Text>
        <div><ColorPicker value={style.backgroundColor || 'rgba(14,30,60,0.6)'} onChange={(_, hex) => update('backgroundColor', hex)} size="small" /></div>
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>边框圆角</Text>
        <InputNumber value={style.borderRadius ?? 8} onChange={(v) => update('borderRadius', v)} size="small" min={0} max={24} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>内边距</Text>
        <InputNumber value={style.padding ?? 12} onChange={(v) => update('padding', v)} size="small" min={0} max={32} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>显示标题</Text>
        <Select value={style.showTitle !== false ? 'true' : 'false'} onChange={(v) => update('showTitle', v === 'true')} size="small" style={{ width: '100%' }}
          options={[{ label: '是', value: 'true' }, { label: '否', value: 'false' }]} />
      </div>
    </div>
  );
};

/** 统计卡片配置 */
const StatisticStylePanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>数值</Text>
        <Input value={style.centerValue || ''} onChange={(e) => update('centerValue', e.target.value)} size="small" placeholder="如: 1,234" />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>数值颜色</Text>
        <div><ColorPicker value={style.valueColor || '#00d4ff'} onChange={(_, hex) => update('valueColor', hex)} size="small" /></div>
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>数值字号</Text>
        <InputNumber value={style.valueSize || 36} onChange={(v) => update('valueSize', v)} size="small" min={14} max={72} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>前缀</Text>
        <Input value={style.prefix || ''} onChange={(e) => update('prefix', e.target.value)} size="small" placeholder="如: ¥" />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>后缀</Text>
        <Input value={style.suffix || ''} onChange={(e) => update('suffix', e.target.value)} size="small" placeholder="如: kW、%" />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>图标</Text>
        <Select value={style.icon || undefined} onChange={(v) => update('icon', v)} size="small" style={{ width: '100%' }} allowClear placeholder="选择图标"
          options={[
            { label: '闪电', value: 'thunder' }, { label: '监控', value: 'monitor' },
            { label: '灯泡', value: 'bulb' }, { label: '银行', value: 'bank' },
            { label: '设置', value: 'setting' }, { label: '声音', value: 'sound' },
            { label: '车辆', value: 'car' }, { label: '视频', value: 'video' },
          ]} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>趋势</Text>
        <Select value={style.trend || 'none'} onChange={(v) => update('trend', v)} size="small" style={{ width: '100%' }}
          options={[{ label: '无', value: 'none' }, { label: '上升', value: 'up' }, { label: '下降', value: 'down' }]} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>趋势值</Text>
        <Input value={style.trendValue || ''} onChange={(e) => update('trendValue', e.target.value)} size="small" placeholder="如: 12.5%" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>描述</Text>
        <Input value={style.description || ''} onChange={(e) => update('description', e.target.value)} size="small" placeholder="副标题描述" />
      </div>
    </div>
  );
};

/** 仪表盘配置 */
const GaugeStylePanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>当前值</Text>
        <InputNumber value={parseFloat(style.centerValue || '50')} onChange={(v) => update('centerValue', String(v))} size="small" style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>单位</Text>
        <Input value={style.unit || ''} onChange={(e) => update('unit', e.target.value)} size="small" placeholder="如: ℃、kW" />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>最小值</Text>
        <InputNumber value={style.min ?? 0} onChange={(v) => update('min', v)} size="small" style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>最大值</Text>
        <InputNumber value={style.max ?? 100} onChange={(v) => update('max', v)} size="small" style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>刻度数</Text>
        <InputNumber value={style.splitNumber ?? 5} onChange={(v) => update('splitNumber', v)} size="small" min={2} max={20} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>样式</Text>
        <Select value={style.gaugeStyle || 'default'} onChange={(v) => update('gaugeStyle', v)} size="small" style={{ width: '100%' }}
          options={[{ label: '默认', value: 'default' }, { label: '简约', value: 'simple' }, { label: '温度', value: 'temperature' }]} />
      </div>
    </div>
  );
};

/** 折线图/面积图/柱状图 数据系列配置 */
const SeriesDataPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const xAxisData = style.xAxisData || [];
  const seriesData = style.seriesData || [];

  const updateXAxis = (val: string) => {
    onChange({ ...style, xAxisData: val.split(',').map((s: string) => s.trim()).filter(Boolean) });
  };

  const addSeries = () => {
    onChange({
      ...style,
      seriesData: [...seriesData, { name: `系列${seriesData.length + 1}`, data: [], color: '' }],
    });
  };

  const removeSeries = (idx: number) => {
    const next = [...seriesData];
    next.splice(idx, 1);
    onChange({ ...style, seriesData: next });
  };

  const updateSeries = (idx: number, key: string, value: unknown) => {
    const next = [...seriesData];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...style, seriesData: next });
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>X轴标签（逗号分隔）</Text>
        <Input.TextArea
          value={xAxisData.join(', ')}
          onChange={(e) => updateXAxis(e.target.value)}
          size="small" rows={2}
          placeholder="周一, 周二, 周三, 周四, 周五"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 12 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>显示图例</Text>
          <Select value={style.showLegend !== false ? 'true' : 'false'} onChange={(v) => onChange({ ...style, showLegend: v === 'true' })} size="small" style={{ width: '100%' }}
            options={[{ label: '是', value: 'true' }, { label: '否', value: 'false' }]} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>平滑曲线</Text>
          <Select value={style.smooth !== false ? 'true' : 'false'} onChange={(v) => onChange({ ...style, smooth: v === 'true' })} size="small" style={{ width: '100%' }}
            options={[{ label: '是', value: 'true' }, { label: '否', value: 'false' }]} />
        </div>
      </div>
      <Divider orientation={'left' as DividerOrientation} style={{ margin: '8px 0', fontSize: 12 }}>数据系列</Divider>
      {seriesData.map((s: { name: string; data: number[]; color?: string }, idx: number) => (
        <div key={idx} style={{ marginBottom: 12, padding: 8, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong style={{ fontSize: 12 }}>系列 {idx + 1}</Text>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeSeries(idx)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>名称</Text>
              <Input value={s.name} onChange={(e) => updateSeries(idx, 'name', e.target.value)} size="small" />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>颜色</Text>
              <div><ColorPicker value={s.color || '#00d4ff'} onChange={(_, hex) => updateSeries(idx, 'color', hex)} size="small" /></div>
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>数据（逗号分隔）</Text>
            <Input
              value={s.data.join(', ')}
              onChange={(e) => updateSeries(idx, 'data', e.target.value.split(',').map((v: string) => parseFloat(v.trim()) || 0))}
              size="small" placeholder="10, 20, 30, 40, 50"
            />
          </div>
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addSeries} block>添加数据系列</Button>
    </div>
  );
};

/** 环形图/饼图数据配置 */
const PieDataPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const pieData = style.pieData || [];

  const addItem = () => {
    onChange({ ...style, pieData: [...pieData, { name: `项目${pieData.length + 1}`, value: 10, color: '' }] });
  };

  const removeItem = (idx: number) => {
    const next = [...pieData];
    next.splice(idx, 1);
    onChange({ ...style, pieData: next });
  };

  const updateItem = (idx: number, key: string, value: unknown) => {
    const next = [...pieData];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...style, pieData: next });
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 12 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>内半径</Text>
          <Input value={style.innerRadius || '55%'} onChange={(e) => onChange({ ...style, innerRadius: e.target.value })} size="small" placeholder="55%" />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>外半径</Text>
          <Input value={style.outerRadius || '75%'} onChange={(e) => onChange({ ...style, outerRadius: e.target.value })} size="small" placeholder="75%" />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>中心文本</Text>
          <Input value={style.centerText || ''} onChange={(e) => onChange({ ...style, centerText: e.target.value })} size="small" placeholder="如: 总计" />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>中心数值</Text>
          <Input value={style.centerValue || ''} onChange={(e) => onChange({ ...style, centerValue: e.target.value })} size="small" placeholder="如: 1,234" />
        </div>
      </div>
      <Divider orientation={'left' as DividerOrientation} style={{ margin: '8px 0', fontSize: 12 }}>数据项</Divider>
      {pieData.map((d: { name: string; value: number; color?: string }, idx: number) => (
        <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          <Input value={d.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} size="small" style={{ width: 80 }} placeholder="名称" />
          <InputNumber value={d.value} onChange={(v) => updateItem(idx, 'value', v)} size="small" style={{ width: 70 }} />
          <ColorPicker value={d.color || '#00d4ff'} onChange={(_, hex) => updateItem(idx, 'color', hex)} size="small" />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>添加数据项</Button>
    </div>
  );
};

/** 状态网格配置 */
const StatusGridPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const items = style.items || [];

  const addItem = () => {
    onChange({ ...style, items: [...items, { name: `项目${items.length + 1}`, status: 'normal' as const, statusText: '', data: {} }] });
  };

  const removeItem = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    onChange({ ...style, items: next });
  };

  const updateItem = (idx: number, key: string, value: unknown) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...style, items: next });
  };

  const updateItemData = (idx: number, dataStr: string) => {
    try {
      const data = JSON.parse(dataStr);
      updateItem(idx, 'data', data);
    } catch {
      // ignore parse error during typing
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>列数</Text>
        <InputNumber value={style.columns || 2} onChange={(v) => onChange({ ...style, columns: v as number })} size="small" min={1} max={6} style={{ width: '100%' }} />
      </div>
      <Divider orientation={'left' as DividerOrientation} style={{ margin: '8px 0', fontSize: 12 }}>状态项</Divider>
      {items.map((item: { name: string; status: string; statusText?: string; data?: Record<string, string | number> }, idx: number) => (
        <div key={idx} style={{ marginBottom: 10, padding: 8, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong style={{ fontSize: 12 }}>项目 {idx + 1}</Text>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>名称</Text>
              <Input value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} size="small" />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>状态</Text>
              <Select value={item.status} onChange={(v) => updateItem(idx, 'status', v)} size="small" style={{ width: '100%' }}
                options={[
                  { label: '正常', value: 'normal' }, { label: '繁忙', value: 'busy' },
                  { label: '紧急', value: 'urgent' }, { label: '离线', value: 'offline' },
                ]} />
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>附加数据（JSON对象）</Text>
            <Input.TextArea
              defaultValue={JSON.stringify(item.data || {}, null, 0)}
              onBlur={(e) => updateItemData(idx, e.target.value)}
              size="small" rows={1}
              placeholder='{"在院人数": 45, "床位使用率": "87%"}'
            />
          </div>
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>添加状态项</Button>
    </div>
  );
};

/** 功能模块配置 */
const FunctionModulePanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const modules = style.modules || [];

  const addModule = () => {
    onChange({ ...style, modules: [...modules, { name: `模块${modules.length + 1}`, icon: 'setting', status: 'online' as const, statusText: '', description: '' }] });
  };

  const removeModule = (idx: number) => {
    const next = [...modules];
    next.splice(idx, 1);
    onChange({ ...style, modules: next });
  };

  const updateModule = (idx: number, key: string, value: unknown) => {
    const next = [...modules];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...style, modules: next });
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>列数</Text>
        <InputNumber value={style.columns || 2} onChange={(v) => onChange({ ...style, columns: v as number })} size="small" min={1} max={6} style={{ width: '100%' }} />
      </div>
      <Divider orientation={'left' as DividerOrientation} style={{ margin: '8px 0', fontSize: 12 }}>模块列表</Divider>
      {modules.map((mod: { name: string; icon?: string; status: string; statusText?: string; description?: string }, idx: number) => (
        <div key={idx} style={{ marginBottom: 8, padding: 8, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong style={{ fontSize: 12 }}>模块 {idx + 1}</Text>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeModule(idx)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>名称</Text>
              <Input value={mod.name} onChange={(e) => updateModule(idx, 'name', e.target.value)} size="small" />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>状态</Text>
              <Select value={mod.status} onChange={(v) => updateModule(idx, 'status', v)} size="small" style={{ width: '100%' }}
                options={[{ label: '在线', value: 'online' }, { label: '警告', value: 'warning' }, { label: '离线', value: 'offline' }]} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>图标</Text>
              <Select value={mod.icon || undefined} onChange={(v) => updateModule(idx, 'icon', v)} size="small" style={{ width: '100%' }} allowClear
                options={[
                  { label: '闪电', value: 'thunder' }, { label: '监控', value: 'monitor' }, { label: '灯泡', value: 'bulb' },
                  { label: '银行', value: 'bank' }, { label: '设置', value: 'setting' }, { label: '视频', value: 'video' },
                  { label: '车辆', value: 'car' }, { label: '声音', value: 'sound' }, { label: 'ID卡', value: 'idcard' },
                ]} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>描述</Text>
              <Input value={mod.description || ''} onChange={(e) => updateModule(idx, 'description', e.target.value)} size="small" />
            </div>
          </div>
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addModule} block>添加模块</Button>
    </div>
  );
};

/** 告警列表配置 */
const AlertListPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const alerts = style.alerts || [];

  const addAlert = () => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    onChange({ ...style, alerts: [...alerts, { time, level: 'info' as const, message: '新告警信息' }] });
  };

  const removeAlert = (idx: number) => {
    const next = [...alerts];
    next.splice(idx, 1);
    onChange({ ...style, alerts: next });
  };

  const updateAlert = (idx: number, key: string, value: unknown) => {
    const next = [...alerts];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...style, alerts: next });
  };

  return (
    <div>
      {alerts.map((alert: { time: string; level: string; message: string }, idx: number) => (
        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <Input value={alert.time} onChange={(e) => updateAlert(idx, 'time', e.target.value)} size="small" style={{ width: 65 }} placeholder="HH:MM" />
          <Select value={alert.level} onChange={(v) => updateAlert(idx, 'level', v)} size="small" style={{ width: 80 }}
            options={[
              { label: '信息', value: 'info' }, { label: '警告', value: 'warning' },
              { label: '错误', value: 'error' }, { label: '严重', value: 'critical' },
            ]} />
          <Input value={alert.message} onChange={(e) => updateAlert(idx, 'message', e.target.value)} size="small" style={{ flex: 1 }} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAlert(idx)} />
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addAlert} block>添加告警</Button>
    </div>
  );
};

/** Header 配置 */
const HeaderPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>标题文本</Text>
        <Input value={style.headerTitle || ''} onChange={(e) => update('headerTitle', e.target.value)} size="small" placeholder="医院智慧管理平台" />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>字号</Text>
        <InputNumber value={style.fontSize || 22} onChange={(v) => update('fontSize', v)} size="small" min={14} max={48} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>文字颜色</Text>
        <div><ColorPicker value={style.textColor || '#fff'} onChange={(_, hex) => update('textColor', hex)} size="small" /></div>
      </div>
    </div>
  );
};

/** 进度条配置 */
const ProgressPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>进度值 (%)</Text>
        <InputNumber value={style.progress ?? 0} onChange={(v) => update('progress', v)} size="small" min={0} max={100} style={{ width: '100%' }} />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>进度条颜色</Text>
        <div><ColorPicker value={style.progressColor || '#00d4ff'} onChange={(_, hex) => update('progressColor', hex)} size="small" /></div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>描述</Text>
        <Input value={style.description || ''} onChange={(e) => update('description', e.target.value)} size="small" />
      </div>
    </div>
  );
};

/** 文本配置 */
const TextPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>内容</Text>
        <Input.TextArea value={style.content || ''} onChange={(e) => update('content', e.target.value)} rows={4} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>字号</Text>
          <InputNumber value={style.fontSize || 14} onChange={(v) => update('fontSize', v)} size="small" min={10} max={32} style={{ width: '100%' }} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>对齐</Text>
          <Select value={style.textAlign || 'left'} onChange={(v) => update('textAlign', v)} size="small" style={{ width: '100%' }}
            options={[{ label: '左对齐', value: 'left' }, { label: '居中', value: 'center' }, { label: '右对齐', value: 'right' }]} />
        </div>
      </div>
    </div>
  );
};

/** 图片配置 */
const ImagePanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const update = (key: string, value: unknown) => onChange({ ...style, [key]: value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>图片地址</Text>
        <Input value={style.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} size="small" placeholder="https://..." />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>填充模式</Text>
        <Select value={style.imageFit || 'cover'} onChange={(v) => update('imageFit', v)} size="small" style={{ width: '100%' }}
          options={[{ label: '覆盖', value: 'cover' }, { label: '包含', value: 'contain' }, { label: '拉伸', value: 'fill' }]} />
      </div>
    </div>
  );
};

/** 状态栏配置 */
const StatusBarPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  const statusItems = style.statusItems || [];

  const addItem = () => {
    onChange({ ...style, statusItems: [...statusItems, { icon: 'success', text: '新状态', color: '' }] });
  };

  const removeItem = (idx: number) => {
    const next = [...statusItems];
    next.splice(idx, 1);
    onChange({ ...style, statusItems: next });
  };

  const updateItem = (idx: number, key: string, value: unknown) => {
    const next = [...statusItems];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...style, statusItems: next });
  };

  return (
    <div>
      {statusItems.map((item: { icon?: string; text: string; color?: string }, idx: number) => (
        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <Select value={item.icon || 'success'} onChange={(v) => updateItem(idx, 'icon', v)} size="small" style={{ width: 80 }}
            options={[{ label: '成功', value: 'success' }, { label: '警告', value: 'warning' }, { label: '错误', value: 'error' }, { label: '信息', value: 'info' }]} />
          <Input value={item.text} onChange={(e) => updateItem(idx, 'text', e.target.value)} size="small" style={{ flex: 1 }} />
          <ColorPicker value={item.color || '#52c41a'} onChange={(_, hex) => updateItem(idx, 'color', hex)} size="small" />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} block>添加状态项</Button>
    </div>
  );
};

/** 雷达图配置 */
const RadarPanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>维度名称（逗号分隔）</Text>
        <Input.TextArea
          value={(style.legendData || []).join(', ')}
          onChange={(e) => onChange({ ...style, legendData: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
          size="small" rows={2} placeholder="技术, 管理, 创新, 效率, 质量"
        />
      </div>
      <SeriesDataPanel style={style} onChange={onChange} />
    </div>
  );
};

/** 表格配置 */
const TablePanel: React.FC<{ style: StyleConfig; onChange: (s: StyleConfig) => void }> = ({ style, onChange }) => {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>列定义（JSON数组）</Text>
        <Input.TextArea
          defaultValue={JSON.stringify(style.tableColumns || [], null, 2)}
          onBlur={(e) => { try { onChange({ ...style, tableColumns: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
          rows={3} style={{ fontSize: 12, fontFamily: 'monospace' }}
          placeholder='[{"title":"名称","dataIndex":"name"},{"title":"数值","dataIndex":"value"}]'
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>数据（JSON数组）</Text>
        <Input.TextArea
          defaultValue={JSON.stringify(style.tableData || [], null, 2)}
          onBlur={(e) => { try { onChange({ ...style, tableData: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
          rows={4} style={{ fontSize: 12, fontFamily: 'monospace' }}
          placeholder='[{"name":"项目A","value":100},{"name":"项目B","value":200}]'
        />
      </div>
    </div>
  );
};

// ─── 主表单组件 ────────────────────────────────────

const CardConfigForm: React.FC<CardConfigFormProps> = ({ open, onOpenChange, editingCard, onFinish }) => {
  const initialStyle = useMemo(() => parseStyle(editingCard?.styleConfig || ''), [editingCard]);
  const [cardType, setCardType] = useState<string>(editingCard?.cardType || 'statistic');
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(initialStyle);

  // 当 editingCard 变化时重新初始化
  React.useEffect(() => {
    if (editingCard) {
      setCardType(editingCard.cardType);
      setStyleConfig(parseStyle(editingCard.styleConfig));
    } else {
      setCardType('statistic');
      setStyleConfig({});
    }
  }, [editingCard]);

  /** 渲染类型专用配置面板 */
  const renderTypePanel = () => {
    switch (cardType) {
      case 'statistic':
        return <StatisticStylePanel style={styleConfig} onChange={setStyleConfig} />;
      case 'gauge':
        return <GaugeStylePanel style={styleConfig} onChange={setStyleConfig} />;
      case 'ring':
      case 'pieChart':
        return <PieDataPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'lineChart':
      case 'areaChart':
      case 'barChart':
        return <SeriesDataPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'radarChart':
        return <RadarPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'statusGrid':
        return <StatusGridPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'functionModule':
        return <FunctionModulePanel style={styleConfig} onChange={setStyleConfig} />;
      case 'alertList':
        return <AlertListPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'progressBar':
        return <ProgressPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'table':
        return <TablePanel style={styleConfig} onChange={setStyleConfig} />;
      case 'header':
        return <HeaderPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'clock':
        return null; // 时钟无需配置
      case 'statusBar':
        return <StatusBarPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'text':
        return <TextPanel style={styleConfig} onChange={setStyleConfig} />;
      case 'image':
        return <ImagePanel style={styleConfig} onChange={setStyleConfig} />;
      default:
        return null;
    }
  };

  return (
    <ModalForm
      key={editingCard?.id || 'create-card'}
      title={editingCard ? '编辑卡片' : '添加卡片'}
      open={open}
      onOpenChange={onOpenChange}
      width={640}
      initialValues={{ title: editingCard?.title || '', cardType: editingCard?.cardType || 'statistic' }}
      onFinish={async (values: Record<string, string>) => {
        return onFinish({
          title: values.title,
          cardType: cardType,
          styleConfig: JSON.stringify(styleConfig),
        });
      }}
      modalProps={{ destroyOnClose: true }}
    >
      <ProFormText name="title" label="卡片标题" placeholder="输入卡片标题" rules={[{ required: true, message: '请输入标题' }]} />

      <Form.Item label="卡片类型" required>
        <Select
          value={cardType}
          onChange={(v) => {
            setCardType(v);
            // 切换类型时重置样式
            if (v !== editingCard?.cardType) {
              setStyleConfig({});
            }
          }}
          options={CARD_TYPE_OPTIONS}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Tabs
        defaultActiveKey="type"
        size="small"
        items={[
          {
            key: 'type',
            label: '类型配置',
            children: (
              <div style={{ maxHeight: 400, overflow: 'auto', padding: '8px 0' }}>
                {renderTypePanel() || <Text type="secondary">此类型无需额外配置</Text>}
              </div>
            ),
          },
          {
            key: 'style',
            label: '通用样式',
            children: (
              <div style={{ maxHeight: 400, overflow: 'auto', padding: '8px 0' }}>
                <CommonStylePanel style={styleConfig} onChange={setStyleConfig} />
              </div>
            ),
          },
          {
            key: 'json',
            label: '高级(JSON)',
            children: (
              <div style={{ padding: '8px 0' }}>
                <Input.TextArea
                  defaultValue={JSON.stringify(styleConfig, null, 2)}
                  onBlur={(e) => { try { setStyleConfig(JSON.parse(e.target.value)); } catch { /* ignore */ } }}
                  rows={12}
                  style={{ fontSize: 12, fontFamily: 'monospace' }}
                  placeholder="直接编辑完整的 StyleConfig JSON"
                />
              </div>
            ),
          },
        ]}
      />
    </ModalForm>
  );
};

export default React.memo(CardConfigForm);
