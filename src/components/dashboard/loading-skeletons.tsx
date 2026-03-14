'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <Skeleton className="h-8 w-40 bg-gray-700/50" />
                <Skeleton className="h-4 w-56 mt-2 bg-gray-700/50" />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <Skeleton className="h-4 w-24 bg-gray-700/50" />
                            <Skeleton className="h-8 w-8 rounded-lg bg-gray-700/50" />
                        </div>
                        <Skeleton className="h-8 w-20 bg-gray-700/50" />
                        <Skeleton className="h-3 w-16 mt-2 bg-gray-700/50" />
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl">
                <div className="p-5 border-b border-gray-700/50">
                    <Skeleton className="h-5 w-32 bg-gray-700/50" />
                </div>
                <div className="divide-y divide-gray-700/50">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                            <div className="flex-1">
                                <Skeleton className="h-4 w-3/4 bg-gray-700/50" />
                                <Skeleton className="h-3 w-1/3 mt-2 bg-gray-700/50" />
                            </div>
                            <Skeleton className="h-5 w-16 rounded-full bg-gray-700/50" />
                            <Skeleton className="h-5 w-20 rounded-full bg-gray-700/50" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TicketsSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32 bg-gray-700/50" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-lg bg-gray-700/50" />
                    <Skeleton className="h-9 w-24 rounded-lg bg-gray-700/50" />
                </div>
            </div>
            <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1">
                            <Skeleton className="h-4 w-2/3 bg-gray-700/50" />
                            <Skeleton className="h-3 w-1/3 mt-2 bg-gray-700/50" />
                        </div>
                        <Skeleton className="h-5 w-14 rounded-full bg-gray-700/50" />
                        <Skeleton className="h-5 w-18 rounded-full bg-gray-700/50" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AnalyticsSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <Skeleton className="h-8 w-32 bg-gray-700/50" />
                <Skeleton className="h-4 w-64 mt-2 bg-gray-700/50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                        <Skeleton className="h-4 w-24 bg-gray-700/50 mb-3" />
                        <Skeleton className="h-8 w-20 bg-gray-700/50" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                        <Skeleton className="h-4 w-32 bg-gray-700/50 mb-4" />
                        <Skeleton className="h-[250px] w-full bg-gray-700/30 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LiveConversationsSkeleton() {
    return (
        <div className="p-6 h-full">
            <div className="grid h-full gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50">
                    <div className="border-b border-gray-700/50 p-5 space-y-2">
                        <Skeleton className="h-7 w-40 bg-gray-700/50" />
                        <Skeleton className="h-4 w-56 bg-gray-700/50" />
                    </div>
                    <div className="space-y-3 p-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-28 bg-gray-700/50" />
                                        <Skeleton className="h-3 w-40 bg-gray-700/50" />
                                    </div>
                                    <Skeleton className="h-5 w-16 rounded-full bg-gray-700/50" />
                                </div>
                                <Skeleton className="h-4 w-full bg-gray-700/50" />
                                <Skeleton className="h-12 w-full rounded-lg bg-gray-700/30" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 space-y-5">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-56 bg-gray-700/50" />
                        <Skeleton className="h-4 w-72 bg-gray-700/50" />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full bg-gray-700/50" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3 w-24 bg-gray-700/50" />
                                        <Skeleton className="h-16 w-full rounded-lg bg-gray-700/30" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 space-y-3">
                            <Skeleton className="h-4 w-32 bg-gray-700/50" />
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-lg border border-gray-700/30 bg-gray-800/40 p-3 space-y-2">
                                    <Skeleton className="h-3 w-24 bg-gray-700/50" />
                                    <Skeleton className="h-10 w-full bg-gray-700/30" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
