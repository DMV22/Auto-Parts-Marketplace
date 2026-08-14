import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserRole } from '../../generated/prisma/enums';
import { InternalNotesService } from './internal-notes.service';
import type {
  CreateNoteCommand,
  InternalActor,
  InternalNoteItem,
  InternalNotesResponse,
  NotesQuery,
  RedactNoteCommand,
} from './internal-notes.types';
import {
  CreateNotePipe,
  NotesQueryPipe,
  RedactNotePipe,
} from './internal-notes.validation';

@Controller('api/v1/internal')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_MANAGER, UserRole.ADMIN)
export class InternalNotesController {
  constructor(private readonly notes: InternalNotesService) {}

  @Get('orders/:orderId/notes')
  listOrderNotes(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Query(NotesQueryPipe) query: NotesQuery,
  ): Promise<InternalNotesResponse> {
    return this.notes.list({ type: 'ORDER', id: orderId }, query);
  }

  @Post('orders/:orderId/notes')
  async createOrderNote(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body(CreateNotePipe) command: CreateNoteCommand,
  ): Promise<{ data: InternalNoteItem }> {
    return {
      data: await this.notes.create(
        { type: 'ORDER', id: orderId },
        command,
        actor(request),
      ),
    };
  }

  @Get('returns/:returnRequestId/notes')
  listReturnNotes(
    @Param('returnRequestId', new ParseUUIDPipe({ version: '4' }))
    returnRequestId: string,
    @Query(NotesQueryPipe) query: NotesQuery,
  ): Promise<InternalNotesResponse> {
    return this.notes.list(
      { type: 'RETURN_REQUEST', id: returnRequestId },
      query,
    );
  }

  @Post('returns/:returnRequestId/notes')
  async createReturnNote(
    @Req() request: AuthenticatedRequest,
    @Param('returnRequestId', new ParseUUIDPipe({ version: '4' }))
    returnRequestId: string,
    @Body(CreateNotePipe) command: CreateNoteCommand,
  ): Promise<{ data: InternalNoteItem }> {
    return {
      data: await this.notes.create(
        { type: 'RETURN_REQUEST', id: returnRequestId },
        command,
        actor(request),
      ),
    };
  }

  @Post('notes/:noteId/redact')
  @Roles(UserRole.ADMIN)
  async redact(
    @Req() request: AuthenticatedRequest,
    @Param('noteId', new ParseUUIDPipe({ version: '4' })) noteId: string,
    @Body(RedactNotePipe) command: RedactNoteCommand,
  ): Promise<{ data: InternalNoteItem }> {
    return {
      data: await this.notes.redact(noteId, command, actor(request)),
    };
  }
}

function actor(request: AuthenticatedRequest): InternalActor {
  const user = request.auth?.user;
  if (!user) throw new UnauthorizedException('Authentication required');
  return { id: user.id, role: user.role };
}
