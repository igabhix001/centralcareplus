'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Slide,
  Divider,
} from '@mui/material';
import { Close, Send, SmartToy, Person } from '@mui/icons-material';
import { ChatMessage } from '@/types';

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender: 'bot',
    message: 'Hello! I\'m your medical assistant. I can help you with general health queries about common conditions like cold, fever, headache, etc. How can I assist you today?',
    timestamp: new Date().toISOString(),
  },
];

const DISCLAIMER = '⚠️ This chatbot provides general health information only and is not a substitute for professional medical advice. Please consult a doctor for proper diagnosis and treatment.';

export default function ChatWidget({ open, onClose }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate bot response (in production, this would call the Rasa API)
    setTimeout(() => {
      const botResponse = generateResponse(input.trim().toLowerCase());
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: botResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const generateResponse = (query: string): string => {
    // Simple rule-based responses (would be replaced by Rasa in production)
    if (query.includes('fever')) {
      return 'For fever, you can take paracetamol and rest. Stay hydrated and monitor your temperature. If fever persists for more than 3 days or exceeds 103°F (39.4°C), please consult a doctor immediately.';
    }
    if (query.includes('cold') || query.includes('cough')) {
      return 'For common cold symptoms, get plenty of rest, stay hydrated, and you may use over-the-counter cold medications. Honey and warm liquids can help soothe a cough. If symptoms worsen or persist beyond 10 days, please see a doctor.';
    }
    if (query.includes('headache')) {
      return 'For headaches, rest in a quiet, dark room and stay hydrated. Over-the-counter pain relievers like ibuprofen or acetaminophen may help. If headaches are severe, frequent, or accompanied by other symptoms, please consult a doctor.';
    }
    if (query.includes('stomach') || query.includes('dysentery') || query.includes('diarrhea')) {
      return 'For stomach issues, stay hydrated with ORS or clear fluids. Eat bland foods like rice, bananas, and toast. Avoid dairy and spicy foods. If you see blood in stool, have severe pain, or symptoms last more than 2 days, see a doctor immediately.';
    }
    if (query.includes('appointment') || query.includes('book')) {
      return 'You can book an appointment through the "Appointments" section in your patient portal. Browse available doctors, select a convenient time slot, and confirm your booking.';
    }
    if (query.includes('hello') || query.includes('hi')) {
      return 'Hello! How can I help you today? I can provide general guidance on common health issues like fever, cold, headache, or stomach problems.';
    }
    return 'I can help you with general health queries about common conditions. Could you please tell me more about your symptoms? Remember, for accurate diagnosis and treatment, please consult a healthcare professional.';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          width: { xs: 'calc(100% - 48px)', sm: 380 },
          height: 520,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Medical Assistant
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Online
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>

        {/* Disclaimer */}
        <Box sx={{ px: 2, py: 1, bgcolor: 'warning.light' }}>
          <Typography variant="caption" sx={{ color: 'warning.dark' }}>
            {DISCLAIMER}
          </Typography>
        </Box>

        <Divider />

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: 'background.default',
          }}
        >
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: 1,
              }}
            >
              {msg.sender === 'bot' && (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
              )}
              <Box
                sx={{
                  maxWidth: '75%',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                  boxShadow: 1,
                }}
              >
                <Typography variant="body2">{msg.message}</Typography>
              </Box>
              {msg.sender === 'user' && (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  <Person sx={{ fontSize: 18 }} />
                </Avatar>
              )}
            </Box>
          ))}
          {isTyping && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <SmartToy sx={{ fontSize: 18 }} />
              </Avatar>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Typing...
                </Typography>
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim()}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Slide>
  );
}
