import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Info,
  SwapHoriz,
  Inventory,
  AttachMoney,
} from '@mui/icons-material';
import { DemandAnalysisResult, SkuDemandAnalysis, TransferRecommendation, WarehouseInventoryData, RiskAlert } from '../types';
import { formatNumber } from '../theme';

interface DemandAnalysisResultsProps {
  data: DemandAnalysisResult;
  onClose?: () => void;
}

// Custom TabPanel component for accessibility
interface CustomTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: CustomTabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`demand-analysis-tabpanel-${index}`}
      aria-labelledby={`demand-analysis-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DemandAnalysisResults: React.FC<DemandAnalysisResultsProps> = ({ data, onClose }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'RESTOCK': return <TrendingUp color="error" />;
      case 'TRANSFER_OUT': return <TrendingDown color="success" />;
      case 'TRANSFER_IN': return <TrendingUp color="warning" />;
      case 'OPTIMAL': return <CheckCircle color="success" />;
      default: return <Info />;
    }
  };

  const formatCurrency = (value: number) => `₹${formatNumber(value, 0)}`;

  // SKU analysis is already grouped by SKU from the backend
  const groupedOptimizations = data.sku_analysis;

  return (
    <Box>
      {/* Executive Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Demand Analysis Summary
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Analysis Period: {data.analysis_period}
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {formatNumber(data.total_forecasted_demand, 0)}
                </Typography>
                <Typography variant="body2">Total Forecasted Demand</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="secondary">
                  {data.execution_summary?.total_skus_analyzed || 0}
                </Typography>
                <Typography variant="body2">SKUs Analyzed</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="error">
                  {data.execution_summary?.high_priority_actions || 0}
                </Typography>
                <Typography variant="body2">High Priority Actions</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success">
                  {formatCurrency(data.financial_impact?.net_financial_impact || 0)}
                </Typography>
                <Typography variant="body2">Net Financial Impact</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="demand analysis tabs">
            <Tab label="Financial Impact" />
            <Tab label="Inventory Optimization" />
            <Tab label="Transfer Recommendations" />
            <Tab label="Risk Alerts" />
            <Tab label="Warehouse Analysis" />
          </Tabs>
        </Box>

        {/* Financial Impact Tab */}
        <CustomTabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <AttachMoney />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Potential Lost Sales
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(data.financial_impact?.potential_lost_sales_value || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Estimated revenue at risk from stockouts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Inventory />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Potential Savings
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(data.financial_impact?.potential_holding_cost_savings || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Savings from optimized inventory levels
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Alert severity={data.financial_impact?.net_financial_impact >= 0 ? 'success' : 'warning'}>
                <Typography variant="body1">
                  <strong>Net Financial Impact: {formatCurrency(data.financial_impact?.net_financial_impact || 0)}</strong>
                </Typography>
                <Typography variant="body2">
                  {data.financial_impact?.net_financial_impact >= 0 
                    ? 'Positive impact expected from implementing recommendations'
                    : 'Review recommendations to minimize potential losses'}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </CustomTabPanel>

        {/* Inventory Optimization Tab */}
        <CustomTabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            SKU-Level Inventory Recommendations
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU ID</TableCell>
                  <TableCell>Action Required</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell align="right">Recommended Inventory</TableCell>
                  <TableCell align="right">Warehouses</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(groupedOptimizations).map((analysis: SkuDemandAnalysis, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {analysis.sku_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getActionIcon(analysis.overall_action_required)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {analysis.overall_action_required}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={analysis.overall_priority_level} 
                        color={getPriorityColor(analysis.overall_priority_level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(analysis.total_sku_forecasted_demand, 0)} units
                    </TableCell>
                    <TableCell align="right">
                      {analysis.warehouses.length}
                    </TableCell>
                    <TableCell>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">View Warehouses</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {analysis.warehouses.map((wh: WarehouseInventoryData, idx: number) => (
                            <Box key={idx} sx={{ mb: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {wh.warehouse_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Current: {formatNumber(wh.current_inventory, 0)} | 
                                Deficit/Surplus: {formatNumber(wh.deficit_surplus, 0)}
                                {wh.estimated_stockout_date && (
                                  <> | Stockout Risk: {wh.estimated_stockout_date}</>
                                )}
                              </Typography>
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>

        {/* Transfer Recommendations Tab */}
        <CustomTabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Recommended Inventory Transfers
          </Typography>
          {data.transfer_recommendations.length === 0 ? (
            <Alert severity="info">
              No transfer recommendations available. This may indicate:
              <ul>
                <li>Inventory levels are optimally distributed</li>
                <li>No significant surplus-deficit pairs identified</li>
                <li>Transfer costs may exceed benefits</li>
              </ul>
            </Alert>
          ) : (
            <List>
              {data.transfer_recommendations.map((transfer, index) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <SwapHoriz />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1">
                        <strong>{transfer.sku_id}</strong>: {transfer.recommended_quantity} units
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          From: {transfer.from_warehouse} → To: {transfer.to_warehouse}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Urgency: {transfer.urgency} | Cost-Benefit Score: {transfer.cost_benefit_score}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Reason: {transfer.reason}
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip 
                    label={transfer.urgency} 
                    color={transfer.urgency === 'HIGH' ? 'error' : transfer.urgency === 'MEDIUM' ? 'warning' : 'default'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CustomTabPanel>

        {/* Risk Alerts Tab */}
        <CustomTabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Critical Risk Alerts
          </Typography>
          {data.risk_alerts.length === 0 ? (
            <Alert severity="success">
              <Typography variant="body1">
                <strong>No Critical Risks Detected</strong>
              </Typography>
              <Typography variant="body2">
                All SKUs are within acceptable risk thresholds.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Overall Risk Alerts:</strong>
              </Typography>
              {data.risk_alerts.map((alert: RiskAlert, idx) => (
                <Box key={idx} sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    • {alert.message}
                  </Typography>
                  {alert.warehouses && alert.warehouses.map((wh_alert, wh_idx) => (
                    <Typography key={wh_idx} variant="caption" color="text.secondary" display="block" sx={{ ml: 2 }}>
                      • {wh_alert.message} (Impact: {formatCurrency(wh_alert.estimated_impact)}, Deadline: {wh_alert.action_deadline || 'N/A'})
                    </Typography>
                  ))}
                  {!alert.warehouses && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Estimated Impact: {formatCurrency(alert.estimated_impact)} | 
                      Action Deadline: {alert.action_deadline || 'TBD'} | 
                      Urgency: {alert.urgency}
                    </Typography>
                  )}
                </Box>
              ))}
            </Alert>
          )}
        </CustomTabPanel>

        {/* Warehouse Analysis Tab */}
        <CustomTabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Demand by Warehouse
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(data.demand_by_warehouse).map(([warehouse, demand]) => (
              <Grid item xs={12} sm={6} md={4} key={warehouse}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {warehouse}
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {formatNumber(demand, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Forecasted Demand
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(demand / data.total_forecasted_demand) * 100}
                      sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {((demand / data.total_forecasted_demand) * 100).toFixed(1)}% of total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Demand by Category
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(data.demand_by_category).map(([category, demand]) => (
              <Grid item xs={12} sm={6} md={4} key={category}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {category}
                    </Typography>
                    <Typography variant="h4" color="secondary">
                      {formatNumber(demand, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Forecasted Demand
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(demand / data.total_forecasted_demand) * 100}
                      sx={{ mt: 1 }}
                      color="secondary"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {((demand / data.total_forecasted_demand) * 100).toFixed(1)}% of total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CustomTabPanel>
      </Card>
    </Box>
  );
};

export default DemandAnalysisResults;
