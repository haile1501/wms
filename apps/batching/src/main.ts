import { NestFactory } from '@nestjs/core';
import { BatchingModule } from './batching.module';
import { RmqService } from '@app/common';
import { BATCHING_SERVICE } from './constants/services';

async function bootstrap() {
  const app = await NestFactory.create(BatchingModule);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions(BATCHING_SERVICE));
  await app.startAllMicroservices();
}
bootstrap();
