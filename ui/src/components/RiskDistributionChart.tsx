import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { KPIMetrics } from '../types';
import { theme } from '../theme';

interface RiskDistributionChartProps {
  data: Record<string, number>;
  kpis: KPIMetrics;
}

const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ data, kpis }) => {
  const chartData = [
    { name: 'Low Risk', value: data.low_risk || 0, color: theme.palette.success.main },
    { name: 'Medium Risk', value: data.medium_risk || 0, color: theme.palette.warning.main },
    { name: 'High Risk', value: data.high_risk || 0, color: theme.palette.error.main },
    { name: 'Overstock', value: data.overstock || 0, color: theme.palette.info.main },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const renderTooltip = (props: any) => {
    if (props.active && props.payload) {
      const data = props.payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      return (
        <Box
          sx={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: 1,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {data.name}
          </Typography>
          <Typography variant="body2">
            Count: {data.value}
          </Typography>
          <Typography variant="body2">
            Percentage: {percentage}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    return (
      <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center" mt={1}>
        {props.payload.map((entry: any, index: number) => (
          <Chip
            key={index}
            label={`${entry.value}: ${entry.payload.value}`}
            size="small"
            sx={{
              backgroundColor: entry.color,
              color: 'white',
              fontWeight: 600,
              '& .MuiChip-label': { px: 1 }
            }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Card sx={{ height: 400 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Risk Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          SKU count by risk category
        </Typography>

        <Box sx={{ height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={renderTooltip} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Risk Summary */}
        <Grid container spacing={2} mt={1}>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h6" color="error.main" fontWeight={600}>
                {kpis.high_risk_skus}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                High Risk SKUs
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h6" color="info.main" fontWeight={600}>
                {kpis.overstock_skus}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Overstock SKUs
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Risk levels based on stockout probability and inventory coverage
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskDistributionChart;
