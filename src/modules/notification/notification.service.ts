import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub notification dispatcher. In production this would publish to a queue
 * (SQS/RabbitMQ) consumed by dedicated SMS/email/push workers — critical in
 * markets where push notification delivery is unreliable and SMS is primary.
 * For the MVP we log structured events that a real channel can be swapped in for.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async notifyUser(userId: string, event: string, payload: Record<string, unknown>) {
    this.logger.log({ msg: 'notification_dispatched', channel: 'stub', userId, event, payload });
    // TODO: integrate SMS/push provider (e.g. Africa's Talking, Termii, Firebase).
  }
}
