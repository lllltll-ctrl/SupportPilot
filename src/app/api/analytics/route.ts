import { ticketRepository } from '@/lib/db/repositories/ticket.repository';

export async function GET() {
  try {
    const [total, byStatus, byCategory, byPriority, avgResolutionTime, recentTrend, satisfactionScore, trends] =
      await Promise.all([
        ticketRepository.getTotal(),
        ticketRepository.countByStatus(),
        ticketRepository.countByCategory(),
        ticketRepository.countByPriority(),
        ticketRepository.getAverageResolutionTime(),
        ticketRepository.getRecentTrend(7),
        ticketRepository.getSatisfactionScore(),
        ticketRepository.getWeekOverWeekTrends(),
      ]);

    const resolved = byStatus['resolved'] || 0;
    const aiResolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return Response.json({
      totalTickets: total,
      aiResolutionRate,
      avgResolutionTimeMinutes: Math.round(avgResolutionTime),
      customerSatisfaction: satisfactionScore,
      trends,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      recentTrend,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
