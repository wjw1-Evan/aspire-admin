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
  collapsed,
  onToggle,
  onAddNode,
  onDragStart,
  readOnly = false,
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
      <div className={`elsa-activity-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span>组件库</span>
        </div>
        <div className="sidebar-content">
          {Object.entries(activityCategories).map(([category, items]) => (
            <div className="category-group" key={category}>
              <div className="category-title">{category}</div>
              {items.map((item) => (
                <div
                  className="activity-item"
                  key={item.type}
                  onClick={() => onAddNode(item.type)}
                  onDragStart={(event) => onDragStart(event, item.type)}
                  draggable
                  title={intl.formatMessage({ id: 'pages.workflow.designer.dragDropTooltip', defaultMessage: '可拖动到右侧区域添加组件' })}
                >
                  <div className="activity-icon" style={{ backgroundColor: item.backgroundColor, color: item.color }}>
                    {item.icon}
                  </div>
                  <div className="activity-info">
                    <div className="activity-label">
                      {intl.formatMessage({ id: `pages.workflow.designer.add${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` })}
                    </div>
                    <div className="activity-desc">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={`sidebar-toggle-btn ${collapsed ? 'collapsed' : ''}`} onClick={onToggle}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
    </>
  );
};

export default WorkflowSidebar;
