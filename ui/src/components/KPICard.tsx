import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  InfoOutlined,
} from '@mui/icons-material';
import { getRiskColor, formatNumber, formatCurrency } from '../theme';
import { KPICardProps } from '../types';

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit = '',
  trend,
  riskType,
  format = 'number',
  decimals = 1,
}) => {
  const formatValue = (val: number | string | undefined | null): string => {
    if (typeof val === 'string') return val;
    
    // Handle undefined, null, or invalid values
    if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
      return '0.0000';
    }
    
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return `${val.toFixed(decimals)}%`;
      case 'number':
      default:
        return formatNumber(val, decimals);
    }
  };

  const getValueColor = (): string => {
    if (typeof value !== 'number' || !riskType) return 'text.primary';
    return getRiskColor(value, riskType);
  };

  const getTrendIcon = () => {
    if (trend === undefined) return undefined;
    
    const Icon = trend >= 0 ? TrendingUp : TrendingDown;
    const color = trend >= 0 ? 'success.main' : 'error.main';
    
    return (
      <Icon sx={{ color, fontSize: 16, ml: 0.5 }} />
    );
  };

  const getTrendChip = () => {
    if (trend === undefined) return null;
    
    const isPositive = trend >= 0;
    const chipColor = isPositive ? 'success' : 'error';
    const trendText = `${isPositive ? '+' : ''}${trend.toFixed(1)}%`;
    
    return (
      <Chip
        label={trendText}
        size="small"
        color={chipColor}
        variant="outlined"
        {...(getTrendIcon() && { icon: getTrendIcon() })}
        sx={{ 
          height: 20, 
          fontSize: '0.75rem',
          '& .MuiChip-icon': { fontSize: 14 }
        }}
      />
    );
  };

  const getTooltipText = (): string => {
    const tooltips: Record<string, string> = {
      'WAPE': 'Weighted Absolute Percentage Error - Lower is better. <5% is excellent, <15% is good.',
      'MAE': 'Mean Absolute Error - Average absolute difference between forecasted and actual values in units. Lower is better.',
      'MAPE': 'Mean Absolute Percentage Error - Average forecast accuracy across all items.',
      'Bias (ME%)': 'Forecast bias as percentage. Positive = over-forecasting, Negative = under-forecasting.',
      'Service Level': 'Percentage of days with sufficient inventory to meet demand. Target: >95%.',
      'Fill Rate': 'Percentage of demand fulfilled from available inventory. Target: >98%.',
      'Stockout Risk': 'Probability of stockout in next period. <20% is low risk, >50% is high risk.',
      'Overstock %': 'Percentage of excess inventory above target levels. >25% indicates overstock.',
      'Inventory Turns': 'How many times inventory is sold per year. Higher is generally better.',
      'Days of Cover': 'How many days current inventory will last at average demand. 30-60 days is typical.',
      'Revenue at Risk': 'Potential revenue loss due to stockouts and lost sales.',
      'Lost Sales': 'Units of demand that could not be fulfilled due to stockouts.',
      'Forecast Value Add': 'Improvement in accuracy vs baseline forecast. Positive values are good.',
      'API Response Time': 'Time taken to fetch and process dashboard data in milliseconds. Lower is better for performance.',
    };
    
    return tooltips[title] || `${title} metric for inventory performance monitoring.`;
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        borderLeft: riskType ? `4px solid ${getValueColor()}` : 'none',
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontWeight: 500,
              lineHeight: 1.2,
              maxWidth: '80%'
            }}
          >
            {title}
          </Typography>
          <Tooltip title={getTooltipText()} arrow placement="top">
            <IconButton size="small" sx={{ p: 0.25, opacity: 0.6 }}>
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography
            variant="h5"
            component="div"
            sx={{ 
              color: getValueColor(),
              fontWeight: 600,
              lineHeight: 1.1,
            }}
          >
            {formatValue(value)}{unit}
          </Typography>
          
          {getTrendChip()}
        </Box>
        
        {/* Risk level indicator */}
        {riskType && typeof value === 'number' && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              {riskType === 'stockout' && value >= 50 && 'High Risk'}
              {riskType === 'stockout' && value >= 20 && value < 50 && 'Medium Risk'}
              {riskType === 'stockout' && value < 20 && 'Low Risk'}
              {riskType === 'service' && value < 90 && 'Below Target'}
              {riskType === 'service' && value >= 90 && value < 95 && 'Needs Improvement'}
              {riskType === 'service' && value >= 95 && 'Good Performance'}
              {riskType === 'overstock' && value > 25 && 'Overstock Alert'}
              {riskType === 'overstock' && value <= 25 && 'Healthy Level'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;
