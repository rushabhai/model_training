import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import GlobalFilters from './GlobalFilters';
import KPICard from './KPICard';
import ForecastChart from './ForecastChart';
import RiskDistributionChart from './RiskDistributionChart';
import TopSeriesTable from './TopSeriesTable';
import ForecastDialog from './ForecastDialog';
import { getDashboardData, analyzeDemand } from '../api';
import { DashboardData, GlobalFilters as GlobalFiltersType, DemandAnalysisResult } from '../types';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GlobalFiltersType>({});
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<{sku_id: string, warehouse_id: string} | null>(null);
  const [demandAnalysisOpen, setDemandAnalysisOpen] = useState(false);
  const [demandAnalysisData, setDemandAnalysisData] = useState<DemandAnalysisResult | null>(null);
  const [demandAnalysisLoading, setDemandAnalysisLoading] = useState(false);

  useEffect(() => {
    loadDashboardData(filters);
  }, []);

  const loadDashboardData = async (currentFilters: GlobalFiltersType) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardData(currentFilters);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: GlobalFiltersType) => {
    setFilters(newFilters);
    loadDashboardData(newFilters);
  };

  const handleSeriesClick = (sku_id: string, warehouse_id: string) => {
    setSelectedSeries({ sku_id, warehouse_id });
    setForecastDialogOpen(true);
  };

  const handleCheckDemand = async () => {
    setDemandAnalysisLoading(true);
    try {
      const analysisResult = await analyzeDemand({
        filters,
        analysis_horizon_days: 90,
        include_inventory_optimization: true,
        include_transfer_recommendations: true
      });
      setDemandAnalysisData(analysisResult);
      setDemandAnalysisOpen(true);
    } catch (err) {
      setError('Failed to analyze demand. Please try again.');
    } finally {
      setDemandAnalysisLoading(false);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  if (!dashboardData && loading) {
    return (
      <Backdrop open={loading} sx={{ zIndex: 9999 }}>
        <CircularProgress color="primary" size={60} />
      </Backdrop>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%', mx: 'auto' }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Brand X Inventory Forecasting Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Real-time inventory insights and demand forecasting analytics
        </Typography>
      </Box>

      {/* Global Filters */}
      <GlobalFilters onFiltersChange={handleFiltersChange} loading={loading} />

      {dashboardData && (
        <>
          {/* KPI Grid */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Key Performance Indicators
              </Typography>
            </Grid>

            {/* Forecast Accuracy KPIs */}
            <Grid item xs={12} sm={6} md={2}>
              <KPICard
                title="WAPE"
                value={dashboardData.kpis.wape}
                format="percentage"
                riskType="service"
                trend={-2.3}
                decimals={2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KPICard
                title="MAE"
                value={dashboardData.kpis.mae}
                format="number"
                riskType="service"
                trend={-1.8}
                decimals={2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <KPICard
                title="API Response Time"
                value={dashboardData.response_time_ms}
                format="number"
                unit="ms"
                decimals={2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="MAPE"
                value={dashboardData.kpis.mape}
                format="percentage"
                riskType="service"
                trend={-1.8}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Bias (ME%)"
                value={dashboardData.kpis.bias_me_pct}
                format="percentage"
                trend={0.5}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Forecast Value Add"
                value={dashboardData.kpis.forecast_value_add}
                format="percentage"
                trend={1.2}
              />
            </Grid>

            {/* Service Level KPIs */}
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Service Level"
                value={dashboardData.kpis.service_level}
                format="percentage"
                riskType="service"
                trend={0.8}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Fill Rate"
                value={dashboardData.kpis.fill_rate}
                format="percentage"
                riskType="service"
                trend={-0.3}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Stockout Risk"
                value={dashboardData.kpis.stockout_risk}
                format="percentage"
                riskType="stockout"
                trend={-1.5}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Cycle Service Level"
                value={dashboardData.kpis.cycle_service_level}
                format="percentage"
                riskType="service"
                trend={0.4}
              />
            </Grid>

            {/* Inventory KPIs */}
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Overstock %"
                value={dashboardData.kpis.overstock_pct}
                format="percentage"
                riskType="overstock"
                trend={-0.7}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Inventory Turns"
                value={dashboardData.kpis.inventory_turns}
                decimals={1}
                trend={0.3}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Days of Cover"
                value={dashboardData.kpis.days_of_cover}
                decimals={0}
                unit=" days"
                trend={-2.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Revenue at Risk"
                value={dashboardData.kpis.revenue_at_risk}
                format="currency"
                trend={-5.2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Lost Sales Units"
                value={dashboardData.kpis.lost_sales_units}
                format="number"
                unit="units"
                trend={-3.1}
                decimals={0}
              />
            </Grid>
          </Grid>

          {/* Seasonal Forecasting KPIs */}
          {(dashboardData.kpis.next_quarter_demand_forecast || 
            dashboardData.kpis.seasonal_adjustment_factor || 
            dashboardData.kpis.holiday_impact_pct) && (
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Next Quarter Demand Forecasting
                </Typography>
              </Grid>
              
              {dashboardData.kpis.next_quarter_demand_forecast && (
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Next Quarter Demand"
                    value={dashboardData.kpis.next_quarter_demand_forecast}
                    format="number"
                    unit="units"
                    trend={2.5}
                    decimals={0}
                  />
                </Grid>
              )}
              
              {dashboardData.kpis.seasonal_adjustment_factor && (
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Seasonal Factor"
                    value={dashboardData.kpis.seasonal_adjustment_factor}
                    format="number"
                    trend={0.15}
                    decimals={3}
                  />
                </Grid>
              )}
              
              {dashboardData.kpis.holiday_impact_pct && (
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Holiday Impact"
                    value={dashboardData.kpis.holiday_impact_pct}
                    format="percentage"
                    trend={1.8}
                    decimals={1}
                  />
                </Grid>
              )}
              
              {dashboardData.kpis.festive_season_uplift && (
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Festive Season Uplift"
                    value={dashboardData.kpis.festive_season_uplift}
                    format="percentage"
                    trend={3.2}
                    decimals={1}
                  />
                </Grid>
              )}
              
              {dashboardData.kpis.demand_volatility_index && (
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Demand Volatility Index"
                    value={dashboardData.kpis.demand_volatility_index}
                    format="percentage"
                    trend={-0.8}
                    decimals={1}
                  />
                </Grid>
              )}
            </Grid>
          )}

          {/* Demand Analysis Action */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" gap={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleCheckDemand}
                  disabled={loading}
                  sx={{
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}
                >
                  🔍 Check Demand Analysis
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Charts and Analytics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={6}>
              <ForecastChart data={dashboardData.forecast_accuracy_trend} />
            </Grid>
            <Grid item xs={12} md={6}>
              <RiskDistributionChart 
                data={dashboardData.risk_distribution}
                kpis={dashboardData.kpis}
              />
            </Grid>
          </Grid>

          {/* Top Series Table */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TopSeriesTable 
                data={dashboardData.top_series}
                onSeriesClick={handleSeriesClick}
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* Forecast Dialog */}
      {selectedSeries && (
        <ForecastDialog
          open={forecastDialogOpen}
          onClose={() => setForecastDialogOpen(false)}
          sku_id={selectedSeries.sku_id}
          warehouse_id={selectedSeries.warehouse_id}
        />
      )}

      {/* Loading Backdrop */}
      <Backdrop open={loading} sx={{ zIndex: 1300 }}>
        <CircularProgress color="primary" size={60} />
      </Backdrop>

      {/* Demand Analysis Dialog */}
      <Dialog
        open={demandAnalysisOpen}
        onClose={() => setDemandAnalysisOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight={600}>
            📈 Demand Analysis & Inventory Optimization
          </Typography>
        </DialogTitle>
        <DialogContent>
          {demandAnalysisData && (
            <Box>
              {/* Summary Cards */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {demandAnalysisData.total_forecasted_demand.toFixed(0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Forecasted Demand
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="secondary">
                        {demandAnalysisData.execution_summary.high_priority_actions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        High Priority Actions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="warning.main">
                        {demandAnalysisData.transfer_recommendations.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Transfer Recommendations
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="error.main">
                        {demandAnalysisData.risk_alerts.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Critical Alerts
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Inventory Optimization */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                🏢 Warehouse Inventory Optimization
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Warehouse</TableCell>
                      <TableCell align="right">Current Inventory</TableCell>
                      <TableCell align="right">Recommended</TableCell>
                      <TableCell align="right">Deficit/Surplus</TableCell>
                      <TableCell align="center">Action Required</TableCell>
                      <TableCell align="center">Priority</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {demandAnalysisData.inventory_optimization.map((opt) => (
                      <TableRow key={opt.warehouse_id}>
                        <TableCell>{opt.warehouse_id}</TableCell>
                        <TableCell align="right">{opt.current_inventory.toFixed(0)}</TableCell>
                        <TableCell align="right">{opt.recommended_inventory.toFixed(0)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            color={opt.deficit_surplus < 0 ? 'error' : 'success.main'}
                            fontWeight={600}
                          >
                            {opt.deficit_surplus > 0 ? '+' : ''}{opt.deficit_surplus.toFixed(0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={opt.action_required}
                            size="small"
                            color={
                              opt.action_required === 'RESTOCK' ? 'error' :
                              opt.action_required === 'TRANSFER_IN' ? 'warning' :
                              opt.action_required === 'TRANSFER_OUT' ? 'info' : 'success'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={opt.priority_level}
                            size="small"
                            variant="outlined"
                            color={
                              opt.priority_level === 'HIGH' ? 'error' :
                              opt.priority_level === 'MEDIUM' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Transfer Recommendations */}
              {demandAnalysisData.transfer_recommendations.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                    🚚 Transfer Recommendations
                  </Typography>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>From</TableCell>
                          <TableCell>To</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="center">Urgency</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {demandAnalysisData.transfer_recommendations.slice(0, 5).map((rec, index) => (
                          <TableRow key={index}>
                            <TableCell>{rec.from_warehouse}</TableCell>
                            <TableCell>{rec.to_warehouse}</TableCell>
                            <TableCell>{rec.sku_id}</TableCell>
                            <TableCell align="right">{rec.recommended_quantity.toFixed(0)}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={rec.urgency}
                                size="small"
                                color={
                                  rec.urgency === 'HIGH' ? 'error' :
                                  rec.urgency === 'MEDIUM' ? 'warning' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>{rec.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Financial Impact */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                💰 Financial Impact Analysis
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <CardContent>
                      <Typography variant="h6">
                        ₹{demandAnalysisData.financial_impact.potential_lost_sales_value?.toFixed(0) || '0'}
                      </Typography>
                      <Typography variant="body2">
                        Potential Lost Sales Value
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <CardContent>
                      <Typography variant="h6">
                        ₹{demandAnalysisData.financial_impact.potential_holding_cost_savings?.toFixed(0) || '0'}
                      </Typography>
                      <Typography variant="body2">
                        Potential Savings
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
          
          {demandAnalysisLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDemandAnalysisOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
