import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { RmqService } from '@app/common';

@Controller()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly rmqService: RmqService,
  ) {}

  @Get('test')
  handleTest() {
    this.ordersService.handleTest();
  }

  @EventPattern('bruh')
  handleBruh() {
    console.log('bruh');
  }

  @Get('start')
  async startTest() {
    // const lambdasMapping = {
    //   40: 0.6667,
    //   60: 1,
    //   80: 1.334,
    //   100: 1.667,
    //   200: 3.334,
    // };
    // const files = fs.readdirSync("./testcases");
    // files.forEach(async (file, index) => {
    //   const orders = parseOrderTextFile(`./testcases/${file}`);
    //   const PICKING_DEVICE_CAPACITY = parseInt(
    //     file.split(".")[0].split("-")[2]
    //   );
    //   const NUMBER_ORDERS = orders.length;
    //   await lastValueFrom(
    //     this.ordersService.start(PICKING_DEVICE_CAPACITY, NUMBER_ORDERS, index)
    //   );
    //   let currentTime = 0;
    //   for (let i = 0; i < orders.length; i++) {
    //     const interarrivalTime = generateExponential(
    //       lambdasMapping[orders.length]
    //     );
    //     currentTime += interarrivalTime;
    //     this.logger.log(
    //       `order ${orders[i].id} will come after ${currentTime} minutes`
    //     );
    //     setTimeout(() => {
    //       this.logger.log(`release order ${orders[i].id}`);
    //       this.ordersService.createOrder(orders[i]);
    //     }, currentTime * 60 * 1000);
    //   }
    // });
    this.ordersService.startTestCase(0);
  }

  @EventPattern('finish_testcase')
  async handleFinishTestCase(@Payload() data: any, @Ctx() context: RmqContext) {
    this.ordersService.startTestCase(data.fileNum + 1);
    //this.rmqService.ack(context);
  }
}
