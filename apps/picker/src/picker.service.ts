import { Inject, Injectable } from '@nestjs/common';
import { BATCHING_SERVICE } from './constants/services';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PickerService {
  constructor(@Inject(BATCHING_SERVICE) private batchingClient: ClientProxy) {}

  getHello(): string {
    return 'Hello World!';
  }

  becomeAvailable(picker: any, ordersNum: number) {
    this.batchingClient.emit('picker_available', {
      picker,
      ordersNum,
    });
  }
}
