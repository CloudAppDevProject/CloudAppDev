import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByName(name: string) {
    const role = await this.prisma.role.findUnique({
      where: { name },
    });

    if (!role) {
      throw new NotFoundException(`Role '${name}' not found`);
    }

    return role;
  }
}
