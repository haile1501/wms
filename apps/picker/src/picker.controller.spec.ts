import { Test, TestingModule } from '@nestjs/testing';
import { PickerController } from './picker.controller';
import { PickerService } from './picker.service';

describe('PickerController', () => {
  let pickerController: PickerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PickerController],
      providers: [PickerService],
    }).compile();

    pickerController = app.get<PickerController>(PickerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pickerController.getHello()).toBe('Hello World!');
    });
  });
});
