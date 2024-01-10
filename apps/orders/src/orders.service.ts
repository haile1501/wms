import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  CreateOrderRequest,
  Orderline,
} from '@app/common/dto/create-order.request';
import * as fs from 'fs';
import { BATCHING_SERVICE } from './constants/services';

function parseOrderTextFile(filePath: string): CreateOrderRequest[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  const orders: CreateOrderRequest[] = [];
  let currentOrder: CreateOrderRequest | null = null;
  let orderlines: Orderline[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('Order')) {
      orderlines = [];
      const orderInfo = trimmedLine.split('\t');
      const id = parseInt(orderInfo[0].split(' ')[1], 10);
      const weight = parseInt(orderInfo[1].split(' ')[3], 10);
      currentOrder = new CreateOrderRequest(id, [], weight);
      orders.push(currentOrder);
      //const scheduledCompletionTime = parseFloat(orderInfo[2].split(" ")[3]);
    } else if (trimmedLine !== '') {
      const position = trimmedLine.split('\t');
      const aisleId = parseInt(position[1].split(' ')[1], 10);
      const rowId = parseInt(position[2].split(' ')[1], 10);
      const orderLine = new Orderline(aisleId, rowId, 1);
      orderlines.push(orderLine);
      currentOrder.orderlines = orderlines;
    }
  }

  return orders;
}

function generateExponential(rate: number): number {
  return -Math.log(Math.random()) / rate;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(BATCHING_SERVICE) private batchingClient: ClientProxy) {}

  createOrder(request: CreateOrderRequest) {
    this.batchingClient.emit('order_arrival', request);
  }

  start(pickingCapacity: number, numberOfOrders: number, fileNum: number) {
    return this.batchingClient.emit('start', {
      time: Date.now(),
      pickingCapacity,
      numberOfOrders,
      fileNum,
    });
  }

  async startTestCase(fileNum: number) {
    const lambdasMapping = {
      40: 0.334,
      60: 0.5,
      80: 0.667,
      100: 0.834,
      200: 1.667,
    };
    const files = fs.readdirSync('apps/orders/src/testcases');
    const file = files[0];
    const orders = parseOrderTextFile(`apps/orders/src/testcases/${file}`);
    const PICKING_DEVICE_CAPACITY = parseInt(file.split('.')[0].split('-')[2]);
    const NUMBER_ORDERS = orders.length;
    await lastValueFrom(
      this.start(PICKING_DEVICE_CAPACITY, NUMBER_ORDERS, fileNum),
    );

    let currentTime = 0;
    for (let i = 0; i < orders.length; i++) {
      const interarrivalTime = generateExponential(
        lambdasMapping[orders.length],
      );
      currentTime += interarrivalTime;
      this.logger.log(
        `order ${orders[i].id} will come after ${currentTime} minutes`,
      );
      this.logger.log(JSON.stringify(orders[i]));
      setTimeout(
        () => {
          this.createOrder(orders[i]);
        },
        currentTime * 60 * 1000,
      );
    }
    const oldPath = `apps/orders/src/testcases/${file}`;
    const newPath = `apps/orders/src/done/${file}`;
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        console.error(`Error moving file: ${err}`);
      } else {
        console.log('File moved successfully!');
      }
    });
  }

  handleTest() {
    this.batchingClient.emit('test1', {});
  }
}
