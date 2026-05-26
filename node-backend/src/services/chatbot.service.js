'use strict';

const prisma = require('../config/prisma');
const aiService = require('./ai.service');

const SUPPORT_SYSTEM_PROMPT = `You are Plani Support AI, a helpful assistant for the Plani event planning platform.
You help users with:
- Account and billing questions
- Event setup and management
- Inventory management
- Vendor marketplace
- Staff coordination
- Technical issues with the platform

Be concise, friendly, and practical. If you cannot resolve the issue after 2-3 exchanges, or if the user:
- Asks to speak to a human
- Says "escalate", "human agent", "real person", or "still stuck"
- Has a billing dispute, data loss, or security concern
- Has a complex issue requiring account access

Then output EXACTLY this on its own line: ESCALATE
Followed by a brief summary of the issue.

Keep responses under 150 words unless explaining a multi-step process.`;

const PUBLIC_SYSTEM_PROMPT = `You are a Plani support assistant helping visitors on the Plani website.
Help visitors understand the platform, pricing, and features. Be friendly, concise, and helpful.

Key information about Plani:
- AI-powered event planning platform for businesses worldwide
- Plans: Free (1 event, forever), Pro ($29/mo, unlimited events), Max ($79/mo, enterprise), Wedding ($49 one-time)
- All plans support Stripe and Paystack (mobile money, M-Pesa, Airtel Money)
- AI assistant powered by Claude for checklists, budgets, timelines, vendor suggestions
- Features: vendor marketplace, staff scheduling, inventory & QR codes, save-the-date cards, guest photo albums, advanced reports
- Multi-language: English and Kinyarwanda
- Free 14-day trial on Pro and Max — no credit card required
- Domain: plani.pro

If the visitor asks to speak to a human, or if you cannot answer their question, output EXACTLY this on its own line: ESCALATE
Followed by a brief summary of what they need help with.

Keep responses under 120 words.`;

async function getOrCreateConversation({ userId, sessionToken }) {
  if (userId) {
    const existing = await prisma.chatbotConversation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    if (existing) return existing;
    return prisma.chatbotConversation.create({
      data: { userId },
      include: { messages: true },
    });
  }

  if (sessionToken) {
    const existing = await prisma.chatbotConversation.findFirst({
      where: { sessionToken },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    if (existing) return existing;
    return prisma.chatbotConversation.create({
      data: { sessionToken },
      include: { messages: true },
    });
  }

  return prisma.chatbotConversation.create({
    data: {},
    include: { messages: true },
  });
}

async function chat({ message, userId, sessionToken, systemPrompt }) {
  const conversation = await getOrCreateConversation({ userId, sessionToken });

  await prisma.chatbotMessage.create({
    data: { conversationId: conversation.conversationId, role: 'user', content: message },
  });

  const historyMessages = (conversation.messages || []).slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  historyMessages.push({ role: 'user', content: message });

  const prompt = systemPrompt === 'PUBLIC' ? PUBLIC_SYSTEM_PROMPT : (systemPrompt || SUPPORT_SYSTEM_PROMPT);
  const messages = [{ role: 'system', content: prompt }, ...historyMessages];

  const OpenAI = require('openai');
  const config = require('../config/env');
  const client = new OpenAI({ baseURL: 'https://models.github.ai/inference', apiKey: config.github.token || 'no-token' });

  const response = await client.chat.completions.create({
    model: 'openai/gpt-4o',
    max_tokens: 512,
    messages,
  });

  const rawText = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";
  const shouldEscalate = rawText.includes('ESCALATE');
  const cleanText = rawText.replace(/ESCALATE[\s\S]*/i, '').trim() ||
    "I've escalated your issue to our support team. They'll be in touch shortly.";

  await prisma.chatbotMessage.create({
    data: { conversationId: conversation.conversationId, role: 'assistant', content: cleanText },
  });

  return {
    conversationId: conversation.conversationId,
    response: cleanText,
    shouldEscalate,
    escalationSummary: shouldEscalate ? extractEscalationSummary(rawText, message) : null,
  };
}

function extractEscalationSummary(rawText, userMessage) {
  const afterEscalate = rawText.replace(/^[\s\S]*?ESCALATE\s*/i, '').trim();
  return afterEscalate || `User requested escalation. Last message: "${userMessage.substring(0, 200)}"`;
}

async function getConversationHistory({ userId, sessionToken }) {
  const conversation = await getOrCreateConversation({ userId, sessionToken });
  return {
    conversationId: conversation.conversationId,
    messages: (conversation.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

module.exports = { chat, getConversationHistory };
