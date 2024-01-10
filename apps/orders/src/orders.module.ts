import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import { RmqModule } from '@app/common';
import { BATCHING_SERVICE } from './constants/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({}),
      envFilePath: './apps/orders/.env',
    }),
    RmqModule.register({
      name: BATCHING_SERVICE,
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
