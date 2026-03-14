import { Module } from '@nestjs/common'
import { PayuService } from './payu.service'
import { PayuController } from './payu.controller'

@Module({
  providers: [PayuService],
  controllers: [PayuController],
})
export class PayuModule {}