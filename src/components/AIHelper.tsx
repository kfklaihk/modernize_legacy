import { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Paper,
  TextField,
  Typography,
  Fab,
  Chip,
  CircularProgress,
} from '@mui/material';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';
import { useAI } from '../hooks/useAI';
import { EXAMPLE_QUESTIONS } from '../lib/deepseek';

export function AIHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Bottom and right offsets
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { messages, loading, sendMessage, clearMessages } = useAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX + position.x,
      y: e.clientY + position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = dragStartRef.current.x - e.clientX;
      const newY = dragStartRef.current.y - e.clientY;
      
      // Boundaries
      const maxX = window.innerWidth - 424;
      const maxY = window.innerHeight - 624;
      
      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    await sendMessage(input);
    setInput('');
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle />
        </Fab>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: position.y,
            right: position.x,
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            maxWidth: 'calc(100vw - 48px)',
            transition: isDragging ? 'none' : 'bottom 0.2s, right 0.2s',
          }}
        >
          {/* Header - Movable area */}
          <Box
            onMouseDown={handleMouseDown}
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'move',
              userSelect: 'none',
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight="bold">
                AI Stock Assistant
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Powered by DeepSeek
              </Typography>
            </Box>
            <Box>
              <IconButton
                size="small"
                sx={{ color: 'white', mr: 1 }}
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 size={20} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ color: 'white' }}
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              bgcolor: '#f5f5f5',
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    bgcolor: msg.role === 'user' ? '#667eea' : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {msg.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: '0.65rem',
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <CircularProgress size={20} />
                </Paper>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Example Questions */}
          {messages.length <= 1 && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Try asking:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {EXAMPLE_QUESTIONS.slice(0, 3).map((q, idx) => (
                  <Chip
                    key={idx}
                    label={q}
                    size="small"
                    onClick={() => handleExampleClick(q)}
                    sx={{ fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask about stocks..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={loading}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <Send size={20} />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}
    </>
  );
}
