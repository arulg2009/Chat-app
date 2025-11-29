import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Sanitize user input to prevent injection attacks
function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 4000) // Limit message length
    .replace(/[<>]/g, ''); // Remove potential HTML/script tags
}

// System prompt that defines AI behavior with privacy focus
const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant integrated into a chat application. 

Guidelines:
- Be helpful, accurate, and concise
- Never ask for or store personal information like passwords, credit cards, SSN, or other sensitive data
- If a user shares sensitive information, remind them not to share such data and ignore it
- Be respectful and maintain a professional tone
- If you don't know something, admit it rather than making up information
- Keep responses focused and relevant to the user's question
- Format responses with markdown when helpful (code blocks, lists, etc.)
- Never pretend to be a human or hide that you're an AI
- Do not execute commands, access external systems, or perform actions outside of this chat`;

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before sending more messages." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, conversationId, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const sanitizedMessage = sanitizeInput(message);

    if (sanitizedMessage.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // Build conversation context (limit history to prevent token overflow)
    const limitedHistory = conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: sanitizeInput(msg.content || '')
    }));

    // Check for Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
      // Fallback response when API key is not configured
      const fallbackResponse = generateFallbackResponse(sanitizedMessage);
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse,
        isAI: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          ...limitedHistory,
          { role: 'user', content: sanitizedMessage }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', response.status, errorData);
      
      // Provide specific error messages for common issues
      let errorMessage = "I'm having trouble connecting to my AI brain right now.";
      if (response.status === 401) {
        errorMessage = "API authentication failed. The API key may be invalid or expired.";
      } else if (response.status === 429) {
        errorMessage = "I'm receiving too many requests right now. Please wait a moment and try again.";
      } else if (response.status === 500 || response.status === 503) {
        errorMessage = "The AI service is temporarily unavailable. Please try again later.";
      }
      
      return NextResponse.json({
        success: true,
        response: `${errorMessage}\n\nIn the meantime, here's a fallback response:\n\n${generateFallbackResponse(sanitizedMessage)}`,
        isAI: true,
        timestamp: new Date().toISOString(),
        fallback: true,
        error: errorData.error?.message || 'API error',
      });
    }

    const data = await response.json();
    const aiResponse = data.content?.[0]?.text || "I apologize, but I couldn't generate a response. Please try again.";

    // Optionally save message to database if conversationId provided
    if (conversationId) {
      try {
        // Save user message
        await prisma.message.create({
          data: {
            content: sanitizedMessage,
            type: 'text',
            senderId: session.user.id,
            conversationId: conversationId,
          },
        });

        // Save AI response
        await prisma.message.create({
          data: {
            content: aiResponse,
            type: 'ai_response',
            senderId: session.user.id, // AI messages are associated with user
            conversationId: conversationId,
            metadata: { isAI: true },
          },
        });
      } catch (dbError) {
        console.error('Error saving messages to database:', dbError);
        // Continue even if DB save fails
      }
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      isAI: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('AI chat error:', error);
    
    return NextResponse.json(
      { error: "An error occurred while processing your request. Please try again." },
      { status: 500 }
    );
  }
}

// Fallback responses when API is not available
function generateFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! 👋 I'm your AI assistant. I'm currently running in demo mode because the AI API isn't configured yet. How can I help you today?";
  }
  
  if (lowerMessage.includes('help')) {
    return "I'm here to help! In demo mode, I can only provide basic responses. Once the AI API is configured, I'll be able to assist you with a wide range of questions and tasks.";
  }
  
  if (lowerMessage.includes('how are you') || lowerMessage.includes("how's it going")) {
    return "I'm doing well, thank you for asking! I'm ready to assist you. What would you like to know?";
  }
  
  if (lowerMessage.includes('thank')) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! Feel free to chat with me anytime. Take care! 👋";
  }
  
  if (lowerMessage.includes('weather')) {
    return "I don't have access to real-time weather data in demo mode. Once fully configured, I might be able to help you with weather-related questions!";
  }
  
  if (lowerMessage.includes('joke')) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "Why did the developer go broke? Because he used up all his cache! 💰",
      "What's a programmer's favorite hangout place? Foo Bar! 🍺",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  return `Thanks for your message! I'm currently in demo mode. Once the AI API is properly configured, I'll be able to provide more helpful responses to questions like: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`;
}
