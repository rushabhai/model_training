import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import AIChat from './AIChat';
import { getDashboardData } from '../api';
import { DashboardData, GlobalFilters as GlobalFiltersType } from '../types';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GlobalFiltersType>({});
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<{sku_id: string, warehouse_id: string} | null>(null);

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

  const navigate = useNavigate();

  const handleCheckDemand = () => {
    // Navigate to demand analysis page with current filters
    navigate('/demand-analysis', {
      state: { filters }
    });
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
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/ml-explanation')}
                  sx={{
                    borderColor: 'secondary.main',
                    color: 'secondary.main',
                    '&:hover': { 
                      borderColor: 'secondary.dark',
                      bgcolor: 'secondary.light',
                      color: 'secondary.dark'
                    },
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}
                >
                  🧠 ML Model Explanation
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

          {/* AI Assistant */}
          <Grid container spacing={3} mt={2}>
            <Grid item xs={12}>
              <AIChat 
                context={`Current dashboard shows service level of ${dashboardData.kpis.service_level?.toFixed(1) || 0}% and WAPE accuracy of ${dashboardData.kpis.wape?.toFixed(1) || 0}%.`}
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
