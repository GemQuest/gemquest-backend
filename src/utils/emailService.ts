// src/utils/emailService.ts

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

// Declare transporter variable
let transporter: nodemailer.Transporter | null = null;

/**
 * Initializes the SMTP transporter if it hasn't been initialized yet.
 */
async function initializeTransporter() {
  if (!transporter) {
    // Use stub transport if in test environment
    if (process.env.NODE_ENV === 'test') {
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    } else {
      // Load environment variables
      const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
        process.env;
      const SMTP_SECURE_BOOL = SMTP_SECURE === 'true'; // Convert to boolean

      // Configure SMTP transporter with Nodemailer
      transporter = nodemailer.createTransport({
        host: SMTP_HOST, // Example: ssl0.ovh.net
        port: Number(SMTP_PORT), // Example: 465
        secure: SMTP_SECURE_BOOL, // true for port 465, false for other ports
        auth: {
          user: SMTP_USER, // Your OVH email address
          pass: SMTP_PASS, // Your OVH SMTP password
        },
      });
    }

    // Optional: Verify SMTP connection upon initialization (skip in test)
    if (process.env.NODE_ENV !== 'test') {
      try {
        await transporter.verify();
        console.log('SMTP server is ready to send messages');
      } catch (error) {
        console.error('SMTP connection error:', error);
        throw error; // Rethrow error to be handled by the caller
      }
    }
  }
}

/**
 * Renders a Handlebars email template with the provided variables.
 * @param templateName Name of the template without the .hbs extension
 * @param variables Variables to inject into the template
 * @returns Rendered HTML string
 */
async function renderTemplate(
  templateName: string,
  variables: Record<string, any>,
): Promise<string> {
  try {
    const templatePath = path.join(
      __dirname,
      '..',
      'templates',
      `${templateName}.hbs`,
    );
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(templateSource);
    return compiledTemplate(variables);
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw new Error(`Could not render email template ${templateName}`);
  }
}

/**
 * Sends an email using the specified template and variables.
 * @param to Recipient's email address
 * @param subject Subject of the email
 * @param template Name of the template without the .hbs extension
 * @param variables Variables to inject into the template
 */
export async function sendEmail(
  to: string,
  subject: string,
  template: string,
  variables: Record<string, any>,
): Promise<void> {
  try {
    // Initialize the transporter if not already initialized
    await initializeTransporter();

    // Render the email template
    const html = await renderTemplate(template, variables);

    const mailOptions = {
      from: `"GemQuest" <${process.env.SMTP_USER}>`, // Sender address
      to,
      subject,
      html,
    };

    // Send the email
    await transporter!.sendMail(mailOptions);
    console.log(`Email sent to ${to} with subject "${subject}"`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error; // Propagate the error to be handled by the caller
  }
}
