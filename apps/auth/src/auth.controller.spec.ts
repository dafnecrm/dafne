import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();
    controller = module.get(AuthController);
  });

  it('reports its status', () => {
    expect(controller.status()).toEqual({ status: 'ok' });
  });
});
