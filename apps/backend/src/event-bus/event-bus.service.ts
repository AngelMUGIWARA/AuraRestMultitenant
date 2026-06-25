import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class EventBusService implements OnModuleDestroy {
  private emitter = new EventEmitter();

  emit(event: string, payload: any) {
    this.emitter.emit(event, payload);
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.emitter.off(event, listener);
  }

  onModuleDestroy() {
    this.emitter.removeAllListeners();
  }
}
