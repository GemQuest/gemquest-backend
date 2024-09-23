// src/plugins/authPlugin.ts

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PermissionOptions, rolePermissions } from '../config/permission';
import '@fastify/jwt';

export const authPlugin = fp(async (server: FastifyInstance) => {
  // Authentication decorator
  server.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  );

  // Authorization decorator
  server.decorate('authorize', function (options: PermissionOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const userRole = request.user.role;

        // Check if the user's role is allowed
        if (options.roles && !options.roles.includes(userRole)) {
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Check if the user has the required permissions
        if (options.permissions) {
          const userPermissions = rolePermissions[userRole] || [];
          const hasPermission = options.permissions.every((perm) =>
            userPermissions.includes(perm),
          );

          if (!hasPermission) {
            return reply
              .status(403)
              .send({ error: 'Insufficient permissions' });
          }
        }
      } catch (err) {
        reply.send(err);
      }
    };
  });
});
