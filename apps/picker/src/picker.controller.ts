import { Controller, Get, Logger } from '@nestjs/common';
import { PickerService } from './picker.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@app/common';

@Controller()
export class PickerController {
  constructor(
    private readonly pickerService: PickerService,
    private readonly rmqService: RmqService,
  ) {}

  private readonly logger = new Logger(PickerController.name);

  @Get()
  getHello(): string {
    return this.pickerService.getHello();
  }

  @EventPattern('assign_batch')
  async handleBatchAssigned(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log('picker assigned');
    setTimeout(
      () => this.pickerService.becomeAvailable(data.picker, data.ordersNum),
      (data.pickingTime as number) * 1000 * 60,
    );
    //this.rmqService.ack(context);
  }
}
