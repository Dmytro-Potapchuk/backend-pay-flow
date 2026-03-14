import { Test, TestingModule } from '@nestjs/testing';
import { PayuService } from './payu.service';

describe('PayuService', () => {
  let service: PayuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayuService],
    }).compile();

    service = module.get<PayuService>(PayuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
