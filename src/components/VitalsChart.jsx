// doctor-dashboard/src/components/VitalsChart.jsx
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

const VitalsChart = ({ 
  data, 
  title, 
  dataKey, 
  color, 
  chartType = 'line',        // 'line' or 'bar'
  xAxisDataKey = 'timestamp', // field name for X-axis values
  yAxisDomain = [null, null], // e.g., [0, 1] or ['auto', 'auto']
  yAxisFormatter = (value) => value, // function to format Y-axis labels
  xAxisFormatter = (timestamp) => format(new Date(timestamp), 'MM/dd') // date format
}) => {
  // Prepare data: ensure it's an array and sort by timestamp
  const sortedData = [...data].sort((a, b) => new Date(a[xAxisDataKey]) - new Date(b[xAxisDataKey]));

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
  const DataComponent = chartType === 'bar' ? Bar : Line;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={xAxisDataKey} 
            tick={{ fontSize: 12 }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={yAxisDomain}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy HH:mm')}
            formatter={(value) => [yAxisFormatter(value), title]}
          />
          <DataComponent 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fill={chartType === 'bar' ? color : 'none'}
            strokeWidth={2}
            dot={chartType === 'line' ? { fill: color, r: 4 } : false}
            activeDot={chartType === 'line' ? { r: 6 } : undefined}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default VitalsChart;