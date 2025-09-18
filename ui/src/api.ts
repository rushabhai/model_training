import axios from 'axios';
import {
  DashboardData,
  GlobalFilters,
  FilterOptions,
  ForecastRequest,
  ForecastResponse,
  ValidationRequest,
  ValidationResult,
  DemandAnalysisRequest,
  DemandAnalysisResult,
} from './types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 600000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for global filters
let globalFilters: GlobalFilters = {};

export const setGlobalFilters = (filters: GlobalFilters) => {
  globalFilters = filters;
};

export const getGlobalFilters = () => globalFilters;

// API Functions
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getSystemMetrics = async () => {
  const response = await api.get('/metrics');
  return response.data;
};

export const getDashboardData = async (filters: GlobalFilters = globalFilters): Promise<DashboardData> => {
  const response = await api.post('/dashboard', filters);
  return response.data;
};

export const getFilterOptions = async (): Promise<FilterOptions> => {
  const response = await api.get('/filters/options');
  return response.data;
};

export const getForecast = async (request: ForecastRequest): Promise<ForecastResponse> => {
  // Merge with global filters
  const mergedRequest = {
    ...request,
    ...globalFilters,
    // Request-specific filters take precedence
    brand: request.brand || globalFilters.brand,
    channel_id: request.channel_id || globalFilters.channel_id,
    warehouse_id: request.warehouse_id, // Always use specific warehouse
    product_category: request.product_category || globalFilters.product_category,
    start_date: request.start_date || globalFilters.start_date,
    end_date: request.end_date || globalFilters.end_date,
  };
  
  const response = await api.post('/forecast', mergedRequest);
  return response.data;
};

export const getBatchForecast = async (items: Array<{sku_id: string, warehouse_id: string}>, horizon: number = 7) => {
  const request = {
    items,
    horizon,
    ...globalFilters,
  };
  
  const response = await api.post('/forecast/batch', request);
  return response.data;
};

export const validateModel = async (request: ValidationRequest): Promise<ValidationResult> => {
  // Merge with global filters
  const mergedRequest = {
    ...request,
    brand: request.brand || globalFilters.brand,
    channel_id: request.channel_id || globalFilters.channel_id,
    product_category: request.product_category || globalFilters.product_category,
  };
  
  const response = await api.post('/validate', mergedRequest);
  return response.data;
};

export const getDataStats = async () => {
  const response = await api.get('/data/stats');
  return response.data;
};

export const getPricingInfo = async () => {
  const response = await api.get('/pricing');
  return response.data;
};

export const optimizeDatabase = async () => {
  const response = await api.post('/database/optimize');
  return response.data;
};

export const testQueryPerformance = async () => {
  const response = await api.get('/performance/test');
  return response.data;
};

export const analyzeDemand = async (request: DemandAnalysisRequest): Promise<DemandAnalysisResult> => {
  // Merge with global filters if not provided
  const mergedRequest = {
    filters: request.filters || globalFilters,
    analysis_horizon_days: request.analysis_horizon_days || 90,
    include_inventory_optimization: request.include_inventory_optimization ?? true,
    include_transfer_recommendations: request.include_transfer_recommendations ?? true,
  };
  
  const response = await api.post('/demand/analysis', mergedRequest);
  return response.data;
};

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      throw new Error('Data not found for the selected filters');
    } else if (error.response?.status === 422) {
      throw new Error(error.response.data.detail || 'Invalid request parameters');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    throw error;
  }
);

export default api;
