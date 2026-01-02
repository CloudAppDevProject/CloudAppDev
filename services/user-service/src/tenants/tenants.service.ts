import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../auth/firebase.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantTier } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async createTenant(dto: CreateTenantDto, ownerFirebaseUid: string) {
    // Check if slug already exists
    const slug = this.generateSlug(dto.name);
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException('Organization name already taken');
    }

    try {
      // 1. Create Firebase Identity Platform tenant
      const firebaseTenant = await this.firebaseService.createTenant({
        displayName: dto.name,
        enableEmailLinkSignin: false,
      });

      // 2. Create tenant in database
      const tenant = await this.prisma.tenant.create({
        data: {
          name: dto.name,
          slug,
          firebaseTenantId: firebaseTenant.tenantId,
          tier: dto.tier,
          maxUsers: this.getMaxUsers(dto.tier),
          trialEndsAt: this.getTrialEndDate(dto.tier),
          features: this.getFeaturesByTier(dto.tier),
        },
      });

      // 3. Create owner user in this tenant
      const user = await this.prisma.user.create({
        data: {
          email: dto.ownerEmail,
          name: dto.ownerName,
          firebaseUid: ownerFirebaseUid,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      // 4. Set custom claims on Firebase user
      await this.firebaseService.setCustomClaims(ownerFirebaseUid, {
        tenantId: tenant.id,
        role: 'OWNER',
        tier: dto.tier,
      });

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          tier: tenant.tier,
          maxUsers: tenant.maxUsers,
          features: tenant.features,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new BadRequestException('Failed to create organization');
    }
  }

  async getTenant(tenantId: number) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async getTenantBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async updateTenantTier(tenantId: number, tier: TenantTier) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        tier,
        maxUsers: this.getMaxUsers(tier),
        features: this.getFeaturesByTier(tier),
      },
    });
  }

  private getMaxUsers(tier: TenantTier): number {
    const limits = {
      FREE: 5,
      STANDARD: 50,
      ENTERPRISE: 999999,
    };
    return limits[tier];
  }

  private getFeaturesByTier(tier: TenantTier) {
    const features = {
      FREE: {
        analytics: false,
        api_access: false,
        custom_domain: false,
        priority_support: false,
      },
      STANDARD: {
        analytics: true,
        api_access: true,
        custom_domain: false,
        priority_support: false,
      },
      ENTERPRISE: {
        analytics: true,
        api_access: true,
        custom_domain: true,
        priority_support: true,
      },
    };
    return features[tier];
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  }

  private getTrialEndDate(tier: TenantTier): Date | null {
    if (tier === 'FREE') {
      return null;
    }
    const date = new Date();
    date.setDate(date.getDate() + 14); // 14-day trial
    return date;
  }
}
