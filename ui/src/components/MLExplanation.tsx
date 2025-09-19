import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { getMLExplanation, ExplainRequest, ExplainResponse } from '../api';

const MLExplanation: React.FC = () => {
  const [skuId, setSkuId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);

  const handleExplain = async () => {
    if (!skuId.trim() || !warehouseId.trim()) {
      setError('Please enter both SKU ID and Warehouse ID');
      return;
    }

    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const request: ExplainRequest = {
        sku_id: skuId.trim(),
        warehouse_id: warehouseId.trim(),
      };

      const response = await getMLExplanation(request);
      setExplanation(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get ML explanation');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleExplain();
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('lag')) return <TrendingUpIcon color="info" />;
    if (feature.includes('mean') || feature.includes('std')) return <TrendingDownIcon color="secondary" />;
    return <PsychologyIcon color="primary" />;
  };

  const getFeatureColor = (importance: number) => {
    if (importance > 0.5) return 'error';
    if (importance > 0.3) return 'warning';
    return 'success';
  };

  const formatFeatureName = (feature: string) => {
    return feature
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <PsychologyIcon color="primary" />
        <Typography variant="h5">ML Model Explanation</Typography>
        <Chip label="SHAP Values" size="small" color="primary" variant="outlined" />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Understand what drives the ML model's predictions by analyzing feature importance using SHAP values.
      </Typography>

      {/* Input Form */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="SKU ID"
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., X_001"
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Warehouse ID"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., bangalore"
            disabled={loading}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={handleExplain}
        disabled={loading || !skuId.trim() || !warehouseId.trim()}
        startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
        sx={{ mb: 3 }}
      >
        {loading ? 'Analyzing...' : 'Explain Prediction'}
      </Button>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Explanation Results */}
      {explanation && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Model Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    SKU ID
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {explanation.sku_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Warehouse ID
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {explanation.warehouse_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Model Used
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {explanation.model}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>
            Top 5 Most Important Features
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Features are ranked by their SHAP values, showing how much each feature contributes to the prediction.
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Feature</TableCell>
                  <TableCell align="right">SHAP Value</TableCell>
                  <TableCell align="right">Importance</TableCell>
                  <TableCell align="center">Impact</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {explanation.top_features.map((feature: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip
                        label={`#${index + 1}`}
                        size="small"
                        color={getFeatureColor(feature.importance)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFeatureIcon(feature.feature)}
                        <Typography variant="body2">
                          {formatFeatureName(feature.feature)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={feature.shap_value >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {feature.shap_value.toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {feature.importance.toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LinearProgress
                          variant="determinate"
                          value={feature.importance * 100}
                          color={getFeatureColor(feature.importance)}
                          sx={{ width: 60, mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(feature.importance * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>How to interpret:</strong> Positive SHAP values indicate the feature increases the prediction, 
              while negative values decrease it. The importance score shows the relative impact of each feature 
              on the model's decision.
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default MLExplanation;
