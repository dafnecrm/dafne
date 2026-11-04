import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailsService {
    private readonly resend: Resend;

    constructor(private config: ConfigService) {
        this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    }
}
