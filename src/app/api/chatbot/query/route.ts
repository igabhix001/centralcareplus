import { NextRequest } from 'next/server';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// Simple rule-based medical chatbot responses
const medicalResponses: Record<string, string> = {
  headache: "For headaches, try resting in a quiet, dark room. Stay hydrated and consider over-the-counter pain relievers like acetaminophen or ibuprofen. If headaches persist or are severe, please consult a doctor.",
  fever: "For fever, rest and stay hydrated. You can take acetaminophen or ibuprofen to reduce fever. If fever exceeds 103°F (39.4°C) or lasts more than 3 days, seek medical attention.",
  cold: "For common cold symptoms, rest, drink plenty of fluids, and use over-the-counter cold medications. Symptoms usually resolve within 7-10 days. See a doctor if symptoms worsen or persist.",
  cough: "For cough, stay hydrated and try honey (for adults and children over 1 year). Over-the-counter cough suppressants may help. If cough persists over 2 weeks or produces blood, consult a doctor.",
  stomach: "For stomach issues, try the BRAT diet (bananas, rice, applesauce, toast). Stay hydrated with clear fluids. Avoid dairy and fatty foods. If symptoms persist over 48 hours, see a doctor.",
  pain: "For general pain, rest the affected area and apply ice for acute injuries. Over-the-counter pain relievers may help. If pain is severe or persistent, please consult a healthcare provider.",
  sleep: "For better sleep, maintain a consistent sleep schedule, avoid screens before bed, limit caffeine, and create a comfortable sleep environment. If sleep problems persist, consult a doctor.",
  stress: "For stress management, try deep breathing exercises, regular physical activity, and adequate sleep. Consider meditation or yoga. If stress significantly impacts daily life, seek professional help.",
  diet: "A balanced diet includes fruits, vegetables, whole grains, lean proteins, and healthy fats. Stay hydrated and limit processed foods, sugar, and sodium. Consult a nutritionist for personalized advice.",
  exercise: "Adults should aim for at least 150 minutes of moderate aerobic activity weekly, plus muscle-strengthening activities twice a week. Start slowly and increase gradually. Consult a doctor before starting new exercise programs.",
  appointment: "To book an appointment, please visit the Appointments section in your patient portal. You can select your preferred doctor, date, and time slot.",
  doctor: "To find a doctor, visit the Doctors section in your patient portal. You can filter by specialization and view available time slots.",
  prescription: "Your prescriptions can be viewed in the Records section of your patient portal. For refills, please contact your prescribing doctor.",
  emergency: "If you're experiencing a medical emergency, please call emergency services (911) immediately or go to the nearest emergency room. This chatbot is not for emergencies.",
};

const disclaimer = "\n\n⚠️ **Disclaimer**: This is general health information only and not a substitute for professional medical advice. Always consult a healthcare provider for medical concerns.";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return errorResponse('Message is required', 400);
    }

    const lowerMessage = message.toLowerCase();
    let response = "I'm here to help with general health questions. Could you please be more specific about your concern? You can ask about symptoms, medications, appointments, or general health advice.";

    // Check for keywords in the message
    for (const [keyword, reply] of Object.entries(medicalResponses)) {
      if (lowerMessage.includes(keyword)) {
        response = reply;
        break;
      }
    }

    // Check for greetings
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      response = "Hello! I'm your health assistant. How can I help you today? You can ask me about symptoms, general health advice, or how to use the patient portal.";
    }

    // Check for thanks
    if (lowerMessage.match(/(thank|thanks|thank you)/)) {
      response = "You're welcome! Is there anything else I can help you with?";
    }

    return jsonResponse({ 
      success: true, 
      data: { 
        response: response + disclaimer,
        timestamp: new Date().toISOString(),
      } 
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Chatbot error:', error);
    return errorResponse('Failed to process message', 500);
  }
}
