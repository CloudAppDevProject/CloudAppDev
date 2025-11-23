/**
 * DTO for newsletter send operation results
 * Returned from POST /api/v1/newsletter/send/weekly and retry endpoints
 */
export class SendNewsletterResultDto {
  /**
   * Number of successfully sent newsletters
   */
  successCount: number;

  /**
   * Number of failed send attempts
   */
  failureCount: number;

  /**
   * Total number of users attempted
   */
  totalAttempted: number;

  /**
   * Timestamp when send operation started
   */
  startedAt: Date;

  /**
   * Timestamp when send operation completed
   */
  completedAt: Date;

  /**
   * Optional array of error details for failed sends
   */
  errors?: Array<{
    userId: number;
    email?: string;
    error: string;
  }>;
}
