import { NestFactory } from '@nestjs/core';
import { PickerModule } from './picker.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqService } from '@app/common';
import { PICKER_SERVICE } from './constants/services';

async function bootstrap() {
  const app = await NestFactory.create(PickerModule);
  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions(PICKER_SERVICE));
  await app.startAllMicroservices();
  await app.listen(configService.get('PORT'));
}
bootstrap();
