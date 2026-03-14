import { ticketRepository } from '@/lib/db/repositories/ticket.repository';
import { seedDatabase } from '@/lib/db/seed';

seedDatabase();

export async function GET() {
  try {
    const total = ticketRepository.getTotal();
    const byStatus = ticketRepository.countByStatus();
    const byCategory = ticketRepository.countByCategory();
    const byPriority = ticketRepository.countByPriority();
    const avgResolutionTime = ticketRepository.getAverageResolutionTime();
    const recentTrend = ticketRepository.getRecentTrend(7);
    const satisfactionScore = ticketRepository.getSatisfactionScore();
    const trends = ticketRepository.getWeekOverWeekTrends();

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
