import { Module } from '@nestjs/common';
import { PickerController } from './picker.controller';
import { PickerService } from './picker.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { RmqModule } from '@app/common';
import { BATCHING_SERVICE } from './constants/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_BATCHING_QUEUE: Joi.string().required(),
        RABBIT_MQ_PICKER_QUEUE: Joi.string().required(),
      }),
      envFilePath: './apps/picker/.env',
    }),
    RmqModule.register({
      name: BATCHING_SERVICE,
    }),
  ],
  controllers: [PickerController],
  providers: [PickerService],
})
export class PickerModule {}
