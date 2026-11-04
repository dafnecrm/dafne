import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { EmailsService } from './emails.service.js';

@Module({
  
  providers: [NotificationsService, EmailsService],
  exports: [NotificationsService, EmailsService],
})
export class NotificationsModule {}
