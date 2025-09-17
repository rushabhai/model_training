import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { getFilterOptions, setGlobalFilters } from '../api';
import { GlobalFilters as GlobalFiltersType, FilterOptions } from '../types';

interface GlobalFiltersProps {
  onFiltersChange: (filters: GlobalFiltersType) => void;
  loading?: boolean;
}

const GlobalFilters: React.FC<GlobalFiltersProps> = ({ onFiltersChange, loading = false }) => {
  const [filters, setFilters] = useState<GlobalFiltersType>({});
  const [options, setOptions] = useState<FilterOptions>({
    brands: [],
    channels: [],
    warehouses: [],
    categories: [],
  });
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(1, 'year'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const filterOptions = await getFilterOptions();
      setOptions(filterOptions);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const handleFilterChange = (field: keyof GlobalFiltersType, value: string | boolean | null) => {
    const newFilters = {
      ...filters,
      [field]: value === null ? undefined : value,
    };
    
    // Remove undefined values
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key as keyof GlobalFiltersType] === undefined) {
        delete newFilters[key as keyof GlobalFiltersType];
      }
    });
    
    setFilters(newFilters);
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: Dayjs | null) => {
    if (field === 'start_date') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    
    const newFilters = {
      ...filters,
      [field]: value ? value.format('YYYY-MM-DD') : undefined,
    };
    
    setFilters(newFilters);
  };

  const applyFilters = () => {
    const finalFilters = {
      ...filters,
      start_date: startDate ? startDate.format('YYYY-MM-DD') : undefined,
      end_date: endDate ? endDate.format('YYYY-MM-DD') : undefined,
    };
    
    // Remove undefined values
    Object.keys(finalFilters).forEach(key => {
      if (finalFilters[key as keyof GlobalFiltersType] === undefined) {
        delete finalFilters[key as keyof GlobalFiltersType];
      }
    });
    
    setGlobalFilters(finalFilters);
    onFiltersChange(finalFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    setStartDate(dayjs().subtract(1, 'year'));
    setEndDate(dayjs());
    setGlobalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => filters[key as keyof GlobalFiltersType]).length;
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <FilterListIcon color="primary" />
            <Typography variant="h6">Global Filters</Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip 
                label={`${getActiveFiltersCount()} active`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Box>
          <Button
            startIcon={<ClearIcon />}
            onClick={clearFilters}
            variant="outlined"
            size="small"
            disabled={getActiveFiltersCount() === 0}
          >
            Clear All
          </Button>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Brand</InputLabel>
              <Select
                value={filters.brand || ''}
                label="Brand"
                onChange={(e) => handleFilterChange('brand', e.target.value)}
              >
                <MenuItem value="">All Brands</MenuItem>
                {options.brands.map((brand) => (
                  <MenuItem key={brand} value={brand}>
                    {brand}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Channel</InputLabel>
              <Select
                value={filters.channel_id || ''}
                label="Channel"
                onChange={(e) => handleFilterChange('channel_id', e.target.value)}
              >
                <MenuItem value="">All Channels</MenuItem>
                {options.channels.map((channel) => (
                  <MenuItem key={channel} value={channel}>
                    {channel}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse</InputLabel>
              <Select
                value={filters.warehouse_id || ''}
                label="Warehouse"
                onChange={(e) => handleFilterChange('warehouse_id', e.target.value)}
              >
                <MenuItem value="">All Warehouses</MenuItem>
                {options.warehouses.map((warehouse) => (
                  <MenuItem key={warehouse} value={warehouse}>
                    {warehouse}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.product_category || ''}
                label="Category"
                onChange={(e) => handleFilterChange('product_category', e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {options.categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(value) => handleDateChange('start_date', value)}
                slotProps={{
                  textField: { size: 'small', fullWidth: true }
                }}
                format="YYYY-MM-DD"
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(value) => handleDateChange('end_date', value)}
                slotProps={{
                  textField: { size: 'small', fullWidth: true }
                }}
                format="YYYY-MM-DD"
              />
            </LocalizationProvider>
          </Grid>

          {/* New Temporal Aggregation Controls */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Aggregation</InputLabel>
              <Select
                value={filters.time_aggregation || ''}
                label="Time Aggregation"
                onChange={(e) => handleFilterChange('time_aggregation', e.target.value)}
              >
                <MenuItem value="">Default (Daily)</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Holiday Analysis</InputLabel>
              <Select
                value={filters.include_holidays === false ? 'no' : 'yes'}
                label="Holiday Analysis"
                onChange={(e) => handleFilterChange('include_holidays', e.target.value === 'yes')}
              >
                <MenuItem value="yes">Include Holidays</MenuItem>
                <MenuItem value="no">Exclude Holidays</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Next Quarter Forecast</InputLabel>
              <Select
                value={filters.forecast_next_quarter ? 'yes' : 'no'}
                label="Next Quarter Forecast"
                onChange={(e) => handleFilterChange('forecast_next_quarter', e.target.value === 'yes')}
              >
                <MenuItem value="no">Standard KPIs</MenuItem>
                <MenuItem value="yes">Include Q+1 Forecast</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={12}>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={applyFilters}
                disabled={loading}
                sx={{ minWidth: 100 }}
              >
                Apply Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default GlobalFilters;
