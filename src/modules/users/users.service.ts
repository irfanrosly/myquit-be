import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        race: true,
        education: true,
        occupation: true,
        onboardingDone: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        race: true,
        education: true,
        occupation: true,
        onboardingDone: true,
      },
    });
  }
}
