import { Test, TestingModule } from '@nestjs/testing';
import { BatchingController } from './batching.controller';
import { BatchingService } from './batching.service';

describe('BatchingController', () => {
  let batchingController: BatchingController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BatchingController],
      providers: [BatchingService],
    }).compile();

    batchingController = app.get<BatchingController>(BatchingController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(batchingController.getHello()).toBe('Hello World!');
    });
  });
});
