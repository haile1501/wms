import { Order } from './order.entity';

export class Batch {
  private batchedOrders: Order[];
  private weight: number = 0;

  constructor(batchedOrders: Order[]) {
    this.batchedOrders = batchedOrders;
    this.calculateTotalWeight();
  }

  public getWeight(): number {
    return this.weight;
  }

  public getBatchedOrders(): Order[] {
    return this.batchedOrders;
  }

  public addOrdersToBatch(ordersToInsert: Order[]): void {
    this.batchedOrders.push(...ordersToInsert);
    this.calculateTotalWeight();
  }

  public removeOrdersFromBatch(indicesToRemove: number[]): void {
    indicesToRemove.sort((a, b) => b - a);
    indicesToRemove.forEach((index) => {
      this.batchedOrders.splice(index, 1);
    });
    this.calculateTotalWeight();
  }

  private calculateTotalWeight(): void {
    let total = 0;
    this.batchedOrders.forEach((order) => {
      total += order.getWeight();
    });

    this.weight = total;
  }
}
