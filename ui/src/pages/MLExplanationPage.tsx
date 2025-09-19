import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { Psychology as PsychologyIcon } from '@mui/icons-material';
import MLExplanation from '../components/MLExplanation';

const MLExplanationPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <PsychologyIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            ML Model Explanation
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Understand what drives your ML model's predictions using SHAP values
          </Typography>
        </Box>
      </Box>

      {/* ML Explanation Component */}
      <MLExplanation />
    </Container>
  );
};

export default MLExplanationPage;
