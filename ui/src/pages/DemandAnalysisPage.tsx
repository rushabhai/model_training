import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import DemandAnalysisResults from '../components/DemandAnalysisResults';
import { analyzeDemand } from '../api';
import { DemandAnalysisRequest, DemandAnalysisResult } from '../types';

export const DemandAnalysisPage: React.FC = () => {
  const [demandAnalysisData, setDemandAnalysisData] = useState<DemandAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get filters from location state (passed from Dashboard)
  const filters = location.state?.filters || {};

  useEffect(() => {
    const fetchDemandAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const request: DemandAnalysisRequest = {
          filters,
          analysis_horizon_days: 90,
          include_inventory_optimization: true,
          include_transfer_recommendations: true,
        };

        const result = await analyzeDemand(request);
        setDemandAnalysisData(result);
      } catch (err) {
        console.error('Error fetching demand analysis:', err);
        setError('Failed to load demand analysis. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDemandAnalysis();
  }, [filters]);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Demand Analysis & Inventory Optimization
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Box textAlign="center">
              <CircularProgress size={60} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Analyzing demand patterns and generating optimization recommendations...
              </Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Error Loading Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Paper>
        )}

        {demandAnalysisData && !loading && !error && (
          <DemandAnalysisResults 
            data={demandAnalysisData}
            onClose={handleGoBack}
          />
        )}
      </Container>
    </Box>
  );
};

export default DemandAnalysisPage;
