import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [PostsModule,
            TypeOrmModule.forRoot({
              type: 'sqlite',
              database: 'database.db',
              synchronize: true,
              logging: false,
              entities: [__dirname + '/**/*.entity{.ts,.js}'],
            })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
