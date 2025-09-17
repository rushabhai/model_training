import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Box,
} from '@mui/material';
import {
  TrendingUp,
  BarChart as BarChartIcon,
  Visibility,
} from '@mui/icons-material';
import { TopSeries } from '../types';
import { formatNumber, formatCurrency, getRiskColor } from '../theme';

interface TopSeriesTableProps {
  data: TopSeries[];
  onSeriesClick: (sku_id: string, warehouse_id: string) => void;
}

const TopSeriesTable: React.FC<TopSeriesTableProps> = ({ data, onSeriesClick }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const calculateRiskLevel = (avgDemand: number, avgInventory: number): { level: string; color: string } => {
    if (avgDemand === 0) return { level: 'Unknown', color: '#666' };
    
    const daysOfCover = avgInventory / avgDemand;
    
    if (daysOfCover < 7) return { level: 'High Risk', color: getRiskColor(60, 'stockout') };
    if (daysOfCover < 14) return { level: 'Medium Risk', color: getRiskColor(35, 'stockout') };
    if (daysOfCover > 90) return { level: 'Overstock', color: getRiskColor(30, 'overstock') };
    return { level: 'Low Risk', color: getRiskColor(10, 'stockout') };
  };

  const calculatePerformanceScore = (totalDemand: number, avgDemand: number, daysAvailable: number): number => {
    // Simple performance score based on demand consistency and volume
    const consistency = daysAvailable > 0 ? (avgDemand * daysAvailable) / totalDemand : 0;
    const volumeScore = Math.min(totalDemand / 1000, 1); // Normalize to max 1000 units
    return Math.round((consistency * 0.6 + volumeScore * 0.4) * 100);
  };

  const paginatedData = data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Top Performing Series
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SKUs ranked by total demand with risk assessment
            </Typography>
          </Box>
          <Chip 
            icon={<TrendingUp />}
            label={`${data.length} Series`}
            color="primary"
            variant="outlined"
          />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total Demand</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Avg Daily</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Avg Inventory</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Revenue</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Risk Level</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Performance</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.map((series, index) => {
                const rank = page * rowsPerPage + index + 1;
                const riskInfo = calculateRiskLevel(series.avg_demand, series.avg_inventory);
                const performanceScore = calculatePerformanceScore(
                  series.total_demand, 
                  series.avg_demand,
                  series.data_points
                );

                return (
                  <TableRow 
                    key={`${series.sku_id}-${series.warehouse_id}`}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      borderLeft: `4px solid ${riskInfo.color}`,
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                    onClick={() => onSeriesClick(series.sku_id, series.warehouse_id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        #{rank}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {series.sku_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {series.brand}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {series.warehouse_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {series.product_category}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatNumber(series.total_demand, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        units
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {series.avg_demand.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(series.avg_inventory, 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(series.total_revenue || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={riskInfo.level}
                        size="small"
                        sx={{
                          backgroundColor: riskInfo.color,
                          color: 'white',
                          fontWeight: 600,
                          minWidth: 80
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Typography variant="body2" fontWeight={600}>
                          {performanceScore}%
                        </Typography>
                        <BarChartIcon 
                          fontSize="small" 
                          sx={{ 
                            color: performanceScore >= 70 ? 'success.main' : 
                                   performanceScore >= 40 ? 'warning.main' : 'error.main'
                          }} 
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Forecast">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeriesClick(series.sku_id, series.warehouse_id);
                          }}
                          sx={{ color: 'primary.main' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </CardContent>
    </Card>
  );
};

export default TopSeriesTable;
