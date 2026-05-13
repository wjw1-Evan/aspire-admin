import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const MODULE_MAP = {
  PageContainer: 'layout', ProBreadcrumb: 'layout', ProPageHeader: 'layout',
  PageHeader: 'layout', FooterToolbar: 'layout', GridContent: 'layout',
  DefaultFooter: 'layout', DefaultHeader: 'layout', SettingDrawer: 'layout',
  TopNavHeader: 'layout', PageLoading: 'layout',
  ProCard: 'card', CheckCard: 'card', StatisticCard: 'card', Statistic: 'card',
  ProDescriptions: 'descriptions',
  ProTable: 'table', ActionType: 'table', ProColumns: 'table', ProColumnType: 'table',
  EditableProTable: 'table', DragSortTable: 'table', TableDropdown: 'table',
  ListToolBar: 'table', IndexColumn: 'table', CellEditorTable: 'table',
  RowEditorTable: 'table', Search: 'table',
  ProForm: 'form', ModalForm: 'form', DrawerForm: 'form', StepsForm: 'form',
  LightFilter: 'form', QueryFilter: 'form', LoginForm: 'form', LoginFormPage: 'form',
  ProFormGroup: 'form',
  ProFormText: 'form', ProFormSelect: 'form', ProFormTextArea: 'form',
  ProFormDigit: 'form', ProFormDatePicker: 'form', ProFormDateTimePicker: 'form',
  ProFormTimePicker: 'form', ProFormDateRangePicker: 'form',
  ProFormDateMonthRangePicker: 'form', ProFormDateQuarterRangePicker: 'form',
  ProFormDateTimeRangePicker: 'form', ProFormDateWeekRangePicker: 'form',
  ProFormDateYearRangePicker: 'form', ProFormTimeRangePicker: 'form',
  ProFormRadio: 'form', ProFormCheckbox: 'form', ProFormSwitch: 'form',
  ProFormItem: 'form', ProFormSlider: 'form', ProFormCaptcha: 'form',
  ProFormCascader: 'form', ProFormColorPicker: 'form', ProFormDependency: 'form',
  ProFormDigitRange: 'form', ProFormField: 'form', ProFormFieldSet: 'form',
  ProFormMoney: 'form', ProFormList: 'form', ProFormTreeSelect: 'form',
  ProFormUploadButton: 'form', ProFormUploadDragger: 'form',
  FormListContext: 'form', ProFormContext: 'form', LightWrapper: 'form',
  FieldContext: 'form', GridContext: 'form',
  ProList: 'list',
  ConfigConsumer: 'provider', IntlConsumer: 'provider', createIntl: 'provider',
};

function findFiles(dir) {
  const results = [];
  const list = readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(fullPath));
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) results.push(fullPath);
  }
  return results;
}

/**
 * Extract the import block content between { and } for a @ant-design/pro-components import.
 * Scans backward from the line containing the from clause to find the opening {.
 */
function findImportBlock(lines, fromLineIdx) {
  const fromLine = lines[fromLineIdx];
  // Find the position of the last } in this line (there should be one)
  const closeBraceIdx = fromLine.lastIndexOf('}');
  if (closeBraceIdx === -1) return null; // shouldn't happen

  // Check if the opening { is on the same line
  const openBraceIdx = fromLine.indexOf('{');
  if (openBraceIdx !== -1 && openBraceIdx < closeBraceIdx) {
    // Single-line: `import { PageContainer } from '@ant-design/pro-components';`
    // Also handles: `import { type ProColumns, ActionType, ProTable } from '@ant-design/pro-components';`
    const content = fromLine.substring(openBraceIdx + 1, closeBraceIdx);
    return content;
  }

  // Multi-line: scan backward from fromLineIdx to find the line with `import ... {`
  for (let j = fromLineIdx - 1; j >= 0; j--) {
    const l = lines[j];
    const bracePos = l.indexOf('{');
    if (bracePos !== -1 && /^\s*(import|export)\s/.test(l)) {
      // Found the opening line
      // Collect all lines from j to fromLineIdx
      const blockLines = [];
      for (let k = j; k <= fromLineIdx; k++) {
        blockLines.push(lines[k]);
      }
      const block = blockLines.join('\n');
      const firstBrace = block.indexOf('{');
      const lastBrace = block.lastIndexOf('}');
      const content = block.substring(firstBrace + 1, lastBrace);
      return content;
    }
    // Stop scanning if we hit a non-import line
    if (!l.startsWith(' ') && !l.startsWith('\t') && !l.startsWith('import') && !l.startsWith('}')) {
      break;
    }
  }

  return null;
}

function transformFile(content) {
  const lines = content.split('\n');
  const linesToSkip = new Set(); // Track which original lines to skip

  // First pass: find all barrel imports and their replacements
  const replacements = []; // { startLine, endLine, newText }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('@ant-design/pro-components')) continue;
    if (!line.includes('} from')) continue;
    if (!line.includes("from '@ant-design/pro-components'") && !line.includes('from "@ant-design/pro-components"')) continue;

    const content = findImportBlock(lines, i);
    if (!content) continue;

    // Parse names
    const rawNames = content.split(',').map(s => s.trim()).filter(Boolean);
    const entries = rawNames.map(r => {
      const isType = r.startsWith('type ');
      return { name: r.replace(/^type\s+/, '').replace(/\s+$/, ''), isType };
    });

    // Filter to known only
    const known = entries.filter(e => MODULE_MAP[e.name]);
    const unknown = entries.filter(e => !MODULE_MAP[e.name]);
    for (const e of unknown) {
      console.warn(`  ⚠ Unknown: ${e.name}`);
    }

    if (known.length === 0) continue;

    // Find the start line of this import (backward from i to find `import {`)
    let startLine = i;
    const closeBracePos = line.lastIndexOf('}');
    const openBraceOnSameLine = line.indexOf('{');
    if (openBraceOnSameLine !== -1 && openBraceOnSameLine < closeBracePos) {
      startLine = i;
    } else {
      // Multi-line: scan backward
      for (let j = i - 1; j >= 0; j--) {
        const l = lines[j];
        if (l.includes('import') && l.includes('{')) {
          startLine = j;
          break;
        }
        // If we hit a line that can't be part of the import, stop
        if (!l.startsWith(' ') && !l.startsWith('\t') && !l.startsWith('import')) {
          break;
        }
      }
    }

    // Group by module
    const grouped = {};
    for (const { name, isType } of known) {
      const mod = MODULE_MAP[name];
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push({ name, isType });
    }

    const modules = Object.keys(grouped).sort();
    const newImports = modules.map(mod => {
      const items = grouped[mod];
      const vals = items.filter(x => !x.isType).map(x => x.name);
      const types = items.filter(x => x.isType).map(x => x.name);
      if (vals.length > 0 && types.length > 0)
        return `import { ${vals.join(', ')}, type ${types.join(', ')} } from '@ant-design/pro-components/es/${mod}';`;
      if (types.length > 0)
        return `import type { ${types.join(', ')} } from '@ant-design/pro-components/es/${mod}';`;
      return `import { ${vals.join(', ')} } from '@ant-design/pro-components/es/${mod}';`;
    }).join('\n');

    replacements.push({ startLine, endLine: i, newText: newImports });
    // Mark lines to skip
    for (let j = startLine; j <= i; j++) {
      linesToSkip.add(j);
    }
  }

  if (replacements.length === 0) return content;

  // Build output
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (linesToSkip.has(i)) {
      // Check if this is the first line of a replacement block
      const rep = replacements.find(r => r.startLine === i);
      if (rep) {
        result.push(rep.newText);
      }
      continue;
    }
    result.push(lines[i]);
  }

  return result.join('\n');
}

// Main
const srcDir = path.resolve('src');
const files = findFiles(srcDir)
  .filter(f => !f.includes('/.umi/') && !f.includes('/.umi-production/'));

console.log(`Searching ${files.length} files...`);
let changedCount = 0;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf-8');
  } catch {
    continue;
  }
  if (!content.includes('@ant-design/pro-components')) continue;

  const newContent = transformFile(content);
  if (newContent !== content) {
    writeFileSync(file, newContent, 'utf-8');
    console.log(`  ✓ ${path.relative('.', file)}`);
    changedCount++;
  }
}

console.log(`\nDone! ${changedCount} files updated.`);
