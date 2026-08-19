import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * WebSocket gateway for kitchen queue updates.
 * Shares the same HTTP port as the NestJS backend (no separate port).
 * Only users with role KITCHEN_STAFF or SUPER_ADMIN may connect.
 */
@WebSocketGateway({ namespace: '/kitchen' })
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.query?.token as string;
    const role = token ? JwtAuthGuard.extractRoleFromToken(token) : null;
    if (role !== 'KITCHEN_STAFF' && role !== 'SUPER_ADMIN') {
      client.disconnect(true);
      return;
    }
    client.emit('queueUpdated', {});
  }

  handleDisconnect(client: Socket) {
    // No cleanup needed.
  }

  /**
   * Called by KitchenService after any ticket CRUD operation to notify all clients.
   */
  broadcastQueue() {
    if (!this.server) return;
    this.server.emit('queueUpdated', {});
  }
}
