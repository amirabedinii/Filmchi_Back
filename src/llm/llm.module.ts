import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { LLMProviderFactory } from './factories/llm-provider.factory';
import { LLMRepositoryImpl } from './repositories/llm.repository';
import { LLMService } from './services/llm.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    LLMProviderFactory,
    {
      provide: 'LLMRepository',
      useClass: LLMRepositoryImpl,
    },
    LLMService,
  ],
  exports: [LLMService, 'LLMRepository'],
})
export class LLMModule {}
