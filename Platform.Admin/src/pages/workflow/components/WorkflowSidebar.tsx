import React from 'react';
import { useIntl } from '@umijs/max';
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { NODE_CONFIGS } from './WorkflowDesignerConstants';

export interface WorkflowSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onAddNode: (type: string) => void;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  readOnly?: boolean;
}

const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({
  collapsed, onToggle, onAddNode, onDragStart, readOnly = false,
}) => {
  const intl = useIntl();

  const activityCategories = React.useMemo(() => {
    const categories: Record<string, any[]> = {};
    const allowedNodeTypes = ['start', 'end', 'approval', 'condition'];
    Object.entries(NODE_CONFIGS).forEach(([key, config]) => {
      if (allowedNodeTypes.includes(key)) {
        const cat = (config as any).category || '其他';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ type: key, ...config });
      }
    });
    return categories;
  }, []);

  if (readOnly) return null;

  return (
    <>
      <div style={{
        width: collapsed ? 0 : 280, background: 'white', borderRight: collapsed ? 'none' : '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10, position: 'relative', boxShadow: collapsed ? 'none' : '4px 0 10px rgba(0,0,0,0.02)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700,
          color: '#0f172a', fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>组件库</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {Object.entries(activityCategories).map(([category, items]) => (
            <div style={{ marginBottom: 24 }} key={category}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: 12, paddingLeft: 4, display: 'flex', alignItems: 'center',
              }}>
                {category}
                <span style={{ flex: 1, height: 1, background: '#f1f5f9', marginLeft: 10 }} />
              </div>
              {items.map((item) => (
                <div
                  key={item.type}
                  onClick={() => onAddNode(item.type)}
                  onDragStart={(event) => onDragStart(event, item.type)}
                  draggable
                  title={intl.formatMessage({ id: 'pages.workflow.designer.dragDropTooltip', defaultMessage: '可拖动到右侧区域添加组件' })}
                  style={{
                    display: 'flex', alignItems: 'center', padding: 12, marginBottom: 8,
                    border: '1px solid rgba(226, 232, 240, 0.6)', borderRadius: 12, cursor: 'grab',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.6)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{
                    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10, marginRight: 14, fontSize: 20, background: '#f8fafc',
                    border: '1px solid #f1f5f9', color: '#3b82f6', transition: 'all 0.3s',
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                      {intl.formatMessage({ id: `pages.workflow.designer.add${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` })}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        onClick={onToggle}
        style={{
          position: 'absolute', left: collapsed ? 0 : 280, top: '50%', transform: 'translateY(-50%)',
          width: collapsed ? 28 : 24, height: 56, background: 'white',
          border: `1px solid #e2e8f0`, borderLeft: collapsed ? '1px solid #e2e8f0' : 'none',
          borderRadius: collapsed ? '0 12px 12px 0' : '0 12px 12px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          zIndex: 100, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', color: '#94a3b8',
          boxShadow: '4px 0 10px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#fcfdfe'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'white'; }}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
    </>
  );
};

export default WorkflowSidebar;
