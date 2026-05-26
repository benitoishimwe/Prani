'use strict';

const prisma = require('../config/prisma');
const emailService = require('./email.service');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@plani.pro';

async function createTicket({ userId, email, subject, message }) {
  const ticket = await prisma.supportTicket.create({
    data: { userId: userId || null, email, subject, message },
    include: { user: { select: { name: true } } },
  });

  if (ticket.user?.name) {
    await emailService.sendTicketCreated(email, ticket.user.name, ticket.ticketId, subject).catch(() => {});
  } else {
    await emailService.sendTicketCreated(email, null, ticket.ticketId, subject).catch(() => {});
  }

  await emailService.sendTicketCreatedInternal(SUPPORT_EMAIL, { ticketId: ticket.ticketId, email, subject, message }).catch(() => {});

  return ticket;
}

async function listTickets({ status, priority, page = 1, size = 20 }) {
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
      include: {
        user: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
        _count: { select: { supportMessages: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return { tickets, total, page, size };
}

async function getTicket(ticketId) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { ticketId },
    include: {
      user: { select: { name: true, email: true } },
      assignee: { select: { name: true } },
      supportMessages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  return ticket;
}

async function getUserTickets(userId) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { supportMessages: true } } },
  });
}

async function replyToTicket({ ticketId, message, senderType, replierEmail, replierName }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { ticketId } });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  if (ticket.status === 'closed') throw Object.assign(new Error('Cannot reply to a closed ticket'), { status: 400 });

  const msg = await prisma.supportMessage.create({
    data: { ticketId, senderType, message },
  });

  if (ticket.status === 'open' && senderType === 'support') {
    await prisma.supportTicket.update({ where: { ticketId }, data: { status: 'in_progress' } });
  }

  if (senderType === 'support') {
    await emailService.sendTicketReply(ticket.email, ticket.subject, message, ticketId).catch(() => {});
  }

  return msg;
}

async function updateTicketStatus({ ticketId, status, resolution, assignedTo }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { ticketId } });
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  return prisma.supportTicket.update({
    where: { ticketId },
    data: {
      status: status || undefined,
      resolution: resolution !== undefined ? resolution : undefined,
      assignedTo: assignedTo || undefined,
    },
  });
}

module.exports = { createTicket, listTickets, getTicket, getUserTickets, replyToTicket, updateTicketStatus };
