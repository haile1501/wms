import { Module } from '@nestjs/common';
import { BatchingController } from './batching.controller';
import { BatchingService } from './batching.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { RmqModule } from '@app/common';
import { ORDERS_SERVICE, PICKER_SERVICE } from './constants/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_BATCHING_QUEUE: Joi.string().required(),
      }),
      envFilePath: './apps/batching/.env',
    }),
    RmqModule.register({
      name: PICKER_SERVICE,
    }),
    RmqModule.register({
      name: ORDERS_SERVICE,
    }),
  ],
  controllers: [BatchingController],
  providers: [BatchingService],
})
export class BatchingModule {}
