import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Attachment, Resend } from 'resend';

@Injectable()
export class EmailsService {
    private readonly resend: Resend;

    constructor(private config: ConfigService) {
        this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    }

    async sendEmailWithTemplate(to: string | string[], templateId: string, variables: Record<string, string>, attachments?: Attachment[]) {
        await this.resend.emails.send({
            to,
            template: {
                id: templateId,
                variables
            },
            attachments
        })
    }
}
