import { Test } from '@nestjs/testing';
import { SalesTasksController } from './sales-tasks.controller.js';

describe('SalesTasksController', () => {
  let controller: SalesTasksController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SalesTasksController],
    }).compile();
    controller = module.get(SalesTasksController);
  });

  it('reports its status', () => {
    expect(controller.status()).toEqual({ status: 'ok' });
  });
});
