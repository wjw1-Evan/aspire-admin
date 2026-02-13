import React, { useMemo } from 'react';
import { Radio, DatePicker, Space } from 'antd';
import { useIntl } from '@umijs/max';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;

export interface StatisticsPeriodSelectorProps {
  value?: string;
  dateRange?: [Dayjs, Dayjs] | null;
  onChange: (dateRange: [Dayjs, Dayjs] | null, periodKey?: string) => void;
  showCustom?: boolean;
  disabled?: boolean;
}

const getRangeForKey = (k: string): [Dayjs, Dayjs] | null => {
  const now = dayjs().startOf('day');
  switch (k) {
    case 'week':
      return [now.startOf('week'), now.endOf('week').startOf('day')];
    case 'month':
      return [now.startOf('month'), now.endOf('month').startOf('day')];
    case 'quarter':
      return [now.startOf('quarter'), now.endOf('quarter').startOf('day')];
    case 'year':
      return [now.startOf('year'), now.endOf('year').startOf('day')];
    default:
      return null;
  }
};

const StatisticsPeriodSelector: React.FC<StatisticsPeriodSelectorProps> = ({
  value,
  dateRange,
  onChange,
  showCustom = true,
  disabled = false,
}) => {
  const intl = useIntl();
  const [innerValue, setInnerValue] = React.useState<string>(value || 'month');

  React.useEffect(() => {
    if (value) {
      setInnerValue(value);
    }
  }, [value]);

  const currentRange = useMemo(() => {
    if (dateRange) {
      return dateRange;
    }
    return getRangeForKey(innerValue);
  }, [innerValue, dateRange]);

  const handlePeriodChange = (val: string) => {
    setInnerValue(val);
    const range = getRangeForKey(val);
    if (val === 'custom') {
      onChange(range || (dateRange ? [dateRange[0].startOf('day'), dateRange[1].startOf('day')] : null), val);
    } else {
      onChange(range, val);
    }
  };

  const handleRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setInnerValue('custom');
      const range: [Dayjs, Dayjs] = [dates[0].startOf('day'), dates[1].startOf('day')];
      onChange(range, 'custom');
    } else {
      onChange(null, innerValue);
    }
  };

  return (
    <Space wrap>
      <Radio.Group
        value={innerValue}
        onChange={(e) => handlePeriodChange(e.target.value)}
        disabled={disabled}
      >
        <Radio.Button value="week">
          {intl.formatMessage({
            id: 'pages.statistics.period.week',
            defaultMessage: '本周',
          })}
        </Radio.Button>
        <Radio.Button value="month">
          {intl.formatMessage({
            id: 'pages.statistics.period.month',
            defaultMessage: '本月',
          })}
        </Radio.Button>
        <Radio.Button value="quarter">
          {intl.formatMessage({
            id: 'pages.statistics.period.quarter',
            defaultMessage: '本季',
          })}
        </Radio.Button>
        <Radio.Button value="year">
          {intl.formatMessage({
            id: 'pages.statistics.period.year',
            defaultMessage: '本年',
          })}
        </Radio.Button>
        {showCustom && (
          <Radio.Button value="custom">
            {intl.formatMessage({
              id: 'pages.statistics.period.custom',
              defaultMessage: '自定义',
            })}
          </Radio.Button>
        )}
      </Radio.Group>

      {innerValue === 'custom' && (
        <RangePicker
          value={currentRange as [Dayjs, Dayjs]}
          onChange={handleRangeChange}
          disabled={disabled}
          allowClear={false}
        />
      )}
    </Space>
  );
};

export default StatisticsPeriodSelector;
