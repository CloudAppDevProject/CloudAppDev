import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { UserRolesModule } from './user-roles/user-roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev-jwt-secret',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
      global: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
      defaultLabels: {
        service: 'tenant-service',
      },
    }),
    PrismaModule,
    TenantsModule,
    RolesModule,
    UserRolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
