import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        age: true,
        gender: true,
        race: true,
        education: true,
        occupation: true,
        onboardingDone: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateProfileDto) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          age: true,
          gender: true,
          race: true,
          education: true,
          occupation: true,
          onboardingDone: true,
        },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }
}
