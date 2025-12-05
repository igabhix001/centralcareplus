import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const querySchema = z.object({
  message: z.string().min(1).max(500),
});

// Rule-based responses for common health queries
const healthResponses: Record<string, string> = {
  headache: "For headaches, try resting in a quiet, dark room and staying hydrated. Over-the-counter pain relievers like ibuprofen or acetaminophen may help. If headaches are severe, persistent, or accompanied by other symptoms, please consult a doctor.",
  fever: "For fever, rest and stay hydrated. Over-the-counter medications like acetaminophen can help reduce fever. Seek medical attention if fever exceeds 103°F (39.4°C), lasts more than 3 days, or is accompanied by severe symptoms.",
  cold: "For common cold symptoms, rest, stay hydrated, and consider over-the-counter cold medications. Honey and warm liquids may soothe throat irritation. See a doctor if symptoms worsen or last more than 10 days.",
  cough: "For cough, stay hydrated and try honey or cough drops. Humidifiers can help. If cough persists for more than 2 weeks, produces blood, or is accompanied by shortness of breath, please consult a doctor.",
  stomachache: "For stomach aches, try resting and eating bland foods like crackers or toast. Avoid spicy, fatty, or acidic foods. If pain is severe, persistent, or accompanied by fever or vomiting, seek medical attention.",
  allergy: "For allergies, try to identify and avoid triggers. Over-the-counter antihistamines can help with symptoms. For severe reactions or difficulty breathing, seek emergency medical care immediately.",
  sleep: "For better sleep, maintain a consistent schedule, avoid screens before bed, limit caffeine, and create a comfortable sleep environment. If sleep problems persist, consult a healthcare provider.",
  stress: "To manage stress, try deep breathing exercises, regular physical activity, and adequate sleep. Consider talking to a mental health professional if stress significantly impacts your daily life.",
  appointment: "You can book an appointment through the 'Find Doctors' section in your patient portal. Browse available doctors, select a convenient time slot, and confirm your booking.",
  prescription: "You can view your prescriptions in the 'Medical Records' section of your patient portal. Active prescriptions show the medication details, dosage, and validity period.",
};

// Process query and generate response
function generateResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for keywords
  for (const [keyword, response] of Object.entries(healthResponses)) {
    if (lowerMessage.includes(keyword)) {
      return response;
    }
  }
  
  // Check for greetings
  if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
    return "Hello! I'm your CentralCarePlus health assistant. I can help you with general health questions, appointment booking, and navigating the portal. How can I assist you today?";
  }
  
  // Check for thanks
  if (lowerMessage.match(/(thank|thanks|thank you)/)) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  
  // Check for help request
  if (lowerMessage.match(/(help|what can you do|how do you work)/)) {
    return "I can help you with:\n• General health questions (headaches, fever, cold, etc.)\n• Booking appointments\n• Finding your prescriptions and medical records\n• Navigating the patient portal\n\nJust type your question and I'll do my best to assist!";
  }
  
  // Default response
  return "I'm not sure I understand that question. I can help with general health queries, booking appointments, and navigating the portal. For specific medical advice, please consult with a healthcare provider. Would you like to book an appointment?";
}

// Query endpoint
router.post('/query', authenticate, async (req: Request, res: Response) => {
  try {
    const { message } = querySchema.parse(req.body);
    
    const response = generateResponse(message);
    
    res.json({
      success: true,
      data: {
        message: response,
        disclaimer: "This is an AI assistant providing general information only. For medical emergencies, call emergency services. For specific medical advice, please consult a healthcare professional.",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Health check for chatbot service
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'chatbot' });
});

export default router;
