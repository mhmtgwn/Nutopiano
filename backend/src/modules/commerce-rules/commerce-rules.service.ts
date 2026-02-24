import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommerceChannel, CommissionRuleType, Prisma } from '@prisma/client';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { PrismaService } from '../../database/prisma.service';
import { CommissionRuleConfigDto } from './dto/commission-rule-config.dto';
import { CreateRuleProfileDto } from './dto/create-rule-profile.dto';
import { UpdateRuleProfileDto } from './dto/update-rule-profile.dto';
import { UpsertSellerChannelBindingDto } from './dto/upsert-seller-channel-binding.dto';

@Injectable()
export class CommerceRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly profileInclude = {
    commissionRule: {
      include: {
        categoryOverrides: {
          orderBy: [{ categoryId: 'asc' as const }],
        },
      },
    },
  };

  private resolveBusinessId(currentUser: JwtPayload): number {
    const businessId = Number(currentUser.businessId);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      throw new ForbiddenException('Business context is required');
    }
    return businessId;
  }

  private normalizeChannel(channelRaw: string): CommerceChannel {
    const normalized = String(channelRaw ?? '').trim().toUpperCase();
    if (
      normalized === CommerceChannel.MARKETPLACE ||
      normalized === CommerceChannel.POS ||
      normalized === CommerceChannel.MANUAL
    ) {
      return normalized;
    }
    throw new BadRequestException('Unsupported channel');
  }

  private normalizeCurrency(currency?: string): string | undefined {
    if (currency === undefined) return undefined;
    const normalized = String(currency).trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('currency cannot be empty');
    }
    return normalized;
  }

  private normalizeCode(code?: string): string | undefined {
    if (code === undefined) return undefined;
    const normalized = String(code).trim();
    if (!normalized) {
      throw new BadRequestException('code cannot be empty');
    }
    return normalized;
  }

  private normalizeName(name?: string): string | undefined {
    if (name === undefined) return undefined;
    const normalized = String(name).trim();
    if (!normalized) {
      throw new BadRequestException('name cannot be empty');
    }
    return normalized;
  }

  private validateCommissionConfig(
    config: CommissionRuleConfigDto,
    contextLabel: string,
  ): void {
    if (config.type === CommissionRuleType.PERCENT) {
      if (typeof config.rateBps !== 'number') {
        throw new BadRequestException(`${contextLabel}: rateBps is required`);
      }
      if (config.fixedAmountCents !== undefined) {
        throw new BadRequestException(
          `${contextLabel}: fixedAmountCents is not allowed for PERCENT`,
        );
      }
      return;
    }

    if (config.type === CommissionRuleType.FIXED) {
      if (typeof config.fixedAmountCents !== 'number') {
        throw new BadRequestException(
          `${contextLabel}: fixedAmountCents is required`,
        );
      }
      if (config.rateBps !== undefined) {
        throw new BadRequestException(
          `${contextLabel}: rateBps is not allowed for FIXED`,
        );
      }
      return;
    }

    throw new BadRequestException(`${contextLabel}: invalid commission type`);
  }

  private normalizeOverridePayload(
    commissionRule: CommissionRuleConfigDto,
  ): CommissionRuleConfigDto {
    this.validateCommissionConfig(commissionRule, 'commissionRule');

    const seen = new Set<number>();
    for (const override of commissionRule.overrides ?? []) {
      if (seen.has(override.categoryId)) {
        throw new BadRequestException(
          `commissionRule.override categoryId duplicate: ${override.categoryId}`,
        );
      }
      seen.add(override.categoryId);
      this.validateCommissionConfig(
        {
          type: override.type,
          rateBps: override.rateBps,
          fixedAmountCents: override.fixedAmountCents,
        } as CommissionRuleConfigDto,
        `commissionRule.override.categoryId=${override.categoryId}`,
      );
    }

    return commissionRule;
  }

  private async assertCategoriesBelongToBusiness(
    tx: Prisma.TransactionClient,
    businessId: number,
    categoryIds: number[],
  ): Promise<void> {
    if (!categoryIds.length) return;

    const matched = await tx.category.findMany({
      where: {
        businessId,
        id: { in: categoryIds },
      },
      select: { id: true },
    });

    const existing = new Set(matched.map((item) => item.id));
    const missing = categoryIds.filter((id) => !existing.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Unknown category ids for business: ${missing.join(', ')}`,
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  async listRuleProfiles(currentUser: JwtPayload) {
    const businessId = this.resolveBusinessId(currentUser);
    return this.prisma.calculationProfile.findMany({
      where: { businessId },
      include: this.profileInclude,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createRuleProfile(currentUser: JwtPayload, payload: CreateRuleProfileDto) {
    const businessId = this.resolveBusinessId(currentUser);
    const commissionRule = this.normalizeOverridePayload(payload.commissionRule);
    const categoryIds = (commissionRule.overrides ?? []).map(
      (item) => item.categoryId,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertCategoriesBelongToBusiness(tx, businessId, categoryIds);

        const createdProfile = await tx.calculationProfile.create({
          data: {
            businessId,
            code: this.normalizeCode(payload.code)!,
            name: this.normalizeName(payload.name)!,
            description: payload.description?.trim() || null,
            currency: this.normalizeCurrency(payload.currency) ?? 'TRY',
            taxInclusive: payload.taxInclusive ?? true,
            taxProfileCode: payload.taxProfileCode?.trim() || 'TR_STD',
            roundingMode: payload.roundingMode ?? 'HALF_UP',
            discountRulesJson: (payload.discountRulesJson ??
              undefined) as Prisma.InputJsonValue | undefined,
            isActive: payload.isActive ?? true,
          },
          select: { id: true },
        });

        const createdRule = await tx.commissionRule.create({
          data: {
            businessId,
            calculationProfileId: createdProfile.id,
            type: commissionRule.type,
            rateBps:
              commissionRule.type === CommissionRuleType.PERCENT
                ? commissionRule.rateBps
                : null,
            fixedAmountCents:
              commissionRule.type === CommissionRuleType.FIXED
                ? commissionRule.fixedAmountCents
                : null,
            isActive: true,
          },
          select: { id: true },
        });

        if ((commissionRule.overrides ?? []).length > 0) {
          await tx.commissionCategoryOverride.createMany({
            data: (commissionRule.overrides ?? []).map((item) => ({
              businessId,
              commissionRuleId: createdRule.id,
              categoryId: item.categoryId,
              type: item.type,
              rateBps:
                item.type === CommissionRuleType.PERCENT ? item.rateBps : null,
              fixedAmountCents:
                item.type === CommissionRuleType.FIXED
                  ? item.fixedAmountCents
                  : null,
              isActive: true,
            })),
          });
        }

        return tx.calculationProfile.findFirstOrThrow({
          where: { businessId, id: createdProfile.id },
          include: this.profileInclude,
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Rule profile code already exists');
      }
      throw error;
    }
  }

  async updateRuleProfile(
    currentUser: JwtPayload,
    profileId: number,
    payload: UpdateRuleProfileDto,
  ) {
    if (!Number.isFinite(profileId) || profileId <= 0) {
      throw new BadRequestException('profileId is invalid');
    }

    const businessId = this.resolveBusinessId(currentUser);
    const existing = await this.prisma.calculationProfile.findFirst({
      where: { businessId, id: profileId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Rule profile not found');
    }

    const commissionRule = payload.commissionRule
      ? this.normalizeOverridePayload(payload.commissionRule)
      : null;
    const categoryIds = (commissionRule?.overrides ?? []).map(
      (item) => item.categoryId,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertCategoriesBelongToBusiness(tx, businessId, categoryIds);

        await tx.calculationProfile.update({
          where: { id: profileId },
          data: {
            code: this.normalizeCode(payload.code),
            name: this.normalizeName(payload.name),
            description:
              payload.description !== undefined
                ? payload.description.trim() || null
                : undefined,
            currency: this.normalizeCurrency(payload.currency),
            taxInclusive: payload.taxInclusive,
            taxProfileCode:
              payload.taxProfileCode !== undefined
                ? payload.taxProfileCode.trim() || 'TR_STD'
                : undefined,
            roundingMode: payload.roundingMode,
            discountRulesJson:
              payload.discountRulesJson !== undefined
                ? (payload.discountRulesJson as Prisma.InputJsonValue)
                : undefined,
            isActive: payload.isActive,
          },
        });

        if (commissionRule) {
          const upsertedRule = await tx.commissionRule.upsert({
            where: { calculationProfileId: profileId },
            update: {
              type: commissionRule.type,
              rateBps:
                commissionRule.type === CommissionRuleType.PERCENT
                  ? commissionRule.rateBps
                  : null,
              fixedAmountCents:
                commissionRule.type === CommissionRuleType.FIXED
                  ? commissionRule.fixedAmountCents
                  : null,
              isActive: true,
            },
            create: {
              businessId,
              calculationProfileId: profileId,
              type: commissionRule.type,
              rateBps:
                commissionRule.type === CommissionRuleType.PERCENT
                  ? commissionRule.rateBps
                  : null,
              fixedAmountCents:
                commissionRule.type === CommissionRuleType.FIXED
                  ? commissionRule.fixedAmountCents
                  : null,
              isActive: true,
            },
            select: { id: true },
          });

          await tx.commissionCategoryOverride.deleteMany({
            where: {
              businessId,
              commissionRuleId: upsertedRule.id,
            },
          });

          if ((commissionRule.overrides ?? []).length > 0) {
            await tx.commissionCategoryOverride.createMany({
              data: (commissionRule.overrides ?? []).map((item) => ({
                businessId,
                commissionRuleId: upsertedRule.id,
                categoryId: item.categoryId,
                type: item.type,
                rateBps:
                  item.type === CommissionRuleType.PERCENT
                    ? item.rateBps
                    : null,
                fixedAmountCents:
                  item.type === CommissionRuleType.FIXED
                    ? item.fixedAmountCents
                    : null,
                isActive: true,
              })),
            });
          }
        }

        return tx.calculationProfile.findFirstOrThrow({
          where: { businessId, id: profileId },
          include: this.profileInclude,
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Rule profile code already exists');
      }
      throw error;
    }
  }

  async upsertSellerChannelBinding(
    currentUser: JwtPayload,
    sellerId: number,
    channelRaw: string,
    payload: UpsertSellerChannelBindingDto,
  ) {
    if (!Number.isFinite(sellerId) || sellerId <= 0) {
      throw new BadRequestException('sellerId is invalid');
    }

    const businessId = this.resolveBusinessId(currentUser);
    const channel = this.normalizeChannel(channelRaw);

    const seller = await this.prisma.seller.findFirst({
      where: { businessId, id: sellerId },
      select: { id: true },
    });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const profile = await this.prisma.calculationProfile.findFirst({
      where: { businessId, id: payload.calculationProfileId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!profile) {
      throw new NotFoundException('Calculation profile not found');
    }
    if (!profile.isActive) {
      throw new BadRequestException('Inactive calculation profile cannot bind');
    }

    const binding = await this.prisma.sellerChannelRuleBinding.upsert({
      where: {
        businessId_sellerId_channel: {
          businessId,
          sellerId,
          channel,
        },
      },
      update: {
        calculationProfileId: payload.calculationProfileId,
        isActive: payload.isActive ?? true,
      },
      create: {
        businessId,
        sellerId,
        channel,
        calculationProfileId: payload.calculationProfileId,
        isActive: payload.isActive ?? true,
      },
      include: {
        calculationProfile: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return binding;
  }
}
