// src/routes/authRoutes.ts

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { addHours } from '../utils/dateHelpers'; // Import the global helper function
import prisma from '../utils/prisma';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * @notice Defines routes related to authentication, password setup, and reset
 * @dev Handles setting passwords with tokens and requesting password resets
 */
export async function authRoutes(server: FastifyInstance) {
  /**
   * @notice Sets a new password for a user using a reset token
   * @dev Validates the reset token and sets the new password, clearing the resetToken and resetTokenExpiry fields
   * @param request The Fastify request object containing the body with token and newPassword
   * @param reply The Fastify reply object to send back the response
   * @return A success message if the password is set, or an error message if the token is invalid or expired
   */
  server.post(
    '/set-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, newPassword } = request.body as {
        token: string;
        newPassword: string;
      };

      // Find the user with the matching reset token and ensure the token is still valid
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gte: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        return reply.status(400).send({ error: 'Invalid or expired token' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password and clear the reset token and expiry
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      reply.send({ message: 'Password set successfully' });
    },
  );

  /**
   * @notice Requests a password reset by generating a reset token and expiry
   * @dev Generates a reset token and updates the user with this token and its expiry, sending an email with the token
   * @param request The Fastify request object containing the body with email
   * @param reply The Fastify reply object to send back the response
   * @return A success message indicating the token has been sent, or an error message if the user is not found
   */
  server.post(
    '/request-password-reset',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.body as { email: string };

      // Find the user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Generate a new token and expiry
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = addHours(1); // Token expires in 1 hour

      // Update the user with the new reset token and expiry
      await prisma.user.update({
        where: { email },
        data: {
          resetToken: token,
          resetTokenExpiry: tokenExpiry,
        },
      });

      // TODO: Send an email with the token for resetting password
      // Example: sendEmail(user.email, `Your password reset token: ${token}`);

      reply.send({ message: 'Password reset token sent' });
    },
  );
}
