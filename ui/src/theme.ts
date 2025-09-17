import { createTheme } from '@mui/material/styles';

// Brand X Color Palette with Risk-based Extensions
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    // Risk-based color extensions
    success: {
      main: '#2e7d32', // GREEN for low risk / healthy
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02', // AMBER for medium risk
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f', // RED for high risk / stockout
      light: '#f44336',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1', // BLUE for overstock
      light: '#03a9f4',
      dark: '#01579b',
    },
    // Custom risk palette
    risk: {
      high: '#d32f2f',     // RED
      medium: '#ed6c02',   // AMBER  
      low: '#2e7d32',      // GREEN
    },
    overstock: '#0288d1',  // BLUE
    healthy: '#2e7d32',    // GREEN
  },
  typography: {
    h4: {
      fontWeight: 600,
      fontSize: '2.125rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    subtitle1: {
      fontSize: '1.1rem',
      fontWeight: 500,
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '12px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

// Extend theme interface for custom colors
declare module '@mui/material/styles' {
  interface Palette {
    risk: {
      high: string;
      medium: string;
      low: string;
    };
    overstock: string;
    healthy: string;
  }

  interface PaletteOptions {
    risk?: {
      high?: string;
      medium?: string;
      low?: string;
    };
    overstock?: string;
    healthy?: string;
  }
}

// Risk-based styling utilities
export const getRiskColor = (value: number, type: 'stockout' | 'service' | 'overstock') => {
  switch (type) {
    case 'stockout':
      if (value >= 50) return theme.palette.error.main;
      if (value >= 20) return theme.palette.warning.main;
      return theme.palette.success.main;
    
    case 'service':
      if (value < 90) return theme.palette.error.main;
      if (value < 95) return theme.palette.warning.main;
      return theme.palette.success.main;
    
    case 'overstock':
      if (value > 25) return theme.palette.info.main;
      return theme.palette.success.main;
    
    default:
      return theme.palette.text.primary;
  }
};

export const formatNumber = (value: number | undefined | null, decimals: number = 4): string => {
  // Handle undefined, null, or invalid values
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0000';
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
