'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { getStatusText, getStatusColor } from '@/lib/solution-status-workflow';
import { Clock, User, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

export interface ReviewRecord {
  id: string;
  solutionId: string;
  reviewerId: string;
  reviewer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  fromStatus: string;
  toStatus: string;
  status?: string;
  score?: number | null;
  comments?: string | null;
  decision?: string;
  decisionNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

interface ReviewHistoryProps {
  reviews: ReviewRecord[];
  loading?: boolean;
}

export function ReviewHistory({ reviews, loading }: ReviewHistoryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>审核历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">加载中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>审核历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>暂无审核记录</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>审核历史</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review, index) => {
            const reviewerName = review.reviewer
              ? `${review.reviewer.firstName || ''} ${review.reviewer.lastName || ''}`.trim() || review.reviewer.email || '未知审核者'
              : '未知审核者';

            const isApproved = review.toStatus === 'APPROVED' || review.decision === 'APPROVED';
            const isRejected = review.toStatus === 'REJECTED' || review.decision === 'REJECTED';

            return (
              <div
                key={review.id}
                className="border-l-4 border-gray-200 pl-4 pb-4 last:pb-0"
                style={{
                  borderLeftColor: isApproved
                    ? '#10b981'
                    : isRejected
                    ? '#ef4444'
                    : '#6b7280',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : isRejected ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-600" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(review.fromStatus)}>
                          {getStatusText(review.fromStatus)}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <Badge className={getStatusColor(review.toStatus)}>
                          {getStatusText(review.toStatus)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{reviewerName}</span>
                        <span className="text-gray-400">•</span>
                        <span>
                          {formatDate(review.reviewedAt || review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.score !== null && review.score !== undefined && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">评分</div>
                      <div className="text-lg font-semibold text-primary-600">
                        {review.score}/10
                      </div>
                    </div>
                  )}
                </div>

                {(review.comments || review.decisionNotes) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {review.decisionNotes || review.comments}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

