// the position of depot is on the left of the warehouse
// id of aisles, rows start from 0 from the depot

import { Order } from '../entities/order.entity';
import { Warehouse } from '../entities/warehouse.entity';

export const calculateBatchPickingTime = (
  pickList: Order[],
  warehouse: Warehouse,
): number => {
  let totalDistance = 0;
  let totalItems = 0;
  const aislesToTraverse = new Set<number>([]);

  pickList.forEach((order) => {
    order.getOrderlines().forEach((orderline) => {
      const aisleId = orderline.getAisleId();
      totalItems += orderline.getQuantity();
      aislesToTraverse.add(aisleId);
    });
  });

  const sortedSet = Array.from(aislesToTraverse).sort();
  for (let i = 0; i < sortedSet.length; i++) {
    if (i === 0) {
      totalDistance +=
        sortedSet[i] * warehouse.disBetweenAisles +
        warehouse.disBetweenDepotFirstAisle;
    } else {
      totalDistance +=
        (sortedSet[i] - sortedSet[i - 1]) * warehouse.disBetweenAisles;
    }

    if (i === sortedSet.length - 1) {
      if (sortedSet.length % 2 === 1) {
        let furthestShelfOnLastAisle = 0;
        pickList.forEach((order) => {
          order.getOrderlines().forEach((orderline) => {
            if (
              orderline.getAisleId() === sortedSet[i] &&
              orderline.getRowId() > furthestShelfOnLastAisle
            ) {
              furthestShelfOnLastAisle = orderline.getRowId();
            }
          });
        });
        totalDistance += furthestShelfOnLastAisle * warehouse.rowLength * 2; // Go to the furthest row and U-turn
        totalDistance +=
          sortedSet[i] * warehouse.disBetweenAisles +
          warehouse.disBetweenDepotFirstAisle; // return to the depot
        break;
      } else {
        totalDistance +=
          sortedSet[i] * warehouse.disBetweenAisles +
          warehouse.disBetweenDepotFirstAisle; // return to the depot
      }
    }

    totalDistance += warehouse.rowsNum * warehouse.rowLength;
  }

  const totalPickingTime =
    warehouse.batchSetupTime +
    totalDistance / warehouse.travelSpeed +
    totalItems / warehouse.extractionSpeed; // min

  return totalPickingTime;
};
