import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Email Service
 * Abstracts email sending with support for both SendGrid (production) and SMTP (fallback)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sgMailConfigured = false;
  private nodemailerTransport: nodemailer.Transporter | null = null;
  private readonly mode: 'sendgrid' | 'smtp';

  constructor() {
    this.mode = (process.env.NEWSLETTER_MODE as 'sendgrid' | 'smtp') || 'sendgrid';

    if (this.mode === 'sendgrid') {
      this.initializeSendGrid();
    } else {
      this.initializeSmtp();
    }
  }

  /**
   * Initialize SendGrid
   */
  private initializeSendGrid(): void {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      this.logger.warn('SendGrid API key not configured - email sending disabled');
      return;
    }

    try {
      this.logger.log(`Setting SendGrid API key (length: ${apiKey.length})`);
      sgMail.setApiKey(apiKey);
      this.sgMailConfigured = true;
      this.logger.log('SendGrid initialized successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize SendGrid:', errorMsg);
    }
  }

  /**
   * Initialize SMTP (Fallback for local development)
   */
  private initializeSmtp(): void {
    const host = process.env.NEWSLETTER_SMTP_HOST;
    const port = parseInt(process.env.NEWSLETTER_SMTP_PORT || '587');
    const user = process.env.NEWSLETTER_SMTP_USER;
    const pass = process.env.NEWSLETTER_SMTP_PASSWORD;

    if (!user || !pass) {
      this.logger.warn('SMTP credentials not configured - email sending disabled');
      return;
    }

    try {
      this.nodemailerTransport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP transporter initialized successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize SMTP:', errorMsg);
    }
  }

  /**
   * Send email using configured provider
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      if (this.mode === 'sendgrid') {
        return await this.sendViaSendGrid(options);
      } else {
        return await this.sendViaSmtp(options);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${options.to}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(options: SendEmailOptions): Promise<boolean> {
    if (!this.sgMailConfigured) {
      this.logger.warn('[DRY-RUN] Email via SendGrid (not configured)');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      return true; // Dry-run success
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@cloudappdev.com',
          name: process.env.SENDGRID_FROM_NAME || 'CloudAppDev',
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        trackingSettings: {
          clickTracking: {
            enable: true,
          },
          openTracking: {
            enable: true,
          },
        },
      };

      const response = await sgMail.send(msg);

      const messageId =
        response[0].headers['x-message-id'] ||
        response[0].headers['message-id'] ||
        'unknown';

      this.logger.log(
        `Email sent to ${options.to} via SendGrid (Message ID: ${messageId})`,
      );

      return true;
    } catch (error) {
      let errorMsg = 'Unknown error';
      let statusCode = 'unknown';

      if (error instanceof Error) {
        errorMsg = error.message;
        // Check if it's a SendGrid error with response
        if ('response' in error) {
          const sgError = error as any;
          statusCode = sgError.response?.status || 'unknown';
          this.logger.error('SendGrid API Response:', sgError.response?.body || sgError.response);
        }
      } else {
        errorMsg = String(error);
      }

      this.logger.error(`SendGrid error (Status: ${statusCode}):`, errorMsg);
      throw error;
    }
  }

  /**
   * Send via SMTP (Fallback)
   */
  private async sendViaSmtp(options: SendEmailOptions): Promise<boolean> {
    if (!this.nodemailerTransport) {
      this.logger.warn('[DRY-RUN] Email via SMTP (not configured)');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      return true; // Dry-run success
    }

    try {
      const info = await this.nodemailerTransport.sendMail({
        from: `${process.env.SENDGRID_FROM_NAME || 'CloudAppDev'} <${process.env.SENDGRID_FROM_EMAIL || 'noreply@cloudappdev.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      this.logger.log(
        `Email sent to ${options.to} via SMTP (Message ID: ${info.messageId})`,
      );

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('SMTP error:', errorMsg);
      throw error;
    }
  }

  /**
   * Send batch emails to multiple recipients
   */
  async sendBatch(
    recipients: { email: string; subject: string; html: string }[],
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          to: recipient.email,
          subject: recipient.subject,
          html: recipient.html,
        });
        successCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to send to ${recipient.email}:`, errorMsg);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Verify email configuration
   */
  async verifyConfiguration(): Promise<boolean> {
    if (this.mode === 'sendgrid') {
      return this.sgMailConfigured;
    } else {
      return !!this.nodemailerTransport;
    }
  }

  /**
   * Get current mode
   */
  getMode(): string {
    return this.mode;
  }
}
