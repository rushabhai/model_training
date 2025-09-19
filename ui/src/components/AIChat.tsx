import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { getAIResponse, AIRequest, AIResponse } from '../api';

interface AIChatProps {
  context?: string; // Optional context about current data/filters
}

const AIChat: React.FC<AIChatProps> = ({ context }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string; timestamp: Date }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: userMessage, timestamp: new Date() }];
    setMessages(newMessages);

    try {
      // Prepare context-aware prompt
      let prompt = userMessage;
      if (context) {
        prompt = `Context: ${context}\n\nUser Question: ${userMessage}`;
      }

      const request: AIRequest = {
        prompt,
        max_tokens: 1000,
        temperature: 0.7,
      };

      const response: AIResponse = await getAIResponse(request);
      
      // Add AI response
      setMessages([...newMessages, { 
        role: 'ai', 
        content: response.response, 
        timestamp: new Date() 
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const suggestedPrompts = [
    "What are the key insights from the current inventory data?",
    "How can I optimize inventory levels for better performance?",
    "What are the main risks I should be aware of?",
    "Suggest improvements for demand forecasting accuracy",
    "Analyze the seasonal patterns in the data",
  ];

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h6">AI Assistant</Typography>
          <Chip label="Powered by Groq" size="small" color="primary" variant="outlined" />
        </Box>
        <IconButton onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          {/* Suggested Prompts */}
          {messages.length === 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Suggested questions:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {suggestedPrompts.map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    size="small"
                    onClick={() => setInput(prompt)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, maxHeight: 300 }}>
            {messages.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Ask me anything about your inventory data, forecasting, or optimization strategies!
              </Typography>
            ) : (
              messages.map((message, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {message.role === 'ai' ? (
                      <AIIcon color="primary" sx={{ mt: 0.5, fontSize: 20 }} />
                    ) : (
                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.5 }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {message.role === 'ai' ? 'AI Assistant' : 'You'} • {message.timestamp.toLocaleTimeString()}
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                    </Box>
                  </Box>
                  {index < messages.length - 1 && <Divider sx={{ mt: 1 }} />}
                </Box>
              ))
            )}
            
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <AIIcon color="primary" sx={{ fontSize: 20 }} />
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  AI is thinking...
                </Typography>
              </Box>
            )}
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Input Area */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask about inventory insights, optimization strategies, or data analysis..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
              sx={{ minWidth: 100 }}
            >
              {loading ? 'Sending' : 'Send'}
            </Button>
          </Box>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={clearChat}
              sx={{ mt: 1, alignSelf: 'flex-start' }}
            >
              Clear Chat
            </Button>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default AIChat;
