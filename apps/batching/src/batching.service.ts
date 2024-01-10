import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ORDERS_SERVICE, PICKER_SERVICE } from './constants/services';
import { Picker } from './entities/picker.entity';
import { Order, OrderLine } from './entities/order.entity';
import { Warehouse } from './entities/warehouse.entity';
import { ConfigService } from '@nestjs/config';
import { CreateOrderRequest } from '@app/common/dto/create-order.request';
import * as fs from 'fs';
import { calculateBatchPickingTime } from './algorithm/warehouse';
import { batchingAlgorithm } from './algorithm/batchingAlgorithm';
import { StartData } from './dto/start-data.dto';

@Injectable()
export class BatchingService {
  private timeOutId: any;
  private timeSlice: number;
  private isWaiting = false;
  private isLastOrderCame = false;
  private unprocessedOrders: Order[] = [];
  private availablePickers: Picker[] = [];
  private systemStartTime: any;
  private systemEndTime: any;
  private numberOfOrders: number;
  private pickingCapacity: number;
  private numberOfHandled: number = 0;
  private fileNum: number;
  private warehouse: Warehouse = {
    rowsNum: +this.configService.get<number>('ROWS_NUM'),
    rowLength: +this.configService.get<number>('ROW_LENGTH'),
    disBetweenAisles: +this.configService.get<number>('DIS_BETWEEN_AISLES'),
    disBetweenDepotFirstAisle: +this.configService.get<number>(
      'DIS_BETWEEN_DEPOT_FIRST_AISLE',
    ),
    pickersNum: +this.configService.get<number>('PICKERS_NUM'),
    travelSpeed: +this.configService.get<number>('TRAVEL_SPEED'),
    extractionSpeed: +this.configService.get<number>('EXTRACTION_SPEED'),
    batchSetupTime: +this.configService.get<number>('BATCH_SETUP_TIME'),
    pickingDeviceCapacity: +this.configService.get<number>(
      'PICKING_DEVICE_CAPACITY',
    ),
  };

  private readonly logger = new Logger(BatchingService.name);

  constructor(
    @Inject(PICKER_SERVICE) private pickerClient: ClientProxy,
    @Inject(ORDERS_SERVICE) private orderClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  handle() {
    this.pickerClient.emit('assign_batch', {
      picker: 1,
      pickingTime: 2,
      ordersNum: 10,
    });
  }

  // possible type A or B
  handleOrderCreated(order: CreateOrderRequest) {
    this.logger.log(`Order ${order.id} comes`);
    if (order.id === this.numberOfOrders - 1) {
      this.isLastOrderCame = true;
    }
    const orderlines = order.orderlines.map(
      (orderline) =>
        new OrderLine(orderline.aisleId, orderline.rowId, orderline.quantity),
    );
    this.unprocessedOrders.push(new Order(order.id, orderlines, order.weight));

    if (this.isWaiting) {
      if (this.possibleBatchesNum() >= 1 || this.isLastOrderCame) {
        // type B
        this.logger.log('Decision point type BD');
        clearTimeout(this.timeOutId);
        this.handleDecisionPointBD();
      } else {
        this.handleDecisionPointAC();
      }
    } else if (!this.isWaiting && this.availablePickers.length >= 1) {
      // type A
      this.logger.log('Decision point type AC');
      this.handleDecisionPointAC();
    }
  }

  // possible type C
  handlePickerAvailable(data: any) {
    this.logger.log(
      `picker ${data.picker.id} becomes available after collecting ${data.ordersNum} orders`,
    );
    this.logger.log(data.picker);
    this.numberOfHandled += data.ordersNum;
    this.logger.log(`Number of handled orders: ${this.numberOfHandled}`);
    this.availablePickers.push(data.picker as Picker);
    this.logger.log(this.availablePickers);
    if (this.numberOfHandled === this.numberOfOrders) {
      this.systemEndTime = Date.now();
      this.orderClient.emit('finish_testcase', { fileNum: this.fileNum });
      this.logger.log(
        `Total: ${(this.systemEndTime - this.systemStartTime) / 60000} minutes`,
      );
      this.logger.log(this.availablePickers);

      const filePath = 'apps/batching/src/results/results.json';
      const data = {
        numberOfOrders: this.numberOfOrders,
        pickingCapacity: this.pickingCapacity,
        numberOfPickers: this.availablePickers.length,
        pickingTime: (this.systemEndTime - this.systemStartTime) / 60000,
        pickers: this.availablePickers,
      };

      const existingData = fs.readFileSync(filePath, 'utf-8');
      const dataArray = JSON.parse(existingData) as any[];
      dataArray.push(data);
      // Convert the object to a JSON string
      const jsonData = JSON.stringify(dataArray);
      fs.writeFileSync(filePath, jsonData);
    }
    if (!this.isWaiting && this.unprocessedOrders.length > 0) {
      // type C
      this.handleDecisionPointAC();
    }
  }

  private handleDecisionPointAC() {
    if (this.possibleBatchesNum() === 0 && !this.isLastOrderCame) {
      // define waiting threshold
      // let longestServiceTime = -1;
      // let longestServiceOrderArrivalTime = null;
      // this.unprocessedOrders.forEach((order) => {
      //   const orderServiceTime = calculateBatchPickingTime(
      //     [order],
      //     this.warehouse,
      //   );
      //   if (orderServiceTime > longestServiceTime) {
      //     longestServiceTime = orderServiceTime;
      //     longestServiceOrderArrivalTime = order.getArrivalTime().getTime();
      //   }
      // });
      // const waitingThreshold =
      //   2 * (longestServiceOrderArrivalTime - this.systemStartTime) +
      //   longestServiceTime * 60 * 1000 -
      //   calculateBatchPickingTime(this.unprocessedOrders, this.warehouse) *
      //     60 *
      //     1000 +
      //   this.systemStartTime;
      // if (waitingThreshold > Date.now()) {
      //   const waitingPeriod = waitingThreshold - Date.now();
      //   this.isWaiting = true;
      //   this.logger.log(
      //     `Begin waiting period: ${waitingPeriod / 1000} seconds`,
      //   );
      //   this.timeOutId = setTimeout(() => {
      //     this.handleDecisionPointBD();
      //   }, waitingPeriod);
      // } else {
      //   this.batchAndAssign1();
      // }
      const batchPickingTime = calculateBatchPickingTime(
        this.unprocessedOrders,
        this.warehouse,
      );
      let waitingPeriod = 0;
      if (Date.now() - this.systemStartTime <= 1 * 3600 * 1000) {
        waitingPeriod =
          this.systemStartTime +
          2 * 3600 * 1000 -
          batchPickingTime * 6000 -
          Date.now();
        this.isWaiting = true;
        this.logger.log(
          `Begin waiting period: ${waitingPeriod / 1000} seconds`,
        );
        this.timeOutId = setTimeout(() => {
          this.handleDecisionPointBD();
        }, waitingPeriod);
      } else if (Date.now() - this.systemStartTime <= 2 * 3600 * 1000) {
        waitingPeriod =
          this.systemStartTime +
          3 * 3600 * 1000 -
          batchPickingTime * 6000 -
          Date.now();
        this.isWaiting = true;
        this.logger.log(
          `Begin waiting period: ${waitingPeriod / 1000} seconds`,
        );
        this.timeOutId = setTimeout(() => {
          this.handleDecisionPointBD();
        }, waitingPeriod);
      } else if (Date.now() - this.systemStartTime <= 3 * 3600 * 1000) {
        waitingPeriod =
          this.systemStartTime +
          4 * 3600 * 1000 -
          batchPickingTime * 6000 -
          Date.now();
        this.isWaiting = true;
        this.logger.log(
          `Begin waiting period: ${waitingPeriod / 1000} seconds`,
        );
        this.timeOutId = setTimeout(() => {
          this.handleDecisionPointBD();
        }, waitingPeriod);
      } else {
        this.batchAndAssign1();
      }
    } else {
      this.batchAndAssign1();
    }
  }

  private handleDecisionPointBD() {
    if (this.isWaiting) {
      this.logger.log(`End waiting period`);
      this.isWaiting = false;
      this.batchAndAssign2();
    }
  }

  private batchAndAssign1() {
    try {
      const batches = batchingAlgorithm(
        this.unprocessedOrders,
        this.pickingCapacity,
        this.warehouse,
      );
      let minimumArrivalBatchIndex = 0;
      let minimumArrival = -1;
      batches.forEach((batch, index) => {
        let averageArrival = 0;
        batch.getBatchedOrders().forEach((order) => {
          averageArrival += order.getArrivalTime().getTime();
        });
        averageArrival = averageArrival / batch.getBatchedOrders().length;
        if (minimumArrival < 0 || minimumArrival > averageArrival) {
          minimumArrival = averageArrival;
          minimumArrivalBatchIndex = index;
        }
      });

      const batchToPick = batches[minimumArrivalBatchIndex];
      const totalPickingTime = calculateBatchPickingTime(
        batchToPick.getBatchedOrders(),
        this.warehouse,
      );
      this.availablePickers[0].workload += totalPickingTime;
      this.logger.log({
        picker: this.availablePickers[0],
        pickingTime: totalPickingTime,
        ordersNum: batchToPick.getBatchedOrders().length,
      });
      this.pickerClient.emit('assign_batch', {
        picker: this.availablePickers[0],
        pickingTime: totalPickingTime,
        ordersNum: batchToPick.getBatchedOrders().length,
      });

      this.logger.log(
        `picker ${this.availablePickers[0].id} collects ${
          batchToPick.getBatchedOrders().length
        } orders, weight ${batchToPick.getWeight()},will be available after ${totalPickingTime}`,
      );

      const orderIdsToRemove = {};
      batchToPick.getBatchedOrders().forEach((order) => {
        this.logger.log(`remove order ${order.getOrderId()}`);
        orderIdsToRemove[order.getOrderId()] = true;
      });
      this.unprocessedOrders = this.unprocessedOrders.filter(
        (order) => !orderIdsToRemove[order.getOrderId()],
      );
      this.availablePickers.shift();
    } catch (err) {
      this.logger.log(err);
    }
  }

  private batchAndAssign2() {
    try {
      const batches = batchingAlgorithm(
        this.unprocessedOrders,
        this.pickingCapacity,
        this.warehouse,
      );
      this.availablePickers.sort(
        (picker1, picker2) => picker1.workload - picker2.workload,
      );
      batches.sort(
        (batch1, batch2) =>
          calculateBatchPickingTime(batch2.getBatchedOrders(), this.warehouse) -
          calculateBatchPickingTime(batch1.getBatchedOrders(), this.warehouse),
      );

      while (this.availablePickers.length > 0) {
        if (batches.length === 0) {
          break;
        } else {
          const totalPickingTime = calculateBatchPickingTime(
            batches[0].getBatchedOrders(),
            this.warehouse,
          );
          this.availablePickers[0].workload += totalPickingTime;
          this.pickerClient.emit('assign_batch', {
            picker: this.availablePickers[0],
            pickingTime: totalPickingTime,
            ordersNum: batches[0].getBatchedOrders().length,
          });

          this.logger.log(
            `picker ${this.availablePickers[0].id} collects ${
              batches[0].getBatchedOrders().length
            } orders, weight ${batches[0].getWeight()} ,will be available after ${totalPickingTime} minutes`,
          );

          const orderIdsToRemove = {};
          batches[0].getBatchedOrders().forEach((order) => {
            this.logger.log(`remove order ${order.getOrderId()}`);
            orderIdsToRemove[order.getOrderId()] = true;
          });
          this.unprocessedOrders = this.unprocessedOrders.filter(
            (order) => !orderIdsToRemove[order.getOrderId()],
          );

          this.availablePickers.shift();
          batches.shift();
        }
      }
    } catch (err) {
      this.logger.log(err);
    }
  }

  private possibleBatchesNum(): number {
    let totalWeight = 0;
    this.unprocessedOrders.forEach(
      (order) => (totalWeight += order.getWeight()),
    );
    return Math.round(totalWeight / this.warehouse.pickingDeviceCapacity);
  }

  setSystemStartTime(startData: StartData) {
    this.logger.log('system start');
    this.systemStartTime = startData.time;
    this.pickingCapacity = startData.pickingCapacity;
    this.warehouse.pickingDeviceCapacity = this.pickingCapacity;
    this.numberOfOrders = startData.numberOfOrders;
    this.fileNum = startData.fileNum;
    this.isWaiting = false;
    this.unprocessedOrders = [];
    this.availablePickers = [];
    this.numberOfHandled = 0;
    this.isLastOrderCame = false;
    for (let i = 0; i < this.warehouse.pickersNum; i++) {
      this.availablePickers.push(new Picker(i));
    }
    this.logger.log(
      `Picking capacity: ${this.pickingCapacity}, number of orders: ${this.numberOfOrders}, file number: ${this.fileNum}`,
    );
    this.logger.log(this.warehouse);
  }
}
