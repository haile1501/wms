import { Controller, Inject } from '@nestjs/common';
import { BatchingService } from './batching.service';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { RmqService } from '@app/common';
import { CreateOrderRequest } from '@app/common/dto/create-order.request';
import { ORDERS_SERVICE } from './constants/services';

@Controller()
export class BatchingController {
  constructor(
    private readonly batchingService: BatchingService,
    private rmqService: RmqService,
    @Inject(ORDERS_SERVICE) private orderClient: ClientProxy,
  ) {}

  @EventPattern('order_arrival')
  async handleOrderCreated(
    @Payload() data: CreateOrderRequest,
    @Ctx() context: RmqContext,
  ) {
    this.batchingService.handleOrderCreated(data);
    //this.rmqService.ack(context);
  }

  @EventPattern('picker_available')
  async handlePickerAvailable(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    this.batchingService.handlePickerAvailable(data);
    //this.rmqService.ack(context);
  }

  @EventPattern('start')
  handleStart(@Payload() data: any, @Ctx() context: RmqContext) {
    this.batchingService.setSystemStartTime(data);
    //this.rmqService.ack(context);
  }

  @EventPattern('test1')
  handleBruh() {
    console.log('batching');
    this.orderClient.emit('bruh', {});
  }
}
