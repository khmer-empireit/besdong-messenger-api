import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ParticipantRole } from '../../../shared/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: [ParticipantRole.Admin, ParticipantRole.Member], example: ParticipantRole.Admin })
  @IsEnum([ParticipantRole.Admin, ParticipantRole.Member])
  role: ParticipantRole.Admin | ParticipantRole.Member;
}
