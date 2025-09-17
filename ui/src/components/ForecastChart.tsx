import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AccuracyTrend } from '../types';

interface ForecastChartProps {
  data: AccuracyTrend[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  const formatTooltip = (value: number, name: string) => {
    return [`${value.toFixed(1)}%`, name === 'wape' ? 'WAPE' : 'MAPE'];
  };

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card sx={{ height: 400 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Forecast Accuracy Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Monthly WAPE and MAPE performance over time
        </Typography>
        
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                label={{ value: 'Error %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => `Date: ${formatXAxis(label)}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="wape"
                stroke="#1976d2"
                strokeWidth={3}
                dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name="WAPE"
              />
              <Line
                type="monotone"
                dataKey="mape"
                stroke="#dc004e"
                strokeWidth={3}
                dot={{ fill: '#dc004e', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name="MAPE"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Lower values indicate better forecast accuracy
          </Typography>
          <Box display="flex" gap={2}>
            <Typography variant="caption" color="primary.main">
              ● WAPE: Weighted Absolute Percentage Error
            </Typography>
            <Typography variant="caption" color="secondary.main">
              ● MAPE: Mean Absolute Percentage Error
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ForecastChart;
