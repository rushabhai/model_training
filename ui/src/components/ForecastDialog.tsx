import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Area,
  ComposedChart,
} from 'recharts';
import { Close, TrendingUp, Assessment } from '@mui/icons-material';
import { getForecast, validateModel } from '../api';
import { ForecastResponse, ValidationResult } from '../types';
import { formatNumber, getRiskColor } from '../theme';

interface ForecastDialogProps {
  open: boolean;
  onClose: () => void;
  sku_id: string;
  warehouse_id: string;
}

const ForecastDialog: React.FC<ForecastDialogProps> = ({ 
  open, 
  onClose, 
  sku_id, 
  warehouse_id 
}) => {
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(7);
  const [activeTab, setActiveTab] = useState<'forecast' | 'validation'>('forecast');

  useEffect(() => {
    if (open && sku_id && warehouse_id) {
      loadForecastData();
    }
  }, [open, sku_id, warehouse_id, horizon]);

  const loadForecastData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const forecast = await getForecast({
        sku_id,
        warehouse_id,
        horizon,
      });
      
      setForecastData(forecast);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const loadValidationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const validation = await validateModel({
        sku_id,
        warehouse_id,
        train_end_date: '2023-12-31',
        test_start_date: '2024-01-01',
        test_end_date: '2024-12-31',
      });
      
      setValidationData(validation);
      setActiveTab('validation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load validation data');
    } finally {
      setLoading(false);
    }
  };

  const getModelColor = (bucket: string) => {
    switch (bucket) {
      case 'INTERMITTENT': return '#ff6b6b';
      case 'SMOOTH': return '#4ecdc4';
      case 'ERRATIC': return '#ffe66d';
      default: return '#666';
    }
  };

  const renderForecastChart = () => {
    if (!forecastData) return null;

    const chartData = forecastData.forecasts.map((point, index) => ({
      day: new Date(point.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      p10: point.p10,
      p50: point.p50,
      p90: point.p90,
    }));

    return (
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(2), '']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Area
              dataKey="p90"
              stroke="none"
              fill="#e3f2fd"
              fillOpacity={0.6}
              name="P90 Upper Bound"
            />
            <Area
              dataKey="p10"
              stroke="none"
              fill="#fff"
              fillOpacity={1}
              name="P10 Lower Bound"
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#1976d2"
              strokeWidth={3}
              dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
              name="P50 Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: 800 }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              Forecast Analysis: {sku_id} @ {warehouse_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detailed forecasting and validation results
            </Typography>
          </Box>
          <Button onClick={onClose} startIcon={<Close />}>
            Close
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {forecastData && !loading && (
          <>
            {/* Controls */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Forecast Horizon"
                  type="number"
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  inputProps={{ min: 1, max: 28 }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  onClick={loadValidationData}
                  startIcon={<Assessment />}
                  fullWidth
                >
                  Run Validation
                </Button>
              </Grid>
            </Grid>

            {/* Model Info */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Model Information</Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Model:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {forecastData.model.split('(')[0]}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Bucket:</Typography>
                        <Chip 
                          label={forecastData.bucket}
                          size="small"
                          sx={{ 
                            backgroundColor: getModelColor(forecastData.bucket),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">History Days:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {forecastData.history_days}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Training Days:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {forecastData.train_days}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {horizon}-Day Forecast Chart
                    </Typography>
                    {renderForecastChart()}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Forecast Table */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Forecast Details</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">P10 (Lower)</TableCell>
                        <TableCell align="right">P50 (Median)</TableCell>
                        <TableCell align="right">P90 (Upper)</TableCell>
                        <TableCell align="right">Confidence Width</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {forecastData.forecasts.map((forecast, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(forecast.day).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            {forecast.p10.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {forecast.p50.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {forecast.p90.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {(forecast.p90 - forecast.p10).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Validation Results */}
            {validationData && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Model Validation Results (2024 Test Year)
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Accuracy Metrics</Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">WAPE:</Typography>
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            sx={{ color: getRiskColor(validationData.wape, 'service') }}
                          >
                            {validationData.wape.toFixed(2)}%
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">SMAPE:</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {validationData.smape.toFixed(2)}%
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">MAE:</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {validationData.mae.toFixed(2)}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Bias:</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {validationData.bias_pct.toFixed(2)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Coverage Metrics</Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">P10 Coverage:</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {validationData.p10_coverage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">P90 Coverage:</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {validationData.p90_coverage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Interval Coverage:</Typography>
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            sx={{ 
                              color: validationData.interval_coverage >= 75 && validationData.interval_coverage <= 85 
                                ? 'success.main' : 'warning.main'
                            }}
                          >
                            {validationData.interval_coverage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForecastDialog;
